import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Heart,
  Copy,
  Volume2,
  Share2,
  Edit3,
  Flag,
  BookOpen,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { trpc } from '@/lib/trpc';
import { useDictionary } from '@/contexts/DictionaryContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

export default function DictionaryDetailScreen() {
  const { id, english } = useLocalSearchParams<{ id: string; english: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { addFavorite, removeFavorite, isFavorite: checkFavorite, cacheEntry } = useDictionary();
  const { localUser } = useUserProfile();

  const entryQuery = trpc.dictionary.getById.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  const entry = entryQuery.data;
  const isEntryFavorite = useMemo(() => checkFavorite(id || ''), [checkFavorite, id]);

  useEffect(() => {
    if (entry) {
      cacheEntry(entry as any);
    }
  }, [entry, cacheEntry]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleToggleFavorite = useCallback(() => {
    if (!entry) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isEntryFavorite) {
      removeFavorite(entry.id);
    } else {
      addFavorite({ id: entry.id, english: entry.english, zomi: entry.zomi, pos: entry.pos });
    }
  }, [entry, isEntryFavorite, addFavorite, removeFavorite]);

  const handleCopyZomi = useCallback(async () => {
    if (!entry?.zomi) return;
    await Clipboard.setStringAsync(entry.zomi);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Zomi translation copied to clipboard');
  }, [entry]);

  const handleShare = useCallback(async () => {
    if (!entry) return;
    const message = `${entry.english}${entry.pos ? ` (${entry.pos})` : ''}\n\nZomi: ${entry.zomi}${entry.explanation ? `\n\n${entry.explanation}` : ''}${entry.usageExample ? `\n\nExample: ${entry.usageExample}` : ''}\n\n— Zomi Dictionary`;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: entry.english, text: message });
          return;
        } catch {}
      }
      await Clipboard.setStringAsync(message);
      Alert.alert('Copied!', 'Word details copied to clipboard.');
    } else {
      try {
        await Share.share({ message, title: entry.english });
      } catch {
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Word details copied to clipboard.');
      }
    }
  }, [entry]);

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: english || 'Word Detail',
          headerStyle: { backgroundColor: '#1A1F35' },
          headerTintColor: Colors.text,
        }}
      />
      <LinearGradient
        colors={['#1A1F35', '#252B45', '#2A2F45']}
        style={StyleSheet.absoluteFillObject}
      />

      {entryQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D9FF" />
          <Text style={styles.loadingText}>Loading word...</Text>
        </View>
      ) : !entry ? (
        <View style={styles.emptyContainer}>
          <BookOpen size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Word not found</Text>
          <Text style={styles.emptySubtitle}>This entry may have been removed or is not yet published.</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard variant="cyan" glow style={styles.mainCard}>
            <View style={styles.wordHeader}>
              <Text style={styles.englishWord}>{entry.english}</Text>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={[styles.favBtn, isEntryFavorite && styles.favBtnActive]}
                testID="dict-detail-fav"
              >
                <Heart
                  size={20}
                  color={isEntryFavorite ? Colors.secondary : Colors.textMuted}
                  fill={isEntryFavorite ? Colors.secondary : 'transparent'}
                />
              </TouchableOpacity>
            </View>

            {entry.pos ? (
              <View style={[styles.posChip, { backgroundColor: getPosBadgeColor(entry.pos) + '20' }]}>
                <Text style={[styles.posChipText, { color: getPosBadgeColor(entry.pos) }]}>{entry.pos}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.zomiSection}>
              <Text style={styles.zomiLabel}>Zomi (Tedim CTD)</Text>
              <Text style={styles.zomiWord}>{entry.zomi}</Text>
            </View>

            {entry.explanation ? (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Explanation</Text>
                <Text style={styles.infoText}>{entry.explanation}</Text>
              </View>
            ) : null}

            {entry.usageExample ? (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Usage Example</Text>
                <Text style={styles.exampleText}>"{entry.usageExample}"</Text>
              </View>
            ) : null}
          </GlassCard>

          {(entry as any).variants && (entry as any).variants.length > 0 && (
            <GlassCard variant="default" style={styles.variantsCard}>
              <Text style={styles.variantsTitle}>Alternative Translations</Text>
              {(entry as any).variants.map((v: any, i: number) => (
                <View key={v.id || i} style={styles.variantItem}>
                  <Text style={styles.variantZomi}>{v.zomiVariant}</Text>
                  {v.explanationVariant ? (
                    <Text style={styles.variantExpl}>{v.explanationVariant}</Text>
                  ) : null}
                </View>
              ))}
            </GlassCard>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopyZomi}>
              <Copy size={18} color="#00D9FF" />
              <Text style={styles.actionBtnText}>Copy Zomi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Share2 size={18} color={Colors.success} />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.communitySection}>
            <Text style={styles.communitySectionTitle}>Community</Text>
            <TouchableOpacity
              style={styles.communityAction}
              onPress={() => router.push(`/dictionary-suggest?type=edit_entry&entryId=${encodeURIComponent(entry.id)}&english=${encodeURIComponent(entry.english)}&zomi=${encodeURIComponent(entry.zomi)}` as any)}
            >
              <Edit3 size={16} color={Colors.textSecondary} />
              <Text style={styles.communityActionText}>Suggest Edit</Text>
              <ChevronRight size={14} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.communityAction}
              onPress={() => router.push(`/dictionary-suggest?type=add_variant&entryId=${encodeURIComponent(entry.id)}&english=${encodeURIComponent(entry.english)}` as any)}
            >
              <Plus size={16} color={Colors.textSecondary} />
              <Text style={styles.communityActionText}>Add Zomi Alternative</Text>
              <ChevronRight size={14} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.communityAction}
              onPress={() => router.push(`/dictionary-suggest?type=report_issue&entryId=${encodeURIComponent(entry.id)}&english=${encodeURIComponent(entry.english)}` as any)}
            >
              <Flag size={16} color={Colors.error} />
              <Text style={styles.communityActionText}>Report Issue</Text>
              <ChevronRight size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  mainCard: {
    marginBottom: 16,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  englishWord: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  favBtnActive: {
    backgroundColor: 'rgba(255, 77, 158, 0.15)',
    borderColor: 'rgba(255, 77, 158, 0.35)',
  },
  posChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  posChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  zomiSection: {
    marginBottom: 4,
  },
  zomiLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  zomiWord: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#00D9FF',
    lineHeight: 32,
  },
  infoSection: {
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  exampleText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic' as const,
  },
  variantsCard: {
    marginBottom: 16,
  },
  variantsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  variantItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  variantZomi: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
  variantExpl: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  communitySection: {
    marginBottom: 20,
  },
  communitySectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  communityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  communityActionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
