/**
 * Power Hour Generator Component
 * Main interface for generating YouTube-based Power Hour playlists
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  IconButton,
  Slider,
  Switch,
  FormGroup,
  Divider,
  Alert,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoAwesome as MagicIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  PowerHourGenerationConfig,
  PowerHourGenerationResult,
  DEFAULT_POWER_HOUR_CONFIG,
  PowerHourGeneratorProps,
} from '../types/powerHour';
import { powerHourGeneratorService } from '../services/powerHourGeneratorService';
import { musicSimilarityService } from '../services/musicSimilarityService';
import GenerationProgress from './GenerationProgress';
import GeneratedPlaylistPreview from './GeneratedPlaylistPreview';

const PowerHourGenerator: React.FC<PowerHourGeneratorProps> = ({
  onPlaylistGenerated,
  onCancel,
  initialConfig = {},
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // Service availability - check this first
  const similarityServiceAvailable = musicSimilarityService.isAvailable();

  // Configuration state - adjust defaults based on service availability
  const [config, setConfig] = useState<PowerHourGenerationConfig>(() => {
    const baseConfig = {
      ...DEFAULT_POWER_HOUR_CONFIG,
      ...initialConfig,
    };

    // If Last.fm is not available, default to single-artist mode
    if (!similarityServiceAvailable) {
      return {
        ...baseConfig,
        generationMode: 'single-artist' as const,
        includeRelatedArtists: false,
        maxClipsPerArtist: 60,
      };
    }

    return baseConfig;
  });

  // UI state
  const [keywords, setKeywords] = useState<string[]>(config.keywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<PowerHourGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle configuration changes
   */
  const updateConfig = useCallback((updates: Partial<PowerHourGenerationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Add a keyword to the list
   */
  const addKeyword = useCallback(() => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      updateConfig({ keywords: updatedKeywords });
      setNewKeyword('');
    }
  }, [newKeyword, keywords, updateConfig]);

  /**
   * Remove a keyword from the list
   */
  const removeKeyword = useCallback((index: number) => {
    const updatedKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(updatedKeywords);
    updateConfig({ keywords: updatedKeywords });
  }, [keywords, updateConfig]);

  /**
   * Handle keyword input key press
   */
  const handleKeywordKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  /**
   * Start playlist generation
   */
  const startGeneration = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await powerHourGeneratorService.generatePlaylist(
        config,
        (event) => {
          // Progress updates are handled by the GenerationProgress component
          console.log('Generation event:', event);
        }
      );

      setGenerationResult(result);
      
      if (result.success) {
        onPlaylistGenerated(result);
      } else {
        setError(result.errors.join(', ') || 'Generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [config, onPlaylistGenerated]);

  /**
   * Cancel generation
   */
  const cancelGeneration = useCallback(() => {
    powerHourGeneratorService.cancelGeneration();
    setIsGenerating(false);
    onCancel();
  }, [onCancel]);

  /**
   * Validate configuration
   */
  const isConfigValid = useCallback(() => {
    switch (config.searchType) {
      case 'artist':
        return !!config.primaryArtist?.trim();
      case 'keyword':
        return keywords.length > 0;
      case 'mixed':
        return !!config.mixedQuery?.trim();
      default:
        return false;
    }
  }, [config, keywords]);

  // Show generation progress if generating
  if (isGenerating) {
    return (
      <GenerationProgress
        progress={powerHourGeneratorService.getProgress()}
        onCancel={cancelGeneration}
        canCancel={true}
      />
    );
  }

  // Show result preview if generation completed
  if (generationResult) {
    return (
      <GeneratedPlaylistPreview
        result={generationResult}
        onSave={(playlistName) => {
          // Handle saving the playlist
          console.log('Saving playlist:', playlistName);
        }}
        onRegenerate={(newConfig) => {
          setConfig(newConfig);
          setGenerationResult(null);
        }}
        onEditClip={(clipIndex) => {
          console.log('Edit clip:', clipIndex);
        }}
        onRemoveClip={(clipIndex) => {
          console.log('Remove clip:', clipIndex);
        }}
        onReplaceClip={(clipIndex) => {
          console.log('Replace clip:', clipIndex);
        }}
      />
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.05)} 0%, ${alpha(currentTheme.secondary, 0.05)} 100%)`,
        border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
        borderRadius: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MagicIcon sx={{ mr: 2, fontSize: 32, color: currentTheme.primary }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: currentTheme.primary }}>
            Generate Power Hour Playlist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Automatically create a 60-song playlist with 1-minute clips
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Similarity Service Warning */}
      {!similarityServiceAvailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Last.fm API Not Configured
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Similar artist discovery is disabled. The generator will only use the specific artist you enter.
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              💡 To enable variety mode: Get a free API key at{' '}
              <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">
                last.fm/api/account/create
              </a>
              {' '}and add VITE_LASTFM_API_KEY to your .env file
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Search Type Selection */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>
          Generation Method
        </FormLabel>
        <RadioGroup
          value={config.searchType}
          onChange={(e) => updateConfig({ searchType: e.target.value as any })}
          row
        >
          <FormControlLabel
            value="artist"
            control={<Radio />}
            label="Artist-based"
          />
          <FormControlLabel
            value="keyword"
            control={<Radio />}
            label="Keyword/Genre"
          />
          <FormControlLabel
            value="mixed"
            control={<Radio />}
            label="Mixed Search"
          />
        </RadioGroup>
      </FormControl>

      {/* Artist Input */}
      {config.searchType === 'artist' && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Artist Name"
            value={config.primaryArtist || ''}
            onChange={(e) => updateConfig({ primaryArtist: e.target.value })}
            placeholder="Enter artist name (e.g., 'The Beatles', 'Taylor Swift')"
            sx={{ mb: 2 }}
            helperText={
              config.generationMode === 'single-artist'
                ? "Generate a power hour using only this artist's songs"
                : similarityServiceAvailable
                  ? "We'll find similar artists automatically for variety"
                  : "Only this artist will be used"
            }
          />

          {/* Generation Mode Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>
              Generation Mode
            </FormLabel>
            <RadioGroup
              value={config.generationMode}
              onChange={(e) => {
                const mode = e.target.value as 'variety' | 'single-artist';
                updateConfig({
                  generationMode: mode,
                  maxClipsPerArtist: mode === 'single-artist' ? 60 : 2,
                  includeRelatedArtists: mode === 'variety'
                });
              }}
              row
            >
              <FormControlLabel
                value="variety"
                control={<Radio />}
                label="Variety (Multiple Artists)"
              />
              <FormControlLabel
                value="single-artist"
                control={<Radio />}
                label="Single Artist Focus"
              />
            </RadioGroup>
          </FormControl>
        </Box>
      )}

      {/* Keywords Input */}
      {config.searchType === 'keyword' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Keywords & Genres
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Add keyword"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={handleKeywordKeyPress}
              placeholder="e.g., 'rock', 'party music', '2000s hits'"
            />
            <Button
              variant="contained"
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              <AddIcon />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {keywords.map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                onDelete={() => removeKeyword(index)}
                deleteIcon={<DeleteIcon />}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Mixed Query Input */}
      {config.searchType === 'mixed' && (
        <TextField
          fullWidth
          label="Search Query"
          value={config.mixedQuery || ''}
          onChange={(e) => updateConfig({ mixedQuery: e.target.value })}
          placeholder="e.g., 'Taylor Swift pop hits', 'rock party songs'"
          sx={{ mb: 3 }}
          helperText="Combine artist names with genres or descriptive terms"
        />
      )}

      {/* Basic Settings */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Playlist Settings
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="Number of Clips"
            type="number"
            value={config.targetClipCount}
            onChange={(e) => updateConfig({ targetClipCount: parseInt(e.target.value) || 60 })}
            inputProps={{ min: 10, max: 120 }}
          />
          <TextField
            label="Clip Duration (seconds)"
            type="number"
            value={config.clipDuration}
            onChange={(e) => updateConfig({ clipDuration: parseInt(e.target.value) || 60 })}
            inputProps={{ min: 30, max: 120 }}
          />
        </Box>
      </Box>

      {/* Advanced Settings Toggle */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          onClick={() => setShowAdvanced(!showAdvanced)}
          startIcon={<SettingsIcon />}
          endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ mb: 2 }}
        >
          Advanced Settings
        </Button>

        <Collapse in={showAdvanced}>
          <Box sx={{ pl: 2, borderLeft: `2px solid ${alpha(currentTheme.primary, 0.2)}` }}>
            {/* Related Artists Settings */}
            {config.searchType === 'artist' && similarityServiceAvailable && config.generationMode === 'variety' && (
              <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.includeRelatedArtists}
                      onChange={(e) => updateConfig({ includeRelatedArtists: e.target.checked })}
                    />
                  }
                  label="Include Similar Artists"
                />
                {config.includeRelatedArtists && (
                  <Box sx={{ mt: 1, ml: 4 }}>
                    <Typography variant="body2" gutterBottom>
                      Max Similar Artists: {config.maxRelatedArtists}
                    </Typography>
                    <Slider
                      value={config.maxRelatedArtists}
                      onChange={(_, value) => updateConfig({ maxRelatedArtists: value as number })}
                      min={5}
                      max={25}
                      marks
                      valueLabelDisplay="auto"
                      sx={{ width: 200, mb: 2 }}
                    />

                    <Typography variant="body2" gutterBottom>
                      Similarity Strength
                    </Typography>
                    <RadioGroup
                      value={config.similarityStrength}
                      onChange={(e) => updateConfig({ similarityStrength: e.target.value as any })}
                      row
                      sx={{ mb: 1 }}
                    >
                      <FormControlLabel value="loose" control={<Radio size="small" />} label="Loose" />
                      <FormControlLabel value="moderate" control={<Radio size="small" />} label="Moderate" />
                      <FormControlLabel value="strict" control={<Radio size="small" />} label="Strict" />
                    </RadioGroup>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.genreMatching}
                          onChange={(e) => updateConfig({ genreMatching: e.target.checked })}
                          size="small"
                        />
                      }
                      label="Enhanced Genre Matching"
                    />
                  </Box>
                )}
              </FormGroup>
            )}

            {/* Quality Filters */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Quality Filters
            </Typography>
            <FormGroup sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.preferOfficialVideos}
                    onChange={(e) => updateConfig({ preferOfficialVideos: e.target.checked })}
                  />
                }
                label="Prefer Official Videos"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.excludeRemixes}
                    onChange={(e) => updateConfig({ excludeRemixes: e.target.checked })}
                  />
                }
                label="Exclude Remixes & Covers"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ensureArtistDiversity}
                    onChange={(e) => updateConfig({ ensureArtistDiversity: e.target.checked })}
                  />
                }
                label="Ensure Artist Diversity"
              />
              {config.generationMode === 'variety' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preventConsecutiveSameArtist}
                      onChange={(e) => updateConfig({ preventConsecutiveSameArtist: e.target.checked })}
                    />
                  }
                  label="Prevent Consecutive Same Artist"
                />
              )}
            </FormGroup>

            {/* Artist Diversity Controls */}
            {config.generationMode === 'variety' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Artist Diversity
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Max Clips Per Artist: {config.maxClipsPerArtist}
                  </Typography>
                  <Slider
                    value={config.maxClipsPerArtist}
                    onChange={(_, value) => updateConfig({ maxClipsPerArtist: value as number })}
                    min={1}
                    max={5}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                      { value: 5, label: '5' }
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ width: 200 }}
                  />
                </Box>
              </>
            )}

            {/* Duration Filters */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Video Duration Range
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="Min Duration (seconds)"
                type="number"
                value={config.minVideoDuration}
                onChange={(e) => updateConfig({ minVideoDuration: parseInt(e.target.value) || 120 })}
                inputProps={{ min: 60, max: 600 }}
              />
              <TextField
                label="Max Duration (seconds)"
                type="number"
                value={config.maxVideoDuration}
                onChange={(e) => updateConfig({ maxVideoDuration: parseInt(e.target.value) || 600 })}
                inputProps={{ min: 120, max: 1200 }}
              />
            </Box>
          </Box>
        </Collapse>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Generate Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={startGeneration}
          disabled={!isConfigValid() || isGenerating}
          startIcon={<MagicIcon />}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.secondary})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${alpha(currentTheme.primary, 0.8)}, ${alpha(currentTheme.secondary, 0.8)})`,
            },
          }}
        >
          Generate Power Hour Playlist
        </Button>
      </Box>
    </Paper>
  );
};

export default PowerHourGenerator;
