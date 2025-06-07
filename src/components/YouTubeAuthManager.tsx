/**
 * YouTube Authentication Manager Component
 * Provides unified interface for OAuth 2.0 and API key management
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Key as KeyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useYouTubeAuthStore } from '../stores/youtubeAuthStore';
import { YouTubeAuthMethod } from '../types/youtube-auth';

interface YouTubeAuthManagerProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const YouTubeAuthManager: React.FC<YouTubeAuthManagerProps> = ({ open, onClose }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const {
    method,
    isAuthenticated,
    user,
    apiKeys,
    activeApiKeyId,
    quotaStatus,
    lastError,
    signInWithGoogle,
    signOut,
    addApiKey,
    removeApiKey,
    setActiveApiKey,
    setAuthMethod,
    validateApiKey,
    clearError,
  } = useYouTubeAuthStore();

  useEffect(() => {
    if (open) {
      clearError();
      setValidationResult(null);
    }
  }, [open, clearError]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    clearError();
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('🚀 Starting Google sign-in...');
      await signInWithGoogle();
      setAuthMethod('oauth');
      console.log('✅ Google sign-in successful');
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.type || 'unknown'
      });

      // Show user-friendly error message
      setValidationResult({
        valid: false,
        message: `Sign-in failed: ${error.message || 'Unknown error occurred'}`
      });
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Google sign-out failed:', error);
    }
  };

  const handleValidateApiKey = async () => {
    if (!newApiKeyValue.trim()) {
      setValidationResult({ valid: false, message: 'Please enter an API key' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await validateApiKey(newApiKeyValue.trim());
      setValidationResult({
        valid: isValid,
        message: isValid ? 'API key is valid!' : 'API key is invalid or has no quota remaining'
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        message: 'Failed to validate API key. Please check your internet connection.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newApiKeyValue.trim() || !newApiKeyName.trim()) {
      setValidationResult({ valid: false, message: 'Please enter both API key and name' });
      return;
    }

    try {
      await addApiKey(newApiKeyValue.trim(), newApiKeyName.trim());
      setNewApiKeyValue('');
      setNewApiKeyName('');
      setValidationResult({ valid: true, message: 'API key added successfully!' });
    } catch (error: any) {
      setValidationResult({ valid: false, message: error.message || 'Failed to add API key' });
    }
  };

  const handleRemoveApiKey = (keyId: string) => {
    removeApiKey(keyId);
  };

  const handleSetActiveApiKey = (keyId: string) => {
    setActiveApiKey(keyId);
  };

  const handleAuthMethodChange = (newMethod: YouTubeAuthMethod) => {
    setAuthMethod(newMethod);
  };

  const getQuotaColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const getQuotaIcon = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return <ErrorIcon color="error" />;
    if (percentage >= 70) return <WarningIcon color="warning" />;
    return <CheckCircleIcon color="success" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">YouTube Authentication</Typography>
          <Chip
            label={method === 'oauth' ? 'OAuth 2.0' : method === 'apikey' ? 'API Key' : 'Hybrid'}
            color={isAuthenticated || apiKeys.length > 0 ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Google OAuth" icon={<GoogleIcon />} />
            <Tab label="API Keys" icon={<KeyIcon />} />
            <Tab label="Settings" icon={<InfoIcon />} />
          </Tabs>
        </Box>

        {lastError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={clearError}>
            {lastError}
          </Alert>
        )}

        <TabPanel value={currentTab} index={0}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Google OAuth 2.0 Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Sign in with your Google account to use your personal YouTube API quota.
                This provides higher limits and better reliability.
              </Typography>

              {isAuthenticated && user ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1">{user.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <Chip label="Authenticated" color="success" />
                </Box>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are not currently signed in with Google.
                </Alert>
              )}
            </CardContent>
            <CardActions>
              {isAuthenticated ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleGoogleSignOut}
                  startIcon={<GoogleIcon />}
                >
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleGoogleSignIn}
                  startIcon={<GoogleIcon />}
                >
                  Sign In with Google
                </Button>
              )}
            </CardActions>
          </Card>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              API Key Management
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add multiple YouTube Data API keys to increase your quota limits.
              Keys will be automatically rotated when quota is exceeded.
            </Typography>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Add New API Key
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="API Key Name"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="e.g., Personal Key, Project Key"
                    fullWidth
                  />
                  <TextField
                    label="YouTube Data API v3 Key"
                    value={newApiKeyValue}
                    onChange={(e) => setNewApiKeyValue(e.target.value)}
                    placeholder="AIza..."
                    type="password"
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handleValidateApiKey}
                      disabled={isValidating || !newApiKeyValue.trim()}
                    >
                      {isValidating ? 'Validating...' : 'Test Key'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleAddApiKey}
                      disabled={!validationResult?.valid || !newApiKeyName.trim()}
                      startIcon={<AddIcon />}
                    >
                      Add Key
                    </Button>
                  </Box>
                  {isValidating && <LinearProgress />}
                  {validationResult && (
                    <Alert severity={validationResult.valid ? 'success' : 'error'}>
                      {validationResult.message}
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>

            <Typography variant="subtitle1" gutterBottom>
              Existing API Keys ({apiKeys.length})
            </Typography>
            {apiKeys.length === 0 ? (
              <Alert severity="info">
                No API keys configured. Add an API key to get started.
              </Alert>
            ) : (
              <List>
                {apiKeys.map((key) => (
                  <ListItem key={key.id} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {key.name}
                          {key.id === activeApiKeyId && (
                            <Chip label="Active" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Quota: {key.quotaUsed.toLocaleString()} / {key.quotaLimit.toLocaleString()}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(key.quotaUsed / key.quotaLimit) * 100}
                            color={getQuotaColor(key.quotaUsed, key.quotaLimit)}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {key.id !== activeApiKeyId && (
                          <Button
                            size="small"
                            onClick={() => handleSetActiveApiKey(key.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveApiKey(key.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Authentication Settings
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Authentication Method
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={method === 'oauth'}
                  onChange={(e) => handleAuthMethodChange(e.target.checked ? 'oauth' : 'apikey')}
                  disabled={!isAuthenticated && apiKeys.length === 0}
                />
              }
              label={method === 'oauth' ? 'Google OAuth 2.0' : 'API Keys'}
            />
            <Typography variant="body2" color="text.secondary">
              {method === 'oauth' 
                ? 'Using Google OAuth for authentication (recommended)'
                : 'Using API keys for authentication'
              }
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Quota Status
            </Typography>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {getQuotaIcon(quotaStatus.totalUsed, quotaStatus.totalLimit)}
                  <Box>
                    <Typography variant="h6">
                      {quotaStatus.totalUsed.toLocaleString()} / {quotaStatus.totalLimit.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total quota used today
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(quotaStatus.totalUsed / quotaStatus.totalLimit) * 100}
                  color={getQuotaColor(quotaStatus.totalUsed, quotaStatus.totalLimit)}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Resets at: {quotaStatus.resetTime.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default YouTubeAuthManager;
