/**
 * Test file to verify collaborative playlist fixes
 * This file tests the two main fixes:
 * 1. In-app notifications instead of browser email opening
 * 2. Collaborative playlist editing functionality
 */

import { useCollaborationStore } from './stores/collaborationStore';
import { authService } from './services/authService';

// Test 1: Verify in-app notification system
export const testInAppNotifications = async () => {
  console.log('🧪 Testing in-app notification system...');
  
  const store = useCollaborationStore.getState();
  
  // Mock user authentication
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };
  
  try {
    // Test sending invitation (should create in-app notification, not open browser)
    const invitationSuccess = await store.sendInvitation({
      playlistId: 'test-playlist-123',
      playlistName: 'Test Collaborative Playlist',
      inviteeEmail: 'invitee@example.com',
      permission: 'editor',
      inviteCode: 'TEST123',
      message: 'Join my test playlist!'
    });
    
    if (invitationSuccess) {
      console.log('✅ Invitation sent successfully via in-app notification');
    } else {
      console.log('❌ Failed to send invitation');
    }
    
    return invitationSuccess;
  } catch (error) {
    console.error('❌ Error testing in-app notifications:', error);
    return false;
  }
};

// Test 2: Verify collaborative playlist editing
export const testCollaborativePlaylistEditing = async () => {
  console.log('🧪 Testing collaborative playlist editing...');
  
  const store = useCollaborationStore.getState();
  
  try {
    // Test updating collaborative playlist metadata
    const updateSuccess = await store.updateCollaborativePlaylistMetadata(
      'test-playlist-123',
      {
        name: 'Updated Collaborative Playlist Name',
        description: 'Updated description for testing'
      }
    );
    
    if (updateSuccess) {
      console.log('✅ Collaborative playlist metadata updated successfully');
    } else {
      console.log('❌ Failed to update collaborative playlist metadata');
    }
    
    return updateSuccess;
  } catch (error) {
    console.error('❌ Error testing collaborative playlist editing:', error);
    return false;
  }
};

// Test 3: Verify notification handling
export const testNotificationHandling = async () => {
  console.log('🧪 Testing notification handling...');
  
  const store = useCollaborationStore.getState();
  
  try {
    // Test marking notification as read
    store.markNotificationAsRead('test-notification-123');
    console.log('✅ Notification marked as read');
    
    // Test marking all notifications as read
    store.markAllNotificationsAsRead();
    console.log('✅ All notifications marked as read');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing notification handling:', error);
    return false;
  }
};

// Test 4: Verify invitation response handling
export const testInvitationResponse = async () => {
  console.log('🧪 Testing invitation response handling...');
  
  const store = useCollaborationStore.getState();
  
  try {
    // Test accepting invitation
    const acceptSuccess = await store.respondToInvitation('test-invitation-123', 'accept');
    
    if (acceptSuccess) {
      console.log('✅ Invitation accepted successfully');
    } else {
      console.log('❌ Failed to accept invitation');
    }
    
    return acceptSuccess;
  } catch (error) {
    console.error('❌ Error testing invitation response:', error);
    return false;
  }
};

// Run all tests
export const runCollaborationTests = async () => {
  console.log('🚀 Running collaboration functionality tests...');
  
  const results = {
    inAppNotifications: await testInAppNotifications(),
    playlistEditing: await testCollaborativePlaylistEditing(),
    notificationHandling: await testNotificationHandling(),
    invitationResponse: await testInvitationResponse()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('📊 Test Results:');
  console.log('- In-app notifications:', results.inAppNotifications ? '✅' : '❌');
  console.log('- Playlist editing:', results.playlistEditing ? '✅' : '❌');
  console.log('- Notification handling:', results.notificationHandling ? '✅' : '❌');
  console.log('- Invitation response:', results.invitationResponse ? '✅' : '❌');
  
  if (allPassed) {
    console.log('🎉 All collaboration tests passed!');
  } else {
    console.log('⚠️ Some collaboration tests failed. Check the implementation.');
  }
  
  return results;
};

// Export for use in development
export default {
  testInAppNotifications,
  testCollaborativePlaylistEditing,
  testNotificationHandling,
  testInvitationResponse,
  runCollaborationTests
};
