/**
 * Onboarding Flow Component
 * Welcome new users and guide them through authentication options
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Stack,
  Chip,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  EmojiPeople as WavingIcon,
  MusicNote as MusicNoteIcon,
  Cloud as CloudSyncIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth, useAuthStatus } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import LoginModal from './LoginModal';

interface OnboardingFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const { isAuthenticated } = useAuthStatus();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check if user has seen onboarding before
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenOnboarding');
    setHasSeenOnboarding(!!seen);
  }, []);

  // Auto-advance when user authenticates
  useEffect(() => {
    if (isAuthenticated && activeStep === 1) {
      setActiveStep(2);
    }
  }, [isAuthenticated, activeStep]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSignInClick = () => {
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
    handleNext();
  };

  const handleSkipAuth = () => {
    handleNext();
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
    onClose();
  };

  const steps = [
    {
      label: 'Welcome to Power Hour at 5',
      content: (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3,
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
              color: 'white',
              mb: 2,
            }}>
              <WavingIcon sx={{ fontSize: 40 }} />
            </Box>
          </Box>
          
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: currentTheme.primary }}>
            Welcome to Power Hour at 5! 🎉
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            The ultimate music mixing and playlist management app. Create amazing Power Hour experiences with your favorite songs and YouTube videos.
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Chip
              icon={<MusicNoteIcon />}
              label="Mix Creation"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<ShareIcon />}
              label="Playlist Sharing"
              color="secondary"
              variant="outlined"
            />
            <Chip
              icon={<CloudSyncIcon />}
              label="Cloud Sync"
              color="success"
              variant="outlined"
            />
          </Stack>
        </Box>
      ),
    },
    {
      label: 'Sign In (Optional)',
      content: (
        <Box sx={{ py: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom textAlign="center">
            Unlock All Features
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Sign in to access community features, sync your data across devices, and get the most out of Power Hour.
          </Typography>

          <Card sx={{ 
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
            border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                With an account, you can:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  Share playlists with the community
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  Sync your data across multiple devices
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  Access your playlists from anywhere
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  Get personalized recommendations
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSignInClick}
              sx={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(currentTheme.primary, 0.4)}`,
                },
              }}
            >
              Sign In Now
            </Button>
            
            <Button
              variant="text"
              onClick={handleSkipAuth}
              sx={{ textTransform: 'none' }}
            >
              Continue as Guest
            </Button>
          </Stack>
        </Box>
      ),
    },
    {
      label: 'You\'re All Set!',
      content: (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3,
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
              color: 'white',
              mb: 2,
            }}>
              <CheckCircleIcon sx={{ fontSize: 40 }} />
            </Box>
          </Box>
          
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Ready to Rock!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            {isAuthenticated 
              ? "You're signed in and ready to explore all features. Start creating amazing Power Hour experiences!"
              : "You can start using Power Hour right away. Sign in anytime to unlock additional features."
            }
          </Typography>

          <Card sx={{ 
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Quick Start Tips:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  • Start with the "Create Mix" tab to build your first Power Hour
                </Typography>
                <Typography variant="body2">
                  • Use the "YouTube" tab to find and add videos to your playlists
                </Typography>
                <Typography variant="body2">
                  • Check out the "Community" tab for shared playlists
                </Typography>
                <Typography variant="body2">
                  • Use the "Visualizer" for an immersive music experience
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={handleComplete}
            sx={{
              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(currentTheme.primary, 0.4)}`,
              },
            }}
          >
            Start Using Power Hour
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            minHeight: 600,
          },
        }}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
      >
        <DialogContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="h6" fontWeight={600}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  {step.content}
                  
                  {index < steps.length - 1 && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      {index > 0 && (
                        <Button
                          onClick={handleBack}
                          variant="outlined"
                          sx={{ textTransform: 'none' }}
                        >
                          Back
                        </Button>
                      )}
                      {index === 0 && (
                        <Button
                          onClick={handleNext}
                          variant="contained"
                          sx={{ textTransform: 'none' }}
                        >
                          Get Started
                        </Button>
                      )}
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        title="Sign In to Power Hour"
        subtitle="Join the community and sync your data across devices"
      />
    </>
  );
};

export default OnboardingFlow;
