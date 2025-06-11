/**
 * Enhanced Power Hour Generator for YouTube Page
 * Integrates smart caching, artist disambiguation, and intelligent selection
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Slider,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as MagicIcon,
  Speed as SpeedIcon,
  Cached as CacheIcon,
  TrendingUp as TrendingIcon,
  MusicNote as MusicIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { enhancedPowerHourGenerator, PowerHourGenerationConfig, GenerationProgress } from '../services/enhancedPowerHourGenerator';
import { artistDisambiguationService, ArtistDisambiguationInfo } from '../services/artistDisambiguationService';
import { persistentCacheService } from '../services/persistentCacheService';
import ArtistDisambiguationDialog from './ArtistDisambiguationDialog';
import PlaylistReviewInterface from './PlaylistReviewInterface';
import { PowerHourGenerationResult } from '../types/powerHour';
import { saveYouTubePlaylist, generatePlaylistId, createClipFromVideo } from '../utils/youtubeUtils';
import { playlistReviewService } from '../services/playlistReviewService';

interface EnhancedPowerHourGeneratorProps {
  onPlaylistGenerated: (result: any) => void;
  onCancel?: () => void;
}

enum GeneratorView {
  CONFIGURATION = 'configuration',
  GENERATING = 'generating',
  REVIEW = 'review',
  RESULTS = 'results'
}

const EnhancedPowerHourGenerator: React.FC<EnhancedPowerHourGeneratorProps> = ({
  onPlaylistGenerated,
  onCancel
}) => {
  // Generation state
  const [currentView, setCurrentView] = useState<GeneratorView>(GeneratorView.CONFIGURATION);
  const [seedArtist, setSeedArtist] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Configuration state
  const [totalTracks, setTotalTracks] = useState(60);
  const [clipDuration, setClipDuration] = useState(60);
  const [seedArtistClipCount, setSeedArtistClipCount] = useState(6);
  const [prioritizeCached, setPrioritizeCached] = useState(false); // Force fresh discovery by default
  const [maxApiCalls, setMaxApiCalls] = useState(10);
  const [diversityWeight, setDiversityWeight] = useState(0.4);
  const [similarityWeight, setSimilarityWeight] = useState(0.6);
  const [debugMode, setDebugMode] = useState(false);

  // Disambiguation state
  const [disambiguationOpen, setDisambiguationOpen] = useState(false);
  const [disambiguationSuggestions, setDisambiguationSuggestions] = useState<ArtistDisambiguationInfo[]>([]);
  const [pendingGeneration, setPendingGeneration] = useState(false);

  // Cache statistics
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    // Load cache statistics
    const stats = persistentCacheService.getStatistics();
    setCacheStats(stats);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!seedArtist.trim()) {
      setError('Please enter an artist name');
      return;
    }

    // Check for disambiguation first
    const suggestions = artistDisambiguationService.getDisambiguationSuggestions(seedArtist);
    if (suggestions.length > 1) {
      setDisambiguationSuggestions(suggestions);
      setDisambiguationOpen(true);
      setPendingGeneration(true);
      return;
    }

    await startGeneration();
  }, [seedArtist]);

  const startGeneration = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setProgress(null);
    setResult(null);

    const config: Partial<PowerHourGenerationConfig> = {
      seedArtist,
      totalTracks,
      clipDuration,
      seedArtistClipCount,
      prioritizeCachedResults: prioritizeCached,
      maxApiCalls,
      artistSelection: {
        diversityWeight,
        similarityWeight,
        maxArtists: totalTracks - seedArtistClipCount, // Adjust for seed artist clips
        genreDiversityEnabled: true,
        eraDiversityEnabled: true
      },
      songSelection: {
        preferredDuration: clipDuration,
        durationTolerance: 30,
        albumDiversityEnabled: true,
        yearDiversityEnabled: true
      }
    };

    try {
      console.log('🚀 Starting enhanced YouTube power hour generation...');
      
      const generationResult = await enhancedPowerHourGenerator.generatePowerHour(
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      console.log('✅ Generation complete:', generationResult);

      // Store the result and show review interface
      setResult(generationResult);
      setCurrentView(GeneratorView.REVIEW);

    } catch (err) {
      console.error('❌ Enhanced generation failed:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [seedArtist, totalTracks, clipDuration, prioritizeCached, maxApiCalls, diversityWeight, similarityWeight, onPlaylistGenerated]);

  const handleStop = () => {
    enhancedPowerHourGenerator.abort();
    setIsGenerating(false);
    setProgress(null);
  };

  const handleDisambiguationSelect = (selectedArtist: ArtistDisambiguationInfo) => {
    console.log('✅ Selected artist:', selectedArtist);
    setSeedArtist(selectedArtist.name);
    setDisambiguationOpen(false);
    setPendingGeneration(false);
    
    // Start generation with the selected artist
    setTimeout(() => startGeneration(), 100);
  };

  const handleCustomSearch = (customQuery: string) => {
    setSeedArtist(customQuery);
    setDisambiguationOpen(false);
    setPendingGeneration(false);
    
    // Start generation with custom query
    setTimeout(() => startGeneration(), 100);
  };

  const extractVideoIdFromUrl = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Review interface handlers
  const handleSavePlaylist = (playlist: any) => {
    const saved = saveYouTubePlaylist(playlist);
    if (saved) {
      console.log('✅ Enhanced Power Hour playlist saved successfully');
      onPlaylistGenerated({ clips: playlist.clips, success: true });
      setCurrentView(GeneratorView.RESULTS);
    } else {
      setError('Failed to save generated playlist');
    }
  };

  const handleContinueGeneration = async () => {
    if (!result) return;

    const remainingTracks = totalTracks - result.tracks.length;
    if (remainingTracks <= 0) return;

    console.log(`🔄 Continuing generation for ${remainingTracks} more tracks...`);
    setCurrentView(GeneratorView.GENERATING);
    setIsGenerating(true);

    // Continue with the same configuration but adjust target
    // For continue generation, we only generate similar artist tracks since seed artist tracks are already done
    const config: Partial<PowerHourGenerationConfig> = {
      seedArtist,
      totalTracks: remainingTracks,
      clipDuration,
      seedArtistClipCount: 0, // No more seed artist clips needed
      prioritizeCachedResults: prioritizeCached,
      maxApiCalls,
      artistSelection: {
        diversityWeight,
        similarityWeight,
        maxArtists: remainingTracks,
        genreDiversityEnabled: true,
        eraDiversityEnabled: true
      },
      songSelection: {
        preferredDuration: clipDuration,
        durationTolerance: 30,
        albumDiversityEnabled: true,
        yearDiversityEnabled: true
      }
    };

    try {
      const additionalResult = await enhancedPowerHourGenerator.generatePowerHour(
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      // Merge the results
      const mergedResult = {
        ...result,
        tracks: [...result.tracks, ...additionalResult.tracks],
        generationStats: {
          ...result.generationStats,
          totalArtistsConsidered: result.generationStats.totalArtistsConsidered + additionalResult.generationStats.totalArtistsConsidered,
          apiCallsMade: result.generationStats.apiCallsMade + additionalResult.generationStats.apiCallsMade,
          generationTimeMs: result.generationStats.generationTimeMs + additionalResult.generationStats.generationTimeMs,
        },
        qualityMetrics: {
          ...additionalResult.qualityMetrics,
          completionRate: (result.tracks.length + additionalResult.tracks.length) / totalTracks
        }
      };

      setResult(mergedResult);
      setCurrentView(GeneratorView.REVIEW);

    } catch (err) {
      console.error('❌ Continue generation failed:', err);
      setError(err instanceof Error ? err.message : 'Continue generation failed');
      setCurrentView(GeneratorView.REVIEW);
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const handleRegenerateClip = async (clipIndex: number, artist: string) => {
    if (!result) return null;

    try {
      const regenerated = await playlistReviewService.regenerateClip(
        result.tracks[clipIndex],
        { artist, preferredDuration: clipDuration }
      );

      // Update the result with the regenerated clip
      const updatedTracks = [...result.tracks];
      updatedTracks[clipIndex] = {
        artist: regenerated.artist,
        song: regenerated.song,
        startTime: clipIndex * clipDuration,
        clipDuration: regenerated.clipDuration,
        selectionMethod: regenerated.selectionMethod,
        artistSimilarity: regenerated.artistSimilarity
      };

      setResult({
        ...result,
        tracks: updatedTracks
      });

      return regenerated;
    } catch (error) {
      console.error('Error regenerating clip:', error);
      throw error;
    }
  };

  const handleCancelReview = () => {
    setCurrentView(GeneratorView.CONFIGURATION);
    setResult(null);
    setError(null);
  };

  // Show review interface if generation is complete
  if (currentView === GeneratorView.REVIEW && result) {
    return (
      <PlaylistReviewInterface
        generationResult={result}
        targetTrackCount={totalTracks}
        onSavePlaylist={handleSavePlaylist}
        onContinueGeneration={handleContinueGeneration}
        onCancel={handleCancelReview}
        onRegenerateClip={handleRegenerateClip}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MagicIcon color="primary" />
        Enhanced Random Playlist Generator
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate intelligent power hour playlists using advanced caching, smart artist selection, and disambiguation.
      </Typography>

      {/* Cache Statistics */}
      {cacheStats && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              <strong>Cache Status:</strong> {cacheStats.totalEntries} artists cached, {cacheStats.hitRate.toFixed(1)}% hit rate
              {cacheStats.totalEntries > 0 && ` • Recent: ${cacheStats.recentlyAccessed.slice(0, 3).join(', ')}`}
            </Typography>
            {cacheStats.totalEntries > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => {
                  enhancedPowerHourGenerator.clearCache();
                  setCacheStats(persistentCacheService.getStatistics());
                  console.log('🗑️ Cache cleared for fresh discovery testing');
                }}
                disabled={isGenerating}
              >
                Clear Cache
              </Button>
            )}
          </Box>
        </Alert>
      )}

      {/* Configuration */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">⚙️ Generation Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Seed Artist"
                value={seedArtist}
                onChange={(e) => setSeedArtist(e.target.value)}
                placeholder="e.g., Taylor Swift, Led Zeppelin, Drake"
                disabled={isGenerating}
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              />

              {/* Quick Preset Artists */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ width: '100%', mb: 1 }}>
                  Quick presets:
                </Typography>
                {[
                  'Taylor Swift', 'Drake', 'The Beatles', 'Led Zeppelin', 'Queen',
                  'Genesis', 'Bush', 'Kansas' // Include some ambiguous ones
                ].map((artist) => (
                  <Chip
                    key={artist}
                    label={artist}
                    size="small"
                    variant="outlined"
                    clickable
                    disabled={isGenerating}
                    onClick={() => setSeedArtist(artist)}
                    color={['Genesis', 'Bush', 'Kansas'].includes(artist) ? 'warning' : 'default'}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Total Tracks"
                value={totalTracks}
                onChange={(e) => setTotalTracks(Math.max(1, parseInt(e.target.value) || 60))}
                disabled={isGenerating}
                inputProps={{ min: 1, max: 120 }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Clip Duration (seconds)"
                value={clipDuration}
                onChange={(e) => setClipDuration(Math.max(15, parseInt(e.target.value) || 60))}
                disabled={isGenerating}
                inputProps={{ min: 15, max: 300 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Seed Artist Clips"
                value={seedArtistClipCount}
                onChange={(e) => setSeedArtistClipCount(Math.max(0, Math.min(totalTracks, parseInt(e.target.value) || 6)))}
                disabled={isGenerating}
                inputProps={{ min: 0, max: totalTracks }}
                helperText={`Guaranteed clips from ${seedArtist || 'seed artist'}`}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Advanced Settings</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prioritizeCached}
                    onChange={(e) => setPrioritizeCached(e.target.checked)}
                    disabled={isGenerating}
                  />
                }
                label="Prioritize Cached Results"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Use cached data when available for faster generation
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    disabled={isGenerating}
                  />
                }
                label="Debug Mode"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Show detailed discovery logs in browser console
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Max API Calls: {maxApiCalls}
              </Typography>
              <Slider
                value={maxApiCalls}
                onChange={(e, value) => setMaxApiCalls(value as number)}
                min={1}
                max={20}
                step={1}
                disabled={isGenerating}
                marks={[
                  { value: 1, label: '1' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Diversity Weight: {(diversityWeight * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={diversityWeight}
                onChange={(e, value) => setDiversityWeight(value as number)}
                min={0}
                max={1}
                step={0.1}
                disabled={isGenerating}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Similarity Weight: {(similarityWeight * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={similarityWeight}
                onChange={(e, value) => setSimilarityWeight(value as number)}
                min={0}
                max={1}
                step={0.1}
                disabled={isGenerating}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Generation Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGenerate}
          disabled={isGenerating || !seedArtist.trim()}
          startIcon={isGenerating ? <SpeedIcon /> : <MagicIcon />}
          sx={{ minWidth: 200 }}
        >
          {isGenerating ? 'Generating...' : 'Generate Playlist'}
        </Button>

        {isGenerating && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleStop}
            startIcon={<StopIcon />}
          >
            Stop
          </Button>
        )}

        {onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {debugMode && seedArtist.trim() && (
          <Button
            variant="outlined"
            color="info"
            onClick={() => {
              console.log(`🔬 Running discovery comparison for: ${seedArtist}`);
              // Access the debug function from the global window object
              if ((window as any).musicDebug?.compareDiscoveryMethods) {
                (window as any).musicDebug.compareDiscoveryMethods(seedArtist);
              } else {
                console.log('🔍 Debug tools not available. Open Debug page first.');
              }
            }}
            disabled={isGenerating}
          >
            Test Discovery
          </Button>
        )}
      </Box>

      {/* Progress Display */}
      {progress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generation Progress
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(progress.currentTrack / progress.totalTracks) * 100} 
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {progress.currentStep}
            </Typography>
            <Typography variant="body2">
              Track {progress.currentTrack} of {progress.totalTracks} • 
              Cache Hits: {progress.cacheHits} • 
              API Calls: {progress.apiCalls}
            </Typography>
            {progress.estimatedTimeRemaining > 0 && (
              <Typography variant="caption" color="text.secondary">
                Estimated time remaining: {Math.round(progress.estimatedTimeRemaining / 1000)}s
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Mode Alert */}
      {debugMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Debug Mode Active:</strong> Detailed discovery logs will appear in the browser console.
            Use the "Test Discovery" button to compare Discovery Tester vs Enhanced Generator results.
            Open the Debug page first to access all debug tools.
          </Typography>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              🎵 Generation Results
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <TrendingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Generation Stats
                    </Typography>
                    <Typography variant="body2">Total Tracks: {result.tracks.length}</Typography>
                    <Typography variant="body2">Seed Artist: {result.generationStats.seedArtistClipsGenerated}/{result.generationStats.seedArtistClipsRequested}</Typography>
                    <Typography variant="body2">Similar Artists: {result.generationStats.similarArtistClips}</Typography>
                    <Typography variant="body2">Cache Hit Rate: {result.generationStats.cacheHitRate.toFixed(1)}%</Typography>
                    <Typography variant="body2">Time: {(result.generationStats.generationTimeMs / 1000).toFixed(1)}s</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <MusicIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Quality Metrics
                    </Typography>
                    <Typography variant="body2">Diversity: {result.qualityMetrics.diversityScore.toFixed(2)}</Typography>
                    <Typography variant="body2">Similarity: {result.qualityMetrics.similarityScore.toFixed(2)}</Typography>
                    <Typography variant="body2">Completion: {result.qualityMetrics.completionRate.toFixed(1)}%</Typography>
                    <Typography variant="body2">Seed Fulfillment: {result.qualityMetrics.seedArtistFulfillmentRate.toFixed(1)}%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Genre Distribution
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(result.generationStats.genreDistribution).map(([genre, count]) => (
                        <Chip
                          key={genre}
                          label={`${genre}: ${count}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Artist Disambiguation Dialog */}
      <ArtistDisambiguationDialog
        open={disambiguationOpen}
        onClose={() => {
          setDisambiguationOpen(false);
          setPendingGeneration(false);
        }}
        artistName={seedArtist}
        suggestions={disambiguationSuggestions}
        onSelect={handleDisambiguationSelect}
        onCustomSearch={handleCustomSearch}
      />
    </Box>
  );
};

export default EnhancedPowerHourGenerator;
