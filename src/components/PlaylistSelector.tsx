import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { useAudio } from '../contexts/AudioContext';
import { usePlaylistImages } from '../hooks/usePlaylistImage';

interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  songName?: string;
  clipPath?: string;
  // Add metadata fields
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
}

interface Playlist {
  id: string;
  name: string;
  date: string;
  clips: Clip[];
  drinkingSoundPath?: string;
  imagePath?: string;
}

interface PlaylistSelectorProps {
  open: boolean;
  onClose: () => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ open, onClose }) => {
  const audio = useAudio();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the playlist images hook to handle image loading
  const { imageUrls } = usePlaylistImages(playlists);

  // Load playlists when dialog opens
  useEffect(() => {
    if (open) {
      loadPlaylists();
    }
  }, [open]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      const data = await window.electronAPI.listPlaylists();
      if (Array.isArray(data)) {
        // Sort playlists by date (newest first)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPlaylists(sortedData);
      } else {
        console.error('Unexpected data format for playlists:', data);
        setPlaylists([]);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists. Please try again.');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    console.log(`[PlaylistSelector] Playing playlist: ${playlist.name} (ID: ${playlist.id})`);
    audio.playPlaylist(playlist);
    onClose();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const getCurrentPlaylistId = () => {
    return audio.currentPlaylist?.id;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: 500,
          maxHeight: '85vh',
          width: '100%',
          maxWidth: 600,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PlaylistPlayIcon />
        Select Playlist
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        
        {!loading && !error && playlists.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No playlists found. Create a playlist first to see it here.
            </Typography>
          </Box>
        )}
        
        {!loading && !error && playlists.length > 0 && (
          <List sx={{ pt: 0 }}>
            {playlists.map((playlist) => {
              const isCurrentPlaylist = getCurrentPlaylistId() === playlist.id;
              
              return (
                <ListItem key={playlist.id} disablePadding>
                  <ListItemButton
                    onClick={() => handlePlaylistSelect(playlist)}
                    selected={isCurrentPlaylist}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isCurrentPlaylist ? 'inherit' : 'text.secondary', minWidth: 72 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: imageUrls[playlist.id] ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {imageUrls[playlist.id] ? (
                          <Box
                            component="img"
                            src={imageUrls[playlist.id]}
                            alt={playlist.name}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <QueueMusicIcon sx={{ fontSize: 28, opacity: 0.7 }} />
                        )}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" component="span">
                            {playlist.name}
                          </Typography>
                          {isCurrentPlaylist && (
                            <Chip
                              label="Playing"
                              size="small"
                              color="secondary"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" display="block">
                            {playlist.clips.length} clip{playlist.clips.length !== 1 ? 's' : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(playlist.date)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        {!loading && !error && (
          <Button onClick={loadPlaylists} variant="text">
            Refresh
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistSelector;
