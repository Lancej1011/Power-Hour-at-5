import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { firebasePlaylistService } from '../services/firebasePlaylistService';

interface PlaylistEditDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: SharedPlaylist | null;
  onSuccess?: (updatedPlaylist: SharedPlaylist) => void;
}

const PlaylistEditDialog: React.FC<PlaylistEditDialogProps> = ({
  open,
  onClose,
  playlist,
  onSuccess,
}) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Initialize form when playlist changes
  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setIsPublic(playlist.isPublic);
      setTags(playlist.tags || []);
      setNewTag('');
      setError('');
      setSuccess(false);
    }
  }, [playlist]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setError('');
      setSuccess(false);
      setIsUpdating(false);
    }
  }, [open]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  const handleUpdate = async () => {
    if (!playlist) return;

    setIsUpdating(true);
    setError('');

    try {
      // Validate inputs
      if (!name.trim()) {
        setError('Playlist name is required');
        setIsUpdating(false);
        return;
      }

      if (isPublic && !description.trim()) {
        setError('Description is required for public playlists');
        setIsUpdating(false);
        return;
      }

      if (isPublic && tags.length === 0) {
        setError('At least one tag is required for public playlists');
        setIsUpdating(false);
        return;
      }

      // Prepare updates
      const updates: Partial<SharedPlaylist> = {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        tags,
      };

      // Update playlist in Firebase
      const success = await firebasePlaylistService.updatePlaylist(playlist.id, updates);

      if (success) {
        setSuccess(true);
        
        // Create updated playlist object for callback
        const updatedPlaylist: SharedPlaylist = {
          ...playlist,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        if (onSuccess) {
          onSuccess(updatedPlaylist);
        }

        // Close dialog after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('Failed to update playlist. Please try again.');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      setError('An error occurred while updating the playlist.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!playlist) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Edit Playlist
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Playlist updated successfully!
          </Alert>
        )}

        {/* Playlist Name */}
        <TextField
          fullWidth
          label="Playlist Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          required
          disabled={isUpdating}
        />

        {/* Visibility Toggle */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isUpdating}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {isPublic ? 'Public Playlist' : 'Private Playlist'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isPublic 
                    ? 'Visible to all users in the community'
                    : 'Only visible to you'
                  }
                </Typography>
              </Box>
            }
          />
        </Box>

        {/* Description (required for public playlists) */}
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={3}
          required={isPublic}
          disabled={isUpdating}
          helperText={isPublic ? 'Required for public playlists' : 'Optional'}
        />

        {/* Tags (required for public playlists) */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tags {isPublic && <span style={{ color: theme.palette.error.main }}>*</span>}
          </Typography>
          
          {/* Tag Input */}
          <TextField
            fullWidth
            size="small"
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isUpdating}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || isUpdating}
                    size="small"
                  >
                    <AddIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Current Tags */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                deleteIcon={<DeleteIcon />}
                size="small"
                disabled={isUpdating}
              />
            ))}
          </Box>

          {isPublic && tags.length === 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              At least one tag is required for public playlists
            </Typography>
          )}
        </Box>

        {/* Share Code (read-only) */}
        <TextField
          fullWidth
          label="Share Code"
          value={playlist.shareCode}
          margin="normal"
          InputProps={{
            readOnly: true,
          }}
          helperText="Share code cannot be changed"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={isUpdating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={isUpdating || !name.trim()}
          startIcon={isUpdating ? <CircularProgress size={16} /> : null}
        >
          {isUpdating ? 'Updating...' : 'Update Playlist'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistEditDialog;
