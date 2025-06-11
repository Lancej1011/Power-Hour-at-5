/**
 * Playlist Components Index
 * Centralized exports for all playlist-related components
 */

export { default as PlaylistSyncIndicator } from './PlaylistSyncIndicator';
export { default as PlaylistMigrationDialog } from './PlaylistMigrationDialog';
export { default as CollaborativePlaylistDialog } from './CollaborativePlaylistDialog';
export { default as CollaborationInviteDialog } from './CollaborationInviteDialog';
export { default as CollaboratorsList } from './CollaboratorsList';
export { default as UserPresenceIndicator } from './UserPresenceIndicator';
export { default as CollaborationNotifications } from './CollaborationNotifications';
export { default as PlaylistConversionDialog } from './PlaylistConversionDialog';
export { default as JoinCollaborativePlaylistDialog } from './JoinCollaborativePlaylistDialog';
export { default as ConflictResolutionDialog } from './ConflictResolutionDialog';
export { default as CollaborativePlaylistEditor } from './CollaborativePlaylistEditor';

// Re-export hooks for convenience
export {
  usePlaylist,
  useRegularPlaylists,
  useYouTubePlaylists,
  usePlaylistSync,
  usePlaylistMigration
} from '../../hooks/usePlaylist';
export { useCollaborativePlaylist } from '../../hooks/useCollaborativePlaylist';

// Re-export store types
export type {
  RegularPlaylist,
  PlaylistSyncStatus,
  PlaylistStore
} from '../../stores/playlistStore';

// Re-export collaboration types
export type {
  CollaborativePlaylist,
  CollaborationPermission,
  PlaylistOperation,
  UserCursor,
  CollaborationInvitation,
  CollaborationNotification
} from '../../types/collaboration';
