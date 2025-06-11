/**
 * Update Settings Component
 * Allows users to configure auto-update preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Settings,
  Close,
  Update,
  Schedule,
  Download,
  InstallDesktop,
  BugReport,
} from '@mui/icons-material';
import { updateService, UpdateSettings } from '../services/updateService';

interface UpdateSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const UpdateSettingsComponent: React.FC<UpdateSettingsProps> = ({
  open,
  onClose,
}) => {
  const [settings, setSettings] = useState<UpdateSettings>({
    autoCheck: true,
    checkInterval: 24,
    autoDownload: true,
    autoInstall: false,
    allowPrerelease: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = () => {
    const currentSettings = updateService.getSettings();
    setSettings(currentSettings);
    setHasChanges(false);
  };

  const handleSettingChange = (key: keyof UpdateSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateService.updateSettings(settings);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    loadSettings();
  };

  const formatLastChecked = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
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
          minHeight: 500,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Settings />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Update Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Auto-Check Settings */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Update color="primary" />
              <Typography variant="h6">
                Automatic Updates
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoCheck}
                  onChange={(e) => handleSettingChange('autoCheck', e.target.checked)}
                />
              }
              label="Automatically check for updates"
              sx={{ mb: 2 }}
            />

            {settings.autoCheck && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Check Interval</InputLabel>
                <Select
                  value={settings.checkInterval}
                  label="Check Interval"
                  onChange={(e) => handleSettingChange('checkInterval', e.target.value)}
                  startAdornment={<Schedule sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value={1}>Every hour</MenuItem>
                  <MenuItem value={6}>Every 6 hours</MenuItem>
                  <MenuItem value={12}>Every 12 hours</MenuItem>
                  <MenuItem value={24}>Daily</MenuItem>
                  <MenuItem value={168}>Weekly</MenuItem>
                </Select>
              </FormControl>
            )}

            <Typography variant="body2" color="text.secondary">
              Last checked: {formatLastChecked(settings.lastChecked)}
            </Typography>
          </CardContent>
        </Card>

        {/* Download Settings */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Download color="primary" />
              <Typography variant="h6">
                Download Behavior
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoDownload}
                  onChange={(e) => handleSettingChange('autoDownload', e.target.checked)}
                  disabled={!settings.autoCheck}
                />
              }
              label="Automatically download updates when available"
              sx={{ mb: 1 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Updates will be downloaded in the background and you'll be notified when ready to install.
            </Typography>
          </CardContent>
        </Card>

        {/* Installation Settings */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InstallDesktop color="primary" />
              <Typography variant="h6">
                Installation Behavior
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoInstall}
                  onChange={(e) => handleSettingChange('autoInstall', e.target.checked)}
                  disabled={!settings.autoDownload}
                />
              }
              label="Automatically install updates and restart"
              sx={{ mb: 1 }}
            />

            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Not recommended:</strong> Auto-installation will restart the application without warning.
                It's better to install updates manually when convenient.
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Beta/Prerelease Settings */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BugReport color="primary" />
              <Typography variant="h6">
                Beta Updates
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowPrerelease}
                  onChange={(e) => handleSettingChange('allowPrerelease', e.target.checked)}
                />
              }
              label="Include beta and pre-release versions"
              sx={{ mb: 1 }}
            />

            <Alert severity="info">
              <Typography variant="body2">
                Beta versions may contain new features but could be less stable.
                Only enable this if you want to help test new features.
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Information */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Privacy Note:</strong> Update checks only send your current version number to GitHub.
            No personal data or usage information is transmitted.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleReset} disabled={!hasChanges}>
          Reset
        </Button>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};
