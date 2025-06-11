/**
 * Sync Status Indicator Component
 * Shows the current synchronization status of user data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Sync as SyncIcon,
  CloudDone as SyncedIcon,
  CloudOff as OfflineIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Schedule,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  compact = false,
  showDetails = true
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const {
    isAuthenticated,
    isSyncing,
    isOnline,
    lastSyncAt,
    getSyncStatus,
    hasPendingSync,
    forceSyncNow
  } = useAuth();

  const [showDialog, setShowDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Update sync status periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateStatus = () => {
      try {
        const status = getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Error getting sync status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, getSyncStatus]);

  if (!isAuthenticated) {
    return null;
  }

  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      await forceSyncNow();
      
      // Update status after sync
      setTimeout(() => {
        const status = getSyncStatus();
        setSyncStatus(status);
      }, 1000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getSyncStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <OfflineIcon />,
        label: 'Offline',
        color: 'default' as const,
        description: 'Changes will sync when online'
      };
    }

    if (isSyncing || isManualSyncing) {
      return {
        icon: <CircularProgress size={16} />,
        label: 'Syncing...',
        color: 'primary' as const,
        description: 'Synchronizing your data'
      };
    }

    if (hasPendingSync()) {
      return {
        icon: <PendingIcon />,
        label: 'Pending',
        color: 'warning' as const,
        description: 'Changes waiting to sync'
      };
    }

    if (lastSyncAt) {
      const timeSinceSync = Date.now() - new Date(lastSyncAt).getTime();
      const minutesAgo = Math.floor(timeSinceSync / (1000 * 60));
      
      if (minutesAgo < 5) {
        return {
          icon: <SyncedIcon />,
          label: 'Synced',
          color: 'success' as const,
          description: 'All data synchronized'
        };
      } else {
        return {
          icon: <WarningIcon />,
          label: `${minutesAgo}m ago`,
          color: 'warning' as const,
          description: 'Data may be out of sync'
        };
      }
    }

    return {
      icon: <SyncIcon />,
      label: 'Not synced',
      color: 'default' as const,
      description: 'Click to sync your data'
    };
  };

  const statusInfo = getSyncStatusInfo();

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  // Helper function to get theme color safely
  const getThemeColor = (color: string) => {
    switch (color) {
      case 'primary':
        return theme.palette.primary.main;
      case 'secondary':
        return theme.palette.secondary.main;
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  if (compact) {
    return (
      <Tooltip title={statusInfo.description}>
        <IconButton
          size="small"
          onClick={showDetails ? () => setShowDialog(true) : handleManualSync}
          disabled={isSyncing || isManualSyncing}
          sx={{
            color: getThemeColor(statusInfo.color),
          }}
        >
          {statusInfo.icon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title={statusInfo.description}>
        <Chip
          icon={statusInfo.icon}
          label={statusInfo.label}
          color={statusInfo.color}
          size="small"
          onClick={showDetails ? () => setShowDialog(true) : handleManualSync}
          clickable
          disabled={isSyncing || isManualSyncing}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: alpha(getThemeColor(statusInfo.color), 0.1),
            }
          }}
        />
      </Tooltip>

      {showDetails && (
        <Dialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SyncIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Sync Status
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Alert 
                severity={isOnline ? 'info' : 'warning'} 
                icon={isOnline ? <InfoIcon /> : <OfflineIcon />}
                sx={{ borderRadius: 2 }}
              >
                {isOnline 
                  ? 'Your data is automatically synchronized with the cloud'
                  : 'You are offline. Changes will sync when connection is restored'
                }
              </Alert>
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  {isOnline ? <CheckIcon color="success" /> : <OfflineIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Connection Status"
                  secondary={isOnline ? 'Online' : 'Offline'}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  {statusInfo.icon}
                </ListItemIcon>
                <ListItemText
                  primary="Sync Status"
                  secondary={statusInfo.description}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Schedule />
                </ListItemIcon>
                <ListItemText
                  primary="Last Sync"
                  secondary={formatLastSync(lastSyncAt)}
                />
              </ListItem>

              {syncStatus?.pendingChanges && (
                <ListItem>
                  <ListItemIcon>
                    <PendingIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Pending Changes"
                    secondary="Some changes are waiting to be synchronized"
                  />
                </ListItem>
              )}
            </List>

            {syncStatus?.lastError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Sync Error:</strong> {syncStatus.lastError}
                </Typography>
              </Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setShowDialog(false)}
              color="inherit"
            >
              Close
            </Button>
            <Button
              onClick={handleManualSync}
              variant="contained"
              disabled={isSyncing || isManualSyncing || !isOnline}
              startIcon={isManualSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {isManualSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default SyncStatusIndicator;
