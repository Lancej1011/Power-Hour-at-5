/**
 * Update Manager Component
 * Main component that orchestrates all update-related functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
} from '@mui/material';
import {
  Update,
  Download,
  Settings,
  History,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import { updateService, UpdateStatus } from '../services/updateService';
import { versionService } from '../services/versionService';
import { UpdateNotification } from './UpdateNotification';
import { VersionManager } from './VersionManager';
import { UpdateSettingsComponent } from './UpdateSettings';

interface UpdateManagerProps {
  className?: string;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({ className }) => {
  const [status, setStatus] = useState<UpdateStatus>({
    available: false,
    downloaded: false,
    downloading: false,
    checking: false,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Initialize services
    const initializeServices = async () => {
      await updateService.initialize();
      await versionService.initialize();
      setCurrentVersion(versionService.getCurrentVersion());
    };

    initializeServices();

    // Subscribe to update status changes
    const unsubscribe = updateService.subscribe((newStatus) => {
      setStatus(newStatus);
      
      // Auto-show update dialog when update is available
      if (newStatus.available && !newStatus.checking) {
        setShowUpdateDialog(true);
      }
    });

    return unsubscribe;
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCheckForUpdates = async () => {
    handleMenuClose();
    try {
      await updateService.checkForUpdates(true);
    } catch (error) {
      console.error('Manual update check failed:', error);
    }
  };

  const handleShowUpdateDialog = () => {
    handleMenuClose();
    setShowUpdateDialog(true);
  };

  const handleShowVersionManager = () => {
    handleMenuClose();
    setShowVersionManager(true);
  };

  const handleShowSettings = () => {
    handleMenuClose();
    setShowSettings(true);
  };

  const getUpdateIcon = () => {
    if (status.error) return <Error color="error" />;
    if (status.checking) return <Refresh className="animate-spin" />;
    if (status.downloaded) return <CheckCircle color="success" />;
    if (status.downloading) return <Download color="primary" />;
    if (status.available) return <Update color="primary" />;
    return <Update />;
  };

  const getTooltipText = () => {
    if (status.error) return `Update Error: ${status.error}`;
    if (status.checking) return 'Checking for updates...';
    if (status.downloaded) return 'Update ready to install';
    if (status.downloading) return 'Downloading update...';
    if (status.available) return `Update available: ${status.updateInfo?.version}`;
    return 'Check for updates';
  };

  const shouldShowBadge = () => {
    return status.available || status.downloaded || status.error;
  };

  const getBadgeColor = () => {
    if (status.error) return 'error';
    if (status.downloaded) return 'success';
    return 'primary';
  };

  return (
    <Box className={className}>
      <Tooltip title={getTooltipText()}>
        <IconButton
          onClick={handleMenuOpen}
          color="inherit"
          size="small"
        >
          <Badge
            variant="dot"
            color={getBadgeColor()}
            invisible={!shouldShowBadge()}
          >
            {getUpdateIcon()}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            mt: 1,
          },
        }}
      >
        {/* Current Version */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Current Version
          </Typography>
          <Typography variant="subtitle2">
            PHat5 v{currentVersion}
          </Typography>
        </Box>

        <Divider />

        {/* Update Status */}
        {status.available && (
          <MenuItem onClick={handleShowUpdateDialog}>
            <ListItemIcon>
              <Update color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Update Available"
              secondary={`Version ${status.updateInfo?.version}`}
            />
            <Chip label="New" color="primary" size="small" />
          </MenuItem>
        )}

        {status.downloaded && (
          <MenuItem onClick={handleShowUpdateDialog}>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Update Ready"
              secondary="Click to install and restart"
            />
          </MenuItem>
        )}

        {status.downloading && (
          <MenuItem disabled>
            <ListItemIcon>
              <Download />
            </ListItemIcon>
            <ListItemText
              primary="Downloading Update"
              secondary={`${Math.round(status.progress?.percent || 0)}%`}
            />
          </MenuItem>
        )}

        {status.error && (
          <MenuItem onClick={handleShowUpdateDialog}>
            <ListItemIcon>
              <Error color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Update Error"
              secondary="Click to retry"
            />
          </MenuItem>
        )}

        {/* Actions */}
        <Divider />

        <MenuItem onClick={handleCheckForUpdates} disabled={status.checking}>
          <ListItemIcon>
            <Refresh />
          </ListItemIcon>
          <ListItemText primary="Check for Updates" />
        </MenuItem>

        <MenuItem onClick={handleShowVersionManager}>
          <ListItemIcon>
            <History />
          </ListItemIcon>
          <ListItemText primary="Version History" />
        </MenuItem>

        <MenuItem onClick={handleShowSettings}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Update Settings" />
        </MenuItem>
      </Menu>

      {/* Update Notification Dialog */}
      <UpdateNotification
        open={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
        status={status}
      />

      {/* Version Manager Dialog */}
      <VersionManager
        open={showVersionManager}
        onClose={() => setShowVersionManager(false)}
      />

      {/* Update Settings Dialog */}
      <UpdateSettingsComponent
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Box>
  );
};
