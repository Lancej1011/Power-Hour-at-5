import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useThemeContext } from '../contexts/ThemeContext';
import CustomThemeEditor from './CustomThemeEditor';
import { ColorTheme } from '../themes';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes, deleteCustomTheme } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customEditorOpen, setCustomEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ColorTheme | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (themeId: string) => {
    if (themeId === 'create-new') {
      setEditingTheme(null);
      setCustomEditorOpen(true);
      handleClose();
    } else {
      setTheme(themeId);
      handleClose();
    }
  };

  const handleEditTheme = (theme: ColorTheme, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTheme(theme);
    setCustomEditorOpen(true);
    handleClose();
  };

  const handleDeleteTheme = (theme: ColorTheme, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the theme "${theme.name}"?`)) {
      deleteCustomTheme(theme.id);
    }
  };

  const handleCustomEditorClose = () => {
    setCustomEditorOpen(false);
    setEditingTheme(null);
  };

  const getThemePreviewColor = (theme: any) => {
    return theme.primary;
  };

  return (
    <>
      <Tooltip title="Change Theme">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
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
      <CustomThemeEditor
        open={customEditorOpen}
        onClose={handleCustomEditorClose}
        editingTheme={editingTheme}
      />
    </>
  );
};

export default ThemeSelector;
