import React, { useRef, useState } from 'react';
import { Box, Typography, Paper, Button, Divider, useTheme } from '@mui/material';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import { SongUploader } from '../components/SongUploader';
import PowerHourGenerator from '../components/PowerHourGenerator';
import UnifiedMediaBar from '../components/UnifiedMediaBar';
import { useAudio } from '../contexts/AudioContext';

const PowerHourV2Page: React.FC = () => {
  const audio = useAudio();
  const theme = useTheme();
  const [clips, setClips] = useState<any[]>([]);
  const [playlistReady, setPlaylistReady] = useState<boolean>(false);
  const [playlistName, setPlaylistName] = useState<string>('Power Hour V2 Playlist');
  const [showPlayer, setShowPlayer] = useState<boolean>(false);

  // Ref to SongUploader sidebar methods if needed for future extensions
  // e.g., const sidebarRef = useRef();

  // Handler for "Play Power Hour" button
  const handlePlayPowerHour = () => {
    if (clips && clips.length > 0) {
      // Prepare a minimal playlist object for UnifiedMediaBar
      const playlist = {
        id: `phv2_${Date.now()}`,
        name: playlistName,
        date: new Date().toISOString(),
        clips,
      };
      audio.playPlaylist(playlist);
      setShowPlayer(true);
    }
  };

  // Handler for when clips are extracted (from SongUploader)
  const handleExtractedClipsChange = (newClips: any[]) => {
    setClips(newClips);
    setPlaylistReady(newClips.length > 0);
  };

  // Handler for when PowerHourGenerator generates a playlist (YouTube mode)
  const handlePlaylistGenerated = (result: any) => {
    // For now, just extract the clips and playlist name
    if (result && result.tracks) {
      setClips(result.tracks.map((track: any, idx: number) => ({
        id: track.id || `clip${idx}`,
        name: track.song?.title || track.name || `Clip ${idx + 1}`,
        artist: track.artist,
        start: track.startTime || 0,
        duration: track.clipDuration || 60,
        songName: track.song?.title || track.name,
        // These fields can be expanded depending on your generator result
      })));
      setPlaylistName(result.playlistName || 'Power Hour V2 Playlist');
      setPlaylistReady(true);
    }
  };

  // Handler for when the user wants to start over
  const handleReset = () => {
    setClips([]);
    setPlaylistReady(false);
    setShowPlayer(false);
  };

  // Compose extracted clips sidebar (as a section, not a Drawer)
  const renderExtractedClipsSidebar = () => (
    <Paper elevation={3} sx={{
      mt: 2,
      mb: 2,
      p: 2,
      borderRadius: 2,
      bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.100',
      boxShadow: 2,
      width: '100%',
      maxWidth: 520,
      mx: 'auto'
    }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
        Extracted Clips ({clips.length})
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {clips.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No clips have been extracted yet. Use the uploader above to add songs and extract clips.
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {clips.map((clip, idx) => (
            <Box key={clip.id || idx} sx={{
              mb: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: idx % 2 === 0 ? 'background.default' : 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {clip.songName || clip.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {clip.artist || 'Unknown Artist'} &bull; {clip.duration ? `${Math.round(clip.duration)}s` : ''}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 900,
      mx: 'auto',
      py: 4,
      px: { xs: 1, sm: 2, md: 3 },
      minHeight: '100vh'
    }}>
      {/* Hero Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <LocalBarIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Power Hour V2
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          All-in-one Power Hour: Upload &rarr; Clip &rarr; Playlist &rarr; Play!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Experience a seamless end-to-end Power Hour builder. Upload your songs (or use YouTube), extract the best clips, build your playlist, and play—all on one page.
        </Typography>
      </Box>

      {/* SongUploader (hide library controls) */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <SongUploader
          playMix={audio.playMix}
          hideLibraryControls={true}
        />
      </Paper>

      {/* Extracted Clips Sidebar (always visible, not a Drawer) */}
      {renderExtractedClipsSidebar()}

      {/* PowerHourGenerator (YouTube Mode) */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <PowerHourGenerator
          onPlaylistGenerated={handlePlaylistGenerated}
          initialConfig={{
            searchType: 'artist',
            generationMode: 'variety',
            targetClipCount: 60,
            clipDuration: 60,
          }}
        />
      </Box>

      {/* Play Power Hour Button */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={!playlistReady || clips.length === 0}
          onClick={handlePlayPowerHour}
          sx={{
            px: 5,
            py: 2,
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: 3,
            boxShadow: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              boxShadow: 4
            }
          }}
        >
          Play Power Hour
        </Button>
        {playlistReady && (
          <Button
            onClick={handleReset}
            variant="text"
            color="secondary"
            sx={{ ml: 2, fontSize: '1rem', fontWeight: 500 }}
          >
            Reset
          </Button>
        )}
      </Box>

      {/* UnifiedMediaBar is shown globally via provider; we don't need to manually render it here */}
    </Box>
  );
};

export default PowerHourV2Page;