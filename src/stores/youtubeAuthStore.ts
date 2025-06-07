/**
 * YouTube Authentication Store
 * Manages OAuth 2.0, API keys, and hybrid authentication
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  YouTubeAuthStore, 
  YouTubeAuthMethod, 
  YouTubeApiKey, 
  YouTubeOAuthTokens,
  YouTubeUser,
  YOUTUBE_STORAGE_KEYS,
  YOUTUBE_QUOTA_LIMITS
} from '../types/youtube-auth';
import { googleAuthService } from '../services/googleAuthService';

// Default state
const defaultState = {
  method: 'apikey' as YouTubeAuthMethod,
  isAuthenticated: false,
  user: null,
  tokens: null,
  apiKeys: [],
  activeApiKeyId: null,
  quotaStatus: {
    totalUsed: 0,
    totalLimit: YOUTUBE_QUOTA_LIMITS.DEFAULT_DAILY_LIMIT,
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    warningThreshold: YOUTUBE_QUOTA_LIMITS.WARNING_THRESHOLD,
  },
  lastError: null,
};

export const useYouTubeAuthStore = create<YouTubeAuthStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...defaultState,

        // OAuth methods
        signInWithGoogle: async () => {
          try {
            set((draft) => {
              draft.lastError = null;
            });

            const { tokens, user } = await googleAuthService.signIn();
            
            set((draft) => {
              draft.isAuthenticated = true;
              draft.tokens = tokens;
              draft.user = user;
              draft.method = 'oauth';
            });

            console.log('✅ Google OAuth sign-in successful');
          } catch (error: any) {
            console.error('Google OAuth sign-in failed:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to sign in with Google';
              draft.isAuthenticated = false;
              draft.tokens = null;
              draft.user = null;
            });
            throw error;
          }
        },

        signOut: async () => {
          try {
            await googleAuthService.signOut();
            
            set((draft) => {
              draft.isAuthenticated = false;
              draft.tokens = null;
              draft.user = null;
              draft.lastError = null;
              // Keep API keys but switch to API key method if available
              if (draft.apiKeys.length > 0) {
                draft.method = 'apikey';
              }
            });

            console.log('✅ Google OAuth sign-out successful');
          } catch (error: any) {
            console.error('Google OAuth sign-out error:', error);
            // Still clear state even if sign-out fails
            set((draft) => {
              draft.isAuthenticated = false;
              draft.tokens = null;
              draft.user = null;
            });
          }
        },

        refreshTokens: async () => {
          try {
            const tokens = await googleAuthService.refreshTokens();
            
            set((draft) => {
              draft.tokens = tokens;
              draft.isAuthenticated = true;
              draft.lastError = null;
            });

            return tokens;
          } catch (error: any) {
            console.error('Token refresh failed:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to refresh tokens';
              draft.isAuthenticated = false;
              draft.tokens = null;
            });
            throw error;
          }
        },

        // API Key methods
        addApiKey: async (key: string, name: string) => {
          try {
            // Validate the API key first
            const isValid = await get().validateApiKey(key);
            
            if (!isValid) {
              throw new Error('Invalid API key');
            }

            const newApiKey: YouTubeApiKey = {
              id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              key,
              name: name || `API Key ${get().apiKeys.length + 1}`,
              quotaUsed: 0,
              quotaLimit: YOUTUBE_QUOTA_LIMITS.DEFAULT_DAILY_LIMIT,
              lastUsed: new Date(),
              isActive: true,
              errors: 0,
            };

            set((draft) => {
              draft.apiKeys.push(newApiKey);
              
              // Set as active if it's the first key or no active key
              if (!draft.activeApiKeyId || draft.apiKeys.length === 1) {
                draft.activeApiKeyId = newApiKey.id;
              }
              
              draft.lastError = null;
            });

            // Save to localStorage
            get().saveApiKeysToStorage();
            
            console.log('✅ API key added successfully');
          } catch (error: any) {
            console.error('Failed to add API key:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to add API key';
            });
            throw error;
          }
        },

        removeApiKey: (keyId: string) => {
          set((draft) => {
            draft.apiKeys = draft.apiKeys.filter(key => key.id !== keyId);
            
            // If we removed the active key, set a new active key
            if (draft.activeApiKeyId === keyId) {
              draft.activeApiKeyId = draft.apiKeys.length > 0 ? draft.apiKeys[0].id : null;
            }
          });

          get().saveApiKeysToStorage();
          console.log('✅ API key removed');
        },

        setActiveApiKey: (keyId: string) => {
          const key = get().apiKeys.find(k => k.id === keyId);
          if (!key) {
            throw new Error('API key not found');
          }

          set((draft) => {
            draft.activeApiKeyId = keyId;
          });

          get().saveApiKeysToStorage();
          console.log('✅ Active API key changed');
        },

        validateApiKey: async (key: string): Promise<boolean> => {
          try {
            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&key=${key}&maxResults=1`
            );

            if (response.ok) {
              return true;
            } else if (response.status === 403) {
              const errorData = await response.json().catch(() => ({}));
              if (errorData.error?.message?.includes('quota')) {
                // Key is valid but quota exceeded
                return true;
              }
            }
            
            return false;
          } catch (error) {
            console.error('API key validation error:', error);
            return false;
          }
        },

        // Hybrid methods
        setAuthMethod: (method: YouTubeAuthMethod) => {
          set((draft) => {
            draft.method = method;
          });
          
          localStorage.setItem('youtube_auth_method', method);
          console.log(`✅ Auth method changed to: ${method}`);
        },

        getActiveCredentials: (): YouTubeOAuthTokens | string | null => {
          const state = get();
          
          if (state.method === 'oauth' && state.tokens) {
            return state.tokens;
          } else if (state.method === 'apikey' && state.activeApiKeyId) {
            const activeKey = state.apiKeys.find(k => k.id === state.activeApiKeyId);
            return activeKey?.key || null;
          } else if (state.method === 'hybrid') {
            // Try OAuth first, fallback to API key
            if (state.tokens) {
              return state.tokens;
            } else if (state.activeApiKeyId) {
              const activeKey = state.apiKeys.find(k => k.id === state.activeApiKeyId);
              return activeKey?.key || null;
            }
          }
          
          return null;
        },

        // Quota management
        updateQuotaUsage: (used: number, keyId?: string) => {
          set((draft) => {
            draft.quotaStatus.totalUsed += used;
            
            if (keyId) {
              const key = draft.apiKeys.find(k => k.id === keyId);
              if (key) {
                key.quotaUsed += used;
                key.lastUsed = new Date();
              }
            }
          });
        },

        checkQuotaAvailable: (): boolean => {
          const state = get();
          
          if (state.method === 'oauth') {
            // OAuth typically has higher limits per user
            return true;
          }
          
          const activeKey = state.apiKeys.find(k => k.id === state.activeApiKeyId);
          if (!activeKey) return false;
          
          return activeKey.quotaUsed < activeKey.quotaLimit * state.quotaStatus.warningThreshold;
        },

        getNextAvailableKey: (): YouTubeApiKey | null => {
          const state = get();
          
          // Find a key with available quota
          return state.apiKeys.find(key => 
            key.isActive && 
            key.quotaUsed < key.quotaLimit * state.quotaStatus.warningThreshold
          ) || null;
        },

        // Error handling
        handleAuthError: (error: any) => {
          console.error('YouTube Auth Error:', error);
          
          set((draft) => {
            if (error.status === 403 && error.message?.includes('quota')) {
              draft.lastError = 'API quota exceeded. Please try again later or add more API keys.';
              
              // Try to switch to next available key
              const nextKey = get().getNextAvailableKey();
              if (nextKey && nextKey.id !== draft.activeApiKeyId) {
                draft.activeApiKeyId = nextKey.id;
                console.log(`🔄 Switched to next available API key: ${nextKey.name}`);
              }
            } else if (error.status === 401) {
              draft.lastError = 'Authentication failed. Please sign in again.';
              draft.isAuthenticated = false;
              draft.tokens = null;
            } else {
              draft.lastError = error.message || 'An unknown error occurred';
            }
          });
        },

        clearError: () => {
          set((draft) => {
            draft.lastError = null;
          });
        },

        // Storage helpers
        saveApiKeysToStorage: () => {
          const state = get();
          localStorage.setItem(YOUTUBE_STORAGE_KEYS.API_KEYS, JSON.stringify(state.apiKeys));
          localStorage.setItem('youtube_active_api_key', state.activeApiKeyId || '');
        },

        loadFromStorage: () => {
          try {
            // Load auth method
            const savedMethod = localStorage.getItem('youtube_auth_method') as YouTubeAuthMethod;
            if (savedMethod) {
              set((draft) => {
                draft.method = savedMethod;
              });
            }

            // Load API keys
            const savedKeys = localStorage.getItem(YOUTUBE_STORAGE_KEYS.API_KEYS);
            const activeKeyId = localStorage.getItem('youtube_active_api_key');
            
            if (savedKeys) {
              const parsedKeys = JSON.parse(savedKeys);
              set((draft) => {
                draft.apiKeys = parsedKeys;
                draft.activeApiKeyId = activeKeyId || (parsedKeys.length > 0 ? parsedKeys[0].id : null);
              });
            }

            // Load OAuth state
            const user = googleAuthService.getStoredUser();
            const isAuthenticated = googleAuthService.isAuthenticated();
            
            if (user && isAuthenticated) {
              set((draft) => {
                draft.user = user;
                draft.isAuthenticated = true;
              });
            }

            console.log('✅ YouTube auth state loaded from storage');
          } catch (error) {
            console.error('Failed to load YouTube auth state:', error);
          }
        },
      }))
    ),
    { name: 'youtube-auth-store' }
  )
);

// Initialize store on creation
useYouTubeAuthStore.getState().loadFromStorage();
