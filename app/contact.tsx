import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Mail, 
  MessageSquare, 
  Send,
  Globe,
  Clock,
  CheckCircle,
  HelpCircle,
  Bug,
  Lightbulb,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import Colors from '@/constants/colors';

type ContactCategory = 'general' | 'support' | 'bug' | 'feature' | 'feedback';

const categoryInfo: Record<ContactCategory, { icon: React.ComponentType<{ size: number; color: string }>; label: string; color: string }> = {
  general: { icon: MessageSquare, label: 'General Inquiry', color: Colors.primary },
  support: { icon: HelpCircle, label: 'Technical Support', color: Colors.success },
  bug: { icon: Bug, label: 'Report a Bug', color: Colors.error },
  feature: { icon: Lightbulb, label: 'Feature Request', color: Colors.accent },
  feedback: { icon: Star, label: 'Feedback', color: Colors.secondary },
};

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<ContactCategory>('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      return;
    }
    
    console.log('Contact form submitted:', { name, email, category, message });
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    
    setTimeout(() => setSubmitted(false), 5000);
  }, [name, email, category, message]);

  const handleWebsitePress = useCallback(() => {
    Linking.openURL('https://zomitranslator.com');
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Contact Support',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }} 
      />
      
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbGreen]} />
        <View style={[styles.orb, styles.orbPink]} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(0, 230, 118, 0.4)', 'rgba(255, 107, 157, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Mail size={32} color={Colors.text} />
          </LinearGradient>
          <Text style={styles.title}>Contact Support</Text>
          <Text style={styles.subtitle}>We're here to help you</Text>
        </View>

        {submitted && (
          <GlassCard variant="green" glow style={styles.successCard}>
            <View style={styles.successContent}>
              <CheckCircle size={32} color={Colors.success} />
              <View style={styles.successText}>
                <Text style={styles.successTitle}>Message Sent!</Text>
                <Text style={styles.successSubtitle}>
                  Thank you for contacting us. We'll respond within 24-48 hours.
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        <GlassCard variant="cyan" style={styles.quickContactCard}>
          <Text style={styles.quickContactTitle}>Quick Contact</Text>
          <View style={styles.quickContactGrid}>
            <View style={styles.quickContactItem}>
              <View style={[styles.quickContactIcon, { backgroundColor: Colors.glassGreen }]}>
                <Clock size={20} color={Colors.success} />
              </View>
              <Text style={styles.quickContactLabel}>Response Time</Text>
              <Text style={styles.quickContactValue}>24-48 hours</Text>
            </View>
            
            <View style={styles.quickContactItem}>
              <View style={[styles.quickContactIcon, { backgroundColor: Colors.glassCyan }]}>
                <Globe size={20} color={Colors.primary} />
              </View>
              <Text style={styles.quickContactLabel}>Website</Text>
              <Text style={styles.quickContactValue}>zomitranslator.com</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.formCard}>
          <Text style={styles.formTitle}>Send us a Message</Text>
          
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {(Object.keys(categoryInfo) as ContactCategory[]).map((cat) => {
              const info = categoryInfo[cat];
              const IconComponent = info.icon;
              const isSelected = category === cat;
              
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryItem,
                    isSelected && { backgroundColor: info.color + '20', borderColor: info.color },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <IconComponent size={18} color={isSelected ? info.color : Colors.textSecondary} />
                  <Text style={[styles.categoryItemText, isSelected && { color: info.color }]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Your Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Message *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe your inquiry or issue in detail..."
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <GlassButton
            title="Send Message"
            variant="green"
            fullWidth
            icon={<Send size={18} color={Colors.text} />}
            onPress={handleSubmit}
            disabled={!name.trim() || !email.trim() || !message.trim()}
          />
        </GlassCard>

        <GlassCard variant="purple" style={styles.faqCard}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          {[
            { q: 'How accurate are the translations?', a: 'Our translations are based on a database of 14,000+ words verified by native speakers. AI-assisted translations are marked with a quality indicator.' },
            { q: 'Can I use the app offline?', a: 'Yes! The dictionary is available for offline use. Basic phrases are available offline.' },
            { q: 'How can I contribute to the dictionary?', a: 'Go to the Community tab and use the Contribute feature to suggest new words. Native speakers review all submissions.' },
            { q: 'Is my data safe?', a: 'Absolutely. We use encryption and follow strict privacy guidelines. See our Privacy Policy for details.' },
          ].map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard style={styles.officeCard}>
          <Text style={styles.officeTitle}>Contact Information</Text>
          
          <TouchableOpacity style={styles.officeItem} onPress={handleWebsitePress}>
            <Globe size={18} color={Colors.tertiary} />
            <View style={styles.officeText}>
              <Text style={styles.officeLabel}>Website</Text>
              <Text style={styles.officeValue}>https://zomitranslator.com</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.officeItem}>
            <Clock size={18} color={Colors.success} />
            <View style={styles.officeText}>
              <Text style={styles.officeLabel}>Support Hours</Text>
              <Text style={styles.officeValue}>Monday - Friday, 9 AM - 5 PM CST</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>We typically respond within 24-48 hours</Text>
          <Text style={styles.footerSubtext}>Thank you for using Zomi Translator!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.15,
  },
  orbGreen: {
    backgroundColor: Colors.success,
    top: -80,
    left: -100,
  },
  orbPink: {
    backgroundColor: Colors.secondary,
    bottom: 100,
    right: -120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.select({ web: 24, default: 20 }),
    paddingBottom: 40,
    maxWidth: 900,
    alignSelf: 'center' as const,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  successCard: {
    marginBottom: 20,
    padding: 20,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  successText: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickContactCard: {
    marginBottom: 20,
    padding: 20,
  },
  quickContactTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  quickContactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickContactItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  quickContactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickContactLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  quickContactValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  formCard: {
    marginBottom: 20,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
  },
  categoryItemText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top' as const,
  },
  faqCard: {
    marginBottom: 20,
    padding: 20,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  officeCard: {
    marginBottom: 24,
    padding: 20,
  },
  officeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  officeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  officeText: {
    flex: 1,
  },
  officeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  officeValue: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
