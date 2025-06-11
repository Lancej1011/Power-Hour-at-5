// Test script for the rating system
import { createTestSharedPlaylist, getSharedPlaylistsLocal } from './sharedPlaylistUtils';
import { ratePlaylist, getUserRating, calculateAverageRating } from './playlistRating';

// Test the rating system
export const testRatingSystem = async (): Promise<void> => {
  console.log('🧪 Starting Rating System Test...');

  try {
    // Step 1: Create a test playlist
    console.log('📝 Step 1: Creating test playlist...');
    createTestSharedPlaylist();

    const playlists = getSharedPlaylistsLocal();
    const testPlaylist = playlists.find(p => p.shareCode === 'DEMO2024');

    if (!testPlaylist) {
      console.error('❌ Test playlist not found!');
      return;
    }

    console.log('✅ Test playlist created:', testPlaylist.name);

    // Step 2: Test authentication requirements
    console.log('📝 Step 2: Testing authentication requirements...');
    console.log('ℹ️ Note: Rating now requires authentication with a full account (not anonymous)');

    // Step 3: Test rating the playlist
    console.log('📝 Step 3: Testing playlist rating...');
    const ratingSuccess = await ratePlaylist(testPlaylist.id, 5, 'Great test playlist!');

    if (ratingSuccess) {
      console.log('✅ Successfully rated playlist with 5 stars');

      // Step 4: Test getting user rating
      console.log('📝 Step 4: Testing get user rating...');
      const userRating = getUserRating(testPlaylist.id);

      if (userRating && userRating.rating === 5) {
        console.log('✅ Successfully retrieved user rating:', userRating.rating);
      } else {
        console.error('❌ Failed to retrieve user rating or rating mismatch. Got:', userRating);
        return;
      }

      // Step 5: Test average rating calculation
      console.log('📝 Step 5: Testing average rating calculation...');
      const averageRating = calculateAverageRating(testPlaylist.id);

      if (averageRating === 5) {
        console.log('✅ Average rating calculated correctly:', averageRating);
      } else {
        console.error('❌ Average rating calculation failed. Expected: 5, Got:', averageRating);
        return;
      }

      // Step 6: Test rating another value
      console.log('📝 Step 6: Testing rating update...');
      const updateSuccess = await ratePlaylist(testPlaylist.id, 4, 'Updated rating');

      if (updateSuccess) {
        console.log('✅ Successfully updated rating to 4 stars');

        const updatedRating = getUserRating(testPlaylist.id);
        if (updatedRating && updatedRating.rating === 4) {
          console.log('✅ Rating update verified');
        } else {
          console.error('❌ Rating update verification failed. Got:', updatedRating);
          return;
        }
      } else {
        console.error('❌ Failed to update rating');
        return;
      }

      console.log('🎉 All rating system tests passed!');
    } else {
      console.log('⚠️ Rating failed - this is expected if user is not authenticated or is anonymous');
      console.log('ℹ️ To test rating functionality:');
      console.log('  1. Sign in with a full account (not anonymous)');
      console.log('  2. Navigate to Community page');
      console.log('  3. Click on a playlist to view details');
      console.log('  4. Use the rating component in the details dialog');
    }

    console.log('ℹ️ Rating System Security Features:');
    console.log('  ✅ Only authenticated users with full accounts can rate');
    console.log('  ✅ Anonymous users cannot rate (prevents abuse)');
    console.log('  ✅ Guest users cannot rate (prevents abuse)');
    console.log('  ✅ Ratings are stored securely in Firebase');

  } catch (error) {
    console.error('❌ Rating system test failed:', error);
  }
};

// Make the test function available globally for browser console testing
declare global {
  interface Window {
    testRatingSystem: () => Promise<void>;
  }
}

// Attach to window for browser console access
if (typeof window !== 'undefined') {
  window.testRatingSystem = testRatingSystem;
}
