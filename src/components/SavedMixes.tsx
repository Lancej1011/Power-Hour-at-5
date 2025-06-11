import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Alert,
  AlertTitle
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import LabelIcon from '@mui/icons-material/Label';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import BuildIcon from '@mui/icons-material/Build';

interface Mix {
  id: string;
  name: string;
  date: string;
  songList: string[];
  filename: string;
  localFilePath?: string; // Path to the local WAV file for playback
  clips?: {
    id: string;
    name: string;
    start: number;
    duration: number;
    songName: string;
  }[];
  hasDrinkingSound?: boolean;
  projectData?: {
    originalSongs: {
      id: string;
      name: string;
      artist?: string;
      album?: string;
      year?: string;
      filePath?: string;
      sourceFilePath?: string;
    }[];
    drinkingSoundPath?: string;
    lastModified: string;
    version: string;
    notes?: string;
    tags?: string[];
  };
}

interface SavedMixesProps {
  onPlayMix: (mix: Mix) => void;
}

const SavedMixes: React.FC<SavedMixesProps> = ({ onPlayMix }) => {
  const navigate = useNavigate();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [currentMix, setCurrentMix] = useState<Mix | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [mixFolder, setMixFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Mix | null>(null);
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    // Only attempt to fetch mixes after initial render if we have Electron API
    if (window.electronAPI) {
      // First check if we have a saved mix folder
      window.electronAPI.getMixFolder().then((folder: string | null) => {
        console.log('Initial mix folder:', folder);
        if (folder) {
          setMixFolder(folder);
          fetchMixesFromFolder(folder);
        }
      }).catch((err: Error) => {
        console.error('Error getting initial mix folder:', err);
      });
    }
  }, []);

  // Extract the mix loading logic to a separate function for reuse
  const fetchMixesFromFolder = async (folder: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      console.log('Listing mixes from folder:', folder);
      const data = await window.electronAPI.listMixes();
      console.log('Fetched mixes:', data);
      if (Array.isArray(data)) {
        // Sort mixes by date descending
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMixes(data);
      } else {
        console.error('Unexpected data format:', data);
        setMixes([]);
      }
    } catch (err) {
      console.error('Error fetching mixes:', err);
      setError('Failed to fetch mixes');
      setMixes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMixes = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        console.log('Electron API not available');
        setMixes([]);
        return;
      }

      let folder = mixFolder;
      if (!folder) {
        // Don't automatically prompt for folder selection
        // Just show the select folder button
        setLoading(false);
        return;
      }

      await fetchMixesFromFolder(folder);
    } catch (err) {
      console.error('Error fetching mixes:', err);
      setError('Failed to fetch mixes');
      setMixes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenameDialog = (mix: Mix) => {
    setCurrentMix(mix);
    setRenameValue(mix.name);
    setRenameDialogOpen(true);
  };

  const handleCloseRenameDialog = () => {
    setRenameDialogOpen(false);
    setCurrentMix(null);
    setRenameValue('');
  };

  const handleRenameMix = async () => {
    if (!window.electronAPI || !currentMix || !renameValue.trim()) {
      return;
    }
    
    setRenameLoading(true);
    try {
      const success = await window.electronAPI.renameMix(currentMix, renameValue.trim());
      if (success) {
        setActionSuccess(`Successfully renamed mix to "${renameValue}"`);
        // Refresh the mix list
        if (mixFolder) {
          await fetchMixesFromFolder(mixFolder);
        }
      } else {
        setError('Failed to rename mix');
      }
      handleCloseRenameDialog();
    } catch (err) {
      console.error('Error renaming mix:', err);
      setError('Error renaming mix');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleOpenDeleteDialog = (mix: Mix) => {
    setCurrentMix(mix);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentMix(null);
  };

  const handleDeleteMix = async () => {
    if (!window.electronAPI || !currentMix) {
      return;
    }
    
    try {
      const success = await window.electronAPI.deleteMix(currentMix);
      if (success) {
        setActionSuccess(`Successfully deleted mix "${currentMix.name}"`);
        // Update the local state to remove the deleted mix
        setMixes(mixes => mixes.filter(m => m.id !== currentMix.id));
      } else {
        setError('Failed to delete mix');
      }
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting mix:', err);
      setError('Error deleting mix');
    }
  };

  // Handle editing a mix by navigating to the editor with mix data
  const handleEditMix = (mix: Mix) => {
    if (!mix.clips || mix.clips.length === 0) {
      setError("This mix doesn't have editable clip data. It may have been created with an older version.");
      return;
    }
    
    // Store mix data in localStorage for access by the editor
    localStorage.setItem('edit_mix', JSON.stringify(mix));
    
    // Navigate to the editor
    navigate('/?editMix=true');
  };

  const handleOpenProjectInfo = (mix: Mix) => {
    setSelectedProject(mix);
    setProjectTags(mix.projectData?.tags || []);
    setProjectInfoOpen(true);
  };

  // Add project export function
  const handleExportProject = async (mix: Mix) => {
    if (!window.electronAPI) {
      setError('Exporting projects is only supported in the desktop app.');
      return;
    }
    
    setExportLoading(true);
    try {
      // Pass both ID and name to ensure export works even if ID is undefined
      const exportPath = await window.electronAPI.exportProjectArchive(mix.id || mix.name);
      if (exportPath) {
        setActionSuccess(`Project "${mix.name}" successfully exported to: ${exportPath}`);
      } else {
        setError('Failed to export project');
      }
    } catch (err) {
      console.error('Error exporting project:', err);
      setError('An error occurred while exporting the project');
    } finally {
      setExportLoading(false);
    }
  };

  // Add project import function
  const handleImportProject = async () => {
    if (!window.electronAPI) {
      setError('Importing projects is only supported in the desktop app.');
      return;
    }
    
    setImportLoading(true);
    try {
      const importedMix = await window.electronAPI.importProjectArchive();
      if (importedMix) {
        setActionSuccess(`Project "${importedMix.name}" successfully imported`);
        // Refresh the mix list
        if (mixFolder) {
          await fetchMixesFromFolder(mixFolder);
        }
      } else {
        // User likely canceled the operation
        console.log('Import canceled or failed');
      }
    } catch (err) {
      console.error('Error importing project:', err);
      setError('An error occurred while importing the project');
    } finally {
      setImportLoading(false);
    }
  };

  // Add selectMixFolder function
  const selectMixFolder = async () => {
    if (!window.electronAPI) return;
    
    try {
      const folder = await window.electronAPI.selectMixFolder();
      if (folder) {
        setMixFolder(folder);
        await fetchMixesFromFolder(folder);
      }
    } catch (err) {
      console.error('Error selecting mix folder:', err);
      setError('Failed to select mix folder');
    }
  };

  // Add this function to log details about the project
  const logProjectDetails = (mix: any) => {
    console.log(`Project details - ID: ${mix.id}, Name: ${mix.name}, Date: ${mix.date}`);
    console.log('Project data:', mix.projectData);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Saved Mixes
        </Typography>
        
        <Box>
          {/* Add import button */}
          <Button 
            variant="outlined" 
            startIcon={<CloudUploadIcon />} 
            sx={{ mr: 1 }}
            onClick={handleImportProject}
            disabled={importLoading}
          >
            {importLoading ? 'Importing...' : 'Import Project'}
          </Button>
          
          {window.electronAPI && (
            <Button 
              variant="contained" 
              startIcon={<FolderIcon />}
              onClick={selectMixFolder}
              disabled={loading}
            >
              {mixFolder ? 'Change Folder' : 'Select Folder'}
            </Button>
          )}
        </Box>
      </Box>
      
      {actionSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setActionSuccess(null)}
        >
          {actionSuccess}
        </Alert>
      )}
      
      {window.electronAPI && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          {/* Folder selection button removed since folder is fixed */}
          {mixFolder && (
            <Button 
              variant="outlined" 
              onClick={fetchMixes} 
              disabled={loading}
            >
              Refresh Mixes
            </Button>
          )}
        </Box>
      )}
      
      {loading && (
        <Typography sx={{ my: 2 }}>Loading...</Typography>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ my: 2 }}
          onClose={() => setError(null)}
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      {!window.electronAPI && (
        <Typography sx={{ my: 2 }}>
          This feature requires the desktop application.
        </Typography>
      )}
      
      {!loading && !error && mixes.length === 0 && mixFolder && (
        <Typography sx={{ my: 2 }}>
          No mixes found in the selected folder. Create a mix and save it to see it here.
        </Typography>
      )}
      
      {!loading && !mixFolder && window.electronAPI && (
        <Typography sx={{ my: 2 }}>
          Mixes will be saved to the default folder: <br />
          <code>C:\Users\Joe\Desktop\Power Hour 2\mixes</code>
        </Typography>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {mixes.map((mix) => (
          <Paper key={mix.id} elevation={2} sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{mix.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(mix.date).toLocaleString()} • {mix.songList.length} songs
                </Typography>
                {mix.projectData?.tags && mix.projectData.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {mix.projectData.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex' }}>
                <Tooltip title="Project Info">
                  <IconButton onClick={() => handleOpenProjectInfo(mix)}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Play">
                  <IconButton onClick={() => onPlayMix(mix)}>
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export">
                  <IconButton onClick={() => handleExportProject(mix)} disabled={exportLoading}>
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rename">
                  <IconButton onClick={() => handleOpenRenameDialog(mix)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Mix">
                  <IconButton onClick={() => handleEditMix(mix)}>
                    <BuildIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={() => handleOpenDeleteDialog(mix)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        ))}
      </div>
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={handleCloseRenameDialog}>
        <DialogTitle>Rename Mix</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mix Name"
            fullWidth
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRenameDialog}>Cancel</Button>
          <Button 
            onClick={handleRenameMix} 
            disabled={renameLoading || !renameValue.trim()}
            color="primary"
          >
            {renameLoading ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Mix</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{currentMix?.name}"? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteMix} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Info Dialog */}
      <Dialog open={projectInfoOpen} onClose={() => setProjectInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Project Information
          <IconButton
            aria-label="close"
            onClick={() => setProjectInfoOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedProject && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{selectedProject.name}</Typography>
              
              {/* Last Modified */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 2 }}>
                <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="subtitle2">
                  Last Modified: {selectedProject.projectData?.lastModified 
                    ? new Date(selectedProject.projectData.lastModified).toLocaleString() 
                    : new Date(selectedProject.date).toLocaleString()}
                </Typography>
              </Box>
              
              {/* Tags Section */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LabelIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle2">Tags:</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {projectTags.map(tag => (
                    <Chip 
                      key={tag} 
                      label={tag} 
                      onDelete={() => {
                        setProjectTags(prev => prev.filter(t => t !== tag));
                      }}
                      size="small"
                    />
                  ))}
                  {projectTags.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No tags added</Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    label="Add tag"
                    variant="outlined"
                    size="small"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        setProjectTags(prev => [...prev, newTag.trim()]);
                        setNewTag('');
                      }
                    }}
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    disabled={!newTag.trim()}
                    onClick={() => {
                      if (newTag.trim()) {
                        setProjectTags(prev => [...prev, newTag.trim()]);
                        setNewTag('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              
              {/* Original Songs Section */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Original Songs:
                </Typography>
                {selectedProject.projectData?.originalSongs && selectedProject.projectData.originalSongs.length > 0 ? (
                  <List dense>
                    {selectedProject.projectData.originalSongs.map((song, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={song.name} 
                          secondary={song.artist ? `${song.artist}${song.album ? ` • ${song.album}` : ''}${song.year ? ` • ${song.year}` : ''}` : ''} 
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No original song information available
                  </Typography>
                )}
              </Box>
              
              {/* Drinking Sound Section */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Drinking Sound:
                </Typography>
                <Typography variant="body2">
                  {selectedProject.hasDrinkingSound 
                    ? (selectedProject.projectData?.drinkingSoundPath 
                      ? selectedProject.projectData.drinkingSoundPath
                      : 'Custom drinking sound (details not available)')
                    : 'No drinking sound'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectInfoOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={async () => {
              if (!selectedProject || !window.electronAPI) return;
              
              try {
                console.log('Saving project changes...');
                logProjectDetails(selectedProject);
                
                const updatedMix = {
                  ...selectedProject,
                  projectData: {
                    ...selectedProject.projectData,
                    tags: projectTags,
                    lastModified: new Date().toISOString()
                  }
                };
                
                console.log('Sending updated metadata to electron:');
                logProjectDetails(updatedMix);
                
                const success = await window.electronAPI.updateMixMetadata(updatedMix);
                if (success) {
                  setActionSuccess('Project information updated successfully');
                  // Refresh the mix list
                  if (mixFolder) {
                    await fetchMixesFromFolder(mixFolder);
                  }
                  setProjectInfoOpen(false);
                } else {
                  setError('Failed to update project information');
                }
              } catch (err) {
                console.error('Error updating project info:', err);
                setError('An error occurred while updating project information');
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedMixes; 
