import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Badge,
  Tooltip,
} from '@mui/material';
import { useThemeContext } from '../contexts/ThemeContext';
import HomeIcon from '@mui/icons-material/Home';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';

interface NavigationTab {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  tooltip?: string;
}

interface ModernNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  variant?: 'standard' | 'scrollable' | 'fullWidth';
}

const ModernNavigation: React.FC<ModernNavigationProps> = ({
  currentTab,
  onTabChange,
  tabs,
  variant = 'standard',
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{
      borderBottom: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant={variant}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 64,
          '& .MuiTabs-flexContainer': {
            gap: 1,
            px: 3,
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
          },
          '& .MuiTab-root': {
            minHeight: 64,
            minWidth: 120,
            borderRadius: '12px 12px 0 0',
            margin: '0 2px',
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(currentTheme.primary, 0.08),
              color: currentTheme.primary,
              transform: 'translateY(-1px)',
            },
            '&.Mui-selected': {
              color: currentTheme.primary,
              backgroundColor: alpha(currentTheme.primary, 0.05),
              fontWeight: 600,
              '&:hover': {
                backgroundColor: alpha(currentTheme.primary, 0.1),
              },
            },
            '&.Mui-disabled': {
              opacity: 0.5,
              color: theme.palette.text.disabled,
            },
          },
        }}
      >
        {tabs.map((tab) => {
          const tabContent = (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
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
                        background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                      },
                    }}
                  >
                    {tab.icon as React.ReactElement}
                  </Badge>
                ) : (
                  tab.icon as React.ReactElement
                )
              }
              iconPosition="start"
              sx={{
                '& .MuiTab-iconWrapper': {
                  marginRight: 1,
                  marginBottom: 0,
                },
              }}
            />
          );

          return tab.tooltip ? (
            <Tooltip key={tab.value} title={tab.tooltip} placement="bottom">
              {tabContent}
            </Tooltip>
          ) : (
            tabContent
          );
        })}
      </Tabs>
    </Box>
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

export default ModernNavigation;
