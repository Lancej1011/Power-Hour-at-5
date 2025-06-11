/**
 * Conflict Resolution Dialog
 * Handles conflicts in collaborative playlist editing
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper
} from '@mui/material';
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';
import { PlaylistOperation, ConflictResolution } from '../../types/collaboration';
import { formatDistanceToNow } from 'date-fns';

interface ConflictResolutionDialogProps {
  open: boolean;
  onClose: () => void;
  conflictingOperations: PlaylistOperation[];
  onResolve: (resolution: ConflictResolution) => void;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onClose,
  conflictingOperations,
  onResolve
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'accept' | 'reject' | 'merge'>('accept');
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  const handleResolve = () => {
    if (!selectedOperation) return;

    const operation = conflictingOperations.find(op => op.id === selectedOperation);
    if (!operation) return;

    const resolution: ConflictResolution = {
      operationId: operation.id,
      resolution: selectedResolution,
      reason: getResolutionReason()
    };

    onResolve(resolution);
    onClose();
  };

  const getResolutionReason = (): string => {
    switch (selectedResolution) {
      case 'accept':
        return 'User chose to accept the conflicting operation';
      case 'reject':
        return 'User chose to reject the conflicting operation';
      case 'merge':
        return 'User chose to merge the conflicting operations';
      default:
        return 'Unknown resolution';
    }
  };

  const getOperationDescription = (operation: PlaylistOperation): string => {
    switch (operation.type) {
      case 'add_clip':
        return `Added clip "${operation.data.clipData?.name || 'Unknown'}"`;
      case 'remove_clip':
        return `Removed clip "${operation.data.clipId}"`;
      case 'reorder_clips':
        return `Moved clip from position ${operation.data.fromIndex + 1} to ${operation.data.toIndex + 1}`;
      case 'update_clip':
        return `Updated clip "${operation.data.clipId}"`;
      case 'update_metadata':
        return 'Updated playlist metadata';
      case 'update_drinking_sound':
        return 'Updated drinking sound';
      default:
        return 'Unknown operation';
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'add_clip':
        return '➕';
      case 'remove_clip':
        return '➖';
      case 'reorder_clips':
        return '🔄';
      case 'update_clip':
        return '✏️';
      case 'update_metadata':
        return '📝';
      case 'update_drinking_sound':
        return '🔊';
      default:
        return '❓';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
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
        <WarningIcon />
        Conflict Detected
      </DialogTitle>

      <DialogContent sx={{ color: 'white' }}>
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
        >
          Multiple users have made conflicting changes to this playlist. Please choose how to resolve the conflict.
        </Alert>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Conflicting Operations:
        </Typography>

        <Box sx={{ mb: 3 }}>
          {conflictingOperations.map((operation, index) => (
            <Paper
              key={operation.id}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: selectedOperation === operation.id 
                  ? '2px solid white' 
                  : '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }
              }}
              onClick={() => setSelectedOperation(operation.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: 24 }}>
                  {getOperationIcon(operation.type)}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {getOperationDescription(operation)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                    <Chip
                      icon={<PersonIcon />}
                      label={`User ${operation.userId.slice(-4)}`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    />
                    <Chip
                      icon={<ScheduleIcon />}
                      label={formatTimestamp(operation.timestamp)}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', my: 2 }} />

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Resolution Strategy:
        </Typography>

        <RadioGroup
          value={selectedResolution}
          onChange={(e) => setSelectedResolution(e.target.value as 'accept' | 'reject' | 'merge')}
        >
          <FormControlLabel
            value="accept"
            control={<Radio sx={{ color: 'white' }} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Accept Selected Operation
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Apply the selected operation and discard others
                </Typography>
              </Box>
            }
            sx={{ color: 'white', mb: 1 }}
          />
          
          <FormControlLabel
            value="reject"
            control={<Radio sx={{ color: 'white' }} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Reject Selected Operation
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Discard the selected operation and keep current state
                </Typography>
              </Box>
            }
            sx={{ color: 'white', mb: 1 }}
          />
          
          <FormControlLabel
            value="merge"
            control={<Radio sx={{ color: 'white' }} />}
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  <MergeIcon sx={{ fontSize: 16, mr: 1 }} />
                  Attempt Automatic Merge
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Try to combine all operations intelligently
                </Typography>
              </Box>
            }
            sx={{ color: 'white' }}
          />
        </RadioGroup>

        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: 1,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            💡 Tip:
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Select an operation above and choose a resolution strategy. 
            If you're unsure, "Accept" is usually the safest option.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          disabled={!selectedOperation}
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
          Resolve Conflict
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionDialog;
