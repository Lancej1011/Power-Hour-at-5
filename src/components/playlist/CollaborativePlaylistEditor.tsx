/**
 * Collaborative Playlist Editor
 * Main component for editing collaborative playlists with real-time features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  Fab
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  CloudOff as OfflineIcon,
  Cloud as OnlineIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { useCollaborativePlaylist } from '../../hooks/useCollaborativePlaylist';
import { CollaborativePlaylist, PlaylistOperation } from '../../types/collaboration';
import CollaboratorsList from './CollaboratorsList';
import UserPresenceIndicator from './UserPresenceIndicator';
import CollaborationInviteDialog from './CollaborationInviteDialog';
import ConflictResolutionDialog from './ConflictResolutionDialog';

interface CollaborativePlaylistEditorProps {
  playlistId: string;
  onClose?: () => void;
  onPlaylistUpdate?: (playlist: CollaborativePlaylist) => void;
}

const CollaborativePlaylistEditor: React.FC<CollaborativePlaylistEditorProps> = ({
  playlistId,
  onClose,
  onPlaylistUpdate
}) => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingOperations, setConflictingOperations] = useState<PlaylistOperation[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const {
    playlist,
    isConnected,
    isOwner,
    canEdit,
    collaborators,
    userPresence,
    addClip,
    removeClip,
    reorderClips,
    updateClip,
    updateMetadata,
    updateDrinkingSound,
    updatePresence,
    inviteUser,
    removeCollaborator,
    leavePlaylist
  } = useCollaborativePlaylist({
    playlistId,
    onPlaylistUpdate,
    onOperationApplied: (operation) => {
      showSnackbar(`Operation applied: ${operation.type}`, 'success');
    },
    onConflictDetected: (operation) => {
      setConflictingOperations(prev => [...prev, operation]);
      setConflictDialogOpen(true);
    }
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !canEdit) return;
    
    const { source, destination } = result;
    if (source.index === destination.index) return;

    // Update presence to show dragging activity
    updatePresence({
      position: {
        action: 'dragging',
        clipId: playlist?.clips[source.index]?.id
      }
    });

    try {
      const success = await reorderClips(source.index, destination.index);
      if (success) {
        showSnackbar('Clips reordered successfully', 'success');
      } else {
        showSnackbar('Failed to reorder clips', 'error');
      }
    } catch (error) {
      showSnackbar('Error reordering clips', 'error');
    } finally {
      // Reset presence
      updatePresence({
        position: { action: 'viewing' }
      });
    }
  };

  const handleRemoveClip = async (clipId: string) => {
    if (!canEdit) return;

    try {
      const success = await removeClip(clipId);
      if (success) {
        showSnackbar('Clip removed successfully', 'success');
      } else {
        showSnackbar('Failed to remove clip', 'error');
      }
    } catch (error) {
      showSnackbar('Error removing clip', 'error');
    }
  };

  const handleInviteUser = async (email: string, permission: 'editor' | 'viewer') => {
    try {
      const success = await inviteUser(email, permission);
      if (success) {
        showSnackbar('Invitation sent successfully', 'success');
        setInviteDialogOpen(false);
      } else {
        showSnackbar('Failed to send invitation', 'error');
      }
    } catch (error) {
      showSnackbar('Error sending invitation', 'error');
    }
  };

  const handleConflictResolution = async (resolution: any) => {
    // Handle conflict resolution logic here
    setConflictDialogOpen(false);
    setConflictingOperations([]);
    showSnackbar('Conflict resolved', 'success');
  };

  if (!playlist) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Loading collaborative playlist...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {playlist.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  icon={isConnected ? <OnlineIcon /> : <OfflineIcon />}
                  label={isConnected ? 'Connected' : 'Offline'}
                  size="small"
                  sx={{
                    backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
                    color: 'white'
                  }}
                />
                <Chip
                  label={isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOwner && (
              <Tooltip title="Invite collaborators">
                <IconButton
                  onClick={() => setInviteDialogOpen(true)}
                  sx={{ color: 'white' }}
                >
                  <PersonAddIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onClose && (
              <Tooltip title="Close editor">
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          You are currently offline. Changes will be synced when connection is restored.
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Playlist Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Clips ({playlist.clips.length})
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="playlist-clips">
              {(provided) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{ minHeight: 200 }}
                >
                  {playlist.clips.map((clip, index) => {
                    // Ensure unique keys for collaborative playlist clips
                    const uniqueKey = clip.id ? `${clip.id}-${index}` : `clip-${index}-${playlist.id}`;
                    const uniqueDraggableId = clip.id ? `${clip.id}-drag-${index}` : `drag-${index}-${playlist.id}`;

                    return (
                    <Draggable
                      key={uniqueKey}
                      draggableId={uniqueDraggableId}
                      index={index}
                      isDragDisabled={!canEdit}
                    >
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          elevation={snapshot.isDragging ? 4 : 1}
                          sx={{
                            p: 2,
                            mb: 1,
                            backgroundColor: snapshot.isDragging 
                              ? 'action.hover' 
                              : 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            cursor: canEdit ? 'grab' : 'default',
                            '&:hover': {
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1" sx={{ flex: 1 }}>
                              {index + 1}. {clip.name || clip.title || 'Untitled'}
                            </Typography>
                            
                            {/* User Presence for this clip */}
                            <UserPresenceIndicator
                              presence={userPresence}
                              playlistId={playlistId}
                              clipId={clip.id}
                              compact={true}
                            />

                            {canEdit && (
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveClip(clip.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <CloseIcon />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      )}
                    </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>

          {playlist.clips.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
              <Typography variant="body1" color="text.secondary">
                No clips in this playlist yet.
                {canEdit && ' Start adding clips to begin collaborating!'}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Sidebar */}
        <Paper
          elevation={2}
          sx={{
            width: 300,
            borderRadius: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            overflow: 'auto'
          }}
        >
          <Box sx={{ p: 2 }}>
            <CollaboratorsList
              playlist={playlist}
              onInviteClick={() => setInviteDialogOpen(true)}
            />
          </Box>
        </Paper>
      </Box>

      {/* Floating Action Button for Mobile */}
      {isOwner && (
        <Fab
          color="secondary"
          onClick={() => setInviteDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          <PersonAddIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <CollaborationInviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        playlistId={playlistId}
        playlistName={playlist.name}
        inviteCode={playlist.inviteCode}
      />

      <ConflictResolutionDialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        conflictingOperations={conflictingOperations}
        onResolve={handleConflictResolution}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CollaborativePlaylistEditor;
