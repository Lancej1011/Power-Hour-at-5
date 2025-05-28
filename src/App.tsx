import { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { SongUploader } from './components/SongUploader';
import MediaPlayerBar from './components/MediaPlayerBar';
import Playlists from './components/Playlists';
import MusicVisualizer from './components/MusicVisualizer';
import WindowControls from './components/WindowControls';
import ThemeSelector from './components/ThemeSelector';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Box,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import React, { createContext, useContext } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { ThemeContextProvider, useThemeContext } from './contexts/ThemeContext';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { VisualizerProvider } from './contexts/VisualizerContext';

// Snackbar context
const SnackbarContext = createContext<(msg: string, severity?: 'success' | 'info' | 'warning' | 'error') => void>(() => {});
export const useSnackbar = () => useContext(SnackbarContext);

function AppContent() {
  const { mode, toggleMode } = useThemeContext();
  const audio = useAudio();

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

  // Play/pause toggle for mix
  const handlePlayPause = () => {
    if (audio.mixPlaying) {
      audio.pauseMix();
    } else {
      audio.resumeMix();
    }
  };

  // Seek for mix
  const handleSeek = (value: number) => {
    audio.seekMix(value);
  };

  // Close media player
  const handleClose = () => {
    audio.stopMix();
  };

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      <CssBaseline />
        <style>
          {`
            body, html, #root {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: hidden !important;
            }

            .MuiContainer-root, .MuiBox-root {
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
            }

            .MuiToolbar-root {
              padding-left: 16px !important;
              padding-right: 16px !important;
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
        <Router>
          <div style={{
            width: '100%',
            maxWidth: '100%',
            margin: 0,
            padding: 0,
            overflowX: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AppBar position="static" color="primary" elevation={2} className="app-bar">
              <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    component={Link}
                    to="/"
                    color="inherit"
                    sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '1.25rem', textTransform: 'none', p: 0, minWidth: 0 }}
                  >
                    Power Hour
                  </Button>
                  <Button
                    component={Link}
                    to="/"
                    color="inherit"
                    startIcon={<MusicNoteIcon />}
                  >
                    Create Mix
                  </Button>
                  <Button
                    component={Link}
                    to="/playlists"
                    color="inherit"
                    startIcon={<QueueMusicIcon />}
                  >
                    Playlists
                  </Button>
                  <Button
                    component={Link}
                    to="/visualizer"
                    color="inherit"
                    startIcon={<EqualizerIcon />}
                  >
                    Visualizer
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ThemeSelector />
                  <IconButton color="inherit" onClick={toggleMode}>
                    {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                  </IconButton>
                  <WindowControls />
                </Box>
              </Toolbar>
            </AppBar>
            <Routes>
              <Route path="/" element={<SongUploader playMix={playMix} />} />
              <Route path="/playlists" element={<Playlists onPlayMix={playMix} />} />
              <Route path="/visualizer" element={<MusicVisualizer />} />
            </Routes>
            <MediaPlayerBar
              open={!!audio.currentMix}
              mix={audio.currentMix}
              audio={audio.mixAudio}
              playing={audio.mixPlaying}
              currentTime={audio.mixCurrentTime}
              duration={audio.mixDuration}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onClose={handleClose}
            />
          </div>
        </Router>
    </SnackbarContext.Provider>
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
    <ThemeContextProvider>
      <VisualizerProvider>
        <AudioProvider showSnackbar={showSnackbar}>
          <AppContent />
          <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <MuiAlert elevation={6} variant="filled" onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </MuiAlert>
          </Snackbar>
        </AudioProvider>
      </VisualizerProvider>
    </ThemeContextProvider>
  );
}

export default App;
