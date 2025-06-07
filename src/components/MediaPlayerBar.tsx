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

interface MediaPlayerBarProps {
  open: boolean;
  title: string;
  subtitle?: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onStop?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
  showVolumeControl?: boolean;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (value: number) => void;
  onMuteToggle?: () => void;
  audio?: HTMLAudioElement | null;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MediaPlayerBar: React.FC<MediaPlayerBarProps> = ({
  open,
  title,
  subtitle,
  playing,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onStop,
  onPrevious,
  onNext,
  onClose,
  showVolumeControl = true,
  volume = 1,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,
  audio,
}) => {
  const [volumeAnchor, setVolumeAnchor] = useState<null | HTMLElement>(null);
  const [localVolume, setLocalVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const handleVolumeClick = (event: React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(event.currentTarget);
  };
  const handleVolumeClose = () => {
    setVolumeAnchor(null);
  };
  const handleVolumeChange = (_: any, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setLocalVolume(v);
    if (onVolumeChange) {
      onVolumeChange(v);
    } else if (audio) {
      audio.volume = v;
    }
  };

  if (!open || !title) return null;

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
        {onPrevious && (
          <IconButton onClick={onPrevious} sx={{ mr: 1 }}>
            <SkipPreviousIcon />
          </IconButton>
        )}
        <IconButton onClick={onPlayPause} sx={{ mr: 1, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        {onStop && (
          <IconButton onClick={onStop} sx={{ mr: 1 }}>
            <StopIcon />
          </IconButton>
        )}
        {onNext && (
          <IconButton onClick={onNext} sx={{ mr: 2 }}>
            <SkipNextIcon />
          </IconButton>
        )}

        {/* Progress Slider */}
        <Box sx={{ flex: 1, mx: 2 }}>
          <Slider
            min={0}
            max={duration || 0}
            value={isDragging ? dragValue : currentTime}
            onChange={(_, v) => {
              setIsDragging(true);
              setDragValue(Number(v));
            }}
            onChangeCommitted={(_, v) => {
              setIsDragging(false);
              onSeek(Number(v));
            }}
            sx={{ width: '100%' }}
            disabled={!duration || duration === 0}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="caption">{formatTime(isDragging ? dragValue : currentTime)}</Typography>
            <Typography variant="caption">{formatTime(duration || 0)}</Typography>
          </Box>
        </Box>

        {showVolumeControl && (
          <IconButton onClick={handleVolumeClick} sx={{ ml: 1 }}>
            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        )}
        <IconButton onClick={onClose} sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Volume Popover */}
      {showVolumeControl && (
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            py: 2,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 3,
            height: 140,
            minWidth: 56,
            overflow: 'hidden'
          }}>
            <Slider
              orientation="vertical"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : (onVolumeChange ? volume : localVolume)}
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
            {onMuteToggle && (
              <IconButton
                onClick={onMuteToggle}
                size="small"
                sx={{ mt: 1 }}
              >
                {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
              </IconButton>
            )}
          </Box>
        </Popover>
      )}

      {/* Track Info */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default MediaPlayerBar;