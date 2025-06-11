/**
 * Smart Song Selection Service
 * Random song selection with diversity controls and fallback logic
 */

import { SimilarArtist } from '../types/powerHour';
import { searchYouTubeEnhanced } from '../utils/youtubeUtils';
import { YouTubeVideo } from '../types/youtube';
import { isYtDlpAvailable } from '../services/ytDlpService';
import { artistDisambiguationService } from './artistDisambiguationService';

export interface SongCandidate {
  title: string;
  artist: string;
  duration: number;
  url: string;
  album?: string;
  year?: number;
  popularity?: number;
  source: 'search' | 'popular' | 'fallback';
}

export interface SongSelectionConfig {
  preferredDuration: number; // Target duration in seconds (60 for power hour)
  durationTolerance: number; // ±30 seconds tolerance
  maxSearchResults: number;  // Max songs to discover per artist
  albumDiversityEnabled: boolean;
  yearDiversityEnabled: boolean;
  maxSameAlbum: number;
  maxSameYear: number;
  fallbackToPopular: boolean;
  randomnessWeight: number; // 0-1, higher = more random vs popular

  // Enhanced filtering options
  enableContentFiltering: boolean; // Enable non-music content filtering
  enableDuplicateDetection: boolean; // Enable fuzzy duplicate detection
  duplicateSimilarityThreshold: number; // 0-1, threshold for fuzzy matching
  minVideoDuration: number; // Minimum video duration in seconds (filter YouTube Shorts)
  strictMusicContentOnly: boolean; // Only allow music-related content
}

export interface SongSelectionResult {
  selectedSong: SongCandidate;
  alternativeSongs: SongCandidate[];
  selectionMethod: 'random' | 'popular' | 'fallback';
  searchStats: {
    totalFound: number;
    durationMatches: number;
    albumDiversity: number;
    yearDiversity: number;
    contentFiltered: number; // Number of videos filtered for non-music content
    duplicatesFiltered: number; // Number of duplicates filtered
    shortsFiltered: number; // Number of YouTube Shorts filtered
  };
}

export interface PlaylistDiversityState {
  selectedAlbums: Map<string, number>;
  selectedYears: Map<number, number>;
  selectedSongs: Set<string>;
  selectedSongTitles: Set<string>; // For fuzzy duplicate detection
}

const DEFAULT_CONFIG: SongSelectionConfig = {
  preferredDuration: 60, // 1 minute for power hour
  durationTolerance: 30, // ±30 seconds
  maxSearchResults: 20,
  albumDiversityEnabled: true,
  yearDiversityEnabled: true,
  maxSameAlbum: 3,
  maxSameYear: 8,
  fallbackToPopular: true,
  randomnessWeight: 0.7,

  // Enhanced filtering defaults
  enableContentFiltering: true,
  enableDuplicateDetection: true,
  duplicateSimilarityThreshold: 0.8, // 80% similarity threshold
  minVideoDuration: 60, // Filter videos under 60 seconds (YouTube Shorts)
  strictMusicContentOnly: true
};

// Popular songs fallback database with realistic titles
const POPULAR_SONGS_FALLBACK: Record<string, string[]> = {
  'taylor swift': [
    'Shake It Off', 'Love Story', 'You Belong With Me', 'Anti-Hero', 'Blank Space',
    'Bad Blood', 'Look What You Made Me Do', 'We Are Never Ever Getting Back Together'
  ],
  'drake': [
    'God\'s Plan', 'In My Feelings', 'Hotline Bling', 'One Dance', 'Started From the Bottom',
    'Take Care', 'Nice For What', 'Passionfruit'
  ],
  'the beatles': [
    'Hey Jude', 'Let It Be', 'Yesterday', 'Come Together', 'Here Comes the Sun',
    'Help!', 'A Hard Day\'s Night', 'Twist and Shout'
  ],
  'led zeppelin': [
    'Stairway to Heaven', 'Black Dog', 'Rock and Roll', 'Kashmir', 'Whole Lotta Love',
    'Immigrant Song', 'Good Times Bad Times', 'Ramble On'
  ],
  'queen': [
    'Bohemian Rhapsody', 'We Will Rock You', 'We Are the Champions', 'Another One Bites the Dust',
    'Somebody to Love', 'Don\'t Stop Me Now', 'Under Pressure', 'Radio Ga Ga'
  ],
  'ariana grande': [
    'Thank U, Next', '7 rings', 'Problem', 'Side to Side', 'Dangerous Woman',
    'Break Free', 'No Tears Left to Cry', 'positions'
  ],
  'billie eilish': [
    'Bad Guy', 'Happier Than Ever', 'Therefore I Am', 'Lovely', 'When the Party\'s Over',
    'Ocean Eyes', 'Everything I Wanted', 'Your Power'
  ],
  'kendrick lamar': [
    'HUMBLE.', 'DNA.', 'Swimming Pools', 'Alright', 'King Kunta',
    'Money Trees', 'Bitch, Don\'t Kill My Vibe', 'i'
  ],
  'daft punk': [
    'Get Lucky', 'One More Time', 'Harder Better Faster Stronger', 'Around the World',
    'Digital Love', 'Something About Us', 'Instant Crush', 'Lose Yourself to Dance'
  ],
  'pink floyd': [
    'Another Brick in the Wall', 'Comfortably Numb', 'Wish You Were Here', 'Time',
    'Money', 'Shine On You Crazy Diamond', 'Us and Them', 'High Hopes'
  ],
  'default': [
    'Greatest Hits', 'Best Songs', 'Top Tracks', 'Popular Music', 'Hit Singles',
    'Essential Collection', 'Classic Songs', 'Fan Favorites'
  ]
};

class SmartSongSelector {
  private config: SongSelectionConfig;
  private diversityState: PlaylistDiversityState;

  constructor(config: Partial<SongSelectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.diversityState = {
      selectedAlbums: new Map(),
      selectedYears: new Map(),
      selectedSongs: new Set(),
      selectedSongTitles: new Set()
    };
  }

  /**
   * Select a song for an artist using smart randomization
   */
  async selectSongForArtist(
    artist: SimilarArtist, 
    config?: Partial<SongSelectionConfig>
  ): Promise<SongSelectionResult> {
    const finalConfig = { ...this.config, ...config };
    
    console.log(`🎵 Selecting song for: ${artist.name}`);

    try {
      // Step 1: Discover songs for the artist
      const candidates = await this.discoverSongsForArtist(artist, finalConfig);
      
      if (candidates.length === 0) {
        console.log(`⚠️ No songs found for ${artist.name}, using fallback`);
        return this.createFallbackResult(artist);
      }

      // Step 2: Filter by duration preferences
      const durationFiltered = this.filterByDuration(candidates, finalConfig);
      
      // Step 3: Apply diversity filters
      const diversityFiltered = this.applyDiversityFilters(
        durationFiltered.length > 0 ? durationFiltered : candidates,
        finalConfig
      );

      // Step 4: Fallback logic if filtering removed too many options
      let finalCandidates = diversityFiltered;
      let selectionMethod: 'random' | 'popular' | 'fallback' = 'random';

      if (finalCandidates.length === 0) {
        console.log(`⚠️ All candidates filtered out for ${artist.name}, using duration-filtered candidates`);
        finalCandidates = durationFiltered.length > 0 ? durationFiltered : candidates;
        selectionMethod = 'fallback';
      }

      if (finalCandidates.length === 0) {
        console.log(`⚠️ No candidates available for ${artist.name}, using fallback`);
        return this.createFallbackResult(artist);
      }

      // Step 5: Select using weighted randomization
      const selectedSong = this.selectWeightedRandom(finalCandidates, finalConfig);

      // Step 5: Update diversity state
      this.updateDiversityState(selectedSong);

      // Calculate comprehensive search statistics
      const searchStats = this.calculateSearchStats(
        candidates,
        durationFiltered,
        diversityFiltered
      );

      console.log(`✅ Selected "${selectedSong.title}" by ${artist.name} (${selectedSong.source})`);
      console.log(`📊 Search stats: ${searchStats.totalFound} found, ${searchStats.contentFiltered} content filtered, ${searchStats.duplicatesFiltered} duplicates filtered`);

      return {
        selectedSong,
        alternativeSongs: candidates.filter(song => song.title !== selectedSong.title).slice(0, 5),
        selectionMethod: selectionMethod === 'fallback' ? 'fallback' : (selectedSong.source === 'search' ? 'random' : selectedSong.source as any),
        searchStats
      };

    } catch (error) {
      console.error(`❌ Error selecting song for ${artist.name}:`, error);
      return this.createFallbackResult(artist);
    }
  }

  /**
   * Discover songs for an artist using real YouTube search
   */
  private async discoverSongsForArtist(
    artist: SimilarArtist,
    config: SongSelectionConfig
  ): Promise<SongCandidate[]> {
    const candidates: SongCandidate[] = [];

    // Check if yt-dlp is available
    const ytDlpAvailable = await isYtDlpAvailable().catch(() => false);

    if (!ytDlpAvailable) {
      console.log(`⚠️ yt-dlp not available for ${artist.name}, using realistic fallback candidates`);
      // Still use realistic fallback candidates, but make sure they're for the correct artist
      return this.createFallbackCandidates(artist.name, artist.name);
    }

    // Generate search queries for the artist
    const searchQueries = this.generateSearchQueries(artist);

    console.log(`🔍 Searching YouTube for ${artist.name} with ${searchQueries.length} queries`);

    for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries per artist to avoid rate limits
      try {
        // Create disambiguated YouTube query
        const disambiguatedQuery = artistDisambiguationService.getYouTubeQuery(
          artist.name,
          query.replace(artist.name, '').trim(), // Extract the song context part
          { genres: artist.genres }
        );

        console.log(`🎵 Searching: "${query}" → "${disambiguatedQuery}"`);

        // Use real YouTube search with yt-dlp
        const searchResult = await searchYouTubeEnhanced(disambiguatedQuery, null, {
          maxResults: Math.min(10, config.maxSearchResults), // Limit per query
          useYtDlp: true,
          videoDuration: 'short' // Prefer shorter videos for power hour clips
        });

        if (searchResult.videos && searchResult.videos.length > 0) {
          // Apply content filtering before converting to song candidates
          const filteredVideos = config.enableContentFiltering
            ? this.filterNonMusicContent(searchResult.videos, config)
            : searchResult.videos;

          const songCandidates = this.convertYouTubeVideosToSongCandidates(
            filteredVideos,
            artist.name
          );
          candidates.push(...songCandidates);

          console.log(`✅ Found ${songCandidates.length} songs from query: "${query}" (${searchResult.videos.length - filteredVideos.length} filtered)`);
        } else {
          console.log(`⚠️ No results for query: "${query}"`);
        }

        if (candidates.length >= config.maxSearchResults) {
          break;
        }

        // Small delay to avoid overwhelming the search service
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`❌ Search failed for query "${query}":`, error);

        // If yt-dlp is not available, create some realistic fallback candidates
        if (error.message && error.message.includes('yt-dlp')) {
          console.log(`🔄 yt-dlp not available, creating fallback candidates for ${artist.name}`);
          const fallbackCandidates = this.createFallbackCandidates(artist.name, query);
          candidates.push(...fallbackCandidates);
        }
        // Continue with next query
      }
    }

    // Remove duplicates with enhanced detection
    const uniqueCandidates = config.enableDuplicateDetection
      ? this.removeDuplicatesEnhanced(candidates, config)
      : this.removeDuplicates(candidates);

    console.log(`🔍 Found ${uniqueCandidates.length} unique song candidates for ${artist.name}`);
    return uniqueCandidates.slice(0, config.maxSearchResults);
  }

  /**
   * Convert YouTube videos to song candidates
   */
  private convertYouTubeVideosToSongCandidates(
    videos: YouTubeVideo[],
    artistName: string
  ): SongCandidate[] {
    return videos.map(video => {
      // Parse duration from YouTube format (PT1M30S) to seconds
      const duration = this.parseDuration(video.duration) || 180; // Default 3 minutes if parsing fails

      // Extract album info from description or title
      const album = this.extractAlbumInfo(video.title, video.description);

      // Extract year from publish date
      const year = video.publishedAt ? new Date(video.publishedAt).getFullYear() : undefined;

      // Calculate popularity score based on view count and likes
      const popularity = this.calculatePopularityScore(video);

      return {
        title: this.cleanSongTitle(video.title, artistName),
        artist: artistName,
        duration,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        album,
        year,
        popularity,
        source: 'search' as const
      };
    });
  }

  /**
   * Parse YouTube duration format (PT1M30S) to seconds
   */
  private parseDuration(duration: string): number {
    if (!duration) return 180; // Default 3 minutes

    // Handle PT format (PT1M30S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Handle simple formats like "3:45"
    const timeMatch = duration.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      return minutes * 60 + seconds;
    }

    return 180; // Default fallback
  }

  /**
   * Extract album information from title or description
   */
  private extractAlbumInfo(title: string, description?: string): string | undefined {
    // Look for common album indicators in title
    const albumPatterns = [
      /from the album[:\s]+"([^"]+)"/i,
      /\(from "([^"]+)"\)/i,
      /\[([^\]]+)\]/,
      /- ([^-]+)$/
    ];

    for (const pattern of albumPatterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Check description for album info
    if (description) {
      const descMatch = description.match(/album[:\s]+"([^"]+)"/i);
      if (descMatch && descMatch[1]) {
        return descMatch[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Calculate popularity score from video metrics
   */
  private calculatePopularityScore(video: YouTubeVideo): number {
    let score = 0.5; // Base score

    // Factor in view count (normalized)
    if (video.viewCount) {
      const views = parseInt(video.viewCount);
      if (views > 1000000) score += 0.3; // 1M+ views
      else if (views > 100000) score += 0.2; // 100K+ views
      else if (views > 10000) score += 0.1; // 10K+ views
    }

    // Factor in like count
    if (video.likeCount) {
      const likes = parseInt(video.likeCount);
      if (likes > 10000) score += 0.2;
      else if (likes > 1000) score += 0.1;
    }

    return Math.min(1.0, score); // Cap at 1.0
  }

  /**
   * Clean song title by removing artist name and common prefixes
   */
  private cleanSongTitle(title: string, artistName: string): string {
    let cleaned = title;

    // Remove artist name from title
    const artistRegex = new RegExp(`^${artistName}\\s*[-–—:]?\\s*`, 'i');
    cleaned = cleaned.replace(artistRegex, '');

    // Remove common prefixes
    cleaned = cleaned.replace(/^(official\s+)?(music\s+)?video\s*[-–—:]?\s*/i, '');
    cleaned = cleaned.replace(/^(lyrics?\s*)?[-–—:]?\s*/i, '');
    cleaned = cleaned.replace(/\s*\(official.*?\)$/i, '');
    cleaned = cleaned.replace(/\s*\[official.*?\]$/i, '');

    // Remove extra whitespace
    cleaned = cleaned.trim();

    return cleaned || title; // Fallback to original if cleaning removed everything
  }

  /**
   * Create fallback candidates when YouTube search fails
   */
  private createFallbackCandidates(artistName: string, query: string): SongCandidate[] {
    const normalizedArtist = artistName.toLowerCase();

    // Get realistic song titles for known artists, or use generic titles
    const songTitles = POPULAR_SONGS_FALLBACK[normalizedArtist] || POPULAR_SONGS_FALLBACK['default'];

    // Select 3-5 random songs from the list
    const selectedTitles = this.shuffleArray([...songTitles]).slice(0, Math.min(5, songTitles.length));

    console.log(`🎵 Creating ${selectedTitles.length} fallback songs for ${artistName}`);

    return selectedTitles.map((title, index) => ({
      title: title,
      artist: artistName,
      duration: 45 + Math.floor(Math.random() * 90), // 45-135 seconds
      url: `https://youtube.com/results?search_query=${encodeURIComponent(`${artistName} ${title}`)}`,
      album: undefined,
      year: undefined,
      popularity: 0.6 + (Math.random() * 0.3), // 0.6-0.9 popularity for known songs
      source: 'fallback' as const
    }));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate search queries for an artist with music-focused terms
   */
  private generateSearchQueries(artist: SimilarArtist): string[] {
    const queries = [
      `${artist.name} official music video`, // Prioritize official content
      `${artist.name} songs`,
      `${artist.name} music`,
      artist.name // Basic artist search
    ];

    // Add genre-specific queries
    if (artist.genres && artist.genres.length > 0) {
      queries.push(`${artist.name} ${artist.genres[0]} music`);
    }

    // Add popular song queries with music focus
    queries.push(`${artist.name} hits official`);
    queries.push(`${artist.name} best songs music video`);
    queries.push(`${artist.name} live performance`);

    return queries;
  }

  /**
   * Filter out non-music content from YouTube videos
   */
  private filterNonMusicContent(videos: YouTubeVideo[], config: SongSelectionConfig): YouTubeVideo[] {
    const filtered = videos.filter(video => {
      const title = video.title.toLowerCase();
      const description = (video.description || '').toLowerCase();
      const duration = this.parseDuration(video.duration);

      // Filter YouTube Shorts (under minimum duration)
      if (duration < config.minVideoDuration) {
        console.log(`🚫 Filtered short video: "${video.title}" (${duration}s)`);
        return false;
      }

      // Content to EXCLUDE
      const excludePatterns = [
        // Reviews and reactions
        /\b(review|reaction|reacts?\s+to|breakdown|analysis|explained|commentary)\b/i,

        // Non-music content
        /\b(interview|behind\s+the\s+scenes|making\s+of|documentary|tutorial|how\s+to)\b/i,

        // Compilations and playlists (unless specifically music)
        /\b(compilation|playlist|mix)\b/i,

        // Gaming and other content
        /\b(gameplay|gaming|stream|podcast|vlog|blog)\b/i,

        // News and talk shows
        /\b(news|talk\s+show|discussion|debate)\b/i
      ];

      // Check if video should be excluded
      for (const pattern of excludePatterns) {
        if (pattern.test(title) || pattern.test(description)) {
          console.log(`🚫 Filtered non-music content: "${video.title}" (matched: ${pattern.source})`);
          return false;
        }
      }

      // Content to PRESERVE (override exclusions)
      const preservePatterns = [
        // Official music content
        /\b(official\s+(video|audio|music\s+video)|music\s+video)\b/i,

        // Live performances
        /\b(live|concert|performance|tour|festival)\b/i,

        // Cover versions
        /\b(cover|covers|acoustic\s+version|unplugged)\b/i,

        // Remixes and versions
        /\b(remix|extended|radio\s+edit|album\s+version|instrumental)\b/i,

        // Music-specific compilations
        /\b(greatest\s+hits|best\s+of|essential|anthology)\b/i
      ];

      // Check if video should be preserved
      for (const pattern of preservePatterns) {
        if (pattern.test(title) || pattern.test(description)) {
          console.log(`✅ Preserved music content: "${video.title}" (matched: ${pattern.source})`);
          return true;
        }
      }

      // If strict music content only is enabled, be more restrictive
      if (config.strictMusicContentOnly) {
        // Must contain music-related keywords
        const musicKeywords = /\b(song|music|audio|video|track|single|album|ep|lp)\b/i;
        if (!musicKeywords.test(title) && !musicKeywords.test(description)) {
          console.log(`🚫 Filtered non-music (strict mode): "${video.title}"`);
          return false;
        }
      }

      return true;
    });

    console.log(`🎵 Content filtering: ${videos.length} → ${filtered.length} videos (${videos.length - filtered.length} filtered)`);
    return filtered;
  }



  /**
   * Filter songs by duration preferences
   */
  private filterByDuration(candidates: SongCandidate[], config: SongSelectionConfig): SongCandidate[] {
    const minDuration = config.preferredDuration - config.durationTolerance;
    const maxDuration = config.preferredDuration + config.durationTolerance;

    return candidates.filter(song => 
      song.duration >= minDuration && song.duration <= maxDuration
    );
  }

  /**
   * Apply diversity filters to prevent too many songs from same album/year
   */
  private applyDiversityFilters(candidates: SongCandidate[], config: SongSelectionConfig): SongCandidate[] {
    return candidates.filter(song => {
      // Check album diversity
      if (config.albumDiversityEnabled && song.album) {
        const albumCount = this.diversityState.selectedAlbums.get(song.album) || 0;
        if (albumCount >= config.maxSameAlbum) {
          return false;
        }
      }

      // Check year diversity
      if (config.yearDiversityEnabled && song.year) {
        const yearCount = this.diversityState.selectedYears.get(song.year) || 0;
        if (yearCount >= config.maxSameYear) {
          return false;
        }
      }

      // Check for duplicate songs (basic check)
      const songKey = `${song.artist.toLowerCase()}-${song.title.toLowerCase()}`;
      if (this.diversityState.selectedSongs.has(songKey)) {
        return false;
      }

      // Enhanced duplicate detection if enabled
      if (config.enableDuplicateDetection) {
        const normalizedTitle = this.normalizeSongTitle(song.title);
        for (const selectedTitle of this.diversityState.selectedSongTitles) {
          const similarity = this.calculateStringSimilarity(normalizedTitle, selectedTitle);
          if (similarity >= config.duplicateSimilarityThreshold) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Select song using weighted randomization
   */
  private selectWeightedRandom(candidates: SongCandidate[], config: SongSelectionConfig): SongCandidate {
    if (candidates.length === 0) {
      throw new Error('No candidates available for selection');
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Calculate weights based on popularity, content priority, and randomness preference
    const weights = candidates.map(song => {
      const popularityWeight = (song.popularity || 0.5) * (1 - config.randomnessWeight);
      const randomWeight = Math.random() * config.randomnessWeight;

      // Bonus for duration match
      const durationDiff = Math.abs(song.duration - config.preferredDuration);
      const durationBonus = Math.max(0, 1 - (durationDiff / config.durationTolerance)) * 0.2;

      // Content priority bonus (0.0 to 0.5 bonus based on content type)
      const contentPriority = this.calculateContentPriority(song);
      const contentBonus = (contentPriority / 5) * 0.5; // Scale to 0-0.5 range

      return popularityWeight + randomWeight + durationBonus + contentBonus;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (let i = 0; i < candidates.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return candidates[i];
      }
    }

    // Fallback to last candidate
    return candidates[candidates.length - 1];
  }

  /**
   * Calculate content priority based on music content type
   */
  private calculateContentPriority(song: SongCandidate): number {
    const title = song.title.toLowerCase();

    // Priority 5: Official music videos and audio (highest priority)
    if (/\b(official\s+(video|audio|music\s+video)|music\s+video)\b/i.test(title)) {
      return 5;
    }

    // Priority 4: Live performances and concerts
    if (/\b(live|concert|performance|tour|festival)\b/i.test(title)) {
      return 4;
    }

    // Priority 3: Cover versions and acoustic performances
    if (/\b(cover|covers|acoustic\s+version|unplugged)\b/i.test(title)) {
      return 3;
    }

    // Priority 2: Remixes and alternative versions
    if (/\b(remix|extended|radio\s+edit|album\s+version|instrumental)\b/i.test(title)) {
      return 2;
    }

    // Priority 1: Other music content (default)
    return 1;
  }

  /**
   * Update diversity state after selecting a song
   */
  private updateDiversityState(song: SongCandidate): void {
    // Update album count
    if (song.album) {
      const currentCount = this.diversityState.selectedAlbums.get(song.album) || 0;
      this.diversityState.selectedAlbums.set(song.album, currentCount + 1);
    }

    // Update year count
    if (song.year) {
      const currentCount = this.diversityState.selectedYears.get(song.year) || 0;
      this.diversityState.selectedYears.set(song.year, currentCount + 1);
    }

    // Add to selected songs
    const songKey = `${song.artist.toLowerCase()}-${song.title.toLowerCase()}`;
    this.diversityState.selectedSongs.add(songKey);

    // Add normalized title for enhanced duplicate detection
    const normalizedTitle = this.normalizeSongTitle(song.title);
    this.diversityState.selectedSongTitles.add(normalizedTitle);
  }

  /**
   * Remove duplicate songs from candidates (basic method)
   */
  private removeDuplicates(candidates: SongCandidate[]): SongCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(song => {
      const key = `${song.artist.toLowerCase()}-${song.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Enhanced duplicate detection with fuzzy matching
   */
  private removeDuplicatesEnhanced(candidates: SongCandidate[], config: SongSelectionConfig): SongCandidate[] {
    const filtered: SongCandidate[] = [];
    const processedTitles: string[] = [];

    for (const candidate of candidates) {
      const normalizedTitle = this.normalizeSongTitle(candidate.title);
      let isDuplicate = false;

      // Check against already processed titles
      for (const existingTitle of processedTitles) {
        const similarity = this.calculateStringSimilarity(normalizedTitle, existingTitle);
        if (similarity >= config.duplicateSimilarityThreshold) {
          console.log(`🚫 Filtered duplicate: "${candidate.title}" (${(similarity * 100).toFixed(1)}% similar to existing)`);
          isDuplicate = true;
          break;
        }
      }

      // Check against playlist-wide selected songs
      for (const selectedTitle of this.diversityState.selectedSongTitles) {
        const similarity = this.calculateStringSimilarity(normalizedTitle, selectedTitle);
        if (similarity >= config.duplicateSimilarityThreshold) {
          console.log(`🚫 Filtered playlist duplicate: "${candidate.title}" (${(similarity * 100).toFixed(1)}% similar to playlist song)`);
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        filtered.push(candidate);
        processedTitles.push(normalizedTitle);
      }
    }

    console.log(`🔍 Enhanced duplicate filtering: ${candidates.length} → ${filtered.length} songs (${candidates.length - filtered.length} duplicates removed)`);
    return filtered;
  }

  /**
   * Normalize song title for comparison
   */
  private normalizeSongTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
      .replace(/\s*\[.*?\]\s*/g, '') // Remove brackets content
      .replace(/\s*-\s*(official|music|video|audio|lyric|lyrics).*$/i, '') // Remove common suffixes
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - (distance / maxLen);
  }

  /**
   * Calculate search statistics with enhanced filtering metrics
   */
  private calculateSearchStats(
    allCandidates: SongCandidate[],
    durationFiltered: SongCandidate[],
    diversityFiltered: SongCandidate[],
    originalVideoCount?: number,
    contentFilteredCount?: number,
    duplicatesFilteredCount?: number
  ): SongSelectionResult['searchStats'] {
    const albums = new Set(allCandidates.map(s => s.album).filter(Boolean));
    const years = new Set(allCandidates.map(s => s.year).filter(Boolean));

    return {
      totalFound: allCandidates.length,
      durationMatches: durationFiltered.length,
      albumDiversity: albums.size,
      yearDiversity: years.size,
      contentFiltered: contentFilteredCount || 0,
      duplicatesFiltered: duplicatesFilteredCount || 0,
      shortsFiltered: originalVideoCount ? originalVideoCount - allCandidates.length : 0
    };
  }

  /**
   * Create fallback result when no songs are found
   */
  private createFallbackResult(artist: SimilarArtist): SongSelectionResult {
    // Create a more realistic fallback that would actually search YouTube
    const fallbackSong: SongCandidate = {
      title: `${artist.name} - Best Songs`,
      artist: artist.name,
      duration: 60,
      url: `https://youtube.com/results?search_query=${encodeURIComponent(artist.name + ' songs')}`,
      source: 'fallback'
    };

    console.log(`🔄 Using fallback search for ${artist.name}`);

    return {
      selectedSong: fallbackSong,
      alternativeSongs: [],
      selectionMethod: 'fallback',
      searchStats: {
        totalFound: 0,
        durationMatches: 0,
        albumDiversity: 0,
        yearDiversity: 0,
        contentFiltered: 0,
        duplicatesFiltered: 0,
        shortsFiltered: 0
      }
    };
  }

  /**
   * Reset diversity state for new playlist generation
   */
  resetDiversityState(): void {
    this.diversityState.selectedAlbums.clear();
    this.diversityState.selectedYears.clear();
    this.diversityState.selectedSongs.clear();
    this.diversityState.selectedSongTitles.clear();
  }

  /**
   * Get current diversity state for monitoring
   */
  getDiversityState() {
    return {
      albumCounts: Object.fromEntries(this.diversityState.selectedAlbums),
      yearCounts: Object.fromEntries(this.diversityState.selectedYears),
      selectedSongsCount: this.diversityState.selectedSongs.size
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SongSelectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const smartSongSelector = new SmartSongSelector();
