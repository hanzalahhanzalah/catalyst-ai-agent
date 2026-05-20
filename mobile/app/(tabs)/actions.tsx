import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useAgentStore, Action, ActionStatus } from '../../store/agentStore';
import { AgentAPI } from '../../services/api';

const STATUS_CFG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:    { color: colors.textMuted, bg: colors.surfaceSecondary, icon: 'ellipse-outline',      label: 'Pending'   },
  running:    { color: colors.primary,   bg: colors.primaryLight,     icon: 'sync-outline',         label: 'Running'   },
  success:    { color: colors.success,   bg: colors.successLight,     icon: 'checkmark-circle',     label: 'Complete'  },
  failed:     { color: colors.danger,    bg: colors.dangerLight,      icon: 'close-circle',         label: 'Failed'    },
  retrying:   { color: colors.warning,   bg: colors.warningLight,     icon: 'refresh-circle',       label: 'Retrying'  },
  recovered:  { color: colors.success,   bg: colors.successLight,     icon: 'checkmark-done-circle',label: 'Recovered' },
  skipped:    { color: colors.textMuted, bg: colors.surfaceSecondary, icon: 'remove-circle-outline',label: 'Skipped'   },
  rolled_back:{ color: colors.danger,    bg: colors.dangerLight,      icon: 'arrow-undo-circle',    label: 'Rolled Back'},
};

const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
  critical: { color: colors.danger,  bg: colors.dangerLight  },
  high:     { color: colors.warning, bg: colors.warningLight },
  medium:   { color: colors.primary, bg: colors.primaryLight },
};

function ActionCard({ action, log }: { action: Action; log: string[] }) {
  const cfg = STATUS_CFG[action.status] || STATUS_CFG.pending;
  const priorityCfg = PRIORITY_CFG[action.status === 'pending' ? 'medium' : 'medium'];
  const isRunning = action.status === 'running';
  const isRecovered = action.status === 'success' && log.some(l => l.includes(action.id) && l.includes('recover'));

  return (
    <View style={[S.actionCard, action.status === 'running' && S.actionCardActive]}>
      <View style={S.actionRow}>
        {/* Status icon */}
        <View style={[S.statusDot, { backgroundColor: cfg.bg }]}>
          {isRunning
            ? <ActivityIndicator size="small" color={cfg.color} />
            : <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
          }
        </View>

        <View style={{ flex: 1 }}>
          <View style={S.actionTitleRow}>
            <Text style={S.actionSeq}>{action.sequence_order}</Text>
            <Text style={S.actionName} numberOfLines={2}>{action.name}</Text>
          </View>
          {action.description ? (
            <Text style={S.actionDesc} numberOfLines={2}>{action.description.split('\n')[0]}</Text>
          ) : null}
          {action.rationale ? (
            <Text style={S.actionImpact}>{action.rationale}</Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[S.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[S.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {action.cost_pkr > 0 && (
            <Text style={S.costText}>PKR {action.cost_pkr.toLocaleString()}</Text>
          )}
        </View>
      </View>

      {isRecovered && (
        <View style={S.recoveryBanner}>
          <Ionicons name="refresh-circle" size={13} color={colors.success} />
          <Text style={S.recoveryText}>Recovered via retry and substitution</Text>
        </View>
      )}
    </View>
  );
}

// ── Execution Timeline ────────────────────────────────────────────────────────
const TIMELINE_STEPS = ['Analyzing', 'Planning', 'Executing', 'Complete'];

function Timeline({ activeStep }: { activeStep: number }) {
  return (
    <View style={S.timeline}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <React.Fragment key={step}>
            <View style={S.timelineItem}>
              <View style={[S.timelineDot, done && S.timelineDotDone, active && S.timelineDotActive]}>
                {done
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : active
                    ? <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.5 }] }} />
                    : null
                }
              </View>
              <Text style={[S.timelineLabel, (done || active) && { color: colors.text }]}>{step}</Text>
            </View>
            {i < TIMELINE_STEPS.length - 1 && (
              <View style={[S.timelineLine, done && S.timelineLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function ActionsScreen() {
  const router = useRouter();
  const {
    actions, sessionId, isExecuting, executionComplete,
    setExecuting, setExecutionComplete, setOutcome,
    updateActionStatus, addStreamEvent,
  } = useAgentStore();

  const [log, setLog] = useState<string[]>([]);
  const [timelineStep, setTimelineStep] = useState(0);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 20));

  const runExecution = async () => {
    if (!sessionId) return Alert.alert('No session', 'Run analysis first from Overview tab');
    if (!actions.length) return Alert.alert('No actions', 'Run analysis from Overview tab first');

    setExecuting(true);
    setLog([]);
    setTimelineStep(1); // Planning

    try {
      const res = await AgentAPI.executeChain(sessionId);
      const steps = res.data.steps || [];
      setTimelineStep(2); // Executing

      for (const step of steps) {
        addStreamEvent(step);
        if (step.event === 'action_start') {
          updateActionStatus(step.action_id, 'running');
          addLog(`Starting: ${step.action_name}`);
        } else if (step.event === 'action_failed') {
          updateActionStatus(step.action_id, 'failed');
          addLog(`Failed: ${step.action_name}`);
        } else if (step.event === 'action_recovered') {
          updateActionStatus(step.action_id, 'success');
          addLog(`Recovered via ${step.recovery_action}`);
        } else if (step.event === 'action_complete') {
          updateActionStatus(step.action_id, step.status);
          addLog(`Done: ${step.action_name}`);
        } else if (step.event === 'chain_complete') {
          if (step.before_state && step.after_state) {
            setOutcome(step.before_state, step.after_state, step.total_cost_pkr || 0, step.total_latency_ms || 0);
          }
          try {
            const outcome = await AgentAPI.getOutcome(sessionId);
            const od = outcome.data;
            if (od.before_state && od.after_state) {
              setOutcome(od.before_state, od.after_state, od.total_cost_pkr, od.total_latency_ms);
            }
          } catch (_) {}
          addLog(`All actions complete`);
        }
        await new Promise(r => setTimeout(r, 350));
      }

      setTimelineStep(3); // Complete
      setExecutionComplete(true);

    } catch (e: any) {
      Alert.alert('Execution failed', e.response?.data?.detail || e.message);
    } finally {
      setExecuting(false);
    }
  };

  if (actions.length === 0) {
    return (
      <SafeAreaView style={S.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={S.emptyState}>
          <View style={S.emptyIcon}>
            <Ionicons name="play-circle-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={S.emptyTitle}>No actions yet</Text>
          <Text style={S.emptyBody}>Analyze your content first to generate a recommended action plan.</Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => router.push('/(tabs)/index')}>
            <Text style={S.emptyBtnText}>Go to Overview</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const succeeded = actions.filter(a => a.status === 'success').length;
  const failed    = actions.filter(a => a.status === 'failed').length;
  const totalCost = actions.reduce((s, a) => s + (a.cost_pkr || 0), 0);

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.pageHeader}>
          <Text style={S.pageTitle}>Actions</Text>
          <Text style={S.pageSubtitle}>{actions.length} recommended actions</Text>
        </View>

        {/* ── Timeline ── */}
        <View style={S.timelineCard}>
          <Timeline activeStep={timelineStep} />
        </View>

        {/* ── Stats (after execution) ── */}
        {executionComplete && (
          <View style={S.statsCard}>
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.success }]}>{succeeded}</Text>
              <Text style={S.statLabel}>Completed</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.danger }]}>{failed}</Text>
              <Text style={S.statLabel}>Failed</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.text }]}>PKR {Math.round(totalCost / 1000)}k</Text>
              <Text style={S.statLabel}>Total Cost</Text>
            </View>
          </View>
        )}

        {/* ── Action Cards ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Action Plan</Text>
          {actions.map(a => <ActionCard key={a.id} action={a} log={log} />)}
        </View>

        {/* ── Run Button ── */}
        {!executionComplete && (
          <TouchableOpacity
            style={[S.runBtn, isExecuting && { opacity: 0.8 }]}
            onPress={runExecution}
            disabled={isExecuting}
            activeOpacity={0.88}
          >
            {isExecuting
              ? <><ActivityIndicator color="#fff" /><Text style={S.runBtnText}>Executing…</Text></>
              : <><Ionicons name="play" size={18} color="#fff" /><Text style={S.runBtnText}>Run Action Chain</Text></>
            }
          </TouchableOpacity>
        )}

        {executionComplete && (
          <TouchableOpacity style={S.viewOutcomeBtn} onPress={() => router.push('/(tabs)/outcome')} activeOpacity={0.88}>
            <Text style={S.viewOutcomeBtnText}>View Outcome</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── Execution Log (collapsed) ── */}
        {log.length > 0 && (
          <View style={S.logCard}>
            <Text style={S.logTitle}>Execution Log</Text>
            {log.slice(0, 8).map((l, i) => (
              <Text key={i} style={S.logLine}>· {l}</Text>
            ))}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, paddingHorizontal: spacing.md },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  emptyBody:  { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn:   { marginTop: spacing.lg, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: 13, borderRadius: radius.round },
  emptyBtnText: { ...typography.bodyMedium, color: '#fff' },

  pageHeader:   { paddingTop: spacing.lg, paddingBottom: spacing.md },
  pageTitle:    { ...typography.largeTitle, color: colors.text },
  pageSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },

  timelineCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  timeline:     { flexDirection: 'row', alignItems: 'center' },
  timelineItem: { alignItems: 'center', gap: 5 },
  timelineDot:  { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  timelineDotDone:   { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineLabel:{ ...typography.micro, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  timelineLine: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 16 },
  timelineLineDone: { backgroundColor: colors.success },

  statsCard:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', marginBottom: spacing.md, ...shadows.sm },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { ...typography.h2, fontWeight: '700' },
  statLabel:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: 4 },

  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm },

  actionCard:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  actionCardActive: { borderWidth: 1, borderColor: colors.primary },
  actionRow:        { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  statusDot:        { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  actionSeq:        { ...typography.label, color: colors.textMuted, width: 16 },
  actionName:       { ...typography.bodyMedium, color: colors.text, flex: 1 },
  actionDesc:       { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  actionImpact:     { ...typography.caption, color: colors.primary, marginTop: 4, fontWeight: '500' },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.round },
  statusBadgeText:  { ...typography.micro },
  costText:         { ...typography.caption, color: colors.textMuted },
  recoveryBanner:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  recoveryText:     { ...typography.caption, color: colors.success },

  runBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: 17, marginBottom: spacing.sm, ...shadows.md },
  runBtnText:     { ...typography.h3, color: '#fff', fontSize: 16 },
  viewOutcomeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brandLight, borderRadius: radius.lg, paddingVertical: 14, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.brandMid },
  viewOutcomeBtnText: { ...typography.bodyMedium, color: colors.brand },

  logCard:  { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  logTitle: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  logLine:  { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
});
