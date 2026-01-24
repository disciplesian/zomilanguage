import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';


const AUTH_TOKEN_KEY = '@zomi_auth_token';
const AUTH_USER_KEY = '@zomi_auth_user';
const USERS_DB_KEY = '@zomi_users_db';
const ADMIN_INITIALIZED_KEY = '@zomi_admin_initialized';

const MAX_STORAGE_SIZE = 300000;
const STORAGE_TIMEOUT_MS = 5000;

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

const DEFAULT_ADMIN_EMAIL = 'admin@zomitranslator.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123)?';

export type SocialProvider = 'google' | 'facebook' | 'twitter' | 'apple';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'editor' | 'moderator' | 'admin';
  isPremium: boolean;
  isVerified: boolean;
  isBanned?: boolean;
  banReason?: string;
  avatar?: string;
  bio?: string;
  provider?: SocialProvider | 'email';
  createdAt?: string;
}

interface StoredUser extends AuthUser {
  passwordHash?: string;
}

export interface UserListItem {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'editor' | 'moderator' | 'admin';
  isPremium: boolean;
  isVerified: boolean;
  isBanned?: boolean;
  banReason?: string;
  avatar?: string;
  provider?: SocialProvider | 'email';
  createdAt?: string;
}

const generateUserId = () => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const simpleHash = async (password: string): Promise<string> => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36) + '_' + password.length;
};

const verifyHash = async (password: string, hash: string): Promise<boolean> => {
  const newHash = await simpleHash(password);
  return newHash === hash;
};

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

const safeAsyncStorageGet = async (key: string): Promise<string | null> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return null;
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), STORAGE_TIMEOUT_MS);
    });
    const getPromise = AsyncStorage.getItem(key);
    return await Promise.race([getPromise, timeoutPromise]);
  } catch {
    return null;
  }
};

const safeAsyncStorageSet = async (key: string, value: string): Promise<boolean> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return false;
    
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), STORAGE_TIMEOUT_MS);
    });
    const setPromise = AsyncStorage.setItem(key, value).then(() => true);
    return await Promise.race([setPromise, timeoutPromise]);
  } catch {
    return false;
  }
};

const safeAsyncStorageRemove = async (key: string): Promise<boolean> => {
  try {
    const AsyncStorage = await getAsyncStorage();
    if (!AsyncStorage) return false;
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const initializationRef = useRef(false);

  const getUsersDB = async (): Promise<Record<string, StoredUser>> => {
    try {
      const data = await safeAsyncStorageGet(USERS_DB_KEY);
      return safeJSONParse<Record<string, StoredUser>>(data, {});
    } catch {
      return {};
    }
  };

  const saveUsersDB = async (users: Record<string, StoredUser>) => {
    try {
      const jsonStr = JSON.stringify(users);
      if (jsonStr.length > MAX_STORAGE_SIZE) {
        return;
      }
      await safeAsyncStorageSet(USERS_DB_KEY, jsonStr);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;
    
    const mountedRef = { current: true };
    
    const initializeAdmin = async (): Promise<void> => {
      try {
        const adminInitialized = await safeAsyncStorageGet(ADMIN_INITIALIZED_KEY);
        
        if (adminInitialized) {
          return;
        }
        
        const usersDB = await getUsersDB();
        const usersArray = Object.values(usersDB);
        
        let adminExists = false;
        for (let i = 0; i < usersArray.length; i++) {
          const u = usersArray[i];
          if (u && u.email && u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
            adminExists = true;
            break;
          }
        }
        
        if (!adminExists) {
          const adminId = 'admin_' + Date.now().toString(36);
          const passwordHash = await simpleHash(DEFAULT_ADMIN_PASSWORD);
          
          const adminUser: StoredUser = {
            userId: adminId,
            email: DEFAULT_ADMIN_EMAIL,
            name: 'Admin',
            role: 'admin',
            isPremium: true,
            isVerified: true,
            passwordHash,
            provider: 'email',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
            bio: 'System Administrator',
          };
          
          usersDB[adminId] = adminUser;
          await saveUsersDB(usersDB);
        }
        
        await safeAsyncStorageSet(ADMIN_INITIALIZED_KEY, 'true');
      } catch {
        // Ignore admin init errors
      }
    };
    
    const loadAuthState = async (): Promise<void> => {
      try {
        const [token, userJson] = await Promise.all([
          safeAsyncStorageGet(AUTH_TOKEN_KEY),
          safeAsyncStorageGet(AUTH_USER_KEY),
        ]);
        
        if (!mountedRef.current) return;
        
        if (token && userJson) {
          const storedUser = safeJSONParse<AuthUser | null>(userJson, null);
          if (storedUser && storedUser.userId && storedUser.email) {
            setAuthToken(token);
            setUser(storedUser);
          } else {
            await safeAsyncStorageRemove(AUTH_TOKEN_KEY);
            await safeAsyncStorageRemove(AUTH_USER_KEY);
          }
        }
      } catch {
        // Ignore load errors
      }
    };

    const initialize = async () => {
      try {
        await loadAuthState();
      } catch {
        // Ignore
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
      
      setTimeout(() => {
        if (mountedRef.current) {
          initializeAdmin().catch(() => {});
        }
      }, 1000);
    };

    const timer = setTimeout(initialize, 200);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const usersDB = await getUsersDB();
      const userEntry = Object.values(usersDB).find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!userEntry) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (!userEntry.passwordHash) {
        return { success: false, error: 'Please use social login for this account' };
      }

      const isValid = await verifyHash(password, userEntry.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      const authUser: AuthUser = {
        userId: userEntry.userId,
        email: userEntry.email,
        name: userEntry.name,
        role: userEntry.role,
        isPremium: userEntry.isPremium,
        isVerified: userEntry.isVerified,
        avatar: userEntry.avatar,
        bio: userEntry.bio,
        provider: 'email',
      };

      await safeAsyncStorageSet(AUTH_TOKEN_KEY, authUser.userId);
      await safeAsyncStorageSet(AUTH_USER_KEY, JSON.stringify(authUser));
      setAuthToken(authUser.userId);
      setUser(authUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      const usersDB = await getUsersDB();
      const existingUser = Object.values(usersDB).find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (existingUser) {
        return { success: false, error: 'Email already exists' };
      }

      const userId = generateUserId();
      const passwordHash = await simpleHash(password);

      const newUser: StoredUser = {
        userId,
        email,
        name,
        role: 'user',
        isPremium: false,
        isVerified: false,
        passwordHash,
        provider: 'email',
      };

      usersDB[userId] = newUser;
      await saveUsersDB(usersDB);

      const authUser: AuthUser = {
        userId: newUser.userId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isPremium: newUser.isPremium,
        isVerified: newUser.isVerified,
        provider: 'email',
      };

      await safeAsyncStorageSet(AUTH_TOKEN_KEY, authUser.userId);
      await safeAsyncStorageSet(AUTH_USER_KEY, JSON.stringify(authUser));
      setAuthToken(authUser.userId);
      setUser(authUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  }, []);

  const socialLogin = useCallback(async (provider: SocialProvider) => {
    try {
      const providerNames: Record<SocialProvider, string> = {
        google: 'Google',
        facebook: 'Facebook',
        twitter: 'X (Twitter)',
        apple: 'Apple',
      };

      const providerEmails: Record<SocialProvider, string> = {
        google: 'google',
        facebook: 'facebook', 
        twitter: 'twitter',
        apple: 'apple',
      };

      const timestamp = Date.now().toString(36).slice(-4);
      const mockEmail = `${providerEmails[provider]}_user_${timestamp}@demo.zomitranslator.com`;
      const mockName = `${providerNames[provider]} User`;
      const userId = generateUserId();

      const usersDB = await getUsersDB();
      
      const existingSocialUser = Object.values(usersDB).find(
        u => u.provider === provider && u.email.includes(`${providerEmails[provider]}_user`)
      );

      let authUser: AuthUser;

      if (existingSocialUser) {
        authUser = {
          userId: existingSocialUser.userId,
          email: existingSocialUser.email,
          name: existingSocialUser.name,
          role: existingSocialUser.role,
          isPremium: existingSocialUser.isPremium,
          isVerified: true,
          avatar: existingSocialUser.avatar,
          bio: existingSocialUser.bio,
          provider,
        };
      } else {
        const avatarUrls: Record<SocialProvider, string> = {
          google: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
          facebook: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
          twitter: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
          apple: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
        };

        const newUser: StoredUser = {
          userId,
          email: mockEmail,
          name: mockName,
          role: 'user',
          isPremium: false,
          isVerified: true,
          provider,
          avatar: avatarUrls[provider],
        };

        usersDB[userId] = newUser;
        await saveUsersDB(usersDB);

        authUser = {
          userId: newUser.userId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isPremium: newUser.isPremium,
          isVerified: newUser.isVerified,
          avatar: newUser.avatar,
          provider,
        };
      }

      await safeAsyncStorageSet(AUTH_TOKEN_KEY, authUser.userId);
      await safeAsyncStorageSet(AUTH_USER_KEY, JSON.stringify(authUser));
      setAuthToken(authUser.userId);
      setUser(authUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Social login failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthToken(null);
      setUser(null);
      await safeAsyncStorageRemove(AUTH_TOKEN_KEY);
      await safeAsyncStorageRemove(AUTH_USER_KEY);
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<AuthUser, 'name' | 'bio' | 'avatar'>>) => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };

      const usersDB = await getUsersDB();
      if (usersDB[user.userId]) {
        usersDB[user.userId] = { ...usersDB[user.userId], ...updates };
        await saveUsersDB(usersDB);
      }

      const updatedUser = { ...user, ...updates };
      await safeAsyncStorageSet(AUTH_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }, [user]);

  const getAllUsers = useCallback(async (): Promise<UserListItem[]> => {
    try {
      const usersDB = await getUsersDB();
      return Object.values(usersDB).map(u => ({
        userId: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
        isPremium: u.isPremium,
        isVerified: u.isVerified,
        isBanned: u.isBanned,
        banReason: u.banReason,
        avatar: u.avatar,
        provider: u.provider,
        createdAt: u.createdAt,
      }));
    } catch {
      return [];
    }
  }, []);

  const updateUserRole = useCallback(async (targetUserId: string, newRole: 'user' | 'editor' | 'moderator' | 'admin') => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Only admins can change user roles' };
      }

      const usersDB = await getUsersDB();
      if (!usersDB[targetUserId]) {
        return { success: false, error: 'User not found' };
      }

      usersDB[targetUserId].role = newRole;
      await saveUsersDB(usersDB);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }, [user]);

  const banUser = useCallback(async (targetUserId: string, reason: string) => {
    try {
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return { success: false, error: 'Only admins and moderators can ban users' };
      }

      const usersDB = await getUsersDB();
      if (!usersDB[targetUserId]) {
        return { success: false, error: 'User not found' };
      }

      if (usersDB[targetUserId].role === 'admin') {
        return { success: false, error: 'Cannot ban an admin' };
      }

      usersDB[targetUserId].isBanned = true;
      usersDB[targetUserId].banReason = reason;
      await saveUsersDB(usersDB);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Ban failed' };
    }
  }, [user]);

  const unbanUser = useCallback(async (targetUserId: string) => {
    try {
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return { success: false, error: 'Only admins and moderators can unban users' };
      }

      const usersDB = await getUsersDB();
      if (!usersDB[targetUserId]) {
        return { success: false, error: 'User not found' };
      }

      usersDB[targetUserId].isBanned = false;
      usersDB[targetUserId].banReason = undefined;
      await saveUsersDB(usersDB);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unban failed' };
    }
  }, [user]);

  const deleteUser = useCallback(async (targetUserId: string) => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Only admins can delete users' };
      }

      if (targetUserId === user.userId) {
        return { success: false, error: 'Cannot delete your own account from here' };
      }

      const usersDB = await getUsersDB();
      if (!usersDB[targetUserId]) {
        return { success: false, error: 'User not found' };
      }

      if (usersDB[targetUserId].role === 'admin') {
        return { success: false, error: 'Cannot delete an admin account' };
      }

      delete usersDB[targetUserId];
      await saveUsersDB(usersDB);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
    }
  }, [user]);

  const updateUserDetails = useCallback(async (targetUserId: string, updates: Partial<Pick<AuthUser, 'name' | 'email' | 'isPremium' | 'isVerified'>>) => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Only admins can edit user details' };
      }

      const usersDB = await getUsersDB();
      if (!usersDB[targetUserId]) {
        return { success: false, error: 'User not found' };
      }

      usersDB[targetUserId] = { ...usersDB[targetUserId], ...updates };
      await saveUsersDB(usersDB);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }, [user]);

  const isAuthenticated = !!authToken;

  return {
    authToken,
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    socialLogin,
    logout,
    updateProfile,
    getAllUsers,
    updateUserRole,
    banUser,
    unbanUser,
    deleteUser,
    updateUserDetails,
  };
});
