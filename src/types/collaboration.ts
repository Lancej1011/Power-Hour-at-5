/**
 * Collaborative Playlist Types
 * Defines all types and interfaces for real-time collaborative playlist editing
 */

import { Timestamp } from 'firebase/firestore';
import { RegularPlaylist } from '../stores/playlistStore';
import { YouTubePlaylist, YouTubeClip } from '../utils/youtubeUtils';

// ==================== CORE COLLABORATION TYPES ====================

/**
 * User permission levels for collaborative playlists
 */
export type CollaborationPermission = 'owner' | 'editor' | 'viewer';

/**
 * Collaboration status for a playlist
 */
export type CollaborationStatus = 'active' | 'inactive' | 'archived';

/**
 * User presence status in collaboration
 */
export type UserPresenceStatus = 'online' | 'away' | 'offline';

/**
 * Types of operations that can be performed on a playlist
 */
export type PlaylistOperationType = 
  | 'add_clip' 
  | 'remove_clip' 
  | 'reorder_clips' 
  | 'update_clip' 
  | 'update_metadata' 
  | 'update_drinking_sound';

// ==================== USER & PRESENCE TYPES ====================

/**
 * Collaborator information
 */
export interface Collaborator {
  userId: string;
  displayName: string;
  email?: string;
  avatar?: string;
  permission: CollaborationPermission;
  joinedAt: Timestamp;
  lastActiveAt: Timestamp;
  isOnline: boolean;
  presence: UserPresenceStatus;
  // Current activity
  currentActivity?: {
    type: 'editing_clip' | 'adding_clip' | 'reordering' | 'viewing';
    clipId?: string;
    timestamp: Timestamp;
  };
}

/**
 * User cursor/activity indicator
 */
export interface UserCursor {
  userId: string;
  displayName: string;
  position: {
    clipId?: string;
    action: 'viewing' | 'selecting' | 'editing' | 'dragging';
  };
  color: string; // Unique color for this user
  timestamp: Timestamp;
}

// ==================== OPERATION & CONFLICT RESOLUTION ====================

/**
 * Operational transformation for playlist changes
 */
export interface PlaylistOperation {
  id: string;
  type: PlaylistOperationType;
  userId: string;
  timestamp: Timestamp;
  // Operation-specific data
  data: {
    clipId?: string;
    clipData?: any;
    fromIndex?: number;
    toIndex?: number;
    metadata?: Record<string, any>;
  };
  // For conflict resolution
  vectorClock: Record<string, number>;
  dependencies: string[]; // IDs of operations this depends on
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  operationId: string;
  resolution: 'accept' | 'reject' | 'merge';
  mergedOperation?: PlaylistOperation;
  reason: string;
}

// ==================== COLLABORATIVE PLAYLIST TYPES ====================

/**
 * Base collaborative playlist interface
 */
export interface BaseCollaborativePlaylist {
  id: string;
  name: string;
  description?: string;
  
  // Collaboration metadata
  isCollaborative: true;
  collaborationId: string;
  status: CollaborationStatus;
  
  // Owner and collaborators
  ownerId: string;
  collaborators: Record<string, Collaborator>;
  
  // Permissions and access
  defaultPermission: CollaborationPermission;
  inviteCode?: string;
  isPublic: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastCollaborativeActivity: Timestamp;
  
  // Version control
  version: number;
  operationHistory: PlaylistOperation[];
  
  // Real-time state
  activeUsers: string[]; // Currently online user IDs
  lockState?: {
    isLocked: boolean;
    lockedBy?: string;
    lockedAt?: Timestamp;
    reason?: string;
  };
}

/**
 * Collaborative Regular Playlist (audio files)
 */
export interface CollaborativeRegularPlaylist extends BaseCollaborativePlaylist {
  type: 'regular';
  clips: RegularPlaylist['clips'];
  drinkingSoundPath?: string;
  imagePath?: string;
  date: string;
}

/**
 * Collaborative YouTube Playlist
 */
export interface CollaborativeYouTubePlaylist extends BaseCollaborativePlaylist {
  type: 'youtube';
  clips: YouTubeClip[];
  drinkingSoundPath?: string;
  imagePath?: string;
  date: string;
  // YouTube-specific properties
  thumbnailType?: 'custom' | 'random';
  lastThumbnailUpdate?: string;
}

/**
 * Union type for all collaborative playlists
 */
export type CollaborativePlaylist = CollaborativeRegularPlaylist | CollaborativeYouTubePlaylist;

// ==================== INVITATION & SHARING ====================

/**
 * Collaboration invitation
 */
export interface CollaborationInvitation {
  id: string;
  playlistId: string;
  playlistName: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail?: string;
  inviteeUserId?: string;
  permission: CollaborationPermission;
  inviteCode: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  respondedAt?: Timestamp;
}

// ==================== REAL-TIME EVENTS ====================

/**
 * Real-time collaboration events
 */
export type CollaborationEventType = 
  | 'user_joined'
  | 'user_left'
  | 'user_presence_changed'
  | 'playlist_operation'
  | 'cursor_moved'
  | 'conflict_detected'
  | 'sync_required';

/**
 * Real-time collaboration event
 */
export interface CollaborationEvent {
  id: string;
  type: CollaborationEventType;
  playlistId: string;
  userId: string;
  timestamp: Timestamp;
  data: any; // Event-specific data
}

// ==================== NOTIFICATION TYPES ====================

/**
 * Collaboration notification types
 */
export type CollaborationNotificationType = 
  | 'invitation_received'
  | 'invitation_accepted'
  | 'user_joined'
  | 'user_left'
  | 'playlist_updated'
  | 'conflict_resolved'
  | 'permission_changed';

/**
 * Collaboration notification
 */
export interface CollaborationNotification {
  id: string;
  type: CollaborationNotificationType;
  playlistId: string;
  playlistName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  data?: Record<string, any>;
}

// ==================== STORE STATE TYPES ====================

/**
 * Collaboration store state
 */
export interface CollaborationState {
  // Active collaborations
  activeCollaborations: Record<string, CollaborativePlaylist>;

  // User presence
  userPresence: Record<string, Record<string, UserCursor>>; // playlistId -> userId -> cursor

  // Invitations
  sentInvitations: CollaborationInvitation[];
  receivedInvitations: CollaborationInvitation[];

  // Notifications
  notifications: CollaborationNotification[];
  unreadNotificationCount: number;

  // Real-time connection status
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';

  // Loading states
  isLoading: boolean;
  isJoiningCollaboration: boolean;
  isSendingInvitation: boolean;

  // Error handling
  lastError: string | null;

  // Current user context
  currentUserId: string | null;
  currentUserDisplayName: string | null;
}

// ==================== ACTION TYPES ====================

/**
 * Collaboration store actions
 */
export interface CollaborationActions {
  // Playlist management
  createCollaborativePlaylist: (playlist: Omit<CollaborativePlaylist, 'id' | 'createdAt' | 'updatedAt' | 'collaborationId'>) => Promise<string>;
  updateCollaborativePlaylistMetadata: (playlistId: string, metadata: { name?: string; description?: string }) => Promise<boolean>;
  joinCollaboration: (inviteCode: string) => Promise<boolean>;
  leaveCollaboration: (playlistId: string) => Promise<boolean>;
  deleteCollaborativePlaylist: (playlistId: string) => Promise<boolean>;

  // Operations
  applyOperation: (playlistId: string, operation: Omit<PlaylistOperation, 'id' | 'timestamp'>) => Promise<boolean>;
  resolveConflict: (playlistId: string, resolution: ConflictResolution) => Promise<boolean>;

  // Invitations
  sendInvitation: (invitation: Omit<CollaborationInvitation, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  respondToInvitation: (invitationId: string, response: 'accept' | 'decline') => Promise<boolean>;

  // User presence
  updateUserPresence: (playlistId: string, presence: Partial<UserCursor>) => void;
  setUserStatus: (status: UserPresenceStatus) => void;

  // Permissions
  updateCollaboratorPermission: (playlistId: string, userId: string, permission: CollaborationPermission) => Promise<boolean>;
  removeCollaborator: (playlistId: string, userId: string) => Promise<boolean>;

  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Utility
  refreshCollaborations: () => Promise<void>;
  clearError: () => void;
}

/**
 * Complete collaboration store interface
 */
export interface CollaborationStore extends CollaborationState, CollaborationActions {}

// ==================== UTILITY TYPES ====================

/**
 * Helper type for creating new collaborative playlists
 */
export type CreateCollaborativePlaylistInput = {
  name: string;
  description?: string;
  type: 'regular' | 'youtube';
  defaultPermission: CollaborationPermission;
  isPublic: boolean;
  initialClips?: any[];
  drinkingSoundPath?: string;
  imagePath?: string;
};

/**
 * Helper type for operation data based on operation type
 */
export type OperationData<T extends PlaylistOperationType> =
  T extends 'add_clip' ? { clipData: any; index?: number } :
  T extends 'remove_clip' ? { clipId: string } :
  T extends 'reorder_clips' ? { fromIndex: number; toIndex: number } :
  T extends 'update_clip' ? { clipId: string; clipData: Partial<any> } :
  T extends 'update_metadata' ? { metadata: Record<string, any> } :
  T extends 'update_drinking_sound' ? { drinkingSoundPath?: string } :
  Record<string, any>;

/**
 * Real-time listener callback types
 */
export type CollaborationEventListener = (event: CollaborationEvent) => void;
export type PresenceUpdateListener = (playlistId: string, presence: Record<string, UserCursor>) => void;
export type ConnectionStatusListener = (status: CollaborationState['connectionStatus']) => void;
