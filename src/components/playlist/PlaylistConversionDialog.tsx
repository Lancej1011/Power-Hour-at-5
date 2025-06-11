/**
 * Dialog for converting existing playlists to collaborative playlists
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Group as GroupIcon,
  PlaylistPlay as PlaylistIcon,
  Share as ShareIcon,
  Security as SecurityIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useCollaborationStore } from '../../stores/collaborationStore';

interface PlaylistConversionDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: any;
  playlistType: 'regular' | 'youtube';
  onSuccess?: (collaborativePlaylistId: string) => void;
}

const PlaylistConversionDialog: React.FC<PlaylistConversionDialogProps> = ({
  open,
  onClose,
  playlist,
  playlistType,
  onSuccess
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [newPlaylistId, setNewPlaylistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { convertToCollaborative, lastError } = useCollaborationStore();

  const handleConvert = async () => {
    if (!playlist) return;

    setIsConverting(true);
    setError(null);

    try {
      const collaborativePlaylistId = await convertToCollaborative(playlist, playlistType);
      
      if (collaborativePlaylistId) {
        setNewPlaylistId(collaborativePlaylistId);
        setConversionComplete(true);
        
        if (onSuccess) {
          onSuccess(collaborativePlaylistId);
        }
      } else {
        setError(lastError || 'Failed to convert playlist to collaborative');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during conversion');
    } finally {
      setIsConverting(false);
    }
  };

  const handleClose = () => {
    setIsConverting(false);
    setConversionComplete(false);
    setNewPlaylistId(null);
    setError(null);
    onClose();
  };

  const getPlaylistTypeLabel = () => {
    return playlistType === 'youtube' ? 'YouTube Playlist' : 'Regular Playlist';
  };

  const getPlaylistTypeColor = () => {
    return playlistType === 'youtube' ? 'error' : 'primary';
  };

  if (!playlist) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        color: 'white', 
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <GroupIcon sx={{ color: '#4CAF50' }} />
        {conversionComplete ? 'Conversion Complete!' : 'Make Playlist Collaborative'}
      </DialogTitle>

      <DialogContent sx={{ color: 'white' }}>
        {!conversionComplete ? (
          <>
            {/* Playlist Info */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <PlaylistIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  {playlist.name}
                </Typography>
                <Chip 
                  label={getPlaylistTypeLabel()}
                  color={getPlaylistTypeColor()}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                {playlist.clips?.length || 0} clips
              </Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }} />

            {/* What will happen */}
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                '& .MuiAlert-message': { color: 'white' }
              }}
              icon={<InfoIcon sx={{ color: '#2196F3' }} />}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                What happens when you convert:
              </Typography>
              <List dense sx={{ pl: 0 }}>
                <ListItem sx={{ py: 0.5, pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Your original playlist will be preserved unchanged"
                    primaryTypographyProps={{ variant: 'body2', color: 'white' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="A new collaborative version will be created with all clips and settings"
                    primaryTypographyProps={{ variant: 'body2', color: 'white' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="You'll be able to invite others to collaborate on the new version"
                    primaryTypographyProps={{ variant: 'body2', color: 'white' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Real-time collaboration features will be enabled"
                    primaryTypographyProps={{ variant: 'body2', color: 'white' }}
                  />
                </ListItem>
              </List>
            </Alert>

            {/* Features */}
            <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShareIcon sx={{ color: '#4CAF50' }} />
              Collaboration Features
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              <Chip 
                label="Real-time editing" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Email invitations" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Permission management" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Live cursors" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Version history" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        ) : (
          <>
            {/* Success state */}
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                '& .MuiAlert-message': { color: 'white' }
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🎉 Playlist successfully converted to collaborative!
              </Typography>
              <Typography variant="body2">
                Your new collaborative playlist is ready. You can now invite others to collaborate and enjoy real-time editing features.
              </Typography>
            </Alert>

            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                New Collaborative Playlist ID:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  color: '#4CAF50',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  flex: 1
                }}>
                  {newPlaylistId}
                </Typography>
                <Button
                  size="small"
                  startIcon={<CopyIcon />}
                  onClick={() => {
                    if (newPlaylistId) {
                      navigator.clipboard.writeText(newPlaylistId);
                    }
                  }}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  Copy
                </Button>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        {!conversionComplete ? (
          <>
            <Button 
              onClick={handleClose}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConvert}
              disabled={isConverting}
              startIcon={isConverting ? <CircularProgress size={16} /> : <GroupIcon />}
              sx={{
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#45a049' },
                '&:disabled': { backgroundColor: 'rgba(76, 175, 80, 0.3)' }
              }}
            >
              {isConverting ? 'Converting...' : 'Make Collaborative'}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              backgroundColor: '#4CAF50',
              '&:hover': { backgroundColor: '#45a049' }
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistConversionDialog;
