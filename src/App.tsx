import { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { SongUploader } from './components/SongUploader';
import UnifiedMediaBar from './components/UnifiedMediaBar';
import Playlists from './components/Playlists';
import MusicVisualizer from './components/MusicVisualizer';
import WindowControls from './components/WindowControls';
import Settings from './components/Settings';
import YouTube from './components/YouTube';
import YouTubeV2 from './components/YouTubeV2';
import YouTubePlaylistPlayer from './components/YouTubePlaylistPlayer';
import SharedPlaylists from './components/SharedPlaylists';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Box,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import SettingsIcon from '@mui/icons-material/Settings';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ShareIcon from '@mui/icons-material/Share';
import React, { createContext, useContext } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { ThemeContextProvider, useThemeContext } from './contexts/ThemeContext';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { VisualizerProvider } from './contexts/VisualizerContext';
import { LibraryProvider, useLibrary } from './contexts/LibraryContext';
import ErrorBoundary from './components/ErrorBoundary';

// Snackbar context
const SnackbarContext = createContext<(msg: string, severity?: 'success' | 'info' | 'warning' | 'error') => void>(() => {});
export const useSnackbar = () => useContext(SnackbarContext);

function AppContent() {
  const { mode, toggleMode } = useThemeContext();
  const audio = useAudio();
  const library = useLibrary();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync currentTab with route
  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setCurrentTab(0);
        break;
      case '/playlists':
        setCurrentTab(1);
        break;
      case '/youtube':
        setCurrentTab(2);
        break;
      case '/youtube-v2':
        setCurrentTab(5);
        break;
      case '/community':
        setCurrentTab(3);
        break;
      case '/visualizer':
        setCurrentTab(4);
        break;
      default:
        setCurrentTab(0);
    }
  }, [location.pathname]);

  // Set theme attribute on body for CSS theming
  useEffect(() => {
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '', severity: 'info' });
  const showSnackbar = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  // Play a mix (from any page) - now uses AudioContext
  const playMix = (mix: any) => {
    audio.playMix(mix);
  };

  // Media player controls - handle mix, preview, and playlist
  const handlePlayPause = () => {
    if (audio.audioSource === 'mix') {
      if (audio.mixPlaying) {
        audio.pauseMix();
      } else {
        audio.resumeMix();
      }
    } else if (audio.audioSource === 'preview') {
      if (audio.previewPlaying) {
        audio.pausePreview();
      } else {
        audio.resumePreview();
      }
    } else if (audio.audioSource === 'playlist') {
      if (audio.playlistPlaying) {
        audio.pausePlaylist();
      } else {
        audio.resumePlaylist();
      }
    }
  };

  const handleSeek = (value: number) => {
    if (audio.audioSource === 'mix') {
      audio.seekMix(value);
    } else if (audio.audioSource === 'preview') {
      audio.seekPreview(value);
    } else if (audio.audioSource === 'playlist') {
      audio.seekPlaylist(value);
    }
  };

  const handleStop = () => {
    if (audio.audioSource === 'mix') {
      audio.stopMix();
    } else if (audio.audioSource === 'preview') {
      audio.stopPreview();
    } else if (audio.audioSource === 'playlist') {
      audio.stopPlaylist();
    }
  };

  const handleClose = () => {
    handleStop();
  };

  const handleVolumeChange = (volume: number) => {
    console.log('[App.tsx] handleVolumeChange called:', volume, 'Audio source:', audio.audioSource);
    if (audio.audioSource === 'mix') {
      audio.setMixVolume(volume);
    } else if (audio.audioSource === 'preview') {
      audio.setPreviewVolume(volume);
    } else if (audio.audioSource === 'playlist') {
      audio.setPlaylistVolume(volume);
    }
  };

  const handleMuteToggle = () => {
    if (audio.audioSource === 'mix') {
      audio.toggleMixMute();
    } else if (audio.audioSource === 'preview') {
      audio.togglePreviewMute();
    } else if (audio.audioSource === 'playlist') {
      audio.togglePlaylistMute();
    }
  };

  // Library navigation functions
  const playLibrarySong = async (song: any) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      // Get the file as a Blob and create an object URL
      const arrayBuffer = await window.electronAPI.getFileBlob(song.path);
      const fileBlob = new Blob([arrayBuffer]);
      const fileUrl = URL.createObjectURL(fileBlob);
      // Use the global player
      playMix({
        name: song.title || song.name,
        localFilePath: fileUrl,
        songList: [],
        artist: song.artist,
        year: song.year,
        genre: song.genre,
      });
      // Track in recently played
      library.addToRecentlyPlayed(song);
    } catch (err) {
      console.error('Failed to play library song:', err);
      library.setLibraryPlayingIndex(null);
    }
  };

  const handleLibraryPrevious = () => {
    if (library.libraryPlayingIndex !== null && library.libraryPlayingIndex > 0) {
      const sortedSongs = [...library.librarySongs].sort((a, b) => {
        const field = library.librarySort.field;
        const direction = library.librarySort.direction;
        let aVal = a[field] || '';
        let bVal = b[field] || '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (direction === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      const prevIndex = library.libraryPlayingIndex - 1;
      const prevSong = sortedSongs[prevIndex];
      if (prevSong) {
        playLibrarySong(prevSong);
        library.setLibraryPlayingIndex(prevIndex);
      }
    }
  };

  const handleLibraryNext = () => {
    if (library.libraryPlayingIndex !== null) {
      const sortedSongs = [...library.librarySongs].sort((a, b) => {
        const field = library.librarySort.field;
        const direction = library.librarySort.direction;
        let aVal = a[field] || '';
        let bVal = b[field] || '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (direction === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      if (library.libraryPlayingIndex < sortedSongs.length - 1) {
        const nextIndex = library.libraryPlayingIndex + 1;
        const nextSong = sortedSongs[nextIndex];
        if (nextSong) {
          playLibrarySong(nextSong);
          library.setLibraryPlayingIndex(nextIndex);
        }
      }
    }
  };

  // Jump to currently playing song in library
  const handleJumpToSong = () => {
    // Navigate to the Create Mix page (where the library is)
    if (location.pathname !== '/') {
      navigate('/');
      setCurrentTab('create');
    }

    // Scroll to the currently playing song
    if (library.libraryPlayingIndex !== null) {
      setTimeout(() => {
        // Find the main content scroll container
        const scrollContainer = document.getElementById('main-content-scroll-container');
        if (scrollContainer) {
          // Calculate the position of the currently playing song
          const ITEM_HEIGHT = 40; // Height of each library row
          const HEADER_HEIGHT = 48; // Height of the library table header
          const targetPosition = HEADER_HEIGHT + ((library.libraryPlayingIndex ?? 0) * ITEM_HEIGHT);

          // Scroll to the song with some offset to center it in view
          const containerHeight = scrollContainer.clientHeight;
          const scrollPosition = Math.max(0, targetPosition - (containerHeight / 2));

          scrollContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to ensure navigation is complete
    }
  };

  return (
    <>
      <CssBaseline />
        <style>
          {`
            body, html, #root {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow: hidden !important;
              height: 100vh !important;
            }

            .MuiContainer-root {
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
            }

            /* Only reset top-level Box components, not content areas */
            #root > div > .MuiBox-root:not(.playlists-main-content) {
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
            }

            .MuiToolbar-root {
              padding-left: 8px !important;
              padding-right: 8px !important;
            }

            .app-bar {
              -webkit-app-region: drag;
            }

            /* Make all interactive elements in the app bar non-draggable */
            .app-bar button,
            .app-bar a,
            .app-bar .MuiIconButton-root {
              -webkit-app-region: no-drag !important;
            }
          `}
        </style>
          <div style={{
            width: '100%',
            maxWidth: '100%',
            height: '100vh',
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            <AppBar position="fixed" color="primary" elevation={0} className="app-bar" sx={{ zIndex: 1300 }}>
              <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 1, minHeight: '80px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}>
                      <MusicNoteIcon sx={{ fontSize: 24, color: 'white' }} />
                    </Box>
                    <Box>
                      <Button
                        component={Link}
                        to="/"
                        color="inherit"
                        sx={{
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          fontSize: '1.5rem',
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        PHat5
                      </Button>

                    </Box>
                  </Box>

                  {/* Navigation Tabs */}
                  <Tabs
                    value={currentTab}
                    onChange={(_, newValue) => {
                      if (newValue === 6) {
                        setSettingsOpen(true);
                        return;
                      }
                      setCurrentTab(newValue);
                      switch (newValue) {
                        case 0:
                          navigate('/');
                          break;
                        case 1:
                          navigate('/playlists');
                          break;
                        case 2:
                          navigate('/youtube');
                          break;
                        case 3:
                          navigate('/community');
                          break;
                        case 4:
                          navigate('/visualizer');
                          break;
                        case 5:
                          navigate('/youtube-v2');
                          break;
                      }
                    }}
                    sx={{
                      ml: 1,
                      '& .MuiTabs-indicator': {
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                      },
                      '& .MuiTab-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 500,
                        minHeight: 48,
                        '&.Mui-selected': {
                          color: 'white',
                        },
                        '&:hover': {
                          color: 'white',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      },
                    }}
                  >
                    <Tooltip title="Create and edit your Power Hour mix" placement="bottom">
                      <Tab
                        label="Create Mix"
                        value={0}
                        icon={<MusicNoteIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Manage your saved playlists" placement="bottom">
                      <Tab
                        label="Playlists"
                        value={1}
                        icon={<QueueMusicIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Create Power Hour playlists from YouTube videos" placement="bottom">
                      <Tab
                        label="YouTube"
                        value={2}
                        icon={<YouTubeIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Discover and import community playlists" placement="bottom">
                      <Tab
                        label="Community"
                        value={3}
                        icon={<ShareIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Music visualizer and immersive experience" placement="bottom">
                      <Tab
                        label="Visualizer"
                        value={4}
                        icon={<EqualizerIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Modern YouTube search with enhanced features" placement="bottom">
                      <Tab
                        label="YouTube V2"
                        value={5}
                        icon={<YouTubeIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="App settings and preferences" placement="bottom">
                      <Tab
                        label="Settings"
                        value={6}
                        icon={<SettingsIcon />}
                        iconPosition="start"
                        sx={{
                          '& .MuiTab-iconWrapper': {
                            marginRight: 1,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Tooltip>
                  </Tabs>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WindowControls />
                </Box>
              </Toolbar>
            </AppBar>

            {/* Conditional layout based on current route */}
            {location.pathname === '/visualizer' ? (
              // Full-screen layout for visualizer (no scroll container)
              <Box
                sx={{
                  position: 'absolute',
                  top: '80px',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflow: 'hidden'
                }}
              >
                <MusicVisualizer />
              </Box>
            ) : (
              // Normal scrollable layout for other pages
              <Box
                id="main-content-scroll-container"
                sx={{
                  position: 'absolute',
                  top: '80px',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                <Routes>
                  <Route path="/" element={<SongUploader playMix={playMix} />} />
                  <Route path="/playlists" element={<Playlists onPlayMix={playMix} />} />
                  <Route path="/youtube" element={<YouTube />} />
                  <Route path="/youtube-v2" element={<YouTubeV2 />} />
                  <Route path="/community" element={<SharedPlaylists />} />
                  <Route path="/youtube-player/:playlistId" element={<YouTubePlaylistPlayer />} />
                </Routes>
              </Box>
            )}
            <UnifiedMediaBar
              open={
                location.pathname !== '/visualizer' && (
                  (audio.audioSource === 'mix' && !!audio.currentMix) ||
                  (audio.audioSource === 'preview' && !!audio.previewClipName) ||
                  (audio.audioSource === 'playlist' && !!audio.currentPlaylist)
                )
              }
              playlist={audio.audioSource === 'playlist' ? audio.currentPlaylist : undefined}
              currentClipIndex={audio.audioSource === 'playlist' ? audio.currentClipIndex : undefined}
              isDrinkingSoundPlaying={audio.audioSource === 'playlist' ? audio.isDrinkingSoundPlaying : false}
              title={
                audio.audioSource === 'mix' && audio.currentMix
                  ? audio.currentMix.name
                  : audio.audioSource === 'preview' && audio.previewClipName
                    ? audio.previewClipName
                    : audio.audioSource === 'preview'
                      ? audio.previewPlaylistName || 'Clips Sidebar'
                      : ''
              }
              subtitle={
                audio.audioSource === 'mix' && audio.mixArtist
                  ? audio.mixArtist
                  : audio.audioSource === 'preview' && audio.previewClipArtist
                    ? audio.previewClipArtist
                    : undefined
              }
              clipIndex={
                audio.audioSource === 'preview' && audio.previewClipIndex >= 0
                  ? audio.previewClipIndex
                  : undefined
              }
              totalClips={
                audio.audioSource === 'preview' && audio.previewClipsTotal > 0
                  ? audio.previewClipsTotal
                  : undefined
              }
              isPlaying={
                audio.audioSource === 'mix'
                  ? audio.mixPlaying
                  : audio.audioSource === 'preview'
                    ? audio.previewPlaying
                    : audio.audioSource === 'playlist'
                      ? audio.playlistPlaying
                      : false
              }
              progress={
                audio.audioSource === 'mix'
                  ? audio.mixCurrentTime
                  : audio.audioSource === 'preview'
                    ? audio.previewCurrentTime
                    : audio.audioSource === 'playlist'
                      ? audio.playlistProgress
                      : 0
              }
              duration={
                audio.audioSource === 'mix'
                  ? audio.mixDuration
                  : audio.audioSource === 'preview'
                    ? audio.previewDuration
                    : audio.audioSource === 'playlist'
                      ? audio.playlistDuration
                      : 0
              }
              volume={
                audio.audioSource === 'mix'
                  ? audio.mixVolume
                  : audio.audioSource === 'preview'
                    ? audio.previewVolume
                    : audio.audioSource === 'playlist'
                      ? audio.playlistVolume
                      : 1
              }
              isMuted={
                audio.audioSource === 'mix'
                  ? audio.mixMuted
                  : audio.audioSource === 'preview'
                    ? audio.previewMuted
                    : audio.audioSource === 'playlist'
                      ? audio.playlistMuted
                      : false
              }
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onStop={handleStop}
              onPrevious={
                audio.audioSource === 'preview'
                  ? audio.previousPreviewClip
                  : audio.audioSource === 'mix' && library.libraryPlayingIndex !== null
                    ? handleLibraryPrevious
                    : audio.audioSource === 'playlist'
                      ? audio.previousClip
                      : undefined
              }
              onNext={
                audio.audioSource === 'preview'
                  ? audio.nextPreviewClip
                  : audio.audioSource === 'mix' && library.libraryPlayingIndex !== null
                    ? handleLibraryNext
                    : audio.audioSource === 'playlist'
                      ? audio.nextClip
                      : undefined
              }
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onClose={handleClose}
              onJumpToSong={handleJumpToSong}
              showJumpToSong={audio.audioSource === 'mix' && library.libraryPlayingIndex !== null}
            />

            {/* Settings Dialog */}
            <Settings
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              mode={mode}
              onToggleMode={toggleMode}
            />
          </div>
    </>
  );
}

function App() {
  // We need to create a wrapper to pass showSnackbar to AudioProvider
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '', severity: 'info' });
  const showSnackbar = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  return (
    <ErrorBoundary>
      <SnackbarContext.Provider value={showSnackbar}>
        <ThemeContextProvider>
          <VisualizerProvider>
            <AudioProvider showSnackbar={showSnackbar}>
              <LibraryProvider showSnackbar={showSnackbar}>
                <Router>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </Router>
              <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <MuiAlert elevation={6} variant="filled" onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                  {snackbar.message}
                </MuiAlert>
              </Snackbar>
            </LibraryProvider>
          </AudioProvider>
        </VisualizerProvider>
      </ThemeContextProvider>
      </SnackbarContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
