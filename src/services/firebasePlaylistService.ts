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
  limit,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { SharedPlaylist, PlaylistCategory } from '../utils/sharedPlaylistUtils';
import { authService } from './authService';

// Firestore collection names
const COLLECTIONS = {
  SHARED_PLAYLISTS: 'shared_playlists',
  PLAYLIST_RATINGS: 'playlist_ratings',
  PLAYLIST_DOWNLOADS: 'playlist_downloads'
} as const;

// Rating interface for Firestore
export interface PlaylistRating {
  id?: string;
  playlistId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  createdAt: Timestamp;
}

// Download interface for Firestore
export interface PlaylistDownload {
  id?: string;
  playlistId: string;
  userId: string;
  downloadedAt: Timestamp;
}

export class FirebasePlaylistService {
  private static instance: FirebasePlaylistService;

  private constructor() {}

  // Singleton pattern
  public static getInstance(): FirebasePlaylistService {
    if (!FirebasePlaylistService.instance) {
      FirebasePlaylistService.instance = new FirebasePlaylistService();
    }
    return FirebasePlaylistService.instance;
  }

  // Check if Firebase is available
  public isAvailable(): boolean {
    return isFirebaseConfigured() && !!db;
  }

  // Upload playlist to Firebase (checks for existing version first)
  public async sharePlaylist(playlist: SharedPlaylist): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available - cannot share playlist');
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot share playlist');
      return null;
    }

    try {
      // Check if this playlist is already shared by this user
      if (playlist.originalPlaylistId) {
        const existingShared = await this.getSharedVersionOfPlaylist(playlist.originalPlaylistId);
        if (existingShared) {
          // Update existing shared playlist instead of creating a new one
          const updates = {
            name: playlist.name,
            description: playlist.description,
            tags: playlist.tags,
            isPublic: playlist.isPublic,
            creator: playlist.creator,
            clips: playlist.clips,
            updatedAt: serverTimestamp()
          };

          const success = await this.updatePlaylist(existingShared.id, updates);
          if (success) {
            console.log('✅ Updated existing shared playlist:', existingShared.id);
            return existingShared.id;
          } else {
            throw new Error('Failed to update existing shared playlist');
          }
        }
      }

      // Create new shared playlist if no existing version found
      const playlistData = {
        ...playlist,
        creatorId: currentUser.uid, // Add creator ID for security
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db!, COLLECTIONS.SHARED_PLAYLISTS), playlistData);
      console.log('✅ Playlist shared to Firebase:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error sharing playlist to Firebase:', error);
      throw error;
    }
  }

  // Get playlist by share code
  public async getPlaylistByCode(shareCode: string): Promise<SharedPlaylist | null> {
    if (!this.isAvailable()) {
      console.log('🔍 Firebase not available for playlist search');
      return null;
    }

    try {
      console.log('🔍 Searching Firebase for share code:', shareCode.toUpperCase());

      // Debug: Show total playlists in database
      const allPlaylistsQuery = query(collection(db!, COLLECTIONS.SHARED_PLAYLISTS));
      const allSnapshot = await getDocs(allPlaylistsQuery);
      console.log(`🔍 Total playlists in Firebase: ${allSnapshot.docs.length}`);

      // Now try the specific query
      const q = query(
        collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
        where('shareCode', '==', shareCode.toUpperCase()),
        where('isPublic', '==', true)
      );

      const snapshot = await getDocs(q);

      console.log(`🔍 Specific query returned ${snapshot.docs.length} documents`);

      if (snapshot.empty) {
        console.log('❌ No playlist found with specific query');

        // Try without the isPublic filter
        console.log('🔍 Trying query without isPublic filter...');
        const q2 = query(
          collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
          where('shareCode', '==', shareCode.toUpperCase())
        );

        const snapshot2 = await getDocs(q2);
        console.log(`🔍 Query without isPublic returned ${snapshot2.docs.length} documents`);

        if (!snapshot2.empty) {
          const doc = snapshot2.docs[0];
          const data = doc.data();
          const playlist = {
            ...data,
            id: doc.id, // Use Firebase document ID
            firebaseId: doc.id, // Keep track of Firebase ID separately
            originalId: data.id // Keep the original ID for reference
          } as SharedPlaylist;
          console.log('✅ Found playlist without isPublic filter:', playlist.name);
          console.log('🔍 Playlist isPublic value:', playlist.isPublic);
          console.log('🔍 Firebase document ID:', doc.id);
          console.log('🔍 Original playlist ID:', data.id);
          return playlist;
        }

        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      const playlist = {
        ...data,
        id: doc.id, // Use Firebase document ID, not the original playlist ID
        firebaseId: doc.id, // Keep track of Firebase ID separately
        originalId: data.id // Keep the original ID for reference
      } as SharedPlaylist;
      console.log('✅ Found playlist in Firebase:', playlist.name);
      console.log('🔍 Firebase document ID:', doc.id);
      console.log('🔍 Original playlist ID:', data.id);
      return playlist;
    } catch (error) {
      console.error('❌ Error getting playlist by code:', error);
      return null;
    }
  }

  // Get playlists by category
  public async getPlaylistsByCategory(
    category: PlaylistCategory = 'new', 
    limitCount: number = 20
  ): Promise<SharedPlaylist[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      let q;
      
      // Simplified queries to avoid index requirements during development
      switch (category) {
        case 'featured':
          // Simple query for featured playlists
          q = query(
            collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
            where('isPublic', '==', true),
            limit(limitCount)
          );
          break;

        case 'highly-rated':
          // Simple query for all public playlists (will filter client-side)
          q = query(
            collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
            where('isPublic', '==', true),
            limit(limitCount)
          );
          break;

        case 'trending':
          // Simple query for all public playlists (will filter client-side)
          q = query(
            collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
            where('isPublic', '==', true),
            limit(limitCount)
          );
          break;

        case 'new':
        default:
          // Query for all public playlists ordered by creation date (newest first)
          q = query(
            collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
      }
      
      const snapshot = await getDocs(q);
      const playlists = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id, // Always use Firebase document ID as the primary ID
          firebaseId: doc.id, // Keep track of Firebase ID separately
          originalPlaylistId: data.originalPlaylistId || data.id // Preserve original playlist ID
        } as SharedPlaylist;
      });

      console.log(`✅ Loaded ${playlists.length} playlists for category: ${category}`);
      return playlists;
    } catch (error) {
      console.error(`❌ Error getting playlists by category ${category}:`, error);
      return [];
    }
  }

  // Record a playlist download
  public async recordDownload(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot record download');
      return false;
    }

    try {
      // Check if user already downloaded this playlist
      const existingDownloadQuery = query(
        collection(db!, COLLECTIONS.PLAYLIST_DOWNLOADS),
        where('playlistId', '==', playlistId),
        where('userId', '==', currentUser.uid)
      );
      
      const existingDownloads = await getDocs(existingDownloadQuery);
      
      if (!existingDownloads.empty) {
        console.log('User has already downloaded this playlist');
        return true; // Not an error, just already downloaded
      }

      // Add download record
      await addDoc(collection(db!, COLLECTIONS.PLAYLIST_DOWNLOADS), {
        playlistId,
        userId: currentUser.uid,
        downloadedAt: serverTimestamp()
      });

      // Increment download count on the playlist
      const playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      await updateDoc(playlistRef, {
        downloadCount: increment(1)
      });

      console.log('✅ Download recorded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error recording download:', error);
      return false;
    }
  }

  // Submit a rating for a playlist
  public async ratePlaylist(
    playlistId: string, 
    rating: number, 
    review?: string
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot rate playlist');
      return false;
    }

    if (rating < 1 || rating > 5) {
      console.error('Rating must be between 1 and 5');
      return false;
    }

    try {
      // Remove existing rating from this user for this playlist
      const existingRatingQuery = query(
        collection(db!, COLLECTIONS.PLAYLIST_RATINGS),
        where('playlistId', '==', playlistId),
        where('userId', '==', currentUser.uid)
      );
      
      const existingRatings = await getDocs(existingRatingQuery);
      
      // Delete existing ratings
      for (const ratingDoc of existingRatings.docs) {
        await deleteDoc(ratingDoc.ref);
      }

      // Add new rating
      await addDoc(collection(db!, COLLECTIONS.PLAYLIST_RATINGS), {
        playlistId,
        userId: currentUser.uid,
        rating,
        review: review || null,
        createdAt: serverTimestamp()
      });

      // Recalculate and update playlist's average rating
      await this.updatePlaylistRating(playlistId);
      
      console.log(`✅ Successfully rated playlist ${playlistId} with ${rating} stars`);
      return true;
    } catch (error) {
      console.error('❌ Error rating playlist:', error);
      return false;
    }
  }

  // Update playlist's average rating
  private async updatePlaylistRating(playlistId: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const ratingsQuery = query(
        collection(db!, COLLECTIONS.PLAYLIST_RATINGS),
        where('playlistId', '==', playlistId)
      );
      
      const snapshot = await getDocs(ratingsQuery);
      
      if (!snapshot.empty) {
        const ratings = snapshot.docs.map(doc => doc.data().rating as number);
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        const playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
        await updateDoc(playlistRef, {
          rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
        });
        
        console.log(`✅ Updated playlist rating to ${averageRating}`);
      }
    } catch (error) {
      console.error('❌ Error updating playlist rating:', error);
    }
  }

  // Get user's rating for a playlist
  public async getUserRating(playlistId: string): Promise<PlaylistRating | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.PLAYLIST_RATINGS),
        where('playlistId', '==', playlistId),
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PlaylistRating;
    } catch (error) {
      console.error('❌ Error getting user rating:', error);
      return null;
    }
  }

  // Check if user has downloaded a playlist
  public async hasUserDownloaded(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.PLAYLIST_DOWNLOADS),
        where('playlistId', '==', playlistId),
        where('userId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking download status:', error);
      return false;
    }
  }

  // Get playlists created by current user (including private ones)
  public async getUserPlaylists(): Promise<SharedPlaylist[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot get user playlists');
      return [];
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
        where('creatorId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const playlists = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id, // Always use Firebase document ID as the primary ID
          firebaseId: doc.id, // Keep track of Firebase ID separately
          originalPlaylistId: data.originalPlaylistId || data.id // Preserve original playlist ID
        } as SharedPlaylist;
      });

      console.log(`✅ Loaded ${playlists.length} user playlists`);
      return playlists;
    } catch (error) {
      console.error('❌ Error getting user playlists:', error);
      return [];
    }
  }

  // Update playlist (only by owner)
  public async updatePlaylist(
    playlistId: string,
    updates: Partial<SharedPlaylist>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot update playlist');
      return false;
    }

    try {
      // First verify the user owns this playlist
      const playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (!playlistDoc.exists()) {
        console.error('Playlist not found');
        return false;
      }

      const playlistData = playlistDoc.data();
      if (playlistData.creatorId !== currentUser.uid) {
        console.error('User does not own this playlist');
        return false;
      }

      // Update the playlist
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(playlistRef, updateData);
      console.log('✅ Playlist updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating playlist:', error);
      return false;
    }
  }

  // Delete playlist (only by owner)
  public async deletePlaylist(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot delete playlist');
      return false;
    }

    try {
      console.log('🔍 Deleting playlist:', {
        playlistId,
        currentUserId: currentUser.uid
      });

      // First try to find the playlist by Firebase document ID
      let playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      let playlistDoc = await getDoc(playlistRef);

      // If not found by document ID, try to find by originalPlaylistId
      if (!playlistDoc.exists()) {
        console.log('🔍 Playlist not found by document ID, searching by originalPlaylistId...');
        const q = query(
          collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
          where('originalPlaylistId', '==', playlistId),
          where('creatorId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          playlistRef = doc.ref;
          playlistDoc = doc;
          console.log('✅ Found playlist by originalPlaylistId:', doc.id);
        }
      }

      if (!playlistDoc.exists()) {
        console.error('❌ Playlist not found in Firebase:', playlistId);
        console.log('🔍 Tried both document ID and originalPlaylistId search');
        return false;
      }

      const playlistData = playlistDoc.data();
      console.log('🔍 Playlist data:', {
        creatorId: playlistData.creatorId,
        currentUserId: currentUser.uid,
        isOwner: playlistData.creatorId === currentUser.uid
      });

      if (playlistData.creatorId !== currentUser.uid) {
        console.error('❌ User does not own this playlist');
        return false;
      }

      // Use the actual Firebase document ID for deleting associated data
      const actualPlaylistId = playlistRef.id;
      console.log('🔍 Using playlist ID for deletion:', actualPlaylistId);

      // Delete associated ratings
      const ratingsQuery = query(
        collection(db!, COLLECTIONS.PLAYLIST_RATINGS),
        where('playlistId', '==', actualPlaylistId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      console.log(`🔍 Found ${ratingsSnapshot.docs.length} ratings to delete`);
      for (const ratingDoc of ratingsSnapshot.docs) {
        await deleteDoc(ratingDoc.ref);
      }

      // Delete associated downloads
      const downloadsQuery = query(
        collection(db!, COLLECTIONS.PLAYLIST_DOWNLOADS),
        where('playlistId', '==', actualPlaylistId)
      );
      const downloadsSnapshot = await getDocs(downloadsQuery);
      console.log(`🔍 Found ${downloadsSnapshot.docs.length} downloads to delete`);
      for (const downloadDoc of downloadsSnapshot.docs) {
        await deleteDoc(downloadDoc.ref);
      }

      // Delete the playlist itself
      await deleteDoc(playlistRef);

      console.log('✅ Playlist and associated data deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
      return false;
    }
  }

  // Check if current user owns a playlist
  public async isPlaylistOwner(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (!playlistDoc.exists()) {
        return false;
      }

      const playlistData = playlistDoc.data();
      return playlistData.creatorId === currentUser.uid;
    } catch (error) {
      console.error('❌ Error checking playlist ownership:', error);
      return false;
    }
  }

  // Check if a regular playlist is already shared by the current user
  public async getSharedVersionOfPlaylist(originalPlaylistId: string): Promise<SharedPlaylist | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const q = query(
        collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
        where('creatorId', '==', currentUser.uid),
        where('originalPlaylistId', '==', originalPlaylistId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as SharedPlaylist;
    } catch (error) {
      console.error('❌ Error checking for existing shared version:', error);
      return null;
    }
  }

  // Remove playlist from community (make private) without deleting
  public async removeFromCommunity(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated - cannot remove from community');
      return false;
    }

    try {
      // First try to find the playlist by Firebase document ID
      let playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      let playlistDoc = await getDoc(playlistRef);

      // If not found by document ID, try to find by originalPlaylistId
      if (!playlistDoc.exists()) {
        console.log('🔍 Playlist not found by document ID, searching by originalPlaylistId...');
        const q = query(
          collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
          where('originalPlaylistId', '==', playlistId),
          where('creatorId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          playlistRef = doc.ref;
          playlistDoc = doc;
          console.log('✅ Found playlist by originalPlaylistId:', doc.id);
        }
      }

      if (!playlistDoc.exists()) {
        console.error('Playlist not found');
        return false;
      }

      const playlistData = playlistDoc.data();
      if (playlistData.creatorId !== currentUser.uid) {
        console.error('User does not own this playlist');
        return false;
      }

      // Update playlist to private
      await updateDoc(playlistRef, {
        isPublic: false,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Playlist removed from community (made private)');
      return true;
    } catch (error) {
      console.error('❌ Error removing playlist from community:', error);
      return false;
    }
  }

  // Debug method to find playlist by any ID
  public async findPlaylistByAnyId(playlistId: string): Promise<SharedPlaylist | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      // First try by document ID
      const playlistRef = doc(db!, COLLECTIONS.SHARED_PLAYLISTS, playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (playlistDoc.exists()) {
        const data = playlistDoc.data();
        return {
          ...data,
          id: playlistDoc.id,
          firebaseId: playlistDoc.id,
          originalPlaylistId: data.originalPlaylistId || data.id
        } as SharedPlaylist;
      }

      // Try by originalPlaylistId
      const q = query(
        collection(db!, COLLECTIONS.SHARED_PLAYLISTS),
        where('originalPlaylistId', '==', playlistId)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          firebaseId: doc.id,
          originalPlaylistId: data.originalPlaylistId || data.id
        } as SharedPlaylist;
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding playlist by any ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const firebasePlaylistService = FirebasePlaylistService.getInstance();
