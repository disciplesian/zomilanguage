import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Send,
  Edit3,
  Plus,
  Flag,
  BookPlus,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { trpc } from '@/lib/trpc';
import { useUserProfile } from '@/contexts/UserProfileContext';

type SuggestionType = 'edit_entry' | 'add_entry' | 'add_variant' | 'report_issue';

export default function DictionarySuggestScreen() {
  const params = useLocalSearchParams<{
    type: string;
    entryId?: string;
    english?: string;
    zomi?: string;
  }>();

  const suggestionType = (params.type || 'add_entry') as SuggestionType;
  const { localUser } = useUserProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [english, setEnglish] = useState(params.english || '');
  const [zomi, setZomi] = useState(params.zomi || '');
  const [pos, setPos] = useState('');
  const [explanation, setExplanation] = useState('');
  const [usageExample, setUsageExample] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.dictionary.submitSuggestion.useMutation();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getTitle = (): string => {
    switch (suggestionType) {
      case 'edit_entry': return 'Suggest Edit';
      case 'add_entry': return 'Add New Word';
      case 'add_variant': return 'Add Alternative';
      case 'report_issue': return 'Report Issue';
      default: return 'Contribute';
    }
  };

  const getIcon = () => {
    switch (suggestionType) {
      case 'edit_entry': return <Edit3 size={20} color="#00D9FF" />;
      case 'add_entry': return <BookPlus size={20} color={Colors.success} />;
      case 'add_variant': return <Plus size={20} color={Colors.accent} />;
      case 'report_issue': return <Flag size={20} color={Colors.error} />;
      default: return <Edit3 size={20} color="#00D9FF" />;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (suggestionType === 'report_issue' && !reportReason.trim()) {
      Alert.alert('Required', 'Please describe the issue.');
      return;
    }
    if (suggestionType !== 'report_issue') {
      if (!english.trim()) {
        Alert.alert('Required', 'English word is required.');
        return;
      }
      if (!zomi.trim()) {
        Alert.alert('Required', 'Zomi translation is required.');
        return;
      }
    }

    try {
      await submitMutation.mutateAsync({
        entryId: params.entryId || undefined,
        suggestionType,
        proposedChanges: {
          english: english.trim() || undefined,
          pos: pos.trim() || undefined,
          zomi: zomi.trim() || undefined,
          explanation: explanation.trim() || undefined,
          usageExample: usageExample.trim() || undefined,
          reportReason: reportReason.trim() || undefined,
        },
        submittedBy: localUser.id,
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (error) {
      console.error('[DictSuggest] Submit error:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    }
  }, [suggestionType, english, zomi, pos, explanation, usageExample, reportReason, params.entryId, localUser.id, submitMutation]);

  if (submitted) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: getTitle(),
            headerStyle: { backgroundColor: '#1A1F35' },
            headerTintColor: Colors.text,
          }}
        />
        <LinearGradient
          colors={['#1A1F35', '#252B45', '#2A2F45']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.successContainer}>
          <CheckCircle size={56} color={Colors.success} />
          <Text style={styles.successTitle}>Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Your {suggestionType === 'report_issue' ? 'report' : 'suggestion'} has been submitted for review. Thank you for contributing!
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: getTitle(),
          headerStyle: { backgroundColor: '#1A1F35' },
          headerTintColor: Colors.text,
        }}
      />
      <LinearGradient
        colors={['#1A1F35', '#252B45', '#2A2F45']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard variant={suggestionType === 'report_issue' ? 'pink' : 'cyan'} style={styles.headerCard}>
            <View style={styles.typeHeader}>
              {getIcon()}
              <Text style={styles.typeTitle}>{getTitle()}</Text>
            </View>
            <Text style={styles.typeDesc}>
              {suggestionType === 'report_issue'
                ? 'Report an incorrect, duplicate, or inappropriate entry.'
                : suggestionType === 'add_entry'
                ? 'Suggest a new English to Zomi word entry.'
                : suggestionType === 'add_variant'
                ? 'Add an alternative Zomi translation for this word.'
                : 'Suggest changes to an existing dictionary entry.'}
            </Text>
          </GlassCard>

          {suggestionType === 'report_issue' ? (
            <View style={styles.formSection}>
              {params.english ? (
                <View style={styles.contextBox}>
                  <Text style={styles.contextLabel}>Reporting entry:</Text>
                  <Text style={styles.contextValue}>{params.english}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>What's the issue?</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Describe the problem (wrong translation, duplicate, offensive content, etc.)"
                placeholderTextColor={Colors.textMuted}
                value={reportReason}
                onChangeText={setReportReason}
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.fieldLabel}>English Word *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter English word"
                placeholderTextColor={Colors.textMuted}
                value={english}
                onChangeText={setEnglish}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>Zomi Translation (Tedim CTD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Zomi translation"
                placeholderTextColor={Colors.textMuted}
                value={zomi}
                onChangeText={setZomi}
              />

              <Text style={styles.fieldLabel}>Part of Speech</Text>
              <View style={styles.posOptions}>
                {['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Other'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.posOption, pos === p && styles.posOptionActive]}
                    onPress={() => setPos(pos === p ? '' : p)}
                  >
                    <Text style={[styles.posOptionText, pos === p && styles.posOptionTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Explanation (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Brief explanation or definition"
                placeholderTextColor={Colors.textMuted}
                value={explanation}
                onChangeText={setExplanation}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Usage Example (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Example sentence using this word"
                placeholderTextColor={Colors.textMuted}
                value={usageExample}
                onChangeText={setUsageExample}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Send size={18} color={Colors.text} />
                <Text style={styles.submitBtnText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 20,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  typeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  formSection: {
    marginBottom: 20,
  },
  contextBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  contextLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  posOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  posOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: 'rgba(0, 217, 255, 0.4)',
  },
  posOptionText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  posOptionTextActive: {
    color: '#00D9FF',
    fontWeight: '600' as const,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#00D9FF',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1F35',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.35)',
    marginTop: 12,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#00D9FF',
  },
});
