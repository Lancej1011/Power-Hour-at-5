import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Chip,
  Drawer,
  AppBar,
  Toolbar,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { Howl } from 'howler';
import ImageIcon from '@mui/icons-material/Image';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import PlaylistMediaBar from './PlaylistMediaBar';
import { useTheme } from '@mui/material/styles';
import { useAudio } from '../contexts/AudioContext';

interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  songName?: string;
  clipPath?: string;
}

interface Playlist {
  id: string;
  name: string;
  date: string;
  clips: Clip[];
  drinkingSoundPath?: string;
  imagePath?: string;
}

interface PlaylistsProps {
  onPlayMix: (mix: any, playlistName: string) => void;
}

// Helper to format time (seconds to MM:SS)
const formatTime = (secs: number): string => {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${returnedSeconds}`;
};

const Playlists: React.FC<PlaylistsProps> = ({ onPlayMix }) => {
  const theme = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistForInfo, setSelectedPlaylistForInfo] = useState<Playlist | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const audio = useAudio();

  // Local UI state only
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Start of useCallback wrapped functions ---

  const handleStop = useCallback(() => {
    console.log('[PH] handleStop called');
    audio.stopPlaylist();
  }, [audio]);

  // Audio functions are now handled by AudioContext

  useEffect(() => {
    loadPlaylists();
  }, []); // Initial load

  // --- End of useCallback wrapped functions ---

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      const data = await window.electronAPI.listPlaylists();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPlaylists(data);
      } else {
        console.error('Unexpected data format for playlists:', data);
        setPlaylists([]);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to fetch playlists. Ensure the application has permissions to access its data directory.');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = () => {
    setPlaylistName('');
    setCurrentPlaylistId(null);
    setNewPlaylistDialog(true);
    setIsEditing(false);
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    // Reset state first to ensure clean state
    setCurrentPlaylistId(null);
    setPlaylistName('');

    // Set new values after a brief delay to ensure state is reset
    setTimeout(() => {
      setPlaylistName(playlist.name);
      setCurrentPlaylistId(playlist.id);
      setNewPlaylistDialog(true);
      setIsEditing(true);
    }, 10);
  };

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) {
      setError('Playlist name is required');
      return;
    }
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      let successFlag = false;
      let message = '';

      if (isEditing && currentPlaylistId) {
        const playlistToUpdate = playlists.find(p => p.id === currentPlaylistId);
        if (!playlistToUpdate) throw new Error('Playlist not found for update');
        const updatedPlaylist = { ...playlistToUpdate, name: playlistName.trim() };
        successFlag = await window.electronAPI.savePlaylist(updatedPlaylist);
        message = successFlag ? `Playlist "${playlistName}" updated.` : 'Failed to update playlist.';
      } else {
        const newPlaylist: Playlist = {
          id: `pl_${Date.now()}`,
          name: playlistName.trim(),
          date: new Date().toISOString(),
          clips: [] // New playlists start empty, clips are added via SongUploader or import
        };
        successFlag = await window.electronAPI.savePlaylist(newPlaylist);
        message = successFlag ? `Playlist "${playlistName}" created.` : 'Failed to create playlist.';
      }

      if (successFlag) {
        setSuccess(message);
        loadPlaylists();
        setNewPlaylistDialog(false);
      } else {
        setError(message);
      }
    } catch (err) {
      console.error('Error saving playlist:', err);
      setError(`Failed to save playlist: ${(err as Error).message}`);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!window.confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) return;
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      const successFlag = await window.electronAPI.deletePlaylist(playlist.id);
      if (successFlag) {
        setSuccess(`Playlist "${playlist.name}" deleted.`);
        setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
      } else {
        setError('Failed to delete playlist.');
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError(`Failed to delete playlist: ${(err as Error).message}`);
    }
  };

  const handleExportPlaylist = async (playlist: Playlist) => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }
    try {
      setLoading(true);
      const result = await window.electronAPI.exportPlaylist(playlist.id);
      if (result && result.success) {
        setSuccess(`Playlist "${playlist.name}" exported to ${result.path}`);
      } else {
        setError(result.message || 'Failed to export playlist.');
      }
    } catch (err) {
      console.error('Error exporting playlist:', err);
      setError(`Failed to export playlist: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPlaylistAsAudio = async (playlist: Playlist) => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }

    if (!playlist.clips.length) {
      setError('Cannot export empty playlist as audio');
      return;
    }

    if (!playlist.drinkingSoundPath) {
      setError('Playlist needs a drinking sound set before exporting as audio');
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.exportPlaylistAsAudio(playlist.id);
      if (result && result.success) {
        setSuccess(`Playlist "${playlist.name}" exported to audio file: ${result.path}`);
      } else {
        setError(result.message || 'Failed to export playlist as audio.');
      }
    } catch (err) {
      console.error('Error exporting playlist as audio:', err);
      setError(`Failed to export playlist as audio: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }
    try {
      setLoading(true);
      const result = await window.electronAPI.importPlaylist();
      if (result && result.success && result.playlist) {
        setSuccess(`Playlist "${result.playlist.name}" imported successfully.`);
        loadPlaylists(); // Reload to show the new playlist
      } else {
        setError(result.message || 'Failed to import playlist.');
      }
    } catch (err) {
      console.error('Error importing playlist:', err);
      setError(`Failed to import playlist: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    console.log(`[PH] handlePlayPlaylist called for: ${playlist.name} (ID: ${playlist.id})`);
    console.log(`[PH] Current playlist before change: ${audio.currentPlaylist?.name} (ID: ${audio.currentPlaylist?.id})`);
    audio.playPlaylist(playlist);
    setSidebarOpen(true);
  };



  const handlePlaylistClipsDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination || !audio.currentPlaylist) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      // Create a new playlist with reordered clips
      const updatedPlaylist = { ...audio.currentPlaylist };
      const [movedClip] = updatedPlaylist.clips.splice(source.index, 1);
      updatedPlaylist.clips.splice(destination.index, 0, movedClip);

      // Save the updated playlist
      if (window.electronAPI) {
        await window.electronAPI.savePlaylist(updatedPlaylist);
        setSuccess('Playlist clips reordered successfully.');

        // Reload playlists to reflect changes
        loadPlaylists();
      }
    } catch (err) {
      console.error('Error reordering playlist clips:', err);
      setError(`Failed to save reordered playlist: ${(err as Error).message}`);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handlePlayPause = () => {
    if (audio.playlistPlaying) {
      audio.pausePlaylist();
    } else {
      // If there's a current playlist but no sound is playing, restart from current clip or beginning
      if (audio.currentPlaylist) {
        if (audio.currentClipIndex >= 0) {
          // Resume from current clip if we have one
          audio.resumePlaylist();
        } else {
          // Start from beginning if no current clip
          audio.playPlaylist(audio.currentPlaylist);
        }
      } else {
        // Fallback to resume if no playlist context
        audio.resumePlaylist();
      }
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    audio.setPlaylistVolume(newVolume);
  };

  const handleMuteToggle = () => {
    audio.togglePlaylistMute();
  };

  // New handlers for the media bar
  const handleMediaBarVolumeChange = (newVolume: number) => {
    audio.setPlaylistVolume(newVolume);
  };

  const handleMediaBarSeek = (seekTime: number) => {
    audio.seekPlaylist(seekTime);
  };

  const handlePrevious = () => {
    audio.previousClip();
  };

  const handleNext = () => {
    audio.nextClip();
  };

  const handleCloseMediaBar = () => {
    handleStop();
    setSidebarOpen(false);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(event.target.value);
    audio.seekPlaylist(seekTime);
  };

  // Drag and Drop for playlists
  const onDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const reorderedPlaylists = Array.from(playlists);
    const [removed] = reorderedPlaylists.splice(source.index, 1);
    reorderedPlaylists.splice(destination.index, 0, removed);
    setPlaylists(reorderedPlaylists);

    // Here you might want to save the new order if persistence is needed, e.g., by updating a sortOrder field.
    // For now, it's frontend only reordering.
    // Example: await window.electronAPI.updatePlaylistsOrder(reorderedPlaylists.map(p => p.id));
    setSuccess('Playlist order changed (visual only for now).');
  };

  const handleNextClip = useCallback(() => {
    console.log('[PH] handleNextClip called. Current clip index:', audio.currentClipIndex);
    audio.nextClip();
  }, [audio]);

  const handlePrevClip = useCallback(() => {
    console.log('[PH] handlePrevClip called. Current clip index:', audio.currentClipIndex);
    audio.previousClip();
  }, [audio]);

  // Add function to set drinking sound for a playlist
  const handleSetDrinkingSound = async (playlist: Playlist) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      // Request the drinking sound path - assuming a method exists for this
      // This would typically show a file selection dialog in the main process
      const result = await window.electronAPI.selectDrinkingSound();

      if (result && result.success && result.path) {
        const soundPath = result.path;

        // Update the playlist with the new drinking sound
        const updatedPlaylist = {
          ...playlist,
          drinkingSoundPath: soundPath
        };

        // Save the updated playlist
        const saved = await window.electronAPI.savePlaylist(updatedPlaylist);
        if (saved) {
          setSuccess(`Drinking sound updated for "${playlist.name}"`);
          loadPlaylists(); // Reload to show updated info

          // If this is the currently playing playlist, the AudioContext will handle the update
        } else {
          setError('Failed to update drinking sound');
        }
      }
    } catch (err) {
      console.error('Error setting drinking sound:', err);
      setError(`Error setting drinking sound: ${(err as Error).message}`);
    }
  };

  // Add function to set playlist image
  const handleSetPlaylistImage = async (playlist: Playlist) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      const result = await window.electronAPI.selectPlaylistImage();

      if (result && result.success && result.path) {
        const imagePath = result.path;

        const updatedPlaylist = {
          ...playlist,
          imagePath: imagePath
        };

        const saved = await window.electronAPI.savePlaylist(updatedPlaylist);
        if (saved) {
          setSuccess(`Playlist image updated for "${playlist.name}"`);
          loadPlaylists();

          // If this is the currently playing playlist, the AudioContext will handle the update
        } else {
          setError('Failed to update playlist image');
        }
      }
    } catch (err) {
      console.error('Error setting playlist image:', err);
      setError(`Error setting playlist image: ${(err as Error).message}`);
    }
  };

  return (
    <Box sx={{ px: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5, mt: 2 }}>
        <Typography variant="h4" component="h1">Playlists</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CreateNewFolderIcon />}
            onClick={handleCreatePlaylist}
            sx={{ mr: 1 }}
          >
            Create Playlist
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileUploadIcon />}
            onClick={handleImportPlaylist}
          >
            Import Playlist
          </Button>
        </Box>
      </Box>
      {loading && playlists.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !loading && playlists.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No playlists found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create a new playlist or import one to get started.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', py: 2, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-start' }}>
          {playlists.map((playlist) => (
            <Paper
              key={playlist.id}
              elevation={3}
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                width: 260,
                height: 310,
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.18s, box-shadow 0.18s',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.03)',
                  boxShadow: `0 8px 24px ${theme.palette.primary.main}30`,
                  '& .playlist-buttons': {
                    opacity: 1,
                    visibility: 'visible',
                  }
                },
                border: `1px solid ${theme.palette.primary.main}20`,
                m: 0,
              }}
            >
              {/* Clickable Image Area */}
              <Box
                sx={{
                  width: '100%',
                  height: 190,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}25 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      zIndex: 1,
                    }
                  }
                }}
                onClick={() => handlePlayPlaylist(playlist)}
              >
                {playlist.imagePath ? (
                  <img src={playlist.imagePath} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlayArrowIcon sx={{ fontSize: 64, color: theme.palette.secondary.main, opacity: 0.5 }} />
                  </Box>
                )}

                {/* Hover Buttons Overlay */}
                <Box
                  className="playlist-buttons"
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1,
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.2s, visibility 0.2s',
                    zIndex: 2
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent triggering playlist play
                >
                  {/* Drinking Sound Button */}
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: `${theme.palette.primary.main}CC`,
                      }
                    }}
                    onClick={() => handleSetDrinkingSound(playlist)}
                    title="Set Drinking Sound"
                  >
                    <LocalBarIcon fontSize="small" />
                  </IconButton>

                  {/* Edit Button */}
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: `${theme.palette.primary.main}CC`,
                      }
                    }}
                    onClick={() => { setIsEditing(true); setCurrentPlaylistId(playlist.id); setNewPlaylistDialog(true); }}
                    title="Edit Playlist"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Playlist Info */}
              <Box sx={{ flex: 1, p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, textAlign: 'center', height: 90, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }} title={playlist.name}>{playlist.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center' }}>{new Date(playlist.date).toLocaleDateString()}</Typography>
                </Box>

                {/* Play Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPlaylist(playlist);
                    }}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s',
                      boxShadow: 2,
                    }}
                    size="small"
                    title="Play Playlist"
                  >
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      {/* Edit Playlist Dialog (reuse newPlaylistDialog for editing) */}
      <Dialog
        open={newPlaylistDialog}
        onClose={() => {
          setNewPlaylistDialog(false);
          setIsEditing(false);
          setCurrentPlaylistId(null);
          setPlaylistName('');
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          pb: 2
        }}>
          {isEditing ? 'Edit Playlist' : 'Create New Playlist'}
          <IconButton onClick={() => {
            setNewPlaylistDialog(false);
            setIsEditing(false);
            setCurrentPlaylistId(null);
            setPlaylistName('');
          }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {isEditing && currentPlaylistId && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                {/* Playlist Name (read-only when editing) */}
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  {playlistName}
                </Typography>
                {/* Playlist Info Section */}
                {(() => {
                  const playlist = playlists.find(p => p.id === currentPlaylistId);
                  if (!playlist) return null;

                  return (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Playlist Information</Typography>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="body2" color="text.secondary">ID: {playlist.id}</Typography>
                        <Typography variant="body2" color="text.secondary">Date Created: {new Date(playlist.date).toLocaleString()}</Typography>
                        {playlist.drinkingSoundPath && (
                          <Typography variant="body2" color="text.secondary">Drinking Sound: {playlist.drinkingSoundPath}</Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Total Clips: {playlist.clips.length}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })()}

                {/* Clips List */}
                {(() => {
                  const playlist = playlists.find(p => p.id === currentPlaylistId);
                  if (!playlist || playlist.clips.length === 0) return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
                      This playlist has no clips.
                    </Typography>
                  );

                  return (
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Clips</Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          maxHeight: 250,
                          overflow: 'auto',
                          borderRadius: 2
                        }}
                      >
                        <List dense disablePadding>
                          {playlist.clips.map((clip, index) => (
                            <ListItem
                              key={clip.id || index}
                              divider={index < playlist.clips.length - 1}
                              sx={{
                                bgcolor: index % 2 === 0 ? `${theme.palette.primary.main}08` : 'transparent',
                                transition: 'background-color 0.2s',
                                '&:hover': {
                                  bgcolor: `${theme.palette.primary.main}15`
                                }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2" noWrap title={clip.name}>
                                    {index + 1}. {clip.name}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" noWrap title={`Song: ${clip.songName || 'N/A'} | Duration: ${formatTime(clip.duration)}`}>
                                    {clip.songName || 'N/A'} • {formatTime(clip.duration)}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Box>
                  );
                })()}
              </Box>

              {/* Actions Panel */}
              <Box sx={{
                width: { xs: '100%', md: 240 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<EditIcon />}
                  onClick={() => {
                    const playlist = playlists.find(p => p.id === currentPlaylistId);
                    if (playlist) {
                      // Store playlist in localStorage for editing
                      localStorage.setItem('edit_playlist', JSON.stringify(playlist));
                      // Navigate to create mix page
                      navigate('/');
                      // Close dialog
                      setNewPlaylistDialog(false);
                    }
                  }}
                >
                  Edit in Mix Creator
                </Button>

                <Divider />

                <Typography variant="subtitle2" fontWeight="bold">Playlist Actions</Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportPlaylist(playlists.find(p => p.id === currentPlaylistId)!)}
                >
                  Export Playlist
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportPlaylistAsAudio(playlists.find(p => p.id === currentPlaylistId)!)}
                >
                  Export as Audio
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<VolumeUpIcon />}
                  onClick={() => handleSetDrinkingSound(playlists.find(p => p.id === currentPlaylistId)!)}
                >
                  Set Drinking Sound
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<ImageIcon />}
                  onClick={() => handleSetPlaylistImage(playlists.find(p => p.id === currentPlaylistId)!)}
                >
                  Set Playlist Image
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeletePlaylist(playlists.find(p => p.id === currentPlaylistId)!)}
                >
                  Delete Playlist
                </Button>
              </Box>
            </Box>
          )}

          {/* Show just the name field for new playlists */}
          {(!isEditing || !currentPlaylistId) && (
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Playlist Name"
              type="text"
              fullWidth
              variant="outlined"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              error={error !== null}
              helperText={error}
              sx={{ mt: 2, mb: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', p: 2 }}>
          <Button
            onClick={() => {
              setNewPlaylistDialog(false);
              setIsEditing(false);
              setCurrentPlaylistId(null);
              setPlaylistName('');
            }}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSavePlaylist}
            variant="contained"
            color="primary"
          >
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for success/error messages */}
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>

      {/* Media Player Sidebar */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', zIndex: 1250 }}>
        {/* PLAYLIST toggle button */}
        {audio.currentPlaylist && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: sidebarOpen ? '320px' : 0,
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: theme.palette.primary.dark,
              color: 'white',
              padding: '16px 8px',
              borderRadius: '8px 0 0 8px',
              cursor: 'pointer',
              boxShadow: '0 3px 5px rgba(0,0,0,0.3)',
              border: `1px solid ${theme.palette.secondary.main}`,
              borderRight: 'none',
              transition: 'right 0.3s ease',
              zIndex: 1251
            }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            <div style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              marginTop: '8px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              fontSize: '12px'
            }}>
              PLAYLIST
            </div>
          </div>
        )}

        {/* Sidebar implementation */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={sidebarOpen && !!audio.currentPlaylist}
          PaperProps={{
            sx: {
              width: 320,
              bgcolor: theme.palette.primary.dark,
              color: '#fff',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'hidden',
              boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
              zIndex: 1250
            }
          }}
        >
          {audio.currentPlaylist && (
            <>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
                  {audio.currentPlaylist.name}
                </Typography>
                <IconButton onClick={closeSidebar} sx={{ color: '#fff', p: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>



              {/* Clips List */}
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#fff' }}>
                  Clips ({audio.currentPlaylist.clips.length})
                </Typography>
                <DragDropContext onDragEnd={handlePlaylistClipsDragEnd}>
                  <Droppable droppableId="playlist-clips">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {audio.currentPlaylist.clips.map((clip, index) => (
                          <Draggable key={clip.id || index} draggableId={clip.id || `clip-${index}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  marginBottom: '8px',
                                  padding: '8px',
                                  backgroundColor: index === audio.currentClipIndex
                                    ? `${theme.palette.primary.main}50`
                                    : snapshot.isDragging
                                      ? 'rgba(255,255,255,0.2)'
                                      : 'rgba(255,255,255,0.1)',
                                  borderRadius: '4px',
                                  border: index === audio.currentClipIndex ? `1px solid ${theme.palette.secondary.main}` : '1px solid transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                  // Note: We can't directly call playClipAtIndex anymore since it's in AudioContext
                                  // For now, we'll disable direct clip selection - this could be enhanced later
                                  console.log('Direct clip selection not implemented with AudioContext');
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {index + 1}. {clip.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {clip.songName || 'Unknown'} • {formatTime(clip.duration)}
                                    </div>
                                  </div>
                                  <div {...provided.dragHandleProps} style={{ marginLeft: '8px', color: 'rgba(255,255,255,0.5)' }}>
                                    <DragHandleIcon fontSize="small" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </Box>
            </>
          )}
        </Drawer>
      </div>

      {/* Playlist Media Bar */}
      <PlaylistMediaBar
        open={!!audio.currentPlaylist}
        playlist={audio.currentPlaylist}
        isPlaying={audio.playlistPlaying}
        currentClipIndex={audio.currentClipIndex}
        progress={audio.playlistProgress}
        duration={audio.playlistDuration}
        volume={audio.playlistVolume}
        isMuted={audio.playlistMuted}
        isDrinkingSoundPlaying={audio.isDrinkingSoundPlaying}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={handleMediaBarSeek}
        onVolumeChange={handleMediaBarVolumeChange}
        onMuteToggle={handleMuteToggle}
        onClose={handleCloseMediaBar}
      />
    </Box>
  );
};

export default Playlists;