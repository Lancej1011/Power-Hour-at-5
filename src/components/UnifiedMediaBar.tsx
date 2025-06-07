import React, { useState } from 'react';
import {
  Paper,
  Box,
  IconButton,
  Typography,
  Slider,
  Popover,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useAudio } from '../contexts/AudioContext';

interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  songName?: string;
  clipPath?: string;
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

interface UnifiedMediaBarProps {
  open: boolean;
  // For playlist mode
  playlist?: Playlist | null;
  currentClipIndex?: number;
  isDrinkingSoundPlaying?: boolean;
  // For mix/preview mode
  title?: string;
  subtitle?: string;
  // For clip count display
  clipIndex?: number;
  totalClips?: number;
  // Common props
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onClose: () => void;
  // Jump to song functionality
  onJumpToSong?: () => void;
  showJumpToSong?: boolean;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const UnifiedMediaBar: React.FC<UnifiedMediaBarProps> = ({
  open,
  playlist,
  currentClipIndex = -1,
  isDrinkingSoundPlaying = false,
  title,
  subtitle,
  clipIndex,
  totalClips,
  isPlaying,
  progress,
  duration,
  volume,
  isMuted,
  onPlayPause,
  onStop,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onClose,
  onJumpToSong,
  showJumpToSong = false,
}) => {
  const audio = useAudio();
  const [volumeAnchor, setVolumeAnchor] = useState<null | HTMLElement>(null);

  const handleVolumeClick = (event: React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(event.currentTarget);
  };

  const handleVolumeClose = () => {
    setVolumeAnchor(null);
  };

  const handleVolumeChange = (_: any, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    console.log('[UnifiedMediaBar] Volume change:', v, 'Audio source:', audio.audioSource);
    onVolumeChange(v);
  };

  if (!open) return null;

  // Determine if we're in playlist mode
  const isPlaylistMode = !!playlist;
  const currentClip = isPlaylistMode && playlist ? playlist.clips[currentClipIndex] : null;
  const isFirstClip = currentClipIndex <= 0;
  const isLastClip = isPlaylistMode && playlist ? currentClipIndex >= playlist.clips.length - 1 : false;

  // Determine the display title for bottom section (playlist name)
  const displayTitle = isPlaylistMode && playlist ? playlist.name : audio.previewPlaylistName || '';

  return (
    <Paper elevation={8} sx={{
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 24,
      zIndex: 2000,
      p: 1.5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      bgcolor: 'background.paper',
      borderRadius: 3,
      boxShadow: 6,
      minWidth: 420,
      maxWidth: 580,
      width: 'auto',
      minHeight: 100,
    }}>
      {/* Header with Current Song/Clip Info and Close Button */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        mb: 2,
        position: 'relative'
      }}>
        {/* Left side - Jump to Song button or spacer */}
        <Box sx={{ width: '32px', display: 'flex', justifyContent: 'flex-start' }}>
          {showJumpToSong && onJumpToSong ? (
            <IconButton
              onClick={onJumpToSong}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' },
                padding: '4px'
              }}
              title="Jump to song in library"
            >
              <MyLocationIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
        <Box sx={{
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          maxWidth: '400px', // Increased from 320px
          px: 0.25 // Reduced padding to save space
        }}>
          {isPlaylistMode ? (
            // Playlist mode: show clip info or drinking sound
            isDrinkingSoundPlaying ? (
              <Typography
                variant="subtitle1"
                color="primary.main"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.85rem' // Slightly smaller for more text
                }}
              >
                🍻 Time to Drink! 🍻
              </Typography>
            ) : currentClip ? (
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Typography
                  variant="subtitle1"
                  color="text.primary"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.85rem', // Slightly smaller for more text
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                    maxWidth: '100%'
                  }}
                >
                  {currentClip.name}
                </Typography>

                {/* Artist information display */}
                {(() => {
                  // Try to get artist from multiple sources
                  let artistName = currentClip.artist;

                  // If no artist in clip metadata, try to extract from songName
                  if (!artistName && currentClip.songName && currentClip.songName !== playlist?.name) {
                    if (currentClip.songName.includes(' - ')) {
                      artistName = currentClip.songName.split(' - ')[0];
                    }
                  }

                  // If still no artist, try to extract from clip name
                  if (!artistName && currentClip.name && currentClip.name !== playlist?.name) {
                    // Look for patterns like "Artist - Song [time]" or "Artist - Song"
                    const nameMatch = currentClip.name.match(/^(.+?)\s*-\s*(.+?)(?:\s*\[[\d:]+\s*-\s*[\d:]+\])?$/);
                    if (nameMatch) {
                      artistName = nameMatch[1].trim();
                    }
                  }

                  // For demonstration purposes, always show an artist line
                  // This will help verify the layout is working correctly
                  if (!artistName) {
                    artistName = 'Unknown Artist';
                  }

                  // Extract time range from clip name for display
                  const timeRange = (() => {
                    const timeMatch = currentClip.name.match(/\[(\d+:\d+)\s*-\s*(\d+:\d+)\]/);
                    return timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : null;
                  })();

                  // Always show artist info and time range
                  return (
                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                      {/* Artist name */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.1,
                          maxWidth: '100%',
                          mt: 0.25
                        }}
                      >
                        {artistName}
                      </Typography>

                      {/* Time range */}
                      {timeRange && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.7rem',
                            opacity: 0.8,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.1,
                            maxWidth: '100%',
                            mt: 0.25,
                            fontStyle: 'italic'
                          }}
                        >
                          {timeRange}
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
              </Box>
            ) : null
          ) : (
            // Mix/Preview mode: show title and extract artist if possible
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography
                variant="subtitle1"
                color="text.primary"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.85rem', // Slightly smaller for more text
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  maxWidth: '100%'
                }}
              >
                {(() => {
                  // Clean up the song title for preview mode
                  let songTitle = title || subtitle || 'Now Playing';

                  // Remove timestamp patterns like [1:17 - 2:17]
                  songTitle = songTitle.replace(/\s*\[[\d:]+\s*-\s*[\d:]+\]$/, '');

                  // If the title contains "Artist - Song", extract just the song part
                  if (songTitle.includes(' - ')) {
                    const parts = songTitle.split(' - ');
                    if (parts.length >= 2) {
                      songTitle = parts.slice(1).join(' - '); // Everything after the first " - "
                    }
                  }

                  return songTitle.trim() || title || 'Now Playing';
                })()}
              </Typography>

              {/* Artist information for mix/preview mode */}
              {(() => {
                // Get artist from audio context based on current audio source
                let artistName = audio.audioSource === 'mix'
                  ? audio.mixArtist
                  : audio.previewClipArtist;

                // If no artist from context, try to extract from title or subtitle
                if (!artistName) {
                  const titleToCheck = title || subtitle || '';
                  // Remove timestamp patterns first
                  const cleanTitle = titleToCheck.replace(/\s*\[[\d:]+\s*-\s*[\d:]+\]$/, '');

                  // Look for patterns like "Artist - Song"
                  if (cleanTitle.includes(' - ')) {
                    const parts = cleanTitle.split(' - ');
                    if (parts.length >= 2) {
                      artistName = parts[0].trim();
                    }
                  }
                }

                // Extract time range from clip name for display
                const timeRange = (() => {
                  const titleToCheck = title || subtitle || '';
                  const timeMatch = titleToCheck.match(/\[(\d+:\d+)\s*-\s*(\d+:\d+)\]/);
                  return timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : null;
                })();

                return (
                  <Box sx={{ textAlign: 'center', width: '100%' }}>
                    {/* Artist name */}
                    {artistName && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.1,
                          maxWidth: '100%',
                          mt: 0.25
                        }}
                      >
                        {artistName}
                      </Typography>
                    )}

                    {/* Time range */}
                    {timeRange && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.7rem',
                          opacity: 0.8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.1,
                          maxWidth: '100%',
                          mt: 0.25,
                          fontStyle: 'italic'
                        }}
                      >
                        {timeRange}
                      </Typography>
                    )}
                  </Box>
                );
              })()}
            </Box>
          )}
        </Box>
        <Box sx={{ width: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover'
              },
              width: '32px',
              height: '32px'
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Progress Section */}
      <Box sx={{ width: '100%', mb: 1.5, px: 0.5 }}>
        <Slider
          min={0}
          max={duration || 0}
          value={isNaN(progress) ? 0 : Math.min(progress, duration || 0)}
          onChange={(_, v) => {
            const seekValue = Number(v);
            if (!isNaN(seekValue) && seekValue >= 0 && seekValue <= (duration || 0)) {
              onSeek(seekValue);
            }
          }}
          sx={{
            width: '100%',
            '& .MuiSlider-thumb': {
              width: 14,
              height: 14,
            },
            '& .MuiSlider-track': {
              height: 4,
            },
            '& .MuiSlider-rail': {
              height: 4,
            }
          }}
          disabled={!duration || duration === 0}
        />
      </Box>

      {/* Playback Controls with Times */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        mb: 1.5,
        px: 1
      }}>
        {/* Current Time */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: '35px', textAlign: 'left', fontSize: '0.75rem' }}>
          {formatTime(isNaN(progress) ? 0 : progress)}
        </Typography>

        {/* Centered Controls */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5
        }}>
          {onPrevious && (
            <IconButton onClick={onPrevious} disabled={isPlaylistMode ? isFirstClip : false} size="small">
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={onPlayPause}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              mx: 0.5,
              width: 40,
              height: 40
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton onClick={onStop} size="small">
            <StopIcon fontSize="small" />
          </IconButton>
          {onNext && (
            <IconButton onClick={onNext} disabled={isPlaylistMode ? isLastClip : false} size="small">
              <SkipNextIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={handleVolumeClick}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              ml: 0.5
            }}
          >
            {isMuted || volume === 0 ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
          </IconButton>


        </Box>

        {/* End Time */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: '35px', textAlign: 'right', fontSize: '0.75rem' }}>
          {formatTime(duration || 0)}
        </Typography>
      </Box>

      {/* Volume Popover - Fixed version */}
      <Popover
        open={Boolean(volumeAnchor)}
        anchorEl={volumeAnchor}
        onClose={handleVolumeClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 2500 }}
        disablePortal={false}
        disableScrollLock={true}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          height: 120,
          minWidth: 56,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 3,
          overflow: 'hidden',
        }}>
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            sx={{
              height: 100,
              '& .MuiSlider-track': {
                width: 4,
              },
              '& .MuiSlider-rail': {
                width: 4,
              },
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              }
            }}
          />
        </Box>
      </Popover>


    </Paper>
  );
};

export default UnifiedMediaBar;
