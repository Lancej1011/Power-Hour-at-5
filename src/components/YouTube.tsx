import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  useTheme,
  Tabs,
  Tab,
  alpha,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  YouTube as YouTubeIcon,
  Search as SearchIcon,
  AutoAwesome as MagicIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { YouTubePlaylist } from '../utils/youtubeUtils';
import YouTubeSearch from './YouTubeSearch';
import EnhancedPowerHourGenerator from './EnhancedPowerHourGenerator';
import { PowerHourGenerationResult } from '../types/powerHour';
import { useCollaborationStore } from '../stores/collaborationStore';

const YouTube: React.FC = () => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const { activeCollaborations } = useCollaborationStore();

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // State for edit context and playlist editing
  const [editContext, setEditContext] = useState<{playlistId: string; clipIndex: number} | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<YouTubePlaylist | null>(null);
  const [specificClipToEdit, setSpecificClipToEdit] = useState<{clip: any; index: number} | null>(null);
  const [useEnhancedGenerator, setUseEnhancedGenerator] = useState(true);

  // Check for edit context on component mount
  React.useEffect(() => {
    console.log('🔍 YouTube component mounted, checking for edit context...');
    const editContextStr = localStorage.getItem('youtube_edit_context');
    console.log('🔍 Edit context from localStorage:', editContextStr);

    if (editContextStr) {
      try {
        const context = JSON.parse(editContextStr);
        console.log('🔍 Parsed edit context:', context);

        // Load playlist for editing
        if (context.playlistId) {
          setEditContext(context);

          // First, try to find the playlist in localStorage (regular YouTube playlists)
          const playlistsStr = localStorage.getItem('youtube_playlists') || '[]';
          console.log('🔍 YouTube playlists from localStorage:', playlistsStr);
          const localPlaylists = JSON.parse(playlistsStr);
          console.log('🔍 Parsed local playlists:', localPlaylists);

          let playlistToEdit = localPlaylists.find((p: YouTubePlaylist) => p.id === context.playlistId);
          console.log('🔍 Found playlist in localStorage:', playlistToEdit);

          // If not found in localStorage, check collaborative playlists
          if (!playlistToEdit) {
            console.log('🔍 Checking collaborative playlists...');
            console.log('🔍 Active collaborations:', activeCollaborations);
            const collaborativePlaylist = activeCollaborations[context.playlistId];
            console.log('🔍 Found collaborative playlist:', collaborativePlaylist);

            if (collaborativePlaylist && collaborativePlaylist.type === 'youtube') {
              // Convert collaborative playlist to YouTubePlaylist format
              playlistToEdit = {
                id: collaborativePlaylist.id,
                name: collaborativePlaylist.name,
                clips: collaborativePlaylist.clips,
                date: collaborativePlaylist.date,
                drinkingSoundPath: collaborativePlaylist.drinkingSoundPath,
                imagePath: collaborativePlaylist.imagePath,
                // Add collaborative playlist specific properties if needed
                isCollaborative: true,
                collaborationId: collaborativePlaylist.collaborationId
              } as YouTubePlaylist & { isCollaborative?: boolean; collaborationId?: string };
              console.log('🎬 Converted collaborative playlist for editing:', playlistToEdit);
            }
          }

          if (playlistToEdit) {
            setEditingPlaylist(playlistToEdit);
            console.log('🎬 Loading playlist for editing:', playlistToEdit.name);
            console.log('🎬 Playlist has', playlistToEdit.clips.length, 'clips');

            // If a specific clip index is provided (and it's not 0 which means full playlist edit), set it for editing
            if (typeof context.clipIndex === 'number' && context.clipIndex > 0 && playlistToEdit.clips[context.clipIndex]) {
              setSpecificClipToEdit({
                clip: playlistToEdit.clips[context.clipIndex],
                index: context.clipIndex
              });
              console.log('🎯 Specific clip to edit at index', context.clipIndex, ':', playlistToEdit.clips[context.clipIndex].title);
            } else {
              console.log('🎬 Full playlist editing mode (clipIndex:', context.clipIndex, ')');
            }
          } else {
            console.log('❌ Playlist not found with ID:', context.playlistId);
            console.log('❌ Checked localStorage and collaborative playlists');
          }
        }
        // Clear the context from localStorage after using it
        localStorage.removeItem('youtube_edit_context');
      } catch (error) {
        console.error('Error parsing edit context:', error);
        localStorage.removeItem('youtube_edit_context');
      }
    } else {
      console.log('🔍 No edit context found in localStorage');
    }
  }, [activeCollaborations]);

  const handlePlaylistUpdated = (updatedPlaylist: YouTubePlaylist) => {
    console.log('🎬 Playlist updated:', updatedPlaylist.name);
    // Clear editing state after successful update
    setEditingPlaylist(null);
    setEditContext(null);
    setSpecificClipToEdit(null);
  };

  // Function to handle playlist generation results
  const handlePowerHourGenerated = (result: PowerHourGenerationResult) => {
    console.log('✅ Power Hour playlist generated successfully:', result);
    // Switch to search tab to show the generated playlist
    setCurrentTab(0);
  };

  // Function to handle generator cancellation
  const handleGeneratorCancel = () => {
    console.log('🚫 Power Hour generation cancelled');
  };



  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <YouTubeIcon sx={{ mr: 2, fontSize: 32, color: '#FF0000' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              YouTube Power Hour
            </Typography>
          </Box>

          {/* Status indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<SpeedIcon />}
              label="yt-dlp Enabled"
              size="small"
              color="success"
              variant="outlined"
            />
            {editingPlaylist && (
              <Chip
                label={`Editing: ${editingPlaylist.name}`}
                size="small"
                color="primary"
                variant="filled"
              />
            )}
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Create Power Hour playlists using YouTube videos. Search manually or generate intelligent playlists with AI-powered artist discovery.
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                minHeight: 56,
                color: alpha(theme.palette.text.primary, 0.7),
                '&:hover': {
                  color: currentTheme.primary,
                  backgroundColor: alpha(currentTheme.primary, 0.04),
                },
              },
              '& .Mui-selected': {
                color: currentTheme.primary,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: currentTheme.primary,
                height: 3,
                borderRadius: '3px 3px 0 0',
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
              label="Enhanced Random Playlist"
              sx={{ px: 3 }}
            />
          </Tabs>

          {/* Generator toggle for Random Playlist tab */}
          {currentTab === 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Enhanced Mode
              </Typography>
              <Tooltip title={useEnhancedGenerator ? "Switch to Basic Generator" : "Switch to Enhanced Generator"}>
                <IconButton
                  size="small"
                  onClick={() => setUseEnhancedGenerator(!useEnhancedGenerator)}
                  sx={{ color: useEnhancedGenerator ? currentTheme.primary : 'text.secondary' }}
                >
                  {useEnhancedGenerator ? <ToggleOnIcon /> : <ToggleOffIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
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
          <Box sx={{ p: 3 }}>
            {(() => {
              console.log('🔍 Rendering YouTubeSearch with props:');
              console.log('editingPlaylist:', editingPlaylist);
              console.log('specificClipToEdit:', specificClipToEdit);
              return null;
            })()}
            <YouTubeSearch
              editingPlaylist={editingPlaylist}
              onPlaylistUpdated={handlePlaylistUpdated}
              specificClipToEdit={specificClipToEdit}
              onSpecificClipEditComplete={() => setSpecificClipToEdit(null)}
              onEditingPlaylistChanged={setEditingPlaylist}
            />
          </Box>
        )}

        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <EnhancedPowerHourGenerator
              onPlaylistGenerated={handlePowerHourGenerated}
              onCancel={handleGeneratorCancel}
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default YouTube;
