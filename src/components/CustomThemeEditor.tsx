import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  IconButton,
  Popover,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SketchPicker } from 'react-color';
import { ColorTheme } from '../themes';
import { useThemeContext } from '../contexts/ThemeContext';

interface CustomThemeEditorProps {
  open: boolean;
  onClose: () => void;
  editingTheme?: ColorTheme | null;
}

const CustomThemeEditor: React.FC<CustomThemeEditorProps> = ({ open, onClose, editingTheme }) => {
  const { saveCustomTheme } = useThemeContext();

  const [themeName, setThemeName] = useState(() =>
    editingTheme?.name || 'My Custom Theme'
  );

  const [colors, setColors] = useState(() => {
    if (editingTheme) {
      return {
        primary: editingTheme.primary,
        secondary: editingTheme.secondary,
        darkBackground: editingTheme.darkBackground,
        darkPaper: editingTheme.darkPaper,
        lightBackground: editingTheme.lightBackground,
        lightPaper: editingTheme.lightPaper,
      };
    }
    return {
      primary: '#9c27b0',
      secondary: '#7c4dff',
      darkBackground: '#18122B',
      darkPaper: '#231942',
      lightBackground: '#f3eaff',
      lightPaper: '#fff',
    };
  });

  const [colorPickerState, setColorPickerState] = useState<{
    open: boolean;
    field: keyof typeof colors | null;
    anchorEl: HTMLElement | null;
  }>({
    open: false,
    field: null,
    anchorEl: null,
  });

  const handleColorChange = (field: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [field]: value }));
  };

  const handleColorClick = (field: keyof typeof colors, event: React.MouseEvent<HTMLElement>) => {
    setColorPickerState({
      open: true,
      field,
      anchorEl: event.currentTarget,
    });
  };

  const handleColorPickerClose = () => {
    setColorPickerState({
      open: false,
      field: null,
      anchorEl: null,
    });
  };

  const handleColorPickerChange = (color: any) => {
    if (colorPickerState.field) {
      handleColorChange(colorPickerState.field, color.hex);
    }
  };

  const handleSave = () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    const themeId = editingTheme?.id || `custom_${Date.now()}`;
    const customTheme: ColorTheme = {
      id: themeId,
      name: themeName.trim(),
      ...colors,
      isCustom: true,
    };

    saveCustomTheme(customTheme);
    onClose();
  };

  const handleReset = () => {
    setColors({
      primary: '#9c27b0',
      secondary: '#7c4dff',
      darkBackground: '#18122B',
      darkPaper: '#231942',
      lightBackground: '#f3eaff',
      lightPaper: '#fff',
    });
    setThemeName(editingTheme?.name || 'My Custom Theme');
  };

  const colorFields = [
    { key: 'primary' as const, label: 'Primary Color', description: 'Main brand color for buttons, app bar, etc.' },
    { key: 'secondary' as const, label: 'Secondary Color', description: 'Accent color for highlights and secondary elements' },
    { key: 'darkBackground' as const, label: 'Dark Background', description: 'Background color for dark mode' },
    { key: 'darkPaper' as const, label: 'Dark Paper', description: 'Card/paper background for dark mode' },
    { key: 'lightBackground' as const, label: 'Light Background', description: 'Background color for light mode' },
    { key: 'lightPaper' as const, label: 'Light Paper', description: 'Card/paper background for light mode' },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {editingTheme ? 'Edit Custom Theme' : 'Create Custom Theme'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your own custom color theme. Click on color boxes to open the color picker.
          </Typography>

          <TextField
            label="Theme Name"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            placeholder="Enter a name for your theme"
          />
          <Grid container spacing={3}>
            {colorFields.map(({ key, label, description }) => (
              <Grid key={key} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    onClick={(e) => handleColorClick(key, e)}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: colors[key],
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      flexShrink: 0,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label={label}
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="#000000"
                      helperText={description}
                    />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 60,
                  height: 40,
                  backgroundColor: colors.primary,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                Primary
              </Box>
              <Box
                sx={{
                  width: 60,
                  height: 40,
                  backgroundColor: colors.secondary,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                Secondary
              </Box>
              <Box
                sx={{
                  width: 60,
                  height: 40,
                  backgroundColor: colors.darkBackground,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                Dark BG
              </Box>
              <Box
                sx={{
                  width: 60,
                  height: 40,
                  backgroundColor: colors.darkPaper,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                Dark Paper
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReset} color="secondary">
            Reset to Default
          </Button>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingTheme ? 'Update Theme' : 'Save Custom Theme'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Color Picker Popover */}
      <Popover
        open={colorPickerState.open}
        anchorEl={colorPickerState.anchorEl}
        onClose={handleColorPickerClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2 }}>
          <SketchPicker
            color={colorPickerState.field ? colors[colorPickerState.field] : '#000000'}
            onChange={handleColorPickerChange}
            disableAlpha
          />
        </Box>
      </Popover>
    </>
  );
};

export default CustomThemeEditor;
