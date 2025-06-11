import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import {
  LocalBar as LocalBarIcon,
  YouTube as YouTubeIcon,
  AudioFile as AudioFileIcon,
} from '@mui/icons-material';
import { DrinkingClipData, addDrinkingClipToLibrary } from '../utils/playlistImport';

interface DrinkingClipImportDialogProps {
  open: boolean;
  onClose: () => void;
  drinkingClip: DrinkingClipData;
  playlistName: string;
}

const DrinkingClipImportDialog: React.FC<DrinkingClipImportDialogProps> = ({
  open,
  onClose,
  drinkingClip,
  playlistName,
}) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddToLibrary = async () => {
    setIsAdding(true);
    setError(null);

    try {
      const success = addDrinkingClipToLibrary(drinkingClip);
      if (success) {
        setAdded(true);
      } else {
        setError('Failed to add drinking clip to library');
      }
    } catch (err) {
      setError('An error occurred while adding the drinking clip');
      console.error('Error adding drinking clip:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setAdded(false);
    setError(null);
    onClose();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStartTime = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: 'white',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        pb: 2,
      }}>
        <LocalBarIcon sx={{ fontSize: 32, color: '#ffd700' }} />
        <Box>
          <Typography variant="h6" component="div">
            Drinking Clip Found!
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            This playlist includes a drinking clip
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {added ? (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2,
              '& .MuiAlert-icon': { color: '#4caf50' },
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              color: 'white',
              border: '1px solid rgba(76, 175, 80, 0.3)',
            }}
          >
            Drinking clip successfully added to your library!
          </Alert>
        ) : error ? (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              '& .MuiAlert-icon': { color: '#f44336' },
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              color: 'white',
              border: '1px solid rgba(244, 67, 54, 0.3)',
            }}
          >
            {error}
          </Alert>
        ) : null}

        <Typography variant="body1" sx={{ mb: 3 }}>
          The playlist "<strong>{playlistName}</strong>" includes a drinking clip. 
          Would you like to add it to your drinking clips library?
        </Typography>

        <Box sx={{ 
          p: 2, 
          borderRadius: 1, 
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {drinkingClip.type === 'youtube' ? (
              <YouTubeIcon sx={{ color: '#ff0000' }} />
            ) : (
              <AudioFileIcon sx={{ color: '#ffd700' }} />
            )}
            <Typography variant="h6" component="div">
              {drinkingClip.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={drinkingClip.type === 'youtube' ? 'YouTube Clip' : 'Audio File'}
              size="small"
              sx={{
                backgroundColor: drinkingClip.type === 'youtube' ? 'rgba(255,0,0,0.2)' : 'rgba(255,215,0,0.2)',
                color: 'white',
                border: `1px solid ${drinkingClip.type === 'youtube' ? 'rgba(255,0,0,0.3)' : 'rgba(255,215,0,0.3)'}`,
              }}
            />
            
            {drinkingClip.duration && (
              <Chip
                label={`Duration: ${formatDuration(drinkingClip.duration)}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            )}

            {drinkingClip.type === 'youtube' && drinkingClip.startTime !== undefined && (
              <Chip
                label={`Start: ${formatStartTime(drinkingClip.startTime)}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        p: 3,
        gap: 2,
      }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.3)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        >
          {added ? 'Done' : 'Skip'}
        </Button>
        
        {!added && (
          <Button
            onClick={handleAddToLibrary}
            variant="contained"
            disabled={isAdding}
            sx={{
              backgroundColor: '#ffd700',
              color: '#1e3c72',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#ffed4e',
              },
              '&:disabled': {
                backgroundColor: 'rgba(255,215,0,0.3)',
                color: 'rgba(30,60,114,0.5)',
              },
            }}
          >
            {isAdding ? 'Adding...' : 'Add to Library'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DrinkingClipImportDialog;
