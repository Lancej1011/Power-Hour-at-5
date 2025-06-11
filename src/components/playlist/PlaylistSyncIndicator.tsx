/**
 * Playlist Sync Status Indicator
 * Shows sync status for playlists with manual sync controls
 */

import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Sync as SyncIcon,
  SyncProblem as SyncProblemIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  CloudOff as CloudOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { usePlaylistSync } from '../../hooks/usePlaylist';
import { useThemeContext } from '../../contexts/ThemeContext';

interface PlaylistSyncIndicatorProps {
  variant?: 'compact' | 'detailed';
  showLabel?: boolean;
}

const PlaylistSyncIndicator: React.FC<PlaylistSyncIndicatorProps> = ({
  variant = 'compact',
  showLabel = false
}) => {
  const { currentTheme } = useThemeContext();
  const {
    isSyncing,
    lastSyncAt,
    pendingSyncCount,
    syncAllPlaylists,
    forceSyncNow,
    canSync
  } = usePlaylistSync();
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Determine sync status
  const getSyncStatus = () => {
    if (!canSync) return 'offline';
    if (isSyncing || isManualSyncing) return 'syncing';
    if (pendingSyncCount > 0) return 'pending';
    return 'synced';
  };

  const syncStatus = getSyncStatus();

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <CircularProgress size={16} />,
          color: 'primary' as const,
          label: 'Syncing...'
        };
      case 'pending':
        return {
          icon: <ScheduleIcon />,
          color: 'warning' as const,
          label: `${pendingSyncCount} pending`
        };
      case 'synced':
        return {
          icon: <CheckCircleIcon />,
          color: 'success' as const,
          label: 'Synced'
        };
      case 'offline':
        return {
          icon: <CloudOffIcon />,
          color: 'default' as const,
          label: 'Offline'
        };
      default:
        return {
          icon: <SyncProblemIcon />,
          color: 'error' as const,
          label: 'Error'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Handle manual sync
  const handleManualSync = async () => {
    if (!canSync || isSyncing) return;

    setIsManualSyncing(true);
    try {
      await forceSyncNow();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`Playlist sync: ${statusDisplay.label}`}>
          <IconButton
            size="small"
            onClick={canSync ? () => setDetailsOpen(true) : undefined}
            disabled={!canSync}
            sx={{
              color: statusDisplay.color === 'default' 
                ? currentTheme.palette.text.secondary 
                : `${statusDisplay.color}.main`
            }}
          >
            {statusDisplay.icon}
          </IconButton>
        </Tooltip>
        
        {showLabel && (
          <Typography variant="caption" color="text.secondary">
            {statusDisplay.label}
          </Typography>
        )}
      </Box>
    );
  }

  // Detailed variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Chip
        icon={statusDisplay.icon}
        label={statusDisplay.label}
        color={statusDisplay.color}
        variant="outlined"
        size="small"
        onClick={canSync ? () => setDetailsOpen(true) : undefined}
        clickable={canSync}
      />
      
      {canSync && (
        <Tooltip title="Manual sync">
          <IconButton
            size="small"
            onClick={handleManualSync}
            disabled={isSyncing || isManualSyncing}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Sync Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Playlist Sync Status
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert 
              severity={
                syncStatus === 'synced' ? 'success' :
                syncStatus === 'pending' ? 'warning' :
                syncStatus === 'syncing' ? 'info' : 'error'
              }
              icon={statusDisplay.icon}
            >
              {syncStatus === 'synced' && 'All playlists are synchronized'}
              {syncStatus === 'pending' && `${pendingSyncCount} playlists pending sync`}
              {syncStatus === 'syncing' && 'Synchronizing playlists...'}
              {syncStatus === 'offline' && 'Sync unavailable - not authenticated'}
            </Alert>
          </Box>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Last Sync"
                secondary={formatLastSync(lastSyncAt)}
              />
            </ListItem>
            
            {pendingSyncCount > 0 && (
              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Pending Changes"
                  secondary={`${pendingSyncCount} playlists need sync`}
                />
              </ListItem>
            )}
            
            <ListItem>
              <ListItemIcon>
                {canSync ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CloudOffIcon color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Sync Capability"
                secondary={canSync ? 'Ready to sync' : 'Authentication required'}
              />
            </ListItem>
          </List>

          {canSync && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleManualSync}
                disabled={isSyncing || isManualSyncing}
                fullWidth
              >
                {isManualSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlaylistSyncIndicator;
