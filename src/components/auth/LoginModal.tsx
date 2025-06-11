/**
 * Login Modal Component
 * Modern authentication modal with Google and Anonymous sign-in options
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Fade,
  useTheme,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Security as SecurityIcon,
  CloudOff as OfflineIcon,
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
  LockReset as LockResetIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import EmailSignIn from './EmailSignIn';
import SignUpForm from './SignUpForm';
import PasswordReset from './PasswordReset';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  requireAuth?: boolean;
  showAnonymousOption?: boolean;
  showEmailOption?: boolean;
  defaultMode?: 'social' | 'email' | 'signup' | 'reset';
  onSuccess?: () => void;
}

type AuthMode = 'social' | 'email' | 'signup' | 'reset';

const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  title = "Welcome to Power Hour",
  subtitle = "Sign in to access all features and sync your data across devices",
  requireAuth = false,
  showAnonymousOption = true,
  showEmailOption = true,
  defaultMode = 'social',
  onSuccess,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const {
    signInWithGoogle,
    signInAnonymously,
    isLoading,
    lastError,
    clearError,
    isAuthenticated,
  } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>(defaultMode);
  const [localLoading, setLocalLoading] = useState<'google' | 'anonymous' | null>(null);

  // Close modal when authentication succeeds
  useEffect(() => {
    if (isAuthenticated && open) {
      onSuccess?.();
      onClose();
    }
  }, [isAuthenticated, open, onClose, onSuccess]);

  // Clear errors and reset mode when modal opens
  useEffect(() => {
    if (open) {
      clearError();
      setLocalLoading(null);
      setAuthMode(defaultMode);
    }
  }, [open, clearError, defaultMode]);

  const handleGoogleSignIn = async () => {
    try {
      setLocalLoading('google');
      clearError();
      await signInWithGoogle();
    } catch (error) {
      // Error is handled by the auth store and displayed in the UI
    } finally {
      setLocalLoading(null);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setLocalLoading('anonymous');
      clearError();
      await signInAnonymously();
    } catch (error) {
      // Error is handled by the auth store and displayed in the UI
    } finally {
      setLocalLoading(null);
    }
  };

  const handleClose = () => {
    if (!requireAuth && !isLoading && !localLoading) {
      clearError();
      onClose();
    }
  };

  const isAnyLoading = isLoading || localLoading !== null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      }}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
            color: 'white',
          }}>
            <SecurityIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Box>
        
        {!requireAuth && (
          <IconButton
            onClick={handleClose}
            disabled={isAnyLoading}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 3 }}>
        {/* Authentication Mode Tabs */}
        {showEmailOption && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={authMode}
              onChange={(_, newValue) => setAuthMode(newValue)}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                },
              }}
            >
              <Tab
                label="Quick Sign In"
                value="social"
                icon={<GoogleIcon />}
                iconPosition="start"
              />
              <Tab
                label="Email"
                value="email"
                icon={<EmailIcon />}
                iconPosition="start"
              />
              <Tab
                label="Sign Up"
                value="signup"
                icon={<PersonAddIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>
        )}

        {/* Content based on auth mode */}
        {authMode === 'social' && (
          <Stack spacing={3}>
            {/* Error Display */}
            {lastError && (
              <Alert
                severity="error"
                onClose={clearError}
                sx={{ borderRadius: 2 }}
              >
                {lastError.message}
              </Alert>
            )}

            {/* Sign-in Options */}
            <Stack spacing={2}>
            {/* Google Sign-in */}
            <Paper
              elevation={0}
              sx={{
                p: 0,
                borderRadius: 2,
                border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: alpha(currentTheme.primary, 0.3),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(currentTheme.primary, 0.15)}`,
                },
              }}
            >
              <Button
                fullWidth
                size="large"
                onClick={handleGoogleSignIn}
                disabled={isAnyLoading}
                startIcon={
                  localLoading === 'google' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <GoogleIcon sx={{ color: '#4285f4' }} />
                  )
                }
                sx={{
                  py: 2,
                  px: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: 'text.primary',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(currentTheme.primary, 0.05),
                  },
                  '&:disabled': {
                    backgroundColor: 'transparent',
                  },
                }}
              >
                Continue with Google
              </Button>
            </Paper>

            {/* Divider */}
            {showAnonymousOption && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}

            {/* Anonymous Sign-in */}
            {showAnonymousOption && (
              <Paper
                elevation={0}
                sx={{
                  p: 0,
                  borderRadius: 2,
                  border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.15)}`,
                  },
                }}
              >
                <Button
                  fullWidth
                  size="large"
                  onClick={handleAnonymousSignIn}
                  disabled={isAnyLoading}
                  startIcon={
                    localLoading === 'anonymous' ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PersonIcon />
                    )
                  }
                  sx={{
                    py: 2,
                    px: 3,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: 'text.primary',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    },
                    '&:disabled': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Continue as Guest
                </Button>
              </Paper>
            )}
          </Stack>

          {/* Feature Benefits */}
          <Box sx={{ 
            p: 2, 
            borderRadius: 2, 
            backgroundColor: alpha(currentTheme.primary, 0.05),
            border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: currentTheme.primary }}>
              🎵 Unlock Premium Features
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                ☁️ Sync your playlists across all devices
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🌍 Share playlists with the community
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ⚙️ Save your preferences and custom themes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🎯 Get personalized music recommendations
              </Typography>
            </Stack>
          </Box>

          {/* Privacy & Security Notice */}
          <Box sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}>
            <SecurityIcon sx={{ fontSize: 16, color: 'info.main', mt: 0.2 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                🔒 Your privacy is protected
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Data is saved locally and synced securely when you sign in. You can use the app without an account.
              </Typography>
            </Box>
          </Box>
        </Stack>
        )}

        {/* Email Sign In Mode */}
        {authMode === 'email' && (
          <EmailSignIn
            onSuccess={() => {
              onSuccess?.();
              onClose();
            }}
            onSwitchToSignUp={() => setAuthMode('signup')}
            onForgotPassword={() => setAuthMode('reset')}
            showSignUpLink={true}
            showForgotPassword={true}
          />
        )}

        {/* Sign Up Mode */}
        {authMode === 'signup' && (
          <SignUpForm
            onSuccess={() => {
              onSuccess?.();
              onClose();
            }}
            onSwitchToSignIn={() => setAuthMode('email')}
            showSignInLink={true}
          />
        )}

        {/* Password Reset Mode */}
        {authMode === 'reset' && (
          <PasswordReset
            onBack={() => setAuthMode('email')}
            onSuccess={() => setAuthMode('email')}
            showBackButton={true}
          />
        )}

        {/* Email Option Link for Social Mode */}
        {authMode === 'social' && showEmailOption && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="text"
              startIcon={<EmailIcon />}
              onClick={() => setAuthMode('email')}
              disabled={isAnyLoading}
              sx={{
                textTransform: 'none',
                color: currentTheme.primary,
                '&:hover': {
                  backgroundColor: alpha(currentTheme.primary, 0.05),
                },
              }}
            >
              Sign in with Email Instead
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions */}
      {!requireAuth && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={isAnyLoading}
            sx={{ textTransform: 'none' }}
          >
            Maybe Later
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default LoginModal;
