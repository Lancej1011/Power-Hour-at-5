/**
 * Authentication Types and Interfaces
 * Defines all TypeScript interfaces for the authentication system
 */

import { User as FirebaseUser } from 'firebase/auth';

// Authentication method types
export type AuthMethod = 'google' | 'email' | 'anonymous' | 'none';

// Email authentication specific types
export interface EmailAuthCredentials {
  email: string;
  password: string;
}

export interface EmailSignUpData extends EmailAuthCredentials {
  displayName?: string;
  acceptTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerificationStatus {
  isVerified: boolean;
  verificationSent: boolean;
  lastVerificationSent?: Date;
}

// Authentication status
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

// Extended user interface that includes Firebase User and additional profile data
export interface AuthUser extends Omit<FirebaseUser, 'metadata'> {
  // Firebase User properties are inherited
  // Additional custom properties
  profile?: UserProfile;
  preferences?: UserPreferences;
  lastSyncAt?: Date;
  isOnline?: boolean;

  // Email authentication specific properties
  emailVerificationStatus?: EmailVerificationStatus;
  accountLinkingAvailable?: boolean;
  securitySettings?: UserSecuritySettings;
}

// User profile stored in Firestore
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  lastLoginAt: any; // Firestore timestamp
  isAnonymous: boolean;
  authMethod: AuthMethod;
  // Admin permissions
  isAdmin?: boolean;
  adminPermissions?: {
    canManageCommunity: boolean;
    canManageUsers: boolean;
    canModerateContent: boolean;
    canAccessAnalytics: boolean;
  };
  // User statistics
  stats?: {
    playlistsCreated: number;
    playlistsShared: number;
    totalLogins: number;
    lastActiveAt: any; // Firestore timestamp
  };
}

// User security settings interface
export interface UserSecuritySettings {
  passwordLastChanged?: Date;
  emailVerificationRequired: boolean;
  twoFactorEnabled: boolean;
  securityNotifications: boolean;
  loginNotifications: boolean;
  accountRecoveryEmail?: string;
  lastSecurityCheck?: Date;
}

// User preferences that sync across devices
export interface UserPreferences {
  theme: {
    mode: 'light' | 'dark';
    colorTheme: string;
  };
  audio: {
    volume: number;
    defaultPlaybackSpeed: number;
    enableDrinkingClips: boolean;
  };
  ui: {
    showTooltips: boolean;
    enableAnimations: boolean;
    compactMode: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    publicProfile: boolean;
  };
  notifications: {
    enableToasts: boolean;
    playlistUpdates: boolean;
  };
  authentication: {
    rememberMe: boolean;
    autoSignIn: boolean;
    requireAuthForCommunity: boolean;
  };
}

// Authentication error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

// Authentication state for the store
export interface UserAuthState {
  // Core authentication state
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  
  // Authentication methods and capabilities
  authMethod: AuthMethod;
  isFirebaseAvailable: boolean;
  canSignIn: boolean;
  
  // Session management
  sessionId: string | null;
  sessionToken: string | null;
  lastActivity: Date | null;
  sessionExpiry: Date | null;
  
  // Loading and error states
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  isSyncing: boolean;
  lastError: AuthError | null;
  
  // Sync and offline state
  isOnline: boolean;
  lastSyncAt: Date | null;
  pendingSyncData: any[];
  
  // Local storage fallback
  localStorageEnabled: boolean;
  localUserData: any | null;
}

// Authentication store actions interface
export interface AuthStoreActions {
  // Sign-in methods
  signInWithGoogle: () => Promise<AuthUser | null>;
  signInAnonymously: () => Promise<AuthUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser | null>;

  // Email authentication methods
  createUserWithEmail: (email: string, password: string, displayName?: string) => Promise<AuthUser | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Account linking methods
  linkAnonymousToEmail: (email: string, password: string) => Promise<AuthUser | null>;
  canLinkAccount: () => boolean;
  
  // Sign-out and session management
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  
  // User profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  syncUserData: () => Promise<void>;
  
  // Error handling
  clearError: () => void;
  handleAuthError: (error: any) => void;
  
  // Session and state management
  initializeAuth: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Local storage management
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  clearLocalStorage: () => void;
  
  // Utility methods
  getCurrentUser: () => AuthUser | null;
  isAuthenticated: () => boolean;
  canAccessFeature: (feature: string) => boolean;

  // Sync utilities
  getSyncStatus: () => { lastSyncAt: Date | null; pendingChanges: boolean; syncInProgress: boolean; lastError: string | null; };
  hasPendingSync: () => boolean;
  forceSyncNow: () => Promise<void>;
}

// Complete authentication store interface
export interface AuthStore extends UserAuthState, AuthStoreActions {}

// Authentication context interface for React
export interface AuthContextType {
  // State from store
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastError: AuthError | null;

  // Basic authentication actions
  signInWithGoogle: () => Promise<AuthUser | null>;
  signInAnonymously: () => Promise<AuthUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;

  // Email authentication actions
  createUserWithEmail: (email: string, password: string, displayName?: string) => Promise<AuthUser | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Account linking actions
  linkAnonymousToEmail: (email: string, password: string) => Promise<AuthUser | null>;
  canLinkAccount: () => boolean;

  // Profile and preferences
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;

  // Utility methods
  canAccessFeature: (feature: string) => boolean;

  // Sync-related properties and methods
  isSyncing?: boolean;
  isOnline?: boolean;
  lastSyncAt?: Date | null;
  getSyncStatus?: () => { lastSyncAt: Date | null; pendingChanges: boolean; syncInProgress: boolean; lastError: string | null; };
  hasPendingSync?: () => boolean;
  forceSyncNow?: () => Promise<void>;
}

// Storage keys for localStorage persistence
export const AUTH_STORAGE_KEYS = {
  USER_SESSION: 'phat5_user_session',
  USER_PROFILE: 'phat5_user_profile',
  USER_PREFERENCES: 'phat5_user_preferences',
  AUTH_STATE: 'phat5_auth_state',
  LAST_SYNC: 'phat5_last_sync',
  PENDING_SYNC: 'phat5_pending_sync',
} as const;

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: {
    mode: 'dark',
    colorTheme: 'purple',
  },
  audio: {
    volume: 0.8,
    defaultPlaybackSpeed: 1.0,
    enableDrinkingClips: true,
  },
  ui: {
    showTooltips: true,
    enableAnimations: true,
    compactMode: false,
  },
  privacy: {
    shareAnalytics: false,
    publicProfile: false,
  },
  notifications: {
    enableToasts: true,
    playlistUpdates: true,
  },
  authentication: {
    rememberMe: true,
    autoSignIn: true,
    requireAuthForCommunity: false,
  },
};

// Authentication event types for listeners
export type AuthEventType = 
  | 'sign-in'
  | 'sign-out'
  | 'profile-updated'
  | 'preferences-updated'
  | 'session-expired'
  | 'sync-completed'
  | 'error';

export interface AuthEvent {
  type: AuthEventType;
  user?: AuthUser | null;
  data?: any;
  timestamp: Date;
}

// Authentication listener callback type
export type AuthEventListener = (event: AuthEvent) => void;
