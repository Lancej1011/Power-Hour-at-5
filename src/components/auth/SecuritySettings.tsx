/**
 * Security Settings Component
 * Manages user security settings and password changes
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Shield as ShieldIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { validateNewPassword } from '../../utils/authValidation';

interface SecuritySettingsProps {
  showAsCard?: boolean;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  showAsCard = true,
}) => {
  const theme = useTheme();
  const {
    user,
    updatePassword,
    sendEmailVerification,
    isLoading,
    lastError,
    clearError,
  } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Security settings state (these would typically come from user preferences)
  const [securitySettings, setSecuritySettings] = useState({
    emailVerificationRequired: true,
    twoFactorEnabled: false,
    securityNotifications: true,
    loginNotifications: true,
  });

  // Handle password form changes
  const handlePasswordFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(prev => ({ ...prev, [field]: event.target.value }));
    
    // Clear errors and success state when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (lastError) {
      clearError();
    }
    if (passwordUpdateSuccess) {
      setPasswordUpdateSuccess(false);
    }
  };

  // Handle password visibility toggle
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    // Validate passwords
    const validation = validateNewPassword(
      passwordForm.currentPassword,
      passwordForm.newPassword,
      passwordForm.confirmNewPassword
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsUpdatingPassword(true);
    setValidationErrors([]);

    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordUpdateSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      console.log('✅ Password updated successfully');
    } catch (error: any) {
      console.error('❌ Password update failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle email verification
  const handleSendEmailVerification = async () => {
    setIsSendingVerification(true);
    try {
      await sendEmailVerification();
      setVerificationSent(true);
      console.log('✅ Email verification sent');
    } catch (error: any) {
      console.error('❌ Email verification failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Handle security setting changes
  const handleSecuritySettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSecuritySettings(prev => ({ ...prev, [setting]: event.target.checked }));
    // In a real app, this would save to the backend
  };

  // Check if user can change password (not anonymous)
  const canChangePassword = user && !user.isAnonymous && user.email;

  const content = (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Security Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account security and privacy settings
          </Typography>
        </Box>
      </Box>

      {/* Account Status */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Account Security Status
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Account Type:
              </Typography>
              <Chip
                label={user?.isAnonymous ? 'Anonymous' : 'Full Account'}
                color={user?.isAnonymous ? 'warning' : 'success'}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Email Verification:
              </Typography>
              <Chip
                label={user?.emailVerified ? 'Verified' : 'Not Verified'}
                color={user?.emailVerified ? 'success' : 'error'}
                size="small"
                icon={user?.emailVerified ? <CheckIcon /> : <WarningIcon />}
              />
            </Box>
            {user?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Email Address:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Email Verification */}
      {user?.email && !user.emailVerified && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Email not verified:</strong> Please verify your email address to secure your account.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSendEmailVerification}
            disabled={isSendingVerification || verificationSent}
            startIcon={isSendingVerification ? <CircularProgress size={16} /> : <EmailIcon />}
            sx={{ mt: 1 }}
          >
            {verificationSent ? 'Verification Sent' : 'Send Verification Email'}
          </Button>
        </Alert>
      )}

      {verificationSent && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Verification email sent! Check your inbox and click the verification link.
          </Typography>
        </Alert>
      )}

      {/* Password Change Section */}
      {canChangePassword && (
        <>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon />
            Change Password
          </Typography>

          {/* Success Message */}
          {passwordUpdateSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Password updated successfully! Please sign in again on other devices.
              </Typography>
            </Alert>
          )}

          {/* Error Display */}
          {(validationErrors.length > 0 || lastError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.length > 0 ? (
                <Box>
                  {validationErrors.map((error, index) => (
                    <Typography key={index} variant="body2">
                      {error}
                    </Typography>
                  ))}
                </Box>
              ) : (
                lastError?.message || 'Password update failed. Please try again.'
              )}
            </Alert>
          )}

          <Stack spacing={2} sx={{ mb: 3 }}>
            {/* Current Password */}
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={handlePasswordFormChange('currentPassword')}
              disabled={isUpdatingPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      disabled={isUpdatingPassword}
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="current-password"
            />

            {/* New Password */}
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={handlePasswordFormChange('newPassword')}
              disabled={isUpdatingPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      disabled={isUpdatingPassword}
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="new-password"
            />

            {/* Confirm New Password */}
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirmNewPassword}
              onChange={handlePasswordFormChange('confirmNewPassword')}
              disabled={isUpdatingPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      disabled={isUpdatingPassword}
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="new-password"
            />

            <Button
              variant="contained"
              onClick={handlePasswordUpdate}
              disabled={
                isUpdatingPassword ||
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmNewPassword
              }
              startIcon={isUpdatingPassword ? <CircularProgress size={16} /> : <LockIcon />}
            >
              {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Security Preferences */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldIcon />
        Security Preferences
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <EmailIcon />
          </ListItemIcon>
          <ListItemText
            primary="Email Verification Required"
            secondary="Require email verification for account security"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={securitySettings.emailVerificationRequired}
              onChange={handleSecuritySettingChange('emailVerificationRequired')}
              disabled={!canChangePassword}
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <ShieldIcon />
          </ListItemIcon>
          <ListItemText
            primary="Two-Factor Authentication"
            secondary="Add an extra layer of security (Coming Soon)"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={securitySettings.twoFactorEnabled}
              onChange={handleSecuritySettingChange('twoFactorEnabled')}
              disabled={true} // Coming soon
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <NotificationsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Security Notifications"
            secondary="Get notified about security-related account changes"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={securitySettings.securityNotifications}
              onChange={handleSecuritySettingChange('securityNotifications')}
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <NotificationsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Login Notifications"
            secondary="Get notified when someone signs into your account"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={securitySettings.loginNotifications}
              onChange={handleSecuritySettingChange('loginNotifications')}
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>

      {/* Anonymous Account Notice */}
      {user?.isAnonymous && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Anonymous Account:</strong> Link your account to an email address to access advanced security features.
          </Typography>
        </Alert>
      )}
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

export default SecuritySettings;
