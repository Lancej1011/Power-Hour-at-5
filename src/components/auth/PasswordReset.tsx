/**
 * Password Reset Component
 * Provides password reset functionality via email
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Email as EmailIcon,
  LockReset as LockResetIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { validatePasswordResetForm } from '../../utils/authValidation';

interface PasswordResetProps {
  onBack?: () => void;
  onSuccess?: () => void;
  showBackButton?: boolean;
}

const PasswordReset: React.FC<PasswordResetProps> = ({
  onBack,
  onSuccess,
  showBackButton = true,
}) => {
  const theme = useTheme();
  const { sendPasswordResetEmail, lastError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle email input change
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    
    // Clear errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (lastError) {
      clearError();
    }
    if (isSuccess) {
      setIsSuccess(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate email
    const validation = validatePasswordResetForm(email);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      await sendPasswordResetEmail(email);
      setIsSuccess(true);
      console.log('✅ Password reset email sent');
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = validationErrors.length > 0 || !!lastError;

  // Success state
  if (isSuccess) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        {/* Success Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: theme.palette.success.main,
          color: 'white',
          margin: '0 auto 24px',
        }}>
          <CheckIcon sx={{ fontSize: 40 }} />
        </Box>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Check Your Email
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We've sent a password reset link to:
        </Typography>
        
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.success.main}`,
          }}
        >
          <Typography variant="body1" fontWeight={600} color="success.main">
            {email}
          </Typography>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Click the link in the email to reset your password. The link will expire in 1 hour.
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="outlined"
            onClick={() => {
              setIsSuccess(false);
              setEmail('');
            }}
            sx={{ height: 48 }}
          >
            Send Another Email
          </Button>
          
          {showBackButton && (
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
              sx={{ height: 48 }}
            >
              Back to Sign In
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  // Reset form state
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: theme.palette.warning.main,
          color: 'white',
          margin: '0 auto 16px',
        }}>
          <LockResetIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your email address and we'll send you a link to reset your password
        </Typography>
      </Box>

      {/* Error Display */}
      {hasErrors && (
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
            lastError?.message || 'Failed to send reset email. Please try again.'
          )}
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        disabled={isSubmitting}
        error={validationErrors.some(error => error.toLowerCase().includes('email'))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
        autoComplete="email"
        autoFocus
        placeholder="Enter your email address"
      />

      {/* Send Reset Email Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting || !email}
        sx={{ 
          mb: 2,
          height: 48,
          fontWeight: 600,
        }}
      >
        {isSubmitting ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} color="inherit" />
            <span>Sending Email...</span>
          </Stack>
        ) : (
          'Send Reset Email'
        )}
      </Button>

      {/* Back to Sign In Link */}
      {showBackButton && (
        <Box sx={{ textAlign: 'center' }}>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={onBack}
            disabled={isSubmitting}
            sx={{ 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back to Sign In
          </Link>
        </Box>
      )}

      {/* Additional Help */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          <strong>Having trouble?</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          • Check your spam/junk folder
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          • Make sure you entered the correct email address
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          • The reset link expires in 1 hour
        </Typography>
      </Box>
    </Box>
  );
};

export default PasswordReset;
