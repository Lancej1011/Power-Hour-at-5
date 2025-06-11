/**
 * TypeScript interfaces and types for Power Hour Generation feature
 */

import { YouTubeVideo, YouTubeClip } from '../utils/youtubeUtils';

// Generation input configuration
export interface PowerHourGenerationConfig {
  // Search parameters
  searchType: 'artist' | 'keyword' | 'mixed';
  primaryArtist?: string;
  keywords?: string[];
  mixedQuery?: string;

  // Generation settings
  targetClipCount: number; // Default: 60
  clipDuration: number; // Default: 60 seconds
  includeRelatedArtists: boolean; // Default: true
  maxRelatedArtists: number; // Default: 10

  // Generation mode
  generationMode: 'variety' | 'single-artist'; // Default: 'variety'

  // Quality filters
  minVideoDuration: number; // Default: 120 seconds (2 minutes)
  maxVideoDuration: number; // Default: 600 seconds (10 minutes)
  preferOfficialVideos: boolean; // Default: true
  excludeRemixes: boolean; // Default: false

  // Diversity settings
  maxClipsPerArtist: number; // Default: 2 for variety, 60 for single-artist
  ensureArtistDiversity: boolean; // Default: true
  preventConsecutiveSameArtist: boolean; // Default: true

  // Enhanced similarity settings
  similarityStrength: 'loose' | 'moderate' | 'strict'; // Default: 'moderate'
  genreMatching: boolean; // Default: true
  tempoMatching: boolean; // Default: false
}

// Default configuration
export const DEFAULT_POWER_HOUR_CONFIG: PowerHourGenerationConfig = {
  searchType: 'artist',
  targetClipCount: 60,
  clipDuration: 60,
  includeRelatedArtists: true,
  maxRelatedArtists: 15,
  generationMode: 'variety',
  minVideoDuration: 60,  // More permissive - allow shorter videos
  maxVideoDuration: 1200, // More permissive - allow longer videos (20 minutes)
  preferOfficialVideos: true,
  excludeRemixes: false,
  maxClipsPerArtist: 2,
  ensureArtistDiversity: true,
  preventConsecutiveSameArtist: true,
  similarityStrength: 'moderate',
  genreMatching: true,
  tempoMatching: false,
};

// Generation progress tracking
export interface GenerationProgress {
  currentStep: GenerationStep;
  totalSteps: number;
  currentStepProgress: number; // 0-100
  overallProgress: number; // 0-100
  message: string;
  details?: string;
  estimatedTimeRemaining?: number; // seconds
}

export enum GenerationStep {
  INITIALIZING = 'initializing',
  SEARCHING_PRIMARY = 'searching_primary',
  FINDING_SIMILAR_ARTISTS = 'finding_similar_artists',
  SEARCHING_RELATED = 'searching_related',
  FILTERING_RESULTS = 'filtering_results',
  EXTRACTING_CLIPS = 'extracting_clips',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

// Artist similarity data
export interface SimilarArtist {
  name: string;
  similarity: number; // 0-1 scale
  mbid?: string; // MusicBrainz ID
  url?: string;
  image?: string;
  genres?: string[]; // Associated genres
  tags?: string[]; // Musical tags/characteristics
  playcount?: number; // Popularity metric
}

export interface ArtistSimilarityResponse {
  artist: string;
  similarArtists: SimilarArtist[];
  source: 'lastfm' | 'musicbrainz' | 'cache';
  timestamp: number;
}

// Video search result with metadata
export interface EnhancedYouTubeVideo extends YouTubeVideo {
  searchQuery: string;
  sourceArtist: string;
  relevanceScore: number; // 0-1 scale
  isOfficial: boolean;
  isRemix: boolean;
  estimatedMusicStart: number; // seconds
}

// Generated clip with additional metadata
export interface GeneratedClip extends YouTubeClip {
  sourceArtist: string;
  searchQuery: string;
  relevanceScore: number;
  generationRank: number; // Order in which it was selected
  alternativeStartTimes?: number[]; // Other good start times found
}

// Generation result
export interface PowerHourGenerationResult {
  success: boolean;
  config: PowerHourGenerationConfig;
  clips: GeneratedClip[];
  metadata: {
    totalVideosSearched: number;
    totalArtistsUsed: number;
    similarArtistsFound: SimilarArtist[];
    generationTime: number; // milliseconds
    qualityScore: number; // 0-1 scale
  };
  warnings: string[];
  errors: string[];
}

// Generation state for UI
export interface GenerationState {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  result: PowerHourGenerationResult | null;
  error: string | null;
  canCancel: boolean;
}

// Search strategy configuration
export interface SearchStrategy {
  primarySearches: SearchQuery[];
  relatedSearches: SearchQuery[];
  fallbackSearches: SearchQuery[];
}

export interface SearchQuery {
  query: string;
  artist: string;
  priority: number; // 1-10, higher = more important
  maxResults: number;
}

// Cache interfaces
export interface CachedSearchResult {
  query: string;
  results: YouTubeVideo[];
  timestamp: number;
  expiresAt: number;
}

export interface CachedSimilarityResult {
  artist: string;
  similarArtists: SimilarArtist[];
  timestamp: number;
  expiresAt: number;
}

// Event types for progress callbacks
export type GenerationEventType = 
  | 'progress'
  | 'step_complete'
  | 'video_found'
  | 'clip_generated'
  | 'error'
  | 'warning'
  | 'complete'
  | 'cancelled';

export interface GenerationEvent {
  type: GenerationEventType;
  data: any;
  timestamp: number;
}

// Callback function type
export type GenerationProgressCallback = (event: GenerationEvent) => void;

// Service interfaces
export interface MusicSimilarityService {
  getSimilarArtists(artist: string): Promise<SimilarArtist[]>;
  isAvailable(): boolean;
  getRateLimit(): { remaining: number; resetTime: number };
}

export interface PowerHourGeneratorService {
  generatePlaylist(
    config: PowerHourGenerationConfig,
    progressCallback?: GenerationProgressCallback
  ): Promise<PowerHourGenerationResult>;
  
  cancelGeneration(): void;
  isGenerating(): boolean;
  getProgress(): GenerationProgress | null;
}

// UI Component Props
export interface PowerHourGeneratorProps {
  onPlaylistGenerated: (result: PowerHourGenerationResult) => void;
  onCancel: () => void;
  initialConfig?: Partial<PowerHourGenerationConfig>;
}

export interface GenerationProgressProps {
  progress: GenerationProgress | null;
  onCancel: () => void;
  canCancel: boolean;
}

export interface GeneratedPlaylistPreviewProps {
  result: PowerHourGenerationResult;
  onSave: (playlistName: string) => void;
  onRegenerate: (config: PowerHourGenerationConfig) => void;
  onEditClip: (clipIndex: number) => void;
  onRemoveClip: (clipIndex: number) => void;
  onReplaceClip: (clipIndex: number) => void;
}

// Playlist Review Interface Types
export interface PlaylistReviewProps {
  generationResult: any; // Enhanced generation result
  targetTrackCount: number;
  onSavePlaylist: (playlist: any) => void;
  onContinueGeneration: () => void;
  onCancel: () => void;
  onRegenerateClip: (clipIndex: number, artist: string) => Promise<any>;
}

export interface ClipEditDialogProps {
  open: boolean;
  clip: any;
  clipIndex: number;
  onClose: () => void;
  onSave: (updatedClip: any) => void;
  onRegenerate: (artist: string) => Promise<any>;
}

export interface ClipQualityIndicator {
  type: 'excellent' | 'good' | 'warning' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PlaylistQualityAnalysis {
  overallScore: number;
  completionRate: number;
  artistDiversity: number;
  potentialIssues: ClipQualityIndicator[];
  recommendations: string[];
}

// Error types
export class PowerHourGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public step: GenerationStep,
    public details?: any
  ) {
    super(message);
    this.name = 'PowerHourGenerationError';
  }
}

// Utility types
export type PartialConfig = Partial<PowerHourGenerationConfig>;
export type GenerationCallback = (result: PowerHourGenerationResult) => void;
export type ErrorCallback = (error: PowerHourGenerationError) => void;
