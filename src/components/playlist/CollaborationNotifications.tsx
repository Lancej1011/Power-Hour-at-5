/**
 * Collaboration Notifications Component
 * Displays and manages collaboration-related notifications
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useCollaborationInvitations, useCollaborationNotifications } from '../../stores/collaborationStore';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationNotificationsProps {
  onInvitationResponse?: (invitationId: string, response: 'accept' | 'decline') => void;
}

const CollaborationNotifications: React.FC<CollaborationNotificationsProps> = ({
  onInvitationResponse
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const {
    receivedInvitations,
    unreadCount: invitationUnreadCount,
    respondToInvitation
  } = useCollaborationInvitations();

  const {
    notifications,
    unreadCount: notificationUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  } = useCollaborationNotifications();

  const totalUnreadCount = invitationUnreadCount + notificationUnreadCount;
  const pendingInvitations = receivedInvitations.filter(inv => inv.status === 'pending');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleInvitationResponse = async (invitationId: string, response: 'accept' | 'decline') => {
    await respondToInvitation(invitationId, response);
    if (onInvitationResponse) {
      onInvitationResponse(invitationId, response);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invitation_received':
        return <PersonAddIcon sx={{ fontSize: 16, color: '#2196F3' }} />;
      case 'invitation_accepted':
        return <CheckIcon sx={{ fontSize: 16, color: '#4CAF50' }} />;
      case 'user_joined':
        return <GroupIcon sx={{ fontSize: 16, color: '#4CAF50' }} />;
      case 'user_left':
        return <GroupIcon sx={{ fontSize: 16, color: '#FF9800' }} />;
      case 'playlist_updated':
        return <EditIcon sx={{ fontSize: 16, color: '#9C27B0' }} />;
      default:
        return <NotificationsIcon sx={{ fontSize: 16, color: '#757575' }} />;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Box>
      <Tooltip title="Collaboration notifications">
        <IconButton
          onClick={handleMenuOpen}
          sx={{ 
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Badge 
            badgeContent={totalUnreadCount} 
            color="error"
            max={99}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              Notifications
            </Typography>
            
            {totalUnreadCount > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={markAllAsRead}
                  startIcon={<MarkReadIcon />}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: 10
                  }}
                >
                  Mark all read
                </Button>
                <Button
                  size="small"
                  onClick={clearAll}
                  startIcon={<ClearIcon />}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: 10
                  }}
                >
                  Clear
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Box sx={{ p: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                px: 1, 
                py: 0.5,
                fontWeight: 'bold'
              }}
            >
              Pending Invitations
            </Typography>
            
            {pendingInvitations.map((invitation) => (
              <Box
                key={invitation.id}
                sx={{
                  p: 1.5,
                  m: 0.5,
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(33, 150, 243, 0.3)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {invitation.inviterName.charAt(0).toUpperCase()}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {invitation.inviterName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      invited you to collaborate on "{invitation.playlistName}"
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        label={invitation.permission}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontSize: 10
                        }}
                      />
                      
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {formatTimestamp(invitation.createdAt)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                        startIcon={<CheckIcon />}
                        sx={{
                          backgroundColor: '#4CAF50',
                          '&:hover': { backgroundColor: '#45a049' },
                          fontSize: 10
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                        startIcon={<CloseIcon />}
                        sx={{
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: 10,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.5)'
                          }
                        }}
                      >
                        Decline
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
            
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
          </Box>
        )}

        {/* Other Notifications */}
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {notifications.length === 0 && pendingInvitations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                sx={{
                  backgroundColor: notification.isRead 
                    ? 'transparent' 
                    : 'rgba(255, 255, 255, 0.05)',
                  borderLeft: notification.isRead 
                    ? 'none' 
                    : '3px solid #2196F3',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'white',
                        fontWeight: notification.isRead ? 'normal' : 'bold'
                      }}
                    >
                      {notification.message}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    >
                      {formatTimestamp(notification.createdAt)}
                    </Typography>
                  }
                />
              </MenuItem>
            ))
          )}
        </Box>
      </Menu>
    </Box>
  );
};

export default CollaborationNotifications;
