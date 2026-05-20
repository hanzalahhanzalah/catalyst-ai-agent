import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useAgentStore, Insight, Contradiction } from '../../store/agentStore';

const IMPACT: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: colors.danger,  bg: colors.dangerLight,  label: 'Critical'  },
  high:     { color: colors.warning, bg: colors.warningLight, label: 'High'      },
  medium:   { color: colors.primary, bg: colors.primaryLight, label: 'Medium'    },
  low:      { color: colors.textMuted, bg: colors.surfaceSecondary, label: 'Low' },
};

const TYPE_ICON: Record<string, string> = {
  risk:         'warning-outline',
  opportunity:  'trending-up-outline',
  trend:        'analytics-outline',
  anomaly:      'alert-circle-outline',
  contradiction:'git-compare-outline',
  signal:       'radio-outline',
};

function UrgencyBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    critical: { color: colors.danger,  bg: colors.dangerLight  },
    high:     { color: colors.warning, bg: colors.warningLight },
    medium:   { color: colors.primary, bg: colors.primaryLight },
    low:      { color: colors.success, bg: colors.successLight },
  };
  const cfg = map[level] || map.medium;
  return (
    <View style={[S.urgencyBadge, { backgroundColor: cfg.bg }]}>
      <View style={[S.urgencyDot, { backgroundColor: cfg.color }]} />
      <Text style={[S.urgencyText, { color: cfg.color }]}>{level.charAt(0).toUpperCase() + level.slice(1)} Urgency</Text>
    </View>
  );
}

function InsightCard({ insight, defaultExpanded = false }: { insight: Insight; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const imp = IMPACT[insight.impact_level] || IMPACT.medium;
  const icon = TYPE_ICON[insight.type] || 'radio-outline';

  return (
    <TouchableOpacity style={S.insightCard} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
      <View style={S.insightRow}>
        <View style={[S.insightIcon, { backgroundColor: imp.bg }]}>
          <Ionicons name={icon as any} size={16} color={imp.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.insightTitle} numberOfLines={expanded ? undefined : 2}>{insight.title}</Text>
          {insight.metric && (
            <Text style={[S.insightMetric, { color: imp.color }]}>{insight.metric}: {insight.value}</Text>
          )}
        </View>
        <View style={[S.impactBadge, { backgroundColor: imp.bg }]}>
          <Text style={[S.impactBadgeText, { color: imp.color }]}>{imp.label}</Text>
        </View>
      </View>

      {expanded && (
        <View style={S.insightExpanded}>
          <Text style={S.insightDesc}>{insight.description}</Text>
          <View style={S.confidenceRow}>
            <Text style={S.confidenceLabel}>Confidence</Text>
            <View style={S.confidenceBar}>
              <View style={[S.confidenceFill, { width: `${insight.confidence * 100}%` as any, backgroundColor: imp.color }]} />
            </View>
            <Text style={[S.confidenceLabel, { color: imp.color }]}>{Math.round(insight.confidence * 100)}%</Text>
          </View>
        </View>
      )}

      <View style={S.expandRow}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function ContradictionCard({ c }: { c: Contradiction }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={S.conflictCard} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
      <View style={S.conflictHeader}>
        <View style={S.conflictBadge}>
          <Ionicons name="git-compare-outline" size={14} color={colors.purple} />
          <Text style={S.conflictBadgeText}>Conflict Detected</Text>
        </View>
        <Text style={S.conflictMetric}>{c.metric.replace(/_/g, ' ')}</Text>
      </View>
      <View style={S.conflictSides}>
        <View style={[S.conflictSide, { borderColor: colors.dangerMid }]}>
          <Text style={S.conflictSideLabel}>{c.source_a_id}</Text>
          <Text style={S.conflictSideVal} numberOfLines={2}>{c.value_a}</Text>
        </View>
        <View style={S.conflictVs}><Text style={S.conflictVsText}>vs</Text></View>
        <View style={[S.conflictSide, { borderColor: colors.successMid }]}>
          <Text style={S.conflictSideLabel}>{c.source_b_id}</Text>
          <Text style={[S.conflictSideVal, { color: colors.success }]} numberOfLines={2}>{c.value_b}</Text>
        </View>
      </View>
      <View style={S.conflictResolved}>
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text style={S.conflictResolvedText} numberOfLines={expanded ? undefined : 1}>
          Resolved: {c.winner_id} — {c.resolution_reason}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function InsightsScreen() {
  const { insights, contradictions, trends } = useAgentStore();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  if (insights.length === 0) {
    return (
      <SafeAreaView style={S.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={S.emptyState}>
          <View style={S.emptyIcon}>
            <Ionicons name="bulb-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={S.emptyTitle}>No analysis yet</Text>
          <Text style={S.emptyBody}>Go to Overview, add your content, and tap Analyze.</Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => router.push('/(tabs)/index')}>
            <Text style={S.emptyBtnText}>Add Content</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Find the urgency from the most critical insight
  const topImpact = insights[0]?.impact_level || 'medium';
  const critical = insights.filter(i => i.impact_level === 'critical').length;
  const displayInsights = showAll ? insights : insights.slice(0, 3);

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.pageHeader}>
          <Text style={S.pageTitle}>Insights</Text>
          <Text style={S.pageSubtitle}>AI analysis of your uploaded content</Text>
        </View>

        {/* ── Executive Summary ── */}
        <View style={S.summaryCard}>
          <UrgencyBadge level={topImpact === 'critical' ? 'critical' : topImpact === 'high' ? 'high' : 'medium'} />
          <Text style={S.summaryTitle}>
            {critical > 0 ? `${critical} critical issue${critical > 1 ? 's' : ''} detected` : 'Analysis complete'}
          </Text>
          <Text style={S.summaryBody}>{insights[0]?.description || 'Review the insights below for a detailed breakdown.'}</Text>

          {/* Stats row */}
          <View style={S.statsRow}>
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.danger }]}>{critical}</Text>
              <Text style={S.statLabel}>Critical</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.purple }]}>{contradictions.length}</Text>
              <Text style={S.statLabel}>Conflicts</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statNum, { color: colors.text }]}>{insights.length}</Text>
              <Text style={S.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* ── Contradictions ── */}
        {contradictions.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Conflicts Between Sources</Text>
            {contradictions.map(c => <ContradictionCard key={c.id} c={c} />)}
          </View>
        )}

        {/* ── Insights ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Key Insights</Text>
          {displayInsights.map((ins, i) => <InsightCard key={ins.id} insight={ins} defaultExpanded={i === 0} />)}
          {insights.length > 3 && (
            <TouchableOpacity style={S.viewMoreBtn} onPress={() => setShowAll(!showAll)}>
              <Text style={S.viewMoreText}>{showAll ? 'Show less' : `View ${insights.length - 3} more insights`}</Text>
              <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Trends ── */}
        {trends.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Trends</Text>
            {trends.map((t, i) => (
              <View key={i} style={S.trendCard}>
                <View style={{ flex: 1 }}>
                  <Text style={S.trendName}>{t.product}</Text>
                  <Text style={S.trendInsight}>{t.insight}</Text>
                </View>
                <Text style={[S.trendDir, {
                  color: t.direction === 'CRITICAL' ? colors.danger :
                         t.direction === 'DOWN' ? colors.warning : colors.success
                }]}>
                  {t.change_pct > 0 ? '+' : ''}{t.change_pct}%
                </Text>
              </View>
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

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round, marginBottom: spacing.sm },
  urgencyDot:  { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { ...typography.label },
  summaryTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  summaryBody:  { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  statsRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { ...typography.h1, fontSize: 26 },
  statLabel:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.divider },

  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm },

  insightCard:    { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  insightRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  insightIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightTitle:   { ...typography.bodyMedium, color: colors.text, flex: 1, lineHeight: 20 },
  insightMetric:  { ...typography.caption, marginTop: 3, fontWeight: '600' },
  impactBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.round },
  impactBadgeText:{ ...typography.micro },
  insightExpanded:{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  insightDesc:    { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
  confidenceRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidenceLabel:{ ...typography.caption, color: colors.textMuted, width: 65 },
  confidenceBar:  { flex: 1, height: 4, backgroundColor: colors.surfaceSecondary, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { height: 4, borderRadius: 2 },
  expandRow:      { alignItems: 'center', marginTop: spacing.xs },

  viewMoreBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm },
  viewMoreText: { ...typography.bodyMedium, color: colors.primary },

  conflictCard:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.purple, ...shadows.sm },
  conflictHeader: { marginBottom: spacing.sm },
  conflictBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.purpleLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.round, marginBottom: 4 },
  conflictBadgeText: { ...typography.label, color: colors.purple },
  conflictMetric: { ...typography.h3, color: colors.text, textTransform: 'capitalize' },
  conflictSides:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  conflictSide:   { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  conflictSideLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 3 },
  conflictSideVal:   { ...typography.caption, color: colors.text, fontWeight: '500', lineHeight: 18 },
  conflictVs:     { alignItems: 'center', justifyContent: 'center' },
  conflictVsText: { ...typography.caption, color: colors.textMuted },
  conflictResolved: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  conflictResolvedText: { ...typography.caption, color: colors.success, flex: 1, lineHeight: 18 },

  trendCard:  { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', ...shadows.sm },
  trendName:  { ...typography.bodyMedium, color: colors.text },
  trendInsight: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  trendDir:   { ...typography.h2, fontWeight: '700' },
});
