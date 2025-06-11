import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Fab,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  YouTube as YouTubeIcon,
  AccessTime as TimeIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAudio } from '../contexts/AudioContext';
import {
  YouTubePlaylist,
  YouTubeClip,
  getYouTubePlaylists,
  deleteYouTubePlaylist,
  formatTime,
} from '../utils/youtubeUtils';
import PlaylistSharingDialog from './PlaylistSharingDialog';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';

interface YouTubePlaylistManagerProps {
  editContext?: {playlistId: string; clipIndex: number} | null;
  onEditContextUsed?: () => void;
}

const YouTubePlaylistManager: React.FC<YouTubePlaylistManagerProps> = ({
  editContext,
  onEditContextUsed
}) => {
  const { currentTheme } = useThemeContext();
  const audio = useAudio();
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<YouTubePlaylist | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    playlist: YouTubePlaylist;
    clipIndex: number;
  } | null>(null);
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  const [playlistToShare, setPlaylistToShare] = useState<YouTubePlaylist | null>(null);

  // Load playlists on component mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  // Handle edit context when provided
  useEffect(() => {
    if (editContext && editContext.playlistId) {
      const playlist = playlists.find(p => p.id === editContext.playlistId);
      if (playlist) {
        // Open the playlist details dialog with the specific clip highlighted
        setSelectedPlaylist(playlist);
        setDetailsOpen(true);

        // Mark the edit context as used
        if (onEditContextUsed) {
          onEditContextUsed();
        }
      }
    }
  }, [editContext, playlists, onEditContextUsed]);

  const loadPlaylists = () => {
    const savedPlaylists = getYouTubePlaylists();
    setPlaylists(savedPlaylists);
  };

  const handlePlayPlaylist = (playlist: YouTubePlaylist) => {
    if (playlist.clips.length === 0) {
      console.log('Playlist has no clips');
      return;
    }

    setCurrentlyPlaying({
      playlist,
      clipIndex: 0
    });
    setPlayerDialogOpen(true);
  };

  const handleViewDetails = (playlist: YouTubePlaylist) => {
    setSelectedPlaylist(playlist);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (playlist: YouTubePlaylist) => {
    setPlaylistToDelete(playlist);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (playlistToDelete) {
      deleteYouTubePlaylist(playlistToDelete.id);
      loadPlaylists();
      setDeleteConfirmOpen(false);
      setPlaylistToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPlaylistToDelete(null);
  };

  const handleShareClick = (playlist: YouTubePlaylist) => {
    setPlaylistToShare(playlist);
    setSharingDialogOpen(true);
  };

  const handleSharingSuccess = (sharedPlaylist: SharedPlaylist) => {
    console.log('Playlist shared successfully:', sharedPlaylist.shareCode);

    // Notify other components that a playlist was shared
    window.dispatchEvent(new CustomEvent('playlistShared', { detail: sharedPlaylist }));
  };

  const handleSharingClose = () => {
    setSharingDialogOpen(false);
    setPlaylistToShare(null);
  };

  const getTotalDuration = (clips: YouTubeClip[]): number => {
    return clips.reduce((total, clip) => total + clip.duration, 0);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (playlists.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <YouTubeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No YouTube playlists yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Create your first YouTube Power Hour playlist using the Search & Create tab.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
          }}
        >
          Create Playlist
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          My YouTube Playlists ({playlists.length})
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {playlists.map((playlist) => (
          <Grid item xs={12} sm={6} md={4} key={playlist.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <YouTubeIcon sx={{ mr: 1, color: '#FF0000' }} />
                  <Typography variant="h6" noWrap>
                    {playlist.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Created: {formatDate(playlist.date)}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${playlist.clips.length} clips`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={formatTime(getTotalDuration(playlist.clips))}
                    size="small"
                    variant="outlined"
                    icon={<TimeIcon />}
                  />
                </Box>

                {playlist.clips.length > 0 && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    First: {playlist.clips[0].title}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box>
                  <IconButton
                    onClick={() => handlePlayPlaylist(playlist)}
                    sx={{
                      color: currentTheme.primary,
                      '&:hover': {
                        backgroundColor: `${currentTheme.primary}20`,
                      }
                    }}
                  >
                    <PlayIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleViewDetails(playlist)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleShareClick(playlist)}
                    color="secondary"
                  >
                    <ShareIcon />
                  </IconButton>
                </Box>
                <IconButton
                  onClick={() => handleDeleteClick(playlist)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Playlist Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {selectedPlaylist?.name}
        </DialogTitle>
        <DialogContent>
          {selectedPlaylist && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedPlaylist.clips.length} clips • Total duration: {formatTime(getTotalDuration(selectedPlaylist.clips))}
              </Typography>

              <List>
                {selectedPlaylist.clips.map((clip, index) => {
                  const isHighlighted = editContext && editContext.clipIndex === index;
                  // Ensure unique key by combining clip.id with index
                  const uniqueKey = clip.id ? `${clip.id}-${index}` : `clip-${index}-${selectedPlaylist.id}`;

                  return (
                    <ListItem
                      key={uniqueKey}
                      divider
                      sx={{
                        bgcolor: isHighlighted ? 'primary.main' : 'transparent',
                        color: isHighlighted ? 'primary.contrastText' : 'inherit',
                        borderRadius: isHighlighted ? 1 : 0,
                        mb: isHighlighted ? 1 : 0,
                        '&:hover': {
                          bgcolor: isHighlighted ? 'primary.dark' : 'action.hover',
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: isHighlighted ? 600 : 400 }}>
                              {index + 1}. {clip.title}
                            </Typography>
                            {isHighlighted && (
                              <Chip
                                label="Editing"
                                size="small"
                                sx={{
                                  bgcolor: 'warning.main',
                                  color: 'warning.contrastText',
                                  fontWeight: 600
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: isHighlighted ? 'primary.contrastText' : 'text.secondary',
                                opacity: isHighlighted ? 0.9 : 1
                              }}
                            >
                              {clip.artist}
                            </Typography>
                            <br />
                            <Typography
                              variant="caption"
                              sx={{
                                color: isHighlighted ? 'primary.contrastText' : 'text.secondary',
                                opacity: isHighlighted ? 0.9 : 1
                              }}
                            >
                              Start: {formatTime(clip.startTime)} • Duration: {clip.duration}s
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => window.open(`https://youtube.com/watch?v=${clip.videoId}&t=${clip.startTime}s`, '_blank')}
                          sx={{
                            color: isHighlighted ? 'primary.contrastText' : '#FF0000',
                            '&:hover': {
                              bgcolor: isHighlighted ? 'primary.light' : 'action.hover',
                            }
                          }}
                        >
                          <YouTubeIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedPlaylist && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={() => {
                handlePlayPlaylist(selectedPlaylist);
                setDetailsOpen(false);
              }}
              sx={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
              }}
            >
              Play Playlist
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Playlist</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{playlistToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* YouTube Player Dialog */}
      <Dialog
        open={playerDialogOpen}
        onClose={() => setPlayerDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentlyPlaying?.playlist.name}
          {currentlyPlaying && (
            <Typography variant="subtitle2" color="text.secondary">
              Clip {currentlyPlaying.clipIndex + 1} of {currentlyPlaying.playlist.clips.length}: {currentlyPlaying.playlist.clips[currentlyPlaying.clipIndex]?.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {currentlyPlaying && (
            <Box sx={{ textAlign: 'center' }}>
              <YouTube
                videoId={currentlyPlaying.playlist.clips[currentlyPlaying.clipIndex]?.videoId}
                opts={{
                  height: '360',
                  width: '640',
                  playerVars: {
                    autoplay: 1,
                    controls: 1,
                    rel: 0,
                    showinfo: 0,
                    start: currentlyPlaying.playlist.clips[currentlyPlaying.clipIndex]?.startTime,
                    end: currentlyPlaying.playlist.clips[currentlyPlaying.clipIndex]?.startTime + currentlyPlaying.playlist.clips[currentlyPlaying.clipIndex]?.duration,
                  },
                }}
                onEnd={() => {
                  // Auto-advance to next clip
                  const nextIndex = currentlyPlaying.clipIndex + 1;
                  if (nextIndex < currentlyPlaying.playlist.clips.length) {
                    setCurrentlyPlaying({
                      ...currentlyPlaying,
                      clipIndex: nextIndex
                    });
                  } else {
                    // Playlist finished
                    setPlayerDialogOpen(false);
                    setCurrentlyPlaying(null);
                  }
                }}
              />

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  disabled={currentlyPlaying.clipIndex === 0}
                  onClick={() => {
                    setCurrentlyPlaying({
                      ...currentlyPlaying,
                      clipIndex: Math.max(0, currentlyPlaying.clipIndex - 1)
                    });
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  disabled={currentlyPlaying.clipIndex >= currentlyPlaying.playlist.clips.length - 1}
                  onClick={() => {
                    setCurrentlyPlaying({
                      ...currentlyPlaying,
                      clipIndex: Math.min(currentlyPlaying.playlist.clips.length - 1, currentlyPlaying.clipIndex + 1)
                    });
                  }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlayerDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Playlist Sharing Dialog */}
      <PlaylistSharingDialog
        open={sharingDialogOpen}
        onClose={handleSharingClose}
        playlist={playlistToShare}
        onSuccess={handleSharingSuccess}
      />
    </Box>
  );
};

export default YouTubePlaylistManager;
