/**
 * Sign-Up Form Component
 * Provides user registration interface with email/password
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
  FormControlLabel,
  Checkbox,
  Link,
  LinearProgress,
  Stack,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  validateSignUpForm, 
  analyzePasswordStrength,
  PasswordStrength 
} from '../../utils/authValidation';

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
  showSignInLink?: boolean;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onSwitchToSignIn,
  showSignInLink = true,
}) => {
  const theme = useTheme();
  const { createUserWithEmail, isLoading, lastError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  // Handle form input changes
  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'acceptTerms' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Analyze password strength in real-time
    if (field === 'password') {
      const strength = analyzePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
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
    const validation = validateSignUpForm(formData);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      const user = await createUserWithEmail(
        formData.email, 
        formData.password, 
        formData.displayName || undefined
      );
      if (user) {
        console.log('✅ Account created successfully');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('❌ Account creation failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  // Password strength color mapping
  const getStrengthColor = (strength: PasswordStrength): string => {
    switch (strength) {
      case 'weak': return theme.palette.error.main;
      case 'fair': return theme.palette.warning.main;
      case 'good': return theme.palette.info.main;
      case 'strong': return theme.palette.success.main;
      case 'very-strong': return theme.palette.success.dark;
      default: return theme.palette.grey[400];
    }
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
          backgroundColor: theme.palette.secondary.main,
          color: 'white',
          margin: '0 auto 16px',
        }}>
          <PersonAddIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Join Power Hour at 5 and start creating amazing playlists
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
            lastError?.message || 'Account creation failed. Please try again.'
          )}
        </Alert>
      )}

      {/* Display Name Field */}
      <TextField
        fullWidth
        label="Display Name (Optional)"
        value={formData.displayName}
        onChange={handleInputChange('displayName')}
        disabled={isSubmitting || isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        autoComplete="name"
        placeholder="How should we call you?"
      />

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
        required
      />

      {/* Password Field */}
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        disabled={isSubmitting || isLoading}
        error={validationErrors.some(error => error.toLowerCase().includes('password') && !error.toLowerCase().includes('confirm'))}
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
        sx={{ mb: 1 }}
        autoComplete="new-password"
        required
      />

      {/* Password Strength Indicator */}
      {passwordStrength && formData.password && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Password Strength:
            </Typography>
            <Chip
              label={passwordStrength.strength.replace('-', ' ').toUpperCase()}
              size="small"
              sx={{
                backgroundColor: getStrengthColor(passwordStrength.strength),
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={passwordStrength.score}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStrengthColor(passwordStrength.strength),
              },
            }}
          />
          {passwordStrength.suggestions.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {passwordStrength.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                <Typography key={index} variant="caption" color="text.secondary" display="block">
                  • {suggestion}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Confirm Password Field */}
      <TextField
        fullWidth
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        disabled={isSubmitting || isLoading}
        error={validationErrors.some(error => error.toLowerCase().includes('confirm') || error.toLowerCase().includes('match'))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={toggleConfirmPasswordVisibility}
                disabled={isSubmitting || isLoading}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        autoComplete="new-password"
        required
      />

      {/* Terms Acceptance */}
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.acceptTerms}
            onChange={handleInputChange('acceptTerms')}
            disabled={isSubmitting || isLoading}
            color="primary"
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            I agree to the{' '}
            <Link href="#" underline="hover">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" underline="hover">
              Privacy Policy
            </Link>
          </Typography>
        }
        sx={{ mb: 3, alignItems: 'flex-start' }}
      />

      {/* Create Account Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={
          isSubmitting || 
          isLoading || 
          !formData.email || 
          !formData.password || 
          !formData.confirmPassword || 
          !formData.acceptTerms ||
          (passwordStrength && passwordStrength.score < 30)
        }
        sx={{ 
          mb: 2,
          height: 48,
          fontWeight: 600,
        }}
      >
        {isSubmitting || isLoading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} color="inherit" />
            <span>Creating Account...</span>
          </Stack>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* Sign In Link */}
      {showSignInLink && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={onSwitchToSignIn}
              disabled={isSubmitting || isLoading}
              sx={{ textDecoration: 'none', fontWeight: 600 }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SignUpForm;
