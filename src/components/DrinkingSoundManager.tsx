import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
} from '@mui/material';
import {
  LocalBar as LocalBarIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Casino as CasinoIcon,
} from '@mui/icons-material';
import { Howl } from 'howler';
import { useTheme } from '@mui/material/styles';

interface DrinkingSound {
  id: string;
  name: string;
  file: File;
  path?: string; // For saved sounds
}

interface DrinkingSoundManagerProps {
  open: boolean;
  onClose: () => void;
  onSoundSelected: (soundPath: string) => void;
  currentSoundPath?: string;
  title?: string;
}

const DrinkingSoundManager: React.FC<DrinkingSoundManagerProps> = ({
  open,
  onClose,
  onSoundSelected,
  currentSoundPath,
  title = "Manage Drinking Sounds"
}) => {
  const theme = useTheme();
  const [drinkingSounds, setDrinkingSounds] = useState<DrinkingSound[]>([]);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<string | null>(currentSoundPath || null);
  const previewHowlRef = useRef<Howl | null>(null);

  // Add drinking sounds
  const handleAddSounds = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newSounds = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, ""),
        file: file,
      }));
      setDrinkingSounds(prev => [...prev, ...newSounds]);
    }
  };

  // Remove a drinking sound
  const removeDrinkingSound = (id: string) => {
    setDrinkingSounds(prev => prev.filter(sound => sound.id !== id));
    if (previewingSound === id) {
      stopPreview();
    }
  };

  // Preview a drinking sound
  const previewSound = (sound: DrinkingSound) => {
    stopPreview();

    const howl = new Howl({
      src: [URL.createObjectURL(sound.file)],
      html5: true,
      volume: 0.7,
      onend: () => {
        setPreviewingSound(null);
        previewHowlRef.current = null;
      },
      onloaderror: (id, error) => {
        console.error('Error loading drinking sound preview:', error);
        setPreviewingSound(null);
        previewHowlRef.current = null;
      }
    });

    previewHowlRef.current = howl;
    setPreviewingSound(sound.id);
    howl.play();
  };

  // Stop preview
  const stopPreview = () => {
    if (previewHowlRef.current) {
      previewHowlRef.current.stop();
      previewHowlRef.current = null;
    }
    setPreviewingSound(null);
  };

  // Select random sound
  const selectRandomSound = () => {
    if (drinkingSounds.length === 0) return;
    const randomIndex = Math.floor(Math.random() * drinkingSounds.length);
    const randomSound = drinkingSounds[randomIndex];
    setSelectedSound(randomSound.id);
  };

  // State for confirmation dialog
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Clear all sounds with confirmation
  const clearAllSounds = () => {
    setClearAllDialogOpen(true);
  };

  // Confirm clear all sounds
  const confirmClearAllSounds = () => {
    stopPreview();
    setDrinkingSounds([]);
    setSelectedSound(null);
    setClearAllDialogOpen(false);
  };

  // Handle save and close
  const handleSave = async () => {
    if (!selectedSound) {
      onClose();
      return;
    }

    const sound = drinkingSounds.find(s => s.id === selectedSound);
    if (!sound) {
      onClose();
      return;
    }

    try {
      // Save the file and get the path
      if (window.electronAPI) {
        // Convert File to ArrayBuffer for Electron
        const arrayBuffer = await sound.file.arrayBuffer();
        const result = await window.electronAPI.saveDrinkingSound(arrayBuffer);
        if (result && result.success && result.path) {
          onSoundSelected(result.path);
        }
      } else {
        // For web, create a blob URL (temporary solution)
        const blobUrl = URL.createObjectURL(sound.file);
        onSoundSelected(blobUrl);
      }
    } catch (error) {
      console.error('Error saving drinking sound:', error);
    }

    onClose();
  };

  // Handle close
  const handleClose = () => {
    stopPreview();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: 400,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocalBarIcon />
        {title}
      </DialogTitle>

      <DialogContent>
        {/* Add Sounds Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Drinking Sounds ({drinkingSounds.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAddSounds}
                style={{ display: 'none' }}
                id="drinking-sounds-input"
              />
              <label htmlFor="drinking-sounds-input">
                <IconButton component="span" color="primary" title="Add drinking sounds">
                  <AddIcon />
                </IconButton>
              </label>
              {drinkingSounds.length > 1 && (
                <IconButton onClick={selectRandomSound} color="secondary" title="Select random sound">
                  <CasinoIcon />
                </IconButton>
              )}
              {drinkingSounds.length > 0 && (
                <IconButton onClick={clearAllSounds} color="error" title="Clear all sounds">
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {drinkingSounds.length === 0 ? (
            <Alert severity="info" sx={{ textAlign: 'center' }}>
              No drinking sounds added yet. Click the + button to add some!
            </Alert>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {drinkingSounds.map((sound, index) => (
                <React.Fragment key={sound.id}>
                  <ListItem
                    sx={{
                      bgcolor: selectedSound === sound.id ? 'primary.main' : 'transparent',
                      color: selectedSound === sound.id ? 'white' : 'inherit',
                      borderRadius: 1,
                      mb: 0.5,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedSound(sound.id)}
                  >
                    <ListItemText
                      primary={`${index + 1}. ${sound.name}`}
                      secondary={selectedSound === sound.id ? 'Selected' : ''}
                      secondaryTypographyProps={{
                        color: selectedSound === sound.id ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          previewingSound === sound.id ? stopPreview() : previewSound(sound);
                        }}
                        color={selectedSound === sound.id ? 'inherit' : 'default'}
                        title={previewingSound === sound.id ? "Stop preview" : "Preview sound"}
                      >
                        {previewingSound === sound.id ? <StopIcon /> : <PlayArrowIcon />}
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDrinkingSound(sound.id);
                        }}
                        color="error"
                        title="Remove sound"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < drinkingSounds.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {currentSoundPath && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Current drinking sound: {currentSoundPath.split('/').pop() || 'Custom sound'}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!selectedSound}
        >
          {selectedSound ? 'Save Selection' : 'Remove Drinking Sound'}
        </Button>
      </DialogActions>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
          color: 'white',
          borderRadius: '12px 12px 0 0',
          mb: 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ClearIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold">
              Clear All Drinking Sounds
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              You are about to permanently delete all {drinkingSounds.length} drinking sounds from this session.
            </Typography>
          </Alert>

          <Typography variant="body1" color="text.secondary">
            Are you sure you want to clear all drinking sounds?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setClearAllDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: `${theme.palette.primary.main}10`,
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmClearAllSounds}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold',
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
              }
            }}
          >
            Clear All ({drinkingSounds.length} sounds)
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DrinkingSoundManager;
