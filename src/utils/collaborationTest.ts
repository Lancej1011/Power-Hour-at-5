/**
 * Test utilities for collaborative playlist functionality
 * This file provides debug functions to test collaboration features
 */

import { useCollaborationStore } from '../stores/collaborationStore';
import { authService } from '../services/authService';
import { collaborationFirebaseService } from '../services/collaborationFirebaseService';

// Debug functions for testing collaboration features
export const collaborationDebug = {
  // Test if collaboration store is properly initialized
  testStoreInitialization: () => {
    const store = useCollaborationStore.getState();
    console.log('🧪 Collaboration Store State:', {
      activeCollaborations: Object.keys(store.activeCollaborations).length,
      connectionStatus: store.connectionStatus,
      currentUserId: store.currentUserId,
      isLoading: store.isLoading,
      lastError: store.lastError
    });
    return store;
  },

  // Test creating a collaborative playlist
  testCreatePlaylist: async () => {
    const store = useCollaborationStore.getState();
    const currentUser = authService.getCurrentUser();
    
    if (!currentUser) {
      console.error('❌ No authenticated user found');
      return null;
    }

    console.log('🧪 Creating test collaborative playlist...');
    
    try {
      const playlistId = await store.createCollaborativePlaylist({
        name: 'Test Collaborative Playlist',
        description: 'A test playlist for debugging collaboration features',
        type: 'regular',
        defaultPermission: 'editor',
        isPublic: false,
        initialClips: []
      });

      console.log('✅ Test playlist created:', playlistId);
      return playlistId;
    } catch (error) {
      console.error('❌ Failed to create test playlist:', error);
      return null;
    }
  },

  // Test loading user collaborations
  testLoadCollaborations: async () => {
    console.log('🧪 Testing collaboration loading...');
    
    try {
      const collaborations = await collaborationFirebaseService.getUserCollaborations();
      console.log('✅ Loaded collaborations:', collaborations.length);
      console.log('📋 Collaborations:', collaborations.map(p => ({
        id: p.id,
        name: p.name,
        ownerId: p.ownerId,
        collaboratorCount: Object.keys(p.collaborators || {}).length
      })));
      return collaborations;
    } catch (error) {
      console.error('❌ Failed to load collaborations:', error);
      return [];
    }
  },

  // Test refreshing collaborations in store
  testRefreshStore: async () => {
    console.log('🧪 Testing store refresh...');
    const store = useCollaborationStore.getState();
    
    try {
      await store.refreshCollaborations();
      console.log('✅ Store refreshed successfully');
      
      // Check updated state
      const updatedStore = useCollaborationStore.getState();
      console.log('📊 Updated store state:', {
        activeCollaborations: Object.keys(updatedStore.activeCollaborations).length,
        connectionStatus: updatedStore.connectionStatus,
        lastError: updatedStore.lastError
      });
      
      return updatedStore;
    } catch (error) {
      console.error('❌ Failed to refresh store:', error);
      return null;
    }
  },

  // Test invitation functionality
  testInvitation: async (playlistId: string, email: string) => {
    console.log('🧪 Testing invitation functionality...');
    const store = useCollaborationStore.getState();

    try {
      const success = await store.sendInvitation({
        playlistId,
        playlistName: 'Test Playlist',
        inviteeEmail: email,
        permission: 'editor',
        inviteCode: 'TEST123',
        message: 'Test invitation'
      });

      console.log(success ? '✅ Invitation sent successfully' : '❌ Failed to send invitation');
      return success;
    } catch (error) {
      console.error('❌ Invitation test failed:', error);
      return false;
    }
  },

  // Test playlist conversion functionality
  testPlaylistConversion: async () => {
    console.log('🧪 Testing playlist conversion functionality...');
    const store = useCollaborationStore.getState();

    // Create a mock regular playlist for testing
    const mockRegularPlaylist = {
      id: 'test_regular_playlist',
      name: 'Test Regular Playlist for Conversion',
      date: new Date().toISOString(),
      clips: [
        {
          id: 'clip1',
          name: 'Test Clip 1',
          start: 0,
          duration: 60,
          songName: 'Test Song 1'
        }
      ],
      drinkingSoundPath: '/path/to/drinking/sound.mp3'
    };

    // Create a mock YouTube playlist for testing
    const mockYouTubePlaylist = {
      id: 'test_youtube_playlist',
      name: 'Test YouTube Playlist for Conversion',
      date: new Date().toISOString(),
      clips: [
        {
          id: 'yt_clip1',
          videoId: 'dQw4w9WgXcQ',
          title: 'Test YouTube Video',
          startTime: 0,
          endTime: 60,
          duration: 60
        }
      ]
    };

    try {
      console.log('🔄 Testing regular playlist conversion...');
      const regularConversionResult = await store.convertToCollaborative(mockRegularPlaylist, 'regular');

      if (regularConversionResult) {
        console.log('✅ Regular playlist converted successfully:', regularConversionResult);
      } else {
        console.log('❌ Regular playlist conversion failed');
      }

      console.log('🔄 Testing YouTube playlist conversion...');
      const youtubeConversionResult = await store.convertToCollaborative(mockYouTubePlaylist, 'youtube');

      if (youtubeConversionResult) {
        console.log('✅ YouTube playlist converted successfully:', youtubeConversionResult);
      } else {
        console.log('❌ YouTube playlist conversion failed');
      }

      return {
        regularConversion: !!regularConversionResult,
        youtubeConversion: !!youtubeConversionResult
      };
    } catch (error) {
      console.error('❌ Playlist conversion test failed:', error);
      return {
        regularConversion: false,
        youtubeConversion: false
      };
    }
  },

  // Test join with invite code functionality
  testJoinWithInviteCode: async () => {
    console.log('🧪 Testing join with invite code functionality...');
    const store = useCollaborationStore.getState();

    // Test with a mock invite code
    const mockInviteCode = 'TEST123ABC';

    try {
      console.log('🔄 Testing join with mock invite code:', mockInviteCode);
      const result = await store.joinCollaboration(mockInviteCode);

      if (result) {
        console.log('✅ Join with invite code succeeded:', result);
        return true;
      } else {
        console.log('❌ Join with invite code failed (expected for mock code)');
        return false;
      }
    } catch (error) {
      console.error('❌ Join with invite code test failed:', error);
      return false;
    }
  },

  // Test Firebase availability
  testFirebaseAvailability: () => {
    console.log('🧪 Testing Firebase availability...');
    const isAvailable = collaborationFirebaseService.isAvailable();
    const currentUser = authService.getCurrentUser();

    console.log('📊 Firebase Status:', {
      isAvailable,
      hasUser: !!currentUser,
      userId: currentUser?.uid,
      userEmail: currentUser?.email
    });

    return { isAvailable, currentUser };
  },

  // Run all tests
  runAllTests: async () => {
    console.log('🧪 Running all collaboration tests...');

    // Test 0: Firebase availability
    console.log('\n0. Testing Firebase availability...');
    const { isAvailable, currentUser } = collaborationDebug.testFirebaseAvailability();

    if (!isAvailable) {
      console.error('❌ Firebase not available - stopping tests');
      return;
    }

    if (!currentUser) {
      console.error('❌ No authenticated user - stopping tests');
      return;
    }

    // Test 1: Store initialization
    console.log('\n1. Testing store initialization...');
    const store = collaborationDebug.testStoreInitialization();

    // Test 2: Load collaborations
    console.log('\n2. Testing collaboration loading...');
    const collaborations = await collaborationDebug.testLoadCollaborations();

    // Test 3: Refresh store
    console.log('\n3. Testing store refresh...');
    await collaborationDebug.testRefreshStore();

    // Test 4: Create playlist
    console.log('\n4. Testing playlist creation...');
    const playlistId = await collaborationDebug.testCreatePlaylist();

    if (playlistId) {
      console.log('\n5. Testing invitation (with test email)...');
      await collaborationDebug.testInvitation(playlistId, 'test@example.com');
    }

    // Test 6: Playlist conversion
    console.log('\n6. Testing playlist conversion...');
    await collaborationDebug.testPlaylistConversion();

    // Test 7: Join with invite code
    console.log('\n7. Testing join with invite code...');
    await collaborationDebug.testJoinWithInviteCode();

    console.log('\n🧪 All tests completed!');
  }
};

// Expose debug functions to window for console access
if (typeof window !== 'undefined') {
  (window as any).collaborationDebug = collaborationDebug;
  console.log('🧪 Collaboration debug functions available at window.collaborationDebug');
}
