/**
 * Playlist Migration Dialog
 * Helps users migrate their local playlists to their authenticated account
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  PlaylistPlay as PlaylistPlayIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { usePlaylistMigration } from '../../hooks/usePlaylist';
import { useAuth } from '../../contexts/AuthContext';

interface PlaylistMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (result: { success: boolean; migratedCount: number; errors: string[] }) => void;
}

const PlaylistMigrationDialog: React.FC<PlaylistMigrationDialogProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const { user, isAuthenticated } = useAuth();
  const { migrateLocalPlaylistsToUser, canMigrate, hasLocalPlaylists } = usePlaylistMigration();
  
  const [activeStep, setActiveStep] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  } | null>(null);

  const steps = [
    {
      label: 'Review Migration',
      description: 'Understand what will be migrated to your account'
    },
    {
      label: 'Migrate Playlists',
      description: 'Transfer your local playlists to the cloud'
    },
    {
      label: 'Complete',
      description: 'Migration completed successfully'
    }
  ];

  const handleStartMigration = async () => {
    if (!canMigrate) return;

    setIsMigrating(true);
    setActiveStep(1);

    try {
      const result = await migrateLocalPlaylistsToUser();
      setMigrationResult(result);
      setActiveStep(2);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (error: any) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        migratedCount: 0,
        errors: [error.message || 'Migration failed']
      });
      setActiveStep(2);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClose = () => {
    if (!isMigrating) {
      setActiveStep(0);
      setMigrationResult(null);
      onClose();
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your local playlists will be uploaded to your account and synchronized across all your devices.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Migration Benefits:
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CloudUploadIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cloud Backup"
                  secondary="Your playlists will be safely stored in the cloud"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <PlaylistPlayIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cross-Device Access"
                  secondary="Access your playlists from any device"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Automatic Sync"
                  secondary="Changes sync automatically across devices"
                />
              </ListItem>
            </List>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Your local playlists will remain on this device and will be linked to your account.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Migrating your playlists to your account...
            </Typography>
            
            <LinearProgress sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              This may take a few moments depending on the number of playlists.
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box>
            {migrationResult?.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Migration Completed Successfully!</strong>
                </Typography>
                <Typography variant="body2">
                  {migrationResult.migratedCount} playlists have been migrated to your account.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Migration Failed</strong>
                </Typography>
                <Typography variant="body2">
                  Some playlists could not be migrated. Please try again or contact support.
                </Typography>
              </Alert>
            )}

            {migrationResult?.errors && migrationResult.errors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Errors encountered:
                </Typography>
                <List dense>
                  {migrationResult.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={error}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Your playlists are now synchronized with your account and will be available on all your devices.
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Authentication Required</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You must be signed in to migrate your playlists to the cloud.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!hasLocalPlaylists) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>No Playlists to Migrate</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            You don't have any local playlists to migrate to your account.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isMigrating}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon />
          Migrate Playlists to Account
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<InfoIcon />}
            label={`Signed in as ${user?.displayName || user?.email || 'User'}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {step.description}
                </Typography>
                {renderStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions>
        {activeStep === 0 && (
          <>
            <Button onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleStartMigration}
              disabled={!canMigrate}
              startIcon={<CloudUploadIcon />}
            >
              Start Migration
            </Button>
          </>
        )}
        
        {activeStep === 1 && (
          <Button disabled>
            Migrating...
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button onClick={handleClose} variant="contained">
            {migrationResult?.success ? 'Done' : 'Close'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistMigrationDialog;
