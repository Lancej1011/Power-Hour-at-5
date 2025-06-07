import { YouTubePlaylist, YouTubeClip } from './youtubeUtils';

// Shared playlist categories
export type PlaylistCategory = 'featured' | 'highly-rated' | 'trending' | 'new';

// Extended interface for shared playlists with additional metadata
export interface SharedPlaylist extends YouTubePlaylist {
  isPublic: true; // Shared playlists are always public
  shareCode: string;
  creator: string;
  description: string;
  rating: number;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
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
  tags: string[] = []
): SharedPlaylist => {
  const userProfile = getUserProfile();
  const now = new Date().toISOString();

  return {
    ...playlist,
    isPublic: true,
    shareCode: generateShareCode(),
    creator: userProfile.username,
    description,
    rating: 0,
    downloadCount: 0,
    tags,
    createdAt: playlist.createdAt || now,
    updatedAt: now,
    version: 1
  };
};

// Save shared playlist to local storage
export const saveSharedPlaylist = (playlist: SharedPlaylist): boolean => {
  try {
    const existingPlaylists = getSharedPlaylists();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlist.id);
    updatedPlaylists.push(playlist);
    localStorage.setItem(STORAGE_KEYS.SHARED_PLAYLISTS, JSON.stringify(updatedPlaylists));
    console.log('✅ Successfully saved shared playlist:', playlist.name);
    return true;
  } catch (error) {
    console.error('❌ Error saving shared playlist:', error);
    return false;
  }
};

// Get all shared playlists
export const getSharedPlaylists = (): SharedPlaylist[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHARED_PLAYLISTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading shared playlists:', error);
    return [];
  }
};

// Get shared playlist by share code
export const getSharedPlaylistByCode = (shareCode: string): SharedPlaylist | null => {
  const playlists = getSharedPlaylists();
  return playlists.find(p => p.shareCode === shareCode) || null;
};

// Filter and search shared playlists
export const filterSharedPlaylists = (
  playlists: SharedPlaylist[],
  filters: SharedPlaylistFilters
): SharedPlaylist[] => {
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
    filtered = filtered.filter(p => 
      filters.tags!.some(tag => p.tags.includes(tag))
    );
  }

  // Minimum rating filter
  if (filters.minRating) {
    filtered = filtered.filter(p => p.rating >= filters.minRating!);
  }

  // Creator filter
  if (filters.creator) {
    filtered = filtered.filter(p => 
      p.creator.toLowerCase().includes(filters.creator!.toLowerCase())
    );
  }

  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.creator.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
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
};

// Get all unique tags from shared playlists
export const getAllTags = (): string[] => {
  const playlists = getSharedPlaylists();
  const tagSet = new Set<string>();
  
  playlists.forEach(playlist => {
    playlist.tags.forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
};

// Get all unique creators
export const getAllCreators = (): string[] => {
  const playlists = getSharedPlaylists();
  const creatorSet = new Set<string>();
  
  playlists.forEach(playlist => {
    creatorSet.add(playlist.creator);
  });
  
  return Array.from(creatorSet).sort();
};

// Delete shared playlist
export const deleteSharedPlaylist = (playlistId: string): boolean => {
  try {
    const existingPlaylists = getSharedPlaylists();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlistId);
    localStorage.setItem(STORAGE_KEYS.SHARED_PLAYLISTS, JSON.stringify(updatedPlaylists));
    return true;
  } catch (error) {
    console.error('Error deleting shared playlist:', error);
    return false;
  }
};
