/**
 * User Profile Component
 * Comprehensive user account management interface
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExitToApp as SignOutIcon,
  Settings as SettingsIcon,
  CloudSync as SyncIcon,
  CloudOff as OfflineIcon,
  Link as LinkIcon,
  Security as SecurityIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { useAuth, useAuthStatus, useUserProfile } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import SyncStatusIndicator from './SyncStatusIndicator';

interface UserProfileProps {
  compact?: boolean;
  showSettings?: boolean;
  onSignOut?: () => void;
  onAccountLinking?: () => void;
  onSecuritySettings?: () => void;
  onAccountManagement?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  compact = false,
  showSettings = true,
  onSignOut,
  onAccountLinking,
  onSecuritySettings,
  onAccountManagement,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const {
    user,
    profile,
    preferences,
    signOut,
    updateProfile,
    updatePreferences,
    canLinkAccount,
    isLoading,
    lastError,
    clearError,
  } = useAuth();

  const {
    isAuthenticated,
    isAnonymous,
    hasFullAccount,
    canAccessCommunityFeatures,
  } = useAuthStatus();

  const { isProfileComplete } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile || {});
  const [editedPreferences, setEditedPreferences] = useState(preferences || {});
  const [isSaving, setIsSaving] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleEdit = () => {
    setEditedProfile(profile || {});
    setEditedPreferences(preferences || {});
    setIsEditing(true);
    clearError();
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setEditedPreferences(preferences || {});
    setIsEditing(false);
    clearError();
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      clearError();
      
      if (editedProfile !== profile) {
        await updateProfile(editedProfile);
      }
      
      if (editedPreferences !== preferences) {
        await updatePreferences(editedPreferences);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut?.();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const getUserDisplayName = () => {
    if (profile?.displayName) return profile.displayName;
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return isAnonymous ? 'Guest User' : 'User';
  };

  const getUserAvatar = () => {
    if (profile?.photoURL) return profile.photoURL;
    if (user.photoURL) return user.photoURL;
    return null;
  };

  const getAccountTypeInfo = () => {
    if (hasFullAccount) {
      return {
        label: 'Google Account',
        icon: <GoogleIcon sx={{ fontSize: 16 }} />,
        color: 'primary' as const,
      };
    } else if (isAnonymous) {
      return {
        label: 'Guest Account',
        icon: <PersonIcon sx={{ fontSize: 16 }} />,
        color: 'secondary' as const,
      };
    }
    return {
      label: 'Account',
      icon: <PersonIcon sx={{ fontSize: 16 }} />,
      color: 'default' as const,
    };
  };

  const accountType = getAccountTypeInfo();

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={getUserAvatar() || undefined}
          sx={{
            width: 32,
            height: 32,
            bgcolor: currentTheme.primary,
          }}
        >
          {getUserDisplayName().charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {getUserDisplayName()}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {accountType.label}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Card sx={{ 
      borderRadius: 3,
      background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* Error Display */}
        {lastError && (
          <Alert 
            severity="error" 
            onClose={clearError}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {lastError.message}
          </Alert>
        )}

        {/* Profile Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
          <Avatar
            src={getUserAvatar() || undefined}
            sx={{
              width: 80,
              height: 80,
              bgcolor: currentTheme.primary,
              fontSize: '2rem',
              fontWeight: 600,
            }}
          >
            {getUserDisplayName().charAt(0).toUpperCase()}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h6" fontWeight={600} noWrap>
                {getUserDisplayName()}
              </Typography>
              <Chip
                icon={accountType.icon}
                label={accountType.label}
                size="small"
                color={accountType.color}
                variant="outlined"
              />
            </Box>
            
            {user.email && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {canAccessCommunityFeatures ? (
                <Chip
                  icon={<SyncIcon sx={{ fontSize: 14 }} />}
                  label="Community Access"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<OfflineIcon sx={{ fontSize: 14 }} />}
                  label="Local Only"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}

              {/* Sync Status Indicator */}
              <SyncStatusIndicator compact />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing ? (
              <>
                <Tooltip title="Edit Profile">
                  <IconButton
                    onClick={handleEdit}
                    disabled={isLoading}
                    sx={{
                      color: 'primary.main',
                      '&:hover': { backgroundColor: alpha(currentTheme.primary, 0.1) },
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sign Out">
                  <IconButton
                    onClick={handleSignOut}
                    disabled={isLoading}
                    sx={{
                      color: 'error.main',
                      '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) },
                    }}
                  >
                    <SignOutIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Save Changes">
                  <IconButton
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{
                      color: 'success.main',
                      '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) },
                    }}
                  >
                    {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton
                    onClick={handleCancel}
                    disabled={isSaving}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.1) },
                    }}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Profile Information */}
        <Stack spacing={3}>
          {isEditing ? (
            <>
              <TextField
                label="Display Name"
                value={editedProfile.displayName || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                fullWidth
                size="small"
              />
              
              {showSettings && (
                <>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Preferences
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editedPreferences.enableNotifications || false}
                        onChange={(e) => setEditedPreferences({ 
                          ...editedPreferences, 
                          enableNotifications: e.target.checked 
                        })}
                      />
                    }
                    label="Enable Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editedPreferences.autoSync || true}
                        onChange={(e) => setEditedPreferences({ 
                          ...editedPreferences, 
                          autoSync: e.target.checked 
                        })}
                      />
                    }
                    label="Auto-sync Data"
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Account Status
                </Typography>
                <Typography variant="body2">
                  {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                </Typography>
              </Box>
              
              {showSettings && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Settings
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Notifications: {preferences?.enableNotifications ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Typography variant="body2">
                      Auto-sync: {preferences?.autoSync !== false ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Stack>

        {/* Account Management Actions */}
        {!isEditing && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Account Management
            </Typography>
            <Stack spacing={1}>
              {/* Account Linking */}
              {canLinkAccount() && (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={onAccountLinking}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Link Account to Email
                </Button>
              )}

              {/* Security Settings */}
              <Button
                variant="outlined"
                startIcon={<SecurityIcon />}
                onClick={onSecuritySettings}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                Security Settings
              </Button>

              {/* Account Management */}
              <Button
                variant="outlined"
                startIcon={<AccountIcon />}
                onClick={onAccountManagement}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                Account Management
              </Button>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfile;
