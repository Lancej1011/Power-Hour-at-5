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
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  WhatsApp as WhatsAppIcon,
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
import SocialMediaShareDialog from './SocialMediaShareDialog';
import { useSocialMediaShare } from '../hooks/useSocialMediaShare';
import { useAuth } from '../contexts/AuthContext';
import { getUserDisplayName } from '../utils/authUtils';

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
  const { user, profile } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingSharedPlaylist, setExistingSharedPlaylist] = useState<SharedPlaylist | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);
  const { shareOnPlatform } = useSocialMediaShare();

  // Get the user's display name for sharing
  const getCreatorName = () => getUserDisplayName(user, profile);

  // Load user profile and check for existing shared version on open
  useEffect(() => {
    if (open && playlist) {
      const loadData = async () => {
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

      const creatorName = getCreatorName();
      if (!creatorName.trim()) {
        setError('User profile is required for sharing');
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
          creator: creatorName.trim(),
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
        sharedPlaylist.creator = creatorName.trim();

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

  // Handle quick social media sharing
  const handleQuickShare = async (platform: 'facebook' | 'twitter' | 'instagram' | 'whatsapp') => {
    if (!playlist || !shareCode) return;

    // Create a shared playlist object for sharing
    const sharedPlaylist: SharedPlaylist = {
      ...playlist,
      shareCode,
      isPublic,
      description,
      tags,
      creator: getCreatorName(),
      rating: 0,
      downloadCount: 0,
      createdAt: playlist.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      originalPlaylistId: playlist.id
    };

    await shareOnPlatform(platform, sharedPlaylist);
  };

  // Handle close
  const handleClose = () => {
    if (!isSharing) {
      onClose();
    }
  };

  if (!playlist) return null;

  return (
    <>
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
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Share this code with others so they can import your playlist!
            </Typography>

            {/* Social Media Sharing Section */}
            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" gutterBottom>
              Share on Social Media
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Spread the word about your awesome playlist!
            </Typography>

            {/* Quick social media buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <Tooltip title="Share on Facebook">
                <IconButton
                  onClick={() => handleQuickShare('facebook')}
                  sx={{
                    color: '#1877F2',
                    '&:hover': { backgroundColor: 'rgba(24, 119, 242, 0.1)' }
                  }}
                >
                  <FacebookIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share on Twitter/X">
                <IconButton
                  onClick={() => handleQuickShare('twitter')}
                  sx={{
                    color: '#1DA1F2',
                    '&:hover': { backgroundColor: 'rgba(29, 161, 242, 0.1)' }
                  }}
                >
                  <TwitterIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Copy for Instagram">
                <IconButton
                  onClick={() => handleQuickShare('instagram')}
                  sx={{
                    color: '#E4405F',
                    '&:hover': { backgroundColor: 'rgba(228, 64, 95, 0.1)' }
                  }}
                >
                  <InstagramIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share on WhatsApp">
                <IconButton
                  onClick={() => handleQuickShare('whatsapp')}
                  sx={{
                    color: '#25D366',
                    '&:hover': { backgroundColor: 'rgba(37, 211, 102, 0.1)' }
                  }}
                >
                  <WhatsAppIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Button
              variant="outlined"
              onClick={() => setSocialMediaDialogOpen(true)}
              startIcon={<ShareIcon />}
              sx={{ mb: 2 }}
            >
              More Sharing Options
            </Button>
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

            {/* Creator Info Display */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sharing as:
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {getCreatorName()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                You can change your display name in Settings
              </Typography>
            </Box>

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

    {/* Social Media Share Dialog */}
    {success && (
      <SocialMediaShareDialog
        open={socialMediaDialogOpen}
        onClose={() => setSocialMediaDialogOpen(false)}
        playlist={shareCode && playlist ? {
          ...playlist,
          shareCode,
          isPublic,
          description,
          tags,
          creator: getCreatorName(),
          rating: 0,
          downloadCount: 0,
          createdAt: playlist.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          originalPlaylistId: playlist.id
        } : null}
      />
    )}
    </>
  );
};

export default PlaylistSharingDialog;
