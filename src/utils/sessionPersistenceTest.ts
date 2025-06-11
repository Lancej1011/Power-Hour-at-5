/**
 * Session Persistence Test Utility
 * 
 * This utility provides functions to test the persistent login session functionality.
 * It can be used in the browser console or imported for testing purposes.
 */

import { useAuthStore } from '../stores/authStore';
import { validateSession, isSessionValid, SESSION_CONFIG } from './authUtils';

// Test interface for session persistence
export interface SessionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test if session data is properly saved to localStorage
 */
export const testSessionPersistence = (): SessionTestResult => {
  try {
    const state = useAuthStore.getState();
    
    if (!state.user) {
      return {
        success: false,
        message: 'No authenticated user found. Please sign in first.',
      };
    }

    // Check if session data exists in localStorage
    const authStateData = localStorage.getItem('phat5_auth_state');
    if (!authStateData) {
      return {
        success: false,
        message: 'No auth state found in localStorage',
      };
    }

    const parsedAuthState = JSON.parse(authStateData);
    const hasRequiredFields = !!(
      parsedAuthState.sessionId &&
      parsedAuthState.sessionToken &&
      parsedAuthState.sessionExpiry &&
      parsedAuthState.userId
    );

    if (!hasRequiredFields) {
      return {
        success: false,
        message: 'Auth state missing required session fields',
        details: parsedAuthState,
      };
    }

    // Validate session
    const sessionValidation = validateSession({
      sessionId: parsedAuthState.sessionId,
      sessionExpiry: new Date(parsedAuthState.sessionExpiry),
      sessionToken: parsedAuthState.sessionToken,
      userId: parsedAuthState.userId,
      lastActivity: parsedAuthState.lastActivity ? new Date(parsedAuthState.lastActivity) : null,
    });

    return {
      success: sessionValidation.isValid,
      message: sessionValidation.isValid 
        ? 'Session persistence test passed! Session data is valid and properly stored.'
        : `Session validation failed: ${sessionValidation.reason}`,
      details: {
        sessionData: parsedAuthState,
        validation: sessionValidation,
        currentUser: {
          uid: state.user.uid,
          email: state.user.email,
          isAnonymous: state.user.isAnonymous,
        },
      },
    };

  } catch (error) {
    return {
      success: false,
      message: `Session persistence test failed: ${error}`,
      details: error,
    };
  }
};

/**
 * Test session restoration after simulated app restart
 */
export const testSessionRestoration = async (): Promise<SessionTestResult> => {
  try {
    const store = useAuthStore.getState();
    
    // Save current state
    const originalUser = store.user;
    const originalSessionId = store.sessionId;
    
    if (!originalUser) {
      return {
        success: false,
        message: 'No authenticated user found. Please sign in first.',
      };
    }

    console.log('🧪 Testing session restoration...');
    
    // Simulate app restart by clearing store state (but not localStorage)
    useAuthStore.setState({
      user: null,
      profile: null,
      preferences: null,
      sessionId: null,
      sessionToken: null,
      sessionExpiry: null,
      lastActivity: null,
      status: 'loading',
      authMethod: 'none',
    });

    // Attempt to restore session
    const restoredUser = await store.restoreSession();
    
    if (!restoredUser) {
      return {
        success: false,
        message: 'Session restoration failed - no user restored',
      };
    }

    const newState = useAuthStore.getState();
    const sessionRestored = !!(
      newState.user &&
      newState.sessionId &&
      newState.sessionExpiry &&
      newState.user.uid === originalUser.uid
    );

    return {
      success: sessionRestored,
      message: sessionRestored 
        ? 'Session restoration test passed! User session was successfully restored.'
        : 'Session restoration test failed - session data incomplete',
      details: {
        originalUser: {
          uid: originalUser.uid,
          email: originalUser.email,
          sessionId: originalSessionId,
        },
        restoredUser: {
          uid: newState.user?.uid,
          email: newState.user?.email,
          sessionId: newState.sessionId,
        },
        sessionValid: newState.sessionExpiry ? isSessionValid(newState.sessionExpiry) : false,
      },
    };

  } catch (error) {
    return {
      success: false,
      message: `Session restoration test failed: ${error}`,
      details: error,
    };
  }
};

/**
 * Test session extension functionality
 */
export const testSessionExtension = (): SessionTestResult => {
  try {
    const state = useAuthStore.getState();
    
    if (!state.user || !state.sessionExpiry) {
      return {
        success: false,
        message: 'No authenticated user or session found.',
      };
    }

    const originalExpiry = new Date(state.sessionExpiry);
    
    // Trigger activity update
    useAuthStore.getState().updateActivity();
    
    const newState = useAuthStore.getState();
    const newExpiry = newState.sessionExpiry ? new Date(newState.sessionExpiry) : null;
    
    if (!newExpiry) {
      return {
        success: false,
        message: 'Session expiry was cleared during activity update',
      };
    }

    const wasExtended = newExpiry.getTime() >= originalExpiry.getTime();
    const timeRemaining = newExpiry.getTime() - Date.now();
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);

    return {
      success: wasExtended,
      message: wasExtended 
        ? `Session extension test passed! Session remains valid for ${hoursRemaining.toFixed(1)} hours.`
        : 'Session extension test failed - session was not extended',
      details: {
        originalExpiry: originalExpiry.toISOString(),
        newExpiry: newExpiry.toISOString(),
        wasExtended,
        hoursRemaining: hoursRemaining.toFixed(1),
        sessionConfig: SESSION_CONFIG,
      },
    };

  } catch (error) {
    return {
      success: false,
      message: `Session extension test failed: ${error}`,
      details: error,
    };
  }
};

/**
 * Run all session persistence tests
 */
export const runAllSessionTests = async (): Promise<{
  persistence: SessionTestResult;
  restoration: SessionTestResult;
  extension: SessionTestResult;
  overall: boolean;
}> => {
  console.log('🧪 Running comprehensive session persistence tests...');
  
  const persistence = testSessionPersistence();
  const restoration = await testSessionRestoration();
  const extension = testSessionExtension();
  
  const overall = persistence.success && restoration.success && extension.success;
  
  console.log('📊 Session Test Results:');
  console.log('  Persistence:', persistence.success ? '✅' : '❌', persistence.message);
  console.log('  Restoration:', restoration.success ? '✅' : '❌', restoration.message);
  console.log('  Extension:', extension.success ? '✅' : '❌', extension.message);
  console.log('  Overall:', overall ? '✅ All tests passed!' : '❌ Some tests failed');
  
  return {
    persistence,
    restoration,
    extension,
    overall,
  };
};

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).sessionTests = {
    testSessionPersistence,
    testSessionRestoration,
    testSessionExtension,
    runAllSessionTests,
  };
}
