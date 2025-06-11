/**
 * User Presence Indicator Component
 * Shows real-time user cursors and activity in collaborative playlists
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  Fade,
  Chip,
  Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Visibility as ViewIcon,
  TouchApp as SelectIcon
} from '@mui/icons-material';
import { UserCursor } from '../../types/collaboration';
import { authService } from '../../services/authService';

interface UserPresenceIndicatorProps {
  presence: Record<string, UserCursor>;
  playlistId: string;
  clipId?: string; // Show presence for specific clip
  compact?: boolean;
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  presence,
  playlistId,
  clipId,
  compact = false
}) => {
  const [visibleCursors, setVisibleCursors] = useState<UserCursor[]>([]);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    // Filter out current user and inactive cursors
    const activeCursors = Object.values(presence).filter(cursor => {
      if (cursor.userId === currentUser?.uid) return false;
      
      // If clipId is specified, only show cursors for that clip
      if (clipId && cursor.position.clipId !== clipId) return false;
      
      // Only show recent activity (within last 30 seconds)
      const now = new Date().getTime();
      const cursorTime = cursor.timestamp instanceof Date 
        ? cursor.timestamp.getTime() 
        : cursor.timestamp.toMillis();
      
      return (now - cursorTime) < 30000;
    });

    setVisibleCursors(activeCursors);
  }, [presence, currentUser?.uid, clipId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'editing':
        return <EditIcon sx={{ fontSize: 12 }} />;
      case 'dragging':
        return <DragIcon sx={{ fontSize: 12 }} />;
      case 'selecting':
        return <SelectIcon sx={{ fontSize: 12 }} />;
      case 'viewing':
      default:
        return <ViewIcon sx={{ fontSize: 12 }} />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'editing':
        return 'editing';
      case 'dragging':
        return 'reordering';
      case 'selecting':
        return 'selecting';
      case 'viewing':
      default:
        return 'viewing';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'editing':
        return '#4CAF50';
      case 'dragging':
        return '#FF9800';
      case 'selecting':
        return '#2196F3';
      case 'viewing':
      default:
        return '#757575';
    }
  };

  if (visibleCursors.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {visibleCursors.slice(0, 3).map((cursor) => (
          <Tooltip 
            key={cursor.userId}
            title={`${cursor.displayName} is ${getActionText(cursor.position.action)}`}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getActionColor(cursor.position.action),
                    border: '1px solid white'
                  }}
                />
              }
            >
              <Avatar
                sx={{ 
                  width: 20, 
                  height: 20, 
                  fontSize: 10,
                  backgroundColor: cursor.color,
                  border: `1px solid ${cursor.color}`,
                  animation: 'pulse 2s infinite'
                }}
              >
                {cursor.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </Tooltip>
        ))}
        
        {visibleCursors.length > 3 && (
          <Chip
            label={`+${visibleCursors.length - 3}`}
            size="small"
            sx={{ 
              height: 20,
              fontSize: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white'
            }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {visibleCursors.map((cursor) => (
        <Fade key={cursor.userId} in timeout={300}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1,
              border: `1px solid ${cursor.color}`,
              animation: 'fadeInOut 3s ease-in-out infinite'
            }}
          >
            <Avatar
              sx={{ 
                width: 24, 
                height: 24, 
                fontSize: 12,
                backgroundColor: cursor.color,
                animation: 'pulse 2s infinite'
              }}
            >
              {cursor.displayName.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold',
                  display: 'block'
                }}
              >
                {cursor.displayName}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getActionIcon(cursor.position.action)}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: getActionColor(cursor.position.action),
                    fontSize: 10
                  }}
                >
                  {getActionText(cursor.position.action)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: cursor.color,
                animation: 'blink 1s infinite'
              }}
            />
          </Box>
        </Fade>
      ))}

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default UserPresenceIndicator;
