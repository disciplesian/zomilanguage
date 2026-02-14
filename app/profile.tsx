import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Platform,
  Animated,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Edit3,
  Trophy,
  Star,
  Flame,
  Target,
  Award,
  Crown,
  Medal,
  Users,
  UserPlus,
  ChevronRight,
  X,
  Check,
  Lock,
  Globe,
  Eye,
  Zap,
  BookOpen,
  MessageSquare,
  Brain,
  Headphones,
  MapPin,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import GlassCard from '@/components/GlassCard';
import Colors from '@/constants/colors';
import { useUserProfile, UserBadge } from '@/contexts/UserProfileContext';

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'rgba(205, 127, 50, 0.2)', border: 'rgba(205, 127, 50, 0.5)', text: '#CD7F32' },
  silver: { bg: 'rgba(192, 192, 192, 0.2)', border: 'rgba(192, 192, 192, 0.5)', text: '#C0C0C0' },
  gold: { bg: 'rgba(255, 215, 0, 0.2)', border: 'rgba(255, 215, 0, 0.5)', text: '#FFD700' },
  platinum: { bg: 'rgba(229, 228, 226, 0.2)', border: 'rgba(229, 228, 226, 0.5)', text: '#E5E4E2' },
  diamond: { bg: 'rgba(185, 242, 255, 0.2)', border: 'rgba(185, 242, 255, 0.5)', text: '#B9F2FF' },
};

const BADGE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  star: Star,
  crown: Crown,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  flame: Flame,
  brain: Brain,
  users: Users,
  'book-open': BookOpen,
  'message-square': MessageSquare,
  'graduation-cap': Award,
  globe: Globe,
};

export default function ProfileScreen() {
  const { 
    localUser,
    stats, 
    activities, 
    friends, 
    friendRequests, 
    leaderboard, 
    unlockedBadges,
    xpProgress,
    xpForNextLevel,
    rank,
    updateLocalUser,
  } = useUserProfile();

  const [activeTab, setActiveTab] = useState<'stats' | 'badges' | 'leaderboard' | 'friends'>('stats');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(localUser?.name || '');
  const [editBio, setEditBio] = useState(localUser?.bio || '');
  const [editLocation, setEditLocation] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showStats, setShowStats] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (localUser) {
      setEditName(localUser.name || '');
      setEditBio(localUser.bio || '');
    }
  }, [localUser]);

  const handlePickImage = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await updateLocalUser({ avatar: result.assets[0].uri });
    }
  }, [updateLocalUser]);

  const handleSaveProfile = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    await updateLocalUser({ name: editName, bio: editBio });
    setShowEditModal(false);
    Alert.alert('Success', 'Profile updated successfully!');
  }, [editName, editBio, updateLocalUser]);

  const getUnlockedBadgesCount = () => unlockedBadges.filter(b => b.unlockedAt).length;

  const renderBadgeIcon = (badge: UserBadge) => {
    const IconComponent = BADGE_ICONS[badge.icon] || Award;
    const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
    return <IconComponent size={24} color={badge.unlockedAt ? tierColor.text : Colors.textMuted} />;
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
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {localUser?.avatar ? (
                <Image source={{ uri: localUser.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[Colors.glassCyan, Colors.glassPurple]}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarInitial}>
                    {localUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.cameraIcon}>
                <Camera size={14} color={Colors.text} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{localUser?.name || 'Zomi Learner'}</Text>
                <TouchableOpacity onPress={() => setShowEditModal(true)}>
                  <Edit3 size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userBio}>{localUser?.bio || 'Learning Zomi language'}</Text>
              
              <View style={styles.levelBadge}>
                <Zap size={14} color={Colors.accent} />
                <Text style={styles.levelText}>Level {stats.level}</Text>
                <Text style={styles.xpText}>{stats.xp} XP</Text>
              </View>
            </View>
          </View>

          <GlassCard variant="yellow" glow style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Level Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(xpProgress)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.progressSubtext}>
              {xpForNextLevel - stats.xp} XP to Level {stats.level + 1}
            </Text>
          </GlassCard>

          <View style={styles.quickStats}>
            <GlassCard style={styles.quickStatCard}>
              <Trophy size={24} color={Colors.accent} />
              <Text style={styles.quickStatValue}>{stats.points}</Text>
              <Text style={styles.quickStatLabel}>Points</Text>
            </GlassCard>
            
            <GlassCard style={styles.quickStatCard}>
              <Flame size={24} color="#FF6B00" />
              <Text style={styles.quickStatValue}>{stats.streak}</Text>
              <Text style={styles.quickStatLabel}>Day Streak</Text>
            </GlassCard>
            
            <GlassCard style={styles.quickStatCard}>
              <Medal size={24} color={Colors.tertiary} />
              <Text style={styles.quickStatValue}>#{rank || '-'}</Text>
              <Text style={styles.quickStatLabel}>Rank</Text>
            </GlassCard>
          </View>

          <View style={styles.tabContainer}>
            {(['stats', 'badges', 'leaderboard', 'friends'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => {
                  setActiveTab(tab);
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'stats' && (
            <View style={styles.tabContent}>
              <GlassCard style={styles.statsCard}>
                <Text style={styles.statsSectionTitle}>Learning Statistics</Text>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statsItem}>
                    <Globe size={20} color={Colors.primary} />
                    <Text style={styles.statsValue}>{stats.translationsCount}</Text>
                    <Text style={styles.statsLabel}>Translations</Text>
                  </View>
                  
                  <View style={styles.statsItem}>
                    <BookOpen size={20} color={Colors.success} />
                    <Text style={styles.statsValue}>{stats.dictionaryContributions}</Text>
                    <Text style={styles.statsLabel}>Contributions</Text>
                  </View>
                  
                  <View style={styles.statsItem}>
                    <Brain size={20} color={Colors.tertiary} />
                    <Text style={styles.statsValue}>{stats.quizzesTaken}</Text>
                    <Text style={styles.statsLabel}>Quizzes</Text>
                  </View>
                  
                  <View style={styles.statsItem}>
                    <Headphones size={20} color={Colors.secondary} />
                    <Text style={styles.statsValue}>{stats.listeningExercises}</Text>
                    <Text style={styles.statsLabel}>Listening</Text>
                  </View>
                  
                  <View style={styles.statsItem}>
                    <Target size={20} color={Colors.accent} />
                    <Text style={styles.statsValue}>{stats.lessonsCompleted}</Text>
                    <Text style={styles.statsLabel}>Lessons</Text>
                  </View>
                  
                  <View style={styles.statsItem}>
                    <MessageSquare size={20} color={Colors.primary} />
                    <Text style={styles.statsValue}>{stats.forumPosts}</Text>
                    <Text style={styles.statsLabel}>Forum Posts</Text>
                  </View>
                </View>
              </GlassCard>

              <GlassCard style={styles.activityCard}>
                <Text style={styles.statsSectionTitle}>Recent Activity</Text>
                {activities.slice(0, 5).map((activity, index) => (
                  <View key={activity.id} style={[styles.activityItem, index > 0 && styles.activityBorder]}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDesc}>{activity.description}</Text>
                    </View>
                    <View style={styles.activityPoints}>
                      <Text style={styles.activityPointsText}>+{activity.points}</Text>
                    </View>
                  </View>
                ))}
                {activities.length === 0 && (
                  <Text style={styles.emptyText}>No recent activity yet</Text>
                )}
              </GlassCard>
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={styles.tabContent}>
              <View style={styles.badgesSummary}>
                <Text style={styles.badgesSummaryText}>
                  {getUnlockedBadgesCount()} / {unlockedBadges.length} Badges Unlocked
                </Text>
              </View>
              
              <View style={styles.badgesGrid}>
                {unlockedBadges.map((badge) => {
                  const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
                  const isUnlocked = !!badge.unlockedAt;
                  
                  return (
                    <GlassCard
                      key={badge.id}
                      style={[
                        styles.badgeCard,
                        { borderColor: isUnlocked ? tierColor.border : Colors.glassBorder },
                      ]}
                    >
                      <View style={[
                        styles.badgeIconContainer,
                        { backgroundColor: isUnlocked ? tierColor.bg : Colors.surface },
                      ]}>
                        {isUnlocked ? renderBadgeIcon(badge) : <Lock size={24} color={Colors.textMuted} />}
                      </View>
                      <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]}>
                        {badge.name}
                      </Text>
                      <Text style={styles.badgeDesc} numberOfLines={2}>
                        {badge.description}
                      </Text>
                      {!isUnlocked && badge.maxProgress && (
                        <View style={styles.badgeProgress}>
                          <View style={styles.badgeProgressBar}>
                            <View
                              style={[
                                styles.badgeProgressFill,
                                { width: `${((badge.progress || 0) / badge.maxProgress) * 100}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.badgeProgressText}>
                            {badge.progress || 0}/{badge.maxProgress}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.tierBadge, { backgroundColor: tierColor.bg }]}>
                        <Text style={[styles.tierText, { color: tierColor.text }]}>
                          {badge.tier.toUpperCase()}
                        </Text>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            </View>
          )}

          {activeTab === 'leaderboard' && (
            <View style={styles.tabContent}>
              <GlassCard style={styles.leaderboardCard}>
                {leaderboard.slice(0, 20).map((entry, index) => {
                  const isCurrentUser = entry.userId === localUser?.id;
                  
                  return (
                    <View
                      key={entry.userId}
                      style={[
                        styles.leaderboardItem,
                        isCurrentUser && styles.leaderboardItemHighlight,
                        index > 0 && styles.leaderboardBorder,
                      ]}
                    >
                      <View style={styles.leaderboardRank}>
                        {index < 3 ? (
                          <View style={[styles.rankMedal, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                            <Text style={styles.rankMedalText}>{index + 1}</Text>
                          </View>
                        ) : (
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        )}
                      </View>
                      
                      <View style={styles.leaderboardAvatar}>
                        {entry.avatar ? (
                          <Image source={{ uri: entry.avatar }} style={styles.leaderboardAvatarImg} />
                        ) : (
                          <View style={styles.leaderboardAvatarPlaceholder}>
                            <Text style={styles.leaderboardAvatarText}>
                              {entry.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.leaderboardInfo}>
                        <Text style={[styles.leaderboardName, isCurrentUser && styles.leaderboardNameHighlight]}>
                          {entry.name} {isCurrentUser && '(You)'}
                        </Text>
                        <Text style={styles.leaderboardLevel}>Level {entry.level}</Text>
                      </View>
                      
                      <View style={styles.leaderboardPoints}>
                        <Zap size={14} color={Colors.accent} />
                        <Text style={styles.leaderboardPointsText}>{entry.points}</Text>
                      </View>
                    </View>
                  );
                })}
                
                {leaderboard.length === 0 && (
                  <View style={styles.emptyLeaderboard}>
                    <Trophy size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>No rankings yet</Text>
                    <Text style={styles.emptySubtext}>Start learning to appear on the leaderboard!</Text>
                  </View>
                )}
              </GlassCard>
            </View>
          )}

          {activeTab === 'friends' && (
            <View style={styles.tabContent}>
              {friendRequests.length > 0 && (
                <GlassCard variant="yellow" style={styles.requestsCard}>
                  <Text style={styles.requestsTitle}>Friend Requests ({friendRequests.length})</Text>
                  {friendRequests.map((request) => (
                    <View key={request.id} style={styles.requestItem}>
                      <View style={styles.requestAvatar}>
                        <Text style={styles.requestAvatarText}>
                          {request.fromUserName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.requestName}>{request.fromUserName}</Text>
                      <View style={styles.requestActions}>
                        <TouchableOpacity style={styles.acceptBtn}>
                          <Check size={18} color={Colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.declineBtn}>
                          <X size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </GlassCard>
              )}

              <GlassCard style={styles.friendsCard}>
                <View style={styles.friendsHeader}>
                  <Text style={styles.friendsTitle}>Friends ({friends.length})</Text>
                  <TouchableOpacity style={styles.addFriendBtn}>
                    <UserPlus size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                
                {friends.map((friend) => (
                  <View key={friend.id} style={styles.friendItem}>
                    <View style={styles.friendAvatar}>
                      {friend.avatar ? (
                        <Image source={{ uri: friend.avatar }} style={styles.friendAvatarImg} />
                      ) : (
                        <Text style={styles.friendAvatarText}>
                          {friend.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendLevel}>Level {friend.level}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.textMuted} />
                  </View>
                ))}
                
                {friends.length === 0 && (
                  <View style={styles.emptyFriends}>
                    <Users size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>No friends yet</Text>
                    <Text style={styles.emptySubtext}>Connect with other Zomi learners!</Text>
                  </View>
                )}
              </GlassCard>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
            
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Check size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.bioInput]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputWithIcon}>
                  <MapPin size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.textInputWithIcon}
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="Your location"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>Privacy Settings</Text>
                
                <View style={styles.privacyItem}>
                  <View style={styles.privacyInfo}>
                    <Globe size={20} color={Colors.primary} />
                    <View style={styles.privacyText}>
                      <Text style={styles.privacyLabel}>Public Profile</Text>
                      <Text style={styles.privacyDesc}>Others can view your profile</Text>
                    </View>
                  </View>
                  <Switch
                    value={isPublicProfile}
                    onValueChange={setIsPublicProfile}
                    trackColor={{ false: Colors.surface, true: Colors.primary }}
                    thumbColor={Colors.text}
                  />
                </View>

                <View style={styles.privacyItem}>
                  <View style={styles.privacyInfo}>
                    <Eye size={20} color={Colors.success} />
                    <View style={styles.privacyText}>
                      <Text style={styles.privacyLabel}>Show Statistics</Text>
                      <Text style={styles.privacyDesc}>Display your learning stats</Text>
                    </View>
                  </View>
                  <Switch
                    value={showStats}
                    onValueChange={setShowStats}
                    trackColor={{ false: Colors.surface, true: Colors.success }}
                    thumbColor={Colors.text}
                  />
                </View>
              </View>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  orbYellow: {
    backgroundColor: Colors.accent,
    top: -100,
    right: -80,
  },
  orbPurple: {
    backgroundColor: Colors.tertiary,
    bottom: 100,
    left: -100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.select({ web: 24, default: 20 }),
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: 'center' as const,
    width: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  userBio: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassYellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  xpText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  progressCard: {
    marginBottom: 16,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    gap: 6,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.glassCyan,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.text,
  },
  tabContent: {
    gap: 16,
  },
  statsCard: {
    padding: 16,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center' as const,
  },
  statsItem: {
    minWidth: 100,
    flex: 1,
    maxWidth: 150,
    alignItems: 'center',
    gap: 6,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statsLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  activityCard: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityPoints: {
    backgroundColor: Colors.glassGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activityPointsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  badgesSummary: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgesSummaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center' as const,
  },
  badgeCard: {
    minWidth: 160,
    maxWidth: 200,
    flex: 1,
    flexBasis: '45%',
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: Colors.textMuted,
  },
  badgeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  badgeProgress: {
    width: '100%',
    marginBottom: 8,
  },
  badgeProgressBar: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  badgeProgressText: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  leaderboardCard: {
    padding: 0,
    overflow: 'hidden',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  leaderboardItemHighlight: {
    backgroundColor: Colors.glassCyan,
  },
  leaderboardBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  leaderboardRank: {
    width: 30,
    alignItems: 'center',
  },
  rankMedal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedalText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
  },
  leaderboardAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  leaderboardAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  leaderboardNameHighlight: {
    color: Colors.primary,
  },
  leaderboardLevel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  leaderboardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardPointsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    padding: 40,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  requestsCard: {
    padding: 16,
    marginBottom: 16,
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  requestName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glassGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glassPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsCard: {
    padding: 16,
  },
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  addFriendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    gap: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glassPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  friendLevel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 30,
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
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top' as const,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 10,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  privacySection: {
    marginTop: 10,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  privacyText: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  privacyDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
