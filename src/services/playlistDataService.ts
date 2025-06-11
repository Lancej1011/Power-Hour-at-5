/**
 * Playlist Data Service
 * Handles Firebase integration for user-specific playlist storage and synchronization
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { authService } from './authService';
import { RegularPlaylist } from '../stores/playlistStore';
import { YouTubePlaylist, getYouTubePlaylists, saveYouTubePlaylist, deleteYouTubePlaylist } from '../utils/youtubeUtils';

// Firestore collection names
const COLLECTIONS = {
  USER_PLAYLISTS: 'user_playlists',
  USER_YOUTUBE_PLAYLISTS: 'user_youtube_playlists'
} as const;

// Migration result interface
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
}

class PlaylistDataService {
  /**
   * Check if Firebase is available and user is authenticated
   */
  private isAvailable(): boolean {
    return isFirebaseConfigured() && authService.isAuthenticated();
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // ==================== REGULAR PLAYLISTS ====================

  /**
   * Get all regular playlists for the current user
   */
  async getRegularPlaylists(): Promise<RegularPlaylist[]> {
    const userId = this.getCurrentUserId();
    
    // If not authenticated, load from localStorage
    if (!this.isAvailable() || !userId) {
      return this.getRegularPlaylistsLocal();
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.USER_PLAYLISTS),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const cloudPlaylists = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          lastSyncAt: new Date().toISOString()
        } as RegularPlaylist;
      });

      console.log(`✅ Loaded ${cloudPlaylists.length} regular playlists from Firebase`);
      return cloudPlaylists;
    } catch (error) {
      console.error('❌ Error loading regular playlists from Firebase:', error);
      // Fallback to localStorage
      return this.getRegularPlaylistsLocal();
    }
  }

  /**
   * Save a regular playlist
   */
  async saveRegularPlaylist(playlist: RegularPlaylist): Promise<boolean> {
    const userId = this.getCurrentUserId();
    
    // Always save to localStorage first
    const localSuccess = this.saveRegularPlaylistLocal(playlist);
    
    // If authenticated, also save to Firebase
    if (this.isAvailable() && userId) {
      try {
        const playlistData = {
          ...playlist,
          userId,
          lastSyncAt: serverTimestamp()
        };

        // Check if playlist already exists in Firebase
        const existingDoc = await this.getFirebasePlaylistDoc(playlist.id, 'regular');
        
        if (existingDoc) {
          // Update existing playlist
          await updateDoc(existingDoc.ref, playlistData);
          console.log('✅ Updated regular playlist in Firebase:', playlist.name);
        } else {
          // Create new playlist
          await addDoc(collection(db!, COLLECTIONS.USER_PLAYLISTS), playlistData);
          console.log('✅ Saved new regular playlist to Firebase:', playlist.name);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Error saving regular playlist to Firebase:', error);
        // Still return local success
        return localSuccess;
      }
    }

    return localSuccess;
  }

  /**
   * Delete a regular playlist
   */
  async deleteRegularPlaylist(playlistId: string): Promise<boolean> {
    // Delete from localStorage first
    const localSuccess = this.deleteRegularPlaylistLocal(playlistId);
    
    // If authenticated, also delete from Firebase
    if (this.isAvailable()) {
      try {
        const existingDoc = await this.getFirebasePlaylistDoc(playlistId, 'regular');
        if (existingDoc) {
          await deleteDoc(existingDoc.ref);
          console.log('✅ Deleted regular playlist from Firebase:', playlistId);
        }
      } catch (error) {
        console.error('❌ Error deleting regular playlist from Firebase:', error);
      }
    }

    return localSuccess;
  }

  /**
   * Update a regular playlist
   */
  async updateRegularPlaylist(playlistId: string, updates: Partial<RegularPlaylist>): Promise<boolean> {
    // Update localStorage first
    const localPlaylists = this.getRegularPlaylistsLocal();
    const playlistIndex = localPlaylists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex >= 0) {
      Object.assign(localPlaylists[playlistIndex], updates);
      this.saveRegularPlaylistsLocal(localPlaylists);
    }

    // If authenticated, also update Firebase
    if (this.isAvailable()) {
      try {
        const existingDoc = await this.getFirebasePlaylistDoc(playlistId, 'regular');
        if (existingDoc) {
          await updateDoc(existingDoc.ref, {
            ...updates,
            lastSyncAt: serverTimestamp()
          });
          console.log('✅ Updated regular playlist in Firebase:', playlistId);
        }
      } catch (error) {
        console.error('❌ Error updating regular playlist in Firebase:', error);
      }
    }

    return true;
  }

  // ==================== YOUTUBE PLAYLISTS ====================

  /**
   * Get all YouTube playlists for the current user
   */
  async getYouTubePlaylists(): Promise<YouTubePlaylist[]> {
    const userId = this.getCurrentUserId();
    
    // If not authenticated, load from localStorage
    if (!this.isAvailable() || !userId) {
      return getYouTubePlaylists();
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.USER_YOUTUBE_PLAYLISTS),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const cloudPlaylists = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        } as YouTubePlaylist;
      });

      console.log(`✅ Loaded ${cloudPlaylists.length} YouTube playlists from Firebase`);
      return cloudPlaylists;
    } catch (error) {
      console.error('❌ Error loading YouTube playlists from Firebase:', error);
      // Fallback to localStorage
      return getYouTubePlaylists();
    }
  }

  /**
   * Save a YouTube playlist
   */
  async saveYouTubePlaylist(playlist: YouTubePlaylist): Promise<boolean> {
    const userId = this.getCurrentUserId();
    
    // Always save to localStorage first
    const localSuccess = saveYouTubePlaylist(playlist);
    
    // If authenticated, also save to Firebase
    if (this.isAvailable() && userId) {
      try {
        const playlistData = {
          ...playlist,
          userId,
          lastSyncAt: serverTimestamp()
        };

        // Check if playlist already exists in Firebase
        const existingDoc = await this.getFirebasePlaylistDoc(playlist.id, 'youtube');
        
        if (existingDoc) {
          // Update existing playlist
          await updateDoc(existingDoc.ref, playlistData);
          console.log('✅ Updated YouTube playlist in Firebase:', playlist.name);
        } else {
          // Create new playlist
          await addDoc(collection(db!, COLLECTIONS.USER_YOUTUBE_PLAYLISTS), playlistData);
          console.log('✅ Saved new YouTube playlist to Firebase:', playlist.name);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Error saving YouTube playlist to Firebase:', error);
        // Still return local success
        return localSuccess;
      }
    }

    return localSuccess;
  }

  /**
   * Delete a YouTube playlist
   */
  async deleteYouTubePlaylist(playlistId: string): Promise<boolean> {
    // Delete from localStorage first
    const localSuccess = deleteYouTubePlaylist(playlistId);
    
    // If authenticated, also delete from Firebase
    if (this.isAvailable()) {
      try {
        const existingDoc = await this.getFirebasePlaylistDoc(playlistId, 'youtube');
        if (existingDoc) {
          await deleteDoc(existingDoc.ref);
          console.log('✅ Deleted YouTube playlist from Firebase:', playlistId);
        }
      } catch (error) {
        console.error('❌ Error deleting YouTube playlist from Firebase:', error);
      }
    }

    return localSuccess;
  }

  /**
   * Update a YouTube playlist
   */
  async updateYouTubePlaylist(playlistId: string, updates: Partial<YouTubePlaylist>): Promise<boolean> {
    // Update localStorage first
    const localPlaylists = getYouTubePlaylists();
    const playlistIndex = localPlaylists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex >= 0) {
      Object.assign(localPlaylists[playlistIndex], updates);
      saveYouTubePlaylist(localPlaylists[playlistIndex]);
    }

    // If authenticated, also update Firebase
    if (this.isAvailable()) {
      try {
        const existingDoc = await this.getFirebasePlaylistDoc(playlistId, 'youtube');
        if (existingDoc) {
          await updateDoc(existingDoc.ref, {
            ...updates,
            lastSyncAt: serverTimestamp()
          });
          console.log('✅ Updated YouTube playlist in Firebase:', playlistId);
        }
      } catch (error) {
        console.error('❌ Error updating YouTube playlist in Firebase:', error);
      }
    }

    return true;
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Sync all playlists between local storage and Firebase
   */
  async syncAllPlaylists(): Promise<void> {
    if (!this.isAvailable()) {
      console.log('🔍 Firebase not available for playlist sync');
      return;
    }

    console.log('🔄 Starting playlist sync...');
    
    try {
      // Sync regular playlists
      await this.syncRegularPlaylists();
      
      // Sync YouTube playlists
      await this.syncYouTubePlaylists();
      
      console.log('✅ Playlist sync completed');
    } catch (error) {
      console.error('❌ Error during playlist sync:', error);
      throw error;
    }
  }

  /**
   * Sync a specific playlist
   */
  async syncPlaylist(playlistId: string, type: 'regular' | 'youtube'): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      if (type === 'regular') {
        const localPlaylists = this.getRegularPlaylistsLocal();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        if (playlist) {
          await this.saveRegularPlaylist(playlist);
        }
      } else {
        const localPlaylists = getYouTubePlaylists();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        if (playlist) {
          await this.saveYouTubePlaylist(playlist);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error syncing playlist:', error);
      return false;
    }
  }

  /**
   * Migrate local playlists to user account
   */
  async migrateLocalPlaylistsToUser(): Promise<MigrationResult> {
    const userId = this.getCurrentUserId();
    if (!this.isAvailable() || !userId) {
      return {
        success: false,
        migratedCount: 0,
        errors: ['User must be authenticated to migrate playlists']
      };
    }

    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Migrate regular playlists
      const regularPlaylists = this.getRegularPlaylistsLocal();
      for (const playlist of regularPlaylists) {
        try {
          await this.saveRegularPlaylist({ ...playlist, userId });
          migratedCount++;
        } catch (error: any) {
          errors.push(`Failed to migrate regular playlist "${playlist.name}": ${error.message}`);
        }
      }

      // Migrate YouTube playlists
      const youtubePlaylists = getYouTubePlaylists();
      for (const playlist of youtubePlaylists) {
        try {
          await this.saveYouTubePlaylist(playlist);
          migratedCount++;
        } catch (error: any) {
          errors.push(`Failed to migrate YouTube playlist "${playlist.name}": ${error.message}`);
        }
      }

      console.log(`✅ Migrated ${migratedCount} playlists to user account`);
      
      return {
        success: true,
        migratedCount,
        errors
      };
    } catch (error: any) {
      console.error('❌ Error during playlist migration:', error);
      return {
        success: false,
        migratedCount,
        errors: [...errors, error.message]
      };
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get regular playlists from localStorage
   */
  private getRegularPlaylistsLocal(): RegularPlaylist[] {
    try {
      // This would need to be implemented based on how regular playlists are stored
      // For now, return empty array as regular playlists are handled by Electron API
      return [];
    } catch (error) {
      console.error('Error loading regular playlists from localStorage:', error);
      return [];
    }
  }

  /**
   * Save regular playlist to localStorage
   */
  private saveRegularPlaylistLocal(playlist: RegularPlaylist): boolean {
    try {
      // This would need to be implemented based on how regular playlists are stored
      // For now, return true as regular playlists are handled by Electron API
      return true;
    } catch (error) {
      console.error('Error saving regular playlist to localStorage:', error);
      return false;
    }
  }

  /**
   * Save regular playlists array to localStorage
   */
  private saveRegularPlaylistsLocal(playlists: RegularPlaylist[]): boolean {
    try {
      // This would need to be implemented based on how regular playlists are stored
      return true;
    } catch (error) {
      console.error('Error saving regular playlists to localStorage:', error);
      return false;
    }
  }

  /**
   * Delete regular playlist from localStorage
   */
  private deleteRegularPlaylistLocal(playlistId: string): boolean {
    try {
      // This would need to be implemented based on how regular playlists are stored
      return true;
    } catch (error) {
      console.error('Error deleting regular playlist from localStorage:', error);
      return false;
    }
  }

  /**
   * Get Firebase document for a playlist
   */
  private async getFirebasePlaylistDoc(playlistId: string, type: 'regular' | 'youtube') {
    const collection_name = type === 'regular' ? COLLECTIONS.USER_PLAYLISTS : COLLECTIONS.USER_YOUTUBE_PLAYLISTS;
    const userId = this.getCurrentUserId();
    
    if (!userId) return null;

    try {
      const q = query(
        collection(db!, collection_name),
        where('id', '==', playlistId),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0];
      }
      return null;
    } catch (error) {
      console.error('Error getting Firebase playlist document:', error);
      return null;
    }
  }

  /**
   * Sync regular playlists between local and cloud
   */
  private async syncRegularPlaylists(): Promise<void> {
    const localPlaylists = this.getRegularPlaylistsLocal();
    
    for (const playlist of localPlaylists) {
      try {
        await this.saveRegularPlaylist(playlist);
      } catch (error) {
        console.error('Error syncing regular playlist:', playlist.name, error);
      }
    }
  }

  /**
   * Sync YouTube playlists between local and cloud
   */
  private async syncYouTubePlaylists(): Promise<void> {
    const localPlaylists = getYouTubePlaylists();
    
    for (const playlist of localPlaylists) {
      try {
        await this.saveYouTubePlaylist(playlist);
      } catch (error) {
        console.error('Error syncing YouTube playlist:', playlist.name, error);
      }
    }
  }
}

// Export singleton instance
export const playlistDataService = new PlaylistDataService();
