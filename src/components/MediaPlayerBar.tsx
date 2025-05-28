import React, { useState } from 'react';
import { Box, IconButton, Typography, Slider, Paper, Popover } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

interface MediaPlayerBarProps {
  open: boolean;
  mix: { name: string; songList: string[] } | null;
  audio: HTMLAudioElement | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onClose: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MediaPlayerBar: React.FC<MediaPlayerBarProps> = ({
  open,
  mix,
  audio,
  playing,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onClose,
}) => {
  const [volumeAnchor, setVolumeAnchor] = useState<null | HTMLElement>(null);
  const [volume, setVolume] = useState(1);

  const handleVolumeClick = (event: React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(event.currentTarget);
  };
  const handleVolumeClose = () => {
    setVolumeAnchor(null);
  };
  const handleVolumeChange = (_: any, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setVolume(v);
    if (audio) audio.volume = v;
  };

  if (!open || !mix) return null;
  return (
    <Paper elevation={8} sx={{
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 24,
      zIndex: 2000,
      p: 1.2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      bgcolor: 'background.paper',
      borderRadius: 3,
      boxShadow: 6,
      minWidth: 320,
      maxWidth: 420,
      width: '100%',
      minHeight: 80,
      justifyContent: 'flex-start',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flex: 1, width: '100%' }}>
        <IconButton onClick={onPlayPause} sx={{ mr: 1 }}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <Slider
            min={0}
            max={duration}
            value={currentTime}
            onChange={(_, v) => onSeek(Number(v))}
            sx={{ width: '100%' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'absolute', top: 28, left: 0 }}>
            <Typography variant="caption">{formatTime(currentTime)}</Typography>
            <Typography variant="caption">{formatTime(duration)}</Typography>
          </Box>
        </Box>
        <IconButton onClick={handleVolumeClick} sx={{ ml: 1 }}>
          {volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
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
              value={volume}
              onChange={handleVolumeChange}
              sx={{ height: 100 }}
            />
          </Box>
        </Popover>
        <IconButton onClick={onClose} sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Typography variant="subtitle1" noWrap sx={{ mt: 1, textAlign: 'center', width: '100%' }}>{mix.name}</Typography>
    </Paper>
  );
};

export default MediaPlayerBar;