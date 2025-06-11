import { authService } from '../services/authService';
import { firebasePlaylistService } from '../services/firebasePlaylistService';
import { getYouTubePlaylists, saveYouTubePlaylist, YouTubePlaylist } from './youtubeUtils';
import { getSharedPlaylists, SharedPlaylist } from './sharedPlaylistUtils';

/**
 * Playlist Migration Utilities
 * 
 * These utilities help migrate playlists from anonymous/local storage
 * to authenticated user accounts for cross-device synchronization.
 */

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

export interface PlaylistMigrationStatus {
  totalPlaylists: number;
  localPlaylists: number;
  cloudPlaylists: number;
  needsMigration: number;
  canMigrate: boolean;
}

/**
 * Check the current playlist migration status for a user
 */
export const getPlaylistMigrationStatus = async (): Promise<PlaylistMigrationStatus> => {
  const isAuthenticated = authService.isAuthenticated();
  const localPlaylists = getYouTubePlaylists();
  
  let cloudPlaylists = 0;
  let needsMigration = 0;

  if (isAuthenticated) {
    try {
      // Get user's cloud playlists
      const userCloudPlaylists = await firebasePlaylistService.getUserPlaylists();
      cloudPlaylists = userCloudPlaylists.length;

      // Check which local playlists need migration
      const localPlaylistIds = localPlaylists.map(p => p.id);
      const cloudPlaylistIds = userCloudPlaylists.map(p => p.originalPlaylistId || p.id);
      
      needsMigration = localPlaylists.filter(playlist => 
        !cloudPlaylistIds.includes(playlist.id)
      ).length;
    } catch (error) {
      console.error('Error checking cloud playlists:', error);
    }
  }

  return {
    totalPlaylists: localPlaylists.length + cloudPlaylists,
    localPlaylists: localPlaylists.length,
    cloudPlaylists,
    needsMigration,
    canMigrate: isAuthenticated && needsMigration > 0,
  };
};

/**
 * Migrate local playlists to user's cloud account
 */
export const migratePlaylistsToCloud = async (): Promise<MigrationResult> => {
  if (!authService.isAuthenticated()) {
    return {
      success: false,
      message: 'User must be authenticated to migrate playlists',
      migratedCount: 0,
      failedCount: 0,
      errors: ['Not authenticated'],
    };
  }

  const localPlaylists = getYouTubePlaylists();
  const errors: string[] = [];
  let migratedCount = 0;
  let failedCount = 0;

  try {
    // Get existing cloud playlists to avoid duplicates
    const existingCloudPlaylists = await firebasePlaylistService.getUserPlaylists();
    const existingIds = existingCloudPlaylists.map(p => p.originalPlaylistId || p.id);

    for (const playlist of localPlaylists) {
      try {
        // Skip if already migrated
        if (existingIds.includes(playlist.id)) {
          console.log(`Playlist "${playlist.name}" already exists in cloud, skipping`);
          continue;
        }

        // Create shared version of the playlist
        const sharedPlaylist: SharedPlaylist = {
          ...playlist,
          isPublic: false, // Default to private for migrated playlists
          shareCode: generateMigrationShareCode(),
          creator: getUserProfile().username || 'Migrated User',
          description: `Migrated from local storage on ${new Date().toLocaleDateString()}`,
          rating: 0,
          downloadCount: 0,
          tags: ['migrated'],
          createdAt: playlist.date || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          originalPlaylistId: playlist.id,
        };

        // Save to Firebase
        const result = await firebasePlaylistService.sharePlaylist(sharedPlaylist);
        
        if (result) {
          migratedCount++;
          console.log(`✅ Migrated playlist: ${playlist.name}`);
        } else {
          failedCount++;
          errors.push(`Failed to migrate playlist: ${playlist.name}`);
        }
      } catch (error) {
        failedCount++;
        const errorMessage = `Failed to migrate "${playlist.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    return {
      success: migratedCount > 0,
      message: `Migration completed. ${migratedCount} playlists migrated successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      migratedCount,
      failedCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      migratedCount,
      failedCount,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * Sync cloud playlists back to local storage
 */
export const syncCloudPlaylistsToLocal = async (): Promise<MigrationResult> => {
  if (!authService.isAuthenticated()) {
    return {
      success: false,
      message: 'User must be authenticated to sync playlists',
      migratedCount: 0,
      failedCount: 0,
      errors: ['Not authenticated'],
    };
  }

  const errors: string[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  try {
    // Get user's cloud playlists
    const cloudPlaylists = await firebasePlaylistService.getUserPlaylists();
    const localPlaylists = getYouTubePlaylists();
    const localPlaylistIds = localPlaylists.map(p => p.id);

    for (const cloudPlaylist of cloudPlaylists) {
      try {
        // Convert shared playlist back to YouTube playlist format
        const youtubePlaylist: YouTubePlaylist = {
          id: cloudPlaylist.originalPlaylistId || cloudPlaylist.id,
          name: cloudPlaylist.name,
          clips: cloudPlaylist.clips,
          date: cloudPlaylist.createdAt,
          imagePath: cloudPlaylist.imagePath,
        };

        // Only sync if not already in local storage
        if (!localPlaylistIds.includes(youtubePlaylist.id)) {
          saveYouTubePlaylist(youtubePlaylist);
          syncedCount++;
          console.log(`✅ Synced playlist to local: ${youtubePlaylist.name}`);
        }
      } catch (error) {
        failedCount++;
        const errorMessage = `Failed to sync "${cloudPlaylist.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    return {
      success: syncedCount > 0,
      message: `Sync completed. ${syncedCount} playlists synced to local storage${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      migratedCount: syncedCount,
      failedCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      migratedCount: syncedCount,
      failedCount,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * Generate a unique share code for migrated playlists
 */
const generateMigrationShareCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MIG'; // Prefix to identify migrated playlists
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Get user profile for migration
 */
const getUserProfile = () => {
  const stored = localStorage.getItem('userProfile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing user profile:', error);
    }
  }
  
  return {
    username: 'User',
    email: '',
    preferences: {},
  };
};

/**
 * Check if a playlist needs migration
 */
export const playlistNeedsMigration = async (playlistId: string): Promise<boolean> => {
  if (!authService.isAuthenticated()) {
    return false;
  }

  try {
    const existingShared = await firebasePlaylistService.getSharedVersionOfPlaylist(playlistId);
    return !existingShared;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Migrate a single playlist
 */
export const migrateSinglePlaylist = async (playlist: YouTubePlaylist): Promise<boolean> => {
  if (!authService.isAuthenticated()) {
    return false;
  }

  try {
    // Check if already migrated
    const existing = await firebasePlaylistService.getSharedVersionOfPlaylist(playlist.id);
    if (existing) {
      return true; // Already migrated
    }

    // Create shared version
    const sharedPlaylist: SharedPlaylist = {
      ...playlist,
      isPublic: false,
      shareCode: generateMigrationShareCode(),
      creator: getUserProfile().username || 'User',
      description: `Migrated from local storage on ${new Date().toLocaleDateString()}`,
      rating: 0,
      downloadCount: 0,
      tags: ['migrated'],
      createdAt: playlist.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      originalPlaylistId: playlist.id,
    };

    const result = await firebasePlaylistService.sharePlaylist(sharedPlaylist);
    return !!result;
  } catch (error) {
    console.error('Error migrating single playlist:', error);
    return false;
  }
};
