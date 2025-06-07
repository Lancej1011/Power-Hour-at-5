import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
} from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TuneIcon from '@mui/icons-material/Tune';
import LibraryPersistenceManager from '../utils/libraryPersistence';
import MetadataEnhancer from './MetadataEnhancer';

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

interface LibraryManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectLibrary: (libraryPath: string) => void;
  onAddNewLibrary: () => void;
  currentLibraryPath?: string;
  songs?: LibrarySong[];
  onEnhanceMetadata?: (songs: LibrarySong[], enhancements: string[]) => Promise<void>;
}

const LibraryManager: React.FC<LibraryManagerProps> = ({
  open,
  onClose,
  onSelectLibrary,
  onAddNewLibrary,
  currentLibraryPath,
  songs = [],
  onEnhanceMetadata,
}) => {
  const [libraries, setLibraries] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [editingLibrary, setEditingLibrary] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [metadataEnhancerOpen, setMetadataEnhancerOpen] = useState(false);
  const persistenceManager = LibraryPersistenceManager.getInstance();

  useEffect(() => {
    if (open) {
      loadLibraries();
      loadSettings();
    }
  }, [open]);

  const loadLibraries = () => {
    const allLibraries = persistenceManager.getAllLibraries();
    setLibraries(allLibraries);
  };

  const loadSettings = () => {
    const currentSettings = persistenceManager.getSettings();
    setSettings(currentSettings);
  };

  const handleSelectLibrary = (libraryPath: string) => {
    onSelectLibrary(libraryPath);
    onClose();
  };

  const handleDeleteLibrary = (libraryPath: string) => {
    if (window.confirm('Are you sure you want to remove this library from cache? This will not delete your music files.')) {
      persistenceManager.removeLibrary(libraryPath);
      loadLibraries();
    }
  };

  const handleRefreshLibrary = (libraryPath: string) => {
    // This would trigger a refresh of the specific library
    onSelectLibrary(libraryPath);
    onClose();
  };

  const handleEditLibrary = (library: any) => {
    setEditingLibrary(library.id);
    setEditName(library.name);
  };

  const handleSaveEdit = () => {
    if (editingLibrary && editName.trim()) {
      const library = libraries.find(lib => lib.id === editingLibrary);
      if (library) {
        persistenceManager.updateLibraryMetadata(library.path, { name: editName.trim() });
        loadLibraries();
      }
    }
    setEditingLibrary(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingLibrary(null);
    setEditName('');
  };

  const handleSettingsChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    persistenceManager.updateSettings(newSettings);
  };

  const handleEnhanceMetadata = () => {
    if (onEnhanceMetadata && songs.length > 0) {
      setMetadataEnhancerOpen(true);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getCacheStats = () => {
    return persistenceManager.getCacheStats();
  };

  const cacheStats = getCacheStats();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LibraryMusicIcon />
          Library Manager
          <IconButton
            size="small"
            onClick={() => setShowSettings(!showSettings)}
            sx={{ ml: 'auto' }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {showSettings ? (
          // Settings Panel
          <Box>
            <Typography variant="h6" gutterBottom>
              Library Settings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefreshEnabled || false}
                  onChange={(e) => handleSettingsChange('autoRefreshEnabled', e.target.checked)}
                />
              }
              label="Auto-refresh libraries when files change"
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Cache expiry (days): {settings.cacheExpiryDays || 7}
              </Typography>
              <TextField
                type="number"
                size="small"
                value={settings.cacheExpiryDays || 7}
                onChange={(e) => handleSettingsChange('cacheExpiryDays', parseInt(e.target.value) || 7)}
                inputProps={{ min: 1, max: 30 }}
                sx={{ width: '100px' }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Cache Statistics
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                icon={<LibraryMusicIcon />}
                label={`${cacheStats.totalLibraries} libraries`}
                variant="outlined"
              />
              <Chip
                icon={<StorageIcon />}
                label={`${cacheStats.totalSongs} songs`}
                variant="outlined"
              />
              <Chip
                icon={<StorageIcon />}
                label={formatFileSize(cacheStats.totalSize)}
                variant="outlined"
              />
            </Box>

            <Button
              variant="outlined"
              color="warning"
              onClick={() => {
                if (window.confirm('Clear all library caches? You will need to reload your libraries.')) {
                  persistenceManager.clearAllCaches();
                  loadLibraries();
                }
              }}
            >
              Clear All Caches
            </Button>
          </Box>
        ) : (
          // Libraries List
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1">
                Cached Libraries ({libraries.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAddNewLibrary}
                size="small"
              >
                Add Library
              </Button>
            </Box>

            {libraries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LibraryMusicIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No libraries cached yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add a library to get started
                </Typography>
              </Box>
            ) : (
              <List>
                {libraries.map((library) => (
                  <ListItem
                    key={library.id}
                    sx={{
                      border: '1px solid',
                      borderColor: currentLibraryPath === library.path ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: currentLibraryPath === library.path ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon>
                      {currentLibraryPath === library.path ? (
                        <CheckCircleIcon color="primary" />
                      ) : (
                        <FolderIcon />
                      )}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        editingLibrary === library.id ? (
                          <TextField
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            size="small"
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {library.name}
                            {currentLibraryPath === library.path && (
                              <Chip label="Current" size="small" color="primary" />
                            )}
                          </Box>
                        )
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            📁 {library.path}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption">
                              🎵 {library.songCount} songs
                            </Typography>
                            <Typography variant="caption">
                              💾 {formatFileSize(library.totalSize)}
                            </Typography>
                            <Typography variant="caption">
                              🕒 {formatDate(library.lastScanned)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />

                    <ListItemSecondaryAction>
                      {editingLibrary === library.id ? (
                        <Box>
                          <IconButton size="small" onClick={handleSaveEdit} color="primary">
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelEdit}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box>
                          <Tooltip title="Select Library">
                            <IconButton
                              size="small"
                              onClick={() => handleSelectLibrary(library.path)}
                              color="primary"
                            >
                              <LibraryMusicIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Refresh Library">
                            <IconButton
                              size="small"
                              onClick={() => handleRefreshLibrary(library.path)}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit Name">
                            <IconButton
                              size="small"
                              onClick={() => handleEditLibrary(library)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Remove from Cache">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteLibrary(library.path)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {/* Left side - Enhance Metadata button */}
        <Box>
          {!showSettings && onEnhanceMetadata && (
            <Button
              onClick={handleEnhanceMetadata}
              startIcon={<TuneIcon />}
              disabled={songs.length === 0}
              variant="outlined"
            >
              Enhance Metadata
            </Button>
          )}
        </Box>

        {/* Right side - Close and Add Library buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
          {!showSettings && (
            <Button onClick={onAddNewLibrary} variant="contained">
              Add New Library
            </Button>
          )}
        </Box>
      </DialogActions>

      {/* Metadata Enhancer Dialog */}
      {onEnhanceMetadata && (
        <MetadataEnhancer
          open={metadataEnhancerOpen}
          onClose={() => setMetadataEnhancerOpen(false)}
          songs={songs}
          onEnhanceMetadata={onEnhanceMetadata}
        />
      )}
    </Dialog>
  );
};

export default LibraryManager;
