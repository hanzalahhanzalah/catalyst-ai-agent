import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal, Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useAgentStore } from '../../store/agentStore';
import { AgentAPI } from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const TOUR_KEY = 'catalyst_tour_done';

// ── Onboarding Tour ───────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    icon: 'sparkles' as const,
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    title: 'Welcome to Catalyst AI',
    body: 'Your autonomous AI executive assistant. Analyze any business content and get instant actionable insights.',
  },
  {
    icon: 'document-text-outline' as const,
    iconBg: '#E3F2FD',
    iconColor: '#1565C0',
    title: 'Add Your Content',
    body: 'Paste reports, emails, supplier messages, or sales data. Add multiple sources and Gemini will find conflicts between them.',
  },
  {
    icon: 'bulb-outline' as const,
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
    title: 'Get AI Insights',
    body: 'Gemini AI reads your content, extracts critical insights, detects contradictions, and builds an action plan — all automatically.',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    title: 'See Real Outcomes',
    body: 'Run the action chain and see before-vs-after metrics. Every result is generated fresh from your actual content — nothing is scripted.',
  },
];

function OnboardingTour({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const current = TOUR_STEPS[step];

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible, step]);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setStep(s => s + 1);
      });
    } else {
      onDone();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={T.overlay}>
        <Animated.View style={[T.card, { opacity: fade }]}>
          {/* Close */}
          <TouchableOpacity style={T.closeBtn} onPress={onDone}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[T.tourIcon, { backgroundColor: current.iconBg }]}>
            <Ionicons name={current.icon} size={32} color={current.iconColor} />
          </View>

          {/* Text */}
          <Text style={T.tourTitle}>{current.title}</Text>
          <Text style={T.tourBody}>{current.body}</Text>

          {/* Step dots */}
          <View style={T.dots}>
            {TOUR_STEPS.map((_, i) => (
              <View key={i} style={[T.dot, i === step && T.dotActive]} />
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={T.nextBtn} onPress={next} activeOpacity={0.88}>
            <Text style={T.nextBtnText}>
              {step === TOUR_STEPS.length - 1 ? "Let's start" : 'Next'}
            </Text>
            <Ionicons name={step === TOUR_STEPS.length - 1 ? 'checkmark' : 'arrow-forward'} size={16} color="#fff" />
          </TouchableOpacity>

          {step < TOUR_STEPS.length - 1 && (
            <TouchableOpacity onPress={onDone} style={T.skipBtn}>
              <Text style={T.skipText}>Skip tour</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Source Tag ────────────────────────────────────────────────────────────────
function SourceTag({ source, onRemove }: { source: any; onRemove: () => void }) {
  return (
    <View style={S.tag}>
      <Ionicons name="document-text" size={12} color={colors.success} />
      <Text style={S.tagText} numberOfLines={1}>{source.name}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={13} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const INPUT_MODES = [
  { key: 'text', label: 'Paste Text', icon: 'document-text-outline' as const },
  { key: 'url',  label: 'From URL',   icon: 'link-outline' as const           },
  { key: 'file', label: 'Upload File', icon: 'cloud-upload-outline' as const  },
];

const SOURCE_TYPES = [
  { key: 'report',   label: 'Report'  },
  { key: 'email',    label: 'Email'   },
  { key: 'text',     label: 'General' },
  { key: 'csv_data', label: 'Data'    },
];

export default function OverviewScreen() {
  const router = useRouter();
  const { sessionId, setSessionId, setSources, setAnalysisResult, setLoading, isLoading } = useAgentStore();

  const [mode, setMode]               = useState<'text' | 'url'>('text');
  const [sourceName, setSourceName]   = useState('');
  const [textContent, setTextContent] = useState('');
  const [sourceType, setSourceType]   = useState('report');
  const [urlInput, setUrlInput]       = useState('');
  const [localSources, setLocalSources] = useState<any[]>([]);
  const [currentSid, setCurrentSid]   = useState<string | null>(sessionId);
  const [isAdding, setIsAdding]       = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [showTour, setShowTour]       = useState(false);

  // Show tour on first install
  useEffect(() => {
    AsyncStorage.getItem(TOUR_KEY).then(done => {
      if (!done) setShowTour(true);
    });
  }, []);

  const completeTour = async () => {
    setShowTour(false);
    await AsyncStorage.setItem(TOUR_KEY, '1');
  };

  const reopenTour = () => setShowTour(true);

  // ── Session ─────────────────────────────────────────────────────────────────
  const ensureSession = async (): Promise<string> => {
    if (currentSid) return currentSid;
    const r = await AgentAPI.newSession();
    const id = r.data.session_id;
    setCurrentSid(id); setSessionId(id);
    return id;
  };

  // ── Add Text Source ──────────────────────────────────────────────────────────
  const addTextSource = async () => {
    if (!textContent.trim()) return Alert.alert('No content', 'Paste some content first.');
    const name = sourceName.trim() || `Source ${localSources.length + 1}`;
    setIsAdding(true);
    try {
      const sid = await ensureSession();
      const r = await AgentAPI.addTextSource(sid, name, textContent.trim(), sourceType);
      const s = { id: r.data.source_id, name, type: sourceType, metadata: { word_count: r.data.word_count } };
      const updated = [...localSources, s];
      setLocalSources(updated); setSources(updated);
      setSourceName(''); setTextContent('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not add source');
    } finally { setIsAdding(false); }
  };

  // ── Add URL Source ───────────────────────────────────────────────────────────
  const addUrlSource = async () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setIsAdding(true);
    try {
      const sid = await ensureSession();
      const r = await AgentAPI.addUrlSource(sid, url, sourceName.trim() || undefined);
      const s = { id: r.data.source_id, name: r.data.name || url, type: 'web', metadata: {} };
      const updated = [...localSources, s];
      setLocalSources(updated); setSources(updated);
      setUrlInput(''); setSourceName('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not fetch URL');
    } finally { setIsAdding(false); }
  };

  // ── Upload File from Device ──────────────────────────────────────────────────
  const pickAndUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setIsAdding(true);

      const sid = await ensureSession();
      const formData = new FormData();
      formData.append('session_id', sid);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any);

      const r = await AgentAPI.uploadFile(sid, formData);
      const s = {
        id: r.data.source_id,
        name: r.data.name || asset.name,
        type: asset.name.endsWith('.pdf') ? 'pdf' : asset.name.endsWith('.csv') ? 'csv' : 'text',
        metadata: { size: asset.size },
      };
      const updated = [...localSources, s];
      setLocalSources(updated); setSources(updated);
    } catch (e: any) {
      Alert.alert('Upload Error', e.response?.data?.detail || e.message || 'Could not upload file');
    } finally { setIsAdding(false); }
  };

  // ── Remove Source ────────────────────────────────────────────────────────────
  const removeSource = async (id: string) => {
    if (currentSid) try { await AgentAPI.deleteSource(currentSid, id); } catch (_) {}
    const updated = localSources.filter(s => s.id !== id);
    setLocalSources(updated); setSources(updated);
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setLocalSources([]); setCurrentSid(null);
    setSessionId(null); setSources([]);
    setSourceName(''); setTextContent(''); setUrlInput('');
  };

  // ── Analyze ──────────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!currentSid || !localSources.length) return Alert.alert('Add a source first');
    setLoading(true);
    const STEPS = [
      'Reading your sources…',
      'Detecting domain & urgency…',
      'Extracting key insights…',
      'Detecting contradictions…',
      'Planning action chain…',
    ];
    let si = 0; setAnalysisStep(STEPS[0]);
    const t = setInterval(() => {
      si = Math.min(si + 1, STEPS.length - 1);
      setAnalysisStep(STEPS[si]);
    }, 5000);
    try {
      const r = await AgentAPI.analyze(currentSid);
      clearInterval(t); setAnalysisResult(r.data);
      router.push('/(tabs)/insights');
    } catch (e: any) {
      clearInterval(t);
      Alert.alert('Analysis failed', e.response?.data?.detail || e.message || 'Please try again');
    } finally { setLoading(false); setAnalysisStep(''); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      {/* Onboarding tour modal */}
      <OnboardingTour visible={showTour} onDone={completeTour} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Scrollable content ── */}
        <ScrollView
          style={S.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: localSources.length > 0 ? 100 : 40 }}
        >
          {/* ── Header ── */}
          <View style={S.header}>
            <View style={S.logoRow}>
              {/* Logo mark — matches splash screen */}
              <View style={S.logoMark}>
                <Ionicons name="flash" size={16} color="#fff" />
              </View>
              <View>
                <Text style={S.appName}>Catalyst AI</Text>
                <Text style={S.appTagline}>From insight to action — instantly</Text>
              </View>
            </View>
            <TouchableOpacity style={S.tourBtn} onPress={reopenTour}>
              <Ionicons name="compass-outline" size={17} color={colors.brand} />
              <Text style={S.tourBtnText}>Tour</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sources Added ── */}
          {localSources.length > 0 && (
            <View style={S.sourcesCard}>
              <View style={S.sourcesCardHeader}>
                <View style={S.sourcesReadyRow}>
                  <View style={S.greenDot} />
                  <Text style={S.sourcesCardTitle}>{localSources.length} source{localSources.length > 1 ? 's' : ''} ready</Text>
                </View>
                <TouchableOpacity onPress={reset}>
                  <Text style={S.clearText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <View style={S.tagsRow}>
                {localSources.map(s => (
                  <SourceTag key={s.id} source={s} onRemove={() => removeSource(s.id)} />
                ))}
              </View>
              {localSources.length === 1 && (
                <View style={S.tipRow}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                  <Text style={S.tipText}>Add a second source to detect contradictions between them</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Input Mode Toggle ── */}
          <View style={S.segmented}>
            {INPUT_MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[S.segBtn, mode === m.key && S.segBtnActive]}
                onPress={() => setMode(m.key as any)}
              >
                <Ionicons
                  name={m.icon}
                  size={14}
                  color={mode === m.key ? colors.primary : colors.textMuted}
                />
                <Text style={[S.segText, mode === m.key && S.segTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Input Card ── */}
          <View style={S.inputCard}>
            {/* Name */}
            <TextInput
              style={S.nameInput}
              placeholder={mode === 'url' ? 'Label (optional)' : 'Name — e.g. "Q1 Sales Report"'}
              placeholderTextColor={colors.textMuted}
              value={sourceName}
              onChangeText={setSourceName}
            />

            {mode === 'text' ? (
              <>
                {/* Type selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {SOURCE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[S.typeBtn, sourceType === t.key && S.typeBtnActive]}
                      onPress={() => setSourceType(t.key)}
                    >
                      <Text style={[S.typeBtnText, sourceType === t.key && S.typeBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Text area */}
                <TextInput
                  style={S.textarea}
                  placeholder={'Paste your business content here…\n\nReports, emails, supplier messages, sales data, news — anything relevant to your business problem.'}
                  placeholderTextColor={colors.textMuted}
                  value={textContent}
                  onChangeText={setTextContent}
                  multiline
                  textAlignVertical="top"
                />

                {/* Add button — light green */}
                <TouchableOpacity
                  style={[S.addBtn, (!textContent.trim() || isAdding) && S.addBtnDisabled]}
                  onPress={addTextSource}
                  disabled={!textContent.trim() || isAdding}
                >
                  {isAdding
                    ? <ActivityIndicator size="small" color={colors.success} />
                    : <Ionicons name="add-circle-outline" size={16} color={colors.success} />
                  }
                  <Text style={S.addBtnText}>{isAdding ? 'Adding…' : 'Add Source'}</Text>
                </TouchableOpacity>
              </>
            ) : mode === 'url' ? (
              <>
                <TextInput
                  style={S.nameInput}
                  placeholder="https://example.com/article"
                  placeholderTextColor={colors.textMuted}
                  value={urlInput}
                  onChangeText={setUrlInput}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[S.addBtn, (!urlInput.trim() || isAdding) && S.addBtnDisabled]}
                  onPress={addUrlSource}
                  disabled={!urlInput.trim() || isAdding}
                >
                  {isAdding
                    ? <ActivityIndicator size="small" color={colors.success} />
                    : <Ionicons name="globe-outline" size={16} color={colors.success} />
                  }
                  <Text style={S.addBtnText}>{isAdding ? 'Fetching…' : 'Fetch & Add'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── File Upload Mode — compact ── */
              <>
                {/* Top row: icon + text side by side */}
                <View style={S.fileUploadRow}>
                  <View style={S.fileUploadIconSm}>
                    <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.fileUploadTitleSm}>Upload from your device</Text>
                    <View style={S.fileTypeRowInline}>
                      {['PDF', 'CSV', 'TXT'].map(t => (
                        <View key={t} style={S.fileTypeBadgeSm}>
                          <Text style={S.fileTypeBadgeSmText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Full-width browse button */}
                <TouchableOpacity
                  style={[S.browseBtn, isAdding && S.addBtnDisabled]}
                  onPress={pickAndUploadFile}
                  disabled={isAdding}
                >
                  {isAdding
                    ? <ActivityIndicator size="small" color={colors.success} />
                    : <Ionicons name="folder-open-outline" size={16} color={colors.success} />
                  }
                  <Text style={S.addBtnText}>{isAdding ? 'Uploading…' : 'Browse & Pick File'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Empty prompt ── */}
          {localSources.length === 0 && (
            <View style={S.emptyHint}>
              <Ionicons name="arrow-up-outline" size={18} color={colors.textMuted} />
              <Text style={S.emptyHintText}>Paste your first source above to get started</Text>
            </View>
          )}

        </ScrollView>

        {/* ── STICKY ANALYZE BUTTON — always visible at bottom ── */}
        {localSources.length > 0 && (
          <View style={S.stickyFooter}>
            {isLoading ? (
              <View style={S.analyzeLoading}>
                <ActivityIndicator color="#fff" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={S.analyzeBtnText}>Analyzing…</Text>
                  {!!analysisStep && <Text style={S.analyzeStepText}>{analysisStep}</Text>}
                </View>
              </View>
            ) : (
              <TouchableOpacity style={S.analyzeBtn} onPress={analyze} activeOpacity={0.88}>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={S.analyzeBtnText}>
                  Analyze {localSources.length} Source{localSources.length > 1 ? 's' : ''} with Gemini
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Tour Styles ───────────────────────────────────────────────────────────────
const T = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 48,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  tourTitle: { ...typography.h1, color: colors.text, textAlign: 'center', marginBottom: 10 },
  tourBody:  { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.primary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, gap: 8, marginBottom: 12,
  },
  nextBtnText: { ...typography.h3, color: '#fff', fontSize: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { ...typography.body, color: colors.textMuted },
});

// ── Screen Styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, paddingHorizontal: spacing.md },

  // Sticky Analyze footer
  stickyFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark:   { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  appName:    { ...typography.h1, color: colors.text, letterSpacing: -0.3 },
  appTagline: { ...typography.caption, color: colors.brand, marginTop: 1, fontWeight: '500' },
  tourBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandLight, borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 7, ...shadows.sm },
  tourBtnText:{ ...typography.caption, color: colors.brand, fontWeight: '600' },

  // Sources added
  sourcesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm, borderWidth: 1, borderColor: colors.successMid },
  sourcesCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sourcesReadyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourcesCardTitle:  { ...typography.bodyMedium, color: colors.text },
  greenDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  clearText: { ...typography.caption, color: colors.danger },
  tagsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successLight, borderRadius: radius.round, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.successMid },
  tagText:   { ...typography.caption, color: '#065F46', maxWidth: 130, fontWeight: '500' },
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  tipText:   { ...typography.caption, color: colors.brand, flex: 1 },

  // Segmented control
  segmented:    { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: 3, marginBottom: spacing.sm },
  segBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.sm - 2 },
  segBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  segText:      { ...typography.label, color: colors.textMuted },
  segTextActive:{ color: colors.text },

  // Input card
  inputCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadows.sm },
  nameInput: { backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
  typeBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.round, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  typeBtnActive:    { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  typeBtnText:      { ...typography.caption, color: colors.textMuted },
  typeBtnTextActive:{ color: colors.success, fontWeight: '600' },
  textarea: {
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 11,
    minHeight: 100, ...typography.body, color: colors.text,
    borderWidth: 1, borderColor: colors.border, lineHeight: 22,
  },
  // Light green add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#ECFDF5', borderRadius: radius.md,
    paddingVertical: 11, borderWidth: 1, borderColor: '#6EE7B7',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { ...typography.bodyMedium, color: colors.success },

  // Analyze
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.brand, borderRadius: radius.lg,
    paddingVertical: 17, marginBottom: spacing.sm, ...shadows.md,
  },
  analyzeLoading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.brand, borderRadius: radius.lg,
    paddingVertical: 17, marginBottom: spacing.sm, opacity: 0.85,
  },
  analyzeBtnText:  { ...typography.h3, color: '#fff', fontSize: 15 },
  analyzeStepText: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },

  // Compact file upload section
  fileUploadRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileUploadIconSm:   { width: 46, height: 46, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  fileUploadTitleSm:  { ...typography.bodyMedium, color: colors.text, marginBottom: 6 },
  fileTypeRowInline:  { flexDirection: 'row', gap: 6 },
  fileTypeBadgeSm:    { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.surfaceSecondary, borderRadius: radius.round, borderWidth: 1, borderColor: colors.border },
  fileTypeBadgeSmText:{ ...typography.micro, color: colors.textMuted, fontWeight: '600' },

  // Full-width browse button
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#ECFDF5',
    borderRadius: radius.md, paddingVertical: 12,
    borderWidth: 1, borderColor: '#6EE7B7',
    alignSelf: 'stretch',   // ← ensures full width inside the card
  },

  // Empty hint
  emptyHint:     { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyHintText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
