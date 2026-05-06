import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const USER_STATS_KEY = '@zomi_user_stats';
const USER_ACTIVITIES_KEY = '@zomi_user_activities';
const LOCAL_USER_KEY = '@zomi_local_user';

const MAX_ACTIVITIES = 50;

function safeJSONParse<T>(data: string | null | undefined, fallback: T): T {
  try {
    if (!data || typeof data !== 'string') return fallback;
    const parsed = JSON.parse(data);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

let asyncStorageModule: typeof import('@react-native-async-storage/async-storage').default | null = null;

const getAsyncStorage = async () => {
  if (asyncStorageModule) return asyncStorageModule;
  try {
    const module = await import('@react-native-async-storage/async-storage');
    asyncStorageModule = module.default;
    return asyncStorageModule;
  } catch {
    return null;
  }
};

const safeStorageGet = async (key: string): Promise<string | null> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return null;
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = async (key: string, value: string): Promise<boolean> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return false;
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export interface LocalUser {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  points: number;
  xp: number;
  level: number;
  translationsCount: number;

  forumPosts: number;
  forumReplies: number;
  quizzesTaken: number;
  quizzesCorrect: number;
  listeningExercises: number;
  lessonsCompleted: number;
  streak: number;
  longestStreak: number;
  lastActivityDate: string;
  joinedAt: string;
}

export interface UserActivity {
  id: string;
  type: 'translation' | 'contribution' | 'forum_post' | 'forum_reply' | 'quiz' | 'listening' | 'lesson' | 'badge_earned';
  title: string;
  description: string;
  points: number;
  xp: number;
  timestamp: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Friend {
  id: string;
  visibleUserId: string;
  name: string;
  avatar?: string;
  level: number;
  points: number;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  isPublic: boolean;
  showStats: boolean;
  badges: UserBadge[];
  featuredBadge?: string;
}

export const BADGE_DEFINITIONS: Omit<UserBadge, 'unlockedAt' | 'progress'>[] = [
  { id: 'first_translation', name: 'First Steps', description: 'Complete your first translation', icon: 'star', tier: 'bronze', maxProgress: 1 },
  { id: 'translator_10', name: 'Translator', description: 'Complete 10 translations', icon: 'languages', tier: 'bronze', maxProgress: 10 },
  { id: 'translator_50', name: 'Language Explorer', description: 'Complete 50 translations', icon: 'globe', tier: 'silver', maxProgress: 50 },
  { id: 'translator_100', name: 'Translation Master', description: 'Complete 100 translations', icon: 'award', tier: 'gold', maxProgress: 100 },
  { id: 'contributor_1', name: 'Word Contributor', description: 'Contribute your first word', icon: 'book-plus', tier: 'bronze', maxProgress: 1 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', tier: 'bronze', maxProgress: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: 'fire', tier: 'silver', maxProgress: 30 },
];

const getDefaultStats = (): UserStats => ({
  points: 0,
  xp: 0,
  level: 1,
  translationsCount: 0,

  forumPosts: 0,
  forumReplies: 0,
  quizzesTaken: 0,
  quizzesCorrect: 0,
  listeningExercises: 0,
  lessonsCompleted: 0,
  streak: 0,
  longestStreak: 0,
  lastActivityDate: new Date().toISOString(),
  joinedAt: new Date().toISOString(),
});

const getDefaultLocalUser = (): LocalUser => ({
  id: 'local_user_' + Date.now().toString(36),
  name: 'Zomi Learner',
  bio: 'Learning Zomi language',
});

const getDefaultProfile = (localUser: LocalUser): UserProfile => ({
  userId: localUser.id,
  name: localUser.name,
  avatar: localUser.avatar,
  bio: localUser.bio,
  isPublic: true,
  showStats: true,
  badges: [],
});

const calculateLevel = (xp: number): number => {
  const levels = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) return i + 1;
  }
  return 1;
};

const calculateXPForNextLevel = (level: number): number => {
  const levels = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
  if (level >= levels.length) return levels[levels.length - 1];
  return levels[level];
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [localUser, setLocalUser] = useState<LocalUser>(getDefaultLocalUser());
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends] = useState<Friend[]>([]);
  const [friendRequests] = useState<FriendRequest[]>([]);
  const [leaderboard] = useState<{ userId: string; name: string; avatar?: string; points: number; level: number; }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const loadData = async () => {
      try {
        const storedUserData = await safeStorageGet(LOCAL_USER_KEY);
        const currentUser = storedUserData 
          ? safeJSONParse<LocalUser>(storedUserData, getDefaultLocalUser())
          : getDefaultLocalUser();
        
        if (!mountedRef.current) return;
        setLocalUser(currentUser);

        const statsData = await safeStorageGet(USER_STATS_KEY + '_' + currentUser.id);
        if (mountedRef.current) {
          if (statsData) {
            const parsed = safeJSONParse<Partial<UserStats>>(statsData, {});
            setStats({ ...getDefaultStats(), ...parsed });
          }
          setProfile(getDefaultProfile(currentUser));
          setIsLoading(false);
        }

        const activitiesData = await safeStorageGet(USER_ACTIVITIES_KEY + '_' + currentUser.id);
        if (mountedRef.current && activitiesData) {
          const parsed = safeJSONParse<UserActivity[]>(activitiesData, []);
          setActivities(Array.isArray(parsed) ? parsed.slice(0, MAX_ACTIVITIES) : []);
        }
      } catch {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveStats = useCallback(async (newStats: UserStats) => {
    setStats(newStats);
    await safeStorageSet(USER_STATS_KEY + '_' + localUser.id, JSON.stringify(newStats));
  }, [localUser.id]);

  const addActivity = useCallback(async (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    const newActivity: UserActivity = {
      ...activity,
      id: 'activity_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    
    const newActivities = [newActivity, ...activities].slice(0, MAX_ACTIVITIES);
    setActivities(newActivities);
    await safeStorageSet(USER_ACTIVITIES_KEY + '_' + localUser.id, JSON.stringify(newActivities));
    
    const today = new Date().toDateString();
    const lastActivity = new Date(stats.lastActivityDate).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let newStreak = stats.streak;
    if (lastActivity !== today) {
      newStreak = lastActivity === yesterday ? stats.streak + 1 : 1;
    }
    
    const newXP = stats.xp + activity.xp;
    const newLevel = calculateLevel(newXP);
    
    const newStats: UserStats = {
      ...stats,
      points: stats.points + activity.points,
      xp: newXP,
      level: newLevel,
      streak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastActivityDate: new Date().toISOString(),
    };
    
    await saveStats(newStats);
  }, [localUser.id, activities, stats, saveStats]);

  const recordTranslation = useCallback(async () => {
    const newStats = { ...stats, translationsCount: stats.translationsCount + 1 };
    await saveStats(newStats);
    await addActivity({
      type: 'translation',
      title: 'Translation Completed',
      description: 'You completed a translation',
      points: 5,
      xp: 10,
    });
  }, [stats, saveStats, addActivity]);

  const recordContribution = useCallback(async (wordZomi: string, wordEnglish: string) => {
    await addActivity({
      type: 'contribution',
      title: 'Community Contribution',
      description: 'Contributed "' + wordZomi + '" (' + wordEnglish + ')',
      points: 25,
      xp: 50,
    });
  }, [stats, saveStats, addActivity]);

  const recordForumPost = useCallback(async (title: string) => {
    const newStats = { ...stats, forumPosts: stats.forumPosts + 1 };
    await saveStats(newStats);
    await addActivity({
      type: 'forum_post',
      title: 'Forum Post Created',
      description: title,
      points: 10,
      xp: 20,
    });
  }, [stats, saveStats, addActivity]);

  const recordForumReply = useCallback(async () => {
    const newStats = { ...stats, forumReplies: stats.forumReplies + 1 };
    await saveStats(newStats);
    await addActivity({
      type: 'forum_reply',
      title: 'Forum Reply',
      description: 'You replied to a discussion',
      points: 5,
      xp: 10,
    });
  }, [stats, saveStats, addActivity]);

  const recordQuiz = useCallback(async (score: number, total: number) => {
    const isPerfect = score === total;
    const newStats = {
      ...stats,
      quizzesTaken: stats.quizzesTaken + 1,
      quizzesCorrect: stats.quizzesCorrect + score,
    };
    await saveStats(newStats);
    await addActivity({
      type: 'quiz',
      title: 'Quiz Completed',
      description: 'Scored ' + score + '/' + total + (isPerfect ? ' - Perfect!' : ''),
      points: score * 10 + (isPerfect ? 50 : 0),
      xp: score * 15 + (isPerfect ? 100 : 0),
    });
  }, [stats, saveStats, addActivity]);

  const recordListening = useCallback(async (score: number, total: number) => {
    const newStats = { ...stats, listeningExercises: stats.listeningExercises + 1 };
    await saveStats(newStats);
    await addActivity({
      type: 'listening',
      title: 'Listening Exercise Completed',
      description: 'Scored ' + score + '/' + total,
      points: score * 10,
      xp: score * 15,
    });
  }, [stats, saveStats, addActivity]);

  const recordLesson = useCallback(async (lessonTitle: string) => {
    const newStats = { ...stats, lessonsCompleted: stats.lessonsCompleted + 1 };
    await saveStats(newStats);
    await addActivity({
      type: 'lesson',
      title: 'Lesson Completed',
      description: lessonTitle,
      points: 25,
      xp: 50,
    });
  }, [stats, saveStats, addActivity]);

  const updateLocalUser = useCallback(async (updates: Partial<Pick<LocalUser, 'name' | 'bio' | 'avatar'>>) => {
    const updatedUser = { ...localUser, ...updates };
    setLocalUser(updatedUser);
    await safeStorageSet(LOCAL_USER_KEY, JSON.stringify(updatedUser));
    if (profile) setProfile({ ...profile, ...updates });
    return { success: true };
  }, [localUser, profile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return { success: false, error: 'No profile loaded' };
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    if (updates.name || updates.bio || updates.avatar) {
      await updateLocalUser({ name: updates.name, bio: updates.bio, avatar: updates.avatar });
    }
    return { success: true };
  }, [profile, updateLocalUser]);

  const resetAllData = useCallback(async () => {
    try {
      const AsyncStorage = await getAsyncStorage();
      if (AsyncStorage) {
        const keys = await AsyncStorage.getAllKeys();
        const zomiKeys = keys.filter(k => k.startsWith('@zomi_'));
        if (zomiKeys.length > 0) await AsyncStorage.multiRemove(zomiKeys);
      }
      const fresh = getDefaultLocalUser();
      setLocalUser(fresh);
      setStats(getDefaultStats());
      setActivities([]);
      setProfile(getDefaultProfile(fresh));
      await safeStorageSet(LOCAL_USER_KEY, JSON.stringify(fresh));
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const sendFriendRequest = useCallback(async () => ({ success: true }), []);
  const respondToFriendRequest = useCallback(async () => ({ success: true }), []);
  const removeFriend = useCallback(async () => ({ success: true }), []);

  const unlockedBadges = useMemo(() => {
    return BADGE_DEFINITIONS.map(def => {
      let progress = 0;
      let unlocked = false;
      
      if (def.id === 'first_translation') {
        progress = Math.min(stats.translationsCount, 1);
        unlocked = stats.translationsCount >= 1;
      } else if (def.id === 'translator_10') {
        progress = Math.min(stats.translationsCount, 10);
        unlocked = stats.translationsCount >= 10;
      } else if (def.id === 'translator_50') {
        progress = Math.min(stats.translationsCount, 50);
        unlocked = stats.translationsCount >= 50;
      } else if (def.id === 'translator_100') {
        progress = Math.min(stats.translationsCount, 100);
        unlocked = stats.translationsCount >= 100;
      } else if (def.id === 'contributor_1') {
        progress = 0;
        unlocked = false;
      } else if (def.id === 'streak_7') {
        progress = Math.min(stats.longestStreak, 7);
        unlocked = stats.longestStreak >= 7;
      } else if (def.id === 'streak_30') {
        progress = Math.min(stats.longestStreak, 30);
        unlocked = stats.longestStreak >= 30;
      }
      
      return { ...def, progress, unlockedAt: unlocked ? stats.joinedAt : undefined };
    });
  }, [stats]);

  const xpForNextLevel = useMemo(() => calculateXPForNextLevel(stats.level), [stats.level]);
  const xpProgress = useMemo(() => {
    const currentLevelXP = calculateXPForNextLevel(stats.level - 1);
    const nextLevelXP = calculateXPForNextLevel(stats.level);
    const progress = ((stats.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [stats.xp, stats.level]);

  const rank = useMemo(() => {
    const index = leaderboard.findIndex(l => l.userId === localUser.id);
    return index >= 0 ? index + 1 : 0;
  }, [localUser.id, leaderboard]);

  return {
    localUser,
    stats,
    activities,
    profile,
    friends,
    friendRequests,
    leaderboard,
    unlockedBadges,
    xpForNextLevel,
    xpProgress,
    rank,
    isLoading,
    updateLocalUser,
    recordTranslation,
    recordContribution,
    recordForumPost,
    recordForumReply,
    recordQuiz,
    recordListening,
    recordLesson,
    updateProfile,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    resetAllData,
  };
});
