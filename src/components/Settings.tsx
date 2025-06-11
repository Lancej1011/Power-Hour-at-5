import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Keyboard as KeyboardIcon,
  Palette as PaletteIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  DeveloperMode as DeveloperModeIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewColumn as ViewColumnIcon,
  AccountCircle as AccountCircleIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuth, useAuthStatus } from '../contexts/AuthContext';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import CustomThemeEditor from './CustomThemeEditor';
import { LoginModal, UserProfile } from './auth';

import type { ColorTheme } from '../themes';
import LibraryPersistenceManager from '../utils/libraryPersistence';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  mode: 'light' | 'dark';
  onToggleMode: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  open,
  onClose,
  mode,
  onToggleMode,
}) => {

  const { currentTheme, setTheme, availableThemes, deleteCustomTheme } = useThemeContext();
  const { user, profile, updateProfile, signOut, isLoading } = useAuth();
  const { isAuthenticated, isAnonymous, hasFullAccount } = useAuthStatus();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const [customEditorOpen, setCustomEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ColorTheme | null>(null);
  const [librarySettings, setLibrarySettings] = useState<any>({});
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const persistenceManager = LibraryPersistenceManager.getInstance();

  // Load library settings when dialog opens
  useEffect(() => {
    if (open) {
      const currentSettings = persistenceManager.getSettings();
      setLibrarySettings(currentSettings);
    }
  }, [open, persistenceManager]);

  const handleLibrarySettingChange = (key: string, value: any) => {
    const newSettings = { ...librarySettings, [key]: value };
    setLibrarySettings(newSettings);
    persistenceManager.updateSettings(newSettings);

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('librarySettingsChanged', { detail: newSettings }));
  };

  const handleOpenDevTools = () => {
    if (window.electronAPI) {
      (window.electronAPI as any).openDevTools();
    }
  };

  const handleKeyboardShortcuts = () => {
    setShowKeyboardHelp(true);
  };

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeSelect = (themeId: string) => {
    if (themeId === 'create-new') {
      setEditingTheme(null);
      setCustomEditorOpen(true);
      handleThemeMenuClose();
    } else {
      setTheme(themeId);
      handleThemeMenuClose();
    }
  };

  const handleEditTheme = (theme: ColorTheme, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTheme(theme);
    setCustomEditorOpen(true);
    handleThemeMenuClose();
  };

  const handleDeleteTheme = (theme: ColorTheme, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteCustomTheme(theme.id);
  };

  const handleCustomEditorClose = () => {
    setCustomEditorOpen(false);
    setEditingTheme(null);
  };

  const handleSignInClick = () => {
    setLoginModalOpen(true);
  };

  const handleSignOutClick = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
  };

  const handleEditDisplayName = () => {
    setDisplayNameValue(profile?.displayName || user?.displayName || '');
    setIsEditingDisplayName(true);
  };

  const handleSaveDisplayName = async () => {
    if (!profile) return;

    try {
      setIsSavingDisplayName(true);
      await updateProfile({ ...profile, displayName: displayNameValue.trim() });
      setIsEditingDisplayName(false);
    } catch (error) {
      console.error('Failed to update display name:', error);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleCancelDisplayName = () => {
    setDisplayNameValue(profile?.displayName || user?.displayName || '');
    setIsEditingDisplayName(false);
  };

  const getThemePreviewColor = (theme: ColorTheme) => {
    return theme.primary || '#9c27b0';
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 1200, // Lower than AppBar (1300) to stay below navigation
          '& .MuiDialog-container': {
            paddingTop: '100px', // Add top padding to avoid navigation bar
            paddingBottom: '20px',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '400px',
            marginTop: 0, // Remove default top margin
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              <Typography variant="h6">Settings</Typography>
            </Box>
            <Button
              onClick={onClose}
              variant="contained"
              sx={{
                minWidth: 'auto',
                width: '40px',
                height: '40px',
                padding: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 0 }}>
          <List>
            {/* Account Section */}
            <ListItem>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                Account
              </Typography>
            </ListItem>

            {isAuthenticated ? (
              <>
                <ListItem>
                  <ListItemIcon>
                    <AccountCircleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={user?.displayName || user?.email || 'Anonymous User'}
                    secondary={
                      isAnonymous
                        ? 'Anonymous Account - Consider linking to an email'
                        : hasFullAccount
                          ? 'Full Account with Cloud Sync'
                          : 'Basic Account'
                    }
                  />
                </ListItem>

                {/* Display Name Editor */}
                {!isAnonymous && (
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    {isEditingDisplayName ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <TextField
                          value={displayNameValue}
                          onChange={(e) => setDisplayNameValue(e.target.value)}
                          placeholder="Enter display name"
                          size="small"
                          sx={{ flex: 1 }}
                          disabled={isSavingDisplayName}
                        />
                        <Tooltip title="Save">
                          <IconButton
                            onClick={handleSaveDisplayName}
                            disabled={isSavingDisplayName}
                            size="small"
                            color="primary"
                          >
                            {isSavingDisplayName ? <CircularProgress size={20} /> : <SaveIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton
                            onClick={handleCancelDisplayName}
                            disabled={isSavingDisplayName}
                            size="small"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <>
                        <ListItemText
                          primary="Display Name"
                          secondary={profile?.displayName || user?.displayName || 'Not set'}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Edit Display Name">
                            <IconButton
                              onClick={handleEditDisplayName}
                              size="small"
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </>
                    )}
                  </ListItem>
                )}

                <ListItemButton onClick={handleSignOutClick} disabled={isLoading}>
                  <ListItemIcon>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sign Out"
                    secondary="Sign out of your account"
                  />
                </ListItemButton>
              </>
            ) : (
              <ListItemButton onClick={handleSignInClick} disabled={isLoading}>
                <ListItemIcon>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Sign In"
                  secondary="Sign in to sync your data across devices"
                />
              </ListItemButton>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Appearance Section */}
            <ListItem>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                Appearance
              </Typography>
            </ListItem>

            <ListItemButton onClick={handleThemeMenuOpen}>
              <ListItemIcon>
                <PaletteIcon />
              </ListItemIcon>
              <ListItemText
                primary="Change Theme"
                secondary={`Current: ${currentTheme.name}`}
              />
            </ListItemButton>

            <ListItem>
              <ListItemIcon>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </ListItemIcon>
              <ListItemText
                primary="Dark Mode"
                secondary="Toggle between light and dark mode"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  onChange={onToggleMode}
                  checked={mode === 'dark'}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ViewColumnIcon />
              </ListItemIcon>
              <ListItemText
                primary="Show Tags Column"
                secondary="Display tags column in Music Library"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  onChange={(e) => handleLibrarySettingChange('showTagsColumn', e.target.checked)}
                  checked={librarySettings.showTagsColumn !== false} // Default to true if undefined
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ViewColumnIcon />
              </ListItemIcon>
              <ListItemText
                primary="Show Extract Column"
                secondary="Display extract clip button for each song in Music Library"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  onChange={(e) => handleLibrarySettingChange('showExtractColumn', e.target.checked)}
                  checked={librarySettings.showExtractColumn !== false} // Default to true if undefined
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ViewColumnIcon />
              </ListItemIcon>
              <ListItemText
                primary="Show Wild Card Column"
                secondary="Display wild card button for each song in Music Library"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  onChange={(e) => handleLibrarySettingChange('showWildCardColumn', e.target.checked)}
                  checked={librarySettings.showWildCardColumn === true} // Default to false if undefined
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ my: 1 }} />

            {/* Controls Section */}
            <ListItem>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                Controls & Shortcuts
              </Typography>
            </ListItem>

            <ListItemButton onClick={handleKeyboardShortcuts}>
              <ListItemIcon>
                <KeyboardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Keyboard Shortcuts"
                secondary="View all available keyboard shortcuts"
              />
            </ListItemButton>

            <Divider sx={{ my: 1 }} />

            {/* Developer Section */}
            <ListItem>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                Developer Tools
              </Typography>
            </ListItem>

            <ListItemButton onClick={handleOpenDevTools}>
              <ListItemIcon>
                <DeveloperModeIcon />
              </ListItemIcon>
              <ListItemText
                primary="Developer Console"
                secondary="Open browser developer tools (F12)"
              />
            </ListItemButton>
          </List>

          {/* Authentication Test Component (Development Only) */}

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Theme Menu */}
      <Menu
        anchorEl={themeMenuAnchor}
        open={Boolean(themeMenuAnchor)}
        onClose={handleThemeMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            maxWidth: 250,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Choose Theme
          </Typography>
        </Box>
        {availableThemes.map((theme) => (
          <MenuItem
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1.5,
              px: 2,
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: getThemePreviewColor(theme),
                border: 2,
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {theme.name}
            </Typography>
            {theme.isCustom && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleEditTheme(theme, e)}
                  sx={{ p: 0.5 }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteTheme(theme, e)}
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
            {currentTheme.id === theme.id && (
              <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => handleThemeSelect('create-new')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.5,
            px: 2,
          }}
        >
          <AddIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="body2" sx={{ flex: 1 }}>
            Create Custom Theme
          </Typography>
        </MenuItem>
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
          <Chip
            label={`Current: ${currentTheme.name}`}
            size="small"
            sx={{
              backgroundColor: currentTheme.primary,
              color: 'white',
              fontSize: '0.75rem',
            }}
          />
        </Box>
      </Menu>

      {/* Custom Theme Editor */}
      <CustomThemeEditor
        open={customEditorOpen}
        onClose={handleCustomEditorClose}
        editingTheme={editingTheme}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        title="Sign In to Power Hour"
        subtitle="Sign in to sync your playlists and settings across devices"
      />
    </>
  );
};

export default Settings;
