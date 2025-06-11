/**
 * Collaborative Playlist Hook
 * Provides real-time collaborative playlist editing functionality
 */

import { useEffect, useCallback, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useCollaborationStore } from '../stores/collaborationStore';
import { authService } from '../services/authService';
import {
  CollaborativePlaylist,
  PlaylistOperation,
  PlaylistOperationType,
  UserCursor
} from '../types/collaboration';

interface UseCollaborativePlaylistOptions {
  playlistId: string;
  onPlaylistUpdate?: (playlist: CollaborativePlaylist) => void;
  onOperationApplied?: (operation: PlaylistOperation) => void;
  onConflictDetected?: (operation: PlaylistOperation) => void;
}

interface UseCollaborativePlaylistReturn {
  playlist: CollaborativePlaylist | null;
  isConnected: boolean;
  isOwner: boolean;
  canEdit: boolean;
  collaborators: Record<string, any>;
  userPresence: Record<string, UserCursor>;
  
  // Operations
  addClip: (clipData: any, index?: number) => Promise<boolean>;
  removeClip: (clipId: string) => Promise<boolean>;
  reorderClips: (fromIndex: number, toIndex: number) => Promise<boolean>;
  updateClip: (clipId: string, clipData: Partial<any>) => Promise<boolean>;
  updateMetadata: (metadata: Record<string, any>) => Promise<boolean>;
  updateDrinkingSound: (drinkingSoundPath?: string) => Promise<boolean>;
  
  // Presence
  updatePresence: (presence: Partial<UserCursor>) => void;
  
  // Collaboration management
  inviteUser: (email: string, permission: 'editor' | 'viewer') => Promise<boolean>;
  removeCollaborator: (userId: string) => Promise<boolean>;
  leavePlaylist: () => Promise<boolean>;
}

export const useCollaborativePlaylist = (
  options: UseCollaborativePlaylistOptions
): UseCollaborativePlaylistReturn => {
  const { playlistId, onPlaylistUpdate, onOperationApplied, onConflictDetected } = options;
  
  const {
    activeCollaborations,
    userPresence,
    connectionStatus,
    applyOperation,
    updateUserPresence,
    sendInvitation,
    removeCollaborator,
    leaveCollaboration,
    subscribeToCollaborativePlaylist,
    unsubscribeFromPlaylist
  } = useCollaborationStore();

  const currentUser = authService.getCurrentUser();
  const playlist = activeCollaborations[playlistId] || null;
  const presence = userPresence[playlistId] || {};
  
  // Track if we're currently applying an operation to prevent loops
  const isApplyingOperation = useRef(false);

  // Determine user permissions
  const isOwner = playlist?.ownerId === currentUser?.uid;
  const userCollaborator = playlist?.collaborators[currentUser?.uid || ''];
  const canEdit = isOwner || userCollaborator?.permission === 'editor';
  const isConnected = connectionStatus === 'connected';

  // Subscribe to playlist updates
  useEffect(() => {
    if (playlistId) {
      subscribeToCollaborativePlaylist(playlistId);

      return () => {
        unsubscribeFromPlaylist(playlistId);
      };
    }
  }, [playlistId, subscribeToCollaborativePlaylist, unsubscribeFromPlaylist]);

  // Handle playlist updates
  useEffect(() => {
    if (playlist && onPlaylistUpdate) {
      onPlaylistUpdate(playlist);
    }
  }, [playlist, onPlaylistUpdate]);

  // Operation helpers
  const createOperation = useCallback((
    type: PlaylistOperationType,
    data: any
  ): Omit<PlaylistOperation, 'id' | 'timestamp'> => {
    return {
      type,
      userId: currentUser?.uid || '',
      data,
      vectorClock: { [currentUser?.uid || '']: Date.now() },
      dependencies: []
    };
  }, [currentUser?.uid]);

  // Playlist operations
  const addClip = useCallback(async (clipData: any, index?: number): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('add_clip', { clipData, index });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  const removeClip = useCallback(async (clipId: string): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('remove_clip', { clipId });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  const reorderClips = useCallback(async (fromIndex: number, toIndex: number): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('reorder_clips', { fromIndex, toIndex });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  const updateClip = useCallback(async (clipId: string, clipData: Partial<any>): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('update_clip', { clipId, clipData });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  const updateMetadata = useCallback(async (metadata: Record<string, any>): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('update_metadata', { metadata });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  const updateDrinkingSound = useCallback(async (drinkingSoundPath?: string): Promise<boolean> => {
    if (!canEdit || isApplyingOperation.current) return false;
    
    isApplyingOperation.current = true;
    try {
      const operation = createOperation('update_drinking_sound', { drinkingSoundPath });
      const success = await applyOperation(playlistId, operation);
      
      if (success && onOperationApplied) {
        onOperationApplied(operation as PlaylistOperation);
      }
      
      return success;
    } finally {
      isApplyingOperation.current = false;
    }
  }, [canEdit, createOperation, applyOperation, playlistId, onOperationApplied]);

  // Presence management
  const updatePresence = useCallback((presenceUpdate: Partial<UserCursor>) => {
    updateUserPresence(playlistId, presenceUpdate);
  }, [playlistId, updateUserPresence]);

  // Collaboration management
  const inviteUser = useCallback(async (email: string, permission: 'editor' | 'viewer'): Promise<boolean> => {
    if (!isOwner || !currentUser) return false;

    return await sendInvitation({
      inviterId: currentUser.uid,
      inviterName: currentUser.displayName || currentUser.email || 'Unknown',
      playlistId,
      playlistName: playlist?.name || '',
      inviteeEmail: email,
      permission,
      inviteCode: playlist?.inviteCode || '',
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days from now
    });
  }, [isOwner, currentUser, sendInvitation, playlistId, playlist?.name, playlist?.inviteCode]);

  const removeUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!isOwner) return false;
    
    return await removeCollaborator(playlistId, userId);
  }, [isOwner, removeCollaborator, playlistId]);

  const leavePlaylist = useCallback(async (): Promise<boolean> => {
    return await leaveCollaboration(playlistId);
  }, [leaveCollaboration, playlistId]);

  return {
    playlist,
    isConnected,
    isOwner,
    canEdit,
    collaborators: playlist?.collaborators || {},
    userPresence: presence,
    
    // Operations
    addClip,
    removeClip,
    reorderClips,
    updateClip,
    updateMetadata,
    updateDrinkingSound,
    
    // Presence
    updatePresence,
    
    // Collaboration management
    inviteUser,
    removeCollaborator: removeUser,
    leavePlaylist
  };
};
