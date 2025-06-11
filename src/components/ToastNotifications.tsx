import React, { useState, useEffect, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Slide,
  SlideProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastNotificationsProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
  maxToasts?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const ToastNotifications: React.FC<ToastNotificationsProps> = ({
  toasts,
  onRemoveToast,
  maxToasts = 5,
  position = { vertical: 'bottom', horizontal: 'right' },
}) => {
  const [displayedToasts, setDisplayedToasts] = useState<Toast[]>([]);

  // Update displayed toasts when toasts prop changes
  useEffect(() => {
    setDisplayedToasts(toasts.slice(-maxToasts));
  }, [toasts, maxToasts]);

  // Auto-remove toasts after their duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    displayedToasts.forEach((toast) => {
      if (!toast.persistent && toast.duration !== 0) {
        const duration = toast.duration || 6000;
        const timer = setTimeout(() => {
          onRemoveToast(toast.id);
        }, duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [displayedToasts, onRemoveToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
      default:
        return <InfoIcon />;
    }
  };

  const getSeverity = (type: ToastType) => {
    return type;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 9999,
        ...(position.vertical === 'top' ? { top: 24 } : { bottom: 24 }),
        ...(position.horizontal === 'left' && { left: 24 }),
        ...(position.horizontal === 'center' && { 
          left: '50%', 
          transform: 'translateX(-50%)' 
        }),
        ...(position.horizontal === 'right' && { right: 24 }),
        display: 'flex',
        flexDirection: position.vertical === 'top' ? 'column' : 'column-reverse',
        gap: 1,
        maxWidth: '400px',
        width: '100%',
      }}
    >
      {displayedToasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          TransitionComponent={SlideTransition}
          sx={{
            position: 'relative',
            transform: 'none !important',
            left: 'auto !important',
            right: 'auto !important',
            top: 'auto !important',
            bottom: 'auto !important',
          }}
        >
          <Alert
            severity={getSeverity(toast.type)}
            icon={getIcon(toast.type)}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {toast.action && (
                  <IconButton
                    size="small"
                    onClick={toast.action.onClick}
                    sx={{ color: 'inherit' }}
                  >
                    {toast.action.label}
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => onRemoveToast(toast.id)}
                  sx={{ color: 'inherit' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          >
            {toast.title && (
              <AlertTitle sx={{ mb: toast.message ? 1 : 0 }}>
                {toast.title}
              </AlertTitle>
            )}
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

// Hook for managing toasts
export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 6000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const showError = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', message, ...options });
  }, [addToast]);

  const showWarning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const showInfo = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default ToastNotifications;
