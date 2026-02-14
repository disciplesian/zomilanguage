import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Search,
  BookOpen,
  Star,
  Clock,
  ChevronRight,
  X,
  Trash2,
  Plus,
  Sparkles,
  Heart,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { trpc } from '@/lib/trpc';
import { useDictionary } from '@/contexts/DictionaryContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface SuggestionItem {
  id: string;
  english: string;
  zomi: string;
  pos?: string;
}

export default function DictionaryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const {
    favorites,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    pendingSearch,
    clearPendingSearch,
  } = useDictionary();
  const { localUser } = useUserProfile();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (pendingSearch) {
      setSearchQuery(pendingSearch);
      setDebouncedQuery(pendingSearch);
      clearPendingSearch();
      setIsSearchFocused(true);
      searchInputRef.current?.focus();
    }
  }, [pendingSearch, clearPendingSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const suggestionsQuery = trpc.dictionary.suggest.useQuery(
    { query: debouncedQuery, limit: 8 },
    { enabled: debouncedQuery.length >= 1 }
  );

  const searchResultsQuery = trpc.dictionary.search.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: debouncedQuery.length >= 2 }
  );

  const wordOfTheDayQuery = trpc.dictionary.wordOfTheDay.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
  });

  const statsQuery = trpc.dictionary.stats.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const suggestions = useMemo(() => {
    if (debouncedQuery.length >= 2 && searchResultsQuery.data) {
      return searchResultsQuery.data as SuggestionItem[];
    }
    if (debouncedQuery.length >= 1 && suggestionsQuery.data) {
      return suggestionsQuery.data as SuggestionItem[];
    }
    return [];
  }, [debouncedQuery, suggestionsQuery.data, searchResultsQuery.data]);

  const isSearching = suggestionsQuery.isFetching || searchResultsQuery.isFetching;

  const handleSelectEntry = useCallback((entry: SuggestionItem) => {
    addSearchHistory(entry.english);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/dictionary-detail?id=${encodeURIComponent(entry.id)}&english=${encodeURIComponent(entry.english)}` as any);
  }, [addSearchHistory]);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      addSearchHistory(searchQuery.trim());
    }
  }, [searchQuery, addSearchHistory]);

  const handleHistoryTap = useCallback((query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
    setIsSearchFocused(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const getPosBadgeColor = (pos?: string): string => {
    if (!pos) return Colors.textMuted;
    const p = pos.toLowerCase();
    if (p.includes('noun') || p === 'n') return '#4FC3F7';
    if (p.includes('verb') || p === 'v') return '#81C784';
    if (p.includes('adj')) return '#FFB74D';
    if (p.includes('adv')) return '#CE93D8';
    if (p.includes('prep')) return '#F06292';
    return Colors.textMuted;
  };

  const renderSuggestionItem = useCallback(({ item }: { item: SuggestionItem }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectEntry(item)}
      activeOpacity={0.7}
      testID={`dict-result-${item.id}`}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultEnglish} numberOfLines={1}>{item.english}</Text>
          {item.pos ? (
            <View style={[styles.posBadge, { backgroundColor: getPosBadgeColor(item.pos) + '25' }]}>
              <Text style={[styles.posText, { color: getPosBadgeColor(item.pos) }]}>{item.pos}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.resultZomi} numberOfLines={1}>{item.zomi}</Text>
      </View>
      <ChevronRight size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  ), [handleSelectEntry]);

  const showResults = debouncedQuery.length >= 1 && isSearchFocused;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1F35', '#252B45', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['rgba(0, 200, 220, 0.12)', 'rgba(0, 200, 220, 0.02)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                  <BookOpen size={22} color="#00D9FF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Zomi Dictionary</Text>
                  <Text style={styles.headerSubtitle}>
                    {statsQuery.data ? `${statsQuery.data.totalEntries.toLocaleString()} entries` : 'English → Zomi'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => router.push('/dictionary-favorites' as any)}
                  testID="dict-favorites-btn"
                >
                  <Heart size={18} color={Colors.secondary} />
                  {favorites.length > 0 && (
                    <View style={styles.badgeCount}>
                      <Text style={styles.badgeCountText}>{favorites.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => router.push('/dictionary-suggest?type=add_entry' as any)}
                  testID="dict-add-btn"
                >
                  <Plus size={18} color={Colors.success} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.searchSection}>
          <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
            <Search size={18} color={isSearchFocused ? '#00D9FF' : Colors.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search English word..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              testID="dict-search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
                <X size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color="#00D9FF" style={styles.searchSpinner} />
            )}
          </View>
        </View>

        {showResults ? (
          <View style={styles.resultsContainer}>
            {suggestions.length > 0 ? (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestionItem}
                contentContainerStyle={styles.resultsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : debouncedQuery.length >= 2 && !isSearching ? (
              <View style={styles.emptyState}>
                <Search size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try a different spelling or add this word</Text>
                <TouchableOpacity
                  style={styles.suggestBtn}
                  onPress={() => router.push(`/dictionary-suggest?type=add_entry&english=${encodeURIComponent(searchQuery)}` as any)}
                >
                  <Plus size={16} color="#00D9FF" />
                  <Text style={styles.suggestBtnText}>Suggest "{searchQuery}"</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <ScrollView
            style={styles.homeScroll}
            contentContainerStyle={styles.homeContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {wordOfTheDayQuery.data && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectEntry(wordOfTheDayQuery.data as SuggestionItem)}
              >
                <GlassCard variant="cyan" glow style={styles.wotdCard}>
                  <View style={styles.wotdHeader}>
                    <Sparkles size={16} color="#00D9FF" />
                    <Text style={styles.wotdLabel}>Word of the Day</Text>
                  </View>
                  <Text style={styles.wotdEnglish}>{wordOfTheDayQuery.data.english}</Text>
                  {wordOfTheDayQuery.data.pos ? (
                    <Text style={styles.wotdPos}>{wordOfTheDayQuery.data.pos}</Text>
                  ) : null}
                  <View style={styles.wotdDivider} />
                  <Text style={styles.wotdZomi}>{wordOfTheDayQuery.data.zomi}</Text>
                  {wordOfTheDayQuery.data.explanation ? (
                    <Text style={styles.wotdExplanation} numberOfLines={2}>
                      {wordOfTheDayQuery.data.explanation}
                    </Text>
                  ) : null}
                </GlassCard>
              </TouchableOpacity>
            )}

            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Clock size={14} color={Colors.textMuted} />
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={clearSearchHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.historyChips}>
                  {searchHistory.slice(0, 10).map((item, index) => (
                    <TouchableOpacity
                      key={`${item.query}-${index}`}
                      style={styles.historyChip}
                      onPress={() => handleHistoryTap(item.query)}
                    >
                      <Text style={styles.historyChipText}>{item.query}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {favorites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Star size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>Favorites</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/dictionary-favorites' as any)}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                {favorites.slice(0, 5).map((fav) => (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.favItem}
                    onPress={() => router.push(`/dictionary-detail?id=${encodeURIComponent(fav.id)}&english=${encodeURIComponent(fav.english)}` as any)}
                  >
                    <View style={styles.favContent}>
                      <Text style={styles.favEnglish}>{fav.english}</Text>
                      <Text style={styles.favZomi}>{fav.zomi}</Text>
                    </View>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={14} color={Colors.success} />
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
              </View>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => {
                    setIsSearchFocused(true);
                    searchInputRef.current?.focus();
                  }}
                >
                  <LinearGradient colors={['rgba(0,217,255,0.15)', 'rgba(0,217,255,0.05)']} style={styles.quickActionGradient}>
                    <Search size={20} color="#00D9FF" />
                    <Text style={styles.quickActionText}>Search</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => router.push('/dictionary-suggest?type=add_entry' as any)}
                >
                  <LinearGradient colors={['rgba(0,255,136,0.15)', 'rgba(0,255,136,0.05)']} style={styles.quickActionGradient}>
                    <Plus size={20} color={Colors.success} />
                    <Text style={styles.quickActionText}>Add Word</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => router.push('/dictionary-favorites' as any)}
                >
                  <LinearGradient colors={['rgba(255,77,158,0.15)', 'rgba(255,77,158,0.05)']} style={styles.quickActionGradient}>
                    <Heart size={20} color={Colors.secondary} />
                    <Text style={styles.quickActionText}>Favorites</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  searchBarFocused: {
    borderColor: 'rgba(0, 217, 255, 0.45)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  searchSpinner: {
    marginLeft: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultContent: {
    flex: 1,
    marginRight: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultEnglish: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  resultZomi: {
    fontSize: 14,
    color: '#00D9FF',
    marginTop: 3,
  },
  separator: {
    height: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    marginTop: 8,
  },
  suggestBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  wotdCard: {
    marginBottom: 20,
  },
  wotdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  wotdLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#00D9FF',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  wotdEnglish: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  wotdPos: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  wotdDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 10,
  },
  wotdZomi: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#00D9FF',
    marginBottom: 4,
  },
  wotdExplanation: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  seeAllText: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '500' as const,
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  favContent: {
    flex: 1,
  },
  favEnglish: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  favZomi: {
    fontSize: 13,
    color: '#00D9FF',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  quickActionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
