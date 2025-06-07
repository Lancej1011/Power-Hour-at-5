import React, { useState, useEffect, useRef } from 'react';
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
  Fade,
  Zoom,
  Slide,
  Chip,
  Grow,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import StopIcon from '@mui/icons-material/Stop';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import StarIcon from '@mui/icons-material/Star';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { useAudio } from '../contexts/AudioContext';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { useEnhancedAudioAnalysis } from '../hooks/useEnhancedAudioAnalysis';
import { useVisualizer, VisualizerType } from '../contexts/VisualizerContext';
import { usePlaylistImage } from '../hooks/usePlaylistImage';
import { useAlbumArt } from '../hooks/useAlbumArt';
import VolumeManager from '../utils/volumePersistence';
import BarVisualizer from './visualizers/BarVisualizer';
import CircularVisualizer from './visualizers/CircularVisualizer';
import WaveformVisualizer from './visualizers/WaveformVisualizer';
import ParticleVisualizer from './visualizers/ParticleVisualizer';
import SpectrumVisualizer from './visualizers/SpectrumVisualizer';
import MandalaVisualizer from './visualizers/MandalaVisualizer';
import LiquidVisualizer from './visualizers/LiquidVisualizer';
import GalaxyVisualizer from './visualizers/GalaxyVisualizer';
import PlaylistSelector from './PlaylistSelector';

// Type definition for song info
interface SongInfo {
  title: string;
  artist?: string;
  type: string;
  playlist?: string;
  clipIndex?: number;
  totalClips?: number;
  duration?: number;
  currentTime?: number;
  showTrivia?: boolean;
  timeUntilReveal?: number;
}

const MusicVisualizerContent: React.FC = () => {
  const audio = useAudio();
  const { settings, updateSettings } = useVisualizer();

  // Use the playlist image hook for the current playlist
  const { imageUrl: currentPlaylistImageUrl } = usePlaylistImage(audio.currentPlaylist?.imagePath);

  // Get current clip info for album art
  const getCurrentClipInfo = () => {
    if (audio.currentPlaylist && audio.currentClipIndex >= 0) {
      const currentClip = audio.currentPlaylist.clips[audio.currentClipIndex];
      return {
        songPath: currentClip?.clipPath,
        artist: currentClip?.artist,
        album: currentClip?.album,
        songName: currentClip?.songName
      };
    }
    return { songPath: undefined, artist: undefined, album: undefined, songName: undefined };
  };

  const currentClipInfo = getCurrentClipInfo();

  // Use the album art hook to get the current song's album art
  const { albumArtUrl: currentAlbumArt, loading: albumArtLoading } = useAlbumArt(
    currentClipInfo.songPath,
    currentClipInfo.artist,
    currentClipInfo.album,
    settings.enableOnlineAlbumArt
  );

  // Add CSS animations for trivia reveal
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
      }
      @keyframes sparkle {
        0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-80px) scale(1); }
        50% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-80px) scale(1.2); }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 30px rgba(255,215,0,0.5); }
        50% { box-shadow: 0 0 50px rgba(255,215,0,0.8); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const volumeManager = VolumeManager.getInstance();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [demoMode, setDemoMode] = useState(false);

  // Hover controls state
  const [showHoverControls, setShowHoverControls] = useState(false);
  const [volume, setVolume] = useState(() => volumeManager.getVisualizerVolume());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Volume slider visibility state
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  // Progress bar dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  // Playlist selection state
  const [playlistSelectorOpen, setPlaylistSelectorOpen] = useState(false);

  // Cursor and UI visibility state
  const [showCursor, setShowCursor] = useState(true);
  const [showTopControls, setShowTopControls] = useState(true);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trivia reveal animation state
  const [triviaRevealing, setTriviaRevealing] = useState(false);
  const [lastRevealedSong, setLastRevealedSong] = useState<string | null>(null);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [previousTriviaState, setPreviousTriviaState] = useState<boolean | undefined>(undefined);
  const [revealAnimationPhase, setRevealAnimationPhase] = useState<'entering' | 'staying' | 'leaving'>('entering');

  // Refs to track last logged data to prevent excessive logging
  const lastLoggedClipRef = useRef<string | null>(null);
  const lastLoggedMetadataRef = useRef<string | null>(null);
  const lastLoggedTriviaRef = useRef<string | null>(null);

  // Use enhanced audio analysis hook
  const realAnalysisData = useEnhancedAudioAnalysis(2048);

  // Demo mode data
  const [demoAnalysisData, setDemoAnalysisData] = useState({
    frequencyData: new Uint8Array(1024),
    waveformData: new Uint8Array(2048),
    volume: 0,
    isActive: false,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    beatDetected: false,
    beatStrength: 0,
    peakFrequency: 0,
    spectralCentroid: 0,
    spectralRolloff: 0,
    frequencyBands: new Array(8).fill(0),
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
      const bassLevel = Math.random() * 0.8;
      const midLevel = Math.random() * 0.6;
      const trebleLevel = Math.random() * 0.7;
      const beatDetected = Math.random() > 0.9; // Occasional beats
      const beatStrength = beatDetected ? Math.random() * 2 + 1 : 0;

      // Generate frequency bands
      const frequencyBands = new Array(8).fill(0).map(() => Math.random() * 0.8);

      setDemoAnalysisData({
        frequencyData,
        waveformData,
        volume,
        isActive: true,
        bassLevel,
        midLevel,
        trebleLevel,
        beatDetected,
        beatStrength,
        peakFrequency: Math.random(),
        spectralCentroid: Math.random() * 0.5,
        spectralRolloff: Math.random() * 0.8 + 0.2,
        frequencyBands,
      });
    }, 50); // Update at ~20fps

    return () => clearInterval(interval);
  }, [demoMode]);

  // Use demo data if in demo mode, otherwise use real data
  const analysisData = demoMode ? demoAnalysisData : realAnalysisData;



  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (settings.fullScreen) {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } else {
        // For non-fullscreen, fill the available space in the app layout
        // The container is positioned with top: 80px, so we need to account for that
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 80, // Account for app bar (80px)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [settings.fullScreen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    updateSettings({ fullScreen: !settings.fullScreen });
  };

  // Cursor and UI visibility functions
  const showCursorAndControls = () => {
    setShowCursor(true);
    setShowTopControls(true);
    setShowHoverControls(true);

    // Clear existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
  };

  // Ensure top controls are always visible in non-fullscreen mode
  useEffect(() => {
    if (!settings.fullScreen) {
      setShowTopControls(true);
      setShowCursor(true);
    }
  }, [settings.fullScreen]);

  const hideCursorAndControlsAfterDelay = () => {
    // Clear existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }

    // Check if audio is currently paused - if so, keep controls visible
    const isPlaying = audio.audioSource === 'mix' ? audio.mixPlaying : audio.playlistPlaying;
    const hasAudioLoaded = audio.currentMix || audio.currentPlaylist;

    // Only hide hover controls if audio is playing OR if there's no audio loaded at all
    // Keep controls visible when audio is paused (hasAudioLoaded but not isPlaying)
    if (isPlaying || !hasAudioLoaded) {
      // Set new timeout for hiding hover controls
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverControls(false);
      }, 2000);
    }
    // If audio is loaded but paused, don't set timeout - controls stay visible

    // ONLY hide cursor and top controls in fullscreen mode
    if (settings.fullScreen) {
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
        setShowTopControls(false);
      }, 2000);
    }
    // In non-fullscreen mode, always keep top controls visible
  };

  const handleMouseEnter = () => {
    showCursorAndControls();
  };

  const handleMouseMove = () => {
    showCursorAndControls();
    hideCursorAndControlsAfterDelay();
  };

  const handleMouseLeave = () => {
    hideCursorAndControlsAfterDelay();
  };

  // Audio control functions
  const handlePlayPause = () => {
    if (audio.audioSource === 'mix') {
      if (audio.mixPlaying) {
        audio.pauseMix();
      } else {
        audio.resumeMix();
      }
    } else if (audio.audioSource === 'playlist') {
      if (audio.playlistPlaying) {
        audio.pausePlaylist();
      } else {
        audio.resumePlaylist();
      }
    }
  };

  const handleStop = () => {
    if (audio.audioSource === 'mix') {
      audio.stopMix();
    } else if (audio.audioSource === 'playlist') {
      audio.stopPlaylist();
    }
  };

  const handlePrevious = () => {
    if (audio.audioSource === 'playlist') {
      audio.previousClip();
    }
  };

  const handleNext = () => {
    if (audio.audioSource === 'playlist') {
      audio.nextClip();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    console.log('[MusicVisualizer] Volume change:', newVolume, 'Audio source:', audio.audioSource);
    if (audio.audioSource === 'mix') {
      setVolume(newVolume);
      volumeManager.setVisualizerVolume(newVolume);
      audio.setMixVolume(newVolume);
    } else if (audio.audioSource === 'playlist') {
      // For playlists, only update the playlist volume, not local state
      audio.setPlaylistVolume(newVolume);
    }
  };

  const handleSeek = (value: number) => {
    if (audio.audioSource === 'mix') {
      audio.seekMix(value);
    } else if (audio.audioSource === 'playlist') {
      audio.seekPlaylist(value);
    }
  };

  // Handle progress bar dragging
  const handleProgressChange = (event: Event, value: number | number[]) => {
    const seekValue = Array.isArray(value) ? value[0] : value;
    if (isDragging) {
      // During dragging, update the drag value for visual feedback
      setDragValue(seekValue);
    }
    // Always seek the audio immediately for responsive feedback
    handleSeek(seekValue);
  };

  const handleProgressChangeStart = (event: React.MouseEvent) => {
    setIsDragging(true);
    // Set initial drag value to current time
    const currentAudioTime = audio.audioSource === 'mix' ? audio.mixCurrentTime : audio.playlistProgress;
    setDragValue(currentAudioTime);
  };

  const handleProgressChangeEnd = (event: Event, value: number | number[]) => {
    const seekValue = Array.isArray(value) ? value[0] : value;
    setIsDragging(false);
    // Final seek to the end position
    handleSeek(seekValue);
  };

  // Handle clicking outside volume control to hide slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeSlider]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render playlist button with image
  const renderPlaylistButton = () => {
    const currentPlaylist = audio.currentPlaylist;
    const hasImage = currentPlaylistImageUrl;

    return (
      <IconButton
        onClick={() => setPlaylistSelectorOpen(true)}
        sx={{
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.5)',
          width: 48,
          height: 48,
          padding: hasImage ? 0 : 1,
          overflow: 'hidden',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.7)',
          },
        }}
      >
        {hasImage ? (
          <Box
            component="img"
            src={currentPlaylistImageUrl}
            alt={currentPlaylist?.name || 'Playlist'}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 1,
            }}
          />
        ) : (
          <PlaylistPlayIcon />
        )}
      </IconButton>
    );
  };

  // Render the appropriate visualizer
  const renderVisualizer = () => {
    const props = {
      analysisData,
      width: dimensions.width,
      height: dimensions.height,
      settings,
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
      case 'spectrum':
        return <SpectrumVisualizer {...props} />;
      case 'mandala':
        return <MandalaVisualizer {...props} />;
      case 'liquid':
        return <LiquidVisualizer {...props} />;
      case 'galaxy':
        return <GalaxyVisualizer {...props} />;
      default:
        return <BarVisualizer {...props} />;
    }
  };

  // Render hover controls
  const renderHoverControls = () => {
    if (!hasAudio) return null;

    const isPlaying = audio.audioSource === 'mix' ? audio.mixPlaying : audio.playlistPlaying;
    const currentTime = audio.audioSource === 'mix' ? audio.mixCurrentTime : audio.playlistProgress;
    const duration = audio.audioSource === 'mix' ? audio.mixDuration : audio.playlistDuration;
    const currentVolume = audio.audioSource === 'playlist' ? audio.playlistVolume : volume;
    const isMuted = audio.audioSource === 'playlist' ? audio.playlistMuted : false;

    return (
      <Fade in={showHoverControls} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: 3,
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            minWidth: 400,
            maxWidth: 500,
            zIndex: 10000,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'default',
          }}
        >
          {/* Progress Bar */}
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'white', minWidth: 40 }}>
              {formatTime(isDragging ? dragValue : currentTime)}
            </Typography>
            <Slider
              value={isDragging ? dragValue : currentTime}
              max={duration || 100}
              onChange={handleProgressChange}
              onChangeCommitted={(event: Event | React.SyntheticEvent, value: number | number[]) => handleProgressChangeEnd(event as Event, value)}
              onMouseDown={handleProgressChangeStart}
              sx={{
                flex: 1,
                color: 'white',
                '& .MuiSlider-thumb': {
                  backgroundColor: 'white',
                },
                '& .MuiSlider-track': {
                  backgroundColor: 'white',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'white', minWidth: 40 }}>
              {formatTime(duration || 0)}
            </Typography>
          </Box>

          {/* Control Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Previous (only for playlists) */}
            {audio.audioSource === 'playlist' && (
              <IconButton
                onClick={handlePrevious}
                disabled={audio.currentClipIndex === 0}
                sx={{ color: 'white' }}
              >
                <SkipPreviousIcon />
              </IconButton>
            )}

            {/* Play/Pause */}
            <IconButton
              onClick={handlePlayPause}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>

            {/* Next (only for playlists) */}
            {audio.audioSource === 'playlist' && (
              <IconButton
                onClick={handleNext}
                disabled={audio.currentClipIndex >= (audio.currentPlaylist?.clips.length || 1) - 1}
                sx={{ color: 'white' }}
              >
                <SkipNextIcon />
              </IconButton>
            )}

            {/* Stop */}
            <IconButton onClick={handleStop} sx={{ color: 'white' }}>
              <StopIcon />
            </IconButton>

            {/* Volume Control */}
            <Box ref={volumeControlRef} sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <IconButton
                onClick={() => {
                  if (showVolumeSlider) {
                    // If slider is visible, toggle mute
                    if (audio.audioSource === 'playlist') {
                      audio.togglePlaylistMute();
                    } else {
                      // For mix audio, toggle between 0 and 1
                      handleVolumeChange(currentVolume > 0 ? 0 : 1);
                    }
                  } else {
                    // If slider is hidden, show it
                    setShowVolumeSlider(true);
                  }
                }}
                sx={{ color: 'white' }}
              >
                {isMuted || currentVolume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              {showVolumeSlider && (
                <Slider
                  value={isMuted ? 0 : currentVolume}
                  onChange={(event, value) => {
                    const newValue = Array.isArray(value) ? value[0] : value;
                    console.log('[MusicVisualizer] Slider onChange:', newValue);
                    handleVolumeChange(newValue);
                  }}
                  onMouseDown={() => console.log('[MusicVisualizer] Slider mouse down')}
                  onMouseUp={() => console.log('[MusicVisualizer] Slider mouse up')}
                  min={0}
                  max={1}
                  step={0.01}
                  sx={{
                    width: 80,
                    color: 'white',
                    pointerEvents: 'auto',
                    '& .MuiSlider-thumb': {
                      backgroundColor: 'white',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: 'white',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                />
              )}

              {/* Always visible test slider */}
              <Slider
                value={isMuted ? 0 : currentVolume}
                onChange={(event, value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  console.log('[MusicVisualizer] TEST Slider onChange:', newValue);
                  handleVolumeChange(newValue);
                }}
                min={0}
                max={1}
                step={0.01}
                sx={{
                  width: 80,
                  color: 'white',
                  ml: 1,
                  '& .MuiSlider-thumb': {
                    backgroundColor: 'white',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: 'white',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              />
            </Box>
          </Box>


        </Box>
      </Fade>
    );
  };

  // Get current song info with trivia mode logic
  const getCurrentSongInfo = (): SongInfo | null => {
    if (audio.currentMix) {
      const baseInfo: SongInfo = {
        title: audio.currentMix.name,
        type: 'Mix',
        duration: audio.mixDuration,
        currentTime: audio.mixCurrentTime,
      };

      // In trivia mode, hide details until 45 seconds
      if (settings.triviaMode && audio.mixCurrentTime < 45) {
        return {
          ...baseInfo,
          title: '???',
          showTrivia: true,
          timeUntilReveal: 45 - audio.mixCurrentTime,
        };
      }

      return baseInfo;
    }

    if (audio.currentPlaylist) {
      const currentClip = audio.currentPlaylist.clips[audio.currentClipIndex];

      // Debug logging to understand the clip structure (only log once per clip)
      const clipKey = `${currentClip?.id}-${audio.currentClipIndex}`;
      if (clipKey !== lastLoggedClipRef.current) {
        console.log('🎵 Current clip data:', {
          name: currentClip?.name,
          songName: currentClip?.songName,
          artist: currentClip?.artist,
          album: currentClip?.album,
          year: currentClip?.year,
          genre: currentClip?.genre,
          rawClip: currentClip
        });
        lastLoggedClipRef.current = clipKey;
      }

      // Use metadata directly from the clip if available
      let title = currentClip?.songName || currentClip?.name || 'Unknown';
      let artist = currentClip?.artist || '';

      // Clean up the title if it's the same as the clip name (remove time stamps)
      if (title === currentClip?.name && title.includes('[') && title.includes(']')) {
        // Extract clean title from clip name format like "Song [1:50 - 2:50]"
        const match = title.match(/^(.+?)\s*\[[\d:]+\s*-\s*[\d:]+\]$/);
        if (match) {
          title = match[1].trim();
        }
      }

      // Only log metadata changes, not every render
      const metadataKey = `${title}-${artist}-${settings.triviaMode}`;
      if (metadataKey !== lastLoggedMetadataRef.current) {
        console.log('🎭 Using clip metadata:', {
          title,
          artist,
          hasArtist: !!artist,
          triviaMode: settings.triviaMode,
          playlistProgress: audio.playlistProgress
        });
        lastLoggedMetadataRef.current = metadataKey;
      }

      const baseInfo: SongInfo = {
        title,
        artist: artist && artist.trim() ? artist : undefined,
        type: 'Playlist',
        playlist: audio.currentPlaylist.name,
        clipIndex: audio.currentClipIndex + 1,
        totalClips: audio.currentPlaylist.clips.length,
      };

      // In trivia mode, hide details until 45 seconds into the clip
      if (settings.triviaMode && audio.playlistProgress < 45) {
        // Only log trivia state changes, not every render
        const triviaKey = `hiding-${Math.floor(audio.playlistProgress / 5)}`; // Log every 5 seconds
        if (triviaKey !== lastLoggedTriviaRef.current) {
          console.log('🎭 TRIVIA MODE - HIDING:', {
            originalTitle: title,
            originalArtist: artist,
            timeUntilReveal: 45 - audio.playlistProgress
          });
          lastLoggedTriviaRef.current = triviaKey;
        }
        return {
          ...baseInfo,
          title: '???',
          artist: artist && artist.trim() ? '???' : undefined,
          showTrivia: true,
          timeUntilReveal: 45 - audio.playlistProgress,
        };
      }

      // Only log when trivia mode changes or reveals
      const revealKey = `revealing-${settings.triviaMode}-${Math.floor(audio.playlistProgress / 10)}`;
      if (revealKey !== lastLoggedTriviaRef.current) {
        console.log('🎭 TRIVIA MODE - REVEALING or OFF:', {
          triviaMode: settings.triviaMode,
          progress: audio.playlistProgress,
          finalTitle: title,
          finalArtist: artist
        });
        lastLoggedTriviaRef.current = revealKey;
      }

      return baseInfo;
    }

    return null;
  };

  const songInfo = getCurrentSongInfo();
  const hasAudio = audio.currentMix || audio.currentPlaylist;

  // Track trivia reveal animation
  useEffect(() => {
    if (!songInfo || !settings.triviaMode) {
      setTriviaRevealing(false);
      setShowRevealAnimation(false);
      setLastRevealedSong(null);
      setPreviousTriviaState(undefined);
      setRevealAnimationPhase('entering');
      return;
    }

    const currentSongKey = `${songInfo.title}-${songInfo.artist || 'no-artist'}`;

    // Detect transition from trivia hidden to revealed
    // Previous state was true (showing trivia) and current state is false/undefined (not showing trivia)
    // AND the title is not "???" (meaning it's been revealed)
    if (previousTriviaState === true && !songInfo.showTrivia && songInfo.title !== '???' && lastRevealedSong !== currentSongKey) {
      console.log('🎉 TRIGGERING TRIVIA REVEAL ANIMATION:', {
        songTitle: songInfo.title,
        songArtist: songInfo.artist,
        showTrivia: songInfo.showTrivia,
        previousTriviaState,
        currentSongKey,
        lastRevealedSong
      });

      setTriviaRevealing(true);
      setShowRevealAnimation(true);
      setLastRevealedSong(currentSongKey);
      setRevealAnimationPhase('entering');

      // After 3 seconds, transition to "staying" phase
      setTimeout(() => {
        setRevealAnimationPhase('staying');
      }, 3000);
    }

    // Update previous state for next comparison
    setPreviousTriviaState(songInfo.showTrivia);
  }, [songInfo?.showTrivia, songInfo?.title, songInfo?.artist, settings.triviaMode, lastRevealedSong, previousTriviaState]);

  // Track song progress to animate away the reveal in the last few seconds
  useEffect(() => {
    if (!showRevealAnimation || !songInfo || revealAnimationPhase === 'leaving') return;

    const currentTime = audio.audioSource === 'mix' ? audio.mixCurrentTime : audio.playlistProgress;
    const duration = audio.audioSource === 'mix' ? audio.mixDuration : audio.playlistDuration;

    if (duration && currentTime) {
      const timeRemaining = duration - currentTime;

      // Start leaving animation when 5 seconds remain
      if (timeRemaining <= 5 && revealAnimationPhase === 'staying') {
        console.log('🎵 Starting trivia reveal exit animation - 5 seconds remaining');
        setRevealAnimationPhase('leaving');

        // Completely hide after 3 seconds (when 2 seconds remain in song)
        setTimeout(() => {
          setShowRevealAnimation(false);
          setTriviaRevealing(false);
          setRevealAnimationPhase('entering');
        }, 3000);
      }
    }
  }, [audio.playlistProgress, audio.mixCurrentTime, audio.playlistDuration, audio.mixDuration, showRevealAnimation, songInfo, revealAnimationPhase, audio.audioSource]);

  // Handle song changes - reset animation if a new song starts
  useEffect(() => {
    if (showRevealAnimation && songInfo) {
      const currentSongKey = `${songInfo.title}-${songInfo.artist || 'no-artist'}`;

      // If the current song is different from the last revealed song and it's not "???"
      // This means a new song started while the animation was showing
      if (lastRevealedSong && currentSongKey !== lastRevealedSong && songInfo.title !== '???') {
        console.log('🔄 New song detected while animation showing - resetting animation');
        setShowRevealAnimation(false);
        setTriviaRevealing(false);
        setRevealAnimationPhase('entering');
        setLastRevealedSong(null);
      }
    }
  }, [songInfo?.title, songInfo?.artist, showRevealAnimation, lastRevealedSong]);

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
        <Fade in={showTopControls} timeout={300}>
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
            {renderPlaylistButton()}
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
        </Fade>

        {/* Album Art Display */}
        {settings.showAlbumArt && (currentAlbumArt || currentPlaylistImageUrl) && (
          <Fade in={true} timeout={500}>
            <Box
              sx={{
                position: 'absolute',
                ...(settings.albumArtPosition === 'center' && {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }),
                ...(settings.albumArtPosition === 'top-left' && {
                  top: 20,
                  left: 20,
                }),
                ...(settings.albumArtPosition === 'top-right' && {
                  top: 20,
                  right: 20,
                }),
                ...(settings.albumArtPosition === 'bottom-left' && {
                  bottom: 20,
                  left: 20,
                }),
                ...(settings.albumArtPosition === 'bottom-right' && {
                  bottom: 20,
                  right: 20,
                }),
                zIndex: 5000,
                opacity: settings.albumArtOpacity,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={currentAlbumArt || currentPlaylistImageUrl || ''}
                alt={currentAlbumArt ? "Album Art" : "Playlist Image"}
                style={{
                  width: settings.albumArtSize === 'small' ? '120px' :
                         settings.albumArtSize === 'medium' ? '200px' : '300px',
                  height: settings.albumArtSize === 'small' ? '120px' :
                          settings.albumArtSize === 'medium' ? '200px' : '300px',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  // Hide the image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </Box>
          </Fade>
        )}

        {/* Song info overlay with trivia reveal animation */}
        {settings.showSongInfo && songInfo && (
          <>
            {/* Main song info box */}
            <Fade in={!showRevealAnimation} timeout={300}>
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
                  backdropFilter: 'blur(10px)',
                  border: songInfo.showTrivia ? '2px solid rgba(255,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h6">
                  {songInfo.title}
                  {songInfo.artist && ` - ${songInfo.artist}`}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)">
                  {songInfo.type}
                  {songInfo.playlist && ` - ${songInfo.playlist}`}
                  {songInfo.clipIndex && ` (${songInfo.clipIndex}/${songInfo.totalClips})`}
                </Typography>
                {songInfo.showTrivia && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MusicNoteIcon sx={{ color: 'rgba(255,255,0,0.9)', fontSize: 16 }} />
                    <Typography variant="caption" color="rgba(255,255,0,0.9)">
                      Song details revealed in {Math.ceil(songInfo.timeUntilReveal ?? 0)}s
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>

            {/* Trivia reveal animation */}
            {showRevealAnimation && (
              <Fade in={revealAnimationPhase !== 'leaving'} timeout={revealAnimationPhase === 'leaving' ? 2000 : 300}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10001,
                    textAlign: 'center',
                  }}
                >
                  {/* Animated background burst */}
                  <Zoom in={revealAnimationPhase === 'entering'} timeout={500}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: revealAnimationPhase === 'staying' ? 200 : 300,
                        height: revealAnimationPhase === 'staying' ? 200 : 300,
                        borderRadius: '50%',
                        background: revealAnimationPhase === 'staying'
                          ? 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 50%, transparent 70%)'
                          : 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,165,0,0.2) 50%, transparent 70%)',
                        transition: 'all 1s ease-in-out',
                      }}
                    />
                  </Zoom>

                  {/* Star burst effect - only during entering and leaving phases */}
                  {(revealAnimationPhase === 'entering' || revealAnimationPhase === 'leaving') &&
                    [...Array(8)].map((_, i) => (
                      <Zoom key={i} in={revealAnimationPhase !== 'leaving'} timeout={300 + i * 100}>
                        <StarIcon
                          sx={{
                            position: 'absolute',
                            color: '#FFD700',
                            fontSize: revealAnimationPhase === 'leaving' ? 32 : 24,
                            top: '50%',
                            left: '50%',
                            '--rotation': `${i * 45}deg`,
                            transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-80px)`,
                            animation: revealAnimationPhase === 'leaving'
                              ? 'sparkle 0.5s ease-in-out infinite'
                              : 'sparkle 2s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                            transition: 'all 0.5s ease-in-out',
                          }}
                        />
                      </Zoom>
                    ))
                  }

                  {/* Main reveal content */}
                  <Slide direction="up" in={showRevealAnimation} timeout={800}>
                    <Box
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        borderRadius: 3,
                        padding: revealAnimationPhase === 'staying' ? 2 : 3,
                        border: '3px solid #FFD700',
                        boxShadow: '0 0 30px rgba(255,215,0,0.5)',
                        backdropFilter: 'blur(15px)',
                        minWidth: revealAnimationPhase === 'staying' ? 250 : 300,
                        animation: revealAnimationPhase === 'staying'
                          ? 'glow 4s ease-in-out infinite'
                          : revealAnimationPhase === 'leaving'
                            ? 'glow 0.5s ease-in-out infinite'
                            : 'glow 2s ease-in-out infinite',
                        transition: 'all 1s ease-in-out',
                        transform: revealAnimationPhase === 'leaving' ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <FlashOnIcon sx={{
                          color: '#FFD700',
                          fontSize: revealAnimationPhase === 'staying' ? 24 : 32,
                          mr: 1,
                          transition: 'all 1s ease-in-out',
                        }} />
                        <Typography variant={revealAnimationPhase === 'staying' ? 'h6' : 'h5'} sx={{
                          color: '#FFD700',
                          fontWeight: 'bold',
                          transition: 'all 1s ease-in-out',
                        }}>
                          {revealAnimationPhase === 'leaving' ? 'FAREWELL!' : 'REVEALED!'}
                        </Typography>
                        <FlashOnIcon sx={{
                          color: '#FFD700',
                          fontSize: revealAnimationPhase === 'staying' ? 24 : 32,
                          ml: 1,
                          transition: 'all 1s ease-in-out',
                        }} />
                      </Box>

                      <Grow in={showRevealAnimation} timeout={1200}>
                        <Box>
                          <Typography variant={revealAnimationPhase === 'staying' ? 'h5' : 'h4'} sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            mb: 1,
                            transition: 'all 1s ease-in-out',
                          }}>
                            {songInfo.title}
                          </Typography>
                          {songInfo.artist && (
                            <Typography variant="h6" sx={{
                              color: '#FFD700',
                              fontStyle: 'italic',
                              transition: 'all 1s ease-in-out',
                            }}>
                              by {songInfo.artist}
                            </Typography>
                          )}
                        </Box>
                      </Grow>

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {[...Array(3)].map((_, i) => (
                          <Chip
                            key={i}
                            icon={<MusicNoteIcon />}
                            label="♪"
                            sx={{
                              backgroundColor: 'rgba(255,215,0,0.2)',
                              color: '#FFD700',
                              animation: revealAnimationPhase === 'staying'
                                ? 'bounce 2s ease-in-out infinite'
                                : revealAnimationPhase === 'leaving'
                                  ? 'bounce 0.3s ease-in-out infinite'
                                  : 'bounce 1s ease-in-out infinite',
                              animationDelay: `${i * 0.2}s`,
                              transition: 'all 1s ease-in-out',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Slide>
                </Box>
              </Fade>
            )}
          </>
        )}

        {/* Visualizer */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            height: '100%',
            position: 'relative',
            cursor: showCursor ? 'default' : 'none',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {renderVisualizer()}
          {renderHoverControls()}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Floating controls */}
      <Fade in={showTopControls} timeout={300}>
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
          {renderPlaylistButton()}
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
            <FullscreenIcon />
          </IconButton>
        </Box>
      </Fade>

      {/* Visualizer */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          overflow: 'hidden',
          position: 'relative',
          cursor: showCursor ? 'default' : 'none',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {renderVisualizer()}
        {renderHoverControls()}

        {/* Album Art Display */}
        {settings.showAlbumArt && (currentAlbumArt || currentPlaylistImageUrl) && (
          <Fade in={true} timeout={500}>
            <Box
              sx={{
                position: 'absolute',
                ...(settings.albumArtPosition === 'center' && {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }),
                ...(settings.albumArtPosition === 'top-left' && {
                  top: 20,
                  left: 20,
                }),
                ...(settings.albumArtPosition === 'top-right' && {
                  top: 20,
                  right: 20,
                }),
                ...(settings.albumArtPosition === 'bottom-left' && {
                  bottom: 20,
                  left: 20,
                }),
                ...(settings.albumArtPosition === 'bottom-right' && {
                  bottom: 20,
                  right: 20,
                }),
                zIndex: 5000,
                opacity: settings.albumArtOpacity,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={currentAlbumArt || currentPlaylistImageUrl || ''}
                alt={currentAlbumArt ? "Album Art" : "Playlist Image"}
                style={{
                  width: settings.albumArtSize === 'small' ? '120px' :
                         settings.albumArtSize === 'medium' ? '200px' : '300px',
                  height: settings.albumArtSize === 'small' ? '120px' :
                          settings.albumArtSize === 'medium' ? '200px' : '300px',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  // Hide the image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </Box>
          </Fade>
        )}

        {/* Song info overlay with trivia reveal animation */}
        {settings.showSongInfo && songInfo && (
          <>
            {/* Main song info box */}
            <Fade in={!showRevealAnimation} timeout={300}>
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
                  backdropFilter: 'blur(10px)',
                  border: songInfo.showTrivia ? '2px solid rgba(255,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h6">
                  {songInfo.title}
                  {songInfo.artist && ` - ${songInfo.artist}`}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.7)">
                  {songInfo.type}
                  {songInfo.playlist && ` - ${songInfo.playlist}`}
                  {songInfo.clipIndex && ` (${songInfo.clipIndex}/${songInfo.totalClips})`}
                </Typography>
                {songInfo.showTrivia && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MusicNoteIcon sx={{ color: 'rgba(255,255,0,0.9)', fontSize: 16 }} />
                    <Typography variant="caption" color="rgba(255,255,0,0.9)">
                      Song details revealed in {Math.ceil(songInfo.timeUntilReveal ?? 0)}s
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>

            {/* Trivia reveal animation */}
            {showRevealAnimation && (
              <Fade in={revealAnimationPhase !== 'leaving'} timeout={revealAnimationPhase === 'leaving' ? 2000 : 300}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10001,
                    textAlign: 'center',
                  }}
                >
                  {/* Animated background burst */}
                  <Zoom in={revealAnimationPhase === 'entering'} timeout={500}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: revealAnimationPhase === 'staying' ? 200 : 300,
                        height: revealAnimationPhase === 'staying' ? 200 : 300,
                        borderRadius: '50%',
                        background: revealAnimationPhase === 'staying'
                          ? 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 50%, transparent 70%)'
                          : 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,165,0,0.2) 50%, transparent 70%)',
                        transition: 'all 1s ease-in-out',
                      }}
                    />
                  </Zoom>

                  {/* Star burst effect - only during entering and leaving phases */}
                  {(revealAnimationPhase === 'entering' || revealAnimationPhase === 'leaving') &&
                    [...Array(8)].map((_, i) => (
                      <Zoom key={i} in={revealAnimationPhase !== 'leaving'} timeout={300 + i * 100}>
                        <StarIcon
                          sx={{
                            position: 'absolute',
                            color: '#FFD700',
                            fontSize: revealAnimationPhase === 'leaving' ? 32 : 24,
                            top: '50%',
                            left: '50%',
                            '--rotation': `${i * 45}deg`,
                            transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-80px)`,
                            animation: revealAnimationPhase === 'leaving'
                              ? 'sparkle 0.5s ease-in-out infinite'
                              : 'sparkle 2s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                            transition: 'all 0.5s ease-in-out',
                          }}
                        />
                      </Zoom>
                    ))
                  }

                  {/* Main reveal content */}
                  <Slide direction="up" in={showRevealAnimation} timeout={800}>
                    <Box
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        borderRadius: 3,
                        padding: revealAnimationPhase === 'staying' ? 2 : 3,
                        border: '3px solid #FFD700',
                        boxShadow: '0 0 30px rgba(255,215,0,0.5)',
                        backdropFilter: 'blur(15px)',
                        minWidth: revealAnimationPhase === 'staying' ? 250 : 300,
                        animation: revealAnimationPhase === 'staying'
                          ? 'glow 4s ease-in-out infinite'
                          : revealAnimationPhase === 'leaving'
                            ? 'glow 0.5s ease-in-out infinite'
                            : 'glow 2s ease-in-out infinite',
                        transition: 'all 1s ease-in-out',
                        transform: revealAnimationPhase === 'leaving' ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <FlashOnIcon sx={{
                          color: '#FFD700',
                          fontSize: revealAnimationPhase === 'staying' ? 24 : 32,
                          mr: 1,
                          transition: 'all 1s ease-in-out',
                        }} />
                        <Typography variant={revealAnimationPhase === 'staying' ? 'h6' : 'h5'} sx={{
                          color: '#FFD700',
                          fontWeight: 'bold',
                          transition: 'all 1s ease-in-out',
                        }}>
                          {revealAnimationPhase === 'leaving' ? 'FAREWELL!' : 'REVEALED!'}
                        </Typography>
                        <FlashOnIcon sx={{
                          color: '#FFD700',
                          fontSize: revealAnimationPhase === 'staying' ? 24 : 32,
                          ml: 1,
                          transition: 'all 1s ease-in-out',
                        }} />
                      </Box>

                      <Grow in={showRevealAnimation} timeout={1200}>
                        <Box>
                          <Typography variant={revealAnimationPhase === 'staying' ? 'h5' : 'h4'} sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            mb: 1,
                            transition: 'all 1s ease-in-out',
                          }}>
                            {songInfo.title}
                          </Typography>
                          {songInfo.artist && (
                            <Typography variant="h6" sx={{
                              color: '#FFD700',
                              fontStyle: 'italic',
                              transition: 'all 1s ease-in-out',
                            }}>
                              by {songInfo.artist}
                            </Typography>
                          )}
                        </Box>
                      </Grow>

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {[...Array(3)].map((_, i) => (
                          <Chip
                            key={i}
                            icon={<MusicNoteIcon />}
                            label="♪"
                            sx={{
                              backgroundColor: 'rgba(255,215,0,0.2)',
                              color: '#FFD700',
                              animation: revealAnimationPhase === 'staying'
                                ? 'bounce 2s ease-in-out infinite'
                                : revealAnimationPhase === 'leaving'
                                  ? 'bounce 0.3s ease-in-out infinite'
                                  : 'bounce 1s ease-in-out infinite',
                              animationDelay: `${i * 0.2}s`,
                              transition: 'all 1s ease-in-out',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Slide>
                </Box>
              </Fade>
            )}
          </>
        )}
      </Box>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sx={{
          zIndex: settings.fullScreen ? 10003 : 1300, // Higher z-index in fullscreen mode
          '& .MuiDrawer-paper': {
            zIndex: settings.fullScreen ? 10003 : 1300,
            top: settings.fullScreen ? '0px' : '80px', // Full height in fullscreen, below nav otherwise
            height: settings.fullScreen ? '100vh' : 'calc(100vh - 80px)', // Adjust height based on mode
          },
          '& .MuiBackdrop-root': {
            zIndex: settings.fullScreen ? 10002 : 1299,
            top: settings.fullScreen ? '0px' : '80px', // Backdrop positioning based on mode
            height: settings.fullScreen ? '100vh' : 'calc(100vh - 80px)',
          }
        }}
        PaperProps={{
          sx: {
            width: 320,
            p: 2,
            top: settings.fullScreen ? '0px !important' : '80px !important', // Dynamic positioning
            height: settings.fullScreen ? '100vh !important' : 'calc(100vh - 80px) !important', // Dynamic height
          },
        }}
        ModalProps={{
          style: { zIndex: settings.fullScreen ? 10003 : 1300 },
          container: document.body,
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
            <MenuItem value="spectrum">Enhanced Spectrum</MenuItem>
            <MenuItem value="mandala">Mandala</MenuItem>
            <MenuItem value="liquid">Liquid Motion</MenuItem>
            <MenuItem value="galaxy">Galaxy</MenuItem>
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

        <FormControlLabel
          control={
            <Switch
              checked={settings.showAnalysis}
              onChange={(e) => updateSettings({ showAnalysis: e.target.checked })}
            />
          }
          label="Show Analysis Data"
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.triviaMode}
              onChange={(e) => updateSettings({ triviaMode: e.target.checked })}
            />
          }
          label="Trivia Mode"
          sx={{ mb: 2 }}
        />

        {/* Test button for trivia reveal animation */}
        {settings.triviaMode && songInfo && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              console.log('🧪 MANUALLY TRIGGERING TRIVIA REVEAL ANIMATION');
              setShowRevealAnimation(true);
              setTimeout(() => {
                setShowRevealAnimation(false);
              }, 3000);
            }}
            sx={{ mb: 2, width: '100%' }}
          >
            Test Reveal Animation
          </Button>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
            />
          }
          label="Demo Mode"
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
            <MenuItem value="gradient">Gradient</MenuItem>
            <MenuItem value="reactive">Audio Reactive</MenuItem>
            <MenuItem value="frequency">Frequency Mapped</MenuItem>
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

        {(settings.type === 'particles' || settings.type === 'liquid' || settings.type === 'galaxy') && (
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
        <Typography variant="h6" sx={{ mb: 2 }}>Enhanced Effects</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.glowEffect}
              onChange={(e) => updateSettings({ glowEffect: e.target.checked })}
            />
          }
          label="Glow Effect"
          sx={{ mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.motionBlur}
              onChange={(e) => updateSettings({ motionBlur: e.target.checked })}
            />
          }
          label="Motion Blur"
          sx={{ mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.beatReactive}
              onChange={(e) => updateSettings({ beatReactive: e.target.checked })}
            />
          }
          label="Beat Reactive"
          sx={{ mb: 2 }}
        />

        <Typography gutterBottom>Bloom Intensity</Typography>
        <Slider
          value={settings.bloomIntensity}
          onChange={(_, value) => updateSettings({ bloomIntensity: value as number })}
          min={0}
          max={2}
          step={0.1}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <Typography gutterBottom>Color Cycle Speed</Typography>
        <Slider
          value={settings.colorCycleSpeed}
          onChange={(_, value) => updateSettings({ colorCycleSpeed: value as number })}
          min={0.1}
          max={3}
          step={0.1}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Render Quality</InputLabel>
          <Select
            value={settings.renderQuality}
            label="Render Quality"
            onChange={(e) => updateSettings({ renderQuality: e.target.value as any })}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="ultra">Ultra</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>Album Art Display</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.showAlbumArt}
              onChange={(e) => updateSettings({ showAlbumArt: e.target.checked })}
            />
          }
          label="Show Album Art"
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableOnlineAlbumArt}
              onChange={(e) => updateSettings({ enableOnlineAlbumArt: e.target.checked })}
            />
          }
          label="Download Album Art Online"
          sx={{ mb: 2 }}
        />

        {settings.showAlbumArt && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Album Art Size</InputLabel>
              <Select
                value={settings.albumArtSize}
                label="Album Art Size"
                onChange={(e) => updateSettings({ albumArtSize: e.target.value as 'small' | 'medium' | 'large' })}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Album Art Position</InputLabel>
              <Select
                value={settings.albumArtPosition}
                label="Album Art Position"
                onChange={(e) => updateSettings({ albumArtPosition: e.target.value as any })}
              >
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="top-left">Top Left</MenuItem>
                <MenuItem value="top-right">Top Right</MenuItem>
                <MenuItem value="bottom-left">Bottom Left</MenuItem>
                <MenuItem value="bottom-right">Bottom Right</MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom>Album Art Opacity</Typography>
            <Slider
              value={settings.albumArtOpacity}
              onChange={(_, value) => updateSettings({ albumArtOpacity: value as number })}
              min={0.1}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
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
              showAnalysis: false,
              triviaMode: false,
              sensitivity: 1.0,
              colorMode: 'theme',
              customColor: '#ff6b6b',
              barCount: 64,
              backgroundOpacity: 0.1,
              particleCount: 100,
              bloomIntensity: 0.5,
              motionBlur: false,
              beatReactive: true,
              glowEffect: true,
              gradientColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
              colorCycleSpeed: 1.0,
              frequencyColorMapping: false,
              renderQuality: 'high',
              showAlbumArt: false,
              albumArtSize: 'medium',
              albumArtPosition: 'center',
              albumArtOpacity: 0.8,
              enableOnlineAlbumArt: true,
            });
          }}
        >
          Reset to Defaults
        </Button>
      </Drawer>

      {/* Playlist Selector Dialog */}
      <PlaylistSelector
        open={playlistSelectorOpen}
        onClose={() => setPlaylistSelectorOpen(false)}
      />
    </Box>
  );
};

const MusicVisualizer: React.FC = () => {
  return <MusicVisualizerContent />;
};

export default MusicVisualizer;
