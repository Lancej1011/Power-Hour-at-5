/**
 * Collaborative Playlist Dialog
 * Dialog for creating and managing collaborative playlists
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Group as GroupIcon,
  Share as ShareIcon,
  Lock as LockIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { CollaborationPermission } from '../../types/collaboration';

interface CollaborativePlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    description?: string;
    type?: 'regular' | 'youtube';
  };
}

const CollaborativePlaylistDialog: React.FC<CollaborativePlaylistDialogProps> = ({
  open,
  onClose,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'regular' as 'regular' | 'youtube',
    defaultPermission: 'editor' as CollaborationPermission,
    isPublic: false
  });

  const {
    createCollaborativePlaylist,
    isLoading,
    lastError,
    clearError
  } = useCollaborationStore();

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }

    try {
      const playlistId = await createCollaborativePlaylist({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        defaultPermission: formData.defaultPermission,
        isPublic: formData.isPublic,
        initialClips: []
      });

      if (playlistId) {
        onClose();
        // Reset form
        setFormData({
          name: '',
          description: '',
          type: 'regular',
          defaultPermission: 'editor',
          isPublic: false
        });
      }
    } catch (error) {
      console.error('Error creating collaborative playlist:', error);
    }
  };

  const handleClose = () => {
    clearError();
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
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        color: 'white',
        fontWeight: 'bold'
      }}>
        <GroupIcon />
        Create Collaborative Playlist
      </DialogTitle>

      <DialogContent sx={{ color: 'white' }}>
        {lastError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            {lastError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Playlist Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
            required
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />

          <TextField
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />

          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Playlist Type
            </InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value as 'regular' | 'youtube' 
              }))}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white'
                }
              }}
            >
              <MenuItem value="regular">Regular (Audio Files)</MenuItem>
              <MenuItem value="youtube">YouTube</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Default Permission
            </InputLabel>
            <Select
              value={formData.defaultPermission}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                defaultPermission: e.target.value as CollaborationPermission 
              }))}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white'
                }
              }}
            >
              <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
              <MenuItem value="editor">Editor (Can Edit)</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {formData.isPublic ? <PublicIcon /> : <LockIcon />}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isPublic: e.target.checked 
                  }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'white'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formData.isPublic ? 'Public Playlist' : 'Private Playlist'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {formData.isPublic 
                      ? 'Anyone with the invite code can join'
                      : 'Only invited users can join'
                    }
                  </Typography>
                </Box>
              }
              sx={{ color: 'white', alignItems: 'flex-start' }}
            />
          </Box>

          <Box sx={{ 
            p: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: 1,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
              <ShareIcon sx={{ fontSize: 16, mr: 1 }} />
              Collaboration Features:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label="Real-time editing" 
                size="small" 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
              <Chip 
                label="Live cursors" 
                size="small" 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
              <Chip 
                label="Conflict resolution" 
                size="small" 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
              <Chip 
                label="Version history" 
                size="small" 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name.trim() || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <GroupIcon />}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            },
            '&:disabled': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.5)'
            }
          }}
        >
          {isLoading ? 'Creating...' : 'Create Collaborative Playlist'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CollaborativePlaylistDialog;
