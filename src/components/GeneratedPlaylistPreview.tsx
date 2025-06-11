/**
 * Generated Playlist Preview Component
 * Displays and allows editing of generated Power Hour playlist
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Divider,
  Alert,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapIcon,
  PlayArrow as PlayIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  PowerHourGenerationResult,
  GeneratedClip,
  GeneratedPlaylistPreviewProps,
  PowerHourGenerationConfig,
} from '../types/powerHour';
import { formatTime } from '../utils/youtubeUtils';

const GeneratedPlaylistPreview: React.FC<GeneratedPlaylistPreviewProps> = ({
  result,
  onSave,
  onRegenerate,
  onEditClip,
  onRemoveClip,
  onReplaceClip,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // State
  const [playlistName, setPlaylistName] = useState(
    `Power Hour - ${new Date().toLocaleDateString()}`
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedClip, setSelectedClip] = useState<GeneratedClip | null>(null);
  const [showStats, setShowStats] = useState(true);

  // Computed statistics
  const stats = useMemo(() => {
    const clips = result.clips;
    const artists = new Set(clips.map(clip => clip.sourceArtist));
    const avgRelevance = clips.reduce((sum, clip) => sum + clip.relevanceScore, 0) / clips.length;
    const totalDuration = clips.length * result.config.clipDuration;
    
    return {
      totalClips: clips.length,
      uniqueArtists: artists.size,
      averageRelevance: avgRelevance,
      totalDuration,
      qualityScore: result.metadata.qualityScore,
      generationTime: result.metadata.generationTime,
    };
  }, [result]);

  // Artist distribution for diversity visualization
  const artistDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    result.clips.forEach(clip => {
      distribution[clip.sourceArtist] = (distribution[clip.sourceArtist] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Top 10 artists
  }, [result.clips]);

  const handleSavePlaylist = () => {
    if (playlistName.trim()) {
      onSave(playlistName.trim());
      setSaveDialogOpen(false);
    }
  };

  const handleRegenerateWithSameConfig = () => {
    onRegenerate(result.config);
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return theme.palette.success.main;
    if (score >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.1)} 100%)`,
          border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: currentTheme.primary, mb: 1 }}>
              🎉 Playlist Generated!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your Power Hour playlist is ready with {stats.totalClips} clips from {stats.uniqueArtists} artists
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleRegenerateWithSameConfig}
              startIcon={<RefreshIcon />}
            >
              Regenerate
            </Button>
            <Button
              variant="contained"
              onClick={() => setSaveDialogOpen(true)}
              startIcon={<SaveIcon />}
              sx={{
                background: `linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.secondary})`,
              }}
            >
              Save Playlist
            </Button>
          </Box>
        </Box>

        {/* Quality Score */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<StarIcon />}
            label={`Quality: ${getQualityLabel(stats.qualityScore)} (${Math.round(stats.qualityScore * 100)}%)`}
            sx={{
              backgroundColor: alpha(getQualityColor(stats.qualityScore), 0.1),
              color: getQualityColor(stats.qualityScore),
              fontWeight: 'bold',
            }}
          />
          <Chip
            icon={<TimerIcon />}
            label={`${Math.round(stats.generationTime / 1000)}s generation time`}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Statistics Cards */}
      {showStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: currentTheme.primary }}>
                  {stats.totalClips}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Clips
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: currentTheme.secondary }}>
                  {stats.uniqueArtists}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Artists
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                  {Math.round(stats.totalDuration / 60)}m
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                  {Math.round(stats.averageRelevance * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Relevance
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Artist Distribution */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ mr: 1 }} />
          Artist Distribution
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {artistDistribution.map(([artist, count]) => (
            <Chip
              key={artist}
              label={`${artist} (${count})`}
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      </Paper>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Generation Warnings:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Clips List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ mr: 1 }} />
          Generated Clips ({result.clips.length})
        </Typography>
        
        <List sx={{ maxHeight: 600, overflow: 'auto' }}>
          {result.clips.map((clip, index) => (
            <React.Fragment key={clip.id}>
              <ListItem
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  borderRadius: 2,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: alpha(currentTheme.primary, 0.05),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {/* Thumbnail */}
                  <CardMedia
                    component="img"
                    sx={{ width: 80, height: 60, borderRadius: 1, mr: 2 }}
                    image={clip.thumbnail}
                    alt={clip.title}
                  />
                  
                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                      {clip.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {clip.artist} • {formatTime(clip.startTime)} - {formatTime(clip.startTime + clip.duration)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={`#${clip.generationRank}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`${Math.round(clip.relevanceScore * 100)}% match`}
                        color={clip.relevanceScore > 0.7 ? 'success' : clip.relevanceScore > 0.5 ? 'warning' : 'default'}
                      />
                    </Box>
                  </Box>
                  
                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Preview Clip">
                      <IconButton size="small" onClick={() => setSelectedClip(clip)}>
                        <PlayIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Clip">
                      <IconButton size="small" onClick={() => onEditClip(index)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Replace Clip">
                      <IconButton size="small" onClick={() => onReplaceClip(index)}>
                        <SwapIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Clip">
                      <IconButton size="small" color="error" onClick={() => onRemoveClip(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </ListItem>
              {index < result.clips.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Power Hour Playlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Playlist Name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            sx={{ mt: 2 }}
            helperText={`${stats.totalClips} clips • ${stats.uniqueArtists} artists • ${Math.round(stats.totalDuration / 60)} minutes`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSavePlaylist}
            variant="contained"
            disabled={!playlistName.trim()}
            startIcon={<SaveIcon />}
          >
            Save Playlist
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeneratedPlaylistPreview;
