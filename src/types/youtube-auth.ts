/**
 * YouTube Authentication Types
 * Enhanced authentication system supporting both OAuth 2.0 and API keys
 */

export interface YouTubeAuthConfig {
  clientId: string;
  clientSecret?: string; // Optional for client-side apps
  redirectUri: string;
  scopes: string[];
}

export interface YouTubeOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: 'Bearer';
  scope: string;
}

export interface YouTubeUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  channelId?: string;
  channelTitle?: string;
}

export interface YouTubeApiKey {
  id: string;
  key: string;
  name: string;
  quotaUsed: number;
  quotaLimit: number;
  lastUsed: Date;
  isActive: boolean;
  errors: number;
}

export type YouTubeAuthMethod = 'oauth' | 'apikey' | 'hybrid';

export interface YouTubeAuthState {
  method: YouTubeAuthMethod;
  isAuthenticated: boolean;
  user: YouTubeUser | null;
  tokens: YouTubeOAuthTokens | null;
  apiKeys: YouTubeApiKey[];
  activeApiKeyId: string | null;
  quotaStatus: {
    totalUsed: number;
    totalLimit: number;
    resetTime: Date;
    warningThreshold: number;
  };
  lastError: string | null;
}

export interface YouTubeAuthActions {
  // OAuth methods
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  
  // API Key methods
  addApiKey: (key: string, name: string) => Promise<void>;
  removeApiKey: (keyId: string) => void;
  setActiveApiKey: (keyId: string) => void;
  validateApiKey: (key: string) => Promise<boolean>;
  
  // Hybrid methods
  setAuthMethod: (method: YouTubeAuthMethod) => void;
  getActiveCredentials: () => YouTubeOAuthTokens | string | null;
  
  // Quota management
  updateQuotaUsage: (used: number, keyId?: string) => void;
  checkQuotaAvailable: () => boolean;
  getNextAvailableKey: () => YouTubeApiKey | null;
  
  // Error handling
  handleAuthError: (error: any) => void;
  clearError: () => void;
}

export interface YouTubeAuthStore extends YouTubeAuthState, YouTubeAuthActions {}

// OAuth Configuration
export const YOUTUBE_OAUTH_CONFIG: YouTubeAuthConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  redirectUri: window.location.origin, // This will automatically use the current port
  scopes: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};

// Debug: Log the current configuration
console.log('🔧 OAuth Configuration:', {
  clientId: YOUTUBE_OAUTH_CONFIG.clientId ? 'Configured' : 'Missing',
  redirectUri: YOUTUBE_OAUTH_CONFIG.redirectUri,
  hasScopes: YOUTUBE_OAUTH_CONFIG.scopes.length > 0
});

// API Quota Constants
export const YOUTUBE_QUOTA_LIMITS = {
  SEARCH: 100,
  VIDEO_DETAILS: 1,
  CHANNEL_DETAILS: 1,
  PLAYLIST_ITEMS: 1,
  DEFAULT_DAILY_LIMIT: 10000,
  WARNING_THRESHOLD: 0.8 // 80% of quota
};

// Error Types
export interface YouTubeAuthError {
  type: 'quota_exceeded' | 'invalid_credentials' | 'network_error' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
}

// Storage Keys
export const YOUTUBE_STORAGE_KEYS = {
  AUTH_STATE: 'youtube_auth_state',
  OAUTH_TOKENS: 'youtube_oauth_tokens',
  API_KEYS: 'youtube_api_keys',
  USER_PROFILE: 'youtube_user_profile',
  QUOTA_USAGE: 'youtube_quota_usage'
} as const;
