/**
 * Admin Setup Utility
 * Helper functions to set up admin permissions for your account
 */

import { authService } from '../services/authService';
import { adminService } from '../services/adminService';

// Debug function to get current user info
export const getCurrentUserInfo = () => {
  const user = authService.getCurrentUser();
  if (!user) {
    console.log('❌ No user is currently signed in');
    return null;
  }

  const userInfo = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous,
    emailVerified: user.emailVerified,
  };

  console.log('👤 Current User Info:', userInfo);
  return userInfo;
};

// Function to manually grant admin permissions to current user
export const grantAdminPermissions = async () => {
  const user = authService.getCurrentUser();
  if (!user) {
    console.error('❌ No user is currently signed in');
    return false;
  }

  try {
    const adminProfile = {
      isAdmin: true,
      adminPermissions: {
        canManageCommunity: true,
        canManageUsers: true,
        canModerateContent: true,
        canAccessAnalytics: true,
      },
    };

    const success = await authService.updateUserProfile(adminProfile);
    if (success) {
      console.log('✅ Admin permissions granted to current user');
      console.log('🔄 Please refresh the page to see admin features');
      return true;
    } else {
      console.error('❌ Failed to grant admin permissions');
      return false;
    }
  } catch (error) {
    console.error('❌ Error granting admin permissions:', error);
    return false;
  }
};

// Function to check current user's admin status
export const checkAdminStatus = async () => {
  const user = authService.getCurrentUser();
  if (!user) {
    console.log('❌ No user is currently signed in');
    return false;
  }

  try {
    const profile = await authService.getUserProfile();
    if (!profile) {
      console.log('❌ No user profile found');
      return false;
    }

    console.log('👤 User Profile:', {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      isAdmin: profile.isAdmin,
      adminPermissions: profile.adminPermissions,
    });

    return profile.isAdmin === true;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

// Function to get community stats (admin only)
export const getCommunityStats = async () => {
  try {
    const stats = await adminService.getCommunityStats();
    console.log('📊 Community Stats:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting community stats:', error);
    return null;
  }
};

// Function to clear all community playlists (admin only)
export const clearCommunityPlaylists = async () => {
  if (!window.confirm('⚠️ Are you sure you want to clear ALL community playlists? This cannot be undone!')) {
    return false;
  }

  try {
    const result = await adminService.clearAllCommunityPlaylists();
    console.log('✅ Community playlists cleared:', result);
    return result;
  } catch (error) {
    console.error('❌ Error clearing community playlists:', error);
    return null;
  }
};

// Setup function to expose admin utilities to window for easy access
export const setupAdminDebugTools = () => {
  // Only expose in development or for admin users
  if (process.env.NODE_ENV === 'development') {
    (window as any).adminDebug = {
      getCurrentUserInfo,
      grantAdminPermissions,
      checkAdminStatus,
      getCommunityStats,
      clearCommunityPlaylists,
      
      // Quick setup function
      setupAdmin: async () => {
        console.log('🔧 Setting up admin permissions...');
        
        // Get current user info
        const userInfo = getCurrentUserInfo();
        if (!userInfo) {
          console.error('❌ Please sign in first');
          return false;
        }

        // Grant admin permissions
        const success = await grantAdminPermissions();
        if (success) {
          console.log('✅ Admin setup complete!');
          console.log('📝 Your user ID:', userInfo.uid);
          console.log('📧 Your email:', userInfo.email);
          console.log('🔄 Please refresh the page to see the Admin Panel button');
          return true;
        }

        return false;
      },

      // Instructions
      help: () => {
        console.log(`
🔧 Admin Setup Instructions:

1. Sign in to your account first
2. Run: adminDebug.setupAdmin()
3. Refresh the page
4. You should see an "Admin Panel" button in the Community page

Available commands:
- adminDebug.getCurrentUserInfo() - Get your user info
- adminDebug.grantAdminPermissions() - Grant admin permissions to current user
- adminDebug.checkAdminStatus() - Check if current user is admin
- adminDebug.getCommunityStats() - Get community statistics (admin only)
- adminDebug.clearCommunityPlaylists() - Clear all community playlists (admin only)
- adminDebug.setupAdmin() - Quick setup for admin permissions
        `);
      }
    };

    console.log('🔧 Admin debug tools loaded. Type adminDebug.help() for instructions.');
  }
};

// Auto-setup debug tools
if (typeof window !== 'undefined') {
  setupAdminDebugTools();
}
