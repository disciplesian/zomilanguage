import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Book, RefreshCw, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getScriptureOfTheDay, getRandomScripture, Scripture } from '@/constants/scriptures';

interface ScriptureOfTheDayProps {
  showRefresh?: boolean;
  compact?: boolean;
}

export default function ScriptureOfTheDay({ showRefresh = true, compact = false }: ScriptureOfTheDayProps) {
  const [scripture, setScripture] = useState<Scripture>(getScriptureOfTheDay());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const handleRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setScripture(getRandomScripture());
    }, 150);
  };

  const speakVerse = async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    const text = scripture.verseEnglish;
    setIsSpeaking(true);

    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Book size={16} color={Colors.primary} />
        <Text style={styles.compactText} numberOfLines={2}>
          {scripture.verseEnglish}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Book size={20} color={Colors.primary} />
          <Text style={styles.title}>Scripture of the Day</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={speakVerse} style={styles.actionButton}>
            <Volume2 size={18} color={isSpeaking ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
          {showRefresh && (
            <TouchableOpacity onPress={handleRefresh} style={styles.actionButton}>
              <RefreshCw size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.verse}>
          {`"${scripture.verseEnglish}"`}
        </Text>
        <Text style={styles.reference}>— {scripture.reference}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    paddingTop: 4,
  },
  verse: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    fontStyle: 'italic',
  },
  reference: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '500' as const,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassCard,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic',
  },
});
