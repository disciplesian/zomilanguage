import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Play,
  RotateCcw,
  Download,
  ClipboardPaste,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { trpc } from '@/lib/trpc';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ParsedEntry {
  english: string;
  zomi: string;
  pos?: string;
  explanation?: string;
  usageExample?: string;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  total: number;
}

type ImportMode = 'add_only' | 'update_only' | 'upsert';

const BATCH_SIZE = 100;

export default function DictionaryImportScreen() {
  const { localUser } = useUserProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [csvInput, setCsvInput] = useState('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [manualEntry, setManualEntry] = useState({ english: '', zomi: '', pos: '', explanation: '', usageExample: '' });
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');

  const bulkImportMutation = trpc.dictionary.bulkImport.useMutation();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const parseCSV = useCallback((text: string): ParsedEntry[] => {
    if (!text.trim()) return [];

    const lines = text.trim().split('\n');
    const entries: ParsedEntry[] = [];

    let headerLine = lines[0];
    let startIndex = 0;

    const headerLower = headerLine.toLowerCase();
    const headerParts = headerLower.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    const hasHeader = headerParts.some(h => 
      h === 'english' || h === 'zomi' || h === 'pos' || 
      h === 'explanation' || h.includes('usage') || h.includes('example')
    );

    let colMap = { english: 0, zomi: 1, pos: 2, explanation: 3, usageExample: 4 };

    if (hasHeader) {
      startIndex = 1;
      const englishIdx = headerParts.findIndex(h => h === 'english' || h.includes('english'));
      const zomiIdx = headerParts.findIndex(h => h === 'zomi' || h.includes('zomi') || h.includes('tedim'));
      const posIdx = headerParts.findIndex(h => h === 'pos' || h.includes('part of speech') || h.includes('pos'));
      const explanationIdx = headerParts.findIndex(h => h === 'explanation' || h.includes('definition') || h.includes('meaning'));
      const usageIdx = headerParts.findIndex(h => h.includes('usage') || h.includes('example') || h.includes('sentence'));

      colMap = {
        english: englishIdx >= 0 ? englishIdx : 0,
        zomi: zomiIdx >= 0 ? zomiIdx : (englishIdx === 0 ? 1 : 0),
        pos: posIdx >= 0 ? posIdx : -1,
        explanation: explanationIdx >= 0 ? explanationIdx : -1,
        usageExample: usageIdx >= 0 ? usageIdx : -1,
      };
      console.log('[Import] Detected column mapping:', colMap, 'from headers:', headerParts);
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length < 2) {
        entries.push({
          english: parts[0] || '',
          zomi: '',
          valid: false,
          error: 'Not enough columns (need at least 2)',
        });
        continue;
      }

      const english = (parts[colMap.english] || '').trim();
      const zomi = (parts[colMap.zomi] || '').trim();
      const pos = colMap.pos >= 0 ? (parts[colMap.pos] || '').trim() || undefined : undefined;
      const explanation = colMap.explanation >= 0 ? (parts[colMap.explanation] || '').trim() || undefined : undefined;
      const usageExample = colMap.usageExample >= 0 ? (parts[colMap.usageExample] || '').trim() || undefined : undefined;

      if (!english) {
        entries.push({ english, zomi, pos, explanation, usageExample, valid: false, error: 'English word is empty' });
        continue;
      }
      if (!zomi) {
        entries.push({ english, zomi, pos, explanation, usageExample, valid: false, error: 'Zomi translation is empty' });
        continue;
      }

      entries.push({ english, zomi, pos, explanation, usageExample, valid: true });
    }

    return entries;
  }, []);

  const handleParse = useCallback(() => {
    const entries = parseCSV(csvInput);
    setParsedEntries(entries);
    setShowPreview(true);
    setImportResult(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [csvInput, parseCSV]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setCsvInput(text);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      console.log('Clipboard paste failed');
    }
  }, []);

  const handleAddManualEntry = useCallback(() => {
    if (!manualEntry.english.trim() || !manualEntry.zomi.trim()) {
      Alert.alert('Required', 'English and Zomi fields are required.');
      return;
    }

    const newEntry: ParsedEntry = {
      english: manualEntry.english.trim(),
      zomi: manualEntry.zomi.trim(),
      pos: manualEntry.pos.trim() || undefined,
      explanation: manualEntry.explanation.trim() || undefined,
      usageExample: manualEntry.usageExample.trim() || undefined,
      valid: true,
    };

    setParsedEntries(prev => [...prev, newEntry]);
    setManualEntry({ english: '', zomi: '', pos: '', explanation: '', usageExample: '' });
    setShowPreview(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [manualEntry]);

  const handleRemoveEntry = useCallback((index: number) => {
    setParsedEntries(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear All', 'Remove all parsed entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setParsedEntries([]);
          setCsvInput('');
          setImportResult(null);
          setShowPreview(false);
        },
      },
    ]);
  }, []);

  const validEntries = useMemo(() => parsedEntries.filter(e => e.valid), [parsedEntries]);
  const invalidEntries = useMemo(() => parsedEntries.filter(e => !e.valid), [parsedEntries]);

  const handleImport = useCallback(async () => {
    if (validEntries.length === 0) {
      Alert.alert('No Valid Entries', 'There are no valid entries to import.');
      return;
    }

    Alert.alert(
      'Confirm Import',
      `Import ${validEntries.length} entries using "${importMode.replace('_', ' ')}" mode?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setIsImporting(true);
            setImportProgress(0);
            setImportResult(null);

            const totalResult: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: 0, total: validEntries.length };

            try {
              const batches: ParsedEntry[][] = [];
              for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
                batches.push(validEntries.slice(i, i + BATCH_SIZE));
              }

              for (let b = 0; b < batches.length; b++) {
                const batch = batches[b];
                try {
                  const result = await bulkImportMutation.mutateAsync({
                    entries: batch.map(e => ({
                      english: e.english,
                      zomi: e.zomi,
                      pos: e.pos,
                      explanation: e.explanation,
                      usageExample: e.usageExample,
                    })),
                    mode: importMode,
                    createdBy: localUser.id,
                  });

                  totalResult.inserted += result.inserted;
                  totalResult.updated += result.updated;
                  totalResult.skipped += result.skipped;
                  totalResult.errors += result.errors;
                } catch (err) {
                  console.error('[Import] Batch error:', err);
                  totalResult.errors += batch.length;
                }

                setImportProgress(Math.round(((b + 1) / batches.length) * 100));
              }

              setImportResult(totalResult);
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('[Import] Fatal error:', err);
              Alert.alert('Import Error', 'An unexpected error occurred during import.');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  }, [validEntries, importMode, bulkImportMutation, localUser.id]);

  const renderEntryPreview = useCallback(({ item, index }: { item: ParsedEntry; index: number }) => (
    <View style={[styles.previewRow, !item.valid && styles.previewRowInvalid]}>
      <View style={styles.previewContent}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewEnglish} numberOfLines={1}>{item.english || '(empty)'}</Text>
          {item.pos ? (
            <View style={styles.previewPosBadge}>
              <Text style={styles.previewPosText}>{item.pos}</Text>
            </View>
          ) : null}
          {item.valid ? (
            <CheckCircle size={14} color={Colors.success} />
          ) : (
            <XCircle size={14} color={Colors.error} />
          )}
        </View>
        <Text style={styles.previewZomi} numberOfLines={1}>{item.zomi || '(empty)'}</Text>
        {item.error ? (
          <Text style={styles.previewError}>{item.error}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => handleRemoveEntry(index)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Trash2 size={14} color={Colors.error} />
      </TouchableOpacity>
    </View>
  ), [handleRemoveEntry]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Dictionary Import',
          headerStyle: { backgroundColor: '#1A1F35' },
          headerTintColor: Colors.text,
        }}
      />
      <LinearGradient
        colors={['#1A1F35', '#252B45', '#2A2F45']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard variant="cyan" glow style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconWrap}>
              <Upload size={22} color="#00D9FF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Admin Import Center</Text>
              <Text style={styles.headerSubtitle}>Batch upload dictionary entries via CSV or manual input</Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity style={styles.helpToggle} onPress={() => setShowHelp(!showHelp)}>
          <Info size={16} color={Colors.textMuted} />
          <Text style={styles.helpToggleText}>CSV Format Guide</Text>
          {showHelp ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
        </TouchableOpacity>

        {showHelp ? (
          <GlassCard variant="default" style={styles.helpCard}>
            <Text style={styles.helpTitle}>Supported CSV Formats</Text>
            <Text style={styles.helpText}>Headers are auto-detected — columns can be in any order:</Text>
            <View style={styles.helpCodeBlock}>
              <Text style={styles.helpCodeHeader}>Format 1: English, POS, Zomi, Usage Example</Text>
              <Text style={styles.helpCode}>hello, Greeting, Ngaih dam, Hello my friend</Text>
              <Text style={styles.helpCode}>water, Noun, Tui, Tui ka dawn</Text>
            </View>
            <View style={[styles.helpCodeBlock, { marginTop: 6 }]}>
              <Text style={styles.helpCodeHeader}>Format 2: English, Zomi, POS, Explanation, Usage Example</Text>
              <Text style={styles.helpCode}>hello, Ngaih dam, Greeting, A common greeting, Hello my friend</Text>
            </View>
            <Text style={styles.helpNote}>Include a header row (English, POS, Zomi, Usage Example) so columns are mapped correctly. Only English and Zomi are required.</Text>
          </GlassCard>
        ) : null}

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'csv' && styles.tabActive]}
            onPress={() => setActiveTab('csv')}
          >
            <FileText size={16} color={activeTab === 'csv' ? '#00D9FF' : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'csv' && styles.tabTextActive]}>CSV / Paste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
            onPress={() => setActiveTab('manual')}
          >
            <Plus size={16} color={activeTab === 'manual' ? '#00D9FF' : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>Manual Add</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'csv' ? (
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Paste CSV Data</Text>
              <TouchableOpacity onPress={handlePasteFromClipboard} style={styles.pasteBtn}>
                <ClipboardPaste size={14} color="#00D9FF" />
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.csvInput}
              placeholder={"English, Zomi, POS, Explanation, Example\nhello, Ngaih dam, Greeting, ...\nwater, Tui, Noun, ..."}
              placeholderTextColor={Colors.textMuted}
              value={csvInput}
              onChangeText={setCsvInput}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.parseBtn, !csvInput.trim() && styles.parseBtnDisabled]}
              onPress={handleParse}
              disabled={!csvInput.trim()}
            >
              <Play size={16} color={csvInput.trim() ? Colors.text : Colors.textMuted} />
              <Text style={[styles.parseBtnText, !csvInput.trim() && styles.parseBtnTextDisabled]}>Parse & Preview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.manualSection}>
            <Text style={styles.fieldLabel}>English Word *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter English word"
              placeholderTextColor={Colors.textMuted}
              value={manualEntry.english}
              onChangeText={(t) => setManualEntry(prev => ({ ...prev, english: t }))}
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Zomi Translation *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter Zomi translation"
              placeholderTextColor={Colors.textMuted}
              value={manualEntry.zomi}
              onChangeText={(t) => setManualEntry(prev => ({ ...prev, zomi: t }))}
            />
            <Text style={styles.fieldLabel}>Part of Speech</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., Noun, Verb, Adjective"
              placeholderTextColor={Colors.textMuted}
              value={manualEntry.pos}
              onChangeText={(t) => setManualEntry(prev => ({ ...prev, pos: t }))}
            />
            <Text style={styles.fieldLabel}>Explanation</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Brief definition or explanation"
              placeholderTextColor={Colors.textMuted}
              value={manualEntry.explanation}
              onChangeText={(t) => setManualEntry(prev => ({ ...prev, explanation: t }))}
            />
            <Text style={styles.fieldLabel}>Usage Example</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Example sentence"
              placeholderTextColor={Colors.textMuted}
              value={manualEntry.usageExample}
              onChangeText={(t) => setManualEntry(prev => ({ ...prev, usageExample: t }))}
            />
            <TouchableOpacity
              style={[styles.addEntryBtn, (!manualEntry.english.trim() || !manualEntry.zomi.trim()) && styles.parseBtnDisabled]}
              onPress={handleAddManualEntry}
              disabled={!manualEntry.english.trim() || !manualEntry.zomi.trim()}
            >
              <Plus size={16} color={Colors.text} />
              <Text style={styles.addEntryBtnText}>Add to Queue</Text>
            </TouchableOpacity>
          </View>
        )}

        {showPreview && parsedEntries.length > 0 ? (
          <View style={styles.previewSection}>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.previewTitle}>Preview ({parsedEntries.length} entries)</Text>
              <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
                <Trash2 size={14} color={Colors.error} />
                <Text style={styles.clearAllText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statChip, { backgroundColor: 'rgba(0,230,118,0.12)' }]}>
                <CheckCircle size={12} color={Colors.success} />
                <Text style={[styles.statChipText, { color: Colors.success }]}>{validEntries.length} valid</Text>
              </View>
              {invalidEntries.length > 0 ? (
                <View style={[styles.statChip, { backgroundColor: 'rgba(255,82,82,0.12)' }]}>
                  <XCircle size={12} color={Colors.error} />
                  <Text style={[styles.statChipText, { color: Colors.error }]}>{invalidEntries.length} invalid</Text>
                </View>
              ) : null}
            </View>

            <FlatList
              data={parsedEntries.slice(0, 50)}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderEntryPreview}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.previewSeparator} />}
            />
            {parsedEntries.length > 50 ? (
              <Text style={styles.moreText}>...and {parsedEntries.length - 50} more entries</Text>
            ) : null}

            <View style={styles.modeSection}>
              <Text style={styles.modeLabel}>Import Mode</Text>
              <View style={styles.modeOptions}>
                {([
                  { value: 'upsert' as ImportMode, label: 'Upsert', desc: 'Add new, update existing' },
                  { value: 'add_only' as ImportMode, label: 'Add Only', desc: 'Skip existing entries' },
                  { value: 'update_only' as ImportMode, label: 'Update Only', desc: 'Only update existing' },
                ]).map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.modeOption, importMode === mode.value && styles.modeOptionActive]}
                    onPress={() => setImportMode(mode.value)}
                  >
                    <Text style={[styles.modeOptionLabel, importMode === mode.value && styles.modeOptionLabelActive]}>{mode.label}</Text>
                    <Text style={styles.modeOptionDesc}>{mode.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isImporting ? (
              <View style={styles.importingContainer}>
                <ActivityIndicator size="large" color="#00D9FF" />
                <Text style={styles.importingText}>Importing... {importProgress}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${importProgress}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.importBtn, validEntries.length === 0 && styles.parseBtnDisabled]}
                onPress={handleImport}
                disabled={validEntries.length === 0}
              >
                <Upload size={18} color={Colors.text} />
                <Text style={styles.importBtnText}>Import {validEntries.length} Entries</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {importResult ? (
          <GlassCard variant="green" glow style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <CheckCircle size={24} color={Colors.success} />
              <Text style={styles.resultTitle}>Import Complete</Text>
            </View>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={[styles.resultValue, { color: Colors.success }]}>{importResult.inserted}</Text>
                <Text style={styles.resultLabel}>Inserted</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[styles.resultValue, { color: '#00D9FF' }]}>{importResult.updated}</Text>
                <Text style={styles.resultLabel}>Updated</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[styles.resultValue, { color: Colors.textMuted }]}>{importResult.skipped}</Text>
                <Text style={styles.resultLabel}>Skipped</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[styles.resultValue, { color: Colors.error }]}>{importResult.errors}</Text>
                <Text style={styles.resultLabel}>Errors</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.newImportBtn}
              onPress={() => {
                setParsedEntries([]);
                setCsvInput('');
                setImportResult(null);
                setShowPreview(false);
              }}
            >
              <RotateCcw size={16} color="#00D9FF" />
              <Text style={styles.newImportBtnText}>New Import</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  helpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  helpToggleText: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  helpCard: {
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  helpCodeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  helpCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#00D9FF',
    lineHeight: 18,
  },
  helpCodeHeader: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFD700',
    lineHeight: 18,
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  helpNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: '#00D9FF',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
  },
  pasteBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
  csvInput: {
    minHeight: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  parseBtnDisabled: {
    opacity: 0.4,
  },
  parseBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  parseBtnTextDisabled: {
    color: Colors.textMuted,
  },
  manualSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
    marginTop: 16,
  },
  addEntryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderRadius: 8,
  },
  clearAllText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  previewRowInvalid: {
    borderColor: 'rgba(255,82,82,0.2)',
    backgroundColor: 'rgba(255,82,82,0.04)',
  },
  previewContent: {
    flex: 1,
    marginRight: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewEnglish: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  previewPosBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewPosText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  previewZomi: {
    fontSize: 12,
    color: '#00D9FF',
    marginTop: 2,
  },
  previewError: {
    fontSize: 10,
    color: Colors.error,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  previewSeparator: {
    height: 4,
  },
  moreText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  modeSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  modeOptions: {
    gap: 8,
  },
  modeOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderColor: 'rgba(0, 217, 255, 0.35)',
  },
  modeOptionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  modeOptionLabelActive: {
    color: '#00D9FF',
  },
  modeOptionDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  importingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  importingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D9FF',
    borderRadius: 3,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#00D9FF',
  },
  importBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1F35',
  },
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  resultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  resultItem: {
    alignItems: 'center',
    gap: 4,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  resultLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  newImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  newImportBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
});
