import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  GraduationCap, 
  Star, 
  BookOpen, 
  MessageCircle,
  Lock,
  Trophy,
  Play,
  ChevronRight,
  Flame,
  Target,
  Clock,
  Zap,
  Check,
  Brain,
  Headphones,
  X,
  Volume2,
  ChevronLeft,
  Award,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import ScriptureOfTheDay from '@/components/ScriptureOfTheDay';
import Colors from '@/constants/colors';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { 
  LEARNING_ACHIEVEMENTS, 
  LEARNING_LESSONS, 
  GRAMMAR_TIPS,
  LESSON_CONTENT,
  QUIZ_QUESTIONS,
  LISTENING_EXERCISES,
  LessonContent,
  QuizItem,
} from '@/constants/translations';

const { width } = Dimensions.get('window');

const achievementIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'star': Star,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'message-circle': MessageCircle,
  'flame': Flame,
  'trophy': Trophy,
};

export default function LearnScreen() {
  const { recordQuiz, recordListening, recordLesson } = useUserProfile();
  
  const [currentLevel] = useState(2);
  const [totalXP, setTotalXP] = useState(275);
  const [progress] = useState(35);
  const [streak] = useState(5);
  
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [lessonStep, setLessonStep] = useState(0);
  
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizItem[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  
  const [showListeningModal, setShowListeningModal] = useState(false);
  const [listeningExercises, setListeningExercises] = useState(LISTENING_EXERCISES);
  const [currentListeningIndex, setCurrentListeningIndex] = useState(0);
  const [selectedListeningAnswer, setSelectedListeningAnswer] = useState<string | null>(null);
  const [showListeningResult, setShowListeningResult] = useState(false);
  const [listeningScore, setListeningScore] = useState(0);
  const [listeningAnsweredCorrectly, setListeningAnsweredCorrectly] = useState<boolean | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 800,
          useNativeDriver: false,
        }),
      ]).start();

    }, 50);

    return () => clearTimeout(timer);
  }, [fadeAnim, progress, progressAnim]);

  const handleStartLesson = useCallback((lessonId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const lesson = LESSON_CONTENT[lessonId];
    if (lesson) {
      setCurrentLesson(lesson);
      setLessonStep(0);
      setShowLessonModal(true);
    }
  }, []);

  const handleNextLessonStep = useCallback(async () => {
    if (!currentLesson) return;
    const totalSteps = currentLesson.vocabulary.length + (currentLesson.dialogues?.length || 0) + (currentLesson.tips?.length || 0);
    
    if (lessonStep < totalSteps - 1) {
      setLessonStep(prev => prev + 1);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      setTotalXP(prev => prev + 25);
      setShowLessonModal(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      await recordLesson(currentLesson.title);
      
      Alert.alert('Lesson Complete!', `You earned 25 XP!`);
    }
  }, [currentLesson, lessonStep, recordLesson]);

  const handlePrevLessonStep = useCallback(() => {
    if (lessonStep > 0) {
      setLessonStep(prev => prev - 1);
    }
  }, [lessonStep]);

  const speakZomi = useCallback((text: string) => {
    try {
      Speech.speak(text, {
        language: 'en',
        rate: 0.7,
        pitch: 1.0,
      });
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
    }
  }, []);

  const handleStartQuiz = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuizQuestions(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setAnsweredCorrectly(null);
    setShowQuizModal(true);
  }, []);

  const handleQuizAnswer = useCallback((answer: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    const currentQuestion = quizQuestions[currentQuizIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    setAnsweredCorrectly(isCorrect);
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [selectedAnswer, quizQuestions, currentQuizIndex]);

  const handleNextQuizQuestion = useCallback(async () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnsweredCorrectly(null);
    } else {
      setShowQuizResult(true);
      const earnedXP = quizScore * 10;
      setTotalXP(prev => prev + earnedXP);
      
      await recordQuiz(quizScore, quizQuestions.length);
    }
  }, [currentQuizIndex, quizQuestions.length, quizScore, recordQuiz]);

  const handleStartListening = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const shuffled = [...LISTENING_EXERCISES].sort(() => Math.random() - 0.5).slice(0, 5);
    setListeningExercises(shuffled);
    setCurrentListeningIndex(0);
    setListeningScore(0);
    setSelectedListeningAnswer(null);
    setShowListeningResult(false);
    setListeningAnsweredCorrectly(null);
    setShowListeningModal(true);
  }, []);

  const handlePlayListeningAudio = useCallback(() => {
    const exercise = listeningExercises[currentListeningIndex];
    if (exercise) {
      speakZomi(exercise.zomiText);
    }
  }, [listeningExercises, currentListeningIndex, speakZomi]);

  const handleListeningAnswer = useCallback((answer: string) => {
    if (selectedListeningAnswer !== null) return;
    
    setSelectedListeningAnswer(answer);
    const currentExercise = listeningExercises[currentListeningIndex];
    const isCorrect = answer === currentExercise.correctAnswer;
    setListeningAnsweredCorrectly(isCorrect);
    
    if (isCorrect) {
      setListeningScore(prev => prev + 1);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [selectedListeningAnswer, listeningExercises, currentListeningIndex]);

  const handleNextListeningQuestion = useCallback(async () => {
    if (currentListeningIndex < listeningExercises.length - 1) {
      setCurrentListeningIndex(prev => prev + 1);
      setSelectedListeningAnswer(null);
      setListeningAnsweredCorrectly(null);
    } else {
      setShowListeningResult(true);
      const earnedXP = listeningScore * 10;
      setTotalXP(prev => prev + earnedXP);
      
      await recordListening(listeningScore, listeningExercises.length);
    }
  }, [currentListeningIndex, listeningExercises.length, listeningScore, recordListening]);

  const getAchievementColor = (color: string): 'cyan' | 'pink' | 'yellow' | 'purple' | 'green' | 'default' => {
    switch (color) {
      case 'yellow': return 'yellow';
      case 'cyan': return 'cyan';
      case 'green': return 'green';
      case 'pink': return 'pink';
      case 'purple': return 'purple';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return Colors.success;
      case 'intermediate': return Colors.accent;
      case 'advanced': return Colors.secondary;
      default: return Colors.textSecondary;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const renderLessonContent = () => {
    if (!currentLesson) return null;
    
    const vocabCount = currentLesson.vocabulary.length;
    const dialogueCount = currentLesson.dialogues?.length || 0;
    const tipCount = currentLesson.tips?.length || 0;
    const totalSteps = vocabCount + dialogueCount + tipCount;
    
    if (lessonStep < vocabCount) {
      const vocab = currentLesson.vocabulary[lessonStep];
      return (
        <View style={styles.lessonContentCard}>
          <View style={styles.lessonTypeTag}>
            <BookOpen size={14} color={Colors.primary} />
            <Text style={styles.lessonTypeText}>Vocabulary</Text>
          </View>
          <Text style={styles.lessonProgressText}>{lessonStep + 1} / {totalSteps}</Text>
          
          <View style={styles.vocabCard}>
            <Text style={styles.vocabZomi}>{vocab.zomi}</Text>
            <TouchableOpacity onPress={() => speakZomi(vocab.zomi)} style={styles.speakBtn}>
              <Volume2 size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.vocabPronunciation}>/{vocab.pronunciation}/</Text>
          <Text style={styles.vocabEnglish}>{vocab.english}</Text>
          
          {vocab.example && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleLabel}>Example:</Text>
              <Text style={styles.exampleText}>{vocab.example}</Text>
            </View>
          )}
        </View>
      );
    } else if (lessonStep < vocabCount + dialogueCount && currentLesson.dialogues) {
      const dialogueIndex = lessonStep - vocabCount;
      const dialogue = currentLesson.dialogues[dialogueIndex];
      return (
        <View style={styles.lessonContentCard}>
          <View style={styles.lessonTypeTag}>
            <MessageCircle size={14} color={Colors.tertiary} />
            <Text style={styles.lessonTypeText}>Dialogue</Text>
          </View>
          <Text style={styles.lessonProgressText}>{lessonStep + 1} / {totalSteps}</Text>
          
          <View style={styles.dialogueCard}>
            <View style={styles.dialogueSpeaker}>
              <Text style={styles.speakerLabel}>Speaker {dialogue.speaker}</Text>
            </View>
            <Text style={styles.dialogueZomi}>{dialogue.zomi}</Text>
            <TouchableOpacity onPress={() => speakZomi(dialogue.zomi)} style={styles.speakBtnSmall}>
              <Volume2 size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.dialogueEnglish}>{dialogue.english}</Text>
          </View>
        </View>
      );
    } else if (currentLesson.tips) {
      const tipIndex = lessonStep - vocabCount - dialogueCount;
      const tip = currentLesson.tips[tipIndex];
      return (
        <View style={styles.lessonContentCard}>
          <View style={styles.lessonTypeTag}>
            <Star size={14} color={Colors.accent} />
            <Text style={styles.lessonTypeText}>Cultural Tip</Text>
          </View>
          <Text style={styles.lessonProgressText}>{lessonStep + 1} / {totalSteps}</Text>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundTertiary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.gradientOrbs}>
        <View style={[styles.orb, styles.orbYellow]} />
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbCyan]} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['rgba(255, 217, 61, 0.4)', 'rgba(255, 107, 157, 0.4)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <GraduationCap size={26} color={Colors.text} />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Learn Zomi</Text>
                <Text style={styles.headerSubtitle}>Master the language</Text>
              </View>
            </View>
            <Animated.View style={[styles.streakBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Flame size={20} color="#FF6B00" />
              <Text style={styles.streakText}>{streak}</Text>
            </Animated.View>
          </View>

          <GlassCard variant="yellow" glow elevated style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelLabel}>YOUR LEVEL</Text>
                <Text style={styles.levelName}>Beginner</Text>
                <View style={styles.xpContainer}>
                  <Zap size={14} color={Colors.accent} />
                  <Text style={styles.xpText}>{totalXP} XP</Text>
                </View>
              </View>
              <LinearGradient
                colors={['rgba(255, 217, 61, 0.6)', 'rgba(255, 107, 157, 0.6)']}
                style={styles.levelBadge}
              >
                <Text style={styles.levelNumber}>{currentLevel}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress to Level {currentLevel + 1}</Text>
                <Text style={styles.progressValue}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View style={{ width: progressWidth }}>
                  <LinearGradient
                    colors={[Colors.accent, Colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFill}
                  />
                </Animated.View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <BookOpen size={20} color={Colors.primary} />
                <Text style={styles.statNumber}>24</Text>
                <Text style={styles.statLabel}>Words</Text>
              </View>
              <View style={styles.statBox}>
                <Target size={20} color={Colors.success} />
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>Lessons</Text>
              </View>
              <View style={styles.statBox}>
                <Clock size={20} color={Colors.tertiary} />
                <Text style={styles.statNumber}>4h</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.dailyGoalSection}>
            <Text style={styles.sectionTitle}>Daily Goal</Text>
            <GlassCard variant="green" glow style={styles.dailyGoalCard}>
              <View style={styles.dailyGoalContent}>
                <View style={styles.dailyGoalLeft}>
                  <Target size={32} color={Colors.success} />
                </View>
                <View style={styles.dailyGoalMiddle}>
                  <Text style={styles.dailyGoalTitle}>Complete 2 lessons</Text>
                  <Text style={styles.dailyGoalProgress}>1 of 2 completed</Text>
                  <View style={styles.dailyProgressBar}>
                    <View style={[styles.dailyProgressFill, { width: '50%' }]} />
                  </View>
                </View>
                <View style={styles.dailyGoalRight}>
                  <Text style={styles.dailyGoalXP}>+50 XP</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <View style={styles.lessonsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Learning Path</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {LEARNING_LESSONS.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => !lesson.locked && handleStartLesson(lesson.id)}
                disabled={lesson.locked}
                activeOpacity={0.8}
              >
                <GlassCard 
                  variant={lesson.completed ? 'green' : lesson.locked ? 'default' : 'cyan'}
                  glow={!lesson.locked && !lesson.completed}
                  style={[
                    styles.lessonCard,
                    lesson.locked && styles.lessonLocked,
                  ]}
                >
                  <View style={styles.lessonRow}>
                    <View style={[
                      styles.lessonNumber,
                      lesson.completed && styles.lessonNumberCompleted,
                      lesson.locked && styles.lessonNumberLocked,
                    ]}>
                      {lesson.completed ? (
                        <Check size={20} color={Colors.text} />
                      ) : lesson.locked ? (
                        <Lock size={18} color={Colors.textMuted} />
                      ) : (
                        <Text style={styles.lessonNumberText}>{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.lessonContent}>
                      <View style={styles.lessonTitleRow}>
                        <Text style={[
                          styles.lessonTitle,
                          lesson.locked && styles.lessonTitleLocked,
                        ]}>
                          {lesson.title}
                        </Text>
                        <View style={[
                          styles.difficultyBadge,
                          { backgroundColor: `${getDifficultyColor(lesson.difficulty)}30` }
                        ]}>
                          <Text style={[
                            styles.difficultyText,
                            { color: getDifficultyColor(lesson.difficulty) }
                          ]}>
                            {lesson.difficulty}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.lessonDescription}>{lesson.description}</Text>
                      <View style={styles.lessonMeta}>
                        <View style={styles.lessonMetaItem}>
                          <Clock size={12} color={Colors.textMuted} />
                          <Text style={styles.lessonMetaText}>{lesson.duration} min</Text>
                        </View>
                        <View style={styles.lessonMetaItem}>
                          <Zap size={12} color={Colors.accent} />
                          <Text style={styles.lessonMetaText}>+{lesson.xp} XP</Text>
                        </View>
                      </View>
                    </View>
                    {!lesson.locked && !lesson.completed && (
                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => handleStartLesson(lesson.id)}
                      >
                        <Play size={20} color={Colors.text} fill={Colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.practiceSection}>
            <Text style={styles.sectionTitle}>Practice Activities</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.practiceScrollContent}
            >
              <GlassCard variant="purple" glow style={styles.practiceCard}>
                <View style={styles.practiceIcon}>
                  <Brain size={28} color={Colors.tertiary} />
                </View>
                <Text style={styles.practiceTitle}>Quiz</Text>
                <Text style={styles.practiceDesc}>Test your knowledge</Text>
                <GlassButton
                  title="Start"
                  variant="purple"
                  size="small"
                  onPress={handleStartQuiz}
                  style={styles.practiceButton}
                />
              </GlassCard>

              <GlassCard variant="pink" glow style={styles.practiceCard}>
                <View style={styles.practiceIcon}>
                  <Headphones size={28} color={Colors.secondary} />
                </View>
                <Text style={styles.practiceTitle}>Listening</Text>
                <Text style={styles.practiceDesc}>Improve pronunciation</Text>
                <GlassButton
                  title="Start"
                  variant="pink"
                  size="small"
                  onPress={handleStartListening}
                  style={styles.practiceButton}
                />
              </GlassCard>
            </ScrollView>
          </View>

          <View style={styles.grammarSection}>
            <Text style={styles.sectionTitle}>Grammar Spotlight</Text>
            <GlassCard style={styles.grammarCard}>
              <Text style={styles.grammarTitle}>{GRAMMAR_TIPS[0].title}</Text>
              <Text style={styles.grammarDescription}>{GRAMMAR_TIPS[0].description}</Text>
              <View style={styles.grammarExamples}>
                {GRAMMAR_TIPS[0].examples.map((example, index) => (
                  <View key={index} style={styles.grammarRow}>
                    <Text style={styles.grammarLabel}>{example.tense}:</Text>
                    <Text style={styles.grammarValue}>{example.zomi}</Text>
                    <Text style={styles.grammarEnglish}>({example.english})</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>View Full Guide</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </GlassCard>
          </View>

          <View style={styles.achievementsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScrollContent}
            >
              {LEARNING_ACHIEVEMENTS.map((achievement) => {
                const IconComponent = achievementIcons[achievement.icon] || Trophy;
                return (
                  <GlassCard 
                    key={achievement.id}
                    variant={getAchievementColor(achievement.color)}
                    glow={achievement.unlocked}
                    style={[
                      styles.achievementCard,
                      !achievement.unlocked && styles.achievementLocked,
                    ]}
                  >
                    <View style={[
                      styles.achievementIcon,
                      !achievement.unlocked && styles.achievementIconLocked,
                    ]}>
                      {achievement.unlocked ? (
                        <IconComponent size={24} color={Colors.text} />
                      ) : (
                        <Lock size={24} color={Colors.textMuted} />
                      )}
                    </View>
                    <Text style={[
                      styles.achievementTitle,
                      !achievement.unlocked && styles.achievementTextLocked,
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription} numberOfLines={2}>
                      {achievement.description}
                    </Text>
                  </GlassCard>
                );
              })}
            </ScrollView>
          </View>

          <ScriptureOfTheDay />
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showLessonModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLessonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLessonModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{currentLesson?.title}</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalBody}>
              {renderLessonContent()}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.navButton, lessonStep === 0 && styles.navButtonDisabled]}
                onPress={handlePrevLessonStep}
                disabled={lessonStep === 0}
              >
                <ChevronLeft size={20} color={lessonStep === 0 ? Colors.textMuted : Colors.text} />
                <Text style={[styles.navButtonText, lessonStep === 0 && styles.navButtonTextDisabled]}>Back</Text>
              </TouchableOpacity>
              <GlassButton
                title={lessonStep === (currentLesson ? currentLesson.vocabulary.length + (currentLesson.dialogues?.length || 0) + (currentLesson.tips?.length || 0) - 1 : 0) ? "Complete" : "Next"}
                variant="cyan"
                onPress={handleNextLessonStep}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQuizModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowQuizModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowQuizModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Quiz</Text>
              <View style={styles.quizProgress}>
                <Text style={styles.quizProgressText}>{currentQuizIndex + 1}/{quizQuestions.length}</Text>
              </View>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {!showQuizResult ? (
                quizQuestions.length > 0 && (
                  <View style={styles.quizContent}>
                    <View style={styles.quizTypeTag}>
                      <Brain size={14} color={Colors.tertiary} />
                      <Text style={styles.quizTypeText}>
                        {quizQuestions[currentQuizIndex].type === 'multiple_choice' ? 'Multiple Choice' : 
                         quizQuestions[currentQuizIndex].type === 'translate' ? 'Translation' : 'Fill in the Blank'}
                      </Text>
                    </View>
                    
                    <Text style={styles.quizQuestion}>{quizQuestions[currentQuizIndex].question}</Text>
                    
                    <View style={styles.quizOptions}>
                      {quizQuestions[currentQuizIndex].options?.map((option, index) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = option === quizQuestions[currentQuizIndex].correctAnswer;
                        const showResult = selectedAnswer !== null;
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.quizOption,
                              isSelected && styles.quizOptionSelected,
                              showResult && isCorrect && styles.quizOptionCorrect,
                              showResult && isSelected && !isCorrect && styles.quizOptionWrong,
                            ]}
                            onPress={() => handleQuizAnswer(option)}
                            disabled={selectedAnswer !== null}
                          >
                            <Text style={[
                              styles.quizOptionText,
                              isSelected && styles.quizOptionTextSelected,
                            ]}>
                              {option}
                            </Text>
                            {showResult && isCorrect && <CheckCircle size={20} color={Colors.success} />}
                            {showResult && isSelected && !isCorrect && <XCircle size={20} color={Colors.error} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {selectedAnswer !== null && (
                      <View style={styles.explanationBox}>
                        <Text style={styles.explanationTitle}>
                          {answeredCorrectly ? '✓ Correct!' : '✗ Incorrect'}
                        </Text>
                        <Text style={styles.explanationText}>
                          {quizQuestions[currentQuizIndex].explanation}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              ) : (
                <View style={styles.resultContent}>
                  <View style={styles.resultIcon}>
                    <Award size={64} color={quizScore >= 3 ? Colors.accent : Colors.textMuted} />
                  </View>
                  <Text style={styles.resultTitle}>Quiz Complete!</Text>
                  <Text style={styles.resultScore}>
                    You got {quizScore} out of {quizQuestions.length} correct
                  </Text>
                  <View style={styles.resultXP}>
                    <Zap size={20} color={Colors.accent} />
                    <Text style={styles.resultXPText}>+{quizScore * 10} XP earned</Text>
                  </View>
                  <GlassButton
                    title="Try Again"
                    variant="purple"
                    onPress={handleStartQuiz}
                    style={styles.resultButton}
                  />
                  <GlassButton
                    title="Close"
                    variant="default"
                    onPress={() => setShowQuizModal(false)}
                    style={styles.resultButton}
                  />
                </View>
              )}
            </ScrollView>
            
            {!showQuizResult && selectedAnswer !== null && (
              <View style={styles.modalFooter}>
                <GlassButton
                  title={currentQuizIndex < quizQuestions.length - 1 ? "Next Question" : "See Results"}
                  variant="purple"
                  onPress={handleNextQuizQuestion}
                  fullWidth
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showListeningModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowListeningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowListeningModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Listening Practice</Text>
              <View style={styles.quizProgress}>
                <Text style={styles.quizProgressText}>{currentListeningIndex + 1}/{listeningExercises.length}</Text>
              </View>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {!showListeningResult ? (
                listeningExercises.length > 0 && (
                  <View style={styles.quizContent}>
                    <View style={styles.quizTypeTag}>
                      <Headphones size={14} color={Colors.secondary} />
                      <Text style={styles.quizTypeText}>Listen & Select</Text>
                    </View>
                    
                    <Text style={styles.listeningInstruction}>Listen to the audio and select what you hear:</Text>
                    
                    <TouchableOpacity style={styles.playAudioBtn} onPress={handlePlayListeningAudio}>
                      <LinearGradient
                        colors={[Colors.glassPink, Colors.glassPurple]}
                        style={styles.playAudioGradient}
                      >
                        <Volume2 size={32} color={Colors.text} />
                        <Text style={styles.playAudioText}>Play Audio</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <View style={styles.quizOptions}>
                      {listeningExercises[currentListeningIndex].options.map((option, index) => {
                        const isSelected = selectedListeningAnswer === option;
                        const isCorrect = option === listeningExercises[currentListeningIndex].correctAnswer;
                        const showResult = selectedListeningAnswer !== null;
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.quizOption,
                              isSelected && styles.quizOptionSelected,
                              showResult && isCorrect && styles.quizOptionCorrect,
                              showResult && isSelected && !isCorrect && styles.quizOptionWrong,
                            ]}
                            onPress={() => handleListeningAnswer(option)}
                            disabled={selectedListeningAnswer !== null}
                          >
                            <Text style={[
                              styles.quizOptionText,
                              isSelected && styles.quizOptionTextSelected,
                            ]}>
                              {option}
                            </Text>
                            {showResult && isCorrect && <CheckCircle size={20} color={Colors.success} />}
                            {showResult && isSelected && !isCorrect && <XCircle size={20} color={Colors.error} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {selectedListeningAnswer !== null && (
                      <View style={styles.explanationBox}>
                        <Text style={styles.explanationTitle}>
                          {listeningAnsweredCorrectly ? '✓ Correct!' : '✗ Incorrect'}
                        </Text>
                        <Text style={styles.explanationText}>
                          The answer is: {listeningExercises[currentListeningIndex].correctAnswer}
                        </Text>
                        <Text style={styles.explanationText}>
                          Meaning: {listeningExercises[currentListeningIndex].englishText}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              ) : (
                <View style={styles.resultContent}>
                  <View style={styles.resultIcon}>
                    <Award size={64} color={listeningScore >= 3 ? Colors.accent : Colors.textMuted} />
                  </View>
                  <Text style={styles.resultTitle}>Listening Complete!</Text>
                  <Text style={styles.resultScore}>
                    You got {listeningScore} out of {listeningExercises.length} correct
                  </Text>
                  <View style={styles.resultXP}>
                    <Zap size={20} color={Colors.accent} />
                    <Text style={styles.resultXPText}>+{listeningScore * 10} XP earned</Text>
                  </View>
                  <GlassButton
                    title="Try Again"
                    variant="pink"
                    onPress={handleStartListening}
                    style={styles.resultButton}
                  />
                  <GlassButton
                    title="Close"
                    variant="default"
                    onPress={() => setShowListeningModal(false)}
                    style={styles.resultButton}
                  />
                </View>
              )}
            </ScrollView>
            
            {!showListeningResult && selectedListeningAnswer !== null && (
              <View style={styles.modalFooter}>
                <GlassButton
                  title={currentListeningIndex < listeningExercises.length - 1 ? "Next Question" : "See Results"}
                  variant="pink"
                  onPress={handleNextListeningQuestion}
                  fullWidth
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    opacity: 0.2,
  },
  orbYellow: {
    backgroundColor: Colors.accent,
    top: -120,
    left: -100,
  },
  orbPurple: {
    backgroundColor: Colors.tertiary,
    bottom: 200,
    right: -150,
  },
  orbCyan: {
    backgroundColor: Colors.primary,
    bottom: -50,
    left: -80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  levelCard: {
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  levelLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  levelName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.surface,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dailyGoalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  dailyGoalCard: {
    padding: 16,
  },
  dailyGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dailyGoalLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyGoalMiddle: {
    flex: 1,
  },
  dailyGoalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  dailyGoalProgress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  dailyProgressBar: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyProgressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  dailyGoalRight: {
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyGoalXP: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  lessonsSection: {
    marginBottom: 24,
  },
  lessonCard: {
    marginBottom: 12,
    padding: 16,
  },
  lessonLocked: {
    opacity: 0.6,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lessonNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glassCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.glassCyanBorder,
  },
  lessonNumberCompleted: {
    backgroundColor: Colors.glassGreen,
    borderColor: Colors.glassGreenBorder,
  },
  lessonNumberLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.glassBorder,
  },
  lessonNumberText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lessonTitleLocked: {
    color: Colors.textMuted,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  lessonDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  lessonMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.glassCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassCyanBorder,
  },
  practiceSection: {
    marginBottom: 24,
  },
  practiceScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  practiceCard: {
    width: width * 0.4,
    padding: 16,
    alignItems: 'center',
  },
  practiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  practiceDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  practiceButton: {
    width: '100%',
  },
  grammarSection: {
    marginBottom: 24,
  },
  grammarCard: {
    padding: 18,
  },
  grammarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  grammarDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 18,
  },
  grammarExamples: {
    gap: 10,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
  },
  grammarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grammarLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    width: 70,
  },
  grammarValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  grammarEnglish: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  achievementCard: {
    width: width * 0.4,
    padding: 16,
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementIconLocked: {
    backgroundColor: Colors.surface,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  achievementTextLocked: {
    color: Colors.textMuted,
  },
  achievementDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  navButtonTextDisabled: {
    color: Colors.textMuted,
  },
  lessonContentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  lessonTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassCyan,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  lessonTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lessonProgressText: {
    position: 'absolute',
    top: 20,
    right: 20,
    fontSize: 12,
    color: Colors.textMuted,
  },
  vocabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vocabZomi: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  speakBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.glassCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakBtnSmall: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocabPronunciation: {
    fontSize: 16,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  vocabEnglish: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  exampleBox: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  exampleLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  dialogueCard: {
    position: 'relative',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  dialogueSpeaker: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: Colors.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  speakerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dialogueZomi: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  dialogueEnglish: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tipCard: {
    backgroundColor: Colors.glassYellow,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  tipText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  quizProgress: {
    backgroundColor: Colors.glassPurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quizProgressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quizContent: {
    flex: 1,
  },
  quizTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassPurple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  quizTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quizQuestion: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 24,
    lineHeight: 32,
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  quizOptionSelected: {
    borderColor: Colors.tertiary,
    backgroundColor: Colors.glassPurple,
  },
  quizOptionCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.glassGreen,
  },
  quizOptionWrong: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  quizOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  quizOptionTextSelected: {
    fontWeight: '600' as const,
  },
  explanationBox: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  resultContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  resultIcon: {
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  resultScore: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  resultXP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.glassYellow,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 32,
  },
  resultXPText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  resultButton: {
    width: '80%',
    marginBottom: 12,
  },
  listeningInstruction: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  playAudioBtn: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  playAudioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  playAudioText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
