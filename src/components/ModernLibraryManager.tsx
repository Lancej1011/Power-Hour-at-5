import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  LinearProgress,
  Stack,
  Alert,
  AlertTitle,
  Fade,
  Collapse,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  LibraryMusic as LibraryMusicIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  MusicNote as MusicNoteIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  FolderOpen as FolderOpenIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
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

interface LibraryCache {
  id: string;
  name: string;
  path: string;
  songs: LibrarySong[];
  lastScanned: number;
  songCount: number;
  totalSize: number;
  version: number;
}

interface ModernLibraryManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectLibrary: (libraryPath: string) => void;
  onAddLibraryFolder: (folderPath: string) => Promise<boolean>;
  currentLibraryPath?: string;
  songs?: LibrarySong[];
  onEnhanceMetadata?: (songs: LibrarySong[], enhancements: string[]) => Promise<void>;
  libraryLoading?: boolean;
  allLibraries?: LibraryCache[];
  onRefreshAllLibraries?: () => void;
  onRemoveLibrary?: (libraryPath: string) => void;
  onRefreshLibrary?: (libraryPath: string) => void;
}

const ModernLibraryManager: React.FC<ModernLibraryManagerProps> = ({
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
  const [addingProgress, setAddingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const persistenceManager = LibraryPersistenceManager.getInstance();

  // Get libraries with fallback to persistence manager
  const libraries = allLibraries.length > 0 ? allLibraries : persistenceManager.getAllLibraries();

  // Load settings on mount
  useEffect(() => {
    if (open) {
      loadSettings();
      setError(null);
      setSuccessMessage(null);

      // Refresh libraries when dialog opens
      if (onRefreshAllLibraries) {
        onRefreshAllLibraries();
      }
    }
  }, [open, onRefreshAllLibraries]);



  const loadSettings = () => {
    const currentSettings = persistenceManager.getSettings();
    setSettings(currentSettings);
  };

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date helper
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Handle adding new library with enhanced error handling
  const handleAddNewLibrary = useCallback(async () => {
    console.log('ModernLibraryManager: Starting to add new library');
    setIsAddingLibrary(true);
    setError(null);
    setSuccessMessage(null);
    setAddingProgress(0);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const selectedFolder = await window.electronAPI.selectLibraryFolder();
      console.log('ModernLibraryManager: Selected folder:', selectedFolder);

      if (selectedFolder) {
        setAddingProgress(25);
        
        // Check if library already exists
        const existingLibrary = libraries.find(lib => lib.path === selectedFolder);
        if (existingLibrary) {
          setError(`Library already exists: ${existingLibrary.name}`);
          return;
        }

        setAddingProgress(50);
        
        // Add the library
        const success = await onAddLibraryFolder(selectedFolder);
        setAddingProgress(75);

        if (success) {
          console.log('ModernLibraryManager: Successfully added new library');
          setAddingProgress(100);
          setSuccessMessage(`Successfully added library: ${selectedFolder.split(/[/\\]/).pop()}`);
          
          // Refresh libraries list
          if (onRefreshAllLibraries) {
            onRefreshAllLibraries();
          }
          
          // Clear success message after 3 seconds
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError('Failed to add library. Please try again.');
        }
      } else {
        console.log('ModernLibraryManager: User cancelled folder selection');
      }
    } catch (error) {
      console.error('ModernLibraryManager: Error adding new library:', error);
      setError(`Error adding library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingLibrary(false);
      setAddingProgress(0);
    }
  }, [libraries, onAddLibraryFolder, onRefreshAllLibraries]);

  // Handle library selection
  const handleSelectLibrary = useCallback((libraryPath: string) => {
    onSelectLibrary(libraryPath);
    setSuccessMessage(`Switched to library: ${libraryPath.split(/[/\\]/).pop()}`);
    setTimeout(() => setSuccessMessage(null), 2000);
    onClose();
  }, [onSelectLibrary, onClose]);

  // Handle library removal with confirmation
  const handleRemoveLibrary = useCallback((libraryPath: string) => {
    const library = libraries.find(lib => lib.path === libraryPath);
    const libraryName = library?.name || libraryPath.split(/[/\\]/).pop();
    
    if (window.confirm(`Are you sure you want to remove "${libraryName}" from the library manager?\n\nThis will not delete your music files, only remove them from the app's library cache.`)) {
      if (onRemoveLibrary) {
        onRemoveLibrary(libraryPath);
        setSuccessMessage(`Removed library: ${libraryName}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }, [libraries, onRemoveLibrary]);

  // Handle library refresh
  const handleRefreshLibrary = useCallback((libraryPath: string) => {
    if (onRefreshLibrary) {
      onRefreshLibrary(libraryPath);
      const libraryName = libraries.find(lib => lib.path === libraryPath)?.name || 'Library';
      setSuccessMessage(`Refreshing ${libraryName}...`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [libraries, onRefreshLibrary]);

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh', maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LibraryMusicIcon color="primary" />
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              Music Library Manager
            </Typography>
            <Chip 
              label={`${libraries.length} ${libraries.length === 1 ? 'Library' : 'Libraries'}`}
              color="primary"
              variant="outlined"
            />
            <IconButton
              onClick={() => setShowSettings(!showSettings)}
              color={showSettings ? 'primary' : 'default'}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {/* Error and Success Messages */}
          <Collapse in={!!error}>
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          </Collapse>
          
          <Collapse in={!!successMessage}>
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          </Collapse>

          {/* Adding Library Progress */}
          <Collapse in={isAddingLibrary}>
            <Card sx={{ mb: 2, bgcolor: 'action.hover' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body1">Adding new library...</Typography>
                </Box>
                <LinearProgress variant="determinate" value={addingProgress} />
              </CardContent>
            </Card>
          </Collapse>

          {/* Settings Panel */}
          <Collapse in={showSettings}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Library Settings
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoRefreshEnabled || false}
                      onChange={(e) => {
                        const newSettings = { ...settings, autoRefreshEnabled: e.target.checked };
                        setSettings(newSettings);
                        persistenceManager.updateSettings(newSettings);
                      }}
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
                    onChange={(e) => {
                      const newSettings = { ...settings, cacheExpiryDays: parseInt(e.target.value) || 7 };
                      setSettings(newSettings);
                      persistenceManager.updateSettings(newSettings);
                    }}
                    inputProps={{ min: 1, max: 30 }}
                    sx={{ width: '100px' }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Cache Statistics
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                  {(() => {
                    const stats = persistenceManager.getCacheStats();
                    return (
                      <>
                        <Card variant="outlined">
                          <CardContent sx={{ textAlign: 'center', py: 1 }}>
                            <LibraryMusicIcon color="primary" />
                            <Typography variant="h6">{stats.totalLibraries}</Typography>
                            <Typography variant="caption">Libraries</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent sx={{ textAlign: 'center', py: 1 }}>
                            <MusicNoteIcon color="primary" />
                            <Typography variant="h6">{stats.totalSongs}</Typography>
                            <Typography variant="caption">Songs</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent sx={{ textAlign: 'center', py: 1 }}>
                            <StorageIcon color="primary" />
                            <Typography variant="h6">{formatFileSize(stats.totalSize)}</Typography>
                            <Typography variant="caption">Total Size</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent sx={{ textAlign: 'center', py: 1 }}>
                            <ScheduleIcon color="primary" />
                            <Typography variant="h6">{formatDate(stats.newestCache)}</Typography>
                            <Typography variant="caption">Last Updated</Typography>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      if (window.confirm('Clear all library caches? You will need to reload your libraries.')) {
                        persistenceManager.clearAllCaches();
                        if (onRefreshAllLibraries) {
                          onRefreshAllLibraries();
                        }
                        setSuccessMessage('All caches cleared successfully');
                        setTimeout(() => setSuccessMessage(null), 3000);
                      }
                    }}
                  >
                    Clear All Caches
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Collapse>

          {/* Main Libraries Section */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Your Music Libraries
              {currentLibraryPath && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Current: {currentLibraryPath.split(/[/\\]/).pop()}
                </Typography>
              )}
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  if (onRefreshAllLibraries) {
                    onRefreshAllLibraries();
                    setSuccessMessage('Libraries refreshed');
                    setTimeout(() => setSuccessMessage(null), 2000);
                  }
                }}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={isAddingLibrary ? <CircularProgress size={16} /> : <AddIcon />}
                onClick={handleAddNewLibrary}
                disabled={isAddingLibrary}
              >
                {isAddingLibrary ? 'Adding...' : 'Add Library'}
              </Button>
            </Stack>
          </Box>

          {/* Libraries Grid */}
          {libraries.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <CardContent>
                <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {isAddingLibrary || libraryLoading ? 'Adding your first library...' : 'No libraries found'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isAddingLibrary || libraryLoading
                    ? 'Please wait while we scan your music folder and all its subfolders'
                    : 'Click "Add Library" to select a folder containing your music files. All subfolders will be scanned automatically.'
                  }
                </Typography>
                {(isAddingLibrary || libraryLoading) && (
                  <CircularProgress />
                )}
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }}>
              {libraries.map((library) => (
                <div key={`library-${library.id}-${library.lastScanned}`}>
                  <Card
                    sx={{
                      height: '100%',
                      border: currentLibraryPath === library.path ? 2 : 1,
                      borderColor: currentLibraryPath === library.path ? 'primary.main' : 'divider',
                      bgcolor: currentLibraryPath === library.path ? 'action.selected' : 'background.paper',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Library Header */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                          {currentLibraryPath === library.path ? (
                            <CheckCircleIcon color="primary" sx={{ fontSize: 32 }} />
                          ) : (
                            <FolderIcon color="action" sx={{ fontSize: 32 }} />
                          )}
                        </Box>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          {editingLibrary === library.id ? (
                            <TextField
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              size="small"
                              fullWidth
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  if (editName.trim()) {
                                    persistenceManager.updateLibraryMetadata(library.path, { name: editName.trim() });
                                    if (onRefreshAllLibraries) {
                                      onRefreshAllLibraries();
                                    }
                                  }
                                  setEditingLibrary(null);
                                  setEditName('');
                                }
                                if (e.key === 'Escape') {
                                  setEditingLibrary(null);
                                  setEditName('');
                                }
                              }}
                            />
                          ) : (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" sx={{
                                  fontWeight: currentLibraryPath === library.path ? 600 : 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {library.name}
                                </Typography>
                                {currentLibraryPath === library.path && (
                                  <Chip label="Current" size="small" color="primary" />
                                )}
                              </Box>

                              <Typography variant="caption" color="text.secondary" sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                📁 {library.path}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Library Stats */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {library.songCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Songs
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {formatFileSize(library.totalSize)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Size
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {formatDate(library.lastScanned)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Scanned
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      {editingLibrary === library.id ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => {
                              if (editName.trim()) {
                                persistenceManager.updateLibraryMetadata(library.path, { name: editName.trim() });
                                if (onRefreshAllLibraries) {
                                  onRefreshAllLibraries();
                                }
                              }
                              setEditingLibrary(null);
                              setEditName('');
                            }}
                            color="primary"
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingLibrary(null);
                              setEditName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                              onClick={() => {
                                setEditingLibrary(library.id);
                                setEditName(library.name);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Remove Library">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveLibrary(library.path)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </CardActions>
                  </Card>
                </div>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          {/* Left side - Enhance Metadata button */}
          <Box>
            {!showSettings && onEnhanceMetadata && (
              <Button
                onClick={() => setMetadataEnhancerOpen(true)}
                startIcon={<TuneIcon />}
                disabled={songs.length === 0}
                variant="outlined"
              >
                Enhance Metadata
              </Button>
            )}
          </Box>

          {/* Right side - Close button */}
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Metadata Enhancer Dialog */}
      {onEnhanceMetadata && (
        <MetadataEnhancer
          open={metadataEnhancerOpen}
          onClose={() => setMetadataEnhancerOpen(false)}
          songs={songs}
          onEnhanceMetadata={onEnhanceMetadata}
        />
      )}
    </>
  );
};

export default ModernLibraryManager;
