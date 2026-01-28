import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const USER_STATS_KEY = '@zomi_user_stats';
const USER_ACTIVITIES_KEY = '@zomi_user_activities';
const USER_FRIENDS_KEY = '@zomi_user_friends';
const LEADERBOARD_KEY = '@zomi_leaderboard';
const LOCAL_USER_KEY = '@zomi_local_user';

const MAX_STORAGE_SIZE = 200000;
const MAX_ACTIVITIES = 50;
const STORAGE_TIMEOUT = 3000;

function safeJSONParse<T>(data: string | null | undefined, fallback: T): T {
  if (!data || typeof data !== 'string' || data.length === 0) {
    return fallback;
  }
  if (data.length > MAX_STORAGE_SIZE) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(data);
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

let asyncStorageModule: typeof import('@react-native-async-storage/async-storage').default | null = null;
let asyncStorageLoadAttempts = 0;
const MAX_STORAGE_LOAD_ATTEMPTS = 2;

const getAsyncStorage = async () => {
  if (asyncStorageModule) return asyncStorageModule;
  if (asyncStorageLoadAttempts >= MAX_STORAGE_LOAD_ATTEMPTS) return null;
  
  asyncStorageLoadAttempts++;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), STORAGE_TIMEOUT);
    });
    
    const loadPromise = (async () => {
      const module = await import('@react-native-async-storage/async-storage');
      return module.default;
    })();
    
    const result = await Promise.race([loadPromise, timeoutPromise]);
    if (result) {
      asyncStorageModule = result;
    }
    return asyncStorageModule;
  } catch (error) {
    console.warn('UserProfileContext: Failed to load AsyncStorage:', error);
    return null;
  }
};

const safeStorageGet = async (key: string): Promise<string | null> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return null;
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), STORAGE_TIMEOUT);
    });
    
    const getPromise = AsyncStorage.getItem(key);
    return await Promise.race([getPromise, timeoutPromise]);
  } catch (error) {
    console.warn('UserProfileContext: Storage get failed for', key, error);
    return null;
  }
};

const safeStorageSet = async (key: string, value: string): Promise<boolean> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return false;
    
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), STORAGE_TIMEOUT);
    });
    
    const setPromise = (async () => {
      await AsyncStorage.setItem(key, value);
      return true;
    })();
    
    return await Promise.race([setPromise, timeoutPromise]);
  } catch (error) {
    console.warn('UserProfileContext: Storage set failed for', key, error);
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
  dictionaryContributions: number;
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
  { id: 'translator_500', name: 'Zomi Language Ambassador', description: 'Complete 500 translations', icon: 'crown', tier: 'platinum', maxProgress: 500 },
  { id: 'contributor_1', name: 'Word Contributor', description: 'Contribute your first word to the dictionary', icon: 'book-plus', tier: 'bronze', maxProgress: 1 },
  { id: 'contributor_10', name: 'Dictionary Builder', description: 'Contribute 10 words to the dictionary', icon: 'library', tier: 'silver', maxProgress: 10 },
  { id: 'contributor_50', name: 'Lexicon Expert', description: 'Contribute 50 words to the dictionary', icon: 'book-open-check', tier: 'gold', maxProgress: 50 },
  { id: 'contributor_100', name: 'Zomi Dictionary Legend', description: 'Contribute 100 words to the dictionary', icon: 'trophy', tier: 'platinum', maxProgress: 100 },
  { id: 'forum_first', name: 'Community Member', description: 'Create your first forum post', icon: 'message-square', tier: 'bronze', maxProgress: 1 },
  { id: 'forum_10', name: 'Active Discusser', description: 'Create 10 forum posts', icon: 'messages-square', tier: 'silver', maxProgress: 10 },
  { id: 'forum_50', name: 'Zomi Community Ambassador', description: 'Create 50 forum posts', icon: 'users', tier: 'gold', maxProgress: 50 },
  { id: 'helpful_10', name: 'Helpful Member', description: 'Reply to 10 forum posts', icon: 'hand-helping', tier: 'bronze', maxProgress: 10 },
  { id: 'helpful_50', name: 'Community Pillar', description: 'Reply to 50 forum posts', icon: 'heart-handshake', tier: 'silver', maxProgress: 50 },
  { id: 'quiz_first', name: 'Quiz Taker', description: 'Complete your first quiz', icon: 'brain', tier: 'bronze', maxProgress: 1 },
  { id: 'quiz_10', name: 'Knowledge Seeker', description: 'Complete 10 quizzes', icon: 'graduation-cap', tier: 'silver', maxProgress: 10 },
  { id: 'quiz_perfect', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: 'check-circle', tier: 'gold', maxProgress: 1 },
  { id: 'lesson_5', name: 'Dedicated Learner', description: 'Complete 5 lessons', icon: 'book', tier: 'silver', maxProgress: 5 },
  { id: 'lesson_all', name: 'Zomi Scholar', description: 'Complete all available lessons', icon: 'school', tier: 'platinum', maxProgress: 6 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', tier: 'bronze', maxProgress: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: 'fire', tier: 'silver', maxProgress: 30 },
  { id: 'streak_100', name: 'Zomi Language Legend', description: 'Maintain a 100-day streak', icon: 'sparkles', tier: 'diamond', maxProgress: 100 },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined during the early days', icon: 'rocket', tier: 'gold', maxProgress: 1 },
  { id: 'verified_expert', name: 'Verified Expert', description: 'Recognized as a Zomi language expert', icon: 'badge-check', tier: 'diamond', maxProgress: 1 },
  { id: 'top_contributor', name: 'Top Contributor', description: 'Ranked in top 10 contributors', icon: 'medal', tier: 'platinum', maxProgress: 1 },
];

const getDefaultStats = (): UserStats => ({
  points: 0,
  xp: 0,
  level: 1,
  translationsCount: 0,
  dictionaryContributions: 0,
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
  const levels = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) return i + 1;
  }
  return 1;
};

const calculateXPForNextLevel = (level: number): number => {
  const levels = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000];
  if (level >= levels.length) return levels[levels.length - 1];
  return levels[level];
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [localUser, setLocalUser] = useState<LocalUser>(getDefaultLocalUser());
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ userId: string; name: string; avatar?: string; points: number; level: number; }[]>([]);
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
        let currentUser: LocalUser;
        
        try {
          const storedUserData = await safeStorageGet(LOCAL_USER_KEY);
          if (storedUserData) {
            currentUser = safeJSONParse<LocalUser>(storedUserData, getDefaultLocalUser());
          } else {
            currentUser = getDefaultLocalUser();
            safeStorageSet(LOCAL_USER_KEY, JSON.stringify(currentUser)).catch(() => {});
          }
        } catch {
          currentUser = getDefaultLocalUser();
        }
        
        if (!mountedRef.current) return;
        setLocalUser(currentUser);

        try {
          const statsData = await safeStorageGet(`${USER_STATS_KEY}_${currentUser.id}`);
          
          if (!mountedRef.current) return;

          if (statsData) {
            const parsed = safeJSONParse<Partial<UserStats>>(statsData, {});
            setStats({ ...getDefaultStats(), ...parsed });
          } else {
            const newStats = { ...getDefaultStats(), joinedAt: new Date().toISOString() };
            setStats(newStats);
            safeStorageSet(`${USER_STATS_KEY}_${currentUser.id}`, JSON.stringify(newStats)).catch(() => {});
          }
        } catch {
          if (mountedRef.current) {
            setStats(getDefaultStats());
          }
        }

        if (mountedRef.current) {
          setProfile(getDefaultProfile(currentUser));
          setIsLoading(false);
        }

        setTimeout(async () => {
          if (!mountedRef.current) return;
          
          try {
            const [activitiesData, friendsData, leaderboardData] = await Promise.all([
              safeStorageGet(`${USER_ACTIVITIES_KEY}_${currentUser.id}`).catch(() => null),
              safeStorageGet(`${USER_FRIENDS_KEY}_${currentUser.id}`).catch(() => null),
              safeStorageGet(LEADERBOARD_KEY).catch(() => null),
            ]);

            if (!mountedRef.current) return;

            if (activitiesData) {
              const parsed = safeJSONParse<UserActivity[]>(activitiesData, []);
              setActivities(Array.isArray(parsed) ? parsed.slice(0, MAX_ACTIVITIES) : []);
            }

            if (friendsData) {
              const parsed = safeJSONParse<{ friends?: Friend[]; requests?: FriendRequest[] }>(friendsData, {});
              if (parsed && typeof parsed === 'object') {
                setFriends(Array.isArray(parsed.friends) ? parsed.friends : []);
                setFriendRequests(Array.isArray(parsed.requests) ? parsed.requests : []);
              }
            }

            if (leaderboardData) {
              const parsed = safeJSONParse<typeof leaderboard>(leaderboardData, []);
              setLeaderboard(Array.isArray(parsed) ? parsed : []);
            }
          } catch (error) {
            console.warn('UserProfileContext: Failed to load secondary data:', error);
          }
        }, 500);
      } catch (error) {
        console.warn('UserProfileContext: Failed to load data:', error);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(loadData, 150);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const saveStats = useCallback(async (newStats: UserStats) => {
    setStats(newStats);
    await safeStorageSet(`${USER_STATS_KEY}_${localUser.id}`, JSON.stringify(newStats));
    
    const currentLeaderboard = [...leaderboard];
    const existingIndex = currentLeaderboard.findIndex(l => l.userId === localUser.id);
    const entry = {
      userId: localUser.id,
      name: localUser.name,
      avatar: localUser.avatar,
      points: newStats.points,
      level: newStats.level,
    };
    
    if (existingIndex >= 0) {
      currentLeaderboard[existingIndex] = entry;
    } else {
      currentLeaderboard.push(entry);
    }
    
    currentLeaderboard.sort((a, b) => b.points - a.points);
    setLeaderboard(currentLeaderboard);
    await safeStorageSet(LEADERBOARD_KEY, JSON.stringify(currentLeaderboard));
  }, [localUser, leaderboard]);

  const addActivity = useCallback(async (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    const newActivity: UserActivity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    const newActivities = [newActivity, ...activities].slice(0, MAX_ACTIVITIES);
    setActivities(newActivities);
    await safeStorageSet(`${USER_ACTIVITIES_KEY}_${localUser.id}`, JSON.stringify(newActivities));
    
    const today = new Date().toDateString();
    const lastActivity = new Date(stats.lastActivityDate).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let newStreak = stats.streak;
    if (lastActivity !== today) {
      if (lastActivity === yesterday) {
        newStreak = stats.streak + 1;
      } else if (lastActivity !== today) {
        newStreak = 1;
      }
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
  }, [localUser, activities, stats, saveStats]);

  const recordTranslation = useCallback(async () => {
    const newStats = {
      ...stats,
      translationsCount: stats.translationsCount + 1,
    };
    
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
    const newStats = {
      ...stats,
      dictionaryContributions: stats.dictionaryContributions + 1,
    };
    
    await saveStats(newStats);
    await addActivity({
      type: 'contribution',
      title: 'Dictionary Contribution',
      description: `Contributed "${wordZomi}" (${wordEnglish})`,
      points: 25,
      xp: 50,
    });
  }, [stats, saveStats, addActivity]);

  const recordForumPost = useCallback(async (title: string) => {
    const newStats = {
      ...stats,
      forumPosts: stats.forumPosts + 1,
    };
    
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
    const newStats = {
      ...stats,
      forumReplies: stats.forumReplies + 1,
    };
    
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
      description: `Scored ${score}/${total}${isPerfect ? ' - Perfect!' : ''}`,
      points: score * 10 + (isPerfect ? 50 : 0),
      xp: score * 15 + (isPerfect ? 100 : 0),
    });
  }, [stats, saveStats, addActivity]);

  const recordListening = useCallback(async (score: number, total: number) => {
    const newStats = {
      ...stats,
      listeningExercises: stats.listeningExercises + 1,
    };
    
    await saveStats(newStats);
    await addActivity({
      type: 'listening',
      title: 'Listening Exercise Completed',
      description: `Scored ${score}/${total}`,
      points: score * 10,
      xp: score * 15,
    });
  }, [stats, saveStats, addActivity]);

  const recordLesson = useCallback(async (lessonTitle: string) => {
    const newStats = {
      ...stats,
      lessonsCompleted: stats.lessonsCompleted + 1,
    };
    
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
    
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
    
    return { success: true };
  }, [localUser, profile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return { success: false, error: 'No profile loaded' };
    
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    
    if (updates.name || updates.bio || updates.avatar) {
      await updateLocalUser({
        name: updates.name,
        bio: updates.bio,
        avatar: updates.avatar,
      });
    }
    
    return { success: true };
  }, [profile, updateLocalUser]);

  const sendFriendRequest = useCallback(async (toUserId: string, toUserName: string) => {
    const request: FriendRequest = {
      id: `req_${Date.now()}`,
      fromUserId: localUser.id,
      fromUserName: localUser.name,
      fromUserAvatar: localUser.avatar,
      toUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    const newRequests = [...friendRequests, request];
    setFriendRequests(newRequests);
    await safeStorageSet(`${USER_FRIENDS_KEY}_${localUser.id}`, JSON.stringify({
      friends,
      requests: newRequests,
    }));
    
    return { success: true };
  }, [localUser, friends, friendRequests]);

  const respondToFriendRequest = useCallback(async (requestId: string, accept: boolean) => {
    const request = friendRequests.find(r => r.id === requestId);
    if (!request) return { success: false, error: 'Request not found' };
    
    if (accept) {
      const newFriend: Friend = {
        id: request.fromUserId,
        visibleUserId: request.fromUserId,
        name: request.fromUserName,
        avatar: request.fromUserAvatar,
        level: 1,
        points: 0,
      };
      
      const newFriends = [...friends, newFriend];
      setFriends(newFriends);
    }
    
    const newRequests = friendRequests.filter(r => r.id !== requestId);
    setFriendRequests(newRequests);
    
    await safeStorageSet(`${USER_FRIENDS_KEY}_${localUser.id}`, JSON.stringify({
      friends: accept ? [...friends, { id: request.fromUserId, name: request.fromUserName, avatar: request.fromUserAvatar }] : friends,
      requests: newRequests,
    }));
    
    return { success: true };
  }, [localUser, friends, friendRequests]);

  const removeFriend = useCallback(async (friendId: string) => {
    const newFriends = friends.filter(f => f.id !== friendId);
    setFriends(newFriends);
    
    await safeStorageSet(`${USER_FRIENDS_KEY}_${localUser.id}`, JSON.stringify({
      friends: newFriends,
      requests: friendRequests,
    }));
    
    return { success: true };
  }, [localUser, friends, friendRequests]);

  const unlockedBadges = useMemo(() => {
    const badges: UserBadge[] = [];
    
    for (const def of BADGE_DEFINITIONS) {
      let progress = 0;
      let unlocked = false;
      
      switch (def.id) {
        case 'first_translation':
          progress = Math.min(stats.translationsCount, 1);
          unlocked = stats.translationsCount >= 1;
          break;
        case 'translator_10':
          progress = Math.min(stats.translationsCount, 10);
          unlocked = stats.translationsCount >= 10;
          break;
        case 'translator_50':
          progress = Math.min(stats.translationsCount, 50);
          unlocked = stats.translationsCount >= 50;
          break;
        case 'translator_100':
          progress = Math.min(stats.translationsCount, 100);
          unlocked = stats.translationsCount >= 100;
          break;
        case 'translator_500':
          progress = Math.min(stats.translationsCount, 500);
          unlocked = stats.translationsCount >= 500;
          break;
        case 'contributor_1':
          progress = Math.min(stats.dictionaryContributions, 1);
          unlocked = stats.dictionaryContributions >= 1;
          break;
        case 'contributor_10':
          progress = Math.min(stats.dictionaryContributions, 10);
          unlocked = stats.dictionaryContributions >= 10;
          break;
        case 'contributor_50':
          progress = Math.min(stats.dictionaryContributions, 50);
          unlocked = stats.dictionaryContributions >= 50;
          break;
        case 'contributor_100':
          progress = Math.min(stats.dictionaryContributions, 100);
          unlocked = stats.dictionaryContributions >= 100;
          break;
        case 'forum_first':
          progress = Math.min(stats.forumPosts, 1);
          unlocked = stats.forumPosts >= 1;
          break;
        case 'forum_10':
          progress = Math.min(stats.forumPosts, 10);
          unlocked = stats.forumPosts >= 10;
          break;
        case 'forum_50':
          progress = Math.min(stats.forumPosts, 50);
          unlocked = stats.forumPosts >= 50;
          break;
        case 'helpful_10':
          progress = Math.min(stats.forumReplies, 10);
          unlocked = stats.forumReplies >= 10;
          break;
        case 'helpful_50':
          progress = Math.min(stats.forumReplies, 50);
          unlocked = stats.forumReplies >= 50;
          break;
        case 'quiz_first':
          progress = Math.min(stats.quizzesTaken, 1);
          unlocked = stats.quizzesTaken >= 1;
          break;
        case 'quiz_10':
          progress = Math.min(stats.quizzesTaken, 10);
          unlocked = stats.quizzesTaken >= 10;
          break;
        case 'lesson_5':
          progress = Math.min(stats.lessonsCompleted, 5);
          unlocked = stats.lessonsCompleted >= 5;
          break;
        case 'lesson_all':
          progress = Math.min(stats.lessonsCompleted, 6);
          unlocked = stats.lessonsCompleted >= 6;
          break;
        case 'streak_7':
          progress = Math.min(stats.longestStreak, 7);
          unlocked = stats.longestStreak >= 7;
          break;
        case 'streak_30':
          progress = Math.min(stats.longestStreak, 30);
          unlocked = stats.longestStreak >= 30;
          break;
        case 'streak_100':
          progress = Math.min(stats.longestStreak, 100);
          unlocked = stats.longestStreak >= 100;
          break;
        default:
          progress = 0;
          unlocked = false;
      }
      
      badges.push({
        ...def,
        progress,
        unlockedAt: unlocked ? stats.joinedAt : undefined,
      });
    }
    
    return badges;
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
  }, [localUser, leaderboard]);

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
  };
});
