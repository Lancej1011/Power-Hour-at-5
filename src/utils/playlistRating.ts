import { PlaylistRating, getUserProfile, getSharedPlaylists, saveSharedPlaylist } from './sharedPlaylistUtils';

// Storage keys
const STORAGE_KEYS = {
  PLAYLIST_RATINGS: 'playlist_ratings',
  USER_DOWNLOADS: 'user_downloads'
};

// Download tracking entry
export interface PlaylistDownload {
  playlistId: string;
  userId: string;
  downloadedAt: string;
}

// Get all ratings from localStorage
export const getAllRatings = (): PlaylistRating[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYLIST_RATINGS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading playlist ratings:', error);
    return [];
  }
};

// Save ratings to localStorage
const saveRatings = (ratings: PlaylistRating[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLIST_RATINGS, JSON.stringify(ratings));
    return true;
  } catch (error) {
    console.error('Error saving playlist ratings:', error);
    return false;
  }
};

// Get all downloads from localStorage
export const getAllDownloads = (): PlaylistDownload[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_DOWNLOADS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading playlist downloads:', error);
    return [];
  }
};

// Save downloads to localStorage
const saveDownloads = (downloads: PlaylistDownload[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DOWNLOADS, JSON.stringify(downloads));
    return true;
  } catch (error) {
    console.error('Error saving playlist downloads:', error);
    return false;
  }
};

// Rate a playlist
export const ratePlaylist = (
  playlistId: string,
  rating: number,
  review?: string
): boolean => {
  if (rating < 1 || rating > 5) {
    console.error('Rating must be between 1 and 5');
    return false;
  }

  try {
    const userProfile = getUserProfile();
    const allRatings = getAllRatings();
    
    // Remove existing rating from this user for this playlist
    const filteredRatings = allRatings.filter(
      r => !(r.playlistId === playlistId && r.userId === userProfile.id)
    );

    // Add new rating
    const newRating: PlaylistRating = {
      playlistId,
      userId: userProfile.id,
      rating,
      review,
      createdAt: new Date().toISOString()
    };

    filteredRatings.push(newRating);
    
    // Save ratings
    if (!saveRatings(filteredRatings)) {
      return false;
    }

    // Update playlist's average rating
    updatePlaylistRating(playlistId);
    
    console.log(`✅ Successfully rated playlist ${playlistId} with ${rating} stars`);
    return true;
  } catch (error) {
    console.error('Error rating playlist:', error);
    return false;
  }
};

// Get user's rating for a specific playlist
export const getUserRating = (playlistId: string): PlaylistRating | null => {
  const userProfile = getUserProfile();
  const allRatings = getAllRatings();
  
  return allRatings.find(
    r => r.playlistId === playlistId && r.userId === userProfile.id
  ) || null;
};

// Get all ratings for a specific playlist
export const getPlaylistRatings = (playlistId: string): PlaylistRating[] => {
  const allRatings = getAllRatings();
  return allRatings.filter(r => r.playlistId === playlistId);
};

// Calculate average rating for a playlist
export const calculateAverageRating = (playlistId: string): number => {
  const ratings = getPlaylistRatings(playlistId);
  
  if (ratings.length === 0) {
    return 0;
  }

  const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
};

// Update playlist's rating in shared playlists
const updatePlaylistRating = (playlistId: string): void => {
  try {
    const sharedPlaylists = getSharedPlaylists();
    const playlist = sharedPlaylists.find(p => p.id === playlistId);
    
    if (playlist) {
      playlist.rating = calculateAverageRating(playlistId);
      playlist.updatedAt = new Date().toISOString();
      saveSharedPlaylist(playlist);
    }
  } catch (error) {
    console.error('Error updating playlist rating:', error);
  }
};

// Record a playlist download
export const recordPlaylistDownload = (playlistId: string): boolean => {
  try {
    const userProfile = getUserProfile();
    const allDownloads = getAllDownloads();
    
    // Check if user already downloaded this playlist
    const existingDownload = allDownloads.find(
      d => d.playlistId === playlistId && d.userId === userProfile.id
    );

    if (existingDownload) {
      console.log('User has already downloaded this playlist');
      return true; // Not an error, just already downloaded
    }

    // Add new download record
    const newDownload: PlaylistDownload = {
      playlistId,
      userId: userProfile.id,
      downloadedAt: new Date().toISOString()
    };

    allDownloads.push(newDownload);
    
    // Save downloads
    if (!saveDownloads(allDownloads)) {
      return false;
    }

    // Update playlist's download count
    updatePlaylistDownloadCount(playlistId);
    
    console.log(`✅ Successfully recorded download for playlist ${playlistId}`);
    return true;
  } catch (error) {
    console.error('Error recording playlist download:', error);
    return false;
  }
};

// Check if user has downloaded a playlist
export const hasUserDownloaded = (playlistId: string): boolean => {
  const userProfile = getUserProfile();
  const allDownloads = getAllDownloads();
  
  return allDownloads.some(
    d => d.playlistId === playlistId && d.userId === userProfile.id
  );
};

// Get download count for a playlist
export const getPlaylistDownloadCount = (playlistId: string): number => {
  const allDownloads = getAllDownloads();
  return allDownloads.filter(d => d.playlistId === playlistId).length;
};

// Update playlist's download count in shared playlists
const updatePlaylistDownloadCount = (playlistId: string): void => {
  try {
    const sharedPlaylists = getSharedPlaylists();
    const playlist = sharedPlaylists.find(p => p.id === playlistId);
    
    if (playlist) {
      playlist.downloadCount = getPlaylistDownloadCount(playlistId);
      playlist.updatedAt = new Date().toISOString();
      saveSharedPlaylist(playlist);
    }
  } catch (error) {
    console.error('Error updating playlist download count:', error);
  }
};

// Get user's downloaded playlists
export const getUserDownloadedPlaylists = (): string[] => {
  const userProfile = getUserProfile();
  const allDownloads = getAllDownloads();
  
  return allDownloads
    .filter(d => d.userId === userProfile.id)
    .map(d => d.playlistId);
};

// Get user's rated playlists
export const getUserRatedPlaylists = (): string[] => {
  const userProfile = getUserProfile();
  const allRatings = getAllRatings();
  
  return allRatings
    .filter(r => r.userId === userProfile.id)
    .map(r => r.playlistId);
};

// Delete a rating
export const deleteRating = (playlistId: string): boolean => {
  try {
    const userProfile = getUserProfile();
    const allRatings = getAllRatings();
    
    const filteredRatings = allRatings.filter(
      r => !(r.playlistId === playlistId && r.userId === userProfile.id)
    );

    if (!saveRatings(filteredRatings)) {
      return false;
    }

    // Update playlist's average rating
    updatePlaylistRating(playlistId);
    
    console.log(`✅ Successfully deleted rating for playlist ${playlistId}`);
    return true;
  } catch (error) {
    console.error('Error deleting rating:', error);
    return false;
  }
};

// Get rating statistics for a playlist
export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number }; // 1-5 stars count
}

export const getPlaylistRatingStats = (playlistId: string): RatingStats => {
  const ratings = getPlaylistRatings(playlistId);
  
  const stats: RatingStats = {
    averageRating: calculateAverageRating(playlistId),
    totalRatings: ratings.length,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };

  ratings.forEach(rating => {
    stats.ratingDistribution[rating.rating]++;
  });

  return stats;
};

// Clean up old ratings and downloads (optional maintenance function)
export const cleanupOldData = (daysToKeep: number = 365): void => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.getTime();

    // Clean up old ratings
    const allRatings = getAllRatings();
    const recentRatings = allRatings.filter(rating => 
      new Date(rating.createdAt).getTime() > cutoffTime
    );
    saveRatings(recentRatings);

    // Clean up old downloads
    const allDownloads = getAllDownloads();
    const recentDownloads = allDownloads.filter(download => 
      new Date(download.downloadedAt).getTime() > cutoffTime
    );
    saveDownloads(recentDownloads);

    console.log(`✅ Cleaned up data older than ${daysToKeep} days`);
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
};
