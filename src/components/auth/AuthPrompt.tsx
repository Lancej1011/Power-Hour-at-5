import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useAuth, useAuthStatus } from '../../contexts/AuthContext';
import LoginModal from './LoginModal';

interface AuthPromptProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  feature: string;
  title?: string;
  message?: string;
  requireNonAnonymous?: boolean;
  showFeatureBenefits?: boolean;
}

const AuthPrompt: React.FC<AuthPromptProps> = ({
  open,
  onClose,
  onSuccess,
  feature,
  title,
  message,
  requireNonAnonymous = false,
  showFeatureBenefits = true,
}) => {
  const { user } = useAuth();
  const { isAuthenticated, isAnonymous, hasFullAccount } = useAuthStatus();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Determine the appropriate title and message based on auth state and requirements
  const getPromptContent = () => {
    if (!isAuthenticated) {
      return {
        title: title || 'Sign In Required',
        message: message || `You need to sign in to access ${feature}.`,
        buttonText: 'Sign In',
        icon: <PersonIcon />,
      };
    }

    if (requireNonAnonymous && isAnonymous) {
      return {
        title: title || 'Full Account Required',
        message: message || `You need a full account to access ${feature}. Anonymous accounts cannot use this feature.`,
        buttonText: 'Upgrade Account',
        icon: <SecurityIcon />,
      };
    }

    // Fallback (shouldn't normally reach here)
    return {
      title: title || 'Authentication Required',
      message: message || `Authentication is required to access ${feature}.`,
      buttonText: 'Continue',
      icon: <LockIcon />,
    };
  };

  const promptContent = getPromptContent();

  // Feature benefits for different features
  const getFeatureBenefits = () => {
    const benefits: Record<string, string[]> = {
      'community features': [
        'Share your playlists with the community',
        'Discover amazing playlists from other users',
        'Rate and review community playlists',
        'Track your playlist downloads and favorites',
      ],
      'playlist sharing': [
        'Share your playlists publicly or privately',
        'Get feedback and ratings from other users',
        'Build your reputation in the community',
        'Access advanced sharing options',
      ],
      'advanced features': [
        'Sync your data across devices',
        'Access premium features',
        'Enhanced playlist management',
        'Priority support',
      ],
    };

    return benefits[feature.toLowerCase()] || [
      'Enhanced user experience',
      'Access to premium features',
      'Data synchronization',
      'Community participation',
    ];
  };

  const handleAuthAction = () => {
    setLoginModalOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {promptContent.icon}
          {promptContent.title}
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {promptContent.message}
          </Typography>

          {requireNonAnonymous && isAuthenticated && isAnonymous && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You're currently signed in anonymously. You'll need to create a full account or link your anonymous account to an email to access this feature.
            </Alert>
          )}

          {showFeatureBenefits && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ fontSize: '1rem' }} />
                Benefits of {requireNonAnonymous && isAnonymous ? 'upgrading your account' : 'signing in'}:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                {getFeatureBenefits().map((benefit, index) => (
                  <Typography key={index} component="li" variant="body2" color="text.secondary">
                    {benefit}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAuthAction}
            startIcon={promptContent.icon}
          >
            {promptContent.buttonText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          onSuccess?.();
        }}
        title={requireNonAnonymous && isAnonymous ? 'Upgrade Your Account' : 'Sign In'}
        subtitle={requireNonAnonymous && isAnonymous 
          ? 'Link your anonymous account to an email or create a new account'
          : `Sign in to access ${feature}`
        }
      />
    </>
  );
};

export default AuthPrompt;
