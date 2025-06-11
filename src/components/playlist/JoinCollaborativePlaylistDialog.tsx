/**
 * Dialog for joining collaborative playlists using invite codes
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Group as GroupIcon,
  VpnKey as KeyIcon,
  ContentPaste as PasteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useCollaborationStore } from '../../stores/collaborationStore';

interface JoinCollaborativePlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  initialInviteCode?: string;
  onSuccess?: (playlistId: string) => void;
}

const JoinCollaborativePlaylistDialog: React.FC<JoinCollaborativePlaylistDialogProps> = ({
  open,
  onClose,
  initialInviteCode = '',
  onSuccess
}) => {
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [isJoining, setIsJoining] = useState(false);
  const [joinComplete, setJoinComplete] = useState(false);
  const [joinedPlaylistName, setJoinedPlaylistName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { joinCollaboration, lastError } = useCollaborationStore();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      console.log('🔄 Attempting to join with invite code:', inviteCode.trim().toUpperCase());

      const playlistId = await joinCollaboration(inviteCode.trim().toUpperCase());

      if (playlistId) {
        setJoinedPlaylistName('Collaborative Playlist');
        setJoinComplete(true);

        if (onSuccess) {
          onSuccess(playlistId);
        }
      } else {
        throw new Error(lastError || 'Invalid invite code or playlist not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join collaborative playlist');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInviteCode(text.trim().toUpperCase());
      }
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setIsJoining(false);
    setJoinComplete(false);
    setJoinedPlaylistName(null);
    setError(null);
    onClose();
  };

  const formatInviteCode = (code: string) => {
    // Format invite code to uppercase and limit length
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  };

  const handleInviteCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInviteCode(event.target.value);
    setInviteCode(formatted);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
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
        {joinComplete ? 'Successfully Joined!' : 'Join Collaborative Playlist'}
      </DialogTitle>

      <DialogContent sx={{ color: 'white' }}>
        {!joinComplete ? (
          <>
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
              <Typography variant="body2">
                Enter the invite code you received to join a collaborative playlist. 
                You can get invite codes from email invitations or directly from playlist owners.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Invite Code
              </Typography>
              
              <TextField
                fullWidth
                value={inviteCode}
                onChange={handleInviteCodeChange}
                placeholder="Enter invite code (e.g., ABC123XYZ)"
                variant="outlined"
                disabled={isJoining}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handlePasteFromClipboard}
                        disabled={isJoining}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <PasteIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4CAF50'
                    },
                    '& input': {
                      color: 'white',
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      letterSpacing: '0.1em'
                    }
                  }
                }}
              />
              
              <Typography variant="caption" sx={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                mt: 1, 
                display: 'block' 
              }}>
                Invite codes are usually 6-12 characters long and contain letters and numbers
              </Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }} />

            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              What you'll get access to:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                label="Real-time collaboration" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Edit playlist together" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Live cursors" 
                size="small" 
                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
              />
              <Chip 
                label="Shared changes" 
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
                🎉 Successfully joined collaborative playlist!
              </Typography>
              <Typography variant="body2">
                You can now collaborate in real-time with other members of "{joinedPlaylistName}".
              </Typography>
            </Alert>

            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <CheckIcon sx={{ fontSize: 48, color: '#4CAF50', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                Welcome to the team!
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                The collaborative playlist has been added to your playlists. 
                You can find it in the main playlists view.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        {!joinComplete ? (
          <>
            <Button 
              onClick={handleClose}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleJoin}
              disabled={isJoining || !inviteCode.trim()}
              startIcon={isJoining ? <CircularProgress size={16} /> : <GroupIcon />}
              sx={{
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#45a049' },
                '&:disabled': { backgroundColor: 'rgba(76, 175, 80, 0.3)' }
              }}
            >
              {isJoining ? 'Joining...' : 'Join Playlist'}
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

export default JoinCollaborativePlaylistDialog;
