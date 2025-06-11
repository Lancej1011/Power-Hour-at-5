/**
 * Version Manager Component
 * Manages version history, backups, and rollback functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Alert,
  Divider,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  History,
  Restore,
  Delete,
  Warning,
  CheckCircle,
  Storage,
  Close,
  Refresh,
} from '@mui/icons-material';
import { versionService, VersionInfo } from '../services/versionService';

interface VersionManagerProps {
  open: boolean;
  onClose: () => void;
}

export const VersionManager: React.FC<VersionManagerProps> = ({
  open,
  onClose,
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [totalBackupSize, setTotalBackupSize] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadVersionHistory();
    }
  }, [open]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const history = versionService.getVersionHistory();
      const current = versionService.getCurrentVersion();
      const backupSize = versionService.getTotalBackupSize();
      
      setVersions(history);
      setCurrentVersion(current);
      setTotalBackupSize(backupSize);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (version: string) => {
    setRollbackVersion(version);
    setShowConfirmDialog(true);
  };

  const confirmRollback = async () => {
    if (!rollbackVersion) return;

    setLoading(true);
    try {
      const success = await versionService.rollbackToVersion(rollbackVersion);
      if (success) {
        // App will restart, so we don't need to update UI
      } else {
        alert('Rollback failed. Please check the logs for more information.');
      }
    } catch (error) {
      console.error('Rollback failed:', error);
      alert('Rollback failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setRollbackVersion(null);
    }
  };

  const handleDeleteBackup = async (version: string) => {
    if (!confirm(`Are you sure you want to delete the backup for version ${version}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const success = await versionService.deleteVersionBackup(version);
      if (success) {
        await loadVersionHistory();
      } else {
        alert('Failed to delete backup.');
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert('Failed to delete backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOldBackups = async () => {
    if (!confirm('This will delete backups for all but the 3 most recent versions. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      await versionService.cleanupOldBackups(3);
      await loadVersionHistory();
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
      alert('Failed to cleanup backups: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: 400,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <History />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Version Manager
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* Current Version Info */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6">
                    Current Version: {currentVersion}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This is the currently running version
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Backup Storage Info */}
          {totalBackupSize > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Storage />
                <Typography>
                  Total backup storage: {formatFileSize(totalBackupSize)}
                </Typography>
              </Box>
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {versions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No version history available
                  </Typography>
                </Box>
              ) : (
                <List>
                  {versions.map((version, index) => (
                    <React.Fragment key={version.version}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                Version {version.version}
                              </Typography>
                              {version.isCurrentVersion && (
                                <Chip
                                  label="Current"
                                  color="success"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {version.canRollback && (
                                <Chip
                                  label="Can Rollback"
                                  color="primary"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Installed: {formatDate(version.installDate)}
                              </Typography>
                              {version.size && (
                                <Typography variant="body2" color="text.secondary">
                                  Backup size: {formatFileSize(version.size)}
                                </Typography>
                              )}
                              {version.releaseNotes && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 1, fontStyle: 'italic' }}
                                >
                                  {version.releaseNotes.substring(0, 100)}
                                  {version.releaseNotes.length > 100 && '...'}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {version.canRollback && (
                              <Tooltip title="Rollback to this version">
                                <IconButton
                                  onClick={() => handleRollback(version.version)}
                                  color="primary"
                                  disabled={loading}
                                >
                                  <Restore />
                                </IconButton>
                              </Tooltip>
                            )}
                            {version.backupPath && !version.isCurrentVersion && (
                              <Tooltip title="Delete backup">
                                <IconButton
                                  onClick={() => handleDeleteBackup(version.version)}
                                  color="error"
                                  disabled={loading}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < versions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            startIcon={<Refresh />}
            onClick={loadVersionHistory}
            disabled={loading}
          >
            Refresh
          </Button>
          {versions.some(v => v.backupPath) && (
            <Button
              startIcon={<Delete />}
              onClick={handleCleanupOldBackups}
              disabled={loading}
              color="warning"
            >
              Cleanup Old Backups
            </Button>
          )}
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Confirm Rollback
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This will rollback PHat5 to version {rollbackVersion} and restart the application.
              Your current settings and data will be preserved, but any features added in newer versions may not be available.
            </Typography>
          </Alert>
          <Typography>
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmRollback}
            color="warning"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Restore />}
          >
            {loading ? 'Rolling Back...' : 'Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
