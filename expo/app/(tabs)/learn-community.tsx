import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { 
  GraduationCap,
  Users,
  BookOpen,
  MessageCircle,
  Play,
  Flame,
  Target,
  Clock,
  Zap,
  Check,
  Brain,
  Headphones,
  PenTool,
  Heart,
  Plus,
  Send,
  ThumbsUp,
  Award,
  Search,
  X,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  BookPlus,
  MessageSquare,
  BadgeCheck,

  LogIn,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import Colors from '@/constants/colors';
import { 
  LEARNING_LESSONS, 
  FORUM_POSTS, 
  CONTRIBUTED_WORDS, 
  ForumPost, 
  ContributedWord 
} from '@/constants/translations';
import { useUserProfile } from '@/contexts/UserProfileContext';

const { width } = Dimensions.get('window');

const categoryIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'question': HelpCircle,
  'discussion': MessageCircle,
  'contribution': BookPlus,
  'feedback': Lightbulb,
};

const categoryColors: Record<string, string> = {
  'question': Colors.primary,
  'discussion': Colors.tertiary,
  'contribution': Colors.success,
  'feedback': Colors.accent,
};

export default function LearnCommunityScreen() {
  const { localUser } = useUserProfile();
  const isAuthenticated = true;
  const user = localUser;
  
  const [activeTab, setActiveTab] = useState<'learn' | 'community'>('learn');
  const [communitySubTab, setCommunitySubTab] = useState<'forum' | 'contribute'>('forum');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<'question' | 'discussion' | 'contribution' | 'feedback'>('question');
  const [newWord, setNewWord] = useState({ zomi: '', english: '', pronunciation: '', example: '' });
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [votedWords, setVotedWords] = useState<Set<string>>(new Set());
  
  const [currentLevel] = useState(2);
  const [totalXP] = useState(275);
  const [progress] = useState(35);
  const [streak] = useState(5);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

  }, [fadeAnim, progress, progressAnim]);

  const handleStartLesson = useCallback((lessonId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    console.log('Starting lesson:', lessonId);
  }, []);

  const handleLikePost = useCallback((postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to like posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => console.log('Action requires user') },
        ]
      );
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, [isAuthenticated]);

  const handleVoteWord = useCallback((wordId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to vote on contributions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => console.log('Action requires user') },
        ]
      );
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVotedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  }, [isAuthenticated]);

  const handleOpenNewPostModal = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to create posts in the community forum.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => console.log('Action requires user') },
        ]
      );
      return;
    }
    setShowNewPostModal(true);
  }, [isAuthenticated]);

  const handleOpenContributeModal = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to contribute to the community.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => console.log('Action requires user') },
        ]
      );
      return;
    }
    setShowContributeModal(true);
  }, [isAuthenticated]);

  const handleSubmitPost = useCallback(() => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'You must be logged in to submit posts.');
      return;
    }
    
    console.log('Submitting post:', { 
      title: newPostTitle, 
      content: newPostContent, 
      category: newPostCategory,
      userId: user.id,
    });
    setShowNewPostModal(false);
    setNewPostTitle('');
    setNewPostContent('');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Success', 'Your post has been submitted!');
  }, [newPostTitle, newPostContent, newPostCategory, isAuthenticated, user]);

  const handleSubmitWord = useCallback(() => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'You must be logged in to submit word contributions.');
      return;
    }
    
    console.log('Submitting word:', { ...newWord, userId: user.id });
    setShowContributeModal(false);
    setNewWord({ zomi: '', english: '', pronunciation: '', example: '' });
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Success', 'Your word contribution has been submitted for review!');
  }, [newWord, isAuthenticated, user]);

  const filteredPosts = FORUM_POSTS.filter(post => {
    const matchesSearch = searchQuery
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory
      ? post.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'pending': return Colors.accent;
      case 'rejected': return Colors.error;
      default: return Colors.textMuted;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const renderPost = (post: ForumPost, index: number) => {
    const IconComponent = categoryIcons[post.category] || MessageCircle;
    const isLiked = likedPosts.has(post.id);
    const variants: ('cyan' | 'pink' | 'yellow' | 'purple' | 'green')[] = ['cyan', 'pink', 'yellow', 'purple', 'green'];
    
    return (
      <GlassCard 
        key={post.id} 
        variant={variants[index % 5]}
        style={styles.postCard}
      >
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: categoryColors[post.category] + '30' }]}>
            <Text style={[styles.avatarText, { color: categoryColors[post.category] }]}>{post.userAvatar}</Text>
          </View>
          <View style={styles.postHeaderText}>
            <View style={styles.userRow}>
              <Text style={styles.userName}>{post.userName}</Text>
              {post.isVerified && (
                <View style={styles.verifiedIconBadge}>
                  <BadgeCheck size={13} color="#63C0FF" />
                </View>
              )}
            </View>
            <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColors[post.category] + '20' }]}>
            <IconComponent size={12} color={categoryColors[post.category]} />
            <Text style={[styles.categoryText, { color: categoryColors[post.category] }]}>
              {post.category}
            </Text>
          </View>
        </View>
        
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
        
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
            onPress={() => handleLikePost(post.id)}
          >
            <Heart 
              size={18} 
              color={isLiked ? Colors.secondary : Colors.textSecondary}
              fill={isLiked ? Colors.secondary : 'transparent'}
            />
            <Text style={[styles.actionText, isLiked && { color: Colors.secondary }]}>
              {post.likes + (isLiked ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MessageSquare size={18} color={Colors.textSecondary} />
            <Text style={styles.actionText}>{post.replies}</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  const renderContributedWord = (word: ContributedWord) => {
    const isVoted = votedWords.has(word.id);
    
    return (
      <GlassCard key={word.id} style={styles.wordCard}>
        <View style={styles.wordHeader}>
          <View style={styles.wordTitles}>
            <Text style={styles.wordZomi}>{word.zomi}</Text>
            <Text style={styles.wordEnglish}>{word.english}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(word.status) + '20' }]}>
            {word.status === 'approved' && <CheckCircle size={12} color={getStatusColor(word.status)} />}
            {word.status === 'pending' && <Clock size={12} color={getStatusColor(word.status)} />}
            <Text style={[styles.statusText, { color: getStatusColor(word.status) }]}>
              {word.status}
            </Text>
          </View>
        </View>
        
        {word.pronunciation && (
          <Text style={styles.wordPronunciation}>/{word.pronunciation}/</Text>
        )}
        {word.example && (
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.exampleText}>{`"${word.example}"`}</Text>
          </View>
        )}
        
        <View style={styles.wordFooter}>
          <View style={styles.contributorRow}>
            <Text style={styles.contributorText}>by {word.contributorName}</Text>
            {word.contributorVerified && (
              <View style={styles.verifiedIconBadge}>
                <BadgeCheck size={12} color="#63C0FF" />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.voteBtn, isVoted && styles.voteBtnActive]}
            onPress={() => handleVoteWord(word.id)}
          >
            <ThumbsUp 
              size={16} 
              color={isVoted ? Colors.success : Colors.textSecondary}
              fill={isVoted ? Colors.success : 'transparent'}
            />
            <Text style={[styles.voteText, isVoted && { color: Colors.success }]}>
              {word.votes + (isVoted ? 1 : 0)}
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  const renderLoginPrompt = () => (
    <GlassCard variant="yellow" glow style={styles.loginPromptCard}>
      <View style={styles.loginPromptContent}>
        <View style={styles.loginPromptIcon}>
          <Lock size={28} color={Colors.accent} />
        </View>
        <View style={styles.loginPromptText}>
          <Text style={styles.loginPromptTitle}>Join the Community</Text>
          <Text style={styles.loginPromptDesc}>
            Login or create an account to post and comment in the community.
          </Text>
        </View>
      </View>
      <GlassButton
        title="Login to Participate"
        variant="yellow"
        icon={<LogIn size={18} color={Colors.text} />}
        onPress={() => console.log('Action requires user')}
        fullWidth
      />
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.background]}
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
            <LinearGradient
              colors={['rgba(255, 217, 61, 0.4)', 'rgba(108, 92, 231, 0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              {activeTab === 'learn' ? (
                <GraduationCap size={26} color={Colors.text} />
              ) : (
                <Users size={26} color={Colors.text} />
              )}
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {activeTab === 'learn' ? 'Learn Zomi' : 'Community'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {activeTab === 'learn' 
                  ? 'Master the language'
                  : isAuthenticated ? `Welcome, ${user?.name}!` : 'Connect & Contribute'}
              </Text>
            </View>
            {activeTab === 'learn' && (
              <Animated.View style={[styles.streakBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Flame size={20} color="#FF6B00" />
                <Text style={styles.streakText}>{streak}</Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.mainTabsContainer}>
            <TouchableOpacity
              style={[styles.mainTab, activeTab === 'learn' && styles.mainTabActive]}
              onPress={() => setActiveTab('learn')}
            >
              <GraduationCap size={20} color={activeTab === 'learn' ? Colors.text : Colors.textSecondary} />
              <Text style={[styles.mainTabText, activeTab === 'learn' && styles.mainTabTextActive]}>
                Learn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainTab, activeTab === 'community' && styles.mainTabActive]}
              onPress={() => setActiveTab('community')}
            >
              <Users size={20} color={activeTab === 'community' ? Colors.text : Colors.textSecondary} />
              <Text style={[styles.mainTabText, activeTab === 'community' && styles.mainTabTextActive]}>
                Community
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'learn' ? (
            <>
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

              <View style={styles.lessonsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Learning Path</Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                {LEARNING_LESSONS.slice(0, 3).map((lesson, index) => (
                  <TouchableOpacity
                    key={lesson.id}
                    onPress={() => !lesson.locked && handleStartLesson(lesson.id)}
                    disabled={lesson.locked}
                    activeOpacity={0.8}
                  >
                    <GlassCard 
                      variant={lesson.completed ? 'green' : lesson.locked ? 'default' : 'cyan'}
                      glow={!lesson.locked && !lesson.completed}
                      style={[styles.lessonCard, lesson.locked && styles.lessonLocked]}
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
                          <Text style={[styles.lessonTitle, lesson.locked && styles.lessonTitleLocked]}>
                            {lesson.title}
                          </Text>
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
                      onPress={() => console.log('Quiz')}
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
                      onPress={() => console.log('Listening')}
                      style={styles.practiceButton}
                    />
                  </GlassCard>

                  <GlassCard variant="cyan" glow style={styles.practiceCard}>
                    <View style={styles.practiceIcon}>
                      <PenTool size={28} color={Colors.primary} />
                    </View>
                    <Text style={styles.practiceTitle}>Writing</Text>
                    <Text style={styles.practiceDesc}>Practice writing</Text>
                    <GlassButton
                      title="Start"
                      variant="cyan"
                      size="small"
                      onPress={() => console.log('Writing')}
                      style={styles.practiceButton}
                    />
                  </GlassCard>
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              {!isAuthenticated && renderLoginPrompt()}

              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tab, communitySubTab === 'forum' && styles.tabActive]}
                  onPress={() => setCommunitySubTab('forum')}
                >
                  <MessageCircle size={18} color={communitySubTab === 'forum' ? Colors.text : Colors.textSecondary} />
                  <Text style={[styles.tabText, communitySubTab === 'forum' && styles.tabTextActive]}>Forum</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, communitySubTab === 'contribute' && styles.tabActive]}
                  onPress={() => setCommunitySubTab('contribute')}
                >
                  <BookPlus size={18} color={communitySubTab === 'contribute' ? Colors.text : Colors.textSecondary} />
                  <Text style={[styles.tabText, communitySubTab === 'contribute' && styles.tabTextActive]}>Contribute</Text>
                </TouchableOpacity>
              </View>

              {communitySubTab === 'forum' ? (
                <>
                  <GlassCard style={styles.searchCard}>
                    <View style={styles.searchContainer}>
                      <Search size={20} color={Colors.textMuted} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search discussions..."
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                          <X size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </GlassCard>

                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.filtersScroll}
                    contentContainerStyle={styles.filtersContainer}
                  >
                    {(['question', 'discussion', 'contribution', 'feedback'] as const).map((cat) => {
                      const IconComponent = categoryIcons[cat];
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.filterChip,
                            isSelected && { backgroundColor: categoryColors[cat] + '30', borderColor: categoryColors[cat] },
                          ]}
                          onPress={() => setSelectedCategory(isSelected ? null : cat)}
                        >
                          <IconComponent size={14} color={isSelected ? categoryColors[cat] : Colors.textSecondary} />
                          <Text style={[styles.filterText, isSelected && { color: categoryColors[cat] }]}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Discussions</Text>
                    <GlassButton
                      title={isAuthenticated ? "New Post" : "Login"}
                      variant={isAuthenticated ? "purple" : "default"}
                      size="small"
                      icon={isAuthenticated ? <Plus size={14} color={Colors.text} /> : <LogIn size={14} color={Colors.text} />}
                      onPress={handleOpenNewPostModal}
                    />
                  </View>

                  <View style={styles.postsList}>
                    {filteredPosts.slice(0, 5).map((post, index) => renderPost(post, index))}
                  </View>
                </>
              ) : (
                <>
                  <GlassCard variant="green" glow elevated style={styles.contributeHero}>
                    <View style={styles.contributeHeroContent}>
                      <View style={styles.contributeIcon}>
                        <Award size={32} color={Colors.success} />
                      </View>
                      <Text style={styles.contributeTitle}>Help Grow the Community</Text>
                      <Text style={styles.contributeSubtitle}>
                        {isAuthenticated 
                          ? 'Share words, phrases, and expressions from your dialect.'
                          : 'Login to contribute words and help preserve the Zomi language.'}
                      </Text>
                      <GlassButton
                        title={isAuthenticated ? "Contribute a Word" : "Login to Contribute"}
                        variant={isAuthenticated ? "green" : "default"}
                        icon={isAuthenticated ? <Plus size={18} color={Colors.text} /> : <LogIn size={18} color={Colors.text} />}
                        onPress={handleOpenContributeModal}
                        style={styles.contributeBtn}
                      />
                    </View>
                  </GlassCard>

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Contributions</Text>
                  </View>

                  <View style={styles.wordsList}>
                    {CONTRIBUTED_WORDS.slice(0, 5).map(renderContributedWord)}
                  </View>
                </>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setShowNewPostModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {(['question', 'discussion', 'contribution', 'feedback'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categorySelectorItem,
                      newPostCategory === cat && { backgroundColor: categoryColors[cat] + '30', borderColor: categoryColors[cat] },
                    ]}
                    onPress={() => setNewPostCategory(cat)}
                  >
                    <Text style={[styles.categorySelectorText, newPostCategory === cat && { color: categoryColors[cat] }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter a descriptive title..."
                placeholderTextColor={Colors.textMuted}
                value={newPostTitle}
                onChangeText={setNewPostTitle}
              />

              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share your thoughts, questions, or contributions..."
                placeholderTextColor={Colors.textMuted}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                textAlignVertical="top"
              />

              <GlassButton
                title="Post"
                variant="purple"
                fullWidth
                icon={<Send size={18} color={Colors.text} />}
                onPress={handleSubmitPost}
                disabled={!newPostTitle.trim() || !newPostContent.trim()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showContributeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContributeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contribute Word</Text>
              <TouchableOpacity onPress={() => setShowContributeModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Zomi Word *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter the Zomi word..."
                placeholderTextColor={Colors.textMuted}
                value={newWord.zomi}
                onChangeText={(text) => setNewWord(prev => ({ ...prev, zomi: text }))}
              />

              <Text style={styles.inputLabel}>English Translation *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter the English meaning..."
                placeholderTextColor={Colors.textMuted}
                value={newWord.english}
                onChangeText={(text) => setNewWord(prev => ({ ...prev, english: text }))}
              />

              <Text style={styles.inputLabel}>Pronunciation (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Loong-dam"
                placeholderTextColor={Colors.textMuted}
                value={newWord.pronunciation}
                onChangeText={(text) => setNewWord(prev => ({ ...prev, pronunciation: text }))}
              />

              <Text style={styles.inputLabel}>Example Sentence (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Provide an example sentence using the word..."
                placeholderTextColor={Colors.textMuted}
                value={newWord.example}
                onChangeText={(text) => setNewWord(prev => ({ ...prev, example: text }))}
                multiline
                textAlignVertical="top"
              />

              <GlassButton
                title="Submit Contribution"
                variant="green"
                fullWidth
                icon={<Plus size={18} color={Colors.text} />}
                onPress={handleSubmitWord}
                disabled={!newWord.zomi.trim() || !newWord.english.trim()}
              />
            </ScrollView>
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
    marginBottom: 20,
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
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
    fontWeight: '700',
    color: Colors.text,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  mainTabActive: {
    backgroundColor: Colors.glassPurple,
    borderColor: Colors.glassPurpleBorder,
  },
  mainTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mainTabTextActive: {
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
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
    fontWeight: '700',
    color: Colors.text,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  lessonTitleLocked: {
    color: Colors.textMuted,
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
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  practiceDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  practiceButton: {
    width: '100%',
  },
  loginPromptCard: {
    marginBottom: 20,
    padding: 20,
  },
  loginPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  loginPromptIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  loginPromptDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tabActive: {
    backgroundColor: Colors.glassPurple,
    borderColor: Colors.glassPurpleBorder,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
  },
  searchCard: {
    marginBottom: 12,
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  filtersScroll: {
    marginBottom: 20,
  },
  filtersContainer: {
    gap: 10,
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  postsList: {
    gap: 12,
  },
  postCard: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  postHeaderText: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  verifiedIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(29, 155, 240, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  postDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  actionBtnActive: {
    backgroundColor: Colors.glassPink,
  },
  actionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  contributeHero: {
    marginBottom: 24,
    padding: 24,
  },
  contributeHeroContent: {
    alignItems: 'center',
  },
  contributeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contributeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  contributeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  contributeBtn: {
    minWidth: 200,
  },
  wordsList: {
    gap: 12,
    marginBottom: 24,
  },
  wordCard: {
    padding: 16,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  wordTitles: {},
  wordZomi: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  wordEnglish: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  wordPronunciation: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  exampleBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  exampleLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  wordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributorText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  voteBtnActive: {
    backgroundColor: Colors.glassGreen,
  },
  voteText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
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
    maxHeight: '85%',
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
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categorySelectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  categorySelectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
