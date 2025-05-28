import React from 'react';
import { Box, IconButton } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

// No global type declaration here - it's in src/types/global.d.ts

const WindowControls: React.FC = () => {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  const handleOpenDevTools = () => {
    if (window.electronAPI) {
      (window.electronAPI as any).openDevTools();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        WebkitAppRegion: 'no-drag',
      }}
    >
      <IconButton
        size="small"
        onClick={handleOpenDevTools}
        sx={{
          color: 'white',
          padding: '4px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
        title="Open Developer Tools (F12)"
      >
        <DeveloperModeIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleMinimize}
        sx={{
          color: 'white',
          padding: '4px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <MinimizeIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleMaximize}
        sx={{
          color: 'white',
          padding: '4px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <CropSquareIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleClose}
        sx={{
          color: 'white',
          padding: '4px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 0, 0, 0.7)'
          }
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default WindowControls;