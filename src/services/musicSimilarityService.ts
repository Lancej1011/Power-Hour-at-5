/**
 * Music Similarity Service
 * Provides artist similarity and recommendation functionality using Last.fm API
 */

import axios, { AxiosResponse } from 'axios';
import {
  SimilarArtist,
  ArtistSimilarityResponse,
  CachedSimilarityResult,
  MusicSimilarityService
} from '../types/powerHour';
import { LASTFM_CONFIG, isLastFmAvailable } from '../config/musicServices';
import { persistentCacheService } from './persistentCacheService';
import { artistDisambiguationService } from './artistDisambiguationService';

// Last.fm API response interfaces
interface LastFmSimilarArtist {
  name: string;
  match: string; // similarity as string percentage
  url: string;
  image: Array<{
    '#text': string;
    size: 'small' | 'medium' | 'large' | 'extralarge';
  }>;
  mbid?: string;
}

interface LastFmSimilarResponse {
  similarartists: {
    artist: LastFmSimilarArtist[];
    '@attr': {
      artist: string;
    };
  };
}

interface LastFmErrorResponse {
  error: number;
  message: string;
}

class MusicSimilarityServiceImpl implements MusicSimilarityService {
  private cache: Map<string, CachedSimilarityResult> = new Map();
  private lastRequestTime = 0;
  private rateLimitRemaining = 1000; // Default assumption
  private rateLimitResetTime = Date.now() + 3600000; // 1 hour from now

  constructor() {
    this.loadCache();

    // Log configuration status
    if (isLastFmAvailable()) {
      console.log('🎵 Last.fm API configured and ready');
    } else {
      console.warn('⚠️ Last.fm API key not configured - similarity features disabled');
      console.log('💡 Set VITE_LASTFM_API_KEY environment variable to enable');
      console.log('💡 Make sure to restart the development server after adding the API key');
    }
  }

  /**
   * Get similar artists for a given artist name with disambiguation
   */
  async getSimilarArtists(
    artist: string,
    maxResults: number = 50,
    context?: { genres?: string[]; seedArtist?: string; seedGenres?: string[] }
  ): Promise<SimilarArtist[]> {
    const normalizedArtist = this.normalizeArtistName(artist);

    // Check for artist disambiguation
    const disambiguationResult = artistDisambiguationService.disambiguateArtist(artist, context);

    if (disambiguationResult.confidence === 'low' && disambiguationResult.suggestions) {
      console.log(`⚠️ Ambiguous artist "${artist}" - found ${disambiguationResult.suggestions.length} possibilities:`);
      disambiguationResult.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.name} (${suggestion.genres.join(', ')}) - ${suggestion.description}`);
      });
    }

    // Use disambiguated query for API calls
    const searchQuery = artistDisambiguationService.getLastFmQuery(artist, context);
    const cacheKey = this.normalizeArtistName(searchQuery);

    console.log(`🔍 Searching for: "${artist}" → "${searchQuery}"`);

    // Check persistent cache first (using disambiguated query)
    const persistentCached = persistentCacheService.get(cacheKey);
    if (persistentCached) {
      console.log(`💾 Using persistent cache for: ${searchQuery} (${persistentCached.similarArtists.length} artists)`);
      console.log(`📊 Cache metadata: ${persistentCached.metadata.popularity} popularity, accessed ${persistentCached.metadata.accessCount} times`);
      return persistentCached.similarArtists.slice(0, maxResults);
    }

    // Check local cache as fallback
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log(`🎵 Using local cache for: ${searchQuery}`);
      console.log(`📊 Local cached data contains ${cached.similarArtists.length} artists`);

      // Migrate to persistent cache
      persistentCacheService.set(cacheKey, cached.similarArtists, {
        source: 'lastfm',
        apiCallCount: 1
      });

      return cached.similarArtists.slice(0, maxResults);
    }

    try {
      console.log(`🔍 Fetching similar artists for: ${searchQuery} (target: ${maxResults} artists)`);

      // Get expanded similar artists using multiple API calls with disambiguated query
      const similarArtists = await this.getExpandedSimilarArtists(searchQuery, maxResults);

      // Cache the result in both local and persistent cache
      this.cacheResult(cacheKey, similarArtists);
      persistentCacheService.set(cacheKey, similarArtists, {
        source: 'lastfm',
        apiCallCount: this.getApiCallCount(similarArtists.length)
      });

      console.log(`✅ Found ${similarArtists.length} similar artists for: ${artist} (searched as: ${searchQuery})`);
      return similarArtists.slice(0, maxResults);

    } catch (error) {
      console.error(`❌ Error fetching similar artists for ${artist}:`, error);

      // Return empty array on error, but log the issue
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as LastFmErrorResponse;
        console.error(`Last.fm API Error ${errorData.error}: ${errorData.message}`);
      }

      return [];
    }
  }

  /**
   * Get expanded similar artists by making multiple API calls
   */
  private async getExpandedSimilarArtists(artist: string, targetCount: number): Promise<SimilarArtist[]> {
    const allArtists = new Map<string, SimilarArtist>();
    const originalLower = artist.toLowerCase();

    // First, get direct similar artists
    await this.enforceRateLimit();
    console.log(`🎯 Step 1: Getting direct similar artists for: ${artist}`);

    const response = await this.makeLastFmRequest('artist.getSimilar', {
      artist: artist,
      limit: '50', // Get maximum from Last.fm
      autocorrect: '1'
    });

    const primaryArtists = this.parseLastFmResponse(response.data, artist);

    // Add primary artists to our collection
    primaryArtists.forEach(similarArtist => {
      if (similarArtist.name.toLowerCase() !== originalLower) {
        allArtists.set(similarArtist.name.toLowerCase(), similarArtist);
      }
    });

    console.log(`📊 Step 1 complete: Found ${primaryArtists.length} direct similar artists`);

    // If we need more artists, get similar artists of similar artists
    if (allArtists.size < targetCount && primaryArtists.length > 0) {
      console.log(`🔄 Step 2: Expanding search to get more artists (current: ${allArtists.size}, target: ${targetCount})`);

      // Take top 5 similar artists and find their similar artists
      const topArtists = primaryArtists.slice(0, Math.min(5, primaryArtists.length));

      for (const similarArtist of topArtists) {
        if (allArtists.size >= targetCount) break;

        try {
          await this.enforceRateLimit();
          console.log(`🔍 Finding artists similar to: ${similarArtist.name}`);

          const secondaryResponse = await this.makeLastFmRequest('artist.getSimilar', {
            artist: similarArtist.name,
            limit: '30', // Get fewer for secondary searches
            autocorrect: '1'
          });

          const secondaryArtists = this.parseLastFmResponse(secondaryResponse.data, similarArtist.name);

          // Add secondary artists with reduced similarity scores
          secondaryArtists.forEach(secondaryArtist => {
            const artistLower = secondaryArtist.name.toLowerCase();
            if (artistLower !== originalLower && !allArtists.has(artistLower)) {
              allArtists.set(artistLower, {
                ...secondaryArtist,
                similarity: secondaryArtist.similarity * 0.7 // Reduce similarity for secondary matches
              });
            }
          });

          console.log(`📈 Added ${secondaryArtists.length} artists from ${similarArtist.name} (total: ${allArtists.size})`);

        } catch (error) {
          console.warn(`⚠️ Failed to get similar artists for ${similarArtist.name}:`, error);
          continue;
        }
      }
    }

    // Convert back to array and sort by similarity
    const result = Array.from(allArtists.values())
      .sort((a, b) => b.similarity - a.similarity);

    console.log(`🎯 Expansion complete: ${primaryArtists.length} → ${result.length} artists`);
    return result;
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return isLastFmAvailable();
  }

  /**
   * Clear cached data for an artist or all cache (useful for testing)
   */
  clearCache(artist?: string): void {
    if (artist) {
      const normalized = this.normalizeArtistName(artist);
      this.cache.delete(normalized);
      console.log(`🗑️ Cleared cache for: ${artist}`);
    } else {
      this.cache.clear();
      localStorage.removeItem('music_similarity_cache');
      console.log(`🗑️ Cleared all similarity cache`);
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimit(): { remaining: number; resetTime: number } {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: this.rateLimitResetTime
    };
  }

  /**
   * Get enhanced artist information including genres and tags
   */
  async getArtistInfo(artist: string): Promise<{ genres: string[]; tags: string[]; playcount: number } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      await this.enforceRateLimit();

      const response = await this.makeLastFmRequest('artist.getInfo', {
        artist: this.normalizeArtistName(artist),
        autocorrect: '1'
      });

      const artistData = response.data.artist;
      if (!artistData) {
        return null;
      }

      const genres: string[] = [];
      const tags: string[] = [];

      // Extract tags (which often include genres)
      if (artistData.tags && artistData.tags.tag) {
        const tagList = Array.isArray(artistData.tags.tag) ? artistData.tags.tag : [artistData.tags.tag];
        tagList.forEach((tag: any) => {
          if (tag.name) {
            tags.push(tag.name.toLowerCase());
            // Common genre tags
            if (this.isGenreTag(tag.name)) {
              genres.push(tag.name.toLowerCase());
            }
          }
        });
      }

      const playcount = parseInt(artistData.stats?.playcount || '0');

      return { genres, tags, playcount };
    } catch (error) {
      console.warn(`Failed to get artist info for ${artist}:`, error);
      return null;
    }
  }

  /**
   * Check if a tag represents a musical genre
   */
  private isGenreTag(tag: string): boolean {
    const genreKeywords = [
      'rock', 'pop', 'hip hop', 'rap', 'electronic', 'dance', 'house', 'techno',
      'jazz', 'blues', 'country', 'folk', 'classical', 'metal', 'punk', 'reggae',
      'r&b', 'soul', 'funk', 'disco', 'indie', 'alternative', 'grunge', 'emo',
      'ambient', 'experimental', 'world', 'latin', 'acoustic', 'instrumental'
    ];

    const lowerTag = tag.toLowerCase();
    return genreKeywords.some(genre => lowerTag.includes(genre));
  }

  /**
   * Make a request to Last.fm API with enhanced error handling
   */
  private async makeLastFmRequest(method: string, params: Record<string, string>): Promise<AxiosResponse> {
    const requestParams = {
      method,
      api_key: LASTFM_CONFIG.API_KEY,
      format: 'json',
      ...params
    };

    console.log(`🌐 Making Last.fm request: ${method} for ${params.artist || 'unknown'}`);
    console.log(`🔑 Using API key: ${LASTFM_CONFIG.API_KEY ? LASTFM_CONFIG.API_KEY.substring(0, 8) + '...' : 'NOT_SET'}`);

    try {
      const response = await axios.get(LASTFM_CONFIG.BASE_URL, {
        params: requestParams,
        timeout: 15000, // Increased timeout to 15 seconds
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Remove User-Agent header as it's not allowed in browsers
        },
        // Add retry logic for network issues
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors, handle them gracefully
      });

      console.log(`✅ Last.fm response status: ${response.status}`);

      // Update rate limit info if provided in headers
      if (response.headers['x-ratelimit-remaining']) {
        this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
      }
      if (response.headers['x-ratelimit-reset']) {
        this.rateLimitResetTime = parseInt(response.headers['x-ratelimit-reset']) * 1000;
      }

      // Check for Last.fm API errors in the response
      if (response.data && response.data.error) {
        const errorMsg = `Last.fm API Error ${response.data.error}: ${response.data.message}`;
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      return response;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.error(`⏰ Last.fm request timeout for ${method}`);
          throw new Error('Last.fm API request timed out');
        } else if (error.response) {
          console.error(`🚫 Last.fm HTTP error ${error.response.status}: ${error.response.statusText}`);
          console.error(`📊 Error response data:`, error.response.data);
          throw new Error(`Last.fm API HTTP error: ${error.response.status}`);
        } else if (error.request) {
          console.error(`🌐 Last.fm network error - no response received`);
          throw new Error('Last.fm API network error - check internet connection');
        }
      }

      console.error(`❌ Unexpected Last.fm error:`, error);
      throw error;
    }
  }

  /**
   * Parse Last.fm API response into our format
   */
  private parseLastFmResponse(data: any, originalArtist: string): SimilarArtist[] {
    if (!data.similarartists || !data.similarartists.artist) {
      return [];
    }

    const artists = Array.isArray(data.similarartists.artist)
      ? data.similarartists.artist
      : [data.similarartists.artist];

    const parsedArtists = artists
      .map((artist: LastFmSimilarArtist) => ({
        name: artist.name,
        similarity: parseFloat(artist.match), // Last.fm already returns 0-1 scale, don't divide by 100!
        mbid: artist.mbid || undefined,
        url: artist.url,
        image: this.extractBestImage(artist.image),
        genres: [], // Will be populated by additional API calls if needed
        tags: [], // Will be populated by additional API calls if needed
        playcount: 0 // Will be populated by additional API calls if needed
      }))
      .filter(artist => artist.name.toLowerCase() !== originalArtist.toLowerCase()) // Remove self-references
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

    console.log(`🎯 Parsed ${parsedArtists.length} artists from Last.fm for ${originalArtist}`);
    console.log(`📊 Similarity range: ${parsedArtists[0]?.similarity.toFixed(3)} → ${parsedArtists[parsedArtists.length - 1]?.similarity.toFixed(3)}`);
    console.log(`📋 Top 20 Last.fm artists:`, parsedArtists.slice(0, 20).map(a => `${a.name} (${a.similarity.toFixed(3)})`));

    return parsedArtists;
  }

  /**
   * Extract the best quality image from Last.fm image array
   */
  private extractBestImage(images: LastFmSimilarArtist['image']): string | undefined {
    if (!images || images.length === 0) return undefined;
    
    // Prefer larger images
    const sizeOrder = ['extralarge', 'large', 'medium', 'small'];
    
    for (const size of sizeOrder) {
      const image = images.find(img => img.size === size);
      if (image && image['#text']) {
        return image['#text'];
      }
    }
    
    return images[0]?.['#text'] || undefined;
  }

  /**
   * Normalize artist name for consistent caching and API calls
   */
  private normalizeArtistName(artist: string): string {
    return artist.trim().toLowerCase();
  }

  /**
   * Enforce rate limiting between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < LASTFM_CONFIG.RATE_LIMIT_DELAY) {
      const delay = LASTFM_CONFIG.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(artist: string): CachedSimilarityResult | null {
    const cached = this.cache.get(artist);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(artist);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache similarity result
   */
  private cacheResult(artist: string, similarArtists: SimilarArtist[]): void {
    const cached: CachedSimilarityResult = {
      artist,
      similarArtists,
      timestamp: Date.now(),
      expiresAt: Date.now() + LASTFM_CONFIG.CACHE_DURATION
    };

    this.cache.set(artist, cached);
    this.saveCache();
  }

  /**
   * Load cache from localStorage
   */
  private loadCache(): void {
    try {
      const stored = localStorage.getItem('music_similarity_cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
        
        // Clean expired entries
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
          if (now > (value as CachedSimilarityResult).expiresAt) {
            this.cache.delete(key);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load music similarity cache:', error);
      this.cache = new Map();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCache(): void {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem('music_similarity_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save music similarity cache:', error);
    }
  }



  /**
   * Get cache statistics including persistent cache
   */
  getCacheStats(): { size: number; oldestEntry: number; newestEntry: number; persistentStats: any } {
    let oldest = Date.now();
    let newest = 0;

    for (const cached of this.cache.values()) {
      if (cached.timestamp < oldest) oldest = cached.timestamp;
      if (cached.timestamp > newest) newest = cached.timestamp;
    }

    return {
      size: this.cache.size,
      oldestEntry: oldest,
      newestEntry: newest,
      persistentStats: persistentCacheService.getStatistics()
    };
  }

  /**
   * Estimate API call count based on result size
   */
  private getApiCallCount(resultCount: number): number {
    // Estimate based on our expansion algorithm
    if (resultCount <= 50) return 1;
    if (resultCount <= 100) return 2;
    if (resultCount <= 150) return 3;
    return Math.ceil(resultCount / 50);
  }
}

// Export singleton instance
export const musicSimilarityService = new MusicSimilarityServiceImpl();
export default musicSimilarityService;
