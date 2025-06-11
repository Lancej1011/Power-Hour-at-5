/**
 * Account Linking Component
 * Allows users to upgrade from anonymous to email accounts
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Link as LinkIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignUpForm } from '../../utils/authValidation';

interface AccountLinkingProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showAsCard?: boolean;
}

const AccountLinking: React.FC<AccountLinkingProps> = ({
  onSuccess,
  onCancel,
  showAsCard = true,
}) => {
  const theme = useTheme();
  const {
    user,
    linkAnonymousToEmail,
    canLinkAccount,
    isLoading,
    lastError,
    clearError,
  } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkingComplete, setLinkingComplete] = useState(false);

  // Handle form input changes
  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'acceptTerms' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (lastError) {
      clearError();
    }
  };

  // Handle account linking
  const handleLinkAccount = async () => {
    // Validate form
    const validation = validateSignUpForm(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsLinking(true);
    setValidationErrors([]);

    try {
      const result = await linkAnonymousToEmail(formData.email, formData.password);
      if (result) {
        setLinkingComplete(true);
        setActiveStep(2);
        console.log('✅ Account linking successful');
        
        // Call success callback after a short delay
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Account linking failed:', error);
      // Error is handled by the auth context
    } finally {
      setIsLinking(false);
    }
  };

  const steps = [
    {
      label: 'Account Information',
      description: 'Enter your email and create a password',
    },
    {
      label: 'Link Account',
      description: 'Confirm and link your anonymous account',
    },
    {
      label: 'Complete',
      description: 'Your account has been successfully linked',
    },
  ];

  // Check if user can link account
  if (!canLinkAccount()) {
    return (
      <Alert severity="info" sx={{ m: showAsCard ? 0 : 2 }}>
        <Typography variant="body2">
          Account linking is only available for anonymous users. 
          {user?.email ? ' You already have a full account.' : ' Please sign in anonymously first.'}
        </Typography>
      </Alert>
    );
  }

  const content = (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          margin: '0 auto 16px',
        }}>
          <LinkIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Upgrade Your Account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Link your anonymous account to an email address to access all features
        </Typography>
      </Box>

      {/* Benefits */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Benefits of upgrading:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <li>Access community features and playlist sharing</li>
          <li>Sync your data across multiple devices</li>
          <li>Recover your account if you lose access</li>
          <li>Get personalized recommendations</li>
        </Box>
      </Alert>

      {/* Error Display */}
      {(validationErrors.length > 0 || lastError) && (
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
            lastError?.message || 'Account linking failed. Please try again.'
          )}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Account Information */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" fontWeight={600}>
              {steps[0].label}
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {steps[0].description}
            </Typography>
            
            <Stack spacing={2} sx={{ mb: 2 }}>
              {/* Email Field */}
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isLinking || linkingComplete}
                error={validationErrors.some(error => error.toLowerCase().includes('email'))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
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
                disabled={isLinking || linkingComplete}
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
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLinking || linkingComplete}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="new-password"
                required
              />

              {/* Confirm Password Field */}
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={isLinking || linkingComplete}
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLinking || linkingComplete}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="new-password"
                required
              />
            </Stack>

            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(1)}
                disabled={!formData.email || !formData.password || !formData.confirmPassword}
                sx={{ mr: 1 }}
              >
                Continue
              </Button>
              <Button onClick={onCancel} disabled={isLinking}>
                Cancel
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 2: Link Account */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" fontWeight={600}>
              {steps[1].label}
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {steps[1].description}
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This will permanently link your anonymous account to the email address{' '}
                <strong>{formData.email}</strong>. This action cannot be undone.
              </Typography>
            </Alert>

            <Box sx={{ mb: 1 }}>
              <Button
                variant="contained"
                onClick={handleLinkAccount}
                disabled={isLinking || isLoading}
                startIcon={isLinking ? <CircularProgress size={16} /> : <LinkIcon />}
                sx={{ mr: 1 }}
              >
                {isLinking ? 'Linking Account...' : 'Link Account'}
              </Button>
              <Button onClick={() => setActiveStep(0)} disabled={isLinking}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 3: Complete */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" fontWeight={600}>
              {steps[2].label}
            </Typography>
          </StepLabel>
          <StepContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon />
                <Typography variant="body2">
                  <strong>Success!</strong> Your account has been linked to {formData.email}
                </Typography>
              </Box>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You now have access to all features including community sharing and cross-device sync.
              A verification email has been sent to your email address.
            </Typography>

            <Button
              variant="contained"
              onClick={onSuccess}
              startIcon={<AccountIcon />}
            >
              Continue to Account
            </Button>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );

  if (showAsCard) {
    return (
      <Card sx={{ 
        maxWidth: 600, 
        mx: 'auto',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
      }}>
        <CardContent sx={{ p: 3 }}>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default AccountLinking;
