import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Send, AlertCircle, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Stack } from 'expo-router';
import Constants from 'expo-constants';

import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import PageBottomNav, { PAGE_BOTTOM_NAV_SPACING } from '@/components/PageBottomNav';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useUserProfile } from '@/contexts/UserProfileContext';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report', color: Colors.error },
  { value: 'feature', label: 'Feature Request', color: Colors.accent },
  { value: 'translation', label: 'Translation Issue', color: Colors.warning },
  { value: 'general', label: 'General Feedback', color: Colors.success },
] as const;

export default function FeedbackScreen() {
  const [selectedType, setSelectedType] = useState<'bug' | 'feature' | 'translation' | 'general'>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { localUser } = useUserProfile();
  const router = useRouter();

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        'Success',
        'Thank you for your feedback! We will review it soon.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (error) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
    },
  });

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Required Fields', 'Please fill in both title and content.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const deviceInfo = `${Platform.OS} ${Platform.Version}`;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    await submitMutation.mutateAsync({
      type: selectedType,
      title: title.trim(),
      content: content.trim(),
      deviceInfo,
      appVersion,
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Send Feedback',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.5)', 'rgba(140, 92, 255, 0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <MessageSquare size={32} color={Colors.text} />
            </LinearGradient>
            <Text style={styles.headerTitle}>We Value Your Feedback</Text>
            <Text style={styles.headerSubtitle}>Help us improve Zomi Translator</Text>
          </View>

          {!localUser && (
            <GlassCard style={styles.infoCard}>
              <AlertCircle size={20} color={Colors.accent} />
              <Text style={styles.infoText}>
                You can submit feedback anonymously, but logging in allows us to follow up with you.
              </Text>
            </GlassCard>
          )}

          <GlassCard variant="cyan" glow style={styles.formCard}>
            <Text style={styles.sectionLabel}>Feedback Type</Text>
            <View style={styles.typeGrid}>
              {FEEDBACK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    selectedType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedType(type.value);
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync();
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === type.value && styles.typeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Brief description of your feedback"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!submitMutation.isPending}
            />

            <Text style={styles.sectionLabel}>Details</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Please provide as much detail as possible..."
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              editable={!submitMutation.isPending}
            />

            <View style={styles.deviceInfo}>
              <Text style={styles.deviceInfoLabel}>Device Info (included automatically):</Text>
              <Text style={styles.deviceInfoText}>
                {Platform.OS} {Platform.Version} • v{Constants.expoConfig?.version || '1.0.0'}
              </Text>
            </View>

            <GlassButton
              title={submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              variant="cyan"
              onPress={handleSubmit}
              disabled={submitMutation.isPending || !title.trim() || !content.trim()}
              icon={
                submitMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Send size={20} color={Colors.text} />
                )
              }
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
      <PageBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: PAGE_BOTTOM_NAV_SPACING,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    padding: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: Colors.accent,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeLabelActive: {
    color: Colors.accent,
  },
  titleInput: {
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 20,
  },
  contentInput: {
    minHeight: 150,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
  },
  deviceInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  deviceInfoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  deviceInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
