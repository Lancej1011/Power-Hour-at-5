import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Badge,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuth, useAuthStatus } from '../contexts/AuthContext';
import { LoginModal } from './auth';
import HomeIcon from '@mui/icons-material/Home';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import ShareIcon from '@mui/icons-material/Share';

interface NavigationTab {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  tooltip?: string;
  requireAuth?: boolean;
  requireNonAnonymous?: boolean;
  authPromptTitle?: string;
  authPromptMessage?: string;
}

interface ModernNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  enableAuthenticationAwareness?: boolean;
}

const ModernNavigation: React.FC<ModernNavigationProps> = ({
  currentTab,
  onTabChange,
  tabs,
  variant = 'standard',
  enableAuthenticationAwareness = false,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const { user, canAccessFeature } = useAuth();
  const { isAuthenticated, isAnonymous, hasFullAccount } = useAuthStatus();

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptData, setAuthPromptData] = useState<{
    title: string;
    message: string;
    requireNonAnonymous: boolean;
  } | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Filter tabs based on authentication requirements
  const visibleTabs = React.useMemo(() => {
    try {
      // Ensure tabs is an array
      const safeTabs = Array.isArray(tabs) ? tabs : [];

      return safeTabs.filter(tab => {
        try {
          if (!tab) return false;
          if (!enableAuthenticationAwareness) return true;

          // Hide tabs that require authentication if user is not authenticated
          if (tab.requireAuth && !isAuthenticated) {
            return false;
          }

          // Hide tabs that require non-anonymous account if user is anonymous
          if (tab.requireNonAnonymous && (!isAuthenticated || isAnonymous)) {
            return false;
          }

          return true;
        } catch (error) {
          console.error('Error filtering tab:', error);
          return false;
        }
      });
    } catch (error) {
      console.error('Error in visibleTabs filter:', error);
      return [];
    }
  }, [tabs, enableAuthenticationAwareness, isAuthenticated, isAnonymous]);

  console.log('ModernNavigation - All tabs:', Array.isArray(tabs) ? tabs.map(t => t?.value || 'unknown') : []);
  console.log('ModernNavigation - Visible tabs:', Array.isArray(visibleTabs) ? visibleTabs.map(t => t?.value || 'unknown') : []);
  console.log('ModernNavigation - Current tab:', currentTab);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    console.log('ModernNavigation handleChange - newValue:', newValue);
    console.log('ModernNavigation handleChange - visibleTabs:', Array.isArray(visibleTabs) ? visibleTabs.map(t => t?.value || 'unknown') : []);

    // Get the tab value from the filtered visible tabs
    const tabValue = visibleTabs[newValue]?.value;
    console.log('ModernNavigation handleChange - tabValue:', tabValue);
    if (!tabValue) return;

    // Check authentication requirements if enabled
    if (enableAuthenticationAwareness) {
      const tab = visibleTabs[newValue];
      if (tab) {
        // Check if tab requires authentication
        if (tab.requireAuth && !isAuthenticated) {
          setAuthPromptData({
            title: tab.authPromptTitle || 'Authentication Required',
            message: tab.authPromptMessage || `You need to sign in to access ${tab.label}.`,
            requireNonAnonymous: false,
          });
          setAuthPromptOpen(true);
          return;
        }

        // Check if tab requires non-anonymous account
        if (tab.requireNonAnonymous && (!isAuthenticated || isAnonymous)) {
          setAuthPromptData({
            title: tab.authPromptTitle || 'Full Account Required',
            message: tab.authPromptMessage || `You need a full account to access ${tab.label}. Anonymous accounts cannot use this feature.`,
            requireNonAnonymous: true,
          });
          setAuthPromptOpen(true);
          return;
        }
      }
    }

    onTabChange(tabValue);
  };

  // Get the current tab index from visible tabs
  const currentTabIndex = visibleTabs.findIndex(tab => tab.value === currentTab);
  console.log('ModernNavigation - currentTabIndex:', currentTabIndex);

  return (
    <>
      <Tabs
        value={currentTabIndex >= 0 ? currentTabIndex : 0}
        onChange={handleChange}
        variant={variant}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
          '& .MuiTab-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            minHeight: 48,
            '&.Mui-selected': {
              color: 'white',
            },
            '&:hover': {
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '& .MuiTab-iconWrapper': {
              marginRight: 1,
              marginBottom: 0,
            },
          },
        }}
      >
        {visibleTabs.map((tab) => {
          let tabIcon = tab.icon;
          let tabTooltip = tab.tooltip;

          if (enableAuthenticationAwareness) {
            // Add authentication indicators to tab icons
            if (tab.requireAuth || tab.requireNonAnonymous) {
              if (!isAuthenticated || (tab.requireNonAnonymous && isAnonymous)) {
                tabIcon = (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {tab.icon}
                    <LockIcon sx={{ fontSize: '0.75rem', opacity: 0.7 }} />
                  </Box>
                );
                tabTooltip = `${tab.tooltip || tab.label} (Authentication required)`;
              }
            }
          }

          const tabContent = (
            <Tab
              key={tab.value}
              label={tab.label}
              disabled={tab.disabled}
              icon={
                tab.badge ? (
                  <Badge
                    badgeContent={tab.badge}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.625rem',
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: 'primary.main',
                      },
                    }}
                  >
                    {tabIcon as React.ReactElement}
                  </Badge>
                ) : (
                  tabIcon as React.ReactElement
                )
              }
              iconPosition="start"
            />
          );

          return tabTooltip ? (
            <Tooltip key={tab.value} title={tabTooltip} placement="bottom">
              {tabContent}
            </Tooltip>
          ) : (
            tabContent
          );
        })}
      </Tabs>

      {/* Authentication Prompt Dialog */}
      <Dialog
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon />
          {authPromptData?.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {authPromptData?.message}
          </Typography>

          {authPromptData?.requireNonAnonymous && isAuthenticated && isAnonymous && (
            <Typography variant="body2" color="text.secondary">
              You're currently signed in anonymously. You'll need to create a full account or link your anonymous account to an email to access this feature.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthPromptOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setAuthPromptOpen(false);
              setLoginModalOpen(true);
            }}
            startIcon={<PersonIcon />}
          >
            {authPromptData?.requireNonAnonymous && isAuthenticated && isAnonymous
              ? 'Upgrade Account'
              : 'Sign In'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          // Optionally trigger the original tab change after successful authentication
        }}
      />
    </>
  );
};

// Default tabs for the Power Hour app
export const defaultTabs: NavigationTab[] = [
  {
    label: 'Create Mix',
    value: 'create',
    icon: <HomeIcon />,
    tooltip: 'Create and edit your Power Hour mix',
  },
  {
    label: 'Playlists',
    value: 'playlists',
    icon: <QueueMusicIcon />,
    tooltip: 'Manage your saved playlists',
  },
  {
    label: 'Visualizer',
    value: 'visualizer',
    icon: <EqualizerIcon />,
    tooltip: 'Music visualizer and immersive experience',
  },
];

// Authentication-aware tabs for the Power Hour app
export const authAwareTabs: NavigationTab[] = [
  {
    label: 'Create Mix',
    value: 'create',
    icon: <HomeIcon />,
    tooltip: 'Create and edit your Power Hour mix',
  },
  {
    label: 'Playlists',
    value: 'playlists',
    icon: <QueueMusicIcon />,
    tooltip: 'Manage your saved playlists',
  },
  {
    label: 'YouTube',
    value: 'youtube',
    icon: <LibraryMusicIcon />,
    tooltip: 'Create Power Hour playlists from YouTube videos',
  },
  {
    label: 'Community',
    value: 'community',
    icon: <ShareIcon />,
    tooltip: 'Discover and share playlists with the community',
    requireAuth: true,
    authPromptTitle: 'Join the Community',
    authPromptMessage: 'Sign in to discover amazing playlists shared by other users and share your own creations with the community.',
  },
  {
    label: 'Visualizer',
    value: 'visualizer',
    icon: <EqualizerIcon />,
    tooltip: 'Music visualizer and immersive experience',
  },
];

export default ModernNavigation;
