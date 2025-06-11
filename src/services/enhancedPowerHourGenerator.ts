/**
 * Enhanced Power Hour Generator
 * Comprehensive system with caching, smart selection, and randomization
 */

import { SimilarArtist } from '../types/powerHour';
import { multiTierMusicDiscovery } from './multiTierMusicDiscovery';
import { smartArtistSelector, SelectionConfig } from './smartArtistSelector';
import { smartSongSelector, SongSelectionConfig, SongCandidate } from './smartSongSelector';
import { persistentCacheService } from './persistentCacheService';
import { artistDisambiguationService } from './artistDisambiguationService';

export interface PowerHourTrack {
  artist: string;
  song: SongCandidate;
  startTime: number; // When to start in the power hour (0-3600 seconds)
  clipDuration: number; // Usually 60 seconds
  selectionMethod: 'cached' | 'api' | 'fallback';
  artistSimilarity: number;
  isSeedArtist: boolean; // Whether this track is from the original seed artist
}

export interface PowerHourGenerationConfig {
  seedArtist: string;
  totalTracks: number; // Usually 60 for a full power hour
  clipDuration: number; // Usually 60 seconds

  // Seed artist guarantee settings
  seedArtistClipCount: number; // Number of clips guaranteed from seed artist (default: 6)

  // Artist selection config
  artistSelection: Partial<SelectionConfig>;

  // Song selection config
  songSelection: Partial<SongSelectionConfig>;

  // Performance settings
  prioritizeCachedResults: boolean;
  maxApiCalls: number;
  showProgress: boolean;
}

export interface PowerHourGenerationResult {
  tracks: PowerHourTrack[];
  generationStats: {
    totalArtistsConsidered: number;
    cachedArtistsUsed: number;
    apiCallsMade: number;
    fallbacksUsed: number;
    averageArtistSimilarity: number;
    genreDistribution: Record<string, number>;
    generationTimeMs: number;
    cacheHitRate: number;
    seedArtistClipsGenerated: number; // How many clips from seed artist were actually generated
    seedArtistClipsRequested: number; // How many clips from seed artist were requested
    similarArtistClips: number; // How many clips from similar artists
  };
  qualityMetrics: {
    diversityScore: number;
    similarityScore: number;
    completionRate: number; // Percentage of tracks successfully generated
    seedArtistFulfillmentRate: number; // Percentage of requested seed artist clips that were generated
  };
}

export interface GenerationProgress {
  currentTrack: number;
  totalTracks: number;
  currentStep: string;
  cacheHits: number;
  apiCalls: number;
  estimatedTimeRemaining: number;
}

const DEFAULT_CONFIG: PowerHourGenerationConfig = {
  seedArtist: '',
  totalTracks: 60,
  clipDuration: 60,
  seedArtistClipCount: 6, // Default to 6 clips from seed artist
  artistSelection: {
    maxArtists: 60,
    diversityWeight: 0.4,
    similarityWeight: 0.6,
    genreDiversityEnabled: true,
    eraDiversityEnabled: true,
    maxSameGenre: 8,
    maxSameEra: 12
  },
  songSelection: {
    preferredDuration: 60,
    durationTolerance: 30,
    albumDiversityEnabled: true,
    yearDiversityEnabled: true,
    randomnessWeight: 0.7
  },
  prioritizeCachedResults: true,
  maxApiCalls: 10,
  showProgress: true
};

class EnhancedPowerHourGenerator {
  private progressCallback?: (progress: GenerationProgress) => void;
  private abortController?: AbortController;

  /**
   * Generate a complete power hour playlist
   */
  async generatePowerHour(
    config: Partial<PowerHourGenerationConfig>,
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<PowerHourGenerationResult> {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    this.progressCallback = progressCallback;
    this.abortController = new AbortController();

    console.log(`🚀 Starting enhanced power hour generation for: ${finalConfig.seedArtist}`);
    console.log(`🎯 Target: ${finalConfig.totalTracks} tracks, ${finalConfig.clipDuration}s each`);
    console.log(`🎵 Seed artist clips: ${finalConfig.seedArtistClipCount}, Similar artist clips: ${finalConfig.totalTracks - finalConfig.seedArtistClipCount}`);

    try {
      // Step 1: Generate seed artist clips first
      this.updateProgress(0, finalConfig.totalTracks, 'Generating seed artist clips...', 0, 0);

      const seedArtistTracks = await this.generateSeedArtistTracks(finalConfig);
      const seedArtistClipsGenerated = seedArtistTracks.length;

      console.log(`✅ Generated ${seedArtistClipsGenerated}/${finalConfig.seedArtistClipCount} seed artist clips`);

      // Step 2: Calculate remaining tracks needed from similar artists
      const remainingTracksNeeded = finalConfig.totalTracks - seedArtistClipsGenerated;
      let similarArtistTracks: PowerHourTrack[] = [];
      let similarArtists: SimilarArtist[] = [];
      let artistSelection: any = { selectedArtists: [], selectionStats: { genreDistribution: {}, diversityScore: 0 } };

      if (remainingTracksNeeded > 0) {
        // Step 3: Discover similar artists
        this.updateProgress(seedArtistClipsGenerated, finalConfig.totalTracks, 'Discovering similar artists...', 0, 0);

        similarArtists = await this.discoverSimilarArtists(finalConfig);

        // Step 4: Select artists using smart algorithm
        this.updateProgress(seedArtistClipsGenerated, finalConfig.totalTracks, 'Selecting diverse artists...', 0, 0);

        artistSelection = smartArtistSelector.selectArtists(
          similarArtists,
          {
            ...finalConfig.artistSelection,
            maxArtists: remainingTracksNeeded // Only select as many as we need
          }
        );

        console.log(`✅ Selected ${artistSelection.selectedArtists.length} similar artists for generation`);

        // Step 5: Generate tracks for similar artists
        similarArtistTracks = await this.generateSimilarArtistTracks(
          artistSelection.selectedArtists,
          finalConfig,
          seedArtistClipsGenerated
        );
      }

      // Combine all tracks
      const tracks = [...seedArtistTracks, ...similarArtistTracks];

      // Step 6: Calculate results and statistics
      const generationTimeMs = Date.now() - startTime;
      const result = this.calculateResults(
        tracks,
        artistSelection,
        similarArtists.length,
        generationTimeMs,
        finalConfig
      );

      console.log(`✅ Power hour generation complete!`);
      console.log(`📊 Generated ${result.tracks.length}/${finalConfig.totalTracks} tracks`);
      console.log(`🎵 Seed artist: ${seedArtistClipsGenerated}/${finalConfig.seedArtistClipCount} clips`);
      console.log(`🎵 Similar artists: ${similarArtistTracks.length} clips`);
      console.log(`⚡ Cache hit rate: ${result.generationStats.cacheHitRate.toFixed(1)}%`);

      return result;

    } catch (error) {
      console.error(`❌ Power hour generation failed:`, error);
      throw error;
    }
  }

  /**
   * Discover similar artists with caching priority
   */
  private async discoverSimilarArtists(config: PowerHourGenerationConfig): Promise<SimilarArtist[]> {
    console.log(`🔍 Starting artist discovery for: ${config.seedArtist}`);
    console.log(`📋 Discovery config: prioritizeCached=${config.prioritizeCachedResults}, maxResults=${Math.max(config.totalTracks * 2, 100)}`);

    // Check for artist disambiguation first
    const disambiguationSuggestions = artistDisambiguationService.getDisambiguationSuggestions(config.seedArtist);
    if (disambiguationSuggestions.length > 1) {
      console.log(`🔍 Found ${disambiguationSuggestions.length} disambiguation options for "${config.seedArtist}"`);
      console.log(`📋 Using first suggestion: ${disambiguationSuggestions[0].name} (${disambiguationSuggestions[0].genres.join(', ')})`);
      // Use the first suggestion for automatic generation
      config.seedArtist = disambiguationSuggestions[0].name;
    }

    // Check if we have cached results first
    const cached = persistentCacheService.get(config.seedArtist);
    if (cached && config.prioritizeCachedResults) {
      console.log(`💾 Using cached similar artists for ${config.seedArtist}`);
      console.log(`📊 Cache contains ${cached.similarArtists.length} artists from ${cached.metadata.source} method`);
      console.log(`📋 Top 10 cached artists:`, cached.similarArtists.slice(0, 10).map(a => `${a.name} (${a.similarity.toFixed(3)})`));

      // Add debugging to show cache source
      console.log(`🎯 Cache discovery method: ${cached.metadata.source} (accessed ${cached.metadata.accessCount} times)`);
      console.log(`📅 Cache age: ${Math.round((Date.now() - cached.metadata.timestamp) / (60 * 60 * 1000))} hours old`);

      return cached.similarArtists;
    }

    // Use multi-tier discovery for fresh results
    console.log(`🔍 Running fresh multi-tier discovery for ${config.seedArtist}...`);
    console.log(`🎯 This will use the same discovery logic as the Debug page Discovery Tester`);

    const discoveryResult = await multiTierMusicDiscovery.findSimilarArtists(config.seedArtist, {
      maxResults: Math.max(config.totalTracks * 3, 150), // Get plenty of artists for selection (3x target)
      enableLastFm: true,
      enableCurated: true,
      enableAI: true,
      enableFallback: true,
      similarityThreshold: 'loose' // Use loose threshold to get more artists
    });

    console.log(`🎯 Multi-tier discovery completed!`);
    console.log(`📊 Discovery method: ${discoveryResult.method} (confidence: ${discoveryResult.confidence})`);
    console.log(`📊 Sources breakdown: LastFM(${discoveryResult.sources.lastfm}) Curated(${discoveryResult.sources.curated}) AI(${discoveryResult.sources.ai}) Fallback(${discoveryResult.sources.fallback})`);
    console.log(`📊 Total artists found: ${discoveryResult.similarArtists.length}`);
    console.log(`📋 Top 15 discovered artists:`, discoveryResult.similarArtists.slice(0, 15).map(a => `${a.name} (${a.similarity.toFixed(3)})`));

    if (discoveryResult.similarArtists.length === 0) {
      console.warn(`⚠️ No similar artists found for ${config.seedArtist}`);
      throw new Error(`No similar artists found for "${config.seedArtist}". This could be due to:\n1. Last.fm API issues\n2. Artist not in backup database\n3. Network connectivity problems\n\nTry a more popular artist or check your internet connection.`);
    }

    // Cache the results for future use
    persistentCacheService.set(config.seedArtist, discoveryResult.similarArtists, {
      source: discoveryResult.method,
      discoveryMethod: discoveryResult.method,
      confidence: discoveryResult.confidence,
      sources: discoveryResult.sources,
      timestamp: Date.now()
    });

    console.log(`💾 Cached discovery results for future use`);

    return discoveryResult.similarArtists;
  }

  /**
   * Generate tracks specifically for the seed artist
   */
  private async generateSeedArtistTracks(config: PowerHourGenerationConfig): Promise<PowerHourTrack[]> {
    const tracks: PowerHourTrack[] = [];
    let apiCallCount = 0;
    let cacheHitCount = 0;

    console.log(`🎵 Generating ${config.seedArtistClipCount} clips for seed artist: ${config.seedArtist}`);

    // Reset song selector diversity state for fresh selection
    smartSongSelector.resetDiversityState();

    // Create a SimilarArtist object for the seed artist
    const seedArtistInfo: SimilarArtist = {
      name: config.seedArtist,
      similarity: 1.0, // Perfect similarity since it's the exact artist requested
      genres: [],
      popularity: 1.0
    };

    // Generate multiple tracks for the seed artist
    for (let i = 0; i < config.seedArtistClipCount; i++) {
      this.updateProgress(
        tracks.length,
        config.totalTracks,
        `Generating seed artist track ${i + 1}/${config.seedArtistClipCount}...`,
        cacheHitCount,
        apiCallCount
      );

      try {
        // Check if we should abort
        if (this.abortController?.signal.aborted) {
          console.log(`⏹️ Generation aborted by user`);
          break;
        }

        // Select song for seed artist
        const songResult = await smartSongSelector.selectSongForArtist(
          seedArtistInfo,
          config.songSelection
        );

        // Determine selection method
        let selectionMethod: PowerHourTrack['selectionMethod'] = 'api';
        if (persistentCacheService.has(seedArtistInfo.name)) {
          selectionMethod = 'cached';
          cacheHitCount++;
        } else if (songResult.selectionMethod === 'fallback') {
          selectionMethod = 'fallback';
        } else {
          apiCallCount++;
        }

        // Create track
        const track: PowerHourTrack = {
          artist: seedArtistInfo.name,
          song: songResult.selectedSong,
          startTime: tracks.length * config.clipDuration,
          clipDuration: config.clipDuration,
          selectionMethod,
          artistSimilarity: 1.0, // Perfect similarity for seed artist
          isSeedArtist: true
        };

        tracks.push(track);

        console.log(`✅ Seed track ${tracks.length}: ${seedArtistInfo.name} - ${songResult.selectedSong.title}`);

      } catch (error) {
        console.error(`❌ Failed to generate seed artist track ${i + 1}:`, error);
        // Continue trying to generate more tracks
      }
    }

    console.log(`🎵 Generated ${tracks.length}/${config.seedArtistClipCount} seed artist tracks`);
    return tracks;
  }

  /**
   * Generate tracks for similar artists
   */
  private async generateSimilarArtistTracks(
    selectedArtists: SimilarArtist[],
    config: PowerHourGenerationConfig,
    startingTrackNumber: number
  ): Promise<PowerHourTrack[]> {
    const tracks: PowerHourTrack[] = [];
    let apiCallCount = 0;
    let cacheHitCount = 0;

    console.log(`🎵 Generating tracks for ${selectedArtists.length} similar artists`);

    for (let i = 0; i < selectedArtists.length && tracks.length < (config.totalTracks - startingTrackNumber); i++) {
      const artist = selectedArtists[i];

      this.updateProgress(
        startingTrackNumber + tracks.length,
        config.totalTracks,
        `Generating track for ${artist.name}...`,
        cacheHitCount,
        apiCallCount
      );

      try {
        // Check if we should abort
        if (this.abortController?.signal.aborted) {
          console.log(`⏹️ Generation aborted by user`);
          break;
        }

        // Limit API calls if configured
        if (apiCallCount >= config.maxApiCalls && !persistentCacheService.has(artist.name)) {
          console.log(`⚠️ API call limit reached, using fallback for ${artist.name}`);
        }

        // Select song for artist
        const songResult = await smartSongSelector.selectSongForArtist(
          artist,
          config.songSelection
        );

        // Determine selection method
        let selectionMethod: PowerHourTrack['selectionMethod'] = 'api';
        if (persistentCacheService.has(artist.name)) {
          selectionMethod = 'cached';
          cacheHitCount++;
        } else if (songResult.selectionMethod === 'fallback') {
          selectionMethod = 'fallback';
        } else {
          apiCallCount++;
        }

        // Create track
        const track: PowerHourTrack = {
          artist: artist.name,
          song: songResult.selectedSong,
          startTime: (startingTrackNumber + tracks.length) * config.clipDuration,
          clipDuration: config.clipDuration,
          selectionMethod,
          artistSimilarity: artist.similarity,
          isSeedArtist: false
        };

        tracks.push(track);

        console.log(`✅ Similar artist track ${startingTrackNumber + tracks.length}: ${artist.name} - ${songResult.selectedSong.title}`);

      } catch (error) {
        console.error(`❌ Failed to generate track for ${artist.name}:`, error);
        // Continue with next artist
      }
    }

    return tracks;
  }

  /**
   * Generate tracks for selected artists (legacy method - kept for compatibility)
   */
  private async generateTracks(
    selectedArtists: SimilarArtist[],
    config: PowerHourGenerationConfig
  ): Promise<PowerHourTrack[]> {
    const tracks: PowerHourTrack[] = [];
    let apiCallCount = 0;
    let cacheHitCount = 0;

    // Reset song selector diversity state
    smartSongSelector.resetDiversityState();

    for (let i = 0; i < selectedArtists.length && tracks.length < config.totalTracks; i++) {
      const artist = selectedArtists[i];
      
      this.updateProgress(
        tracks.length,
        config.totalTracks,
        `Generating track for ${artist.name}...`,
        cacheHitCount,
        apiCallCount
      );

      try {
        // Check if we should abort
        if (this.abortController?.signal.aborted) {
          console.log(`⏹️ Generation aborted by user`);
          break;
        }

        // Limit API calls if configured
        if (apiCallCount >= config.maxApiCalls && !persistentCacheService.has(artist.name)) {
          console.log(`⚠️ API call limit reached, using fallback for ${artist.name}`);
        }

        // Select song for artist
        const songResult = await smartSongSelector.selectSongForArtist(
          artist,
          config.songSelection
        );

        // Determine selection method
        let selectionMethod: PowerHourTrack['selectionMethod'] = 'api';
        if (persistentCacheService.has(artist.name)) {
          selectionMethod = 'cached';
          cacheHitCount++;
        } else if (songResult.selectionMethod === 'fallback') {
          selectionMethod = 'fallback';
        } else {
          apiCallCount++;
        }

        // Create track
        const track: PowerHourTrack = {
          artist: artist.name,
          song: songResult.selectedSong,
          startTime: tracks.length * config.clipDuration,
          clipDuration: config.clipDuration,
          selectionMethod,
          artistSimilarity: artist.similarity,
          isSeedArtist: artist.name.toLowerCase() === config.seedArtist.toLowerCase()
        };

        tracks.push(track);

        console.log(`✅ Track ${tracks.length}: ${artist.name} - ${songResult.selectedSong.title}`);

      } catch (error) {
        console.error(`❌ Failed to generate track for ${artist.name}:`, error);
        // Continue with next artist
      }
    }

    return tracks;
  }

  /**
   * Calculate final results and statistics
   */
  private calculateResults(
    tracks: PowerHourTrack[],
    artistSelection: any,
    totalArtistsConsidered: number,
    generationTimeMs: number,
    config: PowerHourGenerationConfig
  ): PowerHourGenerationResult {
    const cachedCount = tracks.filter(t => t.selectionMethod === 'cached').length;
    const apiCount = tracks.filter(t => t.selectionMethod === 'api').length;
    const fallbackCount = tracks.filter(t => t.selectionMethod === 'fallback').length;

    // Calculate seed artist vs similar artist statistics
    const seedArtistTracks = tracks.filter(t => t.isSeedArtist);
    const similarArtistTracks = tracks.filter(t => !t.isSeedArtist);
    const seedArtistClipsGenerated = seedArtistTracks.length;
    const seedArtistClipsRequested = config.seedArtistClipCount;
    const seedArtistFulfillmentRate = seedArtistClipsRequested > 0
      ? (seedArtistClipsGenerated / seedArtistClipsRequested) * 100
      : 0;

    const cacheHitRate = tracks.length > 0 ? (cachedCount / tracks.length) * 100 : 0;
    const averageSimilarity = tracks.length > 0
      ? tracks.reduce((sum, track) => sum + track.artistSimilarity, 0) / tracks.length
      : 0;

    const completionRate = (tracks.length / config.totalTracks) * 100;

    return {
      tracks,
      generationStats: {
        totalArtistsConsidered,
        cachedArtistsUsed: cachedCount,
        apiCallsMade: apiCount,
        fallbacksUsed: fallbackCount,
        averageArtistSimilarity: averageSimilarity,
        genreDistribution: artistSelection.selectionStats?.genreDistribution || {},
        generationTimeMs,
        cacheHitRate,
        seedArtistClipsGenerated,
        seedArtistClipsRequested,
        similarArtistClips: similarArtistTracks.length
      },
      qualityMetrics: {
        diversityScore: artistSelection.selectionStats?.diversityScore || 0,
        similarityScore: averageSimilarity,
        completionRate,
        seedArtistFulfillmentRate
      }
    };
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    current: number,
    total: number,
    step: string,
    cacheHits: number,
    apiCalls: number
  ): void {
    if (!this.progressCallback) return;

    const progress = current / total;
    const estimatedTimeRemaining = progress > 0 
      ? ((Date.now() - (this.startTime || Date.now())) / progress) * (1 - progress)
      : 0;

    this.progressCallback({
      currentTrack: current,
      totalTracks: total,
      currentStep: step,
      cacheHits,
      apiCalls,
      estimatedTimeRemaining
    });
  }

  private startTime?: number;

  /**
   * Abort current generation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log(`⏹️ Power hour generation aborted`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return persistentCacheService.getStatistics();
  }

  /**
   * Export cache for backup
   */
  exportCache(): string {
    return persistentCacheService.exportCache();
  }

  /**
   * Import cache from backup
   */
  importCache(data: string): boolean {
    return persistentCacheService.importCache(data);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    persistentCacheService.clear();
  }

  /**
   * Warm cache for popular artists
   */
  async warmCache(artists: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${artists.length} artists...`);
    
    for (const artist of artists) {
      if (!persistentCacheService.has(artist)) {
        try {
          await this.discoverSimilarArtists({
            ...DEFAULT_CONFIG,
            seedArtist: artist,
            prioritizeCachedResults: false
          });
          console.log(`✅ Warmed cache for ${artist}`);
        } catch (error) {
          console.warn(`⚠️ Failed to warm cache for ${artist}:`, error);
        }
      }
    }
    
    console.log(`🔥 Cache warming complete`);
  }
}

// Export singleton instance
export const enhancedPowerHourGenerator = new EnhancedPowerHourGenerator();
