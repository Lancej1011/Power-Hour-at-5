import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  MusicNote as MusicNoteIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { getUserRating, ratePlaylist, hasUserDownloaded } from '../utils/playlistRating';
import { saveYouTubePlaylist } from '../utils/youtubeUtils';

interface SharedPlaylistCardProps {
  playlist: SharedPlaylist;
  onImport?: (playlist: SharedPlaylist) => void;
  onPreview?: (playlist: SharedPlaylist) => void;
  showActions?: boolean;
}

const SharedPlaylistCard: React.FC<SharedPlaylistCardProps> = ({
  playlist,
  onImport,
  onPreview,
  showActions = true,
}) => {
  const theme = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [userRating, setUserRating] = useState(getUserRating(playlist.id)?.rating || 0);
  const [isDownloaded, setIsDownloaded] = useState(hasUserDownloaded(playlist.id));

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
  const handleRatingChange = (newValue: number | null) => {
    if (newValue !== null) {
      const success = ratePlaylist(playlist.id, newValue);
      if (success) {
        setUserRating(newValue);
      }
    }
  };

  // Handle import
  const handleImport = () => {
    // Convert shared playlist back to regular YouTube playlist for import
    const regularPlaylist = {
      id: `imported_${playlist.id}_${Date.now()}`,
      name: `${playlist.name} (Imported)`,
      clips: playlist.clips,
      drinkingSoundPath: playlist.drinkingSoundPath,
      imagePath: playlist.imagePath,
      date: new Date().toISOString(),
    };

    const success = saveYouTubePlaylist(regularPlaylist);
    if (success) {
      setIsDownloaded(true);
      onImport?.(playlist);
    }
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
        {/* Featured badge */}
        {playlist.featured && (
          <Chip
            label="Featured"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: theme.palette.warning.main,
              color: 'white',
            }}
          />
        )}

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
            {playlist.clips.map((clip, index) => (
              <ListItem key={clip.id}>
                <ListItemText
                  primary={`${index + 1}. ${clip.title}`}
                  secondary={`${clip.artist} • ${clip.duration}s`}
                />
              </ListItem>
            ))}
          </List>

          {/* User rating */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Your Rating
          </Typography>
          <Rating
            value={userRating}
            onChange={(_, newValue) => handleRatingChange(newValue)}
            sx={{ mb: 2 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
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
    </>
  );
};

export default SharedPlaylistCard;
