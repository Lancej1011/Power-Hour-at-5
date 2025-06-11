/**
 * Authentication Utility Functions
 * Helper functions for authentication operations, session management, and data persistence
 */

import { User as FirebaseUser } from 'firebase/auth';
import { 
  AuthUser, 
  UserProfile, 
  UserPreferences, 
  AuthError, 
  AuthMethod,
  AUTH_STORAGE_KEYS,
  DEFAULT_USER_PREFERENCES,
  AuthEvent,
  AuthEventType
} from '../types/auth';

/**
 * Session Management Utilities
 */

// Generate a unique session ID with enhanced security
export const generateSessionId = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 12);
  const extraRandom = crypto.getRandomValues(new Uint8Array(4))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  return `session_${timestamp}_${randomPart}_${extraRandom}`;
};

// Generate session token for validation
export const generateSessionToken = (sessionId: string, userId: string): string => {
  const timestamp = Date.now();
  const data = `${sessionId}:${userId}:${timestamp}`;
  // Simple hash for session validation (not cryptographically secure, but sufficient for client-side validation)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${timestamp}_${Math.abs(hash).toString(36)}`;
};

// Validate session token
export const validateSessionToken = (token: string, sessionId: string, userId: string): boolean => {
  try {
    const [timestampStr, hashStr] = token.split('_');
    const timestamp = parseInt(timestampStr, 10);

    // Check if token is not too old (max 90 days)
    const maxAge = SESSION_CONFIG.MAX_DURATION_HOURS * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) {
      return false;
    }

    // Regenerate expected token and compare
    const expectedToken = generateSessionToken(sessionId, userId);
    const [, expectedHash] = expectedToken.split('_');

    return hashStr === expectedHash;
  } catch (error) {
    return false;
  }
};

// Check if a session is valid (not expired) with enhanced validation
export const isSessionValid = (
  sessionExpiry: Date | null,
  sessionToken?: string,
  sessionId?: string,
  userId?: string
): boolean => {
  if (!sessionExpiry) return false;

  // Check basic expiry
  const now = new Date();
  if (now >= sessionExpiry) return false;

  // If token validation data is provided, validate token
  if (sessionToken && sessionId && userId) {
    return validateSessionToken(sessionToken, sessionId, userId);
  }

  return true;
};

// Enhanced session validation with comprehensive checks
export const validateSession = (sessionData: {
  sessionId?: string | null;
  sessionExpiry?: Date | null;
  sessionToken?: string | null;
  userId?: string | null;
  lastActivity?: Date | null;
}): { isValid: boolean; reason?: string } => {
  const { sessionId, sessionExpiry, sessionToken, userId, lastActivity } = sessionData;

  // Check if we have minimum required data
  if (!sessionId || !sessionExpiry || !userId) {
    return { isValid: false, reason: 'missing-session-data' };
  }

  // Check if session is expired
  if (!isSessionValid(sessionExpiry)) {
    return { isValid: false, reason: 'session-expired' };
  }

  // Check session token if available
  if (sessionToken && !validateSessionToken(sessionToken, sessionId, userId)) {
    return { isValid: false, reason: 'invalid-session-token' };
  }

  // Check for suspicious inactivity (more than session duration)
  if (lastActivity) {
    const inactivityHours = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    if (inactivityHours > SESSION_CONFIG.MAX_DURATION_HOURS) {
      return { isValid: false, reason: 'excessive-inactivity' };
    }
  }

  return { isValid: true };
};

// Session configuration constants
export const SESSION_CONFIG = {
  // Default session duration: 30 days
  DEFAULT_DURATION_HOURS: 30 * 24,
  // Minimum session duration: 1 day
  MIN_DURATION_HOURS: 24,
  // Maximum session duration: 90 days
  MAX_DURATION_HOURS: 90 * 24,
  // Activity extension: 7 days
  ACTIVITY_EXTENSION_HOURS: 7 * 24,
  // Session refresh threshold: refresh when less than 7 days remaining
  REFRESH_THRESHOLD_HOURS: 7 * 24,
} as const;

// Calculate session expiry time with configurable duration
export const calculateSessionExpiry = (durationHours?: number): Date => {
  const hours = durationHours || SESSION_CONFIG.DEFAULT_DURATION_HOURS;
  const clampedHours = Math.max(
    SESSION_CONFIG.MIN_DURATION_HOURS,
    Math.min(SESSION_CONFIG.MAX_DURATION_HOURS, hours)
  );

  const expiry = new Date();
  expiry.setHours(expiry.getHours() + clampedHours);
  return expiry;
};

// Check if session needs refresh (less than threshold remaining)
export const shouldRefreshSession = (sessionExpiry: Date | null): boolean => {
  if (!sessionExpiry) return true;

  const now = new Date();
  const timeRemaining = sessionExpiry.getTime() - now.getTime();
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);

  return hoursRemaining < SESSION_CONFIG.REFRESH_THRESHOLD_HOURS;
};

// Extend session expiry based on user activity
export const extendSessionExpiry = (currentExpiry: Date | null): Date => {
  const now = new Date();
  const extensionExpiry = new Date();
  extensionExpiry.setHours(extensionExpiry.getHours() + SESSION_CONFIG.ACTIVITY_EXTENSION_HOURS);

  // If current session is still valid and would expire later than extension, keep current
  if (currentExpiry && currentExpiry > extensionExpiry) {
    return currentExpiry;
  }

  // Otherwise, extend to activity extension duration
  return extensionExpiry;
};

// Validate user session and return remaining time
export const getSessionTimeRemaining = (sessionExpiry: Date | null): number => {
  if (!sessionExpiry) return 0;
  const now = new Date().getTime();
  const expiry = sessionExpiry.getTime();
  return Math.max(0, expiry - now);
};

/**
 * User Data Conversion Utilities
 */

// Convert Firebase User to AuthUser
export const convertFirebaseUserToAuthUser = (
  firebaseUser: FirebaseUser,
  profile?: UserProfile,
  preferences?: UserPreferences
): AuthUser => {
  return {
    ...firebaseUser,
    profile,
    preferences,
    lastSyncAt: new Date(),
    isOnline: navigator.onLine,
  };
};

// Create user profile from Firebase User
export const createUserProfileFromFirebaseUser = (
  firebaseUser: FirebaseUser,
  authMethod: AuthMethod
): Partial<UserProfile> => {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.displayName || `User${Math.floor(Math.random() * 10000)}`,
    displayName: firebaseUser.displayName || undefined,
    email: firebaseUser.email || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    isAnonymous: firebaseUser.isAnonymous,
    authMethod,
    stats: {
      playlistsCreated: 0,
      playlistsShared: 0,
      totalLogins: 1,
      lastActiveAt: new Date(),
    },
  };
};

// Get the best display name for a user
export const getUserDisplayName = (user?: AuthUser | null, profile?: UserProfile | null): string => {
  if (profile?.displayName) return profile.displayName;
  if (profile?.username) return profile.username;
  if (user?.displayName) return user.displayName;
  if (user?.email) return user.email.split('@')[0];
  return user?.isAnonymous ? 'Guest User' : 'User';
};

/**
 * Error Handling Utilities
 */

// Create standardized AuthError from any error
export const createAuthError = (
  code: string,
  message: string,
  originalError?: any,
  recoverable: boolean = true
): AuthError => {
  return {
    code,
    message,
    details: originalError,
    timestamp: new Date(),
    recoverable,
  };
};

// Convert Firebase Auth errors to AuthError
export const convertFirebaseAuthError = (error: any): AuthError => {
  const errorMap: Record<string, { message: string; recoverable: boolean }> = {
    'auth/user-not-found': {
      message: 'No account found with this email address.',
      recoverable: true,
    },
    'auth/wrong-password': {
      message: 'Incorrect password. Please try again.',
      recoverable: true,
    },
    'auth/email-already-in-use': {
      message: 'An account with this email already exists.',
      recoverable: true,
    },
    'auth/weak-password': {
      message: 'Password should be at least 6 characters long.',
      recoverable: true,
    },
    'auth/invalid-email': {
      message: 'Please enter a valid email address.',
      recoverable: true,
    },
    'auth/network-request-failed': {
      message: 'Network error. Please check your connection and try again.',
      recoverable: true,
    },
    'auth/too-many-requests': {
      message: 'Too many failed attempts. Please try again later.',
      recoverable: false,
    },
    'auth/popup-blocked': {
      message: 'Popup was blocked. Please allow popups and try again.',
      recoverable: true,
    },
    'auth/popup-closed-by-user': {
      message: 'Sign-in was cancelled.',
      recoverable: true,
    },
  };

  const errorInfo = errorMap[error.code] || {
    message: error.message || 'An unexpected error occurred.',
    recoverable: true,
  };

  return createAuthError(
    error.code || 'unknown-error',
    errorInfo.message,
    error,
    errorInfo.recoverable
  );
};

/**
 * Local Storage Management
 */

// Save data to localStorage with error handling
export const saveToLocalStorage = <T>(key: string, data: T): boolean => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error(`Failed to save to localStorage (${key}):`, error);
    return false;
  }
};

// Load data from localStorage with error handling
export const loadFromLocalStorage = <T>(key: string): T | null => {
  try {
    const serializedData = localStorage.getItem(key);
    if (!serializedData) return null;
    return JSON.parse(serializedData) as T;
  } catch (error) {
    console.error(`Failed to load from localStorage (${key}):`, error);
    return null;
  }
};

// Remove data from localStorage
export const removeFromLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    // Failed to remove from localStorage - could add error reporting here
    return false;
  }
};

// Clear all authentication data from localStorage
export const clearAuthLocalStorage = (): void => {
  Object.values(AUTH_STORAGE_KEYS).forEach(key => {
    removeFromLocalStorage(key);
  });
};

/**
 * User Preferences Management
 */

// Merge user preferences with defaults
export const mergeUserPreferences = (
  userPreferences: Partial<UserPreferences> | null
): UserPreferences => {
  if (!userPreferences) return DEFAULT_USER_PREFERENCES;

  return {
    theme: {
      ...DEFAULT_USER_PREFERENCES.theme,
      ...userPreferences.theme,
    },
    audio: {
      ...DEFAULT_USER_PREFERENCES.audio,
      ...userPreferences.audio,
    },
    ui: {
      ...DEFAULT_USER_PREFERENCES.ui,
      ...userPreferences.ui,
    },
    privacy: {
      ...DEFAULT_USER_PREFERENCES.privacy,
      ...userPreferences.privacy,
    },
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...userPreferences.notifications,
    },
  };
};

/**
 * Feature Access Control
 */

// Check if user can access a specific feature
export const canUserAccessFeature = (
  user: AuthUser | null,
  feature: string
): boolean => {
  if (!user) return false;

  const featurePermissions: Record<string, (user: AuthUser) => boolean> = {
    'community-sharing': (user) => !user.isAnonymous,
    'playlist-sync': (user) => !user.isAnonymous,
    'profile-customization': () => true,
    'advanced-settings': (user) => !user.isAnonymous,
    'data-export': () => true,
    'premium-features': (user) => !user.isAnonymous && !!user.email,
    'admin-community-management': (user) => isUserAdmin(user),
    'admin-user-management': (user) => isUserAdmin(user) && hasAdminPermission(user, 'canManageUsers'),
    'admin-content-moderation': (user) => isUserAdmin(user) && hasAdminPermission(user, 'canModerateContent'),
    'admin-analytics': (user) => isUserAdmin(user) && hasAdminPermission(user, 'canAccessAnalytics'),
  };

  const permissionCheck = featurePermissions[feature];
  return permissionCheck ? permissionCheck(user) : true;
};

// Check if user is an admin
export const isUserAdmin = (user: AuthUser | null): boolean => {
  if (!user) return false;

  // Check if explicitly marked as admin in profile
  if (user.profile?.isAdmin === true) return true;

  // Check if user ID is in admin list
  if (isAdminUserId(user.uid)) return true;

  // Check if user email is in admin list
  if (user.email && isAdminEmail(user.email)) return true;

  return false;
};

// Check if user has specific admin permission
export const hasAdminPermission = (
  user: AuthUser | null,
  permission: keyof NonNullable<UserProfile['adminPermissions']>
): boolean => {
  if (!isUserAdmin(user) || !user?.profile?.adminPermissions) return false;
  return user.profile.adminPermissions[permission] === true;
};

// Check if user can manage community content
export const canManageCommunity = (user: AuthUser | null): boolean => {
  return hasAdminPermission(user, 'canManageCommunity');
};

// Check if user can moderate content
export const canModerateContent = (user: AuthUser | null): boolean => {
  return hasAdminPermission(user, 'canModerateContent');
};

// Check if user can manage other users
export const canManageUsers = (user: AuthUser | null): boolean => {
  return hasAdminPermission(user, 'canManageUsers');
};

// Check if user can access analytics
export const canAccessAnalytics = (user: AuthUser | null): boolean => {
  return hasAdminPermission(user, 'canAccessAnalytics');
};

// Admin user IDs (your account)
const ADMIN_USER_IDS = [
  // Add your Firebase user ID here - you'll need to get this from Firebase console
  // or by signing in and checking the user object
  // For now, we'll check by email as well
];

// Admin emails (backup method)
const ADMIN_EMAILS = [
  'your.email@example.com', // Replace with your actual email
  // Add more admin emails here
];

// Check if user ID is in admin list
export const isAdminUserId = (userId: string): boolean => {
  return ADMIN_USER_IDS.includes(userId);
};

// Check if user email is in admin list
export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email);
};

// Create admin profile data
export const createAdminProfile = (userId: string, email?: string): Partial<UserProfile> => {
  if (!isAdminUserId(userId) && (!email || !isAdminEmail(email))) {
    return {};
  }

  return {
    isAdmin: true,
    adminPermissions: {
      canManageCommunity: true,
      canManageUsers: true,
      canModerateContent: true,
      canAccessAnalytics: true,
    },
  };
};

/**
 * Authentication Event Utilities
 */

// Create authentication event
export const createAuthEvent = (
  type: AuthEventType,
  user?: AuthUser | null,
  data?: any
): AuthEvent => {
  return {
    type,
    user,
    data,
    timestamp: new Date(),
  };
};

/**
 * Data Migration Utilities
 */

// Migrate local playlist data to user account
export const migrateLocalDataToUser = async (
  userId: string,
  localData: any
): Promise<boolean> => {
  try {
    // This will be implemented in Phase 3
    // For now, just save to localStorage with user prefix
    const userDataKey = `user_${userId}_migrated_data`;
    return saveToLocalStorage(userDataKey, {
      ...localData,
      migratedAt: new Date(),
      originalUserId: 'local',
    });
  } catch (error) {
    console.error('Failed to migrate local data:', error);
    return false;
  }
};

/**
 * Network and Connectivity Utilities
 */

// Check if user is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Create a promise that resolves when user comes online
export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
};

/**
 * Validation Utilities
 */

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  return {
    isValid: score >= 3,
    score,
    feedback,
  };
};
