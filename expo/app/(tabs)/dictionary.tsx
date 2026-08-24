import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  X,
  BadgeCheck,
  Clipboard as ClipboardIcon,
  ArrowRight,
  Sparkles,
  AlertCircle,
  WifiOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import GlassCard from '@/components/GlassCard';
import TypingDots from '@/components/TypingDots';
import Colors from '@/constants/colors';
import {
  activeDictionaryCount,
  CATEGORY_COLORS,
  categoryLabel,
  searchDictionary,
  suggestTerms,
  hasExactMatch,
  browseLetters,
  entriesForLetter,
  type DictionaryEntry,
} from '@/constants/dictionaryData';
import { checkDictionaryUpdate } from '@/lib/dictionaryUpdate';
import { useStreamingTranslation } from '@/hooks/useStreamingTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { getAnonymousId } from '@/lib/anonymousId';

type Direction = 'en-zo' | 'zo-en';

const AI_DEBOUNCE_MS = 700;

export default function DictionaryScreen() {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('en-zo');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState('A');
  /** Bumped when an over-the-air dataset update is applied, so the search and
   *  browse memos recompute against the refreshed dictionary. */
  const [datasetVersion, setDatasetVersion] = useState(0);

  const stream = useStreamingTranslation();
  const { getAccessToken } = useAuth();
  const queryRef = useRef(query);
  queryRef.current = query;

  // Instant local search over the verified dataset.
  const results = useMemo(() => searchDictionary(query, 60), [query, datasetVersion]);
  // Real-time completions for the search bar (works fully offline).
  const suggestions = useMemo(() => suggestTerms(query, 8), [query, datasetVersion]);
  const hasMatches = results.length > 0;
  const needsAi = query.trim().length >= 2 && !hasMatches && !hasExactMatch(query);

  // Offline browsing: with no query, list entries alphabetically by letter.
  const isBrowsing = query.trim().length === 0;
  const letters = useMemo(() => browseLetters(), [datasetVersion]);
  const browseData = useMemo(
    () => (isBrowsing ? entriesForLetter(selectedLetter) : []),
    [isBrowsing, selectedLetter, datasetVersion]
  );

  // Over-the-air dataset update: cached copy first (offline-safe), then a
  // fresh check of /api/dictionary/latest for a newer published version.
  useEffect(() => {
    let cancelled = false;
    void checkDictionaryUpdate().then((version) => {
      if (!cancelled) setDatasetVersion(version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced AI fallback when the word is not in the verified dictionary.
  useEffect(() => {
    setAiResult(null);
    setAiError(null);
    setIsAiLoading(false);
    const trimmed = query.trim();
    if (trimmed.length < 2 || !needsAi) return;

    const timer = setTimeout(async () => {
      const current = queryRef.current.trim();
      if (current !== trimmed || current.length < 2) return;
      setIsAiLoading(true);
      try {
        const authToken = (await getAccessToken()) ?? undefined;
        const anonymousId = await getAnonymousId();
        const target = direction === 'en-zo' ? 'zomi' : 'english';
        const source = direction === 'en-zo' ? 'english' : 'zomi';
        const result = await stream.start(current, target, {
          sourceLanguage: source,
          authToken,
          anonymousId,
        });
        if (queryRef.current.trim() !== current) return;
        if (result.ok && result.text.trim()) {
          setAiResult(result.text.trim());
        } else {
          const msg = result.error ?? '';
          setAiError(
            /limit/i.test(msg)
              ? 'Daily AI word limit reached — try again tomorrow or sign in.'
              : /network|fetch|connect|offline|internet/i.test(msg)
                ? 'You appear to be offline. The verified dictionary still works — reconnect for AI answers.'
                : 'AI lookup is unavailable right now. Check your connection and try again.'
          );
        }
      } catch {
        if (queryRef.current.trim() === current) {
          setAiError(
            'You appear to be offline. The verified dictionary still works — reconnect for AI answers.'
          );
        }
      } finally {
        if (queryRef.current.trim() === current) setIsAiLoading(false);
      }
    }, AI_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, needsAi, direction]);

  const copyZomi = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  }, []);

  const renderEntry = useCallback(
    ({ item }: { item: DictionaryEntry }) => (
      <TouchableOpacity
        style={styles.entryCard}
        activeOpacity={0.7}
        onPress={() => copyZomi(item.zomi)}
      >
        <View style={styles.entryTop}>
          <View style={styles.entryHeadRow}>
            <Text style={styles.english}>{item.english}</Text>
            <View
              style={[
                styles.posChip,
                { backgroundColor: `${CATEGORY_COLORS[item.category]}22`, borderColor: `${CATEGORY_COLORS[item.category]}55` },
              ]}
            >
              <Text style={[styles.posChipText, { color: CATEGORY_COLORS[item.category] }]}>
                {categoryLabel(item)}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={12} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.zomi}>{item.zomi}</Text>
        </View>
        <View style={styles.copyIcon}>
          <ClipboardIcon size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    ),
    [copyZomi]
  );

  const trimmed = query.trim();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        data={isBrowsing ? browseData : results}
        keyExtractor={(item, i) => `${item.english}-${item.pos}-${i}`}
        renderItem={renderEntry}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Dictionary</Text>
                <Text style={styles.headerSubtitle}>
                  {activeDictionaryCount().toLocaleString()} verified entries · English ⇄ Zomi
                </Text>
              </View>
              <View style={styles.offlineBadge}>
                <WifiOff size={12} color={Colors.warning} />
                <Text style={styles.offlineBadgeText}>Offline ready</Text>
              </View>
            </View>

            <GlassCard variant="cyan" style={styles.searchCard}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search English or Zomi..."
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    Haptics.selectionAsync();
                  }}
                >
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </GlassCard>

            {suggestions.length > 0 && (
              <View style={styles.suggestionCard}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={`${s.lang}-${s.text}`}
                    style={styles.suggestionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setQuery(s.text);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Search size={15} color={Colors.textMuted} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {s.text}
                    </Text>
                    <Text style={styles.suggestionHint} numberOfLines={1}>
                      {s.hint}
                    </Text>
                    <ArrowRight size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.directionRow}>
              {(['en-zo', 'zo-en'] as const).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  style={[styles.directionChip, direction === dir && styles.directionChipActive]}
                  onPress={() => {
                    setDirection(dir);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.directionText, direction === dir && styles.directionTextActive]}>
                    {dir === 'en-zo' ? 'English → Zomi' : 'Zomi → English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isBrowsing && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.letterRow}
                >
                  {letters.map((letter) => (
                    <TouchableOpacity
                      key={letter}
                      style={[
                        styles.letterChip,
                        selectedLetter === letter && styles.letterChipActive,
                      ]}
                      onPress={() => {
                        setSelectedLetter(letter);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text
                        style={[
                          styles.letterChipText,
                          selectedLetter === letter && styles.letterChipTextActive,
                        ]}
                      >
                        {letter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.resultCount}>
                  {browseData.length.toLocaleString()} {browseData.length === 1 ? 'entry' : 'entries'}{' '}
                  under “{selectedLetter}”
                </Text>
              </View>
            )}

            {trimmed.length > 0 && hasMatches && (
              <Text style={styles.resultCount}>
                {results.length === 60 ? '60+' : results.length} verified{' '}
                {results.length === 1 ? 'match' : 'matches'} for "{trimmed}"
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          trimmed.length === 0 ? null : needsAi || isAiLoading || aiResult || aiError ? (
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Sparkles size={16} color={Colors.accent} />
                <Text style={styles.aiHeaderText}>No verified entry for "{trimmed}"</Text>
              </View>
              {isAiLoading ? (
                <View style={styles.aiLoading}>
                  <TypingDots color={Colors.accent} dotSize={8} />
                  <Text style={styles.aiLoadingText}>Asking Zomi AI...</Text>
                </View>
              ) : aiResult ? (
                <>
                  <Text style={styles.aiResult}>{aiResult}</Text>
                  <View style={styles.aiFooter}>
                    <View style={styles.aiBadge}>
                      <Sparkles size={12} color={Colors.accent} />
                      <Text style={styles.aiBadgeText}>Zomi AI</Text>
                    </View>
                    <TouchableOpacity style={styles.aiCopy} onPress={() => copyZomi(aiResult)}>
                      <ClipboardIcon size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </>
              ) : aiError ? (
                <View style={styles.aiErrorRow}>
                  <AlertCircle size={16} color={Colors.error} />
                  <Text style={styles.aiErrorText}>{aiError}</Text>
                </View>
              ) : null}
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  headerTop: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 184, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.35)',
    marginTop: 4,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
  },
  suggestionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  suggestionHint: {
    flexShrink: 1,
    marginLeft: 'auto',
    paddingLeft: 12,
    fontSize: 12,
    color: Colors.primaryLight,
    textAlign: 'right',
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  directionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directionChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  directionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  directionTextActive: {
    color: Colors.primary,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  letterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 4,
  },
  letterChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  letterChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  letterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  letterChipTextActive: {
    color: Colors.primary,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  entryTop: {
    flex: 1,
  },
  entryHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  english: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  posChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  posChipText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.35)',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  zomi: {
    fontSize: 15,
    color: Colors.primaryLight,
    lineHeight: 21,
  },
  copyIcon: {
    padding: 8,
  },
  aiCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 242, 0, 0.25)',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  aiResult: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 24,
  },
  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 242, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 242, 0, 0.35)',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  aiCopy: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  aiErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiErrorText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
});
