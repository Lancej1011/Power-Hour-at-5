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
      {/* Main Controls Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', mb: 1 }}>
        <IconButton onClick={onPrevious} disabled={isFirstClip} sx={{ mr: 1 }}>
          <SkipPreviousIcon />
        </IconButton>
        <IconButton onClick={onPlayPause} sx={{ mr: 1, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={onStop} sx={{ mr: 1 }}>
          <StopIcon />
        </IconButton>
        <IconButton onClick={onNext} disabled={isLastClip} sx={{ mr: 2 }}>
          <SkipNextIcon />
        </IconButton>

        {/* Progress Slider */}
        <Box sx={{ flex: 1, mx: 2 }}>
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
            sx={{ width: '100%' }}
            disabled={!duration || duration === 0}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="caption">{formatTime(isNaN(progress) ? 0 : progress)}</Typography>
            <Typography variant="caption">{formatTime(duration || 0)}</Typography>
          </Box>
        </Box>

        <IconButton onClick={handleVolumeClick} sx={{ ml: 1 }}>
          {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
        <IconButton onClick={onClose} sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
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
          px: 2,
          py: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          height: 120,
          minWidth: 56
        }}>
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            sx={{ height: 100 }}
          />
        </Box>
      </Popover>

      {/* Track Info */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
          {playlist.name}
        </Typography>
        {isDrinkingSoundPlaying ? (
          <Typography variant="body2" color="primary.main" noWrap sx={{ fontWeight: 'bold' }}>
            🍻 Time to Drink! 🍻
          </Typography>
        ) : currentClip ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            {currentClipIndex + 1} of {playlist.clips.length}: {currentClip.name}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
};

export default PlaylistMediaBar;
