/**
 * Collaboration Invite Dialog
 * Dialog for inviting users to collaborative playlists
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { CollaborationPermission } from '../../types/collaboration';

interface CollaborationInviteDialogProps {
  open: boolean;
  onClose: () => void;
  playlistId: string;
  playlistName: string;
  inviteCode?: string;
}

const CollaborationInviteDialog: React.FC<CollaborationInviteDialogProps> = ({
  open,
  onClose,
  playlistId,
  playlistName,
  inviteCode
}) => {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<CollaborationPermission>('editor');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    sendInvitation,
    isSendingInvitation,
    lastError,
    clearError
  } = useCollaborationStore();

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      return;
    }

    try {
      const success = await sendInvitation({
        playlistId,
        playlistName,
        inviteeEmail: email.trim(),
        permission,
        inviteCode: inviteCode || '',
        message: message.trim() || undefined
      });

      if (success) {
        setEmail('');
        setMessage('');
        onClose();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
    }
  };

  const handleClose = () => {
    clearError();
    setCopied(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        color: 'white',
        fontWeight: 'bold'
      }}>
        <PersonAddIcon />
        Invite Collaborators
      </DialogTitle>

      <DialogContent sx={{ color: 'white' }}>
        {lastError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            {lastError}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
          Invite others to collaborate on "{playlistName}"
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Chip
            label="Email Invitation"
            icon={<EmailIcon />}
            onClick={() => setInviteMethod('email')}
            variant={inviteMethod === 'email' ? 'filled' : 'outlined'}
            sx={{
              backgroundColor: inviteMethod === 'email' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'transparent',
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          />
          <Chip
            label="Share Code"
            icon={<LinkIcon />}
            onClick={() => setInviteMethod('code')}
            variant={inviteMethod === 'code' ? 'filled' : 'outlined'}
            sx={{
              backgroundColor: inviteMethod === 'code' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'transparent',
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          />
        </Box>

        {inviteMethod === 'email' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />

            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Permission Level
              </InputLabel>
              <Select
                value={permission}
                onChange={(e) => setPermission(e.target.value as CollaborationPermission)}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white'
                  }
                }}
              >
                <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
                <MenuItem value="editor">Editor (Can Edit)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Personal Message (Optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              placeholder="Add a personal message to your invitation..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Share this code with others to let them join the collaboration:
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace', 
                  letterSpacing: 2,
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                {inviteCode || 'LOADING...'}
              </Typography>
              
              <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                <IconButton
                  onClick={handleCopyInviteCode}
                  disabled={!inviteCode}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Typography variant="caption" sx={{ mt: 1, opacity: 0.7, display: 'block' }}>
              Anyone with this code can join as an {permission.toLowerCase()}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        <Box sx={{ 
          p: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: 1,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Permission Levels:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              • <strong>Viewer:</strong> Can view playlist and see real-time changes
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              • <strong>Editor:</strong> Can add, remove, and reorder clips
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              • <strong>Owner:</strong> Full control including managing collaborators
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          Cancel
        </Button>
        
        {inviteMethod === 'email' && (
          <Button
            onClick={handleSendInvitation}
            variant="contained"
            disabled={!email.trim() || isSendingInvitation}
            startIcon={isSendingInvitation ? <CircularProgress size={16} /> : <PersonAddIcon />}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              },
              '&:disabled': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.5)'
              }
            }}
          >
            {isSendingInvitation ? 'Sending...' : 'Send Invitation'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CollaborationInviteDialog;
