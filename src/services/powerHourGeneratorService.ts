/**
 * Power Hour Generator Service
 * Core service for generating YouTube-based Power Hour playlists
 */

import { shuffle, uniqBy, sortBy } from 'lodash';
import {
  PowerHourGenerationConfig,
  PowerHourGenerationResult,
  GenerationProgress,
  GenerationStep,
  GenerationEvent,
  GenerationProgressCallback,
  EnhancedYouTubeVideo,
  GeneratedClip,
  SimilarArtist,
  SearchStrategy,
  SearchQuery,
  PowerHourGenerationError,
  PowerHourGeneratorService
} from '../types/powerHour';
import {
  YouTubeVideo,
  searchYouTubeEnhanced,
  createClipFromVideo,
  generateRandomStartTime,
  parseDuration
} from '../utils/youtubeUtils';
import { musicSimilarityService } from './musicSimilarityService';
import { backupMusicDiscovery } from './backupMusicDiscovery';
import { multiTierMusicDiscovery } from './multiTierMusicDiscovery';

// Import debug tools in development
if (import.meta.env.DEV) {
  import('../utils/musicDiscoveryDebug');
}

class PowerHourGeneratorServiceImpl implements PowerHourGeneratorService {
  private isCurrentlyGenerating = false;
  private shouldCancel = false;
  private currentProgress: GenerationProgress | null = null;
  private progressCallback: GenerationProgressCallback | null = null;

  /**
   * Generate a complete Power Hour playlist
   */
  async generatePlaylist(
    config: PowerHourGenerationConfig,
    progressCallback?: GenerationProgressCallback
  ): Promise<PowerHourGenerationResult> {
    if (this.isCurrentlyGenerating) {
      throw new PowerHourGenerationError(
        'Generation already in progress',
        'GENERATION_IN_PROGRESS',
        GenerationStep.INITIALIZING
      );
    }

    this.isCurrentlyGenerating = true;
    this.shouldCancel = false;
    this.progressCallback = progressCallback || null;

    const startTime = Date.now();
    const result: PowerHourGenerationResult = {
      success: false,
      config,
      clips: [],
      metadata: {
        totalVideosSearched: 0,
        totalArtistsUsed: 0,
        similarArtistsFound: [],
        generationTime: 0,
        qualityScore: 0
      },
      warnings: [],
      errors: []
    };

    try {
      // Step 1: Initialize
      this.updateProgress(GenerationStep.INITIALIZING, 0, 'Preparing generation...');
      await this.delay(500); // Brief pause for UI feedback

      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 2: Build search strategy
      this.updateProgress(GenerationStep.SEARCHING_PRIMARY, 10, 'Building search strategy...');
      const searchStrategy = await this.buildSearchStrategy(config);
      
      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 3: Find similar artists (if enabled)
      let similarArtists: SimilarArtist[] = [];
      if (config.includeRelatedArtists && config.primaryArtist && config.generationMode === 'variety') {
        this.updateProgress(GenerationStep.FINDING_SIMILAR_ARTISTS, 20, 'Finding similar artists...');

        // Check if Last.fm is available
        if (!musicSimilarityService.isAvailable()) {
          console.warn('⚠️ Last.fm API not configured - skipping similar artist discovery');
          console.log('💡 To enable similar artist discovery:');
          console.log('   1. Get a free API key at https://www.last.fm/api/account/create');
          console.log('   2. Add VITE_LASTFM_API_KEY=your_key to your .env file');
          console.log('   3. Restart the application');
          result.warnings.push('Similar artist discovery disabled - Last.fm API key not configured');
        } else {
          // Use multi-tier discovery system for comprehensive similar artist finding
          const discoveryResult = await multiTierMusicDiscovery.findSimilarArtists(
            config.primaryArtist,
            {
              maxResults: config.maxRelatedArtists,
              similarityThreshold: config.similarityStrength,
              enableLastFm: true,
              enableCurated: true,
              enableAI: true,
              enableFallback: true
            }
          );
          similarArtists = discoveryResult.similarArtists;
          result.metadata.similarArtistsFound = similarArtists;

          console.log(`🎯 Multi-tier discovery result: ${discoveryResult.method} (${discoveryResult.confidence} confidence)`);
          console.log(`📊 Found ${similarArtists.length} similar artists from ${discoveryResult.totalFound} total`);
          console.log(`🔍 Sources: LastFM(${discoveryResult.sources.lastfm}) Curated(${discoveryResult.sources.curated}) AI(${discoveryResult.sources.ai}) Fallback(${discoveryResult.sources.fallback})`);
        }
      } else if (config.generationMode === 'single-artist') {
        console.log(`🎤 Single-artist mode - skipping similar artist discovery`);
      }

      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 4: Search for videos
      this.updateProgress(GenerationStep.SEARCHING_RELATED, 30, 'Searching for videos...');

      // If we have similar artists, add specific searches for them
      if (similarArtists.length > 0) {
        console.log(`🎵 Adding specific searches for ${similarArtists.length} similar artists`);
        const similarArtistSearches = this.generateSimilarArtistSearches(similarArtists);
        searchStrategy.relatedSearches.push(...similarArtistSearches);
      } else if (config.searchType === 'artist' && config.primaryArtist && backupMusicDiscovery.hasDataFor(config.primaryArtist)) {
        // Use backup discovery to generate specific artist searches
        console.log(`🎯 Using backup discovery to generate specific artist searches for ${config.primaryArtist}`);
        const backupSearches = backupMusicDiscovery.generateSimilarArtistSearches(config.primaryArtist, 10);
        searchStrategy.relatedSearches.push(...backupSearches.map(s => ({
          query: s.query,
          artist: s.artist,
          priority: s.priority,
          maxResults: 2
        })));
      }

      const allVideos = await this.searchForVideos(searchStrategy, similarArtists, config);
      result.metadata.totalVideosSearched = allVideos.length;
      console.log(`📊 Total videos found: ${allVideos.length}`);

      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 5: Filter and rank videos
      this.updateProgress(GenerationStep.FILTERING_RESULTS, 60, 'Filtering and ranking videos...');
      const filteredVideos = this.filterAndRankVideos(allVideos, config);
      console.log(`🔍 Filtered videos: ${filteredVideos.length} (from ${allVideos.length})`);

      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 6: Generate clips
      this.updateProgress(GenerationStep.EXTRACTING_CLIPS, 80, 'Generating clips...');
      const clips = await this.generateClips(filteredVideos, config);
      result.clips = clips;
      console.log(`🎵 Final clips generated: ${clips.length}`);

      if (clips.length === 0) {
        console.error('❌ No clips were generated - this indicates a problem with the search or filtering process');
        result.warnings.push('No clips could be generated from the search results');
      }

      if (this.shouldCancel) throw new Error('Generation cancelled');

      // Step 7: Finalize
      this.updateProgress(GenerationStep.FINALIZING, 95, 'Finalizing playlist...');
      result.metadata.totalArtistsUsed = new Set(clips.map(c => c.sourceArtist)).size;
      result.metadata.qualityScore = this.calculateQualityScore(clips, config);
      result.metadata.generationTime = Date.now() - startTime;
      result.success = true;

      this.updateProgress(GenerationStep.COMPLETE, 100, `Generated ${clips.length} clips successfully!`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.success = false;
      
      this.updateProgress(GenerationStep.ERROR, 0, `Generation failed: ${errorMessage}`);
      
      if (errorMessage !== 'Generation cancelled') {
        console.error('Power Hour generation failed:', error);
      }
    } finally {
      this.isCurrentlyGenerating = false;
      this.shouldCancel = false;
      this.currentProgress = null;
      this.progressCallback = null;
    }

    return result;
  }

  /**
   * Cancel the current generation
   */
  cancelGeneration(): void {
    if (this.isCurrentlyGenerating) {
      this.shouldCancel = true;
      this.updateProgress(GenerationStep.ERROR, 0, 'Cancelling generation...');
    }
  }

  /**
   * Check if generation is currently in progress
   */
  isGenerating(): boolean {
    return this.isCurrentlyGenerating;
  }

  /**
   * Get current generation progress
   */
  getProgress(): GenerationProgress | null {
    return this.currentProgress;
  }

  /**
   * Clear similarity cache for testing (useful when debugging similar artist discovery)
   */
  clearSimilarityCache(artist?: string): void {
    musicSimilarityService.clearCache(artist);
  }

  /**
   * Build search strategy based on configuration
   */
  private async buildSearchStrategy(config: PowerHourGenerationConfig): Promise<SearchStrategy> {
    console.log(`🎯 Building search strategy for type: ${config.searchType}`);

    const primarySearches: SearchQuery[] = [];
    const relatedSearches: SearchQuery[] = [];
    const fallbackSearches: SearchQuery[] = [];

    switch (config.searchType) {
      case 'artist':
        if (config.primaryArtist) {
          console.log(`🎤 Artist-based search for: ${config.primaryArtist} (mode: ${config.generationMode})`);

          // Base search - reduced results for better variety
          primarySearches.push({
            query: config.primaryArtist,
            artist: config.primaryArtist,
            priority: 10,
            maxResults: config.generationMode === 'single-artist' ? 8 : 3
          });

          // Add variations - more extensive for single-artist mode
          primarySearches.push({
            query: `${config.primaryArtist} official`,
            artist: config.primaryArtist,
            priority: 9,
            maxResults: config.generationMode === 'single-artist' ? 6 : 2
          });

          primarySearches.push({
            query: `${config.primaryArtist} music video`,
            artist: config.primaryArtist,
            priority: 8,
            maxResults: config.generationMode === 'single-artist' ? 5 : 2
          });

          // Additional searches for single-artist mode
          if (config.generationMode === 'single-artist') {
            primarySearches.push({
              query: `${config.primaryArtist} hits`,
              artist: config.primaryArtist,
              priority: 7,
              maxResults: 4
            });

            primarySearches.push({
              query: `${config.primaryArtist} best songs`,
              artist: config.primaryArtist,
              priority: 6,
              maxResults: 4
            });

            primarySearches.push({
              query: `${config.primaryArtist} greatest`,
              artist: config.primaryArtist,
              priority: 5,
              maxResults: 3
            });
          }
        }
        break;

      case 'keyword':
        if (config.keywords && config.keywords.length > 0) {
          config.keywords.forEach((keyword, index) => {
            primarySearches.push({
              query: keyword,
              artist: 'Various',
              priority: 10 - index,
              maxResults: Math.min(5, Math.ceil(15 / config.keywords!.length)) // Much lower limits
            });
          });
        }
        break;

      case 'mixed':
        if (config.mixedQuery) {
          primarySearches.push({
            query: config.mixedQuery,
            artist: 'Mixed',
            priority: 10,
            maxResults: 5 // Reduced for better variety
          });
        }
        break;
    }

    // Add fallback searches with much lower limits
    fallbackSearches.push(
      { query: 'popular music 2023', artist: 'Various', priority: 5, maxResults: 3 },
      { query: 'top hits', artist: 'Various', priority: 4, maxResults: 3 },
      { query: 'party music', artist: 'Various', priority: 3, maxResults: 3 }
    );

    // Add genre-based searches if we have an artist but no similar artists found
    if (config.searchType === 'artist' && config.primaryArtist) {
      // Common genre combinations for different types of artists
      const genreSearches = this.getGenreSearchesForArtist(config.primaryArtist);
      genreSearches.forEach(search => fallbackSearches.push(search));
    }

    console.log(`📋 Search strategy built:`, {
      primary: primarySearches.length,
      related: relatedSearches.length,
      fallback: fallbackSearches.length
    });

    return { primarySearches, relatedSearches, fallbackSearches };
  }

  /**
   * Find similar artists using the music similarity service with enhanced filtering
   */
  private async findSimilarArtists(artist: string, maxCount: number, config: PowerHourGenerationConfig): Promise<SimilarArtist[]> {
    if (!musicSimilarityService.isAvailable()) {
      this.addWarning('Music similarity service not available - skipping related artists');
      return [];
    }

    try {
      console.log(`🎯 Finding similar artists for: ${artist} (mode: ${config.generationMode}, strength: ${config.similarityStrength})`);

      const similarArtists = await musicSimilarityService.getSimilarArtists(artist);

      // Get original artist info for genre matching
      let originalArtistInfo = null;
      if (config.genreMatching) {
        originalArtistInfo = await musicSimilarityService.getArtistInfo(artist);
      }

      // Filter based on similarity strength
      console.log(`🔍 Similarity scores for ${artist}:`, similarArtists.slice(0, 10).map(a => `${a.name}: ${a.similarity}`));
      let filtered = this.filterBySimilarityStrength(similarArtists, config.similarityStrength);
      console.log(`📊 After similarity filtering (${config.similarityStrength}): ${filtered.length} artists`);

      // Enhance with additional artist information if genre matching is enabled
      if (config.genreMatching && originalArtistInfo) {
        console.log(`🎵 Original artist genres:`, originalArtistInfo.genres);
        filtered = await this.enhanceWithGenreMatching(filtered, originalArtistInfo);
        console.log(`📊 After genre enhancement: ${filtered.length} artists`);
      }

      // Sort by enhanced similarity score
      filtered.sort((a, b) => this.calculateEnhancedSimilarity(a, originalArtistInfo, config) -
                              this.calculateEnhancedSimilarity(b, originalArtistInfo, config));
      filtered.reverse(); // Highest similarity first

      // If we don't have enough artists, try with looser filtering
      if (filtered.length < Math.min(5, maxCount) && config.similarityStrength !== 'loose') {
        console.log(`⚠️ Only ${filtered.length} artists found, trying with looser filtering...`);
        filtered = this.filterBySimilarityStrength(similarArtists, 'loose');

        if (config.genreMatching && originalArtistInfo && filtered.length > 0) {
          filtered = await this.enhanceWithGenreMatching(filtered, originalArtistInfo);
        }

        // Sort by enhanced similarity score
        filtered.sort((a, b) => this.calculateEnhancedSimilarity(a, originalArtistInfo, config) -
                                this.calculateEnhancedSimilarity(b, originalArtistInfo, config));
        filtered.reverse();
      }

      const result = filtered.slice(0, maxCount);
      console.log(`✅ Selected ${result.length} similar artists from ${similarArtists.length} candidates`);

      if (result.length > 0) {
        console.log(`🎵 Similar artists found:`, result.map(a => `${a.name} (${a.similarity.toFixed(3)})`).join(', '));
        return result;
      } else {
        console.log(`⚠️ No similar artists found from Last.fm for ${artist}, trying backup discovery...`);

        // Try backup music discovery service
        const backupArtists = backupMusicDiscovery.getSimilarArtists(artist, maxCount);
        if (backupArtists.length > 0) {
          console.log(`🎯 Backup discovery found ${backupArtists.length} similar artists:`, backupArtists.map(a => a.name).join(', '));
          return backupArtists;
        } else {
          console.log(`⚠️ No similar artists found in backup database either, will use genre-based searches as fallback`);
          return [];
        }
      }
    } catch (error) {
      this.addWarning(`Failed to find similar artists: ${error}`);
      return [];
    }
  }

  /**
   * Filter artists based on similarity strength setting
   */
  private filterBySimilarityStrength(artists: SimilarArtist[], strength: 'loose' | 'moderate' | 'strict'): SimilarArtist[] {
    const thresholds = {
      loose: 0.1,    // Include more diverse artists (Last.fm scores are often low)
      moderate: 0.2, // Balanced similarity
      strict: 0.4    // Only very similar artists
    };

    const threshold = thresholds[strength];
    console.log(`🎯 Filtering with ${strength} threshold: ${threshold}`);
    const filtered = artists.filter(artist => artist.similarity >= threshold);
    console.log(`📈 Similarity range: ${Math.min(...artists.map(a => a.similarity)).toFixed(3)} - ${Math.max(...artists.map(a => a.similarity)).toFixed(3)}`);
    return filtered;
  }

  /**
   * Enhance artist similarity with genre matching
   */
  private async enhanceWithGenreMatching(artists: SimilarArtist[], originalArtistInfo: any): Promise<SimilarArtist[]> {
    const enhanced: SimilarArtist[] = [];

    for (const artist of artists) {
      try {
        const artistInfo = await musicSimilarityService.getArtistInfo(artist.name);
        if (artistInfo) {
          enhanced.push({
            ...artist,
            genres: artistInfo.genres,
            tags: artistInfo.tags,
            playcount: artistInfo.playcount
          });
        } else {
          enhanced.push(artist);
        }

        // Small delay to respect rate limits
        await this.delay(50);
      } catch (error) {
        console.warn(`Failed to get info for ${artist.name}:`, error);
        enhanced.push(artist);
      }
    }

    return enhanced;
  }

  /**
   * Calculate enhanced similarity score considering genres and other factors
   */
  private calculateEnhancedSimilarity(artist: SimilarArtist, originalArtistInfo: any, config: PowerHourGenerationConfig): number {
    let score = artist.similarity;

    // Genre matching bonus
    if (config.genreMatching && originalArtistInfo && artist.genres && artist.genres.length > 0) {
      const genreOverlap = this.calculateGenreOverlap(originalArtistInfo.genres, artist.genres);
      score += genreOverlap * 0.2; // Up to 20% bonus for genre matching
    }

    // Popularity factor (slight preference for more popular artists)
    if (artist.playcount && artist.playcount > 0) {
      const popularityBonus = Math.min(0.1, Math.log10(artist.playcount) / 100);
      score += popularityBonus;
    }

    return Math.min(1.0, score); // Cap at 1.0
  }

  /**
   * Calculate overlap between two genre arrays
   */
  private calculateGenreOverlap(genres1: string[], genres2: string[]): number {
    if (!genres1 || !genres2 || genres1.length === 0 || genres2.length === 0) {
      return 0;
    }

    const set1 = new Set(genres1.map(g => g.toLowerCase()));
    const set2 = new Set(genres2.map(g => g.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Generate genre-based search queries for an artist
   */
  private getGenreSearchesForArtist(artist: string): SearchQuery[] {
    const searches: SearchQuery[] = [];

    // Common genre patterns based on artist name patterns
    const artistLower = artist.toLowerCase();

    // Jam band patterns
    if (artistLower.includes('goose') || artistLower.includes('phish') || artistLower.includes('dead')) {
      searches.push(
        { query: 'jam band', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'psychedelic rock', artist: 'Various', priority: 5, maxResults: 3 },
        { query: 'improvisational rock', artist: 'Various', priority: 4, maxResults: 3 }
      );
    }
    // Rock patterns
    else if (artistLower.includes('rock') || artistLower.includes('metal') || artistLower.includes('punk')) {
      searches.push(
        { query: 'rock music', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'alternative rock', artist: 'Various', priority: 5, maxResults: 3 },
        { query: 'indie rock', artist: 'Various', priority: 4, maxResults: 3 }
      );
    }
    // Pop patterns
    else if (artistLower.includes('pop') || artistLower.includes('taylor') || artistLower.includes('ariana')) {
      searches.push(
        { query: 'pop music', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'dance pop', artist: 'Various', priority: 5, maxResults: 3 },
        { query: 'electropop', artist: 'Various', priority: 4, maxResults: 3 }
      );
    }
    // Hip hop patterns
    else if (artistLower.includes('rap') || artistLower.includes('hip hop') || artistLower.includes('drake')) {
      searches.push(
        { query: 'hip hop', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'rap music', artist: 'Various', priority: 5, maxResults: 3 },
        { query: 'trap music', artist: 'Various', priority: 4, maxResults: 3 }
      );
    }
    // Electronic patterns
    else if (artistLower.includes('electronic') || artistLower.includes('edm') || artistLower.includes('house')) {
      searches.push(
        { query: 'electronic music', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'house music', artist: 'Various', priority: 5, maxResults: 3 },
        { query: 'techno music', artist: 'Various', priority: 4, maxResults: 3 }
      );
    }
    // Default fallback genres
    else {
      searches.push(
        { query: 'indie music', artist: 'Various', priority: 6, maxResults: 4 },
        { query: 'alternative music', artist: 'Various', priority: 5, maxResults: 3 }
      );
    }

    console.log(`🎵 Generated ${searches.length} genre-based searches for ${artist}`);
    return searches;
  }

  /**
   * Generate specific search queries for similar artists
   */
  private generateSimilarArtistSearches(similarArtists: SimilarArtist[]): SearchQuery[] {
    const searches: SearchQuery[] = [];

    similarArtists.forEach((artist, index) => {
      const priority = Math.floor(artist.similarity * 10);

      // Basic artist search
      searches.push({
        query: artist.name,
        artist: artist.name,
        priority: priority,
        maxResults: 2
      });

      // Add popular song searches if we have them in backup database
      const popularSongs = backupMusicDiscovery.getPopularSongs(artist.name);
      if (popularSongs.length > 0) {
        // Add top 2 popular songs for this artist
        popularSongs.slice(0, 2).forEach(song => {
          searches.push({
            query: `${artist.name} ${song}`,
            artist: artist.name,
            priority: priority - 1,
            maxResults: 1
          });
        });
      }
    });

    console.log(`🎵 Generated ${searches.length} specific similar artist searches`);
    return searches;
  }

  /**
   * Search for videos using the search strategy
   */
  private async searchForVideos(
    strategy: SearchStrategy,
    similarArtists: SimilarArtist[],
    config: PowerHourGenerationConfig
  ): Promise<EnhancedYouTubeVideo[]> {
    const allVideos: EnhancedYouTubeVideo[] = [];
    let searchCount = 0;
    const totalSearches = strategy.primarySearches.length + 
                         similarArtists.length + 
                         strategy.fallbackSearches.length;

    // Primary searches
    for (const search of strategy.primarySearches) {
      if (this.shouldCancel) break;
      
      const progress = 30 + (searchCount / totalSearches) * 30;
      this.updateProgress(
        GenerationStep.SEARCHING_RELATED, 
        progress, 
        `Searching: ${search.query}`
      );

      const videos = await this.performSearch(search, config);
      allVideos.push(...videos);
      searchCount++;
      
      await this.delay(100); // Brief delay between searches
    }

    // Similar artist searches
    for (const artist of similarArtists) {
      if (this.shouldCancel) break;
      
      const progress = 30 + (searchCount / totalSearches) * 30;
      this.updateProgress(
        GenerationStep.SEARCHING_RELATED, 
        progress, 
        `Searching similar artist: ${artist.name}`
      );

      const search: SearchQuery = {
        query: artist.name,
        artist: artist.name,
        priority: Math.floor(artist.similarity * 10),
        maxResults: 2 // Much lower limit for better variety
      };

      const videos = await this.performSearch(search, config);
      allVideos.push(...videos);
      searchCount++;
      
      await this.delay(100);
    }

    // Fallback searches only if we have very few videos and no similar artists were found
    const shouldUseFallback = allVideos.length < Math.max(10, config.targetClipCount / 4) && similarArtists.length === 0;

    if (shouldUseFallback) {
      console.log(`⚠️ Using fallback searches - only ${allVideos.length} videos found and no similar artists`);
      for (const search of strategy.fallbackSearches) {
        if (this.shouldCancel) break;

        const progress = 30 + (searchCount / totalSearches) * 30;
        this.updateProgress(
          GenerationStep.SEARCHING_RELATED,
          progress,
          `Fallback search: ${search.query}`
        );

        const videos = await this.performSearch(search, config);
        allVideos.push(...videos);
        searchCount++;

        await this.delay(100);
      }
    } else {
      console.log(`✅ Skipping fallback searches - have ${allVideos.length} videos and ${similarArtists.length} similar artists`);
    }

    return allVideos;
  }

  /**
   * Perform a single search query
   */
  private async performSearch(
    search: SearchQuery,
    config: PowerHourGenerationConfig
  ): Promise<EnhancedYouTubeVideo[]> {
    try {
      console.log(`🔍 Searching for: "${search.query}" (max: ${search.maxResults})`);

      const result = await searchYouTubeEnhanced(search.query, null, {
        maxResults: search.maxResults,
        useYtDlp: true,
        videoDuration: 'medium' // 4-20 minutes
      });

      console.log(`✅ Search results for "${search.query}": ${result.videos.length} videos found`);

      if (result.videos.length === 0) {
        console.warn(`⚠️ No videos found for query: "${search.query}"`);
        return [];
      }

      const enhancedVideos = result.videos.map(video => this.enhanceVideo(video, search, config));
      console.log(`🎯 Enhanced ${enhancedVideos.length} videos for "${search.query}"`);

      return enhancedVideos;
    } catch (error) {
      console.error(`❌ Search failed for "${search.query}":`, error);
      return [];
    }
  }

  /**
   * Enhance video with additional metadata
   */
  private enhanceVideo(
    video: YouTubeVideo, 
    search: SearchQuery, 
    config: PowerHourGenerationConfig
  ): EnhancedYouTubeVideo {
    const title = video.title.toLowerCase();
    const channel = video.channelTitle.toLowerCase();
    
    return {
      ...video,
      searchQuery: search.query,
      sourceArtist: search.artist,
      relevanceScore: this.calculateRelevanceScore(video, search),
      isOfficial: this.isOfficialVideo(title, channel),
      isRemix: this.isRemixVideo(title),
      estimatedMusicStart: this.estimateMusicStart(video)
    };
  }

  // Additional helper methods would continue here...
  // Due to length constraints, I'll continue in the next part

  private calculateRelevanceScore(video: YouTubeVideo, search: SearchQuery): number {
    let score = 0.5; // Base score

    const title = video.title.toLowerCase();
    const channel = video.channelTitle.toLowerCase();
    const searchTerms = search.query.toLowerCase().split(' ');

    // Title relevance (40% weight)
    let titleMatches = 0;
    searchTerms.forEach(term => {
      if (title.includes(term)) {
        titleMatches++;
      }
    });
    const titleScore = titleMatches / searchTerms.length;
    score += titleScore * 0.4;

    // Channel relevance (20% weight)
    let channelMatches = 0;
    searchTerms.forEach(term => {
      if (channel.includes(term)) {
        channelMatches++;
      }
    });
    const channelScore = channelMatches / searchTerms.length;
    score += channelScore * 0.2;

    // Official video bonus (10% weight)
    if (this.isOfficialVideo(title, channel)) {
      score += 0.1;
    }

    // View count factor (10% weight) - prefer popular videos
    if (video.viewCount && typeof video.viewCount === 'number') {
      const viewScore = Math.min(0.1, Math.log10(video.viewCount) / 100);
      score += viewScore;
    }

    // Duration preference (10% weight) - prefer videos in sweet spot (3-6 minutes)
    const duration = typeof video.duration === 'string' ? parseDuration(video.duration) : video.duration;
    if (duration && duration >= 180 && duration <= 360) {
      score += 0.1;
    }

    // Penalty for remixes if not preferred (10% weight)
    if (this.isRemixVideo(title)) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  private isOfficialVideo(title: string, channel: string): boolean {
    const officialKeywords = ['official', 'vevo', 'records'];
    return officialKeywords.some(keyword => 
      title.includes(keyword) || channel.includes(keyword)
    );
  }

  private isRemixVideo(title: string): boolean {
    const remixKeywords = ['remix', 'cover', 'acoustic', 'live'];
    return remixKeywords.some(keyword => title.includes(keyword));
  }

  private estimateMusicStart(video: YouTubeVideo): number {
    // Simple heuristic - most music videos start immediately or within 10 seconds
    return Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 10);
  }

  private filterAndRankVideos(
    videos: EnhancedYouTubeVideo[],
    config: PowerHourGenerationConfig
  ): EnhancedYouTubeVideo[] {
    console.log(`🔍 Starting filtering of ${videos.length} videos`);
    console.log(`📏 Duration filter: ${config.minVideoDuration}s - ${config.maxVideoDuration}s`);

    // Remove duplicates, filter by duration, rank by relevance
    const unique = uniqBy(videos, 'id');
    console.log(`🔄 After deduplication: ${unique.length} videos`);

    const filtered = unique.filter((video, index) => {
      // Parse duration properly - it might be in PT format or seconds
      let durationInSeconds = 0;

      if (typeof video.duration === 'string') {
        if (video.duration.startsWith('PT')) {
          // Parse YouTube duration format (PT3M30S)
          durationInSeconds = parseDuration(video.duration);
        } else {
          // Try to parse as number string
          durationInSeconds = parseInt(video.duration) || 0;
        }
      } else if (typeof video.duration === 'number') {
        durationInSeconds = video.duration;
      }

      const passesFilter = durationInSeconds >= config.minVideoDuration && durationInSeconds <= config.maxVideoDuration;

      if (index < 5) { // Log first 5 videos for debugging
        console.log(`📹 Video ${index + 1}: "${video.title}" - Duration: ${video.duration} → ${durationInSeconds}s - ${passesFilter ? 'PASS' : 'FAIL'}`);
      }

      return passesFilter;
    });

    console.log(`✅ After duration filtering: ${filtered.length} videos (from ${unique.length})`);

    const ranked = sortBy(filtered, ['relevanceScore']).reverse();
    console.log(`🏆 Final ranked videos: ${ranked.length}`);

    return ranked;
  }



  private async generateClips(
    videos: EnhancedYouTubeVideo[],
    config: PowerHourGenerationConfig
  ): Promise<GeneratedClip[]> {
    console.log(`🎬 Starting clip generation from ${videos.length} videos, target: ${config.targetClipCount} (mode: ${config.generationMode})`);

    const clips: GeneratedClip[] = [];
    const artistCounts: Record<string, number> = {};

    if (videos.length === 0) {
      console.error('❌ No videos available for clip generation');
      return [];
    }

    // Adjust max clips per artist based on generation mode
    const effectiveMaxClipsPerArtist = config.generationMode === 'single-artist'
      ? config.targetClipCount
      : config.maxClipsPerArtist;

    console.log(`🎯 Artist diversity settings: mode=${config.generationMode}, maxPerArtist=${effectiveMaxClipsPerArtist}`);

    // For variety mode, implement smarter distribution
    let videoQueue = [...videos];
    if (config.generationMode === 'variety' && config.ensureArtistDiversity) {
      videoQueue = this.optimizeVideoDistribution(videos, config);
    }

    for (let i = 0; i < videoQueue.length && clips.length < config.targetClipCount; i++) {
      const video = videoQueue[i];

      console.log(`🎵 Processing video ${i + 1}/${videoQueue.length}: "${video.title}" by ${video.sourceArtist}`);

      // Check artist diversity
      if (config.ensureArtistDiversity && config.generationMode === 'variety') {
        const count = artistCounts[video.sourceArtist] || 0;
        if (count >= effectiveMaxClipsPerArtist) {
          console.log(`⏭️ Skipping video - already have ${count} clips from ${video.sourceArtist} (max: ${effectiveMaxClipsPerArtist})`);
          continue;
        }

        // Check for consecutive same artist (if enabled) - but only if we have other options
        if (config.preventConsecutiveSameArtist && clips.length > 0) {
          const lastClip = clips[clips.length - 1];
          if (lastClip.sourceArtist === video.sourceArtist) {
            // Look ahead to see if we have other artists available
            const remainingVideos = videoQueue.slice(i + 1);
            const hasOtherArtists = remainingVideos.some(v => v.sourceArtist !== video.sourceArtist);

            if (hasOtherArtists) {
              console.log(`⏭️ Skipping video - preventing consecutive clips from ${video.sourceArtist} (other artists available)`);
              continue;
            } else {
              console.log(`✅ Allowing consecutive clip from ${video.sourceArtist} - no other artists available`);
            }
          }
        }
      }

      try {
        // Parse video duration properly
        let videoDurationInSeconds = 180; // Default to 3 minutes

        if (video.duration) {
          if (typeof video.duration === 'string') {
            if (video.duration.startsWith('PT')) {
              videoDurationInSeconds = parseDuration(video.duration);
            } else {
              videoDurationInSeconds = parseInt(video.duration) || 180;
            }
          } else if (typeof video.duration === 'number') {
            videoDurationInSeconds = video.duration;
          }
        }

        // Ensure we have a valid duration
        if (isNaN(videoDurationInSeconds) || videoDurationInSeconds <= 0) {
          videoDurationInSeconds = 180; // Fallback to 3 minutes
        }

        const randomOffset = generateRandomStartTime(videoDurationInSeconds, config.clipDuration);
        const startTime = Math.max(0, video.estimatedMusicStart + randomOffset);

        console.log(`⏰ Creating clip: videoDuration=${videoDurationInSeconds}s, start=${startTime}s, duration=${config.clipDuration}s`);

        const clip = createClipFromVideo(video, startTime, config.clipDuration);

        const generatedClip: GeneratedClip = {
          ...clip,
          sourceArtist: video.sourceArtist,
          searchQuery: video.searchQuery,
          relevanceScore: video.relevanceScore,
          generationRank: clips.length + 1
        };

        clips.push(generatedClip);
        artistCounts[video.sourceArtist] = (artistCounts[video.sourceArtist] || 0) + 1;

        console.log(`✅ Generated clip ${clips.length}/${config.targetClipCount}: "${clip.title}" (${artistCounts[video.sourceArtist]} from ${video.sourceArtist})`);

        // Update progress
        const progress = 80 + (clips.length / config.targetClipCount) * 15;
        this.updateProgress(
          GenerationStep.EXTRACTING_CLIPS,
          progress,
          `Generated clip ${clips.length}/${config.targetClipCount}`
        );
      } catch (error) {
        console.error(`❌ Failed to create clip from video "${video.title}":`, error);
      }
    }

    console.log(`🎉 Clip generation complete: ${clips.length} clips generated`);
    console.log(`📊 Artist distribution:`, Object.entries(artistCounts).map(([artist, count]) => `${artist}: ${count}`).join(', '));

    return clips;
  }

  /**
   * Optimize video distribution for better artist variety
   */
  private optimizeVideoDistribution(videos: EnhancedYouTubeVideo[], config: PowerHourGenerationConfig): EnhancedYouTubeVideo[] {
    console.log(`🔄 Optimizing video distribution for variety mode`);

    // Group videos by artist
    const videosByArtist: Record<string, EnhancedYouTubeVideo[]> = {};
    videos.forEach(video => {
      if (!videosByArtist[video.sourceArtist]) {
        videosByArtist[video.sourceArtist] = [];
      }
      videosByArtist[video.sourceArtist].push(video);
    });

    // Sort each artist's videos by relevance score
    Object.keys(videosByArtist).forEach(artist => {
      videosByArtist[artist].sort((a, b) => b.relevanceScore - a.relevanceScore);
    });

    // Distribute videos evenly across artists
    const optimizedQueue: EnhancedYouTubeVideo[] = [];
    const artistNames = Object.keys(videosByArtist);
    const maxRounds = Math.ceil(config.targetClipCount / artistNames.length) + 1;

    for (let round = 0; round < maxRounds && optimizedQueue.length < videos.length; round++) {
      for (const artist of artistNames) {
        const artistVideos = videosByArtist[artist];
        if (round < artistVideos.length) {
          optimizedQueue.push(artistVideos[round]);
        }

        if (optimizedQueue.length >= videos.length) break;
      }
    }

    console.log(`✅ Optimized distribution: ${optimizedQueue.length} videos across ${artistNames.length} artists`);
    return optimizedQueue;
  }

  private calculateQualityScore(clips: GeneratedClip[], config: PowerHourGenerationConfig): number {
    if (clips.length === 0) return 0;
    
    const avgRelevance = clips.reduce((sum, clip) => sum + clip.relevanceScore, 0) / clips.length;
    const completionRatio = clips.length / config.targetClipCount;
    const diversityScore = new Set(clips.map(c => c.sourceArtist)).size / clips.length;
    
    return (avgRelevance * 0.4 + completionRatio * 0.4 + diversityScore * 0.2);
  }

  private updateProgress(step: GenerationStep, progress: number, message: string): void {
    this.currentProgress = {
      currentStep: step,
      totalSteps: 7,
      currentStepProgress: progress,
      overallProgress: progress,
      message,
      estimatedTimeRemaining: this.estimateTimeRemaining(progress)
    };

    if (this.progressCallback) {
      this.progressCallback({
        type: 'progress',
        data: this.currentProgress,
        timestamp: Date.now()
      });
    }
  }

  private estimateTimeRemaining(progress: number): number {
    // Simple estimation based on progress
    const totalEstimatedTime = 120; // 2 minutes
    return Math.max(0, Math.floor((totalEstimatedTime * (100 - progress)) / 100));
  }

  private addWarning(message: string): void {
    console.warn(`⚠️ Power Hour Generation: ${message}`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const powerHourGeneratorService = new PowerHourGeneratorServiceImpl();
export default powerHourGeneratorService;
