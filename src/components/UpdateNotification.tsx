/**
 * Update Notification Component
 * Shows update availability, progress, and controls
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Download,
  Update,
  CheckCircle,
  Error,
  ExpandMore,
  ExpandLess,
  Refresh,
  Close,
} from '@mui/icons-material';
import { updateService, UpdateStatus, UpdateInfo } from '../services/updateService';

interface UpdateNotificationProps {
  open: boolean;
  onClose: () => void;
  status: UpdateStatus;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  open,
  onClose,
  status,
}) => {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await updateService.downloadUpdate();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await updateService.installUpdate();
    } catch (error) {
      console.error('Installation failed:', error);
      setIsInstalling(false);
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      await updateService.checkForUpdates(true);
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatProgress = (progress?: { percent: number; transferred: number; total: number }) => {
    if (!progress) return '';
    const transferredMB = progress.transferred / (1024 * 1024);
    const totalMB = progress.total / (1024 * 1024);
    return `${transferredMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`;
  };

  const getDialogTitle = () => {
    if (status.checking) return 'Checking for Updates';
    if (status.downloading) return 'Downloading Update';
    if (status.downloaded) return 'Update Ready to Install';
    if (status.available) return 'Update Available';
    if (status.error) return 'Update Error';
    return 'No Updates Available';
  };

  const getStatusIcon = () => {
    if (status.checking) return <Refresh className="animate-spin" />;
    if (status.downloading) return <Download />;
    if (status.downloaded) return <CheckCircle color="success" />;
    if (status.available) return <Update color="primary" />;
    if (status.error) return <Error color="error" />;
    return <CheckCircle color="success" />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 200,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {getStatusIcon()}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {getDialogTitle()}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {status.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {status.error}
          </Alert>
        )}

        {status.checking && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Checking for updates...
            </Typography>
          </Box>
        )}

        {status.available && status.updateInfo && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6">
                Version {status.updateInfo.version}
              </Typography>
              <Chip
                label="New"
                color="primary"
                size="small"
                variant="outlined"
              />
            </Box>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Release Date"
                  secondary={new Date(status.updateInfo.releaseDate).toLocaleDateString()}
                />
              </ListItem>
              {status.updateInfo.size && (
                <ListItem>
                  <ListItemText
                    primary="Download Size"
                    secondary={formatFileSize(status.updateInfo.size)}
                  />
                </ListItem>
              )}
            </List>

            {status.updateInfo.releaseNotes && (
              <>
                <Button
                  startIcon={showReleaseNotes ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                  sx={{ mb: 1 }}
                >
                  Release Notes
                </Button>
                <Collapse in={showReleaseNotes}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 2,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                    >
                      {status.updateInfo.releaseNotes}
                    </Typography>
                  </Box>
                </Collapse>
              </>
            )}
          </Box>
        )}

        {status.downloading && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Downloading update...
            </Typography>
            <LinearProgress
              variant={status.progress ? 'determinate' : 'indeterminate'}
              value={status.progress?.percent || 0}
              sx={{ mb: 1 }}
            />
            {status.progress && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  {Math.round(status.progress.percent)}%
                </Typography>
                <Typography variant="caption">
                  {formatProgress(status.progress)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {status.downloaded && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Update downloaded successfully! The application will restart to complete the installation.
          </Alert>
        )}

        {!status.available && !status.checking && !status.error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              You're up to date!
            </Typography>
            <Typography color="text.secondary">
              PHat5 is running the latest version.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {status.available && !status.downloaded && !status.downloading && (
          <>
            <Button onClick={onClose}>
              Later
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              Download Update
            </Button>
          </>
        )}

        {status.downloaded && (
          <>
            <Button onClick={onClose}>
              Install Later
            </Button>
            <Button
              variant="contained"
              startIcon={<Update />}
              onClick={handleInstall}
              disabled={isInstalling}
              color="success"
            >
              Install & Restart
            </Button>
          </>
        )}

        {status.error && (
          <>
            <Button onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleCheckForUpdates}
            >
              Try Again
            </Button>
          </>
        )}

        {!status.available && !status.checking && !status.error && (
          <>
            <Button onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleCheckForUpdates}
            >
              Check Again
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
