/**
 * Authentication Status Indicator Component
 * Compact status display for headers and navigation
 */

import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Login as LoginIcon,
  Person as PersonIcon,
  Google as GoogleIcon,
  Settings as SettingsIcon,
  ExitToApp as SignOutIcon,
  Sync as SyncIcon,
  CloudOff as OfflineIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useAuth, useAuthStatus } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import LoginModal from './LoginModal';

interface AuthStatusIndicatorProps {
  variant?: 'button' | 'avatar' | 'compact';
  showLabel?: boolean;
  showStatus?: boolean;
  onProfileClick?: () => void;
  onLoginSuccess?: () => void;
}

const AuthStatusIndicator: React.FC<AuthStatusIndicatorProps> = ({
  variant = 'avatar',
  showLabel = true,
  showStatus = true,
  onProfileClick,
  onLoginSuccess,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const {
    user,
    profile,
    signOut,
    isLoading,
  } = useAuth();

  const {
    isAuthenticated,
    isAnonymous,
    hasFullAccount,
    canAccessCommunityFeatures,
  } = useAuthStatus();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLoginClick = () => {
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
    onLoginSuccess?.();
  };

  const handleProfileClick = () => {
    handleMenuClose();
    onProfileClick?.();
  };

  const handleSignOut = async () => {
    try {
      handleMenuClose();
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const getUserDisplayName = () => {
    if (profile?.displayName) return profile.displayName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return isAnonymous ? 'Guest' : 'User';
  };

  const getUserAvatar = () => {
    if (profile?.photoURL) return profile.photoURL;
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  const getStatusInfo = () => {
    if (!isAuthenticated) {
      return {
        label: 'Sign In',
        color: 'default' as const,
        icon: <LoginIcon sx={{ fontSize: 16 }} />,
      };
    }
    
    if (hasFullAccount) {
      return {
        label: 'Google',
        color: 'primary' as const,
        icon: <GoogleIcon sx={{ fontSize: 16 }} />,
      };
    }
    
    if (isAnonymous) {
      return {
        label: 'Guest',
        color: 'secondary' as const,
        icon: <PersonIcon sx={{ fontSize: 16 }} />,
      };
    }
    
    return {
      label: 'User',
      color: 'default' as const,
      icon: <PersonIcon sx={{ fontSize: 16 }} />,
    };
  };

  const statusInfo = getStatusInfo();

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        {showLabel && (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        )}
      </Box>
    );
  }

  // Not authenticated - show login button
  if (!isAuthenticated) {
    if (variant === 'button') {
      return (
        <>
          <Button
            variant="outlined"
            startIcon={<LoginIcon />}
            onClick={handleLoginClick}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: alpha(currentTheme.primary, 0.3),
              color: currentTheme.primary,
              '&:hover': {
                borderColor: currentTheme.primary,
                backgroundColor: alpha(currentTheme.primary, 0.05),
              },
            }}
          >
            Sign In
          </Button>
          <LoginModal
            open={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onSuccess={handleLoginSuccess}
          />
        </>
      );
    }

    return (
      <>
        <Tooltip title="Sign in to access all features">
          <IconButton
            onClick={handleLoginClick}
            sx={{
              color: currentTheme.primary,
              backgroundColor: alpha(currentTheme.primary, 0.1),
              border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
              '&:hover': {
                backgroundColor: alpha(currentTheme.primary, 0.2),
              },
            }}
          >
            <LoginIcon />
          </IconButton>
        </Tooltip>
        <LoginModal
          open={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // Authenticated - show user info and menu
  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          src={getUserAvatar() || undefined}
          sx={{
            width: 24,
            height: 24,
            bgcolor: currentTheme.primary,
            fontSize: '0.75rem',
          }}
        >
          {getUserDisplayName().charAt(0).toUpperCase()}
        </Avatar>
        {showStatus && (
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            size="small"
            color={statusInfo.color}
            variant="outlined"
            sx={{ height: 24 }}
          />
        )}
      </Box>
    );
  }

  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={
            <Avatar
              src={getUserAvatar() || undefined}
              sx={{
                width: 20,
                height: 20,
                bgcolor: currentTheme.primary,
                fontSize: '0.75rem',
              }}
            >
              {getUserDisplayName().charAt(0).toUpperCase()}
            </Avatar>
          }
          endIcon={<ExpandMoreIcon />}
          onClick={handleMenuOpen}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            borderColor: alpha(theme.palette.divider, 0.3),
            '&:hover': {
              borderColor: alpha(currentTheme.primary, 0.3),
              backgroundColor: alpha(currentTheme.primary, 0.05),
            },
          }}
        >
          {showLabel && getUserDisplayName()}
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              minWidth: 200,
              mt: 1,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {getUserDisplayName()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email || statusInfo.label}
            </Typography>
          </Box>
          
          <Divider />
          
          <MenuItem onClick={handleProfileClick}>
            <SettingsIcon sx={{ mr: 2, fontSize: 20 }} />
            Profile & Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleSignOut}>
            <SignOutIcon sx={{ mr: 2, fontSize: 20 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </>
    );
  }

  // Default avatar variant
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`${getUserDisplayName()} (${statusInfo.label})`}>
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              p: 0,
              border: `2px solid ${alpha(currentTheme.primary, 0.2)}`,
              '&:hover': {
                borderColor: currentTheme.primary,
              },
            }}
          >
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
          </IconButton>
        </Tooltip>
        
        {showStatus && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {canAccessCommunityFeatures ? (
              <Tooltip title="Community features available">
                <SyncIcon sx={{ fontSize: 16, color: 'success.main' }} />
              </Tooltip>
            ) : (
              <Tooltip title="Local storage only">
                <OfflineIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 220,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              src={getUserAvatar() || undefined}
              sx={{
                width: 40,
                height: 40,
                bgcolor: currentTheme.primary,
              }}
            >
              {getUserDisplayName().charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {getUserDisplayName()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || statusInfo.label}
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            size="small"
            color={statusInfo.color}
            variant="outlined"
          />
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleProfileClick}>
          <SettingsIcon sx={{ mr: 2, fontSize: 20 }} />
          Profile & Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleSignOut}>
          <SignOutIcon sx={{ mr: 2, fontSize: 20 }} />
          Sign Out
        </MenuItem>
      </Menu>
    </>
  );
};

export default AuthStatusIndicator;
