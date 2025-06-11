import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
}) => {
  const shortcuts = [
    {
      category: 'Media Controls',
      items: [
        { keys: ['Space'], description: 'Play/Pause current song' },
        { keys: ['Esc'], description: 'Stop playback' },
        { keys: ['→'], description: 'Next song' },
        { keys: ['←'], description: 'Previous song' },
        { keys: ['↑'], description: 'Volume up' },
        { keys: ['↓'], description: 'Volume down' },
        { keys: ['M'], description: 'Mute/Unmute' },
      ],
    },
    {
      category: 'Search & Navigation',
      items: [
        { keys: ['Ctrl', 'F'], description: 'Focus search bar' },
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Open advanced search' },
        { keys: ['Ctrl', 'P'], description: 'Toggle smart playlists' },
        { keys: ['Ctrl', 'B'], description: 'Toggle clips sidebar' },
      ],
    },
    {
      category: 'Selection & Actions',
      items: [
        { keys: ['Ctrl', 'A'], description: 'Select all songs' },
        { keys: ['Del'], description: 'Clear selection' },
        { keys: ['Ctrl', 'E'], description: 'Extract selected clips' },
        { keys: ['Ctrl', 'R'], description: 'Wild card (random clips)' },
      ],
    },
    {
      category: 'Library Management',
      items: [
        { keys: ['F5'], description: 'Refresh library' },
        { keys: ['Ctrl', 'S'], description: 'Save playlist' },
        { keys: ['Ctrl', 'Z'], description: 'Undo' },
        { keys: ['Ctrl', 'Y'], description: 'Redo' },
      ],
    },
  ];

  const renderKeys = (keys: string[]) => (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <Typography variant="body2">+</Typography>}
          <Chip
            label={key}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              height: '24px',
              minWidth: '32px',
            }}
          />
        </React.Fragment>
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon />
          Keyboard Shortcuts
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Use these keyboard shortcuts to navigate and control the Power Hour app efficiently.
        </Typography>

        {shortcuts.map((category, categoryIndex) => (
          <Box key={category.category} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              {category.category}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {category.items.map((shortcut, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    px: 2,
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {shortcut.description}
                  </Typography>
                  {renderKeys(shortcut.keys)}
                </Box>
              ))}
            </Box>

            {categoryIndex < shortcuts.length - 1 && (
              <Divider sx={{ mt: 2 }} />
            )}
          </Box>
        ))}

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'info.main', borderRadius: 1, color: 'info.contrastText' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            💡 Pro Tips:
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • Shortcuts work when not typing in input fields
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • Use arrow keys for quick navigation through songs
          </Typography>
          <Typography variant="body2">
            • Combine Ctrl+A and Ctrl+E for bulk clip extraction
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
