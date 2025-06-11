/**
 * Clip Edit Dialog Component
 * Individual clip editing interface for playlist review
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import { ClipEditDialogProps } from '../types/powerHour';

const ClipEditDialog: React.FC<ClipEditDialogProps> = ({
  open,
  clip,
  clipIndex,
  onClose,
  onSave,
  onRegenerate,
}) => {
  // State
  const [editedClip, setEditedClip] = useState(clip);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationOptions, setRegenerationOptions] = useState<any[]>([]);
  const [customArtist, setCustomArtist] = useState(clip?.artist || '');
  const [customSongTitle, setCustomSongTitle] = useState(clip?.song?.title || '');

  // Update edited clip when prop changes
  useEffect(() => {
    setEditedClip(clip);
    setCustomArtist(clip?.artist || '');
    setCustomSongTitle(clip?.song?.title || '');
  }, [clip]);

  // Handlers
  const handleSave = () => {
    const updatedClip = {
      ...editedClip,
      artist: customArtist,
      song: {
        ...editedClip.song,
        title: customSongTitle,
      },
    };
    onSave(updatedClip);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setRegenerationOptions([]);
    
    try {
      // Use custom artist if provided, otherwise use original
      const artistToUse = customArtist.trim() || clip.artist;
      const newClip = await onRegenerate(clipIndex, artistToUse);
      
      if (newClip) {
        setEditedClip(newClip);
        // Could also show multiple options here if the regeneration service returns them
        setRegenerationOptions([newClip]);
      }
    } catch (error) {
      console.error('Error regenerating clip:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSelectRegeneratedOption = (option: any) => {
    setEditedClip(option);
    setCustomArtist(option.artist);
    setCustomSongTitle(option.song.title);
    setRegenerationOptions([]);
  };

  const getVideoId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : 'dQw4w9WgXcQ';
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.7) return 'success';
    if (similarity >= 0.4) return 'warning';
    return 'error';
  };

  if (!clip) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          Edit Clip #{clipIndex + 1}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Current Clip Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={`https://img.youtube.com/vi/${getVideoId(editedClip.song?.url || '')}/mqdefault.jpg`}
                alt={editedClip.song?.title}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Clip
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {editedClip.song?.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  by {editedClip.artist}
                </Typography>
                
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    size="small"
                    label={`${Math.round(editedClip.artistSimilarity * 100)}% match`}
                    color={getSimilarityColor(editedClip.artistSimilarity)}
                  />
                  <Chip
                    size="small"
                    label={editedClip.selectionMethod}
                    variant="outlined"
                    color={editedClip.selectionMethod === 'cached' ? 'success' : 
                           editedClip.selectionMethod === 'fallback' ? 'warning' : 'default'}
                  />
                  <Chip
                    size="small"
                    label={`${editedClip.clipDuration}s`}
                    variant="outlined"
                  />
                </Stack>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Tooltip title="Preview on YouTube">
                    <IconButton
                      size="small"
                      onClick={() => {
                        window.open(editedClip.song?.url, '_blank');
                      }}
                    >
                      <YouTubeIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Play Preview">
                    <IconButton
                      size="small"
                      onClick={() => {
                        // TODO: Implement preview functionality
                        console.log('Preview clip:', editedClip);
                      }}
                    >
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Edit Controls */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Edit Clip Details
              </Typography>
              
              <TextField
                fullWidth
                label="Artist Name"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Song Title"
                value={customSongTitle}
                onChange={(e) => setCustomSongTitle(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Regeneration Options
              </Typography>
              
              <Button
                variant="outlined"
                startIcon={isRegenerating ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRegenerate}
                disabled={isRegenerating}
                fullWidth
                sx={{ mb: 2 }}
              >
                {isRegenerating ? 'Finding New Song...' : 'Find Different Song'}
              </Button>

              {customArtist !== clip.artist && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Artist changed to "{customArtist}". Click "Find Different Song" to search for songs by this artist.
                </Alert>
              )}
            </Box>

            {/* Regeneration Options */}
            {regenerationOptions.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Alternative Options
                </Typography>
                {regenerationOptions.map((option, index) => (
                  <Card 
                    key={index} 
                    sx={{ 
                      mb: 1, 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    onClick={() => handleSelectRegeneratedOption(option)}
                  >
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {option.song?.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {option.artist} • {Math.round(option.artistSimilarity * 100)}% match
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!customArtist.trim() || !customSongTitle.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClipEditDialog;
