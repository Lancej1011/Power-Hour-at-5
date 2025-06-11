/**
 * Collaborators List Component
 * Displays and manages collaborators in a collaborative playlist
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as CrownIcon,
  Visibility as ViewIcon,
  Circle as CircleIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { CollaborativePlaylist, Collaborator, CollaborationPermission } from '../../types/collaboration';
import { authService } from '../../services/authService';

interface CollaboratorsListProps {
  playlist: CollaborativePlaylist;
  onInviteClick?: () => void;
  compact?: boolean;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
  playlist,
  onInviteClick,
  compact = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const {
    updateCollaboratorPermission,
    removeCollaborator,
    lastError
  } = useCollaborationStore();

  const currentUser = authService.getCurrentUser();
  const isOwner = currentUser?.uid === playlist.ownerId;
  
  const collaborators = Object.values(playlist.collaborators);
  const sortedCollaborators = collaborators.sort((a, b) => {
    // Owner first, then by permission level, then by name
    if (a.userId === playlist.ownerId) return -1;
    if (b.userId === playlist.ownerId) return 1;
    
    const permissionOrder = { owner: 0, editor: 1, viewer: 2 };
    const aOrder = permissionOrder[a.permission];
    const bOrder = permissionOrder[b.permission];
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.displayName.localeCompare(b.displayName);
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedCollaborator(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCollaborator(null);
  };

  const handlePermissionChange = async (permission: CollaborationPermission) => {
    if (!selectedCollaborator) return;
    
    await updateCollaboratorPermission(playlist.id, selectedCollaborator, permission);
    handleMenuClose();
  };

  const handleRemoveCollaborator = async () => {
    if (!selectedCollaborator) return;
    
    await removeCollaborator(playlist.id, selectedCollaborator);
    setRemoveDialogOpen(false);
    handleMenuClose();
  };

  const getPermissionIcon = (permission: CollaborationPermission) => {
    switch (permission) {
      case 'owner':
        return <CrownIcon sx={{ fontSize: 16, color: '#FFD700' }} />;
      case 'editor':
        return <EditIcon sx={{ fontSize: 16, color: '#4CAF50' }} />;
      case 'viewer':
        return <ViewIcon sx={{ fontSize: 16, color: '#2196F3' }} />;
    }
  };

  const getPermissionColor = (permission: CollaborationPermission) => {
    switch (permission) {
      case 'owner':
        return '#FFD700';
      case 'editor':
        return '#4CAF50';
      case 'viewer':
        return '#2196F3';
    }
  };

  const getPresenceColor = (collaborator: Collaborator) => {
    if (!collaborator.isOnline) return '#757575';
    
    switch (collaborator.presence) {
      case 'online':
        return '#4CAF50';
      case 'away':
        return '#FF9800';
      case 'offline':
        return '#757575';
      default:
        return '#757575';
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {sortedCollaborators.slice(0, 3).map((collaborator) => (
            <Tooltip 
              key={collaborator.userId}
              title={`${collaborator.displayName} (${collaborator.permission})`}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <CircleIcon 
                    sx={{ 
                      fontSize: 12, 
                      color: getPresenceColor(collaborator),
                      backgroundColor: 'white',
                      borderRadius: '50%'
                    }} 
                  />
                }
              >
                <Avatar
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    fontSize: 12,
                    border: `2px solid ${getPermissionColor(collaborator.permission)}`
                  }}
                >
                  {collaborator.displayName.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
            </Tooltip>
          ))}
          
          {collaborators.length > 3 && (
            <Chip
              label={`+${collaborators.length - 3}`}
              size="small"
              sx={{ 
                height: 24,
                fontSize: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
          )}
        </Box>
        
        {onInviteClick && isOwner && (
          <Tooltip title="Invite collaborators">
            <IconButton
              size="small"
              onClick={onInviteClick}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <PersonAddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Collaborators ({collaborators.length})
        </Typography>
        
        {onInviteClick && isOwner && (
          <Button
            startIcon={<PersonAddIcon />}
            onClick={onInviteClick}
            size="small"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.5)'
              }
            }}
            variant="outlined"
          >
            Invite
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sortedCollaborators.map((collaborator) => (
          <Box
            key={collaborator.userId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <CircleIcon 
                  sx={{ 
                    fontSize: 14, 
                    color: getPresenceColor(collaborator),
                    backgroundColor: 'white',
                    borderRadius: '50%'
                  }} 
                />
              }
            >
              <Avatar
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: `2px solid ${getPermissionColor(collaborator.permission)}`
                }}
              >
                {collaborator.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>
                {collaborator.displayName}
                {collaborator.userId === currentUser?.uid && (
                  <Typography component="span" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 1 }}>
                    (You)
                  </Typography>
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  icon={getPermissionIcon(collaborator.permission)}
                  label={collaborator.permission.charAt(0).toUpperCase() + collaborator.permission.slice(1)}
                  size="small"
                  sx={{
                    backgroundColor: getPermissionColor(collaborator.permission),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {collaborator.isOnline ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>

            {isOwner && collaborator.userId !== playlist.ownerId && (
              <IconButton
                onClick={(e) => handleMenuOpen(e, collaborator.userId)}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>

      {/* Collaborator Management Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }
        }}
      >
        <MenuItem onClick={() => handlePermissionChange('editor')}>
          <ListItemIcon>
            <EditIcon sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Make Editor" 
            sx={{ color: 'white' }}
          />
        </MenuItem>
        
        <MenuItem onClick={() => handlePermissionChange('viewer')}>
          <ListItemIcon>
            <ViewIcon sx={{ color: '#2196F3' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Make Viewer" 
            sx={{ color: 'white' }}
          />
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            setRemoveDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: '#f44336' }}
        >
          <ListItemIcon>
            <DeleteIcon sx={{ color: '#f44336' }} />
          </ListItemIcon>
          <ListItemText primary="Remove" />
        </MenuItem>
      </Menu>

      {/* Remove Collaborator Confirmation Dialog */}
      <Dialog
        open={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          Remove Collaborator
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'white' }}>
            Are you sure you want to remove this collaborator? They will lose access to the playlist immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRemoveDialogOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRemoveCollaborator}
            sx={{ color: '#f44336' }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaboratorsList;
