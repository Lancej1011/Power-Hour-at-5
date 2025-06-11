import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { canManageCommunity } from '../utils/authUtils';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

interface CommunityStats {
  totalPlaylists: number;
  publicPlaylists: number;
  privatePlaylists: number;
  totalCreators: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [playlists, setPlaylists] = useState<SharedPlaylist[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Check if user has admin permissions
  const hasAdminAccess = canManageCommunity(user);

  useEffect(() => {
    if (open && hasAdminAccess) {
      loadAdminData();
    }
  }, [open, hasAdminAccess]);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [statsData, playlistsData] = await Promise.all([
        adminService.getCommunityStats(),
        adminService.getAllCommunityPlaylists()
      ]);
      
      setStats(statsData);
      setPlaylists(playlistsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCommunity = async () => {
    if (!window.confirm('Are you sure you want to clear ALL community playlists? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await adminService.clearAllCommunityPlaylists();
      setSuccess(`Successfully cleared community: ${result.success} playlists deleted`);
      
      // Reload data
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to clear community');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await adminService.deletePlaylist(playlistId);
      if (success) {
        setSuccess(`Deleted playlist: ${playlistName}`);
        // Remove from local state
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        // Update stats
        if (stats) {
          setStats({
            ...stats,
            totalPlaylists: stats.totalPlaylists - 1,
            publicPlaylists: stats.publicPlaylists - 1
          });
        }
      } else {
        setError(`Failed to delete playlist: ${playlistName}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete playlist');
    }
  };

  const handleModeratePlaylist = async (playlistId: string, currentlyPublic: boolean, playlistName: string) => {
    const action = currentlyPublic ? 'hide' : 'show';
    if (!window.confirm(`Are you sure you want to ${action} "${playlistName}"?`)) {
      return;
    }

    try {
      const success = await adminService.moderatePlaylist(playlistId, !currentlyPublic);
      if (success) {
        setSuccess(`Playlist ${currentlyPublic ? 'hidden' : 'made public'}: ${playlistName}`);
        // Update local state
        setPlaylists(prev => prev.map(p => 
          p.id === playlistId ? { ...p, isPublic: !currentlyPublic } : p
        ));
      } else {
        setError(`Failed to moderate playlist: ${playlistName}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to moderate playlist');
    }
  };

  if (!hasAdminAccess) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AdminIcon />
            Access Denied
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            You do not have administrative permissions to access this panel.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AdminIcon />
            Admin Panel - Community Management
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!loading && stats && (
          <>
            {/* Community Statistics */}
            <Typography variant="h6" gutterBottom>
              Community Statistics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Playlists
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalPlaylists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Public Playlists
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {stats.publicPlaylists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Private Playlists
                    </Typography>
                    <Typography variant="h4" color="secondary">
                      {stats.privatePlaylists}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Creators
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalCreators}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Admin Actions */}
            <Box display="flex" gap={2} mb={3}>
              <Button
                variant="contained"
                color="error"
                startIcon={<WarningIcon />}
                onClick={handleClearCommunity}
                disabled={loading || stats.publicPlaylists === 0}
              >
                Clear All Community Playlists
              </Button>
              <Button
                variant="outlined"
                onClick={loadAdminData}
                disabled={loading}
              >
                Refresh Data
              </Button>
            </Box>

            {/* Playlist Management */}
            <Typography variant="h6" gutterBottom>
              Community Playlists ({playlists.length})
            </Typography>
            
            {playlists.length === 0 ? (
              <Alert severity="info">
                No community playlists found.
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {playlists.map((playlist) => (
                  <ListItem key={playlist.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {playlist.name}
                          <Chip
                            size="small"
                            label={playlist.isPublic ? 'Public' : 'Hidden'}
                            color={playlist.isPublic ? 'success' : 'default'}
                          />
                        </Box>
                      }
                      secondary={`By: ${playlist.creator} | ${playlist.clips?.length || 0} clips`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title={playlist.isPublic ? 'Hide playlist' : 'Show playlist'}>
                        <IconButton
                          onClick={() => handleModeratePlaylist(playlist.id, playlist.isPublic, playlist.name)}
                          size="small"
                        >
                          {playlist.isPublic ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete playlist">
                        <IconButton
                          onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminPanel;
