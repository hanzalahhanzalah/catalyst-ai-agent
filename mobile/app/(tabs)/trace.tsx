import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useAgentStore, TraceEntry } from '../../store/agentStore';
import { AgentAPI } from '../../services/api';

const TRACE_CFG: Record<string, { color: string; icon: string; label: string }> = {
  planning:         { color: colors.primary, icon: 'map-outline',              label: 'Planning'    },
  tool_call:        { color: colors.success, icon: 'construct-outline',        label: 'Tool Call'   },
  constraint_check: { color: colors.warning, icon: 'shield-checkmark-outline', label: 'Constraint'  },
  decision:         { color: colors.text,    icon: 'bulb-outline',             label: 'Decision'    },
  failure:          { color: colors.danger,  icon: 'close-circle-outline',     label: 'Failure'     },
  recovery:         { color: colors.success, icon: 'refresh-circle-outline',   label: 'Recovery'    },
  outcome:          { color: colors.success, icon: 'checkmark-done-outline',   label: 'Outcome'     },
};

const FILTERS = [
  { key: 'all',      label: 'All'        },
  { key: 'planning', label: 'Planning'   },
  { key: 'tool_call',label: 'Tool Calls' },
  { key: 'failure',  label: 'Failures'   },
  { key: 'recovery', label: 'Recovery'   },
];

function TraceRow({ entry, index }: { entry: TraceEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TRACE_CFG[entry.trace_type] || TRACE_CFG.planning;
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <TouchableOpacity style={S.traceRow} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
      {/* Left: step indicator */}
      <View style={S.traceLeft}>
        <View style={[S.traceDot, { backgroundColor: cfg.color }]} />
        {index > 0 && <View style={S.traceLine} />}
      </View>

      {/* Content */}
      <View style={S.traceContent}>
        <View style={S.traceHeader}>
          <View style={[S.traceBadge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
            <Text style={[S.traceBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {entry.tool_name && (
            <Text style={S.traceToolName}>{entry.tool_name}()</Text>
          )}
          <Text style={S.traceTime}>{time}</Text>
        </View>

        {entry.reasoning && (
          <Text style={S.traceReasoning} numberOfLines={expanded ? undefined : 2}>
            {entry.reasoning}
          </Text>
        )}

        {entry.decision && (
          <View style={S.traceDecision}>
            <Text style={S.traceDecisionLabel}>Decision →</Text>
            <Text style={S.traceDecisionText} numberOfLines={expanded ? undefined : 1}>
              {entry.decision}
            </Text>
          </View>
        )}

        {expanded && (
          <>
            {entry.tool_input && (
              <View style={S.traceCode}>
                <Text style={S.traceCodeLabel}>INPUT</Text>
                <Text style={S.traceCodeText}>{JSON.stringify(entry.tool_input, null, 2)}</Text>
              </View>
            )}
            {entry.tool_output && (
              <View style={[S.traceCode, { borderColor: colors.successMid }]}>
                <Text style={[S.traceCodeLabel, { color: colors.success }]}>OUTPUT</Text>
                <Text style={S.traceCodeText}>{JSON.stringify(entry.tool_output, null, 2)}</Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={S.traceToggle} onPress={() => setExpanded(!expanded)}>
          <Text style={S.traceToggleText}>{expanded ? 'Collapse' : 'Expand'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function TraceScreen() {
  const { trace, setTrace, sessionId, isLoading, setLoading } = useAgentStore();
  const [filter, setFilter] = useState('all');
  const [traceVisible, setTraceVisible] = useState(false);

  const fetchTrace = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const r = await AgentAPI.getTrace(sessionId);
      setTrace(r.data.entries || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { if (sessionId && trace.length === 0) fetchTrace(); }, [sessionId]);

  const filtered = filter === 'all' ? trace : trace.filter(e => e.trace_type === filter);

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.pageHeader}>
          <View>
            <Text style={S.pageTitle}>Trace</Text>
            <Text style={S.pageSubtitle}>Gemini reasoning steps</Text>
          </View>
          {sessionId && (
            <TouchableOpacity style={S.refreshBtn} onPress={fetchTrace}>
              <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {trace.length === 0 && !isLoading && (
          <View style={S.emptyCard}>
            <Ionicons name="list-outline" size={28} color={colors.textMuted} />
            <Text style={S.emptyTitle}>No trace yet</Text>
            <Text style={S.emptyBody}>Run analysis to see the AI reasoning steps here.</Text>
          </View>
        )}

        {isLoading && (
          <View style={S.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={S.loadingText}>Loading trace…</Text>
          </View>
        )}

        {trace.length > 0 && (
          <>
            {/* ── Summary bar ── */}
            <View style={S.summaryBar}>
              <Text style={S.summaryText}>{trace.length} reasoning steps</Text>
              <TouchableOpacity onPress={() => setTraceVisible(!traceVisible)}>
                <Text style={S.toggleText}>{traceVisible ? 'Hide trace' : 'Show trace'}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Filters ── */}
            {traceVisible && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: spacing.sm }}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[S.filterChip, filter === f.key && S.filterChipActive]}
                    onPress={() => setFilter(f.key)}
                  >
                    <Text style={[S.filterText, filter === f.key && S.filterTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* ── Trace Entries ── */}
            {traceVisible && (
              <View style={S.traceList}>
                {filtered.map((entry, i) => (
                  <TraceRow key={entry.id} entry={entry} index={i} />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, paddingHorizontal: spacing.md },

  pageHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  pageTitle:    { ...typography.largeTitle, color: colors.text },
  pageSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  refreshBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },

  emptyCard:  { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, ...shadows.sm },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyBody:  { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  loadingCard:  { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadows.sm },
  loadingText:  { ...typography.body, color: colors.textSecondary },

  summaryBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  summaryText: { ...typography.bodyMedium, color: colors.text },
  toggleText:  { ...typography.bodyMedium, color: colors.primary },

  filterChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.round, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterText:       { ...typography.caption, color: colors.textMuted },
  filterTextActive: { color: colors.primary, fontWeight: '600' },

  traceList: { gap: 0 },

  traceRow:    { flexDirection: 'row', marginBottom: spacing.sm },
  traceLeft:   { width: 20, alignItems: 'center', marginRight: spacing.sm, paddingTop: 4 },
  traceDot:    { width: 10, height: 10, borderRadius: 5 },
  traceLine:   { flex: 1, width: 1.5, backgroundColor: colors.border, marginTop: 2 },
  traceContent: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },

  traceHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  traceBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.round },
  traceBadgeText:{ ...typography.micro },
  traceToolName: { ...typography.caption, color: colors.success, fontFamily: 'monospace', flex: 1 },
  traceTime:     { ...typography.caption, color: colors.textMuted, marginLeft: 'auto' },

  traceReasoning: { ...typography.caption, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.xs },
  traceDecision:  { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs },
  traceDecisionLabel: { ...typography.micro, color: colors.primary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  traceDecisionText:  { ...typography.caption, color: colors.text },

  traceCode:      { backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border },
  traceCodeLabel: { ...typography.micro, color: colors.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  traceCodeText:  { fontFamily: 'monospace', fontSize: 10, color: colors.textSecondary, lineHeight: 16 },

  traceToggle:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: spacing.xs },
  traceToggleText: { ...typography.caption, color: colors.textMuted },
});
