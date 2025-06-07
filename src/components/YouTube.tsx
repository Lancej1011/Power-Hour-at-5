import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  useTheme,
} from '@mui/material';
import {
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { YouTubePlaylist } from '../utils/youtubeUtils';
import YouTubeSearch from './YouTubeSearch';

const YouTube: React.FC = () => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // State for edit context and playlist editing
  const [editContext, setEditContext] = useState<{playlistId: string; clipIndex: number} | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<YouTubePlaylist | null>(null);
  const [specificClipToEdit, setSpecificClipToEdit] = useState<{clip: any; index: number} | null>(null);

  // Check for edit context on component mount
  React.useEffect(() => {
    const editContextStr = localStorage.getItem('youtube_edit_context');
    if (editContextStr) {
      try {
        const context = JSON.parse(editContextStr);
        // Load playlist for editing
        if (context.playlistId) {
          setEditContext(context);

          // Load the playlist for editing
          const playlists = JSON.parse(localStorage.getItem('youtube_playlists') || '[]');
          const playlistToEdit = playlists.find((p: YouTubePlaylist) => p.id === context.playlistId);
          if (playlistToEdit) {
            setEditingPlaylist(playlistToEdit);
            console.log('🎬 Loading playlist for editing:', playlistToEdit.name);

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
          }
        }
        // Clear the context from localStorage after using it
        localStorage.removeItem('youtube_edit_context');
      } catch (error) {
        console.error('Error parsing edit context:', error);
        localStorage.removeItem('youtube_edit_context');
      }
    }
  }, []);

  const handlePlaylistUpdated = (updatedPlaylist: YouTubePlaylist) => {
    console.log('🎬 Playlist updated:', updatedPlaylist.name);
    // Clear editing state after successful update
    setEditingPlaylist(null);
    setEditContext(null);
    setSpecificClipToEdit(null);
  };



  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <YouTubeIcon sx={{ mr: 2, fontSize: 32, color: '#FF0000' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            YouTube Power Hour
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Create Power Hour playlists using YouTube videos. Search for songs, set clip times, and build your perfect party mix!
        </Typography>
      </Box>

      <Paper
        elevation={3}
        sx={{
          background: `linear-gradient(135deg, ${currentTheme.primary}15 0%, ${currentTheme.secondary}15 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 3 }}>
          <YouTubeSearch
            editingPlaylist={editingPlaylist}
            onPlaylistUpdated={handlePlaylistUpdated}
            specificClipToEdit={specificClipToEdit}
            onSpecificClipEditComplete={() => setSpecificClipToEdit(null)}
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default YouTube;
