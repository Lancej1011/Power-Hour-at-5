import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { useThemeContext } from '../contexts/ThemeContext';
import ThemeSelector from './ThemeSelector';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface ModernAppHeaderProps {
  title?: string;
  subtitle?: string;
  showThemeControls?: boolean;
  actions?: React.ReactNode;
}

const ModernAppHeader: React.FC<ModernAppHeaderProps> = ({
  title = "Power Hour",
  subtitle = "Professional Music Mixing",
  showThemeControls = true,
  actions,
}) => {
  const theme = useTheme();
  const { mode, toggleMode, currentTheme } = useThemeContext();

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <Toolbar sx={{ 
        minHeight: '80px !important',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        {/* Logo and Title Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flex: 1,
        }}>
          {/* Logo */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: alpha(theme.palette.common.white, 0.15),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
          }}>
            <LocalBarIcon sx={{ 
              fontSize: 28, 
              color: theme.palette.common.white,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }} />
          </Box>

          {/* Title and Subtitle */}
          <Box>
            <Typography 
              variant="h5" 
              component="h1"
              sx={{ 
                color: theme.palette.common.white,
                fontWeight: 700,
                fontSize: '1.5rem',
                lineHeight: 1.2,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body2"
              sx={{ 
                color: alpha(theme.palette.common.white, 0.8),
                fontSize: '0.875rem',
                fontWeight: 400,
                lineHeight: 1.3,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Box>

        {/* Status Indicators */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
        }}>
          <Chip
            icon={<MusicNoteIcon sx={{ fontSize: '16px !important' }} />}
            label={currentTheme.name}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.common.white, 0.15),
              color: theme.palette.common.white,
              border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              fontWeight: 500,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: theme.palette.common.white,
              },
            }}
          />
        </Box>

        {/* Theme Controls */}
        {showThemeControls && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            ml: 2,
          }}>
            {/* Light/Dark Mode Toggle */}
            <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton
                onClick={toggleMode}
                sx={{
                  color: theme.palette.common.white,
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.2),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>

            {/* Theme Selector */}
            <Box sx={{
              '& .MuiIconButton-root': {
                color: theme.palette.common.white,
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.2),
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out',
              },
            }}>
              <ThemeSelector />
            </Box>
          </Box>
        )}

        {/* Custom Actions */}
        {actions && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            ml: 2,
          }}>
            {actions}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default ModernAppHeader;
