import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  YouTube as YouTubeIcon,
  NewReleases as NewIcon,
  Speed as SpeedIcon,
  Tune as TuneIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import YouTubeSearchV2 from './YouTubeSearchV2';

const YouTubeV2: React.FC = () => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);

  const handlePlaylistUpdated = (playlist: any) => {
    console.log('Playlist updated:', playlist);
    setEditingPlaylist(null);
  };

  const features = [
    {
      icon: <NewIcon />,
      title: 'Modern Design',
      description: 'Clean, responsive interface with smooth animations',
    },
    {
      icon: <SpeedIcon />,
      title: 'Enhanced Performance',
      description: 'Faster search with yt-dlp integration',
    },
    {
      icon: <TuneIcon />,
      title: 'Advanced Filters',
      description: 'Comprehensive filtering and sorting options',
    },
    {
      icon: <SearchIcon />,
      title: 'Unlimited Results',
      description: 'No API limits with configurable result counts',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.1)} 100%)`,
          border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, ${alpha(currentTheme.primary, 0.05)} 25%, transparent 25%, transparent 75%, ${alpha(currentTheme.primary, 0.05)} 75%), linear-gradient(45deg, ${alpha(currentTheme.primary, 0.05)} 25%, transparent 25%, transparent 75%, ${alpha(currentTheme.primary, 0.05)} 75%)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
            opacity: 0.3,
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <YouTubeIcon
              sx={{
                fontSize: 48,
                color: currentTheme.primary,
                filter: `drop-shadow(0 4px 8px ${alpha(currentTheme.primary, 0.3)})`,
              }}
            />
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                }}
              >
                YouTube Search V2
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Next-generation YouTube search with enhanced features
              </Typography>
            </Box>
            <Chip
              label="NEW"
              size="small"
              sx={{
                ml: 'auto',
                backgroundColor: currentTheme.secondary,
                color: 'white',
                fontWeight: 600,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            />
          </Box>

          {/* Features Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
              mt: 3,
            }}
          >
            {features.map((feature, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  borderRadius: 2,
                  border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(currentTheme.primary, 0.2)}`,
                    borderColor: currentTheme.primary,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: alpha(currentTheme.primary, 0.1),
                    color: currentTheme.primary,
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Main Search Component */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
        }}
      >
        <YouTubeSearchV2
          editingPlaylist={editingPlaylist}
          onPlaylistUpdated={handlePlaylistUpdated}
        />
      </Paper>

      {/* Footer Info */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Powered by yt-dlp for unlimited YouTube access • No API restrictions
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
          <Chip
            label="yt-dlp Enabled"
            size="small"
            sx={{
              backgroundColor: alpha(currentTheme.primary, 0.1),
              color: currentTheme.primary,
              fontWeight: 600,
            }}
          />
          <Chip
            label="Unlimited Results"
            size="small"
            sx={{
              backgroundColor: alpha(currentTheme.secondary, 0.1),
              color: currentTheme.secondary,
              fontWeight: 600,
            }}
          />
          <Chip
            label="Modern UI"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default YouTubeV2;
