/**
 * Firebase Service for Collaborative Playlists
 * Handles all Firebase operations for real-time collaborative playlist editing
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
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';

/**
 * Helper function to remove undefined values from objects before sending to Firebase
 * Firebase doesn't allow undefined values in documents
 */
function sanitizeForFirebase(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirebase(value);
      }
    }
    return sanitized;
  }

  return obj;
}
import { db, isFirebaseConfigured } from '../config/firebase';
import { authService } from './authService';
import {
  CollaborativePlaylist,
  CollaborationInvitation,
  PlaylistOperation,
  CollaborationEvent,
  CollaborationNotification,
  UserCursor,
  Collaborator,
  CollaborationPermission
} from '../types/collaboration';

// ==================== FIRESTORE COLLECTIONS ====================

export const COLLABORATION_COLLECTIONS = {
  COLLABORATIVE_PLAYLISTS: 'collaborative_playlists',
  COLLABORATION_INVITATIONS: 'collaboration_invitations',
  PLAYLIST_OPERATIONS: 'playlist_operations',
  COLLABORATION_EVENTS: 'collaboration_events',
  COLLABORATION_NOTIFICATIONS: 'collaboration_notifications',
  USER_PRESENCE: 'user_presence'
} as const;

// ==================== FIREBASE SERVICE CLASS ====================

class CollaborationFirebaseService {
  private unsubscribeFunctions: Map<string, () => void> = new Map();

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return isFirebaseConfigured() && !!db;
  }

  /**
   * Get current authenticated user
   */
  private getCurrentUser() {
    return authService.getCurrentUser();
  }

  // ==================== COLLABORATIVE PLAYLIST OPERATIONS ====================

  /**
   * Create a new collaborative playlist
   */
  async createCollaborativePlaylist(
    playlistData: Omit<CollaborativePlaylist, 'id' | 'createdAt' | 'updatedAt' | 'collaborationId'>
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('Firebase not available for collaborative playlist creation');
      return null;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.warn('User not authenticated');
      return null;
    }

    try {
      const collaborationId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create collaborator data without undefined values
      const collaboratorData: any = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Unknown User',
        permission: 'owner',
        joinedAt: serverTimestamp() as Timestamp,
        lastActiveAt: serverTimestamp() as Timestamp,
        isOnline: true,
        presence: 'online'
      };

      // Only add email if it exists (Firebase doesn't allow undefined)
      if (currentUser.email) {
        collaboratorData.email = currentUser.email;
      }

      const playlist: Omit<CollaborativePlaylist, 'id'> = {
        ...playlistData,
        collaborationId,
        ownerId: currentUser.uid,
        collaborators: {
          [currentUser.uid]: collaboratorData
        },
        activeUsers: [currentUser.uid],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        lastCollaborativeActivity: serverTimestamp() as Timestamp,
        version: 1,
        operationHistory: []
      };

      // Sanitize the playlist data to remove any undefined values
      const sanitizedPlaylist = sanitizeForFirebase(playlist);
      const docRef = await addDoc(collection(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS), sanitizedPlaylist);
      console.log('✅ Collaborative playlist created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating collaborative playlist:', error);
      throw error;
    }
  }

  /**
   * Get collaborative playlist by ID
   */
  async getCollaborativePlaylist(playlistId: string): Promise<CollaborativePlaylist | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const docRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CollaborativePlaylist;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting collaborative playlist:', error);
      return null;
    }
  }

  /**
   * Update collaborative playlist
   */
  async updateCollaborativePlaylist(
    playlistId: string, 
    updates: Partial<CollaborativePlaylist>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const docRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);
      const updateData = sanitizeForFirebase({
        ...updates,
        updatedAt: serverTimestamp(),
        lastCollaborativeActivity: serverTimestamp()
      });
      await updateDoc(docRef, updateData);
      
      console.log('✅ Collaborative playlist updated:', playlistId);
      return true;
    } catch (error) {
      console.error('❌ Error updating collaborative playlist:', error);
      return false;
    }
  }

  /**
   * Delete collaborative playlist
   */
  async deleteCollaborativePlaylist(playlistId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      // Check if user is owner
      const playlist = await this.getCollaborativePlaylist(playlistId);
      if (!playlist || playlist.ownerId !== currentUser.uid) {
        console.warn('User not authorized to delete this playlist');
        return false;
      }

      const batch = writeBatch(db!);
      
      // Delete playlist
      const playlistRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);
      batch.delete(playlistRef);
      
      // Delete related operations
      const operationsQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.PLAYLIST_OPERATIONS),
        where('playlistId', '==', playlistId)
      );
      const operationsSnapshot = await getDocs(operationsQuery);
      operationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete related events
      const eventsQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_EVENTS),
        where('playlistId', '==', playlistId)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      eventsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('✅ Collaborative playlist deleted:', playlistId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting collaborative playlist:', error);
      return false;
    }
  }

  // ==================== REAL-TIME LISTENERS ====================

  /**
   * Subscribe to collaborative playlist changes
   */
  subscribeToPlaylist(
    playlistId: string, 
    callback: (playlist: CollaborativePlaylist | null) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const docRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const playlist = { id: doc.id, ...doc.data() } as CollaborativePlaylist;
        callback(playlist);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ Error in playlist subscription:', error);
      callback(null);
    });

    const key = `playlist_${playlistId}`;
    this.unsubscribeFunctions.set(key, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Subscribe to playlist operations
   */
  subscribeToOperations(
    playlistId: string,
    callback: (operations: PlaylistOperation[]) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const operationsQuery = query(
      collection(db!, COLLABORATION_COLLECTIONS.PLAYLIST_OPERATIONS),
      where('playlistId', '==', playlistId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(operationsQuery, (snapshot) => {
      const operations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlaylistOperation[];
      
      callback(operations);
    }, (error) => {
      console.error('❌ Error in operations subscription:', error);
      callback([]);
    });

    const key = `operations_${playlistId}`;
    this.unsubscribeFunctions.set(key, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Subscribe to user presence
   */
  subscribeToPresence(
    playlistId: string,
    callback: (presence: Record<string, UserCursor>) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const presenceQuery = query(
      collection(db!, COLLABORATION_COLLECTIONS.USER_PRESENCE),
      where('playlistId', '==', playlistId)
    );

    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const presence: Record<string, UserCursor> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserCursor & { playlistId: string };
        presence[data.userId] = data;
      });
      
      callback(presence);
    }, (error) => {
      console.error('❌ Error in presence subscription:', error);
      callback({});
    });

    const key = `presence_${playlistId}`;
    this.unsubscribeFunctions.set(key, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Subscribe to notifications for current user
   */
  subscribeToNotifications(
    callback: (notifications: CollaborationNotification[]) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return () => {};
    }

    const notificationsQuery = query(
      collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_NOTIFICATIONS),
      where('toUserId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CollaborationNotification[];

      callback(notifications);
    }, (error) => {
      console.error('❌ Error in notifications subscription:', error);
      callback([]);
    });

    const key = `notifications_${currentUser.uid}`;
    this.unsubscribeFunctions.set(key, unsubscribe);

    return unsubscribe;
  }

  /**
   * Subscribe to invitations for current user
   */
  subscribeToInvitations(
    callback: (invitations: CollaborationInvitation[]) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return () => {};
    }

    // Subscribe to invitations by email
    const invitationsQuery = query(
      collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_INVITATIONS),
      where('inviteeEmail', '==', currentUser.email || ''),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(invitationsQuery, (snapshot) => {
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CollaborationInvitation[];

      callback(invitations);
    }, (error) => {
      console.error('❌ Error in invitations subscription:', error);
      callback([]);
    });

    const key = `invitations_${currentUser.uid}`;
    this.unsubscribeFunctions.set(key, unsubscribe);

    return unsubscribe;
  }

  /**
   * Unsubscribe from all listeners for a playlist
   */
  unsubscribeFromPlaylist(playlistId: string): void {
    const keys = [`playlist_${playlistId}`, `operations_${playlistId}`, `presence_${playlistId}`];

    keys.forEach(key => {
      const unsubscribe = this.unsubscribeFunctions.get(key);
      if (unsubscribe) {
        unsubscribe();
        this.unsubscribeFunctions.delete(key);
      }
    });
  }

  /**
   * Unsubscribe from all listeners
   */
  unsubscribeAll(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions.clear();
  }

  // ==================== OPERATIONS ====================

  /**
   * Apply a playlist operation
   */
  async applyOperation(
    playlistId: string,
    operation: Omit<PlaylistOperation, 'id' | 'timestamp'>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const operationData = {
        ...operation,
        playlistId,
        userId: currentUser.uid,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db!, COLLABORATION_COLLECTIONS.PLAYLIST_OPERATIONS), operationData);
      console.log('✅ Operation applied:', operation.type);
      return true;
    } catch (error) {
      console.error('❌ Error applying operation:', error);
      return false;
    }
  }

  // ==================== USER PRESENCE ====================

  /**
   * Update user presence
   */
  async updateUserPresence(
    playlistId: string,
    presence: Omit<UserCursor, 'timestamp'>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const presenceData = {
        ...presence,
        playlistId,
        timestamp: serverTimestamp()
      };

      const presenceRef = doc(db!, COLLABORATION_COLLECTIONS.USER_PRESENCE, `${playlistId}_${currentUser.uid}`);
      await updateDoc(presenceRef, presenceData);

      return true;
    } catch (error) {
      // Document might not exist, try to create it
      try {
        const presenceData = {
          ...presence,
          playlistId,
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db!, COLLABORATION_COLLECTIONS.USER_PRESENCE), presenceData);
        return true;
      } catch (createError) {
        console.error('❌ Error updating user presence:', createError);
        return false;
      }
    }
  }

  // ==================== INVITATIONS ====================

  /**
   * Send collaboration invitation
   */
  async sendInvitation(
    invitation: Omit<CollaborationInvitation, 'id' | 'createdAt' | 'status'>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const invitationData = {
        ...invitation,
        inviterId: currentUser.uid,
        inviterName: currentUser.displayName || 'Unknown User',
        status: 'pending' as const,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_INVITATIONS), invitationData);
      console.log('✅ Invitation sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      return false;
    }
  }

  /**
   * Create in-app notification for invitation
   */
  async createInvitationNotification(data: {
    playlistId: string;
    playlistName: string;
    inviterUserId: string;
    inviterName: string;
    inviteeEmail: string;
    permission: 'editor' | 'viewer';
    inviteCode: string;
    message?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Find user by email to get their userId
      const usersQuery = query(
        collection(db!, 'users'),
        where('email', '==', data.inviteeEmail)
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        console.log('📧 User not found by email, invitation will be pending until they sign up');
        return true; // Still consider success - invitation exists for when they sign up
      }

      const inviteeDoc = usersSnapshot.docs[0];
      const inviteeUserId = inviteeDoc.id;

      const notificationData = {
        type: 'invitation_received',
        playlistId: data.playlistId,
        playlistName: data.playlistName,
        fromUserId: data.inviterUserId,
        fromUserName: data.inviterName,
        toUserId: inviteeUserId,
        message: `${data.inviterName} invited you to collaborate on "${data.playlistName}"`,
        isRead: false,
        createdAt: serverTimestamp(),
        data: {
          inviteCode: data.inviteCode,
          permission: data.permission,
          personalMessage: data.message
        }
      };

      await addDoc(collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_NOTIFICATIONS), notificationData);
      console.log('✅ Invitation notification created');
      return true;
    } catch (error) {
      console.error('❌ Error creating invitation notification:', error);
      return false;
    }
  }

  /**
   * Respond to collaboration invitation
   */
  async respondToInvitation(
    invitationId: string,
    response: 'accept' | 'decline'
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const invitationRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATION_INVITATIONS, invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        console.error('Invitation not found');
        return false;
      }

      const invitation = invitationDoc.data() as CollaborationInvitation;

      // Update invitation status
      await updateDoc(invitationRef, {
        status: response === 'accept' ? 'accepted' : 'declined',
        respondedAt: serverTimestamp()
      });

      if (response === 'accept') {
        // Add user to collaborative playlist
        const playlistRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, invitation.playlistId);
        const playlistDoc = await getDoc(playlistRef);

        if (playlistDoc.exists()) {
          const collaboratorData = {
            userId: currentUser.uid,
            displayName: currentUser.displayName || 'Unknown User',
            email: currentUser.email,
            permission: invitation.permission,
            joinedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
            isOnline: true,
            presence: 'online'
          };

          await updateDoc(playlistRef, {
            [`collaborators.${currentUser.uid}`]: collaboratorData,
            activeUsers: arrayUnion(currentUser.uid),
            lastCollaborativeActivity: serverTimestamp()
          });

          console.log('✅ User added to collaborative playlist');
        }
      }

      console.log(`✅ Invitation ${response}ed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error ${response}ing invitation:`, error);
      return false;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const notificationRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATION_NOTIFICATIONS, notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });

      console.log('✅ Notification marked as read');
      return true;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get user's invitations (sent and received)
   */
  async getUserInvitations(): Promise<{ sent: CollaborationInvitation[]; received: CollaborationInvitation[] }> {
    if (!this.isAvailable()) {
      return { sent: [], received: [] };
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { sent: [], received: [] };
    }

    try {
      // Get sent invitations
      const sentQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_INVITATIONS),
        where('inviterId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sent = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CollaborationInvitation[];

      // Get received invitations
      const receivedQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATION_INVITATIONS),
        where('inviteeEmail', '==', currentUser.email || ''),
        orderBy('createdAt', 'desc')
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const received = receivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CollaborationInvitation[];

      return { sent, received };
    } catch (error) {
      console.error('❌ Error getting user invitations:', error);
      return { sent: [], received: [] };
    }
  }





  /**
   * Convert an existing playlist to collaborative
   */
  async convertToCollaborative(
    sourcePlaylist: any,
    sourceType: 'regular' | 'youtube'
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      // Generate invite code
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      // Create collaborator data for the owner
      const ownerCollaborator: any = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Unknown User',
        permission: 'owner',
        joinedAt: serverTimestamp() as Timestamp,
        lastActiveAt: serverTimestamp() as Timestamp,
        isOnline: true,
        presence: 'online'
      };

      // Only add email if it exists
      if (currentUser.email) {
        ownerCollaborator.email = currentUser.email;
      }

      // Create the collaborative playlist data
      const collaborativePlaylistData: any = {
        name: sourcePlaylist.name,
        description: `Collaborative version of "${sourcePlaylist.name}"`,
        type: sourceType === 'youtube' ? 'youtube' : 'regular',
        isCollaborative: true,
        status: 'active',
        ownerId: currentUser.uid,
        collaborators: {
          [currentUser.uid]: ownerCollaborator
        },
        defaultPermission: 'editor',
        inviteCode,
        isPublic: false,
        version: 1,
        operationHistory: [],
        activeUsers: [currentUser.uid],
        clips: sourcePlaylist.clips || [],
        date: sourcePlaylist.date || new Date().toISOString(),
        lastCollaborativeActivity: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Preserve original playlist metadata
        originalPlaylistId: sourcePlaylist.id,
        originalPlaylistType: sourceType
      };

      // Add optional fields only if they exist
      if (sourcePlaylist.drinkingSoundPath) {
        collaborativePlaylistData.drinkingSoundPath = sourcePlaylist.drinkingSoundPath;
      }
      if (sourcePlaylist.imagePath) {
        collaborativePlaylistData.imagePath = sourcePlaylist.imagePath;
      }

      // Create the collaborative playlist
      const playlistId = await this.createCollaborativePlaylist(collaborativePlaylistData);

      if (playlistId) {
        console.log(`✅ Converted ${sourceType} playlist "${sourcePlaylist.name}" to collaborative playlist:`, playlistId);
        return playlistId;
      } else {
        throw new Error('Failed to create collaborative playlist');
      }
    } catch (error) {
      console.error('❌ Error converting playlist to collaborative:', error);
      return null;
    }
  }

  /**
   * Join collaborative playlist using invite code
   */
  async joinWithInviteCode(inviteCode: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      console.log('🔄 Looking for playlist with invite code:', inviteCode);

      // Find playlist by invite code
      const playlistQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS),
        where('inviteCode', '==', inviteCode.toUpperCase()),
        where('status', '==', 'active')
      );

      const playlistSnapshot = await getDocs(playlistQuery);

      if (playlistSnapshot.empty) {
        console.log('❌ No playlist found with invite code:', inviteCode);
        return null;
      }

      const playlistDoc = playlistSnapshot.docs[0];
      const playlist = { id: playlistDoc.id, ...playlistDoc.data() } as CollaborativePlaylist;

      // Check if user is already a collaborator
      if (playlist.collaborators && playlist.collaborators[currentUser.uid]) {
        console.log('ℹ️ User is already a collaborator on this playlist');
        return playlist.id;
      }

      // Add user as collaborator
      const collaboratorData: any = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Unknown User',
        permission: playlist.defaultPermission || 'editor',
        joinedAt: serverTimestamp() as Timestamp,
        lastActiveAt: serverTimestamp() as Timestamp,
        isOnline: true,
        presence: 'online'
      };

      // Only add email if it exists
      if (currentUser.email) {
        collaboratorData.email = currentUser.email;
      }

      // Update the playlist with new collaborator
      const playlistRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlist.id);
      await updateDoc(playlistRef, {
        [`collaborators.${currentUser.uid}`]: collaboratorData,
        activeUsers: arrayUnion(currentUser.uid),
        lastCollaborativeActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Successfully joined collaborative playlist:', playlist.id);
      return playlist.id;

    } catch (error) {
      console.error('❌ Error joining with invite code:', error);
      return null;
    }
  }

  /**
   * Get collaborative playlists for current user (owned or collaborating)
   */
  async getUserCollaborations(): Promise<CollaborativePlaylist[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    try {
      const playlists: CollaborativePlaylist[] = [];

      // Get playlists owned by the user
      const ownedQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS),
        where('ownerId', '==', currentUser.uid),
        where('status', '==', 'active')
      );
      const ownedSnapshot = await getDocs(ownedQuery);

      ownedSnapshot.docs.forEach(doc => {
        playlists.push({ id: doc.id, ...doc.data() } as CollaborativePlaylist);
      });

      // Get playlists where user is a collaborator
      // Note: Firebase doesn't support querying map fields directly, so we need to get all playlists
      // and filter client-side. For better performance, consider restructuring data in the future.
      const allPlaylistsQuery = query(
        collection(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS),
        where('status', '==', 'active')
      );
      const allPlaylistsSnapshot = await getDocs(allPlaylistsQuery);

      allPlaylistsSnapshot.docs.forEach(doc => {
        const playlist = { id: doc.id, ...doc.data() } as CollaborativePlaylist;

        // Check if user is a collaborator (but not owner, to avoid duplicates)
        if (playlist.ownerId !== currentUser.uid &&
            playlist.collaborators &&
            playlist.collaborators[currentUser.uid]) {
          playlists.push(playlist);
        }
      });

      console.log(`✅ Loaded ${playlists.length} collaborative playlists for user`);
      return playlists;
    } catch (error) {
      console.error('❌ Error getting user collaborations:', error);
      return [];
    }
  }



  // ==================== COLLABORATOR MANAGEMENT ====================

  /**
   * Add collaborator to playlist
   */
  async addCollaborator(
    playlistId: string,
    userId: string,
    permission: CollaborationPermission
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const playlistRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);

      // Get user info (you might want to fetch this from user profiles)
      const collaborator: Collaborator = {
        userId,
        displayName: 'New Collaborator', // TODO: Fetch from user profile
        permission,
        joinedAt: serverTimestamp() as Timestamp,
        lastActiveAt: serverTimestamp() as Timestamp,
        isOnline: true,
        presence: 'online'
      };

      await updateDoc(playlistRef, {
        [`collaborators.${userId}`]: collaborator,
        activeUsers: arrayUnion(userId),
        updatedAt: serverTimestamp(),
        lastCollaborativeActivity: serverTimestamp()
      });

      console.log('✅ Collaborator added:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error adding collaborator:', error);
      return false;
    }
  }

  /**
   * Remove collaborator from playlist
   */
  async removeCollaborator(playlistId: string, userId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const playlistRef = doc(db!, COLLABORATION_COLLECTIONS.COLLABORATIVE_PLAYLISTS, playlistId);

      // Check if current user has permission to remove collaborators
      const playlist = await this.getCollaborativePlaylist(playlistId);
      if (!playlist || (playlist.ownerId !== currentUser.uid && userId !== currentUser.uid)) {
        console.warn('User not authorized to remove this collaborator');
        return false;
      }

      await updateDoc(playlistRef, {
        [`collaborators.${userId}`]: deleteField(),
        activeUsers: arrayRemove(userId),
        updatedAt: serverTimestamp(),
        lastCollaborativeActivity: serverTimestamp()
      });

      console.log('✅ Collaborator removed:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error removing collaborator:', error);
      return false;
    }
  }
}

// Export singleton instance
export const collaborationFirebaseService = new CollaborationFirebaseService();
