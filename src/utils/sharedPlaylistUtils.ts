import { YouTubePlaylist, YouTubeClip } from './youtubeUtils';
import { firebasePlaylistService } from '../services/firebasePlaylistService';
import { authService } from '../services/authService';

// Shared playlist categories
export type PlaylistCategory = 'featured' | 'highly-rated' | 'trending' | 'new';

// Extended interface for shared playlists with additional metadata
export interface SharedPlaylist extends YouTubePlaylist {
  isPublic: boolean; // Can be public or private
  shareCode: string;
  creator: string;
  description: string;
  rating: number;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  originalPlaylistId?: string; // Link to the original YouTube playlist
  // Additional sharing metadata
  category?: PlaylistCategory;
  featured?: boolean;
  verified?: boolean;
}

// Playlist rating entry
export interface PlaylistRating {
  playlistId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  createdAt: string;
}

// Search and filter options
export interface SharedPlaylistFilters {
  category?: PlaylistCategory;
  tags?: string[];
  minRating?: number;
  creator?: string;
  searchQuery?: string;
  sortBy?: 'rating' | 'downloads' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Storage keys
const STORAGE_KEYS = {
  SHARED_PLAYLISTS: 'shared_playlists',
  PLAYLIST_RATINGS: 'playlist_ratings',
  USER_DOWNLOADS: 'user_downloads',
  USER_PROFILE: 'user_profile'
};

// User profile for sharing
export interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
}

// Generate a unique share code
export const generateShareCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a unique user ID
export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create user profile
export const getUserProfile = (): UserProfile => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }

  // Create new user profile
  const newProfile: UserProfile = {
    id: generateUserId(),
    username: `User${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }

  return newProfile;
};

// Update user profile
export const updateUserProfile = (updates: Partial<UserProfile>): boolean => {
  try {
    const currentProfile = getUserProfile();
    const updatedProfile = { ...currentProfile, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

// Convert regular playlist to shared playlist
export const createSharedPlaylist = (
  playlist: YouTubePlaylist,
  description: string = '',
  tags: string[] = [],
  isPublic: boolean = true
): SharedPlaylist => {
  const userProfile = getUserProfile();
  const now = new Date().toISOString();

  // Ensure drinking clip data is properly included
  let drinkingSoundData = playlist.drinkingSoundPath;

  // If the drinking sound path is a JSON string, preserve it as-is
  // If it's a simple path, convert it to the new format for better compatibility
  if (drinkingSoundData && !drinkingSoundData.startsWith('{')) {
    // Legacy format - simple path, convert to structured format
    drinkingSoundData = JSON.stringify({
      type: 'audio',
      path: drinkingSoundData,
      name: 'Drinking Sound'
    });
  }

  return {
    ...playlist,
    isPublic,
    shareCode: generateShareCode(),
    creator: userProfile.username,
    description,
    rating: 0,
    downloadCount: 0,
    tags,
    createdAt: playlist.createdAt || now,
    updatedAt: now,
    version: 1,
    originalPlaylistId: playlist.id, // Link to the original playlist
    drinkingSoundPath: drinkingSoundData // Ensure drinking sound data is included
  };
};

// Save shared playlist to local storage only
export const saveSharedPlaylistLocal = (playlist: SharedPlaylist): boolean => {
  try {
    const existingPlaylists = getSharedPlaylistsLocal();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlist.id);
    updatedPlaylists.push(playlist);
    localStorage.setItem(STORAGE_KEYS.SHARED_PLAYLISTS, JSON.stringify(updatedPlaylists));
    console.log('✅ Successfully saved shared playlist locally:', playlist.name);
    return true;
  } catch (error) {
    console.error('❌ Error saving shared playlist locally:', error);
    return false;
  }
};

// Hybrid: Save shared playlist (Firebase + localStorage)
export const saveSharedPlaylist = async (playlist: SharedPlaylist): Promise<boolean> => {
  try {
    // Always save to localStorage first for immediate access
    const localSuccess = saveSharedPlaylistLocal(playlist);

    // Try to save to Firebase
    if (firebasePlaylistService.isAvailable()) {
      // Auto sign-in if not authenticated
      if (!authService.isAuthenticated()) {
        try {
          await authService.autoSignIn();
          console.log('✅ Auto-signed in for playlist sharing');
        } catch (authError) {
          console.warn('⚠️ Auto sign-in failed:', authError);
        }
      }

      // Try to save to Firebase if authenticated
      if (authService.isAuthenticated()) {
        try {
          const firebaseId = await firebasePlaylistService.sharePlaylist(playlist);
          if (firebaseId) {
            console.log('✅ Playlist saved to Firebase with ID:', firebaseId);
          }
        } catch (firebaseError) {
          console.warn('⚠️ Failed to save to Firebase, but local save succeeded:', firebaseError);
        }
      } else {
        console.log('ℹ️ User not authenticated - saved locally only');
      }
    } else {
      console.log('ℹ️ Firebase not available - saved locally only');
    }

    return localSuccess;
  } catch (error) {
    console.error('❌ Error in hybrid save:', error);
    return false;
  }
};

// Get all shared playlists from localStorage only
export const getSharedPlaylistsLocal = (): SharedPlaylist[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHARED_PLAYLISTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading shared playlists from localStorage:', error);
    return [];
  }
};

// Clear all shared playlists from localStorage
export const clearSharedPlaylistsLocal = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SHARED_PLAYLISTS);
    console.log('✅ Cleared all shared playlists from localStorage');
    return true;
  } catch (error) {
    console.error('❌ Error clearing shared playlists from localStorage:', error);
    return false;
  }
};

// Get shared playlists from Firebase only (no localStorage fallback for community page)
export const getSharedPlaylists = async (category?: PlaylistCategory): Promise<SharedPlaylist[]> => {
  try {
    // Only load from Firebase if available and authenticated
    if (firebasePlaylistService.isAvailable() && authService.isAuthenticated()) {
      try {
        const firebasePlaylists = await firebasePlaylistService.getPlaylistsByCategory(category || 'new');
        console.log(`✅ Loaded ${firebasePlaylists.length} playlists from Firebase`);
        return firebasePlaylists;
      } catch (firebaseError) {
        console.warn('⚠️ Failed to load from Firebase:', firebaseError);
        return [];
      }
    }

    // No localStorage fallback for community page - return empty array
    console.log('ℹ️ Firebase not available or user not authenticated - returning empty array');
    return [];
  } catch (error) {
    console.error('❌ Error in getSharedPlaylists:', error);
    return [];
  }
};

// Get shared playlist by share code from localStorage only
export const getSharedPlaylistByCodeLocal = (shareCode: string): SharedPlaylist | null => {
  const playlists = getSharedPlaylistsLocal();
  return playlists.find(p => p.shareCode === shareCode) || null;
};

// Hybrid: Get shared playlist by share code (Firebase first, localStorage fallback)
// This function is used for import functionality and should still check localStorage
export const getSharedPlaylistByCode = async (shareCode: string): Promise<SharedPlaylist | null> => {
  try {
    // Try Firebase first if available
    if (firebasePlaylistService.isAvailable()) {
      try {
        const firebasePlaylist = await firebasePlaylistService.getPlaylistByCode(shareCode);
        if (firebasePlaylist) {
          console.log('✅ Found playlist by share code in Firebase');
          return firebasePlaylist;
        }
      } catch (firebaseError) {
        console.warn('⚠️ Failed to search Firebase, falling back to localStorage:', firebaseError);
      }
    }

    // Fallback to localStorage for import functionality
    const localPlaylist = getSharedPlaylistByCodeLocal(shareCode);
    if (localPlaylist) {
      console.log('ℹ️ Found playlist by share code in localStorage');
    } else {
      console.log('❌ Playlist not found in localStorage either');
    }
    return localPlaylist;
  } catch (error) {
    console.error('❌ Error in hybrid getSharedPlaylistByCode:', error);
    return null;
  }
};

// Filter and search shared playlists
export const filterSharedPlaylists = (
  playlists: SharedPlaylist[],
  filters: SharedPlaylistFilters
): SharedPlaylist[] => {
  try {
    // Ensure playlists is an array
    if (!Array.isArray(playlists)) {
      console.warn('filterSharedPlaylists: playlists is not an array, returning empty array');
      return [];
    }

    let filtered = [...playlists];

  // Category filter
  if (filters.category) {
    switch (filters.category) {
      case 'featured':
        filtered = filtered.filter(p => p.featured === true);
        break;
      case 'highly-rated':
        filtered = filtered.filter(p => p.rating >= 4.0);
        break;
      case 'trending':
        // Sort by download count in the last 30 days (simplified to just download count)
        filtered = filtered.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case 'new':
        filtered = filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(p => {
      try {
        return p && Array.isArray(p.tags) && filters.tags!.some(tag => p.tags.includes(tag));
      } catch (error) {
        console.error('Error filtering by tags:', error);
        return false;
      }
    });
  }

  // Minimum rating filter
  if (filters.minRating) {
    filtered = filtered.filter(p => {
      try {
        return p && typeof p.rating === 'number' && p.rating >= filters.minRating!;
      } catch (error) {
        console.error('Error filtering by rating:', error);
        return false;
      }
    });
  }

  // Creator filter
  if (filters.creator) {
    filtered = filtered.filter(p => {
      try {
        return p && p.creator && p.creator.toLowerCase().includes(filters.creator!.toLowerCase());
      } catch (error) {
        console.error('Error filtering by creator:', error);
        return false;
      }
    });
  }

  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      try {
        if (!p) return false;

        const name = (p.name || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const creator = (p.creator || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';

        return name.includes(query) ||
               description.includes(query) ||
               creator.includes(query) ||
               tags.includes(query);
      } catch (error) {
        console.error('Error filtering by search query:', error);
        return false;
      }
    });
  }

  // Sorting
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'downloads':
          aValue = a.downloadCount;
          bValue = b.downloadCount;
          break;
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }

  return filtered;
  } catch (error) {
    console.error('Error in filterSharedPlaylists:', error);
    return [];
  }
};

// Get all unique tags from shared playlists
export const getAllTags = (playlists?: SharedPlaylist[]): string[] => {
  try {
    const playlistsToUse = playlists || getSharedPlaylistsLocal();

    // Ensure we have an array
    if (!Array.isArray(playlistsToUse)) {
      console.warn('getAllTags: playlistsToUse is not an array, returning empty array');
      return [];
    }

    const tagSet = new Set<string>();

    playlistsToUse.forEach(playlist => {
      try {
        if (playlist && Array.isArray(playlist.tags)) {
          playlist.tags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              tagSet.add(tag);
            }
          });
        }
      } catch (error) {
        console.error('Error processing playlist tags:', error);
      }
    });

    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Error in getAllTags:', error);
    return [];
  }
};

// Get all unique creators
export const getAllCreators = (playlists?: SharedPlaylist[]): string[] => {
  try {
    const playlistsToUse = playlists || getSharedPlaylistsLocal();

    // Ensure we have an array
    if (!Array.isArray(playlistsToUse)) {
      console.warn('getAllCreators: playlistsToUse is not an array, returning empty array');
      return [];
    }

    const creatorSet = new Set<string>();

    playlistsToUse.forEach(playlist => {
      try {
        if (playlist && playlist.creator && typeof playlist.creator === 'string') {
          creatorSet.add(playlist.creator);
        }
      } catch (error) {
        console.error('Error processing playlist creator:', error);
      }
    });

    return Array.from(creatorSet).sort();
  } catch (error) {
    console.error('Error in getAllCreators:', error);
    return [];
  }
};

// Delete shared playlist
export const deleteSharedPlaylist = (playlistId: string): boolean => {
  try {
    const existingPlaylists = getSharedPlaylistsLocal();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlistId);
    localStorage.setItem(STORAGE_KEYS.SHARED_PLAYLISTS, JSON.stringify(updatedPlaylists));
    return true;
  } catch (error) {
    console.error('Error deleting shared playlist:', error);
    return false;
  }
};

// Import playlist by share code with hybrid approach
export const importPlaylistByCode = async (shareCode: string): Promise<{
  success: boolean;
  message?: string;
  playlist?: SharedPlaylist;
  source?: 'firebase' | 'local';
}> => {
  try {
    // Validate share code format
    if (!shareCode || typeof shareCode !== 'string' || shareCode.length !== 8) {
      return {
        success: false,
        message: 'Invalid share code format. Share codes must be 8 characters long.',
      };
    }

    let playlist: SharedPlaylist | null = null;
    let source: 'firebase' | 'local' = 'local';

    // Try Firebase first if available
    if (firebasePlaylistService.isAvailable()) {
      // Auto sign-in if not authenticated
      if (!authService.isAuthenticated()) {
        try {
          await authService.autoSignIn();
          console.log('✅ Auto-signed in for playlist search');
        } catch (authError) {
          console.warn('⚠️ Auto sign-in failed for search:', authError);
        }
      }

      try {
        playlist = await firebasePlaylistService.getPlaylistByCode(shareCode.toUpperCase());
        if (playlist) {
          source = 'firebase';
          console.log('✅ Found playlist by share code in Firebase');
        }
      } catch (firebaseError) {
        console.warn('⚠️ Failed to search Firebase, falling back to localStorage:', firebaseError);
      }
    }

    // Fallback to localStorage if not found in Firebase
    if (!playlist) {
      playlist = getSharedPlaylistByCodeLocal(shareCode.toUpperCase());
      if (playlist) {
        source = 'local';
        console.log('ℹ️ Found playlist by share code in localStorage');
      }
    }

    if (!playlist) {
      return {
        success: false,
        message: 'Playlist not found. Please check the share code and try again.',
      };
    }

    // Save playlist locally if it came from Firebase
    if (source === 'firebase') {
      saveSharedPlaylistLocal(playlist);

      // Record download only if playlist came from Firebase and user is authenticated
      if (authService.isAuthenticated()) {
        try {
          // Use the Firebase document ID (playlist.id) for recording download
          // The playlist.id should be the Firebase document ID when it comes from Firebase
          console.log('🔍 Recording download for Firebase document ID:', playlist.id);
          await firebasePlaylistService.recordDownload(playlist.id);
          console.log('✅ Download recorded successfully');
        } catch (error) {
          console.warn('⚠️ Failed to record download:', error);
          console.log('🔍 Playlist ID used for download:', playlist.id);
        }
      }
    } else {
      console.log('ℹ️ Playlist imported from local storage - no download recording needed');
    }

    return {
      success: true,
      message: 'Playlist imported successfully!',
      playlist,
      source
    };
  } catch (error) {
    console.error('❌ Error importing playlist:', error);
    return {
      success: false,
      message: 'An error occurred while importing the playlist.',
    };
  }
};

// Rate a playlist with hybrid approach
export const ratePlaylist = async (
  playlistId: string,
  rating: number,
  review?: string
): Promise<boolean> => {
  try {
    // Try Firebase first if available
    if (firebasePlaylistService.isAvailable() && authService.isAuthenticated()) {
      return await firebasePlaylistService.ratePlaylist(playlistId, rating, review);
    } else {
      console.warn('Firebase not available or user not authenticated - rating not saved');
      return false;
    }
  } catch (error) {
    console.error('Error rating playlist:', error);
    return false;
  }
};

// Check if user has downloaded a playlist
export const hasUserDownloaded = async (playlistId: string): Promise<boolean> => {
  try {
    if (firebasePlaylistService.isAvailable() && authService.isAuthenticated()) {
      return await firebasePlaylistService.hasUserDownloaded(playlistId);
    }
    return false;
  } catch (error) {
    console.error('Error checking download status:', error);
    return false;
  }
};

// Find shared playlist by original playlist ID or name (hybrid approach)
export const findSharedPlaylistByOriginal = async (
  originalPlaylistId: string,
  originalPlaylistName: string
): Promise<SharedPlaylist | null> => {
  try {
    // Try Firebase first if available
    if (firebasePlaylistService.isAvailable() && authService.isAuthenticated()) {
      try {
        // Note: Firebase service would need a method to search by original ID/name
        // For now, we'll get all playlists and filter (not ideal for large datasets)
        const firebasePlaylists = await firebasePlaylistService.getPlaylistsByCategory('new', 1000);
        const found = firebasePlaylists.find(p =>
          p.id === originalPlaylistId ||
          (p.name === originalPlaylistName && p.creator === getUserProfile().username)
        );
        if (found) {
          console.log('✅ Found shared playlist in Firebase');
          return found;
        }
      } catch (firebaseError) {
        console.warn('⚠️ Failed to search Firebase, falling back to localStorage:', firebaseError);
      }
    }

    // Fallback to localStorage
    const localPlaylists = getSharedPlaylistsLocal();
    const found = localPlaylists.find(p =>
      p.id === originalPlaylistId ||
      (p.name === originalPlaylistName && p.creator === getUserProfile().username)
    );

    if (found) {
      console.log('ℹ️ Found shared playlist in localStorage');
    }

    return found || null;
  } catch (error) {
    console.error('❌ Error finding shared playlist by original:', error);
    return null;
  }
};

// Get share code for an existing playlist (if it has been shared)
export const getShareCodeForPlaylist = async (
  playlistId: string,
  playlistName: string
): Promise<string | null> => {
  const sharedPlaylist = await findSharedPlaylistByOriginal(playlistId, playlistName);
  return sharedPlaylist?.shareCode || null;
};

// Create a test shared playlist for demonstration purposes
export const createTestSharedPlaylist = (): void => {
  const testPlaylist: SharedPlaylist = {
    id: 'test_shared_playlist_demo',
    name: 'Demo Shared Playlist',
    date: new Date().toISOString(),
    clips: [
      {
        id: 'clip_1',
        videoId: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        artist: 'Rick Astley',
        startTime: 0,
        duration: 60,
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/medium.jpg'
      }
    ],
    isPublic: true,
    shareCode: 'DEMO2024',
    creator: 'TestUser',
    description: 'A demo playlist for testing share code functionality',
    rating: 4.5,
    downloadCount: 10,
    tags: ['demo', 'test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };

  saveSharedPlaylistLocal(testPlaylist);
  console.log('✅ Created test shared playlist with share code:', testPlaylist.shareCode);
};

// Get user's rating for a playlist
export const getUserRating = async (playlistId: string): Promise<{ rating: number; review?: string } | null> => {
  try {
    if (firebasePlaylistService.isAvailable() && authService.isAuthenticated()) {
      const rating = await firebasePlaylistService.getUserRating(playlistId);
      return rating ? { rating: rating.rating, review: rating.review } : null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user rating:', error);
    return null;
  }
};
