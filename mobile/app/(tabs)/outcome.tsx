import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useAgentStore } from '../../store/agentStore';

function MetricRow({ label, before, after, unit = '', lowerIsBetter = false }: {
  label: string; before: number | string; after: number | string;
  unit?: string; lowerIsBetter?: boolean;
}) {
  const bNum = typeof before === 'number' ? before : parseFloat(String(before)) || 0;
  const aNum = typeof after  === 'number' ? after  : parseFloat(String(after))  || 0;
  const improved = lowerIsBetter ? aNum < bNum : aNum > bNum;
  const same     = aNum === bNum;
  const arrow    = same ? null : improved ? 'arrow-down' : 'arrow-up';
  const arrowColor = same ? colors.textMuted : improved ? colors.success : colors.danger;

  return (
    <View style={S.metricRow}>
      <Text style={S.metricLabel}>{label}</Text>
      <View style={S.metricVals}>
        <Text style={S.metricBefore}>{String(before)}{unit}</Text>
        <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
        <Text style={[S.metricAfter, { color: same ? colors.textMuted : improved ? colors.success : colors.danger }]}>
          {String(after)}{unit}
        </Text>
        {!same && <Ionicons name={arrow as any} size={12} color={arrowColor} />}
      </View>
    </View>
  );
}

export default function OutcomeScreen() {
  const router = useRouter();
  const { beforeState, afterState, totalCostPkr, totalLatencyMs, actions, insights } = useAgentStore();

  if (!beforeState || !afterState) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.emptyState}>
          <View style={S.emptyIcon}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={S.emptyTitle}>No outcome yet</Text>
          <Text style={S.emptyBody}>Execute the action chain on the Actions tab to see your results.</Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => router.push('/(tabs)/actions')}>
            <Text style={S.emptyBtnText}>Go to Actions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const riskBefore = beforeState.stockout_risk_pct ?? 60;
  const riskAfter  = afterState.stockout_risk_pct  ?? 20;
  const riskDelta  = riskBefore - riskAfter;

  const succeeded = actions.filter(a => a.status === 'success').length;
  const recovered = actions.filter(a => a.recovery_action).length;
  const latencyS  = (totalLatencyMs / 1000).toFixed(1);

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.pageHeader}>
          <Text style={S.pageTitle}>Outcome</Text>
          <Text style={S.pageSubtitle}>Before & after comparison</Text>
        </View>

        {/* ── Success Hero Card ── */}
        <View style={S.heroCard}>
          <View style={S.heroIcon}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          </View>
          <Text style={S.heroTitle}>Execution Complete</Text>
          <Text style={S.heroSubtitle}>
            {succeeded} of {actions.length} actions completed · {recovered > 0 ? `${recovered} recovered · ` : ''}{latencyS}s total
          </Text>

          {/* Primary metric */}
          {riskDelta > 0 && (
            <View style={S.primaryMetric}>
              <Text style={S.primaryMetricNum}>{riskDelta}%</Text>
              <Text style={S.primaryMetricLabel}>Risk Reduction</Text>
            </View>
          )}
        </View>

        {/* ── Key Outcomes ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Key Outcomes</Text>

          <View style={S.outcomeGrid}>
            <View style={S.outcomeItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
              <Text style={S.outcomeNum}>{riskAfter}%</Text>
              <Text style={S.outcomeLabel}>Risk Level</Text>
              <Text style={S.outcomeDelta}>was {riskBefore}%</Text>
            </View>

            <View style={S.outcomeItem}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <Text style={S.outcomeNum}>{afterState.customer_notifications_sent ?? 0}</Text>
              <Text style={S.outcomeLabel}>Notified</Text>
              <Text style={S.outcomeDelta}>customers</Text>
            </View>

            <View style={S.outcomeItem}>
              <Ionicons name="cube-outline" size={20} color={colors.warning} />
              <Text style={S.outcomeNum}>{afterState.pending_orders ?? 0}</Text>
              <Text style={S.outcomeLabel}>Orders</Text>
              <Text style={S.outcomeDelta}>pending</Text>
            </View>

            <View style={S.outcomeItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={S.outcomeNum}>{succeeded}</Text>
              <Text style={S.outcomeLabel}>Completed</Text>
              <Text style={S.outcomeDelta}>of {actions.length} actions</Text>
            </View>
          </View>
        </View>

        {/* ── Before / After Comparison ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Before vs After</Text>
          <View style={S.compareCard}>
            <MetricRow label="Risk Level"            before={riskBefore} after={riskAfter} unit="%" lowerIsBetter />
            <View style={S.compareDiv} />
            <MetricRow label="Pending Orders"        before={beforeState.pending_orders ?? 0} after={afterState.pending_orders ?? 0} />
            <View style={S.compareDiv} />
            <MetricRow label="Customers Notified"    before={beforeState.customer_notifications_sent ?? 0} after={afterState.customer_notifications_sent ?? 0} />
            <View style={S.compareDiv} />
            <MetricRow label="Emergency Order"       before={beforeState.emergency_order_placed ? 'Yes' : 'No'} after={afterState.emergency_order_placed ? 'Yes' : 'No'} />
            <View style={S.compareDiv} />
            <MetricRow label="Monitoring Active"     before={beforeState.monitoring_active ? 'Yes' : 'No'} after={afterState.monitoring_active ? 'Yes' : 'No'} />
          </View>
        </View>

        {/* ── Cost & Performance ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Execution Summary</Text>
          <View style={S.perfCard}>
            <View style={S.perfRow}>
              <Ionicons name="wallet-outline" size={18} color={colors.textSecondary} />
              <Text style={S.perfLabel}>Total Cost</Text>
              <Text style={S.perfVal}>PKR {totalCostPkr.toLocaleString()}</Text>
            </View>
            <View style={S.compareDiv} />
            <View style={S.perfRow}>
              <Ionicons name="timer-outline" size={18} color={colors.textSecondary} />
              <Text style={S.perfLabel}>Execution Time</Text>
              <Text style={S.perfVal}>{latencyS}s</Text>
            </View>
            <View style={S.compareDiv} />
            <View style={S.perfRow}>
              <Ionicons name="refresh-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={S.perfLabel}>Recovery Events</Text>
              <Text style={[S.perfVal, { color: recovered > 0 ? colors.success : colors.textMuted }]}>{recovered}</Text>
            </View>
          </View>
        </View>

        {/* ── CTA: View Trace ── */}
        <TouchableOpacity style={S.traceBtn} onPress={() => router.push('/(tabs)/trace')} activeOpacity={0.88}>
          <Ionicons name="list-outline" size={16} color={colors.textSecondary} />
          <Text style={S.traceBtnText}>View full agent reasoning trace</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </TouchableOpacity>

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

  heroCard:     { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md, ...shadows.md },
  heroIcon:     { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  heroTitle:    { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  heroSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  primaryMetric:{ marginTop: spacing.lg, alignItems: 'center', backgroundColor: colors.successLight, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  primaryMetricNum: { fontSize: 40, fontWeight: '800', color: colors.success, letterSpacing: -1 },
  primaryMetricLabel: { ...typography.bodyMedium, color: colors.success },

  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm },

  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  outcomeItem: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 3, ...shadows.sm },
  outcomeNum:  { ...typography.h1, color: colors.text, marginTop: 4 },
  outcomeLabel:{ ...typography.caption, color: colors.textSecondary },
  outcomeDelta:{ ...typography.micro, color: colors.textMuted },

  compareCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },
  compareDiv:  { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  metricRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { ...typography.body, color: colors.textSecondary },
  metricVals:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricBefore:{ ...typography.caption, color: colors.textMuted },
  metricAfter: { ...typography.bodyMedium },

  perfCard:  { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },
  perfRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perfLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  perfVal:   { ...typography.bodyMedium, color: colors.text },

  traceBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  traceBtnText: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
