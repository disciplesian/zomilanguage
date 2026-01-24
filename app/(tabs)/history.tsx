import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  History, 
  Search, 
  Star, 
  Trash2, 
  Filter,
  Image as ImageIcon,
  FileText,
  Mic,
  Type,
  ChevronRight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'all' | 'text' | 'image' | 'document' | 'audio';

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const historyQuery = trpc.history.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const toggleFavoriteMutation = trpc.history.toggleFavorite.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
  });

  const filteredHistory = useMemo(() => {
    if (!historyQuery.data) return [];

    let filtered = historyQuery.data;

    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.translationType === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.sourceText.toLowerCase().includes(query) ||
          item.translatedText.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [historyQuery.data, filterType, searchQuery]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this translation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate({ id });
          },
        },
      ]
    );
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavoriteMutation.mutate({ id });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type size={16} color={Colors.accent} />;
      case 'image':
        return <ImageIcon size={16} color={Colors.success} />;
      case 'document':
        return <FileText size={16} color={Colors.warning} />;
      case 'audio':
        return <Mic size={16} color={Colors.error} />;
      default:
        return <Type size={16} color={Colors.textSecondary} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.emptyContainer}>
          <History size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to view your translation history
          </Text>
          <GlassButton
            title="Sign In"
            variant="cyan"
            onPress={() => router.push('/auth/login' as any)}
            style={styles.loginButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Translation History</Text>
              <Text style={styles.headerSubtitle}>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'translation' : 'translations'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setShowFilters(!showFilters);
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
              }}
            >
              <Filter size={20} color={showFilters ? Colors.accent : Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <GlassCard variant="cyan" style={styles.searchCard}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search translations..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </GlassCard>

          {showFilters && (
            <GlassCard style={styles.filterCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {(['all', 'text', 'image', 'document', 'audio'] as FilterType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        filterType === type && styles.filterChipActive,
                      ]}
                      onPress={() => {
                        setFilterType(type);
                        if (Platform.OS !== 'web') {
                          Haptics.selectionAsync();
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filterType === type && styles.filterChipTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </GlassCard>
          )}
        </View>

        {historyQuery.isLoading ? (
          <GlassCard style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading history...</Text>
          </GlassCard>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Translations Yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterType !== 'all'
                ? 'No translations match your search'
                : 'Your translation history will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {filteredHistory.map((item) => (
              <GlassCard key={item.id} variant="purple" style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyType}>
                    {getTypeIcon(item.translationType)}
                    <Text style={styles.historyTypeText}>
                      {item.sourceLanguage === 'zomi' ? 'Zomi → English' : 'English → Zomi'}
                    </Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleFavorite(item.id)}
                      style={styles.iconButton}
                    >
                      <Star
                        size={18}
                        color={item.isFavorite ? Colors.accent : Colors.textSecondary}
                        fill={item.isFavorite ? Colors.accent : 'transparent'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={styles.iconButton}
                    >
                      <Trash2 size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.historyContent}>
                  <View style={styles.textBlock}>
                    <Text style={styles.textLabel}>Source:</Text>
                    <Text style={styles.textContent} numberOfLines={2}>
                      {item.sourceText}
                    </Text>
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.textLabel}>Translation:</Text>
                    <Text style={styles.textContent} numberOfLines={2}>
                      {item.translatedText}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyFooter}>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <ChevronRight size={16} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  filterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
  filterCard: {
    padding: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.accent,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loginButton: {
    marginTop: 24,
    minWidth: 200,
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  historyContent: {
    gap: 12,
    marginBottom: 12,
  },
  textBlock: {
    gap: 4,
  },
  textLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  textContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
});
