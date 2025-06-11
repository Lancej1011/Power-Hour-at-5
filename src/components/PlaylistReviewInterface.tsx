/**
 * Playlist Review Interface Component
 * Comprehensive review and editing interface for generated power hour playlists
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Tooltip,
  CardMedia,
  Divider,
  Paper,
  Stack,
  Badge,
  Switch,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  PlaylistAdd as ContinueIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearSelectionIcon,
  DragIndicator as DragIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useThemeContext } from '../contexts/ThemeContext';
import { PlaylistReviewProps, ClipQualityIndicator, PlaylistQualityAnalysis } from '../types/powerHour';
import ClipEditDialog from './ClipEditDialog';

// Sortable Item Component for individual clips
interface SortableClipItemProps {
  track: any;
  index: number;
  isSelected: boolean;
  isRegenerating: boolean;
  onSelectClip: (index: number) => void;
  onEditClip: (clip: any, index: number) => void;
  onRegenerateClip: (index: number, artist: string) => Promise<void>;
  onRemoveClip: (index: number) => void;
  getSimilarityColor: (similarity: number) => string;
  theme: any;
  currentTheme: any;
  alpha: any;
}

const SortableClipItem: React.FC<SortableClipItemProps> = ({
  track,
  index,
  isSelected,
  isRegenerating,
  onSelectClip,
  onEditClip,
  onRegenerateClip,
  onRemoveClip,
  getSimilarityColor,
  theme,
  currentTheme,
  alpha,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `clip-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const similarityColor = getSimilarityColor(track.artistSimilarity);

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        borderRadius: 2,
        mb: 1,
        backgroundColor: isDragging
          ? alpha(currentTheme.primary, 0.2)
          : isSelected
            ? alpha(currentTheme.primary, 0.1)
            : 'transparent',
        '&:hover': {
          backgroundColor: isDragging
            ? alpha(currentTheme.primary, 0.2)
            : alpha(currentTheme.primary, 0.05),
        },
        cursor: isDragging ? 'grabbing' : 'default',
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* Drag Handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            mr: 1,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
            '&:active': { cursor: 'grabbing' }
          }}
        >
          <DragIcon />
        </Box>

        {/* Selection Checkbox */}
        <Checkbox
          checked={isSelected}
          onChange={() => onSelectClip(index)}
          sx={{ mr: 1 }}
        />

        {/* Thumbnail */}
        <CardMedia
          component="img"
          sx={{ width: 80, height: 60, borderRadius: 1, mr: 2 }}
          image={`https://img.youtube.com/vi/${track.song.url.includes('youtube.com') ?
            track.song.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || 'dQw4w9WgXcQ' :
            'dQw4w9WgXcQ'}/mqdefault.jpg`}
          alt={track.song.title}
        />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
            {track.song.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {track.artist} • {track.clipDuration}s clip
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              size="small"
              label={`#${index + 1}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${Math.round(track.artistSimilarity * 100)}% match`}
              color={similarityColor}
            />
            <Chip
              size="small"
              label={track.selectionMethod}
              variant="outlined"
              color={track.selectionMethod === 'cached' ? 'success' :
                     track.selectionMethod === 'fallback' ? 'warning' : 'default'}
            />
            {track.isSeedArtist && (
              <Chip
                size="small"
                label="Seed Artist"
                color="primary"
                sx={{ fontWeight: 'bold' }}
              />
            )}
            {(() => {
              const title = track.song?.title?.toLowerCase() || '';
              if (/\b(official\s+(video|audio|music\s+video)|music\s+video)\b/i.test(title)) {
                return (
                  <Chip
                    size="small"
                    label="Official"
                    color="success"
                    variant="outlined"
                  />
                );
              } else if (/\b(live|concert|performance|tour|festival)\b/i.test(title)) {
                return (
                  <Chip
                    size="small"
                    label="Live"
                    color="info"
                    variant="outlined"
                  />
                );
              } else if (/\b(cover|covers|acoustic\s+version|unplugged)\b/i.test(title)) {
                return (
                  <Chip
                    size="small"
                    label="Cover"
                    color="secondary"
                    variant="outlined"
                  />
                );
              } else if (/\b(remix|extended|radio\s+edit|album\s+version|instrumental)\b/i.test(title)) {
                return (
                  <Chip
                    size="small"
                    label="Remix"
                    color="warning"
                    variant="outlined"
                  />
                );
              }
              return null;
            })()}
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Preview Clip">
            <IconButton
              size="small"
              onClick={() => {
                console.log('Preview clip:', track);
              }}
            >
              <PlayIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit Clip">
            <IconButton
              size="small"
              onClick={() => onEditClip(track, index)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Regenerate Clip">
            <IconButton
              size="small"
              onClick={async () => {
                try {
                  await onRegenerateClip(index, track.artist);
                } catch (error) {
                  console.error('Error regenerating clip:', error);
                }
              }}
              disabled={isRegenerating}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Remove Clip">
            <IconButton
              size="small"
              color="error"
              onClick={() => onRemoveClip(index)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading overlay for regenerating clips */}
      {isRegenerating && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">Regenerating...</Typography>
        </Box>
      )}
    </ListItem>
  );
};

const PlaylistReviewInterface: React.FC<PlaylistReviewProps> = ({
  generationResult,
  targetTrackCount,
  onSavePlaylist,
  onContinueGeneration,
  onCancel,
  onRegenerateClip,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State
  const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set());
  const [editingClip, setEditingClip] = useState<{ clip: any; index: number } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState(() => {
    const firstArtist = generationResult?.tracks?.[0]?.artist || 'Generated';
    return `Enhanced Power Hour - ${firstArtist} - ${new Date().toLocaleDateString()}`;
  });
  const [isRegenerating, setIsRegenerating] = useState<Set<number>>(new Set());
  const [shuffleOnSave, setShuffleOnSave] = useState(false);
  const [reorderedTracks, setReorderedTracks] = useState<any[]>(() => generationResult?.tracks || []);

  // Computed values
  const tracks = reorderedTracks;
  const currentCount = tracks.length;
  const completionRate = targetTrackCount > 0 ? (currentCount / targetTrackCount) * 100 : 0;

  // Quality analysis
  const qualityAnalysis = useMemo((): PlaylistQualityAnalysis => {
    const issues: ClipQualityIndicator[] = [];
    const recommendations: string[] = [];

    // Check for incomplete generation
    if (currentCount < targetTrackCount) {
      issues.push({
        type: 'warning',
        message: `Only ${currentCount}/${targetTrackCount} tracks generated`,
        severity: 'high'
      });
      recommendations.push(`Continue generation to reach ${targetTrackCount} tracks`);
    }

    // Check seed artist vs similar artist distribution
    const seedArtistTracks = tracks.filter((track: any) => track.isSeedArtist);
    const similarArtistTracks = tracks.filter((track: any) => !track.isSeedArtist);

    if (seedArtistTracks.length > 0) {
      issues.push({
        type: 'info',
        message: `${seedArtistTracks.length} clips from seed artist, ${similarArtistTracks.length} from similar artists`,
        severity: 'low'
      });
    }

    // Check for artist diversity
    const artistCounts = tracks.reduce((acc: Record<string, number>, track: any) => {
      acc[track.artist] = (acc[track.artist] || 0) + 1;
      return acc;
    }, {});

    const maxArtistCount = Math.max(...Object.values(artistCounts));
    const uniqueArtists = Object.keys(artistCounts).length;
    const diversityScore = uniqueArtists / currentCount;

    if (maxArtistCount > 3) {
      issues.push({
        type: 'warning',
        message: `Artist "${Object.keys(artistCounts).find(a => artistCounts[a] === maxArtistCount)}" appears ${maxArtistCount} times`,
        severity: 'medium'
      });
    }

    // Check for low similarity scores
    const lowSimilarityTracks = tracks.filter((track: any) => track.artistSimilarity < 0.3);
    if (lowSimilarityTracks.length > 0) {
      issues.push({
        type: 'warning',
        message: `${lowSimilarityTracks.length} tracks have low similarity scores`,
        severity: 'medium'
      });
      recommendations.push('Consider regenerating tracks with low similarity scores');
    }

    // Check for fallback tracks
    const fallbackTracks = tracks.filter((track: any) => track.selectionMethod === 'fallback');
    if (fallbackTracks.length > 0) {
      issues.push({
        type: 'info',
        message: `${fallbackTracks.length} tracks used fallback selection (limited options after filtering)`,
        severity: 'low'
      });
    }

    // Check for content filtering effectiveness
    const totalContentFiltered = tracks.reduce((sum: number, track: any) =>
      sum + (track.searchStats?.contentFiltered || 0), 0);
    const totalDuplicatesFiltered = tracks.reduce((sum: number, track: any) =>
      sum + (track.searchStats?.duplicatesFiltered || 0), 0);

    if (totalContentFiltered > 0 || totalDuplicatesFiltered > 0) {
      issues.push({
        type: 'info',
        message: `Enhanced filtering: ${totalContentFiltered} non-music content, ${totalDuplicatesFiltered} duplicates removed`,
        severity: 'low'
      });
    }

    const overallScore = Math.max(0, 1 - (issues.length * 0.1));

    return {
      overallScore,
      completionRate,
      artistDiversity: diversityScore,
      potentialIssues: issues,
      recommendations
    };
  }, [tracks, currentCount, targetTrackCount]);

  // Handlers
  const handleSelectClip = (index: number) => {
    const newSelected = new Set(selectedClips);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedClips(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedClips.size === tracks.length) {
      setSelectedClips(new Set());
    } else {
      setSelectedClips(new Set(tracks.map((_, index) => index)));
    }
  };

  const handleRegenerateSelected = async () => {
    const indicesToRegenerate = Array.from(selectedClips);
    setIsRegenerating(new Set(indicesToRegenerate));

    try {
      for (const index of indicesToRegenerate) {
        const track = tracks[index];
        await onRegenerateClip(index, track.artist);
      }
    } catch (error) {
      console.error('Error regenerating clips:', error);
    } finally {
      setIsRegenerating(new Set());
      setSelectedClips(new Set());
    }
  };

  const handleRemoveSelected = () => {
    // TODO: Implement clip removal functionality
    const indicesToRemove = Array.from(selectedClips);
    console.log('Remove clips at indices:', indicesToRemove);

    // For now, just clear selection
    setSelectedClips(new Set());

    // In a full implementation, this would:
    // 1. Remove clips from the tracks array
    // 2. Update the generation result
    // 3. Recalculate quality metrics
  };

  const handleRemoveClip = (index: number) => {
    // TODO: Implement single clip removal
    console.log('Remove clip at index:', index);

    // In a full implementation, this would:
    // 1. Remove the clip from tracks array
    // 2. Update the generation result
    // 3. Recalculate quality metrics
  };

  const handleSavePlaylist = () => {
    if (playlistName.trim()) {
      // Apply shuffle if requested
      let finalTracks = [...tracks];
      if (shuffleOnSave) {
        // Fisher-Yates shuffle algorithm
        for (let i = finalTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
        }
        console.log('🔀 Playlist shuffled before saving');
      }

      // Convert tracks to YouTube playlist format
      const youtubeClips = finalTracks.map((track: any, index: number) => ({
        id: `enhanced_${Date.now()}_${index}`,
        videoId: track.song.url.includes('youtube.com') ? 
          track.song.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || 'dQw4w9WgXcQ' : 
          'dQw4w9WgXcQ',
        title: track.song.title,
        artist: track.artist,
        startTime: Math.floor(Math.random() * 30),
        duration: track.clipDuration,
        thumbnail: `https://img.youtube.com/vi/${track.song.url.includes('youtube.com') ? 
          track.song.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || 'dQw4w9WgXcQ' : 
          'dQw4w9WgXcQ'}/mqdefault.jpg`,
        url: track.song.url,
        sourceArtist: track.artist,
        searchQuery: `${track.artist} ${track.song.title}`,
        relevanceScore: track.artistSimilarity,
        generationRank: index + 1,
        selectionMethod: track.selectionMethod
      }));

      const playlist = {
        id: `enhanced_${Date.now()}`,
        name: playlistName.trim(),
        clips: youtubeClips,
        date: new Date().toISOString(),
        drinkingSoundPath: undefined,
        imagePath: undefined,
        metadata: {
          generationType: 'enhanced',
          generationStats: generationResult.generationStats,
          qualityMetrics: generationResult.qualityMetrics,
          qualityAnalysis
        }
      };

      onSavePlaylist(playlist);
      setSaveDialogOpen(false);
    }
  };

  const getQualityIcon = (indicator: ClipQualityIndicator) => {
    switch (indicator.type) {
      case 'excellent': return <CheckIcon color="success" />;
      case 'good': return <CheckIcon color="primary" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.7) return 'success';
    if (similarity >= 0.4) return 'warning';
    return 'error';
  };

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = reorderedTracks.findIndex((track, index) => `clip-${index}` === active.id);
    const newIndex = reorderedTracks.findIndex((track, index) => `clip-${index}` === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newTracks = arrayMove(reorderedTracks, oldIndex, newIndex);

    // Update start times to reflect new order
    const updatedTracks = newTracks.map((track, index) => ({
      ...track,
      startTime: index * track.clipDuration
    }));

    setReorderedTracks(updatedTracks);

    // Clear selection when reordering
    setSelectedClips(new Set());

    console.log(`🔄 Moved clip from position ${oldIndex + 1} to ${newIndex + 1}`);
  };

  // Shuffle tracks
  const handleShuffleTracks = () => {
    const shuffled = [...reorderedTracks];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update start times to reflect new order
    const updatedTracks = shuffled.map((track, index) => ({
      ...track,
      startTime: index * track.clipDuration
    }));

    setReorderedTracks(updatedTracks);
    setSelectedClips(new Set());

    console.log('🔀 Tracks shuffled');
  };

  // Reset to original order
  const handleResetOrder = () => {
    const originalTracks = generationResult?.tracks || [];
    setReorderedTracks([...originalTracks]);
    setSelectedClips(new Set());

    console.log('🔄 Reset to original order');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🎵 Playlist Review & Editor
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review and edit your generated power hour playlist before saving. Make adjustments to ensure the best quality.
      </Typography>

      {/* Progress and Quality Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={completionRate} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
                color={completionRate >= 100 ? 'success' : 'primary'}
              />
              <Typography variant="body2">
                {currentCount} / {targetTrackCount} tracks ({completionRate.toFixed(1)}%)
              </Typography>
              {currentCount < targetTrackCount && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContinueIcon />}
                  onClick={onContinueGeneration}
                  sx={{ mt: 1 }}
                >
                  Continue Generation
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={qualityAnalysis.overallScore * 100} 
                  sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  color={qualityAnalysis.overallScore >= 0.8 ? 'success' : qualityAnalysis.overallScore >= 0.6 ? 'warning' : 'error'}
                />
                <Typography variant="body2" sx={{ minWidth: 40 }}>
                  {(qualityAnalysis.overallScore * 100).toFixed(0)}%
                </Typography>
              </Box>
              <Typography variant="body2">
                Artist Diversity: {(qualityAnalysis.artistDiversity * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Artist Distribution
              </Typography>
              {(() => {
                const seedArtistTracks = tracks.filter((track: any) => track.isSeedArtist);
                const similarArtistTracks = tracks.filter((track: any) => !track.isSeedArtist);
                const seedArtist = generationResult?.tracks?.[0]?.artist || 'Seed Artist';

                return (
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label="Seed Artist" color="primary" />
                      <Typography variant="body2">
                        {seedArtist}: {seedArtistTracks.length} clips
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label="Similar Artists" variant="outlined" />
                      <Typography variant="body2">
                        {similarArtistTracks.length} clips from {new Set(similarArtistTracks.map((t: any) => t.artist)).size} artists
                      </Typography>
                    </Box>
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Issues & Recommendations
              </Typography>
              {qualityAnalysis.potentialIssues.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">No issues detected</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {qualityAnalysis.potentialIssues.slice(0, 2).map((issue, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getQualityIcon(issue)}
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {issue.message}
                      </Typography>
                    </Box>
                  ))}
                  {qualityAnalysis.potentialIssues.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{qualityAnalysis.potentialIssues.length - 2} more issues
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedClips.size === tracks.length && tracks.length > 0}
                indeterminate={selectedClips.size > 0 && selectedClips.size < tracks.length}
                onChange={handleSelectAll}
              />
            }
            label={`Select All (${selectedClips.size} selected)`}
          />

          {/* Ordering Controls */}
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<ShuffleIcon />}
            onClick={handleShuffleTracks}
            disabled={tracks.length < 2}
          >
            Shuffle Order
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleResetOrder}
            disabled={tracks.length === 0}
          >
            Reset Order
          </Button>
          
          {selectedClips.size > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRegenerateSelected}
                disabled={isRegenerating.size > 0}
              >
                Regenerate Selected ({selectedClips.size})
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveSelected}
              >
                Remove Selected
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearSelectionIcon />}
                onClick={() => setSelectedClips(new Set())}
              >
                Clear Selection
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
          disabled={tracks.length === 0}
        >
          Save Playlist ({tracks.length} tracks)
        </Button>

        {currentCount < targetTrackCount && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<ContinueIcon />}
            onClick={onContinueGeneration}
            color="primary"
          >
            Continue to {targetTrackCount} tracks
          </Button>
        )}

        <Button
          variant="outlined"
          onClick={onCancel}
        >
          Back to Settings
        </Button>
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Playlist</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Playlist Name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            sx={{ mt: 1 }}
          />

          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={shuffleOnSave}
                  onChange={(e) => setShuffleOnSave(e.target.checked)}
                  color="primary"
                />
              }
              label="Shuffle clips when saving"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Randomize the order of clips in the final saved playlist
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This playlist will be saved with {tracks.length} tracks{shuffleOnSave ? ' in shuffled order' : ''}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePlaylist} variant="contained" disabled={!playlistName.trim()}>
            Save{shuffleOnSave ? ' & Shuffle' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clips List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🎵 Generated Clips ({tracks.length})
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Drag clips to reorder • Click and hold the drag handle
          </Typography>
        </Typography>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tracks.map((_, index) => `clip-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <List sx={{ maxHeight: 600, overflow: 'auto' }}>
              {tracks.map((track: any, index: number) => {
                const isSelected = selectedClips.has(index);
                const isRegeneratingThis = isRegenerating.has(index);

                return (
                  <SortableClipItem
                    key={`clip-${index}`}
                    track={track}
                    index={index}
                    isSelected={isSelected}
                    isRegenerating={isRegeneratingThis}
                    onSelectClip={handleSelectClip}
                    onEditClip={(clip, idx) => setEditingClip({ clip, index: idx })}
                    onRegenerateClip={async (idx, artist) => {
                      setIsRegenerating(new Set([idx]));
                      try {
                        await onRegenerateClip(idx, artist);
                      } finally {
                        setIsRegenerating(new Set());
                      }
                    }}
                    onRemoveClip={handleRemoveClip}
                    getSimilarityColor={getSimilarityColor}
                    theme={theme}
                    currentTheme={currentTheme}
                    alpha={alpha}
                  />
                );
              })}
            </List>
          </SortableContext>
        </DndContext>

        {tracks.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No tracks generated yet.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Clip Edit Dialog */}
      {editingClip && (
        <ClipEditDialog
          open={true}
          clip={editingClip.clip}
          clipIndex={editingClip.index}
          onClose={() => setEditingClip(null)}
          onSave={(updatedClip) => {
            // TODO: Update clip in the tracks array
            console.log('Save updated clip:', updatedClip);
            setEditingClip(null);
          }}
          onRegenerate={onRegenerateClip}
        />
      )}
    </Box>
  );
};

export default PlaylistReviewInterface;
