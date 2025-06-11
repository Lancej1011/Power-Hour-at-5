import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  YouTube as YouTubeIcon,
  NewReleases as NewIcon,
  Speed as SpeedIcon,
  Tune as TuneIcon,
  Search as SearchIcon,
  AutoAwesome as MagicIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import YouTubeSearchV2 from './YouTubeSearchV2';
import PowerHourGenerator from './PowerHourGenerator';
import EnhancedPowerHourGenerator from './EnhancedPowerHourGenerator';
import { PowerHourGenerationResult } from '../types/powerHour';
import { saveYouTubePlaylist, generatePlaylistId } from '../utils/youtubeUtils';

const YouTubeV2: React.FC = () => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [useEnhancedGenerator, setUseEnhancedGenerator] = useState(true);

  const handlePlaylistUpdated = (playlist: any) => {
    console.log('Playlist updated:', playlist);
    setEditingPlaylist(null);
  };

  const handlePowerHourGenerated = (result: PowerHourGenerationResult) => {
    // Convert generated clips to YouTube playlist format
    const playlist = {
      id: generatePlaylistId(),
      name: result.clips.length > 0 ?
        `Generated Power Hour - ${new Date().toLocaleDateString()}` :
        'Generated Power Hour',
      clips: result.clips,
      date: new Date().toISOString(),
      drinkingSoundPath: undefined,
      imagePath: undefined,
    };

    // Save the generated playlist
    const saved = saveYouTubePlaylist(playlist);
    if (saved) {
      console.log('✅ Generated Power Hour playlist saved successfully');
      // Switch to search tab to show the saved playlist
      setCurrentTab(0);
    } else {
      console.error('❌ Failed to save generated playlist');
    }
  };

  const handleGeneratorCancel = () => {
    console.log('Power Hour generation cancelled');
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
    {
      icon: <MagicIcon />,
      title: 'Auto Generation',
      description: 'AI-powered playlist generation with 60 perfect clips',
    },
  ];

  return (
    <Box>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.1)} 100%)`,
          border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                background: `linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.secondary})`,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MagicIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                }}
              >
                Random Playlist Generator
              </Typography>
              <Typography variant="body1" color="text.secondary">
                AI-powered playlist generation with 60 perfect clips
              </Typography>
            </Box>
          </Box>

          {/* Quick Stats */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
            <Chip
              label="Auto Generation"
              size="small"
              sx={{
                backgroundColor: alpha(currentTheme.primary, 0.1),
                color: currentTheme.primary,
                fontWeight: 600,
              }}
            />
            <Chip
              label="Music Similarity"
              size="small"
              sx={{
                backgroundColor: alpha(currentTheme.secondary, 0.1),
                color: currentTheme.secondary,
                fontWeight: 600,
              }}
            />
            <Chip
              label="60 Perfect Clips"
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Tab Navigation */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          mb: 3,
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              minHeight: 56,
            },
            '& .Mui-selected': {
              color: currentTheme.primary,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: currentTheme.primary,
              height: 3,
            },
          }}
        >
          <Tab
            icon={<SearchIcon />}
            iconPosition="start"
            label="Manual Search"
            sx={{ px: 3 }}
          />
          <Tab
            icon={<MagicIcon />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Auto Generate
                {useEnhancedGenerator && (
                  <Chip
                    label="Enhanced"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                <Tooltip title={useEnhancedGenerator ? "Switch to Basic Generator" : "Switch to Enhanced Generator"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUseEnhancedGenerator(!useEnhancedGenerator);
                    }}
                    sx={{ ml: 1, p: 0.5 }}
                  >
                    {useEnhancedGenerator ? <ToggleOnIcon color="primary" /> : <ToggleOffIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            }
            sx={{ px: 3 }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
        }}
      >
        {currentTab === 0 && (
          <YouTubeSearchV2
            editingPlaylist={editingPlaylist}
            onPlaylistUpdated={handlePlaylistUpdated}
          />
        )}

        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            {useEnhancedGenerator ? (
              <EnhancedPowerHourGenerator
                onPlaylistGenerated={handlePowerHourGenerated}
                onCancel={handleGeneratorCancel}
              />
            ) : (
              <PowerHourGenerator
                onPlaylistGenerated={handlePowerHourGenerated}
                onCancel={handleGeneratorCancel}
              />
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default YouTubeV2;
