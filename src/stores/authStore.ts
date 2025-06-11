/**
 * Authentication Store
 * Global state management for user authentication using Zustand
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  AuthStore,
  AuthUser,
  UserProfile,
  UserPreferences,
  AuthError,
  AuthMethod,
  AuthStatus,
  AUTH_STORAGE_KEYS,
  DEFAULT_USER_PREFERENCES,
  AuthEvent,
  AuthEventListener
} from '../types/auth';
import { authService } from '../services/authService';
import { userDataService } from '../services/userDataService';
import {
  generateSessionId,
  generateSessionToken,
  calculateSessionExpiry,
  isSessionValid,
  validateSession,
  shouldRefreshSession,
  extendSessionExpiry,
  convertFirebaseUserToAuthUser,
  createUserProfileFromFirebaseUser,
  createAuthError,
  convertFirebaseAuthError,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearAuthLocalStorage,
  mergeUserPreferences,
  canUserAccessFeature,
  createAuthEvent,
  isOnline
} from '../utils/authUtils';

// Default authentication state
const defaultAuthState = {
  // Core authentication state
  status: 'loading' as AuthStatus,
  user: null,
  profile: null,
  preferences: null,
  
  // Authentication methods and capabilities
  authMethod: 'none' as AuthMethod,
  isFirebaseAvailable: false,
  canSignIn: false,
  
  // Session management
  sessionId: null,
  sessionToken: null,
  lastActivity: null,
  sessionExpiry: null,
  
  // Loading and error states
  isLoading: true,
  isSigningIn: false,
  isSigningOut: false,
  isSyncing: false,
  lastError: null,
  
  // Sync and offline state
  isOnline: isOnline(),
  lastSyncAt: null,
  pendingSyncData: [],
  
  // Local storage fallback
  localStorageEnabled: true,
  localUserData: null,
};

// Event listeners for authentication events
const authEventListeners: AuthEventListener[] = [];

// Helper function to create a new session
const createNewSession = (userId: string) => {
  const sessionId = generateSessionId();
  const sessionExpiry = calculateSessionExpiry();
  const sessionToken = generateSessionToken(sessionId, userId);
  const lastActivity = new Date();

  return {
    sessionId,
    sessionToken,
    sessionExpiry,
    lastActivity,
  };
};

// Helper function to update user activity and extend session if needed
const updateUserActivity = (state: any, userId: string) => {
  const now = new Date();

  // Always update last activity
  state.lastActivity = now;

  // Check if session should be refreshed/extended
  if (shouldRefreshSession(state.sessionExpiry)) {
    console.log('🔄 Extending session due to user activity');
    state.sessionExpiry = extendSessionExpiry(state.sessionExpiry);

    // Regenerate session token for extended session
    if (state.sessionId) {
      state.sessionToken = generateSessionToken(state.sessionId, userId);
    }
  }
};

// Helper function to initialize collaboration features after authentication
const initializeCollaborationFeatures = async () => {
  try {
    // Use dynamic import to avoid circular dependency
    const { useCollaborationStore } = await import('./collaborationStore');
    const collaborationStore = useCollaborationStore.getState();

    if (collaborationStore && collaborationStore.initialize) {
      console.log('🤝 Initializing collaboration features...');
      await collaborationStore.initialize();
      console.log('✅ Collaboration features initialized');
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize collaboration features:', error);
  }
};

// Create the authentication store
export const useAuthStore = create<AuthStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...defaultAuthState,

        // Sign-in methods
        signInWithGoogle: async () => {
          const state = get();
          if (state.isSigningIn) return null;

          set((draft) => {
            draft.isSigningIn = true;
            draft.lastError = null;
            draft.status = 'loading';
          });

          try {
            const firebaseUser = await authService.signInWithGoogle();
            if (!firebaseUser) {
              throw new Error('Google sign-in failed');
            }

            // Get or create user profile
            let profile = await authService.getUserProfile();
            if (!profile) {
              const profileData = createUserProfileFromFirebaseUser(firebaseUser, 'google');
              await authService.createOrUpdateUserProfile(firebaseUser, false);
              profile = await authService.getUserProfile();
            }

            // Load user preferences from Firestore or use defaults
            let preferences = await userDataService.loadUserPreferences();
            if (!preferences) {
              preferences = mergeUserPreferences(null);
            }

            // Create AuthUser
            const authUser = convertFirebaseUserToAuthUser(firebaseUser, profile || undefined, preferences);

            // Create new session
            const sessionData = createNewSession(firebaseUser.uid);

            // Update state
            set((draft) => {
              draft.user = authUser;
              draft.profile = profile;
              draft.preferences = preferences;
              draft.authMethod = 'google';
              draft.status = 'authenticated';
              draft.sessionId = sessionData.sessionId;
              draft.sessionToken = sessionData.sessionToken;
              draft.sessionExpiry = sessionData.sessionExpiry;
              draft.lastActivity = sessionData.lastActivity;
              draft.isSigningIn = false;
            });

            // Save to localStorage
            get().saveToLocalStorage();

            // Start session monitoring
            get().startSessionMonitoring();

            // Start background sync
            userDataService.syncAllUserData().catch(error => {
              console.warn('Background sync failed:', error);
            });

            // Initialize collaboration features
            initializeCollaborationFeatures().catch(error => {
              console.warn('Collaboration initialization failed:', error);
            });

            // Emit event
            const event = createAuthEvent('sign-in', authUser);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Google sign-in successful');
            return authUser;

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            
            set((draft) => {
              draft.lastError = authError;
              draft.status = 'error';
              draft.isSigningIn = false;
            });


            throw error;
          }
        },

        signInAnonymously: async () => {
          const state = get();
          if (state.isSigningIn) return null;

          set((draft) => {
            draft.isSigningIn = true;
            draft.lastError = null;
            draft.status = 'loading';
          });

          try {
            const firebaseUser = await authService.signInAnonymously();
            if (!firebaseUser) {
              throw new Error('Anonymous sign-in failed');
            }

            // Get or create user profile
            let profile = await authService.getUserProfile();
            if (!profile) {
              const profileData = createUserProfileFromFirebaseUser(firebaseUser, 'anonymous');
              await authService.createOrUpdateUserProfile(firebaseUser, true);
              profile = await authService.getUserProfile();
            }

            // Load user preferences from Firestore or use defaults
            let preferences = await userDataService.loadUserPreferences();
            if (!preferences) {
              preferences = mergeUserPreferences(null);
            }

            // Create AuthUser
            const authUser = convertFirebaseUserToAuthUser(firebaseUser, profile || undefined, preferences);

            // Create new session
            const sessionData = createNewSession(firebaseUser.uid);

            // Update state
            set((draft) => {
              draft.user = authUser;
              draft.profile = profile;
              draft.preferences = preferences;
              draft.authMethod = 'anonymous';
              draft.status = 'authenticated';
              draft.sessionId = sessionData.sessionId;
              draft.sessionToken = sessionData.sessionToken;
              draft.sessionExpiry = sessionData.sessionExpiry;
              draft.lastActivity = sessionData.lastActivity;
              draft.isSigningIn = false;
            });

            // Save to localStorage
            get().saveToLocalStorage();

            // Start session monitoring
            get().startSessionMonitoring();

            // Emit event
            const event = createAuthEvent('sign-in', authUser);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Anonymous sign-in successful');
            return authUser;

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);

            set((draft) => {
              draft.lastError = authError;
              draft.status = 'error';
              draft.isSigningIn = false;
            });

            console.error('❌ Anonymous sign-in failed:', error);
            throw error;
          }
        },

        signInWithEmail: async (email: string, password: string) => {
          const state = get();
          if (state.isSigningIn) return null;

          set((draft) => {
            draft.isSigningIn = true;
            draft.lastError = null;
            draft.status = 'loading';
          });

          try {
            const firebaseUser = await authService.signInWithEmailAndPassword(email, password);
            if (!firebaseUser) {
              throw new Error('Email sign-in failed');
            }

            // Get or create user profile
            let profile = await authService.getUserProfile();
            if (!profile) {
              const profileData = createUserProfileFromFirebaseUser(firebaseUser, 'email');
              await authService.updateUserProfile(profileData);
              profile = await authService.getUserProfile();
            }

            // Load user preferences from Firestore or use defaults
            let preferences = await userDataService.loadUserPreferences();
            if (!preferences) {
              preferences = mergeUserPreferences(null);
            }

            // Create AuthUser
            const authUser = convertFirebaseUserToAuthUser(firebaseUser, profile || undefined, preferences);

            // Create new session
            const sessionData = createNewSession(firebaseUser.uid);

            // Update state
            set((draft) => {
              draft.user = authUser;
              draft.profile = profile;
              draft.preferences = preferences;
              draft.authMethod = 'email';
              draft.status = 'authenticated';
              draft.sessionId = sessionData.sessionId;
              draft.sessionToken = sessionData.sessionToken;
              draft.sessionExpiry = sessionData.sessionExpiry;
              draft.lastActivity = sessionData.lastActivity;
              draft.isSigningIn = false;
            });

            // Save to localStorage
            get().saveToLocalStorage();

            // Start session monitoring
            get().startSessionMonitoring();

            // Start background sync
            userDataService.syncAllUserData().catch(error => {
              console.warn('Background sync failed:', error);
            });

            // Initialize collaboration features
            initializeCollaborationFeatures().catch(error => {
              console.warn('Collaboration initialization failed:', error);
            });

            // Emit event
            const event = createAuthEvent('sign-in', authUser);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Email sign-in successful');
            return authUser;

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);

            set((draft) => {
              draft.lastError = authError;
              draft.status = 'error';
              draft.isSigningIn = false;
            });


            throw error;
          }
        },

        // Email authentication methods
        createUserWithEmail: async (email: string, password: string, displayName?: string) => {
          const state = get();
          if (state.isSigningIn) return null;

          set((draft) => {
            draft.isSigningIn = true;
            draft.lastError = null;
            draft.status = 'loading';
          });

          try {
            const firebaseUser = await authService.createUserWithEmailAndPassword(email, password, displayName);
            if (!firebaseUser) {
              throw new Error('Account creation failed');
            }

            // Create user profile
            const profileData = createUserProfileFromFirebaseUser(firebaseUser, 'email');
            await authService.updateUserProfile(profileData);
            const profile = await authService.getUserProfile();

            // Create default preferences
            const preferences = mergeUserPreferences(null);
            await userDataService.syncUserPreferences(preferences);

            // Create AuthUser
            const authUser = convertFirebaseUserToAuthUser(firebaseUser, profile || undefined, preferences);

            // Create new session
            const sessionData = createNewSession(firebaseUser.uid);

            // Update state
            set((draft) => {
              draft.user = authUser;
              draft.profile = profile;
              draft.preferences = preferences;
              draft.authMethod = 'email';
              draft.status = 'authenticated';
              draft.sessionId = sessionData.sessionId;
              draft.sessionToken = sessionData.sessionToken;
              draft.sessionExpiry = sessionData.sessionExpiry;
              draft.lastActivity = sessionData.lastActivity;
              draft.isSigningIn = false;
            });

            // Save to localStorage
            get().saveToLocalStorage();

            // Start session monitoring
            get().startSessionMonitoring();

            // Start background sync
            userDataService.syncAllUserData().catch(error => {
              console.warn('Background sync failed:', error);
            });

            // Initialize collaboration features
            initializeCollaborationFeatures().catch(error => {
              console.warn('Collaboration initialization failed:', error);
            });

            // Emit event
            const event = createAuthEvent('sign-in', authUser);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Account created and signed in successfully');
            return authUser;

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);

            set((draft) => {
              draft.lastError = authError;
              draft.status = 'error';
              draft.isSigningIn = false;
            });


            throw error;
          }
        },

        sendPasswordResetEmail: async (email: string) => {
          try {
            await authService.sendPasswordResetEmail(email);

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            set((draft) => {
              draft.lastError = authError;
            });

            throw error;
          }
        },

        sendEmailVerification: async () => {
          try {
            await authService.sendEmailVerification();
            console.log('✅ Email verification sent');
          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            set((draft) => {
              draft.lastError = authError;
            });
            console.error('❌ Failed to send email verification:', error);
            throw error;
          }
        },

        updatePassword: async (currentPassword: string, newPassword: string) => {
          try {
            await authService.updatePassword(currentPassword, newPassword);
            console.log('✅ Password updated successfully');
          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            set((draft) => {
              draft.lastError = authError;
            });
            console.error('❌ Failed to update password:', error);
            throw error;
          }
        },

        linkAnonymousToEmail: async (email: string, password: string) => {
          const state = get();
          if (!state.user || !state.user.isAnonymous) {
            throw new Error('Cannot link account - user is not anonymous');
          }

          try {
            const firebaseUser = await authService.linkAnonymousToEmail(email, password);
            if (!firebaseUser) {
              throw new Error('Account linking failed');
            }

            // Update user profile
            const profileData = createUserProfileFromFirebaseUser(firebaseUser, 'email');
            await authService.updateUserProfile(profileData);
            const profile = await authService.getUserProfile();

            // Create AuthUser
            const authUser = convertFirebaseUserToAuthUser(firebaseUser, profile || undefined, state.preferences);

            // Update state
            set((draft) => {
              draft.user = authUser;
              draft.profile = profile;
              draft.authMethod = 'email';
            });

            // Save to localStorage
            get().saveToLocalStorage();

            // Sync data
            userDataService.syncAllUserData().catch(error => {
              console.warn('Background sync failed:', error);
            });

            console.log('✅ Account linked successfully');
            return authUser;

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            set((draft) => {
              draft.lastError = authError;
            });
            console.error('❌ Account linking failed:', error);
            throw error;
          }
        },

        canLinkAccount: () => {
          const state = get();
          return authService.canLinkAccount() && !!state.user?.isAnonymous;
        },

        // Sign-out and session management
        signOut: async () => {
          const state = get();
          if (state.isSigningOut) return;

          set((draft) => {
            draft.isSigningOut = true;
            draft.lastError = null;
          });

          try {
            const currentUser = state.user;

            // Stop session monitoring
            get().stopSessionMonitoring();

            // Sign out from Firebase
            await authService.signOut();

            // Clear state
            set((draft) => {
              draft.user = null;
              draft.profile = null;
              draft.preferences = null;
              draft.authMethod = 'none';
              draft.status = 'unauthenticated';
              draft.sessionId = null;
              draft.sessionToken = null;
              draft.sessionExpiry = null;
              draft.lastActivity = null;
              draft.isSigningOut = false;
              draft.lastSyncAt = null;
              draft.pendingSyncData = [];
            });

            // Clear localStorage
            clearAuthLocalStorage();

            // Emit event
            const event = createAuthEvent('sign-out', currentUser);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Sign-out successful');

          } catch (error: any) {
            const authError = convertFirebaseAuthError(error);
            
            set((draft) => {
              draft.lastError = authError;
              draft.isSigningOut = false;
            });

            console.error('❌ Sign-out failed:', error);
            throw error;
          }
        },

        refreshSession: async () => {
          const state = get();
          if (!state.user || !state.sessionExpiry) return;

          // Validate current session with enhanced validation
          const sessionValidation = validateSession({
            sessionId: state.sessionId,
            sessionExpiry: state.sessionExpiry,
            sessionToken: state.sessionToken,
            userId: state.user.uid,
            lastActivity: state.lastActivity,
          });

          if (sessionValidation.isValid) {
            // Session is valid, update activity and extend if needed
            set((draft) => {
              updateUserActivity(draft, state.user!.uid);
            });
            get().saveToLocalStorage();
            return;
          }

          console.log(`🔄 Session validation failed: ${sessionValidation.reason}`);

          // Session validation failed, try to refresh with Firebase
          try {
            const currentUser = authService.getCurrentUser();
            if (currentUser && currentUser.uid === state.user.uid) {
              console.log('🔄 Refreshing session with Firebase user');

              // Create new session
              const sessionData = createNewSession(currentUser.uid);

              set((draft) => {
                draft.sessionId = sessionData.sessionId;
                draft.sessionToken = sessionData.sessionToken;
                draft.sessionExpiry = sessionData.sessionExpiry;
                draft.lastActivity = sessionData.lastActivity;
              });

              get().saveToLocalStorage();
              console.log('✅ Session refreshed successfully');
            } else {
              // User is no longer authenticated or user mismatch
              console.log('❌ Firebase user mismatch or not authenticated, signing out');
              await get().signOut();
            }
          } catch (error) {
            console.error('Failed to refresh session:', error);
            await get().signOut();
          }
        },

        validateSession: async () => {
          const state = get();
          if (!state.user) return false;

          const sessionValidation = validateSession({
            sessionId: state.sessionId,
            sessionExpiry: state.sessionExpiry,
            sessionToken: state.sessionToken,
            userId: state.user.uid,
            lastActivity: state.lastActivity,
          });

          return sessionValidation.isValid;
        },

        // Add method to update user activity (for manual activity tracking)
        updateActivity: () => {
          const state = get();
          if (!state.user) return;

          set((draft) => {
            updateUserActivity(draft, state.user!.uid);
          });

          // Save updated activity to localStorage
          get().saveToLocalStorage();
        },

        // Set up periodic session refresh and activity tracking
        startSessionMonitoring: () => {
          // Clear any existing interval
          if (typeof window !== 'undefined' && (window as any).authSessionInterval) {
            clearInterval((window as any).authSessionInterval);
          }

          // Set up periodic session validation and refresh (every 5 minutes)
          if (typeof window !== 'undefined') {
            (window as any).authSessionInterval = setInterval(async () => {
              const state = get();
              if (state.user && state.status === 'authenticated') {
                try {
                  await get().refreshSession();
                } catch (error) {
                  console.error('Periodic session refresh failed:', error);
                }
              }
            }, 5 * 60 * 1000); // 5 minutes
          }

          // Set up activity listeners for automatic session extension
          if (typeof window !== 'undefined') {
            const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
            let lastActivityUpdate = 0;

            const handleActivity = () => {
              const now = Date.now();
              // Throttle activity updates to once per minute
              if (now - lastActivityUpdate > 60 * 1000) {
                lastActivityUpdate = now;
                const state = get();
                if (state.user && state.status === 'authenticated') {
                  get().updateActivity();
                }
              }
            };

            // Remove existing listeners
            activityEvents.forEach(event => {
              window.removeEventListener(event, handleActivity, true);
            });

            // Add new listeners
            activityEvents.forEach(event => {
              window.addEventListener(event, handleActivity, true);
            });
          }
        },

        // Stop session monitoring
        stopSessionMonitoring: () => {
          if (typeof window !== 'undefined' && (window as any).authSessionInterval) {
            clearInterval((window as any).authSessionInterval);
            (window as any).authSessionInterval = null;
          }
        },

        // User profile management
        updateProfile: async (updates: Partial<UserProfile>) => {
          const state = get();
          if (!state.user || !state.profile) {
            throw new Error('No authenticated user to update');
          }

          try {
            const updatedProfile = { ...state.profile, ...updates };

            set((draft) => {
              draft.profile = updatedProfile;
              draft.isSyncing = true;
            });

            // Save to localStorage first
            get().saveToLocalStorage();

            // Sync to Firestore
            const syncSuccess = await userDataService.syncUserProfile(updatedProfile);
            if (!syncSuccess) {
              console.warn('Profile sync to Firestore failed, saved locally');
            }

            set((draft) => {
              draft.isSyncing = false;
            });

            // Emit event
            const event = createAuthEvent('profile-updated', state.user, updates);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Profile updated successfully');

          } catch (error: any) {
            set((draft) => {
              draft.isSyncing = false;
              draft.lastError = createAuthError('profile-update-failed', 'Failed to update profile', error);
            });
            throw error;
          }
        },

        updatePreferences: async (updates: Partial<UserPreferences>) => {
          const state = get();
          if (!state.preferences) return;

          try {
            const updatedPreferences = mergeUserPreferences({ ...state.preferences, ...updates });

            set((draft) => {
              draft.preferences = updatedPreferences;
              draft.isSyncing = true;
            });

            // Save to localStorage first
            get().saveToLocalStorage();

            // Sync to Firestore
            const syncSuccess = await userDataService.syncUserPreferences(updatedPreferences);
            if (!syncSuccess) {
              console.warn('Preferences sync to Firestore failed, saved locally');
            }

            set((draft) => {
              draft.isSyncing = false;
            });

            // Emit event
            const event = createAuthEvent('preferences-updated', state.user, updates);
            authEventListeners.forEach(listener => listener(event));

            console.log('✅ Preferences updated successfully');

          } catch (error: any) {
            set((draft) => {
              draft.isSyncing = false;
              draft.lastError = createAuthError('preferences-update-failed', 'Failed to update preferences', error);
            });
            throw error;
          }
        },

        syncUserData: async () => {
          const state = get();
          if (!state.user) {
            console.warn('No authenticated user - cannot sync data');
            return;
          }

          try {
            set((draft) => {
              draft.isSyncing = true;
            });

            console.log('🔄 Starting user data sync...');
            const syncResult = await userDataService.syncAllUserData();

            if (syncResult.success) {
              // Reload data from localStorage after sync
              get().loadFromLocalStorage();

              set((draft) => {
                draft.lastSyncAt = new Date();
                draft.pendingSyncData = [];
              });

              console.log('✅ User data sync completed successfully');
            } else {
              console.warn('⚠️ User data sync completed with errors:', syncResult.errors);
              set((draft) => {
                draft.lastError = createAuthError('sync-partial-failure', 'Some data failed to sync', syncResult.errors);
              });
            }

          } catch (error: any) {

            set((draft) => {
              draft.lastError = createAuthError('sync-failed', 'Failed to sync user data', error);
            });
          } finally {
            set((draft) => {
              draft.isSyncing = false;
            });
          }
        },

        // Error handling
        clearError: () => {
          set((draft) => {
            draft.lastError = null;
          });
        },

        handleAuthError: (error: any) => {
          const authError = convertFirebaseAuthError(error);
          set((draft) => {
            draft.lastError = authError;
            if (authError.code === 'auth/network-request-failed') {
              draft.isOnline = false;
            }
          });
        },

        // Session and state management
        initializeAuth: async () => {
          console.log('🚀 Initializing authentication...');

          set((draft) => {
            draft.isLoading = true;
            draft.status = 'loading';
            draft.isFirebaseAvailable = authService.isFirebaseAvailable();
            draft.canSignIn = authService.isFirebaseAvailable();
            draft.isOnline = isOnline();
          });

          try {
            // Set up auth state listener BEFORE attempting session restoration
            // This ensures we catch any Firebase auth state changes during initialization
            authService.onAuthStateChanged(async (user) => {
              const state = get();
              console.log('🔄 Firebase auth state changed:', {
                firebaseUser: user ? 'exists' : 'none',
                currentStoreUser: state.user ? 'exists' : 'none',
                userMatch: user && state.user ? user.uid === state.user.uid : false,
                initializationComplete: !state.isLoading,
              });

              // Only handle auth state changes after initialization is complete
              if (state.isLoading) {
                console.log('⏳ Initialization in progress, deferring auth state change handling');
                return;
              }

              if (user) {
                // User signed in elsewhere or Firebase restored session
                if (!state.user || state.user.uid !== user.uid) {
                  console.log('🔄 Auth state changed - new user signed in, restoring session');
                  try {
                    await get().restoreSession();
                  } catch (error) {
                    console.error('Failed to restore session from auth state change:', error);
                  }
                } else {
                  // Same user, just update activity
                  console.log('🔄 Auth state confirmed for current user');
                  get().updateActivity();
                }
              } else {
                // User signed out elsewhere
                if (state.user) {
                  console.log('🔄 Auth state changed - user signed out elsewhere');
                  await get().signOut();
                }
              }
            });

            // Wait a brief moment for Firebase to initialize its auth state
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to restore session
            console.log('🔄 Attempting to restore existing session...');
            const restoredUser = await get().restoreSession();

            if (!restoredUser) {
              console.log('📤 No session to restore, setting status to unauthenticated');
              set((draft) => {
                draft.status = 'unauthenticated';
              });
            }

            // Start session monitoring for authenticated users
            if (restoredUser) {
              get().startSessionMonitoring();
            }

          } catch (error) {
            console.error('❌ Failed to initialize auth:', error);
            set((draft) => {
              draft.status = 'error';
              draft.lastError = createAuthError('init-failed', 'Failed to initialize authentication', error);
            });
          } finally {
            set((draft) => {
              draft.isLoading = false;
            });
            console.log('✅ Authentication initialization complete');
          }
        },

        restoreSession: async () => {
          try {
            console.log('🔄 Starting session restoration...');

            // Load from localStorage first
            get().loadFromLocalStorage();
            const state = get();

            // Check if Firebase user exists first
            const currentUser = authService.getCurrentUser();
            console.log('🔥 Firebase current user:', currentUser ? 'exists' : 'none');

            // Enhanced session validation
            const sessionValidation = validateSession({
              sessionId: state.sessionId,
              sessionExpiry: state.sessionExpiry,
              sessionToken: state.sessionToken,
              userId: currentUser?.uid,
              lastActivity: state.lastActivity,
            });

            console.log('📱 Session validation result:', {
              hasSessionId: !!state.sessionId,
              hasSessionExpiry: !!state.sessionExpiry,
              hasSessionToken: !!state.sessionToken,
              authMethod: state.authMethod,
              isValid: sessionValidation.isValid,
              reason: sessionValidation.reason,
              firebaseUserExists: !!currentUser,
            });

            if (currentUser && sessionValidation.isValid) {
              console.log('✅ Session is valid, restoring user state...');

              // Session is valid, restore user state
              const profile = await authService.getUserProfile();

              // Load preferences from Firestore or use local/defaults
              let preferences = await userDataService.loadUserPreferences();
              if (!preferences) {
                preferences = mergeUserPreferences(state.preferences);
              }

              const authUser = convertFirebaseUserToAuthUser(currentUser, profile || undefined, preferences);

              set((draft) => {
                draft.user = authUser;
                draft.profile = profile;
                draft.preferences = preferences;
                draft.status = 'authenticated';
                draft.authMethod = currentUser.isAnonymous ? 'anonymous' : (currentUser.providerData.length > 0 ? 'google' : 'email');

                // Update activity and extend session if needed
                updateUserActivity(draft, currentUser.uid);
              });

              // Save updated state
              get().saveToLocalStorage();

              // Start session monitoring
              get().startSessionMonitoring();

              // Initialize collaboration features
              initializeCollaborationFeatures().catch(error => {
                console.warn('Collaboration initialization failed during session restore:', error);
              });

              // Emit event
              const event = createAuthEvent('session-restored', authUser);
              authEventListeners.forEach(listener => listener(event));

              console.log('✅ Session restored successfully for user:', authUser.email || authUser.uid);
              return authUser;

            } else if (currentUser && !sessionValidation.isValid) {
              // Firebase user exists but session is invalid - create new session
              console.log(`🔄 Session invalid (${sessionValidation.reason}), creating new session for Firebase user`);

              const profile = await authService.getUserProfile();
              let preferences = await userDataService.loadUserPreferences();
              if (!preferences) {
                preferences = mergeUserPreferences(state.preferences);
              }

              const authUser = convertFirebaseUserToAuthUser(currentUser, profile || undefined, preferences);
              const sessionData = createNewSession(currentUser.uid);

              set((draft) => {
                draft.user = authUser;
                draft.profile = profile;
                draft.preferences = preferences;
                draft.status = 'authenticated';
                draft.authMethod = currentUser.isAnonymous ? 'anonymous' : (currentUser.providerData.length > 0 ? 'google' : 'email');
                draft.sessionId = sessionData.sessionId;
                draft.sessionToken = sessionData.sessionToken;
                draft.sessionExpiry = sessionData.sessionExpiry;
                draft.lastActivity = sessionData.lastActivity;
              });

              get().saveToLocalStorage();

              // Start session monitoring
              get().startSessionMonitoring();

              // Initialize collaboration features
              initializeCollaborationFeatures().catch(error => {
                console.warn('Collaboration initialization failed during new session creation:', error);
              });

              const event = createAuthEvent('session-restored', authUser);
              authEventListeners.forEach(listener => listener(event));

              console.log('✅ New session created for existing Firebase user:', authUser.email || authUser.uid);
              return authUser;

            } else {
              // No Firebase user or session validation failed
              if (state.sessionExpiry) {
                console.log('⚠️ Local session exists but no valid Firebase user - clearing session');
                get().clearLocalStorage();
              }

              console.log('📤 No authenticated user found, setting status to unauthenticated');
              set((draft) => {
                draft.status = 'unauthenticated';
              });
              return null;
            }

          } catch (error) {
            console.error('❌ Failed to restore session:', error);
            set((draft) => {
              draft.status = 'unauthenticated';
              draft.lastError = createAuthError('session-restore-failed', 'Failed to restore session', error);
            });
            return null;
          }
        },

        setOnlineStatus: (isOnline: boolean) => {
          const wasOffline = !get().isOnline;

          set((draft) => {
            draft.isOnline = isOnline;
          });

          // If we just came back online and have a user, try to sync
          if (isOnline && wasOffline && get().user) {
            console.log('🔄 Back online - starting sync...');
            get().syncUserData().catch(error => {
              console.warn('Auto-sync after coming online failed:', error);
            });
          }
        },

        // Local storage management
        saveToLocalStorage: () => {
          const state = get();
          if (!state.localStorageEnabled) return;

          try {
            // Save core auth state
            saveToLocalStorage(AUTH_STORAGE_KEYS.AUTH_STATE, {
              sessionId: state.sessionId,
              sessionToken: state.sessionToken,
              sessionExpiry: state.sessionExpiry,
              lastActivity: state.lastActivity,
              authMethod: state.authMethod,
              userId: state.user?.uid, // Add user ID for validation
            });

            // Save user profile
            if (state.profile) {
              saveToLocalStorage(AUTH_STORAGE_KEYS.USER_PROFILE, state.profile);
            }

            // Save user preferences
            if (state.preferences) {
              saveToLocalStorage(AUTH_STORAGE_KEYS.USER_PREFERENCES, state.preferences);
            }

            // Save last sync time
            saveToLocalStorage(AUTH_STORAGE_KEYS.LAST_SYNC, state.lastSyncAt);

            console.log('💾 Auth state saved to localStorage');

          } catch (error) {
            console.error('❌ Failed to save auth state to localStorage:', error);
          }
        },

        loadFromLocalStorage: () => {
          if (!get().localStorageEnabled) return;

          try {
            const authState = loadFromLocalStorage<any>(AUTH_STORAGE_KEYS.AUTH_STATE);
            const profile = loadFromLocalStorage<UserProfile>(AUTH_STORAGE_KEYS.USER_PROFILE);
            const preferences = loadFromLocalStorage<UserPreferences>(AUTH_STORAGE_KEYS.USER_PREFERENCES);
            const lastSyncAt = loadFromLocalStorage<Date>(AUTH_STORAGE_KEYS.LAST_SYNC);

            set((draft) => {
              if (authState) {
                draft.sessionId = authState.sessionId;
                draft.sessionToken = authState.sessionToken;
                draft.sessionExpiry = authState.sessionExpiry ? new Date(authState.sessionExpiry) : null;
                draft.lastActivity = authState.lastActivity ? new Date(authState.lastActivity) : null;
                draft.authMethod = authState.authMethod || 'none';
              }
              
              if (profile) {
                draft.profile = profile;
              }
              
              if (preferences) {
                draft.preferences = mergeUserPreferences(preferences);
              }
              
              if (lastSyncAt) {
                draft.lastSyncAt = new Date(lastSyncAt);
              }
            });

          } catch (error) {
            console.error('Failed to load auth state from localStorage:', error);
          }
        },

        clearLocalStorage: () => {
          clearAuthLocalStorage();
        },

        // Utility methods
        getCurrentUser: () => {
          return get().user;
        },

        isAuthenticated: () => {
          const state = get();
          return state.status === 'authenticated' && !!state.user;
        },

        canAccessFeature: (feature: string) => {
          const state = get();
          return canUserAccessFeature(state.user, feature);
        },

        // Sync status and utilities
        getSyncStatus: () => {
          return userDataService.getSyncStatus();
        },

        hasPendingSync: () => {
          const syncStatus = userDataService.getSyncStatus();
          return syncStatus.pendingChanges;
        },

        forceSyncNow: async () => {
          const state = get();
          if (!state.user) {
            throw new Error('No authenticated user to sync');
          }

          return await get().syncUserData();
        },
      }))
    ),
    { name: 'auth-store' }
  )
);

// Event listener management
export const addAuthEventListener = (listener: AuthEventListener): void => {
  authEventListeners.push(listener);
};

export const removeAuthEventListener = (listener: AuthEventListener): void => {
  const index = authEventListeners.indexOf(listener);
  if (index > -1) {
    authEventListeners.splice(index, 1);
  }
};

// Initialize the store when it's created
// This will be called when the store is first imported
setTimeout(() => {
  useAuthStore.getState().initializeAuth();
}, 0);
