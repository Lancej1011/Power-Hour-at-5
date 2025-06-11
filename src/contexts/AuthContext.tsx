/**
 * Authentication Context
 * React context provider for authentication state management
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  AuthContextType, 
  AuthUser, 
  UserProfile, 
  UserPreferences, 
  AuthError,
  AuthStatus,
  AuthEvent,
  AuthEventListener
} from '../types/auth';
import { useAuthStore, addAuthEventListener, removeAuthEventListener } from '../stores/authStore';

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the authentication context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Authentication provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children
}) => {
  // Subscribe to auth store state
  const {
    status,
    user,
    profile,
    preferences,
    isLoading,
    lastError,
    signInWithGoogle,
    signInAnonymously,
    signInWithEmail,
    createUserWithEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    updatePassword,
    linkAnonymousToEmail,
    canLinkAccount,
    signOut,
    updateProfile,
    updatePreferences,
    clearError,
    isAuthenticated,
    canAccessFeature,
    // Sync-related state and methods
    isSyncing,
    isOnline,
    lastSyncAt,
    getSyncStatus,
    hasPendingSync,
    forceSyncNow,
  } = useAuthStore();

  // Local state for context-specific functionality
  const [isInitialized, setIsInitialized] = useState(false);



  // Set up authentication event listeners
  useEffect(() => {
    const handleAuthEvent: AuthEventListener = (event: AuthEvent) => {
      // Handle specific events for production logging if needed
      switch (event.type) {
        case 'session-expired':
          // Could add user notification here
          break;
        case 'error':
          // Could add error reporting here
          break;
      }
    };

    addAuthEventListener(handleAuthEvent);

    return () => {
      removeAuthEventListener(handleAuthEvent);
    };
  }, []);

  // Initialize authentication when provider mounts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // The auth store handles initialization automatically
        // We just need to wait for it to complete
        const checkInitialization = () => {
          const currentStatus = useAuthStore.getState().status;
          if (currentStatus !== 'loading') {
            setIsInitialized(true);
          } else {
            // Check again in 100ms
            setTimeout(checkInitialization, 100);
          }
        };

        checkInitialization();
      } catch (error) {
        console.error('Failed to initialize auth context:', error);
        setIsInitialized(true); // Set as initialized even on error to prevent infinite loading
      }
    };

    initializeAuth();

    // Cleanup function to stop session monitoring when component unmounts
    return () => {
      const authStore = useAuthStore.getState();
      if (authStore.stopSessionMonitoring) {
        authStore.stopSessionMonitoring();
      }
    };
  }, []);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      useAuthStore.getState().setOnlineStatus(true);
    };

    const handleOffline = () => {
      useAuthStore.getState().setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up session refresh interval
  useEffect(() => {
    if (!isAuthenticated()) return;

    const refreshInterval = setInterval(() => {
      useAuthStore.getState().refreshSession();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated]);

  // Enhanced sign-in methods with context-specific handling
  const contextSignInWithGoogle = async (): Promise<AuthUser | null> => {
    try {
      const result = await signInWithGoogle();
      return result;
    } catch (error) {
      throw error;
    }
  };



  const contextSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      throw error;
    }
  };

  // Enhanced profile and preferences methods
  const contextUpdateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      await updateProfile(updates);
    } catch (error) {
      throw error;
    }
  };

  const contextUpdatePreferences = async (updates: Partial<UserPreferences>): Promise<void> => {
    try {
      await updatePreferences(updates);
    } catch (error) {
      throw error;
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
    status,
    user,
    profile,
    preferences,
    isLoading: isLoading || !isInitialized,
    isAuthenticated: isAuthenticated(),
    lastError,

    // Basic authentication actions
    signInWithGoogle: contextSignInWithGoogle,
    signInAnonymously,
    signInWithEmail,
    signOut: contextSignOut,

    // Email authentication actions
    createUserWithEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    updatePassword,

    // Account linking actions
    linkAnonymousToEmail,
    canLinkAccount,

    // Profile and preferences
    updateProfile: contextUpdateProfile,
    updatePreferences: contextUpdatePreferences,
    clearError,

    // Utility methods
    canAccessFeature,

    // Sync-related properties and methods
    isSyncing,
    isOnline,
    lastSyncAt,
    getSyncStatus,
    hasPendingSync,
    forceSyncNow,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for authentication requirements
interface WithAuthProps {
  requireAuth?: boolean;
  requireNonAnonymous?: boolean;
  fallback?: React.ComponentType;
  loadingComponent?: React.ComponentType;
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) => {
  const {
    requireAuth = false,
    requireNonAnonymous = false,
    fallback: Fallback,
    loadingComponent: LoadingComponent,
  } = options;

  return (props: P) => {
    const { status, user, isLoading } = useAuth();

    // Show loading component while initializing
    if (isLoading || status === 'loading') {
      if (LoadingComponent) {
        return <LoadingComponent />;
      }
      return <div>Loading...</div>;
    }

    // Check authentication requirements
    if (requireAuth && !user) {
      if (Fallback) {
        return <Fallback />;
      }
      return <div>Authentication required</div>;
    }

    // Check non-anonymous requirement
    if (requireNonAnonymous && user?.isAnonymous) {
      if (Fallback) {
        return <Fallback />;
      }
      return <div>Full account required</div>;
    }

    return <Component {...props} />;
  };
};

// Hook for authentication status checks
export const useAuthStatus = () => {
  const { status, isLoading, isAuthenticated, user } = useAuth();

  return {
    status,
    isLoading,
    isAuthenticated,
    isAnonymous: user?.isAnonymous || false,
    hasFullAccount: isAuthenticated && !user?.isAnonymous,
    canAccessCommunityFeatures: isAuthenticated && !user?.isAnonymous,
  };
};

// Hook for user profile management
export const useUserProfile = () => {
  const { profile, updateProfile, user } = useAuth();

  const isProfileComplete = profile && profile.username && profile.email;

  return {
    profile,
    updateProfile,
    isProfileComplete,
    canEditProfile: !!user,
  };
};

// Hook for user preferences management
export const useUserPreferences = () => {
  const { preferences, updatePreferences } = useAuth();

  return {
    preferences,
    updatePreferences,
    hasPreferences: !!preferences,
  };
};
