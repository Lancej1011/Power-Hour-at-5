import React, { useState } from 'react';
import { Box, IconButton, Typography, Slider, Paper, Popover } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

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

interface PlaylistMediaBarProps {
  open: boolean;
  playlist: Playlist | null;
  isPlaying: boolean;
  currentClipIndex: number;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isDrinkingSoundPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onClose: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const PlaylistMediaBar: React.FC<PlaylistMediaBarProps> = ({
  open,
  playlist,
  isPlaying,
  currentClipIndex,
  progress,
  duration,
  volume,
  isMuted,
  isDrinkingSoundPlaying,
  onPlayPause,
  onStop,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onClose,
}) => {
  const [volumeAnchor, setVolumeAnchor] = useState<null | HTMLElement>(null);

  const handleVolumeClick = (event: React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(event.currentTarget);
  };

  const handleVolumeClose = () => {
    setVolumeAnchor(null);
  };

  const handleVolumeChange = (_: any, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    onVolumeChange(v);
  };

  if (!open || !playlist) return null;

  const currentClip = playlist.clips[currentClipIndex];
  const isFirstClip = currentClipIndex <= 0;
  const isLastClip = currentClipIndex >= playlist.clips.length - 1;

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
      minWidth: 400,
      maxWidth: 500,
      width: '100%',
      minHeight: 100,
    }}>
      {/* Header with Song Name, Artist and Close Button */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        mb: 2,
        position: 'relative'
      }}>
        <Box sx={{ flex: 1 }} /> {/* Left spacer */}
        <Box sx={{
          flex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Song Name */}
          <Typography variant="subtitle1" noWrap sx={{
            fontWeight: 'bold',
            textAlign: 'center',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentClip ? currentClip.name : 'No Track'}
          </Typography>

          {/* Artist Name */}
          {(() => {
            if (!currentClip) return null;

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

            // Show artist if we found one
            return artistName ? (
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
            ) : null;
          })()}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Playback Controls */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        mb: 2,
        gap: 1
      }}>
        <IconButton onClick={onPrevious} disabled={isFirstClip}>
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          onClick={onPlayPause}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            mx: 1
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={onStop}>
          <StopIcon />
        </IconButton>
        <IconButton onClick={onNext} disabled={isLastClip}>
          <SkipNextIcon />
        </IconButton>
        <IconButton
          onClick={handleVolumeClick}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
            ml: 1
          }}
        >
          {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Box>

      {/* Progress Section */}
      <Box sx={{ width: '100%', mb: 2 }}>
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
              width: 16,
              height: 16,
            }
          }}
          disabled={!duration || duration === 0}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTime(isNaN(progress) ? 0 : progress)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(duration || 0)}
          </Typography>
        </Box>
      </Box>



      {/* Volume Popover */}
      <Popover
        open={Boolean(volumeAnchor)}
        anchorEl={volumeAnchor}
        onClose={handleVolumeClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        PaperProps={{
          sx: {
            p: 1,
            zIndex: 2500,
            overflow: 'visible',
            height: 'auto',
            minHeight: 'unset'
          }
        }}
        sx={{ zIndex: 2500 }}
        disablePortal={false}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          height: 120,
          minWidth: 56,
          overflow: 'hidden'
        }}>
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
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

      {/* Track Info */}
      <Box sx={{
        textAlign: 'center',
        width: '100%',
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 1.5,
        mt: 1
      }}>
        {isDrinkingSoundPlaying ? (
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 'bold',
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'partyText 1s ease-in-out infinite alternate',
              '@keyframes partyText': {
                '0%': { transform: 'scale(1)' },
                '100%': { transform: 'scale(1.05)' },
              },
            }}
          >
            🍻 PARTY TIME! LET'S DRINK! 🎉🥳
          </Typography>
        ) : currentClip ? (
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ fontSize: '0.8rem' }}
          >
            {currentClipIndex + 1} of {playlist.clips.length}: {currentClip.name}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
};

export default PlaylistMediaBar;
