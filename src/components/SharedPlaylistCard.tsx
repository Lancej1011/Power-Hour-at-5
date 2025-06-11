import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Rating,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  MusicNote as MusicNoteIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { SharedPlaylist, getUserProfile, getUserRating as getFirebaseUserRating, hasUserDownloaded as hasFirebaseUserDownloaded } from '../utils/sharedPlaylistUtils';
import { getUserRating as getLocalUserRating, ratePlaylist as ratePlaylistLocal, hasUserDownloaded as hasLocalUserDownloaded } from '../utils/playlistRating';
import { saveYouTubePlaylist } from '../utils/youtubeUtils';
import { firebasePlaylistService } from '../services/firebasePlaylistService';
import { authService } from '../services/authService';
import { useAuth, useAuthStatus } from '../contexts/AuthContext';
import PlaylistEditDialog from './PlaylistEditDialog';
import SocialMediaShareDialog from './SocialMediaShareDialog';

interface SharedPlaylistCardProps {
  playlist: SharedPlaylist;
  onImport?: (playlist: SharedPlaylist) => void;
  onPreview?: (playlist: SharedPlaylist) => void;
  onUpdate?: (playlist: SharedPlaylist) => void;
  onDelete?: (playlistId: string) => void;
  showActions?: boolean;
  showOwnerActions?: boolean;
}

const SharedPlaylistCard: React.FC<SharedPlaylistCardProps> = ({
  playlist,
  onImport,
  onPreview,
  onUpdate,
  onDelete,
  showActions = true,
  showOwnerActions = false,
}) => {
  const theme = useTheme();
  const { user, canAccessFeature } = useAuth();
  const { isAuthenticated, isAnonymous, hasFullAccount } = useAuthStatus();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false);

  // Check if user can rate playlists
  useEffect(() => {
    const checkRatingPermissions = () => {
      // User can rate if they are authenticated and have a full account (not anonymous)
      const canUserRate = isAuthenticated && hasFullAccount;
      setCanRate(canUserRate);
    };

    checkRatingPermissions();
  }, [isAuthenticated, hasFullAccount]);

  // Load user rating and download status
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Only load rating if user can rate
        if (canRate) {
          // Load user rating (try both local and Firebase)
          const localRating = getLocalUserRating(playlist.id);
          if (localRating) {
            setUserRating(localRating.rating);
          } else {
            // Try Firebase rating if available
            try {
              const firebaseRating = await getFirebaseUserRating(playlist.id);
              if (firebaseRating) {
                setUserRating(firebaseRating.rating);
              }
            } catch (error) {
              console.warn('Failed to load Firebase rating:', error);
            }
          }
        }

        // Load download status (try both local and Firebase)
        const localDownloaded = hasLocalUserDownloaded(playlist.id);
        if (localDownloaded) {
          setIsDownloaded(true);
        } else {
          // Try Firebase download status if available
          try {
            const firebaseDownloaded = await hasFirebaseUserDownloaded(playlist.id);
            setIsDownloaded(firebaseDownloaded);
          } catch (error) {
            console.warn('Failed to load Firebase download status:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [playlist.id, canRate]);

  // Check if current user owns this playlist
  useEffect(() => {
    const checkOwnership = async () => {
      if (showOwnerActions && isAuthenticated) {
        try {
          // First try Firebase ownership check
          const ownershipStatus = await firebasePlaylistService.isPlaylistOwner(playlist.id);

          // If Firebase check fails, try fallback method using creator name
          if (!ownershipStatus) {
            const userProfile = getUserProfile();
            const nameMatch = playlist.creator === userProfile.username;
            setIsOwner(nameMatch);
          } else {
            setIsOwner(ownershipStatus);
          }
        } catch (error) {
          console.error('❌ Error checking ownership:', error);
          // Fallback to name-based check
          const userProfile = getUserProfile();
          const nameMatch = playlist.creator === userProfile.username;
          setIsOwner(nameMatch);
        }
      } else {
        setIsOwner(false);
      }
    };
    checkOwnership();
  }, [playlist.id, showOwnerActions, isAuthenticated]);

  // Get thumbnail from first clip or use default
  const thumbnail = playlist.clips.length > 0
    ? playlist.clips[0].thumbnail
    : playlist.imagePath || '/default-playlist-thumbnail.jpg';

  // Format duration
  const totalDuration = playlist.clips.reduce((sum, clip) => sum + clip.duration, 0);
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  // Handle rating change
  const handleRatingChange = async (newValue: number | null) => {
    if (newValue !== null) {
      try {
        const success = await ratePlaylistLocal(playlist.id, newValue);
        if (success) {
          setUserRating(newValue);
          console.log(`✅ Successfully rated playlist "${playlist.name}" with ${newValue} stars`);
        } else {
          console.error('Failed to rate playlist');
        }
      } catch (error) {
        console.error('Error rating playlist:', error);
      }
    }
  };

  // Handle menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      console.log('🗑️ Attempting to delete playlist:', {
        id: playlist.id,
        name: playlist.name,
        shareCode: playlist.shareCode,
        firebaseId: (playlist as any).firebaseId,
        originalPlaylistId: (playlist as any).originalPlaylistId
      });

      const success = await firebasePlaylistService.deletePlaylist(playlist.id);

      if (success) {
        console.log('✅ Playlist deleted successfully');
        if (onDelete) {
          onDelete(playlist.id);
        }
      } else {
        console.error('❌ Failed to delete playlist - service returned false');
        console.error('🔍 Playlist data for debugging:', {
          id: playlist.id,
          type: typeof playlist.id,
          length: playlist.id.length,
          isFirebaseId: playlist.id.length === 20, // Firebase IDs are typically 20 characters
          isYouTubeId: playlist.id.startsWith('youtube_playlist_')
        });
      }
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleRemoveFromCommunity = async () => {
    try {
      const success = await firebasePlaylistService.removeFromCommunity(playlist.id);
      if (success && onUpdate) {
        const updatedPlaylist = { ...playlist, isPublic: false };
        onUpdate(updatedPlaylist);
      }
    } catch (error) {
      console.error('Error removing from community:', error);
    }
    handleMenuClose();
  };

  const handlePlaylistUpdate = (updatedPlaylist: SharedPlaylist) => {
    if (onUpdate) {
      onUpdate(updatedPlaylist);
    }
    setEditDialogOpen(false);
  };

  // Handle copy share code
  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(playlist.shareCode);
      // You could add a toast notification here if desired
      console.log('Share code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy share code:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = playlist.shareCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Handle import
  const handleImport = () => {
    // Use the parent component's import handler which handles drinking clips
    onImport?.(playlist);
    setIsDownloaded(true);
  };

  // Handle preview
  const handlePreview = () => {
    onPreview?.(playlist);
  };

  // Get category color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'featured': return theme.palette.warning.main;
      case 'highly-rated': return theme.palette.success.main;
      case 'trending': return theme.palette.info.main;
      case 'new': return theme.palette.secondary.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
          position: 'relative',
        }}
      >
        {/* Header with badges and owner actions */}
        <Box sx={{ position: 'relative' }}>
          {/* Featured badge */}
          {playlist.featured && (
            <Chip
              label="Featured"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: showOwnerActions && isOwner ? 48 : 8,
                zIndex: 1,
                backgroundColor: theme.palette.warning.main,
                color: 'white',
              }}
            />
          )}

          {/* Privacy badge */}
          {showOwnerActions && (
            <Chip
              icon={playlist.isPublic ? <PublicIcon /> : <PrivateIcon />}
              label={playlist.isPublic ? 'Public' : 'Private'}
              size="small"
              sx={{
                position: 'absolute',
                top: playlist.featured ? 40 : 8,
                right: isOwner ? 48 : 8,
                zIndex: 1,
                backgroundColor: playlist.isPublic
                  ? theme.palette.success.main
                  : theme.palette.grey[600],
                color: 'white',
              }}
            />
          )}

          {/* Owner actions menu */}
          {showOwnerActions && isOwner && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
          )}

          {/* Debug: Show ownership status */}
          {showOwnerActions && (
            <Box
              sx={{
                position: 'absolute',
                top: 40,
                left: 8,
                zIndex: 2,
                backgroundColor: isOwner ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                padding: '2px 4px',
                fontSize: '10px',
                borderRadius: 1,
              }}
            >
              Owner: {isOwner ? 'YES' : 'NO'}
            </Box>
          )}

        </Box>

        {/* Thumbnail */}
        <CardMedia
          component="img"
          height="140"
          image={thumbnail}
          alt={playlist.name}
          sx={{
            objectFit: 'cover',
            backgroundColor: theme.palette.grey[200],
          }}
          onError={(e) => {
            // Fallback to default image on error
            (e.target as HTMLImageElement).src = '/default-playlist-thumbnail.jpg';
          }}
        />

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Title */}
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {playlist.name}
          </Typography>

          {/* Creator and stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {playlist.creator}
            </Typography>
            <MusicNoteIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {playlist.clips.length} clips
            </Typography>
          </Box>

          {/* Rating and downloads */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Rating
              value={playlist.rating}
              precision={0.1}
              size="small"
              readOnly
              sx={{ mr: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              ({playlist.rating.toFixed(1)})
            </Typography>
            <DownloadIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {playlist.downloadCount}
            </Typography>
          </Box>

          {/* Duration */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatDuration(totalDuration)}
            </Typography>
          </Box>

          {/* Tags */}
          {playlist.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {playlist.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {playlist.tags.length > 3 && (
                <Chip
                  label={`+${playlist.tags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          )}

          {/* Description preview */}
          {playlist.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {playlist.description}
            </Typography>
          )}
        </CardContent>

        {showActions && (
          <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => setDetailsOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                {onPreview && (
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={handlePreview} sx={{ mr: 1 }}>
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              <Button
                variant={isDownloaded ? "outlined" : "contained"}
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleImport}
                disabled={isDownloaded}
                sx={{ minWidth: 100 }}
              >
                {isDownloaded ? 'Downloaded' : 'Import'}
              </Button>
            </Box>
          </CardActions>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={thumbnail} sx={{ width: 56, height: 56 }}>
              <MusicNoteIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{playlist.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                by {playlist.creator}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* Description */}
          {playlist.description && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" paragraph>
                {playlist.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Share Code */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Share Code
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  backgroundColor: 'action.hover',
                  padding: '4px 8px',
                  borderRadius: 1,
                  fontSize: '1.1em',
                  fontWeight: 'bold'
                }}
              >
                {playlist.shareCode}
              </Typography>
              <Tooltip title="Copy share code">
                <IconButton size="small" onClick={handleCopyShareCode}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
            <Box>
              <Typography variant="subtitle2">Rating</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Rating value={playlist.rating} precision={0.1} size="small" readOnly />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {playlist.rating.toFixed(1)}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2">Downloads</Typography>
              <Typography variant="body2">{playlist.downloadCount}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Clips</Typography>
              <Typography variant="body2">{playlist.clips.length}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Duration</Typography>
              <Typography variant="body2">{formatDuration(totalDuration)}</Typography>
            </Box>
          </Box>

          {/* Tags */}
          {playlist.tags.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {playlist.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            </>
          )}

          {/* Clips list */}
          <Typography variant="subtitle2" gutterBottom>
            Clips ({playlist.clips.length})
          </Typography>
          <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
            {playlist.clips.map((clip, index) => {
              // Ensure unique key for shared playlist clips
              const uniqueKey = clip.id ? `${clip.id}-${index}` : `clip-${index}-${playlist.id}`;

              return (
              <ListItem key={uniqueKey}>
                <ListItemText
                  primary={`${index + 1}. ${clip.title}`}
                  secondary={`${clip.artist} • ${clip.duration}s`}
                />
              </ListItem>
              );
            })}
          </List>

          {/* User rating */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Your Rating
          </Typography>
          {canRate ? (
            <Rating
              value={userRating}
              onChange={(_, newValue) => handleRatingChange(newValue)}
              sx={{ mb: 2 }}
            />
          ) : (
            <Box sx={{ mb: 2 }}>
              <Rating
                value={0}
                readOnly
                sx={{ opacity: 0.5, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {!isAuthenticated
                  ? 'Sign in to rate this playlist'
                  : isAnonymous
                    ? 'Create a full account to rate playlists'
                    : 'Rating not available'
                }
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button
            onClick={() => setSocialMediaDialogOpen(true)}
            startIcon={<ShareIcon />}
          >
            Share
          </Button>
          {onPreview && (
            <Button onClick={handlePreview} startIcon={<PlayIcon />}>
              Preview
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={isDownloaded}
            startIcon={<DownloadIcon />}
          >
            {isDownloaded ? 'Downloaded' : 'Import Playlist'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Owner Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Playlist
        </MenuItem>

        {/* Remove from community option (only for public playlists) */}
        {playlist.isPublic && (
          <MenuItem onClick={handleRemoveFromCommunity} sx={{ color: 'warning.main' }}>
            <ListItemIcon>
              <PrivateIcon fontSize="small" sx={{ color: 'warning.main' }} />
            </ListItemIcon>
            Remove from Community
          </MenuItem>
        )}

        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Delete Playlist
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <PlaylistEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        playlist={playlist}
        onSuccess={handlePlaylistUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Playlist</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will also remove all ratings and download records associated with this playlist.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Social Media Share Dialog */}
      <SocialMediaShareDialog
        open={socialMediaDialogOpen}
        onClose={() => setSocialMediaDialogOpen(false)}
        playlist={playlist}
      />
    </>
  );
};

export default SharedPlaylistCard;
