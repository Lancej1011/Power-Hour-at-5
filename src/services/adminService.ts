/**
 * Admin Service
 * Handles administrative functions for community management
 */

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { authService } from './authService';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { canManageCommunity, isUserAdmin } from '../utils/authUtils';

class AdminService {
  private isAvailable(): boolean {
    return isFirebaseConfigured() && !!db;
  }

  private async checkAdminPermissions(): Promise<boolean> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Get user profile to check admin status
    const userProfile = await authService.getUserProfile();
    if (!userProfile || !isUserAdmin({ profile: userProfile } as any)) {
      throw new Error('Insufficient permissions - admin access required');
    }

    return true;
  }

  // Get all community playlists (admin only) - includes both public and private
  public async getAllCommunityPlaylists(): Promise<SharedPlaylist[]> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available');
      return [];
    }

    await this.checkAdminPermissions();

    try {
      const playlistsRef = collection(db!, 'shared_playlists');
      // Admin should see ALL playlists, not just public ones
      const snapshot = await getDocs(playlistsRef);

      const playlists = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        firebaseId: doc.id,
      })) as SharedPlaylist[];

      console.log(`✅ Retrieved ${playlists.length} total community playlists for admin (public + private)`);
      return playlists;
    } catch (error) {
      console.error('❌ Error getting community playlists:', error);
      throw error;
    }
  }

  // Delete a specific playlist (admin only)
  public async deletePlaylist(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available');
      return false;
    }

    await this.checkAdminPermissions();

    try {
      const playlistRef = doc(db!, 'shared_playlists', playlistId);
      await deleteDoc(playlistRef);
      
      console.log(`✅ Deleted playlist: ${playlistId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting playlist ${playlistId}:`, error);
      return false;
    }
  }

  // Bulk delete playlists (admin only)
  public async bulkDeletePlaylists(playlistIds: string[]): Promise<{ success: number; failed: number }> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available');
      return { success: 0, failed: playlistIds.length };
    }

    await this.checkAdminPermissions();

    let success = 0;
    let failed = 0;

    // Use batch operations for better performance
    const batch = writeBatch(db!);
    
    try {
      for (const playlistId of playlistIds) {
        const playlistRef = doc(db!, 'shared_playlists', playlistId);
        batch.delete(playlistRef);
      }

      await batch.commit();
      success = playlistIds.length;
      
      console.log(`✅ Bulk deleted ${success} playlists`);
    } catch (error) {
      console.error('❌ Error in bulk delete:', error);
      failed = playlistIds.length;
    }

    return { success, failed };
  }

  // Clear all community playlists (admin only)
  public async clearAllCommunityPlaylists(): Promise<{ success: number; failed: number }> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available');
      return { success: 0, failed: 0 };
    }

    await this.checkAdminPermissions();

    try {
      const playlists = await this.getAllCommunityPlaylists();
      const playlistIds = playlists.map(p => p.id);
      
      if (playlistIds.length === 0) {
        console.log('✅ No community playlists to clear');
        return { success: 0, failed: 0 };
      }

      console.log(`🔄 Clearing ${playlistIds.length} community playlists...`);
      const result = await this.bulkDeletePlaylists(playlistIds);
      
      console.log(`✅ Community clear complete: ${result.success} deleted, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('❌ Error clearing community playlists:', error);
      throw error;
    }
  }

  // Hide/unhide a playlist (admin moderation)
  public async moderatePlaylist(playlistId: string, isPublic: boolean): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available');
      return false;
    }

    await this.checkAdminPermissions();

    try {
      const playlistRef = doc(db!, 'shared_playlists', playlistId);
      await updateDoc(playlistRef, {
        isPublic,
        moderatedAt: serverTimestamp(),
        moderatedBy: authService.getCurrentUser()?.uid
      });
      
      console.log(`✅ Playlist ${playlistId} ${isPublic ? 'made public' : 'hidden'}`);
      return true;
    } catch (error) {
      console.error(`❌ Error moderating playlist ${playlistId}:`, error);
      return false;
    }
  }

  // Get community statistics (admin only)
  public async getCommunityStats(): Promise<{
    totalPlaylists: number;
    publicPlaylists: number;
    privatePlaylists: number;
    totalCreators: number;
  }> {
    if (!this.isAvailable()) {
      return { totalPlaylists: 0, publicPlaylists: 0, privatePlaylists: 0, totalCreators: 0 };
    }

    await this.checkAdminPermissions();

    try {
      const playlistsRef = collection(db!, 'shared_playlists');
      const allSnapshot = await getDocs(playlistsRef);
      const publicSnapshot = await getDocs(query(playlistsRef, where('isPublic', '==', true)));
      
      const allPlaylists = allSnapshot.docs.map(doc => doc.data());
      const creators = new Set(allPlaylists.map(p => p.creatorId).filter(Boolean));

      return {
        totalPlaylists: allSnapshot.size,
        publicPlaylists: publicSnapshot.size,
        privatePlaylists: allSnapshot.size - publicSnapshot.size,
        totalCreators: creators.size
      };
    } catch (error) {
      console.error('❌ Error getting community stats:', error);
      return { totalPlaylists: 0, publicPlaylists: 0, privatePlaylists: 0, totalCreators: 0 };
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
