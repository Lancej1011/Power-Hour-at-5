/**
 * Email/Password Sign-In Component
 * Provides email and password authentication interface
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignInForm } from '../../utils/authValidation';

interface EmailSignInProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: () => void;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showSignUpLink?: boolean;
}

const EmailSignIn: React.FC<EmailSignInProps> = ({
  onSuccess,
  onSwitchToSignUp,
  onForgotPassword,
  showRememberMe = true,
  showForgotPassword = true,
  showSignUpLink = true,
}) => {
  const theme = useTheme();
  const { signInWithEmail, isLoading, lastError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form input changes
  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'rememberMe' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (lastError) {
      clearError();
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate form
    const validation = validateSignInForm({
      email: formData.email,
      password: formData.password,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      const user = await signInWithEmail(formData.email, formData.password);
      if (user) {
        console.log('✅ Email sign-in successful');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('❌ Email sign-in failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const hasErrors = validationErrors.length > 0 || !!lastError;

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
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          margin: '0 auto 16px',
        }}>
          <LoginIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Sign In
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your email and password to continue
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
            lastError?.message || 'Sign-in failed. Please try again.'
          )}
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        disabled={isSubmitting || isLoading}
        error={validationErrors.some(error => error.toLowerCase().includes('email'))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        autoComplete="email"
        autoFocus
      />

      {/* Password Field */}
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        disabled={isSubmitting || isLoading}
        error={validationErrors.some(error => error.toLowerCase().includes('password'))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={togglePasswordVisibility}
                disabled={isSubmitting || isLoading}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        autoComplete="current-password"
      />

      {/* Remember Me & Forgot Password */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        {showRememberMe && (
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.rememberMe}
                onChange={handleInputChange('rememberMe')}
                disabled={isSubmitting || isLoading}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Remember me
              </Typography>
            }
          />
        )}
        
        {showForgotPassword && (
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={onForgotPassword}
            disabled={isSubmitting || isLoading}
            sx={{ textDecoration: 'none' }}
          >
            Forgot password?
          </Link>
        )}
      </Box>

      {/* Sign In Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting || isLoading || !formData.email || !formData.password}
        sx={{ 
          mb: 2,
          height: 48,
          fontWeight: 600,
        }}
      >
        {isSubmitting || isLoading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} color="inherit" />
            <span>Signing In...</span>
          </Stack>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Sign Up Link */}
      {showSignUpLink && (
        <>
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?
            </Typography>
          </Divider>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={onSwitchToSignUp}
            disabled={isSubmitting || isLoading}
            sx={{ height: 48 }}
          >
            Create Account
          </Button>
        </>
      )}
    </Box>
  );
};

export default EmailSignIn;
