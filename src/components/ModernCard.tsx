import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Box,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Chip,
} from '@mui/material';
import { useThemeContext } from '../contexts/ThemeContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface ModernCardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  badge?: string | number;
  icon?: React.ReactNode;
  image?: string;
  gradient?: boolean;
  className?: string;
  sx?: any;
}

const ModernCard: React.FC<ModernCardProps> = ({
  title,
  subtitle,
  children,
  actions,
  headerActions,
  variant = 'elevated',
  hover = true,
  clickable = false,
  onClick,
  status = 'default',
  badge,
  icon,
  image,
  gradient = false,
  className,
  sx,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  const getStatusColor = () => {
    switch (status) {
      case 'success': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      case 'info': return theme.palette.info.main;
      default: return currentTheme.primary;
    }
  };

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: 16,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyles,
          border: `2px solid ${theme.palette.divider}`,
          boxShadow: 'none',
          backgroundColor: theme.palette.background.paper,
        };
      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: alpha(currentTheme.primary, 0.05),
          border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
          boxShadow: 'none',
        };
      default: // elevated
        return {
          ...baseStyles,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
            : '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${theme.palette.divider}`,
        };
    }
  };

  const getHoverStyles = () => {
    if (!hover && !clickable) return {};
    
    return {
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 40px rgba(0, 0, 0, 0.4)' 
          : '0 8px 40px rgba(0, 0, 0, 0.12)',
        ...(variant === 'outlined' && {
          borderColor: currentTheme.primary,
        }),
        ...(variant === 'filled' && {
          backgroundColor: alpha(currentTheme.primary, 0.08),
        }),
      },
    };
  };

  const cardStyles = {
    ...getVariantStyles(),
    ...getHoverStyles(),
    ...(clickable && {
      cursor: 'pointer',
      userSelect: 'none' as const,
    }),
    ...(gradient && {
      background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
      border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
    }),
    ...sx,
  };

  return (
    <Card 
      className={className}
      sx={cardStyles}
      onClick={clickable ? onClick : undefined}
    >
      {/* Background Image */}
      {image && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(to bottom, transparent 0%, ${theme.palette.background.paper} 100%)`,
            },
          }}
        />
      )}

      {/* Status Indicator */}
      {status !== 'default' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
            zIndex: 1,
          }}
        />
      )}

      {/* Header */}
      {(title || subtitle || headerActions || icon || badge) && (
        <CardHeader
          avatar={icon && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: alpha(currentTheme.primary, 0.1),
              color: currentTheme.primary,
            }}>
              {icon}
            </Box>
          )}
          title={title && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {badge && (
                <Chip 
                  label={badge} 
                  size="small" 
                  color="primary"
                  sx={{ 
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />
              )}
            </Box>
          )}
          subheader={subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
          action={headerActions}
          sx={{
            pb: children ? 1 : 2,
            '& .MuiCardHeader-content': {
              overflow: 'hidden',
            },
            '& .MuiCardHeader-title': {
              fontSize: '1.125rem',
              lineHeight: 1.4,
            },
            '& .MuiCardHeader-subheader': {
              fontSize: '0.875rem',
              lineHeight: 1.5,
            },
          }}
        />
      )}

      {/* Content */}
      {children && (
        <CardContent sx={{ 
          pt: (title || subtitle || headerActions || icon) ? 0 : 2,
          '&:last-child': { pb: actions ? 2 : 3 },
        }}>
          {children}
        </CardContent>
      )}

      {/* Actions */}
      {actions && (
        <CardActions sx={{ 
          px: 3, 
          pb: 3,
          pt: 0,
          justifyContent: 'flex-end',
          gap: 1,
        }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
};

export default ModernCard;
