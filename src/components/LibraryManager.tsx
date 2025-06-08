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
  CircularProgress,
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
  fileSize?: number;
  lastModified?: number;
  tags?: string[];
  // Library information (added when loading from multiple libraries)
  libraryPath?: string;
  libraryName?: string;
}

interface LibraryManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectLibrary: (libraryPath: string) => void;
  onAddLibraryFolder: (folderPath: string) => Promise<boolean>;
  currentLibraryPath?: string;
  songs?: LibrarySong[];
  onEnhanceMetadata?: (songs: LibrarySong[], enhancements: string[]) => Promise<void>;
  libraryLoading?: boolean;
  allLibraries?: any[];
  onRefreshAllLibraries?: () => void;
  onRemoveLibrary?: (libraryPath: string) => void;
  onRefreshLibrary?: (libraryPath: string) => void;
}

const LibraryManager: React.FC<LibraryManagerProps> = ({
  open,
  onClose,
  onSelectLibrary,
  onAddLibraryFolder,
  currentLibraryPath,
  songs = [],
  onEnhanceMetadata,
  libraryLoading = false,
  allLibraries = [],
  onRefreshAllLibraries,
  onRemoveLibrary,
  onRefreshLibrary,
}) => {
  const [settings, setSettings] = useState<any>({});
  const [editingLibrary, setEditingLibrary] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [metadataEnhancerOpen, setMetadataEnhancerOpen] = useState(false);
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const persistenceManager = LibraryPersistenceManager.getInstance();

  // Use allLibraries from props, fallback to persistence manager if not provided
  const libraries = allLibraries.length > 0 ? allLibraries : persistenceManager.getAllLibraries();

  console.log('LibraryManager: allLibraries prop:', allLibraries.length, allLibraries);
  console.log('LibraryManager: final libraries:', libraries.length, libraries);
  console.log('LibraryManager: persistenceManager.getAllLibraries():', persistenceManager.getAllLibraries().length, persistenceManager.getAllLibraries());

  useEffect(() => {
    if (open) {
      loadSettings();
      // Refresh all libraries when dialog opens
      if (onRefreshAllLibraries) {
        onRefreshAllLibraries();
      }

      // Debug: Check localStorage directly
      console.log('LibraryManager: localStorage libraries:', localStorage.getItem('power_hour_libraries'));
      console.log('LibraryManager: localStorage current:', localStorage.getItem('power_hour_current_library'));
    }
  }, [open, onRefreshAllLibraries]);

  // Refresh when library loading completes (indicates a new library was added)
  useEffect(() => {
    if (open && !libraryLoading && onRefreshAllLibraries) {
      console.log('Library Manager: Library loading completed, refreshing libraries list');
      onRefreshAllLibraries();
    }
  }, [open, libraryLoading, onRefreshAllLibraries]);

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
      if (onRemoveLibrary) {
        // Use the new context method which handles switching libraries properly
        onRemoveLibrary(libraryPath);
      } else {
        // Fallback to direct persistence manager call
        persistenceManager.removeLibrary(libraryPath);
        if (onRefreshAllLibraries) {
          onRefreshAllLibraries();
        }
      }
    }
  };

  const handleRefreshLibrary = (libraryPath: string) => {
    if (onRefreshLibrary) {
      // Use the new context method which properly refreshes the library
      onRefreshLibrary(libraryPath);
    } else {
      // Fallback to selecting the library (which will trigger a refresh)
      onSelectLibrary(libraryPath);
      onClose();
    }
  };

  const handleAddNewLibrary = async () => {
    console.log('Library Manager: Starting to add new library');
    setIsAddingLibrary(true);

    try {
      // Open folder selection dialog
      if (!window.electronAPI) {
        console.error('Electron API not available');
        return;
      }

      const selectedFolder = await window.electronAPI.selectLibraryFolder();
      console.log('Library Manager: Selected folder:', selectedFolder);

      if (selectedFolder) {
        // Add the library using the new addLibraryFolder function
        const success = await onAddLibraryFolder(selectedFolder);

        if (success) {
          console.log('Library Manager: Successfully added new library');
          // Refresh libraries list
          if (onRefreshAllLibraries) {
            onRefreshAllLibraries();
          }
        } else {
          console.log('Library Manager: Failed to add library or library already exists');
        }
      } else {
        console.log('Library Manager: User cancelled folder selection');
      }
    } catch (error) {
      console.error('Library Manager: Error adding new library:', error);
    } finally {
      setIsAddingLibrary(false);
    }
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
        if (onRefreshAllLibraries) {
          onRefreshAllLibraries();
        }
      }
    }
    setEditingLibrary(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingLibrary(null);
    setEditName('');
  };

  // Debug function to add a test library
  const addTestLibrary = () => {
    const testPath = `C:\\TestMusic\\Library${Date.now()}`;
    const testSongs = [
      { name: 'Test Song 1', path: `${testPath}\\song1.mp3`, title: 'Test Song 1', artist: 'Test Artist' },
      { name: 'Test Song 2', path: `${testPath}\\song2.mp3`, title: 'Test Song 2', artist: 'Test Artist' }
    ];

    console.log('Adding test library:', testPath);
    persistenceManager.saveLibrary(testPath, testSongs, `Test Library ${Date.now()}`, false);

    if (onRefreshAllLibraries) {
      onRefreshAllLibraries();
    }
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
                  if (onRefreshAllLibraries) {
                    onRefreshAllLibraries();
                  }
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
                Music Libraries ({libraries.length})
                {currentLibraryPath && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Current: {currentLibraryPath.split(/[/\\]/).pop()}
                  </Typography>
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    if (onRefreshAllLibraries) {
                      onRefreshAllLibraries();
                    }
                  }}
                  size="small"
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={addTestLibrary}
                  size="small"
                >
                  Add Test
                </Button>
                <Button
                  variant="contained"
                  startIcon={isAddingLibrary ? <CircularProgress size={16} /> : <AddIcon />}
                  onClick={handleAddNewLibrary}
                  size="small"
                  disabled={isAddingLibrary}
                >
                  {isAddingLibrary ? 'Adding Library...' : 'Add Library'}
                </Button>
              </Box>
            </Box>

            {libraries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LibraryMusicIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {isAddingLibrary || libraryLoading ? 'Adding library...' : 'No libraries cached yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAddingLibrary || libraryLoading ? 'Please wait while we scan your music folder and all its subfolders' : 'Click "Add Library" to select a folder containing your music files. All subfolders will be scanned automatically.'}
                </Typography>
                {(isAddingLibrary || libraryLoading) && (
                  <CircularProgress sx={{ mt: 2 }} />
                )}
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
                        <React.Fragment>
                          <Typography variant="caption" display="block" component="span">
                            📁 {library.path}
                          </Typography>
                          <Typography variant="caption" component="span" sx={{ display: 'block', mt: 0.5 }}>
                            🎵 {library.songCount} songs • 💾 {formatFileSize(library.totalSize)} • 🕒 {formatDate(library.lastScanned)}
                          </Typography>
                        </React.Fragment>
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

        {/* Right side - Close button */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
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
