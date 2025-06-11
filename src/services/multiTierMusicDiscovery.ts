/**
 * Multi-Tier Music Discovery Service
 * Orchestrates multiple discovery methods for comprehensive similar artist finding
 */

import { SimilarArtist } from '../types/powerHour';
import { musicSimilarityService } from './musicSimilarityService';
import { backupMusicDiscovery } from './backupMusicDiscovery';
import { aiMusicDiscovery } from './aiMusicDiscovery';
import { enhancedMusicDiscovery } from './enhancedMusicDiscovery';

export interface DiscoveryResult {
  artist: string;
  totalFound: number;
  sources: {
    lastfm: number;
    curated: number;
    ai: number;
    fallback: number;
  };
  similarArtists: SimilarArtist[];
  method: 'lastfm' | 'curated' | 'ai' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

export interface DiscoveryConfig {
  maxResults: number;
  enableLastFm: boolean;
  enableCurated: boolean;
  enableAI: boolean;
  enableFallback: boolean;
  similarityThreshold: 'loose' | 'moderate' | 'strict';
  preferenceOrder: ('lastfm' | 'curated' | 'ai' | 'fallback')[];
}

const DEFAULT_CONFIG: DiscoveryConfig = {
  maxResults: 15,
  enableLastFm: true,
  enableCurated: true,
  enableAI: true,
  enableFallback: true,
  similarityThreshold: 'moderate',
  preferenceOrder: ['lastfm', 'curated', 'ai', 'fallback']
};

export class MultiTierMusicDiscoveryService {
  private discoveryStats = {
    totalRequests: 0,
    lastfmSuccess: 0,
    curatedSuccess: 0,
    aiSuccess: 0,
    fallbackUsed: 0
  };

  /**
   * Find similar artists using multi-tier discovery system
   */
  async findSimilarArtists(
    artist: string, 
    config: Partial<DiscoveryConfig> = {}
  ): Promise<DiscoveryResult> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    this.discoveryStats.totalRequests++;
    
    console.log(`🎯 Multi-tier discovery for: ${artist}`);
    console.log(`📋 Config:`, finalConfig);
    
    const result: DiscoveryResult = {
      artist,
      totalFound: 0,
      sources: { lastfm: 0, curated: 0, ai: 0, fallback: 0 },
      similarArtists: [],
      method: 'fallback',
      confidence: 'low'
    };

    // Try each discovery method in preference order
    for (const method of finalConfig.preferenceOrder) {
      // Map method names to correct config property names
      const enableKeyMap: Record<string, keyof DiscoveryConfig> = {
        'lastfm': 'enableLastFm',
        'curated': 'enableCurated',
        'ai': 'enableAI',
        'fallback': 'enableFallback'
      };

      const enableKey = enableKeyMap[method];
      if (!finalConfig[enableKey]) {
        console.log(`⏭️ Skipping ${method} discovery (disabled in config: ${enableKey}=${finalConfig[enableKey]})`);
        continue;
      }

      console.log(`🔍 Trying ${method} discovery...`);

      // Add specific debugging for Last.fm
      if (method === 'lastfm') {
        console.log(`🔧 Last.fm availability check: ${musicSimilarityService.isAvailable()}`);
        console.log(`🔑 API key configured: ${!!import.meta.env.VITE_LASTFM_API_KEY}`);
        console.log(`🔑 API key length: ${import.meta.env.VITE_LASTFM_API_KEY?.length || 0}`);
      }
      
      try {
        let artists: SimilarArtist[] = [];
        
        switch (method) {
          case 'lastfm':
            artists = await this.tryLastFmDiscovery(artist, finalConfig);
            result.sources.lastfm = artists.length;
            if (artists.length > 0) this.discoveryStats.lastfmSuccess++;
            break;
            
          case 'curated':
            artists = await this.tryCuratedDiscovery(artist, finalConfig);
            result.sources.curated = artists.length;
            if (artists.length > 0) this.discoveryStats.curatedSuccess++;
            break;
            
          case 'ai':
            artists = await this.tryAIDiscovery(artist, finalConfig);
            result.sources.ai = artists.length;
            if (artists.length > 0) this.discoveryStats.aiSuccess++;
            break;
            
          case 'fallback':
            artists = await this.tryFallbackDiscovery(artist, finalConfig);
            result.sources.fallback = artists.length;
            if (artists.length > 0) this.discoveryStats.fallbackUsed++;
            break;
        }
        
        if (artists.length > 0) {
          result.similarArtists = artists.slice(0, finalConfig.maxResults);
          result.totalFound = artists.length;
          result.method = method;
          result.confidence = this.calculateConfidence(method, artists.length);
          
          console.log(`✅ ${method} discovery successful: ${artists.length} artists found`);
          break;
        }
        
      } catch (error) {
        console.warn(`⚠️ ${method} discovery failed:`, error);
      }
    }
    
    // If no method succeeded, use intelligent fallback
    if (result.similarArtists.length === 0) {
      console.log(`🆘 All discovery methods failed, using intelligent fallback`);
      result.similarArtists = this.generateIntelligentFallback(artist, finalConfig.maxResults);
      result.sources.fallback = result.similarArtists.length;
      result.totalFound = result.similarArtists.length;
      result.method = 'fallback';
      result.confidence = 'low';
      this.discoveryStats.fallbackUsed++;
    }
    
    console.log(`🎵 Multi-tier discovery complete for ${artist}:`);
    console.log(`   Method: ${result.method}, Confidence: ${result.confidence}`);
    console.log(`   Found: ${result.totalFound} artists`);
    console.log(`   Sources: LastFM(${result.sources.lastfm}) Curated(${result.sources.curated}) AI(${result.sources.ai}) Fallback(${result.sources.fallback})`);
    
    return result;
  }

  /**
   * Try Last.fm discovery with enhanced error handling
   */
  private async tryLastFmDiscovery(artist: string, config: DiscoveryConfig): Promise<SimilarArtist[]> {
    console.log(`🔧 Last.fm discovery availability check:`);
    console.log(`   - musicSimilarityService.isAvailable(): ${musicSimilarityService.isAvailable()}`);
    console.log(`   - API key exists: ${!!import.meta.env.VITE_LASTFM_API_KEY}`);
    console.log(`   - API key length: ${import.meta.env.VITE_LASTFM_API_KEY?.length || 0}`);

    if (!musicSimilarityService.isAvailable()) {
      console.log(`⚠️ Last.fm not available - skipping Last.fm discovery`);
      return [];
    }

    try {
      console.log(`🎵 Requesting ${config.maxResults} artists from Last.fm for: ${artist}`);

      // Create context for disambiguation
      const context = {
        seedArtist: artist,
        // We could add more context here if available
      };

      const artists = await musicSimilarityService.getSimilarArtists(artist, config.maxResults, context);

      if (artists.length === 0) {
        console.log(`🔍 Last.fm returned no results for: ${artist}`);
        return [];
      }

      console.log(`🎯 Last.fm returned ${artists.length} artists for ${artist}:`);
      console.log(`📊 Similarity range: ${artists[0]?.similarity.toFixed(3)} → ${artists[artists.length - 1]?.similarity.toFixed(3)}`);
      console.log(`📋 Top 20 Last.fm results:`, artists.slice(0, 20).map(a => `${a.name} (${a.similarity.toFixed(3)})`));

      // Apply similarity threshold filtering
      const filtered = this.applySimilarityThreshold(artists, config.similarityThreshold);
      console.log(`📊 Last.fm: ${artists.length} total, ${filtered.length} after filtering (threshold: ${config.similarityThreshold})`);

      if (filtered.length > 0) {
        console.log(`✅ Last.fm discovery successful! Top 15 filtered results:`, filtered.slice(0, 15).map(a => `${a.name} (${a.similarity.toFixed(3)})`));

        // Validate we have enough artists for power hour generation
        if (config.maxResults >= 60 && filtered.length < 50) {
          console.log(`⚠️ Warning: Only ${filtered.length} artists found, may not be enough for 60-track power hour`);
        }
      } else {
        console.log(`⚠️ All Last.fm results filtered out by similarity threshold`);
      }

      return filtered;

    } catch (error) {
      console.error(`❌ Last.fm discovery error:`, error);
      return [];
    }
  }

  /**
   * Try curated database discovery
   */
  private async tryCuratedDiscovery(artist: string, config: DiscoveryConfig): Promise<SimilarArtist[]> {
    try {
      if (!backupMusicDiscovery.hasDataFor(artist)) {
        console.log(`🔍 No curated data for: ${artist}`);
        return [];
      }
      
      const artists = backupMusicDiscovery.getSimilarArtists(artist, config.maxResults);
      const filtered = this.applySimilarityThreshold(artists, config.similarityThreshold);
      
      console.log(`📊 Curated: ${artists.length} total, ${filtered.length} after filtering`);
      return filtered;
      
    } catch (error) {
      console.error(`❌ Curated discovery error:`, error);
      return [];
    }
  }

  /**
   * Try AI-powered discovery
   */
  private async tryAIDiscovery(artist: string, config: DiscoveryConfig): Promise<SimilarArtist[]> {
    try {
      const artists = await aiMusicDiscovery.findSimilarArtists(artist, config.maxResults);
      const filtered = this.applySimilarityThreshold(artists, config.similarityThreshold);
      
      console.log(`📊 AI: ${artists.length} total, ${filtered.length} after filtering`);
      return filtered;
      
    } catch (error) {
      console.error(`❌ AI discovery error:`, error);
      return [];
    }
  }

  /**
   * Try fallback discovery using genre-based searches
   */
  private async tryFallbackDiscovery(artist: string, config: DiscoveryConfig): Promise<SimilarArtist[]> {
    try {
      const fallbackArtists = this.generateIntelligentFallback(artist, config.maxResults);
      console.log(`📊 Fallback: ${fallbackArtists.length} artists generated`);
      return fallbackArtists;
      
    } catch (error) {
      console.error(`❌ Fallback discovery error:`, error);
      return [];
    }
  }

  /**
   * Apply similarity threshold filtering
   */
  private applySimilarityThreshold(artists: SimilarArtist[], threshold: 'loose' | 'moderate' | 'strict'): SimilarArtist[] {
    const thresholds = {
      loose: 0.1,      // Accept most Last.fm results (similarity ≥ 0.1)
      moderate: 0.2,   // Filter out low-confidence matches (similarity ≥ 0.2)
      strict: 0.4      // Only high-confidence matches (similarity ≥ 0.4)
    };

    const minSimilarity = thresholds[threshold];
    const filtered = artists.filter(artist => artist.similarity >= minSimilarity);

    console.log(`🔍 Similarity filtering: ${artists.length} → ${filtered.length} (threshold: ${threshold} ≥ ${minSimilarity})`);
    if (filtered.length < artists.length) {
      const filteredOut = artists.filter(a => a.similarity < minSimilarity);
      console.log(`📊 Filtered out ${filteredOut.length} artists below ${minSimilarity}: ${filteredOut.slice(0, 5).map(a => `${a.name} (${a.similarity.toFixed(3)})`).join(', ')}${filteredOut.length > 5 ? '...' : ''}`);
    }

    return filtered;
  }

  /**
   * Calculate confidence level based on discovery method and result count
   */
  private calculateConfidence(method: string, resultCount: number): 'high' | 'medium' | 'low' {
    if (method === 'lastfm' && resultCount >= 10) return 'high';
    if (method === 'curated' && resultCount >= 8) return 'high';
    if (method === 'ai' && resultCount >= 6) return 'medium';
    if (resultCount >= 5) return 'medium';
    return 'low';
  }

  /**
   * Generate intelligent fallback artists using enhanced discovery
   */
  private generateIntelligentFallback(artist: string, maxResults: number): SimilarArtist[] {
    console.log(`🎯 Generating intelligent fallback for: ${artist}`);

    // First try enhanced music discovery
    const enhancedResults = enhancedMusicDiscovery.findSimilarArtists(artist, maxResults);
    if (enhancedResults.length > 0) {
      console.log(`✅ Enhanced discovery found ${enhancedResults.length} artists`);
      return enhancedResults;
    }

    // Fallback to backup discovery
    const backupResults = backupMusicDiscovery.getSimilarArtists(artist, maxResults);
    if (backupResults.length > 0) {
      console.log(`✅ Backup discovery found ${backupResults.length} artists`);
      return backupResults;
    }

    // Final fallback - try to find similar artists from the backup database
    console.log(`⚠️ No results from enhanced or backup discovery for "${artist}"`);
    console.log(`🔍 Searching backup database for partial matches...`);

    const artistLower = artist.toLowerCase();
    const fallbackArtists: SimilarArtist[] = [];

    // Try to find artists in the backup database that might be similar
    const allBackupArtists = backupMusicDiscovery.getSupportedArtists();

    // Look for partial name matches or genre similarities
    const potentialMatches: Array<{artist: string, score: number}> = [];

    allBackupArtists.forEach(backupArtist => {
      const backupLower = backupArtist.toLowerCase();
      let score = 0;

      // Check for partial name matches
      if (backupLower.includes(artistLower) || artistLower.includes(backupLower)) {
        score += 0.8;
      }

      // Check for similar word patterns
      const artistWords = artistLower.split(/\s+/);
      const backupWords = backupLower.split(/\s+/);

      artistWords.forEach(word => {
        if (backupWords.some(bWord => bWord.includes(word) || word.includes(bWord))) {
          score += 0.3;
        }
      });

      if (score > 0) {
        potentialMatches.push({ artist: backupArtist, score });
      }
    });

    // Sort by score and get similar artists for the best matches
    potentialMatches.sort((a, b) => b.score - a.score);

    if (potentialMatches.length > 0) {
      console.log(`🎯 Found ${potentialMatches.length} potential matches in backup database`);

      // Get similar artists from the best matching backup artist
      const bestMatch = potentialMatches[0];
      console.log(`📍 Using "${bestMatch.artist}" as closest match (score: ${bestMatch.score.toFixed(2)})`);

      const similarFromBest = backupMusicDiscovery.getSimilarArtists(bestMatch.artist, maxResults);

      // Adjust similarity scores based on how good the match was
      const adjustmentFactor = Math.min(bestMatch.score, 0.8);

      similarFromBest.forEach((similar, index) => {
        fallbackArtists.push({
          ...similar,
          similarity: similar.similarity * adjustmentFactor,
          tags: [...(similar.tags || []), 'fallback', 'partial-match']
        });
      });

      console.log(`✅ Generated ${fallbackArtists.length} fallback artists based on "${bestMatch.artist}"`);
      return fallbackArtists;
    }

    // If no partial matches, return empty array instead of generic popular artists
    console.log(`❌ No suitable fallback artists found for "${artist}"`);
    console.log(`💡 Consider adding "${artist}" to the backup database or checking Last.fm connectivity`);

    return [];
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    return {
      ...this.discoveryStats,
      successRate: {
        lastfm: this.discoveryStats.totalRequests > 0 ? 
          (this.discoveryStats.lastfmSuccess / this.discoveryStats.totalRequests * 100).toFixed(1) + '%' : '0%',
        curated: this.discoveryStats.totalRequests > 0 ? 
          (this.discoveryStats.curatedSuccess / this.discoveryStats.totalRequests * 100).toFixed(1) + '%' : '0%',
        ai: this.discoveryStats.totalRequests > 0 ? 
          (this.discoveryStats.aiSuccess / this.discoveryStats.totalRequests * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.discoveryStats = {
      totalRequests: 0,
      lastfmSuccess: 0,
      curatedSuccess: 0,
      aiSuccess: 0,
      fallbackUsed: 0
    };
  }

  /**
   * Test discovery for an artist with detailed logging
   */
  async testDiscovery(artist: string): Promise<DiscoveryResult> {
    console.log(`🧪 Testing multi-tier discovery for: ${artist}`);
    console.log(`${'='.repeat(60)}`);

    const result = await this.findSimilarArtists(artist, {
      maxResults: 50, // Request 50 artists for testing
      enableLastFm: true,
      enableCurated: true,
      enableAI: true,
      enableFallback: true
    });

    console.log(`\n📊 DISCOVERY TEST RESULTS FOR ${artist.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Method Used: ${result.method}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Total Found: ${result.totalFound}`);
    console.log(`Sources: LastFM(${result.sources.lastfm}) Curated(${result.sources.curated}) AI(${result.sources.ai}) Fallback(${result.sources.fallback})`);

    if (result.similarArtists.length > 0) {
      console.log(`\nTop Similar Artists (showing 15 of ${result.similarArtists.length}):`);
      result.similarArtists.slice(0, 15).forEach((artist, i) => {
        console.log(`  ${i + 1}. ${artist.name} (${artist.similarity.toFixed(3)})`);
      });

      if (result.similarArtists.length > 15) {
        console.log(`  ... and ${result.similarArtists.length - 15} more artists`);
      }
    }

    console.log(`${'='.repeat(60)}`);
    return result;
  }
}

// Export singleton instance
export const multiTierMusicDiscovery = new MultiTierMusicDiscoveryService();
