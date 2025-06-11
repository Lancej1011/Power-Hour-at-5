/**
 * Playlist Hook
 * Provides easy access to playlist store functionality
 */

import { useCallback, useEffect } from 'react';
import { usePlaylistStore } from '../stores/playlistStore';
import { RegularPlaylist, PlaylistSyncStatus } from '../stores/playlistStore';
import { YouTubePlaylist } from '../utils/youtubeUtils';

export interface UsePlaylistReturn {
  // Data
  regularPlaylists: RegularPlaylist[];
  youtubePlaylists: YouTubePlaylist[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingRegular: boolean;
  isLoadingYouTube: boolean;
  
  // Sync status
  lastSyncAt: string | null;
  pendingSyncCount: number;
  
  // Error handling
  lastError: string | null;
  
  // Authentication state
  isAuthenticated: boolean;
  currentUserId: string | null;
  
  // Regular playlist actions
  loadRegularPlaylists: () => Promise<void>;
  saveRegularPlaylist: (playlist: RegularPlaylist) => Promise<boolean>;
  deleteRegularPlaylist: (playlistId: string) => Promise<boolean>;
  updateRegularPlaylist: (playlistId: string, updates: Partial<RegularPlaylist>) => Promise<boolean>;
  
  // YouTube playlist actions
  loadYouTubePlaylists: () => Promise<void>;
  saveYouTubePlaylist: (playlist: YouTubePlaylist) => Promise<boolean>;
  deleteYouTubePlaylist: (playlistId: string) => Promise<boolean>;
  updateYouTubePlaylist: (playlistId: string, updates: Partial<YouTubePlaylist>) => Promise<boolean>;
  
  // Sync actions
  syncAllPlaylists: () => Promise<void>;
  syncPlaylist: (playlistId: string, type: 'regular' | 'youtube') => Promise<boolean>;
  forceSyncNow: () => Promise<void>;
  
  // Utility functions
  getPlaylistSyncStatus: (playlistId: string) => PlaylistSyncStatus;
  clearError: () => void;
  
  // Migration
  migrateLocalPlaylistsToUser: () => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
}

/**
 * Main playlist hook
 */
export const usePlaylist = (): UsePlaylistReturn => {
  const store = usePlaylistStore();

  // Auto-load playlists when hook is first used
  useEffect(() => {
    if (store.isAuthenticated && store.regularPlaylists.length === 0 && store.youtubePlaylists.length === 0) {
      store.loadRegularPlaylists();
      store.loadYouTubePlaylists();
    }
  }, [store.isAuthenticated]);

  return {
    // Data
    regularPlaylists: store.regularPlaylists,
    youtubePlaylists: store.youtubePlaylists,
    
    // Loading states
    isLoading: store.isLoading,
    isSyncing: store.isSyncing,
    isLoadingRegular: store.isLoadingRegular,
    isLoadingYouTube: store.isLoadingYouTube,
    
    // Sync status
    lastSyncAt: store.lastSyncAt,
    pendingSyncCount: store.pendingSyncCount,
    
    // Error handling
    lastError: store.lastError,
    
    // Authentication state
    isAuthenticated: store.isAuthenticated,
    currentUserId: store.currentUserId,
    
    // Regular playlist actions
    loadRegularPlaylists: store.loadRegularPlaylists,
    saveRegularPlaylist: store.saveRegularPlaylist,
    deleteRegularPlaylist: store.deleteRegularPlaylist,
    updateRegularPlaylist: store.updateRegularPlaylist,
    
    // YouTube playlist actions
    loadYouTubePlaylists: store.loadYouTubePlaylists,
    saveYouTubePlaylist: store.saveYouTubePlaylist,
    deleteYouTubePlaylist: store.deleteYouTubePlaylist,
    updateYouTubePlaylist: store.updateYouTubePlaylist,
    
    // Sync actions
    syncAllPlaylists: store.syncAllPlaylists,
    syncPlaylist: store.syncPlaylist,
    forceSyncNow: store.forceSyncNow,
    
    // Utility functions
    getPlaylistSyncStatus: store.getPlaylistSyncStatus,
    clearError: store.clearError,
    
    // Migration
    migrateLocalPlaylistsToUser: store.migrateLocalPlaylistsToUser
  };
};

/**
 * Hook for regular playlists only
 */
export const useRegularPlaylists = () => {
  const {
    regularPlaylists,
    isLoadingRegular,
    loadRegularPlaylists,
    saveRegularPlaylist,
    deleteRegularPlaylist,
    updateRegularPlaylist,
    getPlaylistSyncStatus,
    syncPlaylist
  } = usePlaylist();

  const syncRegularPlaylist = useCallback(
    (playlistId: string) => syncPlaylist(playlistId, 'regular'),
    [syncPlaylist]
  );

  return {
    playlists: regularPlaylists,
    isLoading: isLoadingRegular,
    loadPlaylists: loadRegularPlaylists,
    savePlaylist: saveRegularPlaylist,
    deletePlaylist: deleteRegularPlaylist,
    updatePlaylist: updateRegularPlaylist,
    getSyncStatus: getPlaylistSyncStatus,
    syncPlaylist: syncRegularPlaylist
  };
};

/**
 * Hook for YouTube playlists only
 */
export const useYouTubePlaylists = () => {
  const {
    youtubePlaylists,
    isLoadingYouTube,
    loadYouTubePlaylists,
    saveYouTubePlaylist,
    deleteYouTubePlaylist,
    updateYouTubePlaylist,
    getPlaylistSyncStatus,
    syncPlaylist
  } = usePlaylist();

  const syncYouTubePlaylist = useCallback(
    (playlistId: string) => syncPlaylist(playlistId, 'youtube'),
    [syncPlaylist]
  );

  return {
    playlists: youtubePlaylists,
    isLoading: isLoadingYouTube,
    loadPlaylists: loadYouTubePlaylists,
    savePlaylist: saveYouTubePlaylist,
    deletePlaylist: deleteYouTubePlaylist,
    updatePlaylist: updateYouTubePlaylist,
    getSyncStatus: getPlaylistSyncStatus,
    syncPlaylist: syncYouTubePlaylist
  };
};

/**
 * Hook for playlist sync status
 */
export const usePlaylistSync = () => {
  const {
    isSyncing,
    lastSyncAt,
    pendingSyncCount,
    syncAllPlaylists,
    forceSyncNow,
    isAuthenticated
  } = usePlaylist();

  return {
    isSyncing,
    lastSyncAt,
    pendingSyncCount,
    syncAllPlaylists,
    forceSyncNow,
    canSync: isAuthenticated
  };
};

/**
 * Hook for playlist migration
 */
export const usePlaylistMigration = () => {
  const {
    migrateLocalPlaylistsToUser,
    isAuthenticated,
    regularPlaylists,
    youtubePlaylists
  } = usePlaylist();

  const hasLocalPlaylists = regularPlaylists.length > 0 || youtubePlaylists.length > 0;
  const canMigrate = isAuthenticated && hasLocalPlaylists;

  return {
    migrateLocalPlaylistsToUser,
    canMigrate,
    hasLocalPlaylists,
    isAuthenticated
  };
};
