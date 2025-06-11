import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Snackbar,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  WhatsApp as WhatsAppIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { useSocialMediaShare } from '../hooks/useSocialMediaShare';

interface SocialMediaShareDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: SharedPlaylist | null;
  appUrl?: string;
}

interface SocialPlatform {
  id: 'facebook' | 'twitter' | 'instagram' | 'whatsapp' | 'generic';
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const SocialMediaShareDialog: React.FC<SocialMediaShareDialogProps> = ({
  open,
  onClose,
  playlist,
  appUrl = import.meta.env.VITE_APP_URL || 'https://phat5-app.com' // Default URL, configurable via environment
}) => {
  const theme = useTheme();
  const { isSharing, lastShareResult, shareOnPlatform, clearLastResult } = useSocialMediaShare();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Social media platforms configuration
  const platforms: SocialPlatform[] = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2',
      description: 'Share on Facebook with friends'
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: <TwitterIcon />,
      color: '#1DA1F2',
      description: 'Tweet about this playlist'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <InstagramIcon />,
      color: '#E4405F',
      description: 'Copy text for Instagram post'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: '#25D366',
      description: 'Share via WhatsApp message'
    },
    {
      id: 'generic',
      name: 'Copy Link',
      icon: <CopyIcon />,
      color: theme.palette.primary.main,
      description: 'Copy formatted share text'
    }
  ];

  // Handle share result
  useEffect(() => {
    if (lastShareResult) {
      setSnackbarOpen(true);
    }
  }, [lastShareResult]);

  const handlePlatformShare = async (platformId: SocialPlatform['id']) => {
    if (!playlist) return;
    
    await shareOnPlatform(platformId, playlist, appUrl);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearLastResult();
  };

  const handleClose = () => {
    if (!isSharing) {
      clearLastResult();
      onClose();
    }
  };

  if (!playlist) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: '50vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ShareIcon sx={{ mr: 1 }} />
              Share on Social Media
            </Box>
            <IconButton onClick={handleClose} disabled={isSharing}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Playlist info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {playlist.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {playlist.clips.length} clips • Created by {playlist.creator}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Share Code: <strong>{playlist.shareCode}</strong>
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" gutterBottom>
            Choose a platform to share:
          </Typography>

          {/* Social media platforms grid */}
          <Grid container spacing={2}>
            {platforms.map((platform) => (
              <Grid item xs={12} sm={6} key={platform.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: isSharing ? 'not-allowed' : 'pointer',
                    opacity: isSharing ? 0.6 : 1,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: isSharing ? 'none' : 'translateY(-2px)',
                      boxShadow: isSharing ? 'none' : theme.shadows[4],
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handlePlatformShare(platform.id)}
                    disabled={isSharing}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 0 }}>
                      <Box
                        sx={{
                          color: platform.color,
                          mb: 1,
                          '& svg': { fontSize: 40 }
                        }}
                      >
                        {platform.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {platform.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {platform.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Instructions */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> For Instagram, the post text will be copied to your clipboard. 
              For other platforms, a share dialog will open in a new window.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSharing}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={lastShareResult?.success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {lastShareResult?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SocialMediaShareDialog;
