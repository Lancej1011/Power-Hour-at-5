/**
 * Session Persistence Demo
 * 
 * This file demonstrates how the persistent login sessions work.
 * It can be used for testing and understanding the session flow.
 */

import { useAuthStore } from '../stores/authStore';
import { SESSION_CONFIG } from './authUtils';

/**
 * Demo: Show current session information
 */
export const showSessionInfo = () => {
  const state = useAuthStore.getState();
  
  if (!state.user) {
    console.log('❌ No authenticated user');
    return;
  }

  const timeRemaining = state.sessionExpiry 
    ? Math.max(0, state.sessionExpiry.getTime() - Date.now())
    : 0;
  
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);
  const daysRemaining = hoursRemaining / 24;

  console.log('🔐 Current Session Information:');
  console.log('  User:', state.user.email || state.user.uid);
  console.log('  Auth Method:', state.authMethod);
  console.log('  Session ID:', state.sessionId);
  console.log('  Session Valid:', state.sessionExpiry ? new Date() < state.sessionExpiry : false);
  console.log('  Time Remaining:', `${daysRemaining.toFixed(1)} days (${hoursRemaining.toFixed(1)} hours)`);
  console.log('  Last Activity:', state.lastActivity?.toLocaleString() || 'Unknown');
  console.log('  Session Expiry:', state.sessionExpiry?.toLocaleString() || 'Unknown');
  console.log('  Session Token:', state.sessionToken ? 'Present' : 'Missing');
  
  return {
    user: state.user,
    sessionValid: state.sessionExpiry ? new Date() < state.sessionExpiry : false,
    hoursRemaining: hoursRemaining.toFixed(1),
    daysRemaining: daysRemaining.toFixed(1),
    lastActivity: state.lastActivity,
    sessionExpiry: state.sessionExpiry,
  };
};

/**
 * Demo: Show session configuration
 */
export const showSessionConfig = () => {
  console.log('⚙️ Session Configuration:');
  console.log('  Default Duration:', `${SESSION_CONFIG.DEFAULT_DURATION_HOURS / 24} days`);
  console.log('  Minimum Duration:', `${SESSION_CONFIG.MIN_DURATION_HOURS / 24} days`);
  console.log('  Maximum Duration:', `${SESSION_CONFIG.MAX_DURATION_HOURS / 24} days`);
  console.log('  Activity Extension:', `${SESSION_CONFIG.ACTIVITY_EXTENSION_HOURS / 24} days`);
  console.log('  Refresh Threshold:', `${SESSION_CONFIG.REFRESH_THRESHOLD_HOURS / 24} days`);
  
  return SESSION_CONFIG;
};

/**
 * Demo: Simulate user activity and show session extension
 */
export const simulateActivity = () => {
  const state = useAuthStore.getState();
  
  if (!state.user) {
    console.log('❌ No authenticated user');
    return;
  }

  console.log('🏃 Simulating user activity...');
  
  const beforeExpiry = state.sessionExpiry;
  const beforeActivity = state.lastActivity;
  
  // Trigger activity update
  useAuthStore.getState().updateActivity();
  
  const afterState = useAuthStore.getState();
  const afterExpiry = afterState.sessionExpiry;
  const afterActivity = afterState.lastActivity;
  
  console.log('  Before Activity:', beforeActivity?.toLocaleString());
  console.log('  After Activity:', afterActivity?.toLocaleString());
  console.log('  Before Expiry:', beforeExpiry?.toLocaleString());
  console.log('  After Expiry:', afterExpiry?.toLocaleString());
  
  const wasExtended = afterExpiry && beforeExpiry && afterExpiry.getTime() > beforeExpiry.getTime();
  console.log('  Session Extended:', wasExtended ? '✅ Yes' : '❌ No');
  
  return {
    wasExtended,
    beforeExpiry,
    afterExpiry,
    beforeActivity,
    afterActivity,
  };
};

/**
 * Demo: Show localStorage session data
 */
export const showStoredSessionData = () => {
  console.log('💾 Stored Session Data:');
  
  const authState = localStorage.getItem('phat5_auth_state');
  const userProfile = localStorage.getItem('phat5_user_profile');
  const userPreferences = localStorage.getItem('phat5_user_preferences');
  const lastSync = localStorage.getItem('phat5_last_sync');
  
  if (authState) {
    const parsed = JSON.parse(authState);
    console.log('  Auth State:', {
      sessionId: parsed.sessionId ? 'Present' : 'Missing',
      sessionToken: parsed.sessionToken ? 'Present' : 'Missing',
      sessionExpiry: parsed.sessionExpiry,
      lastActivity: parsed.lastActivity,
      authMethod: parsed.authMethod,
      userId: parsed.userId,
    });
  } else {
    console.log('  Auth State: Not found');
  }
  
  console.log('  User Profile:', userProfile ? 'Present' : 'Missing');
  console.log('  User Preferences:', userPreferences ? 'Present' : 'Missing');
  console.log('  Last Sync:', lastSync || 'Not found');
  
  return {
    authState: authState ? JSON.parse(authState) : null,
    userProfile: userProfile ? JSON.parse(userProfile) : null,
    userPreferences: userPreferences ? JSON.parse(userPreferences) : null,
    lastSync: lastSync ? JSON.parse(lastSync) : null,
  };
};

/**
 * Demo: Test session refresh
 */
export const testSessionRefresh = async () => {
  const state = useAuthStore.getState();
  
  if (!state.user) {
    console.log('❌ No authenticated user');
    return;
  }

  console.log('🔄 Testing session refresh...');
  
  const beforeState = {
    sessionId: state.sessionId,
    sessionExpiry: state.sessionExpiry,
    lastActivity: state.lastActivity,
  };
  
  try {
    await useAuthStore.getState().refreshSession();
    
    const afterState = useAuthStore.getState();
    
    console.log('  Before Refresh:');
    console.log('    Session ID:', beforeState.sessionId);
    console.log('    Expiry:', beforeState.sessionExpiry?.toLocaleString());
    console.log('    Activity:', beforeState.lastActivity?.toLocaleString());
    
    console.log('  After Refresh:');
    console.log('    Session ID:', afterState.sessionId);
    console.log('    Expiry:', afterState.sessionExpiry?.toLocaleString());
    console.log('    Activity:', afterState.lastActivity?.toLocaleString());
    
    const sessionChanged = afterState.sessionId !== beforeState.sessionId;
    const activityUpdated = afterState.lastActivity && beforeState.lastActivity && 
      afterState.lastActivity.getTime() > beforeState.lastActivity.getTime();
    
    console.log('  Session Changed:', sessionChanged ? '✅ Yes' : '❌ No');
    console.log('  Activity Updated:', activityUpdated ? '✅ Yes' : '❌ No');
    console.log('  Refresh Result: ✅ Success');
    
    return {
      success: true,
      sessionChanged,
      activityUpdated,
      beforeState,
      afterState,
    };
    
  } catch (error) {
    console.log('  Refresh Result: ❌ Failed');
    console.error('  Error:', error);
    
    return {
      success: false,
      error,
    };
  }
};

/**
 * Demo: Run a comprehensive session demonstration
 */
export const runSessionDemo = async () => {
  console.log('🎭 Starting Comprehensive Session Demo...\n');
  
  console.log('1️⃣ Session Configuration:');
  showSessionConfig();
  console.log('');
  
  console.log('2️⃣ Current Session Info:');
  const sessionInfo = showSessionInfo();
  console.log('');
  
  if (!sessionInfo) {
    console.log('❌ Demo requires an authenticated user. Please sign in first.');
    return;
  }
  
  console.log('3️⃣ Stored Session Data:');
  showStoredSessionData();
  console.log('');
  
  console.log('4️⃣ Activity Simulation:');
  simulateActivity();
  console.log('');
  
  console.log('5️⃣ Session Refresh Test:');
  await testSessionRefresh();
  console.log('');
  
  console.log('6️⃣ Final Session State:');
  showSessionInfo();
  console.log('');
  
  console.log('🎉 Session Demo Complete!');
  console.log('💡 Tip: Restart the app to test session restoration.');
};

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).sessionDemo = {
    showSessionInfo,
    showSessionConfig,
    simulateActivity,
    showStoredSessionData,
    testSessionRefresh,
    runSessionDemo,
  };
  
  console.log('🎭 Session Demo loaded! Try:');
  console.log('  sessionDemo.runSessionDemo() - Run full demo');
  console.log('  sessionDemo.showSessionInfo() - Show current session');
  console.log('  sessionDemo.simulateActivity() - Test activity tracking');
}
