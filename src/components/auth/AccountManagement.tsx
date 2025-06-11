/**
 * Account Management Component
 * Comprehensive account management interface
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Link as LinkIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface AccountManagementProps {
  showAsCard?: boolean;
  onAccountLinked?: () => void;
  onSecuritySettings?: () => void;
}

const AccountManagement: React.FC<AccountManagementProps> = ({
  showAsCard = true,
  onAccountLinked,
  onSecuritySettings,
}) => {
  const theme = useTheme();
  const {
    user,
    profile,
    preferences,
    canLinkAccount,
    signOut,
  } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Handle data export
  const handleDataExport = () => {
    const userData = {
      profile,
      preferences,
      exportDate: new Date().toISOString(),
      accountType: user?.isAnonymous ? 'anonymous' : 'full',
      email: user?.email || null,
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `power-hour-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportDialogOpen(false);
    console.log('✅ User data exported');
  };

  // Handle account deletion (placeholder)
  const handleAccountDeletion = async () => {
    // In a real app, this would delete the user account
    console.log('🗑️ Account deletion requested');
    setDeleteDialogOpen(false);
    
    // For now, just sign out
    await signOut();
  };

  const content = (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AccountIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Account Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account settings and data
          </Typography>
        </Box>
      </Box>

      {/* Account Overview */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Account Overview
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Account Type:
              </Typography>
              <Chip
                label={user?.isAnonymous ? 'Anonymous Account' : 'Full Account'}
                color={user?.isAnonymous ? 'warning' : 'success'}
                size="small"
              />
            </Box>
            
            {user?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Email:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            )}

            {profile?.username && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Username:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.username}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Member Since:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Typography variant="h6" gutterBottom>
        Account Actions
      </Typography>

      <List>
        {/* Account Linking */}
        {canLinkAccount() && (
          <ListItem>
            <ListItemIcon>
              <LinkIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Link Account"
              secondary="Upgrade your anonymous account to a full account with email"
            />
            <ListItemSecondaryAction>
              <Button
                variant="contained"
                size="small"
                onClick={onAccountLinked}
                startIcon={<LinkIcon />}
              >
                Link Account
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        )}

        {/* Security Settings */}
        <ListItem>
          <ListItemIcon>
            <SecurityIcon />
          </ListItemIcon>
          <ListItemText
            primary="Security Settings"
            secondary="Manage passwords, email verification, and security preferences"
          />
          <ListItemSecondaryAction>
            <Button
              variant="outlined"
              size="small"
              onClick={onSecuritySettings}
              startIcon={<SecurityIcon />}
            >
              Manage
            </Button>
          </ListItemSecondaryAction>
        </ListItem>

        {/* Data Export */}
        <ListItem>
          <ListItemIcon>
            <DownloadIcon />
          </ListItemIcon>
          <ListItemText
            primary="Export Data"
            secondary="Download a copy of your account data and preferences"
          />
          <ListItemSecondaryAction>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setExportDialogOpen(true)}
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Data & Storage */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon />
        Data & Storage
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Playlists Created:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.stats?.playlistsCreated || 0}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Playlists Shared:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.stats?.playlistsShared || 0}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Total Logins:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.stats?.totalLogins || 0}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Data Storage:
              </Typography>
              <Chip
                label={user?.isAnonymous ? 'Local Only' : 'Cloud Synced'}
                color={user?.isAnonymous ? 'warning' : 'success'}
                size="small"
                icon={user?.isAnonymous ? <StorageIcon /> : <CloudDownloadIcon />}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Typography variant="h6" gutterBottom sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon />
        Danger Zone
      </Typography>

      <Card variant="outlined" sx={{ borderColor: 'error.main', backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
        <CardContent>
          <Typography variant="subtitle2" color="error.main" gutterBottom>
            Delete Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<DeleteIcon />}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Anonymous Account Notice */}
      {user?.isAnonymous && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Anonymous Account:</strong> Your data is stored locally. Link your account to an email address to enable cloud sync and access from multiple devices.
          </Typography>
        </Alert>
      )}

      {/* Data Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Account Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will download a JSON file containing your account data including:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>User profile information</li>
            <li>App preferences and settings</li>
            <li>Account statistics</li>
            <li>Export timestamp</li>
          </Box>
          <Alert severity="info">
            <Typography variant="body2">
              Playlist data is not included in this export. Use the playlist export features to backup your playlists.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDataExport} variant="contained" startIcon={<DownloadIcon />}>
            Download Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This action is permanent and cannot be undone.
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Deleting your account will:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Permanently delete your profile and preferences</li>
            <li>Remove all your shared playlists from the community</li>
            <li>Delete your account statistics and history</li>
            <li>Sign you out of all devices</li>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Consider exporting your data before proceeding.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAccountDeletion} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  if (showAsCard) {
    return (
      <Card sx={{ 
        maxWidth: 800, 
        mx: 'auto',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
      }}>
        <CardContent sx={{ p: 3 }}>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default AccountManagement;
