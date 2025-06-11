/**
 * Centralized Playlist Store
 * Manages both regular playlists and YouTube playlists with authentication integration
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { YouTubePlaylist } from '../utils/youtubeUtils';
import { authService } from '../services/authService';
import { playlistDataService } from '../services/playlistDataService';

// Regular playlist interface (for audio files)
export interface RegularPlaylist {
  id: string;
  name: string;
  date: string;
  clips: Array<{
    id: string;
    name: string;
    start: number;
    duration: number;
    songName?: string;
    clipPath?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
  }>;
  drinkingSoundPath?: string;
  imagePath?: string;
  // User association
  userId?: string;
  isLocal?: boolean;
  lastSyncAt?: string;
}

// Sync status for playlists
export interface PlaylistSyncStatus {
  status: 'synced' | 'pending' | 'error' | 'syncing';
  lastSyncAt?: string;
  error?: string;
}

// Playlist store state
export interface PlaylistStore {
  // Playlist data
  regularPlaylists: RegularPlaylist[];
  youtubePlaylists: YouTubePlaylist[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingRegular: boolean;
  isLoadingYouTube: boolean;
  
  // Sync status
  syncStatus: Record<string, PlaylistSyncStatus>;
  lastSyncAt: string | null;
  pendingSyncCount: number;
  
  // Error handling
  lastError: string | null;
  
  // Authentication awareness
  isAuthenticated: boolean;
  currentUserId: string | null;
  
  // Actions - Regular Playlists
  loadRegularPlaylists: () => Promise<void>;
  saveRegularPlaylist: (playlist: RegularPlaylist) => Promise<boolean>;
  deleteRegularPlaylist: (playlistId: string) => Promise<boolean>;
  updateRegularPlaylist: (playlistId: string, updates: Partial<RegularPlaylist>) => Promise<boolean>;
  
  // Actions - YouTube Playlists
  loadYouTubePlaylists: () => Promise<void>;
  saveYouTubePlaylist: (playlist: YouTubePlaylist) => Promise<boolean>;
  deleteYouTubePlaylist: (playlistId: string) => Promise<boolean>;
  updateYouTubePlaylist: (playlistId: string, updates: Partial<YouTubePlaylist>) => Promise<boolean>;
  
  // Sync actions
  syncAllPlaylists: () => Promise<void>;
  syncPlaylist: (playlistId: string, type: 'regular' | 'youtube') => Promise<boolean>;
  forceSyncNow: () => Promise<void>;
  
  // Utility actions
  refreshAuthState: () => void;
  clearError: () => void;
  getPlaylistSyncStatus: (playlistId: string) => PlaylistSyncStatus;
  getPendingSyncCount: () => number;
  
  // Migration actions
  migrateLocalPlaylistsToUser: () => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
}

// Default sync status
const defaultSyncStatus: PlaylistSyncStatus = {
  status: 'synced'
};

// Create the playlist store
export const usePlaylistStore = create<PlaylistStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        regularPlaylists: [],
        youtubePlaylists: [],
        isLoading: false,
        isSyncing: false,
        isLoadingRegular: false,
        isLoadingYouTube: false,
        syncStatus: {},
        lastSyncAt: null,
        pendingSyncCount: 0,
        lastError: null,
        isAuthenticated: authService.isAuthenticated(),
        currentUserId: authService.getCurrentUser()?.uid || null,

        // Regular playlist actions
        loadRegularPlaylists: async () => {
          set((draft) => {
            draft.isLoadingRegular = true;
            draft.lastError = null;
          });

          try {
            const playlists = await playlistDataService.getRegularPlaylists();
            set((draft) => {
              draft.regularPlaylists = playlists;
              draft.isLoadingRegular = false;
            });
          } catch (error: any) {
            console.error('Error loading regular playlists:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to load regular playlists';
              draft.isLoadingRegular = false;
            });
          }
        },

        saveRegularPlaylist: async (playlist: RegularPlaylist) => {
          try {
            const success = await playlistDataService.saveRegularPlaylist(playlist);
            if (success) {
              set((draft) => {
                const existingIndex = draft.regularPlaylists.findIndex(p => p.id === playlist.id);
                if (existingIndex >= 0) {
                  draft.regularPlaylists[existingIndex] = playlist;
                } else {
                  draft.regularPlaylists.push(playlist);
                }
                // Update sync status
                draft.syncStatus[playlist.id] = {
                  status: 'synced',
                  lastSyncAt: new Date().toISOString()
                };
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error saving regular playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to save playlist';
              draft.syncStatus[playlist.id] = {
                status: 'error',
                error: error.message
              };
            });
            return false;
          }
        },

        deleteRegularPlaylist: async (playlistId: string) => {
          try {
            const success = await playlistDataService.deleteRegularPlaylist(playlistId);
            if (success) {
              set((draft) => {
                draft.regularPlaylists = draft.regularPlaylists.filter(p => p.id !== playlistId);
                delete draft.syncStatus[playlistId];
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error deleting regular playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to delete playlist';
            });
            return false;
          }
        },

        updateRegularPlaylist: async (playlistId: string, updates: Partial<RegularPlaylist>) => {
          try {
            const success = await playlistDataService.updateRegularPlaylist(playlistId, updates);
            if (success) {
              set((draft) => {
                const playlistIndex = draft.regularPlaylists.findIndex(p => p.id === playlistId);
                if (playlistIndex >= 0) {
                  Object.assign(draft.regularPlaylists[playlistIndex], updates);
                  draft.syncStatus[playlistId] = {
                    status: 'synced',
                    lastSyncAt: new Date().toISOString()
                  };
                }
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error updating regular playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to update playlist';
            });
            return false;
          }
        },

        // YouTube playlist actions
        loadYouTubePlaylists: async () => {
          set((draft) => {
            draft.isLoadingYouTube = true;
            draft.lastError = null;
          });

          try {
            const playlists = await playlistDataService.getYouTubePlaylists();
            set((draft) => {
              draft.youtubePlaylists = playlists;
              draft.isLoadingYouTube = false;
            });
          } catch (error: any) {
            console.error('Error loading YouTube playlists:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to load YouTube playlists';
              draft.isLoadingYouTube = false;
            });
          }
        },

        saveYouTubePlaylist: async (playlist: YouTubePlaylist) => {
          try {
            const success = await playlistDataService.saveYouTubePlaylist(playlist);
            if (success) {
              set((draft) => {
                const existingIndex = draft.youtubePlaylists.findIndex(p => p.id === playlist.id);
                if (existingIndex >= 0) {
                  draft.youtubePlaylists[existingIndex] = playlist;
                } else {
                  draft.youtubePlaylists.push(playlist);
                }
                // Update sync status
                draft.syncStatus[playlist.id] = {
                  status: 'synced',
                  lastSyncAt: new Date().toISOString()
                };
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error saving YouTube playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to save YouTube playlist';
              draft.syncStatus[playlist.id] = {
                status: 'error',
                error: error.message
              };
            });
            return false;
          }
        },

        deleteYouTubePlaylist: async (playlistId: string) => {
          try {
            const success = await playlistDataService.deleteYouTubePlaylist(playlistId);
            if (success) {
              set((draft) => {
                draft.youtubePlaylists = draft.youtubePlaylists.filter(p => p.id !== playlistId);
                delete draft.syncStatus[playlistId];
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error deleting YouTube playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to delete YouTube playlist';
            });
            return false;
          }
        },

        updateYouTubePlaylist: async (playlistId: string, updates: Partial<YouTubePlaylist>) => {
          try {
            const success = await playlistDataService.updateYouTubePlaylist(playlistId, updates);
            if (success) {
              set((draft) => {
                const playlistIndex = draft.youtubePlaylists.findIndex(p => p.id === playlistId);
                if (playlistIndex >= 0) {
                  Object.assign(draft.youtubePlaylists[playlistIndex], updates);
                  draft.syncStatus[playlistId] = {
                    status: 'synced',
                    lastSyncAt: new Date().toISOString()
                  };
                }
              });
            }
            return success;
          } catch (error: any) {
            console.error('Error updating YouTube playlist:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to update YouTube playlist';
            });
            return false;
          }
        },

        // Sync actions
        syncAllPlaylists: async () => {
          const state = get();
          if (state.isSyncing || !state.isAuthenticated) return;

          set((draft) => {
            draft.isSyncing = true;
            draft.lastError = null;
          });

          try {
            await playlistDataService.syncAllPlaylists();
            
            // Reload playlists after sync
            await get().loadRegularPlaylists();
            await get().loadYouTubePlaylists();
            
            set((draft) => {
              draft.isSyncing = false;
              draft.lastSyncAt = new Date().toISOString();
              draft.pendingSyncCount = 0;
            });
          } catch (error: any) {
            console.error('Error syncing playlists:', error);
            set((draft) => {
              draft.lastError = error.message || 'Failed to sync playlists';
              draft.isSyncing = false;
            });
          }
        },

        syncPlaylist: async (playlistId: string, type: 'regular' | 'youtube') => {
          try {
            set((draft) => {
              draft.syncStatus[playlistId] = {
                status: 'syncing'
              };
            });

            const success = await playlistDataService.syncPlaylist(playlistId, type);
            
            set((draft) => {
              draft.syncStatus[playlistId] = {
                status: success ? 'synced' : 'error',
                lastSyncAt: success ? new Date().toISOString() : undefined,
                error: success ? undefined : 'Sync failed'
              };
            });

            return success;
          } catch (error: any) {
            console.error('Error syncing playlist:', error);
            set((draft) => {
              draft.syncStatus[playlistId] = {
                status: 'error',
                error: error.message
              };
            });
            return false;
          }
        },

        forceSyncNow: async () => {
          await get().syncAllPlaylists();
        },

        // Utility actions
        refreshAuthState: () => {
          const isAuthenticated = authService.isAuthenticated();
          const currentUserId = authService.getCurrentUser()?.uid || null;
          
          set((draft) => {
            draft.isAuthenticated = isAuthenticated;
            draft.currentUserId = currentUserId;
          });

          // Auto-load playlists when authentication state changes
          if (isAuthenticated) {
            get().loadRegularPlaylists();
            get().loadYouTubePlaylists();
          }
        },

        clearError: () => {
          set((draft) => {
            draft.lastError = null;
          });
        },

        getPlaylistSyncStatus: (playlistId: string) => {
          const state = get();
          return state.syncStatus[playlistId] || defaultSyncStatus;
        },

        getPendingSyncCount: () => {
          const state = get();
          return Object.values(state.syncStatus).filter(status => status.status === 'pending').length;
        },

        // Migration actions
        migrateLocalPlaylistsToUser: async () => {
          const state = get();
          if (!state.isAuthenticated) {
            return {
              success: false,
              migratedCount: 0,
              errors: ['User must be authenticated to migrate playlists']
            };
          }

          try {
            const result = await playlistDataService.migrateLocalPlaylistsToUser();
            
            // Reload playlists after migration
            if (result.success && result.migratedCount > 0) {
              await get().loadRegularPlaylists();
              await get().loadYouTubePlaylists();
            }

            return result;
          } catch (error: any) {
            console.error('Error migrating playlists:', error);
            return {
              success: false,
              migratedCount: 0,
              errors: [error.message || 'Migration failed']
            };
          }
        }
      }))
    ),
    {
      name: 'playlist-store'
    }
  )
);

// Subscribe to authentication changes
authService.onAuthStateChanged((user) => {
  usePlaylistStore.getState().refreshAuthState();
});

// Auto-load playlists on store initialization
if (authService.isAuthenticated()) {
  setTimeout(() => {
    const store = usePlaylistStore.getState();
    store.loadRegularPlaylists();
    store.loadYouTubePlaylists();
  }, 100);
}
