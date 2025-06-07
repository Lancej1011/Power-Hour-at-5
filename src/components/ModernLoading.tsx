import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  useTheme,
  alpha,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';
import { useThemeContext } from '../contexts/ThemeContext';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface ModernLoadingProps {
  variant?: 'circular' | 'linear' | 'skeleton' | 'pulse' | 'wave';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  subtext?: string;
  progress?: number;
  fullScreen?: boolean;
  overlay?: boolean;
  animated?: boolean;
}

const ModernLoading: React.FC<ModernLoadingProps> = ({
  variant = 'circular',
  size = 'medium',
  text,
  subtext,
  progress,
  fullScreen = false,
  overlay = false,
  animated = true,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  const getSizeValue = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 64;
      default: return 48;
    }
  };

  const getContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      p: 3,
    };

    if (fullScreen) {
      return {
        ...baseStyles,
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlay 
          ? alpha(theme.palette.background.default, 0.8)
          : theme.palette.background.default,
        backdropFilter: overlay ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: overlay ? 'blur(8px)' : 'none',
        zIndex: 9999,
      };
    }

    return baseStyles;
  };

  const renderCircularLoader = () => (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant={progress !== undefined ? 'determinate' : 'indeterminate'}
        value={progress}
        size={getSizeValue()}
        thickness={4}
        sx={{
          color: currentTheme.primary,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      {animated && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
              '50%': { opacity: 0.7, transform: 'translate(-50%, -50%) scale(1.1)' },
              '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            },
          }}
        >
          <MusicNoteIcon 
            sx={{ 
              fontSize: getSizeValue() * 0.4,
              color: currentTheme.primary,
            }} 
          />
        </Box>
      )}
    </Box>
  );

  const renderLinearLoader = () => (
    <Box sx={{ width: '100%', maxWidth: 300 }}>
      <LinearProgress
        variant={progress !== undefined ? 'determinate' : 'indeterminate'}
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: alpha(currentTheme.primary, 0.1),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
          },
        }}
      />
      {progress !== undefined && (
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );

  const renderSkeletonLoader = () => (
    <Card sx={{ width: '100%', maxWidth: 400 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 2, mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderPulseLoader = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: currentTheme.primary,
            animation: 'pulse 1.4s ease-in-out infinite both',
            animationDelay: `${index * 0.16}s`,
            '@keyframes pulse': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
                opacity: 0.5,
              },
              '40%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        />
      ))}
    </Box>
  );

  const renderWaveLoader = () => (
    <Box sx={{ display: 'flex', alignItems: 'end', gap: 1, height: 40 }}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Box
          key={index}
          sx={{
            width: 4,
            backgroundColor: currentTheme.primary,
            borderRadius: 2,
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: `${index * 0.1}s`,
            '@keyframes wave': {
              '0%, 40%, 100%': {
                height: 8,
                opacity: 0.5,
              },
              '20%': {
                height: 32,
                opacity: 1,
              },
            },
          }}
        />
      ))}
    </Box>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'linear': return renderLinearLoader();
      case 'skeleton': return renderSkeletonLoader();
      case 'pulse': return renderPulseLoader();
      case 'wave': return renderWaveLoader();
      default: return renderCircularLoader();
    }
  };

  return (
    <Box sx={getContainerStyles()}>
      {renderLoader()}
      
      {text && (
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 500,
            color: theme.palette.text.primary,
            textAlign: 'center',
          }}
        >
          {text}
        </Typography>
      )}
      
      {subtext && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: theme.palette.text.secondary,
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          {subtext}
        </Typography>
      )}
    </Box>
  );
};

// Preset loading components for common use cases
export const LibraryLoadingCard: React.FC<{ progress?: number; currentSong?: string }> = ({ 
  progress, 
  currentSong 
}) => (
  <ModernLoading
    variant="linear"
    text="Loading Music Library"
    subtext={currentSong ? `Processing: ${currentSong}` : "Scanning your music collection..."}
    progress={progress}
    size="medium"
  />
);

export const FullScreenLoader: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <ModernLoading
    variant="circular"
    text={text}
    fullScreen
    overlay
    animated
    size="large"
  />
);

export const PlaylistLoadingSkeleton: React.FC = () => (
  <ModernLoading variant="skeleton" />
);

export default ModernLoading;
