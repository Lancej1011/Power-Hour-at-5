import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import ShareIcon from '@mui/icons-material/Share';
import GetAppIcon from '@mui/icons-material/GetApp';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SortIcon from '@mui/icons-material/Sort';

interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
}

interface BulkOperationsProps {
  selectedSongs: Set<string>;
  songs: LibrarySong[];
  onClearSelection: () => void;
  onCreatePlaylist: (songs: LibrarySong[], name: string) => void;
  onAddToFolder: (songs: LibrarySong[], folderName: string) => void;
  onExportSelection: (songs: LibrarySong[], format: string) => void;
  onDeleteSongs?: (songPaths: string[]) => void;
  availableFolders?: string[];
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedSongs,
  songs,
  onClearSelection,
  onCreatePlaylist,
  onAddToFolder,
  onExportSelection,
  onDeleteSongs,
  availableFolders = [],
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [exportFormat, setExportFormat] = useState('m3u');

  const selectedSongObjects = songs.filter(song => selectedSongs.has(song.path));

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreatePlaylist = () => {
    if (playlistName.trim()) {
      onCreatePlaylist(selectedSongObjects, playlistName.trim());
      setPlaylistName('');
      setPlaylistDialogOpen(false);
      onClearSelection();
    }
  };

  const handleAddToFolder = () => {
    const folderName = selectedFolder === 'new' ? newFolderName.trim() : selectedFolder;
    if (folderName) {
      onAddToFolder(selectedSongObjects, folderName);
      setSelectedFolder('');
      setNewFolderName('');
      setFolderDialogOpen(false);
      onClearSelection();
    }
  };

  const handleExport = () => {
    onExportSelection(selectedSongObjects, exportFormat);
    setExportDialogOpen(false);
  };

  const handleDelete = () => {
    if (onDeleteSongs && window.confirm(`Are you sure you want to delete ${selectedSongs.size} songs?`)) {
      onDeleteSongs(Array.from(selectedSongs));
      onClearSelection();
    }
  };

  const getSelectionSummary = () => {
    const artists = new Set(selectedSongObjects.map(s => s.artist).filter(Boolean));
    const genres = new Set(selectedSongObjects.map(s => s.genre).filter(Boolean));
    const years = new Set(selectedSongObjects.map(s => s.year).filter(Boolean));

    return {
      songs: selectedSongs.size,
      artists: artists.size,
      genres: genres.size,
      years: years.size,
    };
  };

  const summary = getSelectionSummary();

  if (selectedSongs.size === 0) {
    return null;
  }

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        p: 2, 
        backgroundColor: 'action.hover',
        borderRadius: 1,
        mb: 2 
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {selectedSongs.size} song{selectedSongs.size === 1 ? '' : 's'} selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip label={`${summary.artists} artists`} size="small" variant="outlined" />
            <Chip label={`${summary.genres} genres`} size="small" variant="outlined" />
            <Chip label={`${summary.years} years`} size="small" variant="outlined" />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            onClick={() => setPlaylistDialogOpen(true)}
            size="small"
          >
            Create Playlist
          </Button>
          
          <Button
            variant="outlined"
            endIcon={<MoreVertIcon />}
            onClick={handleMenuOpen}
            size="small"
          >
            More Actions
          </Button>

          <Button
            variant="outlined"
            onClick={onClearSelection}
            size="small"
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { setFolderDialogOpen(true); handleMenuClose(); }}>
          <ListItemIcon><FolderIcon /></ListItemIcon>
          <ListItemText>Add to Folder</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => { setExportDialogOpen(true); handleMenuClose(); }}>
          <ListItemIcon><GetAppIcon /></ListItemIcon>
          <ListItemText>Export Selection</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => { /* TODO: Implement shuffle */ handleMenuClose(); }}>
          <ListItemIcon><ShuffleIcon /></ListItemIcon>
          <ListItemText>Shuffle Order</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => { /* TODO: Implement sort */ handleMenuClose(); }}>
          <ListItemIcon><SortIcon /></ListItemIcon>
          <ListItemText>Sort Selection</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => { /* TODO: Implement copy */ handleMenuClose(); }}>
          <ListItemIcon><ContentCopyIcon /></ListItemIcon>
          <ListItemText>Copy to Clipboard</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => { /* TODO: Implement share */ handleMenuClose(); }}>
          <ListItemIcon><ShareIcon /></ListItemIcon>
          <ListItemText>Share Selection</ListItemText>
        </MenuItem>

        {onDeleteSongs && (
          <>
            <Divider />
            <MenuItem onClick={() => { handleDelete(); handleMenuClose(); }} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
              <ListItemText>Delete Songs</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Playlist Dialog */}
      <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)}>
        <DialogTitle>Create New Playlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Playlist Name"
            fullWidth
            variant="outlined"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will create a new playlist with {selectedSongs.size} selected songs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlaylistDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePlaylist} variant="contained" disabled={!playlistName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add to Folder Dialog */}
      <Dialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)}>
        <DialogTitle>Add to Folder</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Select Folder</InputLabel>
            <Select
              value={selectedFolder}
              label="Select Folder"
              onChange={(e: SelectChangeEvent) => setSelectedFolder(e.target.value)}
            >
              {availableFolders.map((folder) => (
                <MenuItem key={folder} value={folder}>{folder}</MenuItem>
              ))}
              <MenuItem value="new">+ Create New Folder</MenuItem>
            </Select>
          </FormControl>

          {selectedFolder === 'new' && (
            <TextField
              margin="dense"
              label="New Folder Name"
              fullWidth
              variant="outlined"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddToFolder} 
            variant="contained"
            disabled={!selectedFolder || (selectedFolder === 'new' && !newFolderName.trim())}
          >
            Add to Folder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Selection</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e: SelectChangeEvent) => setExportFormat(e.target.value)}
            >
              <MenuItem value="m3u">M3U Playlist</MenuItem>
              <MenuItem value="pls">PLS Playlist</MenuItem>
              <MenuItem value="csv">CSV Spreadsheet</MenuItem>
              <MenuItem value="json">JSON Data</MenuItem>
              <MenuItem value="txt">Text List</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Export {selectedSongs.size} songs in the selected format.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkOperations;
