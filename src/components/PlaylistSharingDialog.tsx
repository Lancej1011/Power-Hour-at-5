import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { YouTubePlaylist } from '../utils/youtubeUtils';
import {
  createSharedPlaylist,
  saveSharedPlaylist,
  SharedPlaylist,
  getUserProfile,
  updateUserProfile,
} from '../utils/sharedPlaylistUtils';
import { authService } from '../services/authService';
import { firebasePlaylistService } from '../services/firebasePlaylistService';

interface PlaylistSharingDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: YouTubePlaylist | null;
  onSuccess?: (sharedPlaylist: SharedPlaylist) => void;
}

const PlaylistSharingDialog: React.FC<PlaylistSharingDialogProps> = ({
  open,
  onClose,
  playlist,
  onSuccess,
}) => {
  const theme = useTheme();
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [username, setUsername] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingSharedPlaylist, setExistingSharedPlaylist] = useState<SharedPlaylist | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Load user profile and check for existing shared version on open
  useEffect(() => {
    if (open && playlist) {
      const loadData = async () => {
        const userProfile = getUserProfile();
        setUsername(userProfile.username);
        setError('');
        setSuccess(false);
        setIsEditing(false);
        setIsRemoving(false);

        // Check if this playlist is already shared
        if (authService.isAuthenticated()) {
          try {
            const existingShared = await firebasePlaylistService.getSharedVersionOfPlaylist(playlist.id);
            setExistingSharedPlaylist(existingShared);

            if (existingShared) {
              // Pre-fill form with existing data
              setDescription(existingShared.description);
              setTags(existingShared.tags);
              setIsPublic(existingShared.isPublic);
              setShareCode(existingShared.shareCode);
              setIsEditing(true);
            } else {
              // Reset form for new sharing
              setDescription('');
              setTags([]);
              setIsPublic(false);
              setShareCode('');
            }
          } catch (error) {
            console.error('Error checking for existing shared version:', error);
            setExistingSharedPlaylist(null);
            setDescription('');
            setTags([]);
            setIsPublic(false);
            setShareCode('');
          }
        } else {
          setExistingSharedPlaylist(null);
          setDescription('');
          setTags([]);
          setIsPublic(false);
          setShareCode('');
        }

        setNewTag('');
      };

      loadData();
    }
  }, [open, playlist]);

  // Handle username change
  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    updateUserProfile({ username: newUsername });
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle key press for tag input
  const handleTagKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  // Share or update playlist
  const handleShare = async () => {
    if (!playlist) return;

    setIsSharing(true);
    setError('');

    try {
      // Auto sign-in if Firebase is available and user is not authenticated
      if (!authService.isAuthenticated()) {
        await authService.autoSignIn();
      }

      // Validate inputs
      if (isPublic && !description.trim()) {
        setError('Description is required for public playlists');
        setIsSharing(false);
        return;
      }

      if (isPublic && tags.length === 0) {
        setError('At least one tag is required for public playlists');
        setIsSharing(false);
        return;
      }

      if (!username.trim()) {
        setError('Username is required');
        setIsSharing(false);
        return;
      }

      if (existingSharedPlaylist) {
        // Update existing shared playlist
        const updates = {
          name: playlist.name,
          description: description.trim(),
          tags,
          isPublic,
          creator: username.trim(),
          clips: playlist.clips, // Update clips in case the original playlist was modified
        };

        const updateSuccess = await firebasePlaylistService.updatePlaylist(existingSharedPlaylist.id, updates);

        if (updateSuccess) {
          setSuccess(true);
          const updatedPlaylist = { ...existingSharedPlaylist, ...updates };
          onSuccess?.(updatedPlaylist);
        } else {
          setError('Failed to update shared playlist');
        }
      } else {
        // Create new shared playlist
        const sharedPlaylist = createSharedPlaylist(
          playlist,
          description.trim(),
          tags,
          isPublic
        );

        // Update with current settings
        sharedPlaylist.isPublic = isPublic;
        sharedPlaylist.creator = username.trim();

        // Save to storage (hybrid approach)
        const saveSuccess = await saveSharedPlaylist(sharedPlaylist);

        if (saveSuccess) {
          setShareCode(sharedPlaylist.shareCode);
          setSuccess(true);
          onSuccess?.(sharedPlaylist);
        } else {
          setError('Failed to save shared playlist');
        }
      }
    } catch (err) {
      setError('An error occurred while sharing the playlist');
      console.error('Error sharing playlist:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Handle removing from community
  const handleRemoveFromCommunity = async () => {
    if (!existingSharedPlaylist) return;

    setIsRemoving(true);
    setError('');

    try {
      const success = await firebasePlaylistService.removeFromCommunity(existingSharedPlaylist.id);

      if (success) {
        setIsPublic(false);
        setSuccess(true);
        const updatedPlaylist = { ...existingSharedPlaylist, isPublic: false };
        onSuccess?.(updatedPlaylist);
      } else {
        setError('Failed to remove playlist from community');
      }
    } catch (err) {
      setError('An error occurred while removing the playlist from community');
      console.error('Error removing from community:', err);
    } finally {
      setIsRemoving(false);
    }
  };

  // Copy share code to clipboard
  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      // You might want to show a snackbar here
      console.log('Share code copied to clipboard');
    } catch (err) {
      console.error('Failed to copy share code:', err);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSharing) {
      onClose();
    }
  };

  if (!playlist) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShareIcon sx={{ mr: 1 }} />
            {existingSharedPlaylist ? 'Manage Shared Playlist' : 'Share Playlist'}
          </Box>
          <IconButton onClick={handleClose} disabled={isSharing || isRemoving}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          // Success state
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Playlist shared successfully!
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Your Share Code
            </Typography>
            
            <Paper
              sx={{
                p: 2,
                backgroundColor: theme.palette.grey[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 3,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  letterSpacing: 2,
                }}
              >
                {shareCode}
              </Typography>
              <Tooltip title="Copy to clipboard">
                <IconButton onClick={handleCopyShareCode}>
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Paper>
            
            <Typography variant="body2" color="text.secondary">
              Share this code with others so they can import your playlist!
            </Typography>
          </Box>
        ) : (
          // Configuration state
          <>
            {/* Playlist info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {playlist.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {playlist.clips.length} clips • Created {new Date(playlist.date).toLocaleDateString()}
              </Typography>

              {/* Show existing shared status */}
              {existingSharedPlaylist && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    This playlist is already shared with code: <strong>{existingSharedPlaylist.shareCode}</strong>
                    <br />
                    Status: {existingSharedPlaylist.isPublic ? 'Public (visible in community)' : 'Private (share code only)'}
                  </Typography>
                </Alert>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Username */}
            <TextField
              fullWidth
              label="Your Username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              sx={{ mb: 3 }}
              helperText="This will be shown as the creator of the playlist"
            />

            {/* Privacy setting */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isPublic ? <PublicIcon sx={{ mr: 1 }} /> : <PrivateIcon sx={{ mr: 1 }} />}
                    {isPublic ? 'Public' : 'Private'}
                  </Box>
                }
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                {isPublic 
                  ? 'Anyone can discover and import this playlist'
                  : 'Only people with the share code can import this playlist'
                }
              </Typography>
            </Box>

            {/* Description (required for public) */}
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 3 }}
              required={isPublic}
              helperText={isPublic ? 'Required for public playlists' : 'Optional description for your playlist'}
            />

            {/* Tags (required for public) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tags {isPublic && <span style={{ color: theme.palette.error.main }}>*</span>}
              </Typography>
              
              {/* Tag input */}
              <TextField
                fullWidth
                label="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleAddTag} disabled={!newTag.trim() || tags.length >= 10}>
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={`${tags.length}/10 tags ${isPublic ? '(at least 1 required)' : ''}`}
                sx={{ mb: 2 }}
              />

              {/* Tag chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Error message */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {success ? (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isSharing || isRemoving}>
              Cancel
            </Button>

            {/* Remove from community button (only for existing public playlists) */}
            {existingSharedPlaylist && existingSharedPlaylist.isPublic && (
              <Button
                onClick={handleRemoveFromCommunity}
                disabled={isSharing || isRemoving}
                color="warning"
                startIcon={<PrivateIcon />}
              >
                {isRemoving ? 'Removing...' : 'Remove from Community'}
              </Button>
            )}

            <Button
              onClick={handleShare}
              variant="contained"
              disabled={isSharing || isRemoving}
              startIcon={<ShareIcon />}
            >
              {isSharing
                ? (existingSharedPlaylist ? 'Updating...' : 'Sharing...')
                : (existingSharedPlaylist ? 'Update Playlist' : 'Share Playlist')
              }
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistSharingDialog;
