/**
 * Generation Progress Component
 * Displays real-time progress during Power Hour playlist generation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  IconButton,
  Chip,
  useTheme,
  alpha,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  MusicNote as MusicIcon,
  FilterList as FilterIcon,
  Build as BuildIcon,
  AutoAwesome as MagicIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  GenerationProgress as ProgressType,
  GenerationStep,
  GenerationProgressProps,
} from '../types/powerHour';

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  onCancel,
  canCancel,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress bar
  useEffect(() => {
    if (progress) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress.overallProgress || 0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // Step configuration
  const steps = [
    {
      key: GenerationStep.INITIALIZING,
      label: 'Initializing',
      description: 'Preparing generation parameters',
      icon: <BuildIcon />,
    },
    {
      key: GenerationStep.SEARCHING_PRIMARY,
      label: 'Primary Search',
      description: 'Searching for videos based on your input',
      icon: <SearchIcon />,
    },
    {
      key: GenerationStep.FINDING_SIMILAR_ARTISTS,
      label: 'Finding Similar Artists',
      description: 'Discovering related artists for variety',
      icon: <MusicIcon />,
    },
    {
      key: GenerationStep.SEARCHING_RELATED,
      label: 'Expanding Search',
      description: 'Searching for additional content',
      icon: <SearchIcon />,
    },
    {
      key: GenerationStep.FILTERING_RESULTS,
      label: 'Filtering & Ranking',
      description: 'Selecting the best videos',
      icon: <FilterIcon />,
    },
    {
      key: GenerationStep.EXTRACTING_CLIPS,
      label: 'Generating Clips',
      description: 'Creating 1-minute clips from videos',
      icon: <MagicIcon />,
    },
    {
      key: GenerationStep.FINALIZING,
      label: 'Finalizing',
      description: 'Completing your playlist',
      icon: <CheckIcon />,
    },
  ];

  const getCurrentStepIndex = () => {
    if (!progress) return 0;
    return steps.findIndex(step => step.key === progress.currentStep);
  };

  const getStepStatus = (stepIndex: number) => {
    if (!progress) return 'pending';
    
    const currentIndex = getCurrentStepIndex();
    
    if (progress.currentStep === GenerationStep.ERROR) {
      return stepIndex <= currentIndex ? 'error' : 'pending';
    }
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (step: typeof steps[0], status: string) => {
    switch (status) {
      case 'completed':
        return <CheckIcon sx={{ color: theme.palette.success.main }} />;
      case 'active':
        return React.cloneElement(step.icon, { 
          sx: { color: currentTheme.primary, animation: 'pulse 2s infinite' } 
        });
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <PendingIcon sx={{ color: theme.palette.text.disabled }} />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!progress) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Preparing generation...</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
        border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
        borderRadius: 3,
        minHeight: 400,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MagicIcon sx={{ mr: 2, fontSize: 32, color: currentTheme.primary }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: currentTheme.primary }}>
              Generating Your Power Hour
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creating the perfect 60-song playlist...
            </Typography>
          </Box>
        </Box>
        
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            onClick={onCancel}
            startIcon={<CancelIcon />}
            sx={{ ml: 2 }}
          >
            Cancel
          </Button>
        )}
      </Box>

      {/* Overall Progress */}
      <Card sx={{ mb: 3, background: alpha(theme.palette.background.paper, 0.8) }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Overall Progress
            </Typography>
            <Chip
              label={`${Math.round(animatedProgress)}%`}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={animatedProgress}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: alpha(currentTheme.primary, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                background: `linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.secondary})`,
              },
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {progress.message}
            </Typography>
            {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
              <Typography variant="body2" color="text.secondary">
                ~{formatTime(progress.estimatedTimeRemaining)} remaining
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Step Progress */}
      <Card sx={{ background: alpha(theme.palette.background.paper, 0.8) }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Generation Steps
          </Typography>
          
          <Stepper activeStep={getCurrentStepIndex()} orientation="vertical">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const isActive = status === 'active';
              
              return (
                <Step key={step.key} completed={status === 'completed'}>
                  <StepLabel
                    icon={getStepIcon(step, status)}
                    error={status === 'error'}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: isActive ? 'bold' : 'normal',
                        color: isActive ? currentTheme.primary : 'inherit',
                      },
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: isActive ? 'bold' : 'normal' }}>
                        {step.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </StepLabel>
                  
                  {isActive && (
                    <StepContent>
                      <Fade in={true}>
                        <Box sx={{ py: 1 }}>
                          {progress.details && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {progress.details}
                            </Typography>
                          )}
                          
                          <LinearProgress
                            variant="determinate"
                            value={progress.currentStepProgress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(currentTheme.primary, 0.1),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: currentTheme.primary,
                              },
                            }}
                          />
                        </Box>
                      </Fade>
                    </StepContent>
                  )}
                </Step>
              );
            })}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error State */}
      {progress.currentStep === GenerationStep.ERROR && (
        <Zoom in={true}>
          <Card sx={{ mt: 3, border: `1px solid ${theme.palette.error.main}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon sx={{ mr: 2, color: theme.palette.error.main }} />
                <Typography variant="h6" color="error" sx={{ fontWeight: 'bold' }}>
                  Generation Failed
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {progress.message}
              </Typography>
              {progress.details && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Details: {progress.details}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* Success State */}
      {progress.currentStep === GenerationStep.COMPLETE && (
        <Zoom in={true}>
          <Card sx={{ mt: 3, border: `1px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckIcon sx={{ mr: 2, color: theme.palette.success.main }} />
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                  Generation Complete!
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Your Power Hour playlist has been generated successfully.
              </Typography>
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Paper>
  );
};

export default GenerationProgress;
