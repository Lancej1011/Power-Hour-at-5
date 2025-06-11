import { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { SongUploader } from './components/SongUploader';
import UnifiedMediaBar from './components/UnifiedMediaBar';
import Playlists from './components/Playlists';
import MusicVisualizer from './components/MusicVisualizer';
import Settings from './components/Settings';
import YouTube from './components/YouTube';
import YouTubeV2 from './components/YouTubeV2';
import YouTubePlaylistPlayer from './components/YouTubePlaylistPlayer';
import SharedPlaylists from './components/SharedPlaylists';
import ModernNavigation, { authAwareTabs } from './components/ModernNavigation';
import { AuthProvider, useAuth, useAuthStatus } from './contexts/AuthContext';
import { OnboardingFlow } from './components/auth';
import { CollaborationNotifications } from './components/playlist';
import WebFileUploader from './components/WebFileUploader';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Box,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SettingsIcon from '@mui/icons-material/Settings';
import React, { createContext, useContext } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { ThemeContextProvider, useThemeContext } from './contexts/ThemeContext';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { VisualizerProvider } from './contexts/VisualizerContext';
import { LibraryProvider, useLibrary } from './contexts/LibraryContext';
import ErrorBoundary from './components/ErrorBoundary';
import { isWeb, getPlatformType } from './utils/platformDetection';

// Snackbar context for global notifications
const SnackbarContext = createContext<((message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void) | null>(null);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarContext');
  }
  return context;
};

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

function AppContent() {
  const { currentTheme } = useThemeContext();
  const { isAuthenticated, user } = useAuth();
  const { isLoading: authLoading } = useAuthStatus();
  const [currentMix, setCurrentMix] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we should show onboarding
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !user) {
      const hasSeenOnboarding = localStorage.getItem('phat5-onboarding-completed');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [authLoading, isAuthenticated, user]);

  const playMix = (mix: any) => {
    setCurrentMix(mix);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    setShowVisualizer(true);
    navigate('/visualizer');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('phat5-onboarding-completed', 'true');
  };

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ 
        bgcolor: currentTheme.colors.primary,
        borderBottom: `1px solid ${currentTheme.colors.border}`
      }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
            <MusicNoteIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box component="span" sx={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              background: `linear-gradient(45deg, ${currentTheme.colors.accent}, ${currentTheme.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              PHat5
            </Box>
            <Box component="span" sx={{ 
              ml: 1, 
              fontSize: '0.875rem', 
              opacity: 0.8,
              display: { xs: 'none', sm: 'inline' }
            }}>
              Power Hour Music App - Web Version
            </Box>
          </Box>
          
          {/* Platform indicator */}
          <Box sx={{ 
            px: 1, 
            py: 0.5, 
            bgcolor: 'rgba(255,255,255,0.1)', 
            borderRadius: 1,
            fontSize: '0.75rem',
            mr: 2
          }}>
            {getPlatformType().toUpperCase()}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation */}
      <ModernNavigation />

      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {location.pathname === '/visualizer' && showVisualizer ? (
          <MusicVisualizer 
            mix={currentMix}
            isPlaying={isPlaying}
            currentTrackIndex={currentTrackIndex}
            onClose={() => {
              setShowVisualizer(false);
              navigate('/');
            }}
          />
        ) : (
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            p: { xs: 1, sm: 2, md: 3 }
          }}>
            <Routes>
              <Route path="/" element={
                isWeb() ? (
                  <Box>
                    <WebFileUploader 
                      onFilesProcessed={(files) => {
                        console.log('Files processed:', files);
                      }}
                    />
                    <Box sx={{ mt: 2 }}>
                      <SongUploader playMix={playMix} />
                    </Box>
                  </Box>
                ) : (
                  <SongUploader playMix={playMix} />
                )
              } />
              <Route path="/playlists" element={<Playlists onPlayMix={playMix} />} />
              <Route path="/youtube" element={<YouTube />} />
              <Route path="/community" element={<SharedPlaylists />} />
              <Route path="/youtube-player/:playlistId" element={<YouTubePlaylistPlayer />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        )}
      </Box>

      {/* Media Bar */}
      {currentMix && (
        <UnifiedMediaBar 
          mix={currentMix}
          isPlaying={isPlaying}
          currentTrackIndex={currentTrackIndex}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={() => setCurrentTrackIndex(prev => 
            prev < currentMix.clips.length - 1 ? prev + 1 : 0
          )}
          onPrevious={() => setCurrentTrackIndex(prev => 
            prev > 0 ? prev - 1 : currentMix.clips.length - 1
          )}
          onVisualizerToggle={() => {
            setShowVisualizer(!showVisualizer);
            if (!showVisualizer) {
              navigate('/visualizer');
            } else {
              navigate('/');
            }
          }}
        />
      )}

      {/* Collaboration Notifications */}
      <CollaborationNotifications />
    </Box>
  );
}

function App() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <ErrorBoundary>
      <SnackbarContext.Provider value={showSnackbar}>
        <ThemeContextProvider>
          <AuthProvider>
            <VisualizerProvider>
              <AudioProvider showSnackbar={showSnackbar}>
                <LibraryProvider showSnackbar={showSnackbar}>
                  <Router>
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
                  </Router>
                  <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={4000} 
                    onClose={handleSnackbarClose} 
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                  >
                    <MuiAlert 
                      elevation={6} 
                      variant="filled" 
                      onClose={handleSnackbarClose} 
                      severity={snackbar.severity} 
                      sx={{ width: '100%' }}
                    >
                      {snackbar.message}
                    </MuiAlert>
                  </Snackbar>
                </LibraryProvider>
              </AudioProvider>
            </VisualizerProvider>
          </AuthProvider>
        </ThemeContextProvider>
      </SnackbarContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
