import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useAudio } from '../contexts/AudioContext';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { useVisualizer, VisualizerType } from '../contexts/VisualizerContext';
import BarVisualizer from './visualizers/BarVisualizer';
import CircularVisualizer from './visualizers/CircularVisualizer';
import WaveformVisualizer from './visualizers/WaveformVisualizer';
import ParticleVisualizer from './visualizers/ParticleVisualizer';

const MusicVisualizerContent: React.FC = () => {
  const audio = useAudio();
  const { settings, updateSettings } = useVisualizer();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [demoMode, setDemoMode] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [manualDebugInfo, setManualDebugInfo] = useState<string>('');

  // Use audio analysis hook
  const realAnalysisData = useAudioAnalysis(2048);

  // Demo mode data
  const [demoAnalysisData, setDemoAnalysisData] = useState({
    frequencyData: new Uint8Array(1024),
    waveformData: new Uint8Array(2048),
    volume: 0,
    isActive: false,
  });

  // Generate demo data when in demo mode
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      const frequencyData = new Uint8Array(1024);
      const waveformData = new Uint8Array(2048);

      // Generate fake frequency data with some randomness
      for (let i = 0; i < frequencyData.length; i++) {
        const baseValue = Math.max(0, 150 - i * 0.3); // Decreasing with frequency
        const randomness = Math.random() * 80;
        frequencyData[i] = Math.min(255, baseValue + randomness);
      }

      // Generate fake waveform data
      const time = Date.now() * 0.002;
      for (let i = 0; i < waveformData.length; i++) {
        const sample = Math.sin(time * 3 + i * 0.05) * 60 + 128;
        waveformData[i] = Math.max(0, Math.min(255, sample));
      }

      const volume = Math.random() * 0.6 + 0.3; // Random volume between 0.3 and 0.9

      setDemoAnalysisData({
        frequencyData,
        waveformData,
        volume,
        isActive: true,
      });
    }, 50); // Update at ~20fps

    return () => clearInterval(interval);
  }, [demoMode]);

  // Use demo data if in demo mode, otherwise use real data
  const analysisData = demoMode ? demoAnalysisData : realAnalysisData;

  // Intercept console logs for debug panel
  useEffect(() => {
    if (!showDebugPanel) return;

    const originalLog = console.log;
    const originalError = console.error;

    const addToDebugLogs = (message: string, type: 'log' | 'error' = 'log') => {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
      setDebugLogs(prev => [...prev.slice(-19), logEntry]); // Keep last 20 logs
    };

    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('[AudioAnalysis]')) {
        addToDebugLogs(message, 'log');
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('[AudioAnalysis]')) {
        addToDebugLogs(message, 'error');
      }
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [showDebugPanel]);

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (settings.fullScreen) {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } else {
        setDimensions({
          width: Math.min(800, window.innerWidth - 40),
          height: Math.min(600, window.innerHeight - 200),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [settings.fullScreen]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    updateSettings({ fullScreen: !settings.fullScreen });
  };

  // Render the appropriate visualizer
  const renderVisualizer = () => {
    const props = {
      analysisData,
      width: dimensions.width,
      height: dimensions.height,
    };

    switch (settings.type) {
      case 'bars':
        return <BarVisualizer {...props} />;
      case 'circular':
        return <CircularVisualizer {...props} />;
      case 'waveform':
        return <WaveformVisualizer {...props} />;
      case 'particles':
        return <ParticleVisualizer {...props} />;
      default:
        return <BarVisualizer {...props} />;
    }
  };

  // Get current song info
  const getCurrentSongInfo = () => {
    if (audio.currentMix) {
      return {
        title: audio.currentMix.name,
        type: 'Mix',
        duration: audio.mixDuration,
        currentTime: audio.mixCurrentTime,
      };
    }
    if (audio.currentPlaylist) {
      const currentClip = audio.currentPlaylist.clips[audio.currentClipIndex];
      return {
        title: currentClip?.name || 'Unknown',
        type: 'Playlist',
        playlist: audio.currentPlaylist.name,
        clipIndex: audio.currentClipIndex + 1,
        totalClips: audio.currentPlaylist.clips.length,
      };
    }
    return null;
  };

  const songInfo = getCurrentSongInfo();
  const hasAudio = audio.mixPlaying || audio.playlistPlaying;

  if (settings.fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'black',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Fullscreen controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10000,
            display: 'flex',
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            onClick={toggleFullscreen}
            sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <FullscreenExitIcon />
          </IconButton>
        </Box>

        {/* Song info overlay */}
        {settings.showSongInfo && songInfo && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: 2,
              borderRadius: 2,
              zIndex: 10000,
            }}
          >
            <Typography variant="h6">{songInfo.title}</Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              {songInfo.type}
              {songInfo.playlist && ` - ${songInfo.playlist}`}
              {songInfo.clipIndex && ` (${songInfo.clipIndex}/${songInfo.totalClips})`}
            </Typography>
          </Box>
        )}

        {/* Visualizer */}
        <Box sx={{ flex: 1, width: '100%', height: '100%' }}>
          {renderVisualizer()}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Music Visualizer
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            color={showDebugPanel ? "primary" : "default"}
          >
            <BugReportIcon />
          </IconButton>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton onClick={toggleFullscreen}>
            <FullscreenIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Status */}
      {!hasAudio && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            <Typography>
              Start playing music from the Create Mix or Playlists page to see the visualizer in action!
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Debug info */}
      {hasAudio && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography>
            Visualizer active! Audio source: {audio.audioSource}
            {analysisData.isActive ? ' - Analysis running' : ' - No analysis data'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Volume: {analysisData.volume.toFixed(3)} |
            Max Frequency: {Math.max(...analysisData.frequencyData)} |
            Active Bins: {analysisData.frequencyData.filter(v => v > 0).length}
          </Typography>
        </Alert>
      )}

      {/* Test button for development */}
      {!hasAudio && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant={demoMode ? "contained" : "outlined"}
            onClick={() => setDemoMode(!demoMode)}
          >
            {demoMode ? 'Stop Demo Mode' : 'Start Demo Mode'}
          </Button>
        </Box>
      )}

      {/* Debug connection button - only show if automatic connection fails */}
      {hasAudio && !analysisData.isActive && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 1 }}>
            <Typography variant="body2">
              Automatic audio connection failed. You can try manual connection or use demo mode.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const success = realAnalysisData.forceConnection();
              if (success) {
                setManualDebugInfo('🎵 Manual connection successful! Real audio analysis is now active.');
              } else {
                setManualDebugInfo('❌ Manual connection failed. Check debug panel for details.');
              }
            }}
          >
            🎵 Try Manual Connection
          </Button>
        </Box>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <Paper sx={{ p: 2, mb: 2, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🐛 Debug Panel
          </Typography>

          {/* Real-time Audio Data */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Real-time Audio Analysis:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              Volume: {analysisData.volume.toFixed(4)} |
              Max Freq: {Math.max(...analysisData.frequencyData)} |
              Avg Freq: {(analysisData.frequencyData.reduce((sum, val) => sum + val, 0) / analysisData.frequencyData.length).toFixed(1)} |
              Active Bins: {analysisData.frequencyData.filter(v => v > 0).length}/{analysisData.frequencyData.length} |
              Is Active: {analysisData.isActive ? '✅' : '❌'}
            </Typography>
          </Box>

          {/* Audio Context Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Audio Context Status:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              Audio Source: {audio.audioSource || 'none'} |
              Mix Playing: {audio.mixPlaying ? '✅' : '❌'} |
              Playlist Playing: {audio.playlistPlaying ? '✅' : '❌'} |
              Demo Mode: {demoMode ? '✅' : '❌'}
            </Typography>
          </Box>

          {/* DOM Audio Elements */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              DOM Audio Elements:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              Count: {document.querySelectorAll('audio').length} |
              Playing: {Array.from(document.querySelectorAll('audio')).filter(el => !el.paused).length}
            </Typography>
            {Array.from(document.querySelectorAll('audio')).map((el, index) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', ml: 2 }}>
                Audio {index}: {el.paused ? '⏸️' : '▶️'} |
                Time: {el.currentTime.toFixed(1)}s |
                Duration: {el.duration ? el.duration.toFixed(1) : 'unknown'}s |
                Ready: {el.readyState}/4
              </Typography>
            ))}
          </Box>

          {/* Manual Debug Info */}
          {manualDebugInfo && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                🔍 Manual Debug Information:
              </Typography>
              <Box sx={{
                maxHeight: 300,
                overflow: 'auto',
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
                border: '1px solid',
                borderColor: 'grey.300'
              }}>
                {manualDebugInfo}
              </Box>
              <Button
                size="small"
                onClick={() => setManualDebugInfo('')}
                sx={{ mt: 1 }}
              >
                Clear Debug Info
              </Button>
            </Box>
          )}

          {/* Console Logs */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Audio Analysis Logs:
            </Typography>
            <Box sx={{
              maxHeight: 200,
              overflow: 'auto',
              bgcolor: 'grey.100',
              p: 1,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.7rem'
            }}>
              {debugLogs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No logs yet. Start playing audio to see debug information.
                </Typography>
              ) : (
                debugLogs.map((log, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: log.includes('ERROR') ? 'error.main' : 'text.primary'
                    }}
                  >
                    {log}
                  </Typography>
                ))
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Song info */}
      {settings.showSongInfo && songInfo && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{songInfo.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {songInfo.type}
            {songInfo.playlist && ` - ${songInfo.playlist}`}
            {songInfo.clipIndex && ` (${songInfo.clipIndex}/${songInfo.totalClips})`}
          </Typography>
        </Paper>
      )}

      {/* Visualizer */}
      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          overflow: 'hidden',
        }}
      >
        {renderVisualizer()}
      </Paper>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: { width: 320, p: 2 },
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Visualizer Settings
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Visualizer Type</InputLabel>
          <Select
            value={settings.type}
            label="Visualizer Type"
            onChange={(e) => updateSettings({ type: e.target.value as VisualizerType })}
          >
            <MenuItem value="bars">Frequency Bars</MenuItem>
            <MenuItem value="circular">Circular</MenuItem>
            <MenuItem value="waveform">Waveform</MenuItem>
            <MenuItem value="particles">Particles</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={settings.showSongInfo}
              onChange={(e) => updateSettings({ showSongInfo: e.target.checked })}
            />
          }
          label="Show Song Info"
          sx={{ mb: 2 }}
        />

        <Typography gutterBottom>Sensitivity</Typography>
        <Slider
          value={settings.sensitivity}
          onChange={(_, value) => updateSettings({ sensitivity: value as number })}
          min={0.1}
          max={3.0}
          step={0.1}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Color Mode</InputLabel>
          <Select
            value={settings.colorMode}
            label="Color Mode"
            onChange={(e) => updateSettings({ colorMode: e.target.value as any })}
          >
            <MenuItem value="theme">Theme Colors</MenuItem>
            <MenuItem value="rainbow">Rainbow</MenuItem>
            <MenuItem value="custom">Custom Color</MenuItem>
          </Select>
        </FormControl>

        {settings.colorMode === 'custom' && (
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Custom Color</Typography>
            <input
              type="color"
              value={settings.customColor}
              onChange={(e) => updateSettings({ customColor: e.target.value })}
              style={{ width: '100%', height: 40, border: 'none', borderRadius: 4 }}
            />
          </Box>
        )}

        <Typography gutterBottom>Bar Count</Typography>
        <Slider
          value={settings.barCount}
          onChange={(_, value) => updateSettings({ barCount: value as number })}
          min={16}
          max={256}
          step={16}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <Typography gutterBottom>Background Opacity</Typography>
        <Slider
          value={settings.backgroundOpacity}
          onChange={(_, value) => updateSettings({ backgroundOpacity: value as number })}
          min={0.05}
          max={0.5}
          step={0.05}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        {settings.type === 'particles' && (
          <>
            <Typography gutterBottom>Particle Count</Typography>
            <Slider
              value={settings.particleCount}
              onChange={(_, value) => updateSettings({ particleCount: value as number })}
              min={50}
              max={500}
              step={25}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Button
          variant="outlined"
          fullWidth
          onClick={() => {
            updateSettings({
              type: 'bars',
              showSongInfo: true,
              sensitivity: 1.0,
              colorMode: 'theme',
              customColor: '#ff6b6b',
              barCount: 64,
              backgroundOpacity: 0.1,
              particleCount: 100,
            });
          }}
        >
          Reset to Defaults
        </Button>
      </Drawer>
    </Box>
  );
};

const MusicVisualizer: React.FC = () => {
  return <MusicVisualizerContent />;
};

export default MusicVisualizer;
