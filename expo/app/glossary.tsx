import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Plus, Trash2, BookOpen, Pencil, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';
import { useGlossary, GlossaryTerm } from '@/contexts/GlossaryContext';

export default function GlossaryScreen() {
  const { terms, add, update, remove, clear } = useGlossary();
  const [term, setTerm] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState<string>('');
  const [editMeaning, setEditMeaning] = useState<string>('');

  const handleAdd = useCallback(() => {
    if (!term.trim() || !meaning.trim()) {
      Alert.alert('Missing fields', 'Please enter both a Zomi term and its meaning.');
      return;
    }
    add(term, meaning);
    setTerm('');
    setMeaning('');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [term, meaning, add]);

  const handleStartEdit = useCallback((t: GlossaryTerm) => {
    setEditingId(t.id);
    setEditTerm(t.term);
    setEditMeaning(t.meaning);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    if (!editTerm.trim() || !editMeaning.trim()) return;
    update(editingId, editTerm, editMeaning);
    setEditingId(null);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, [editingId, editTerm, editMeaning, update]);

  const handleClear = useCallback(() => {
    Alert.alert('Clear glossary?', 'This will remove all your custom Zomi terms.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clear() },
    ]);
  }, [clear]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Glossary' }} />
      <LinearGradient
        colors={['#2A2F45', '#363D5A', '#323854', '#2A2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <BookOpen size={28} color={Colors.accent} />
            <View style={styles.headerText}>
              <Text style={styles.title}>My Zomi Glossary</Text>
              <Text style={styles.subtitle}>
                Custom Zomi terms you add here are sent to the AI for personalised
                accuracy on every translation.
              </Text>
            </View>
          </View>

          <GlassCard variant="cyan" style={styles.card}>
            <Text style={styles.label}>Add a term</Text>
            <TextInput
              style={styles.input}
              placeholder="Zomi word (e.g. Lungdam)"
              placeholderTextColor={Colors.textMuted}
              value={term}
              onChangeText={setTerm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Meaning in English"
              placeholderTextColor={Colors.textMuted}
              value={meaning}
              onChangeText={setMeaning}
              multiline
            />
            <TouchableOpacity onPress={handleAdd} style={styles.addBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(0,240,255,0.85)', 'rgba(140,92,255,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtnGradient}
              >
                <Plus size={18} color={Colors.text} />
                <Text style={styles.addBtnText}>Add term</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassCard>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {terms.length} {terms.length === 1 ? 'term' : 'terms'}
            </Text>
            {terms.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {terms.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Your glossary is empty. Add Zomi terms above and they will be used to improve
                translation accuracy.
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.list}>
              {terms.map((t) => (
                <GlassCard key={t.id} variant="purple" style={styles.termCard}>
                  {editingId === t.id ? (
                    <View>
                      <TextInput
                        style={styles.input}
                        value={editTerm}
                        onChangeText={setEditTerm}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.input, styles.inputMulti]}
                        value={editMeaning}
                        onChangeText={setEditMeaning}
                        multiline
                      />
                      <View style={styles.editRow}>
                        <TouchableOpacity onPress={handleSaveEdit} style={styles.iconBtn}>
                          <Check size={18} color={Colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)} style={styles.iconBtn}>
                          <X size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.termRow}>
                      <View style={styles.termTexts}>
                        <Text style={styles.termText}>{t.term}</Text>
                        <Text style={styles.meaningText}>{t.meaning}</Text>
                      </View>
                      <View style={styles.termActions}>
                        <TouchableOpacity onPress={() => handleStartEdit(t)} style={styles.iconBtn}>
                          <Pencil size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => remove(t.id)} style={styles.iconBtn}>
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </GlassCard>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  card: { padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 10,
  },
  inputMulti: { minHeight: 60, textAlignVertical: 'top' },
  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addBtnText: { color: Colors.text, fontWeight: '700' as const, fontSize: 15 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  listTitle: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' as const },
  clearText: { fontSize: 13, color: Colors.error, fontWeight: '600' as const },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  list: { gap: 10 },
  termCard: { padding: 14 },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  termTexts: { flex: 1 },
  termText: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  meaningText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  termActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 8, borderRadius: 8 },
  editRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
});
