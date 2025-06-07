import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ImageIcon from '@mui/icons-material/Image';
import SpeedIcon from '@mui/icons-material/Speed';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  duration?: number;
  bpm?: number;
  albumArt?: string;
  tags?: string[];
}

interface MetadataEnhancement {
  type: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'albumArt' | 'bpm' | 'duration';
  label: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

interface MetadataEnhancerProps {
  open: boolean;
  onClose: () => void;
  songs: LibrarySong[];
  onEnhanceMetadata: (songs: LibrarySong[], enhancements: string[]) => Promise<void>;
}

const MetadataEnhancer: React.FC<MetadataEnhancerProps> = ({
  open,
  onClose,
  songs,
  onEnhanceMetadata,
}) => {
  const [enhancing, setEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSong, setCurrentSong] = useState<string>('');
  const [results, setResults] = useState<{ success: number; failed: number; skipped: number }>({
    success: 0,
    failed: 0,
    skipped: 0,
  });
  const [enhancements, setEnhancements] = useState<MetadataEnhancement[]>([
    {
      type: 'title',
      label: 'Song Titles',
      icon: <MusicNoteIcon />,
      description: 'Clean up and standardize song titles',
      enabled: true,
    },
    {
      type: 'artist',
      label: 'Artist Names',
      icon: <PersonIcon />,
      description: 'Fetch missing artist information',
      enabled: true,
    },
    {
      type: 'album',
      label: 'Album Names',
      icon: <AlbumIcon />,
      description: 'Identify and add album information',
      enabled: true,
    },
    {
      type: 'genre',
      label: 'Music Genres',
      icon: <MusicNoteIcon />,
      description: 'Automatically categorize music by genre',
      enabled: true,
    },
    {
      type: 'year',
      label: 'Release Years',
      icon: <DateRangeIcon />,
      description: 'Find release dates for songs',
      enabled: true,
    },
    {
      type: 'albumArt',
      label: 'Album Artwork',
      icon: <ImageIcon />,
      description: 'Download high-quality album covers',
      enabled: false, // Disabled by default due to storage
    },
    {
      type: 'bpm',
      label: 'BPM Detection',
      icon: <SpeedIcon />,
      description: 'Analyze tempo for better mixing',
      enabled: false, // Computationally intensive
    },
    {
      type: 'duration',
      label: 'Accurate Duration',
      icon: <VolumeUpIcon />,
      description: 'Get precise song durations',
      enabled: true,
    },
  ]);

  const toggleEnhancement = (type: string) => {
    setEnhancements(prev =>
      prev.map(enhancement =>
        enhancement.type === type
          ? { ...enhancement, enabled: !enhancement.enabled }
          : enhancement
      )
    );
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, skipped: 0 });

    const enabledEnhancements = enhancements
      .filter(e => e.enabled)
      .map(e => e.type);

    try {
      // Simulate enhancement process
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        setCurrentSong(song.title || song.name);
        setProgress((i / songs.length) * 100);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
          setResults(prev => ({ ...prev, success: prev.success + 1 }));
        } else {
          setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      await onEnhanceMetadata(songs, enabledEnhancements);
      setProgress(100);
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setEnhancing(false);
      setCurrentSong('');
    }
  };

  const getMissingMetadataCount = () => {
    return songs.reduce((count, song) => {
      let missing = 0;
      if (!song.title && !song.name) missing++;
      if (!song.artist) missing++;
      if (!song.album) missing++;
      if (!song.genre) missing++;
      if (!song.year) missing++;
      return count + missing;
    }, 0);
  };

  const getEstimatedTime = () => {
    const enabledCount = enhancements.filter(e => e.enabled).length;
    const estimatedSeconds = songs.length * enabledCount * 0.5; // 0.5 seconds per enhancement per song
    return Math.ceil(estimatedSeconds / 60); // Convert to minutes
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MusicNoteIcon />
          Enhance Metadata
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Automatically enhance your music library with missing metadata. This process will analyze
          your songs and fetch information from online databases.
        </Typography>

        {/* Statistics */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Library Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`${songs.length} songs`} variant="outlined" />
            <Chip
              label={`${getMissingMetadataCount()} missing fields`}
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`~${getEstimatedTime()} min estimated`}
              color="info"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Enhancement Options */}
        <Typography variant="h6" gutterBottom>
          Enhancement Options
        </Typography>
        <List>
          {enhancements.map((enhancement) => (
            <ListItem key={enhancement.type} sx={{ px: 0 }}>
              <ListItemIcon>
                {enhancement.icon}
              </ListItemIcon>
              <ListItemText
                primary={enhancement.label}
                secondary={enhancement.description}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={enhancement.enabled}
                    onChange={() => toggleEnhancement(enhancement.type)}
                  />
                }
                label=""
              />
            </ListItem>
          ))}
        </List>

        {/* Progress */}
        {enhancing && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Processing: {currentSong}
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">
                  {Math.round(progress)}% complete
                </Typography>
                <Typography variant="caption">
                  {results.success + results.failed} / {songs.length} processed
                </Typography>
              </Box>
            </Box>

            {/* Results */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${results.success} enhanced`}
                color="success"
                size="small"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${results.failed} failed`}
                color="error"
                size="small"
              />
            </Box>
          </>
        )}

        {/* Warning */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'warning.main', borderRadius: 1, color: 'warning.contrastText' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            ⚠️ Important Notes:
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • This process requires an internet connection
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • Large libraries may take significant time to process
          </Typography>
          <Typography variant="body2">
            • Original files will not be modified, only the app's database
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={enhancing}>
          Cancel
        </Button>
        <Button
          onClick={handleEnhance}
          variant="contained"
          disabled={enhancing || enhancements.filter(e => e.enabled).length === 0}
        >
          {enhancing ? 'Enhancing...' : 'Start Enhancement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MetadataEnhancer;
