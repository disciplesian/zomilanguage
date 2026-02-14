import React, { useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import {
  Heart,
  Trash2,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useDictionary, FavoriteEntry } from '@/contexts/DictionaryContext';

export default function DictionaryFavoritesScreen() {
  const { favorites, removeFavorite } = useDictionary();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRemove = useCallback((id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFavorite(id);
  }, [removeFavorite]);

  const handleOpenEntry = useCallback((item: FavoriteEntry) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/dictionary-detail?id=${encodeURIComponent(item.id)}&english=${encodeURIComponent(item.english)}` as any);
  }, []);

  const renderItem = useCallback(({ item }: { item: FavoriteEntry }) => (
    <TouchableOpacity
      style={styles.favItem}
      onPress={() => handleOpenEntry(item)}
      activeOpacity={0.7}
    >
      <View style={styles.favContent}>
        <View style={styles.favHeader}>
          <Text style={styles.favEnglish} numberOfLines={1}>{item.english}</Text>
          {item.pos ? (
            <Text style={styles.favPos}>{item.pos}</Text>
          ) : null}
        </View>
        <Text style={styles.favZomi} numberOfLines={1}>{item.zomi}</Text>
      </View>
      <View style={styles.favActions}>
        <TouchableOpacity
          onPress={() => handleRemove(item.id)}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={14} color={Colors.error} />
        </TouchableOpacity>
        <ChevronRight size={14} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  ), [handleOpenEntry, handleRemove]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Favorites',
          headerStyle: { backgroundColor: '#1A1F35' },
          headerTintColor: Colors.text,
        }}
      />
      <LinearGradient
        colors={['#1A1F35', '#252B45', '#2A2F45']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Save words you want to remember by tapping the heart icon on any word.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.back()}
            >
              <BookOpen size={16} color="#00D9FF" />
              <Text style={styles.browseBtnText}>Browse Dictionary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
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
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  favContent: {
    flex: 1,
    marginRight: 12,
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favEnglish: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  favPos: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
  favZomi: {
    fontSize: 14,
    color: '#00D9FF',
    marginTop: 3,
  },
  favActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 94, 94, 0.1)',
  },
  separator: {
    height: 8,
  },
  emptyState: {
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
    lineHeight: 20,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    marginTop: 12,
  },
  browseBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
});
