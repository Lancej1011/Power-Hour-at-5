/**
 * Persistent Cache Service
 * Comprehensive caching system for Last.fm results with intelligent expiration
 */

import { SimilarArtist } from '../types/powerHour';

export interface CachedArtistData {
  artist: string;
  similarArtists: SimilarArtist[];
  metadata: {
    timestamp: number;
    expiresAt: number;
    popularity: 'high' | 'medium' | 'low';
    lastAccessed: number;
    accessCount: number;
    source: 'lastfm' | 'curated' | 'ai' | 'fallback';
    apiCallCount: number;
  };
  genres: string[];
  tags: string[];
  playcount: number;
}

export interface CacheStatistics {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  popularArtists: string[];
  recentlyAccessed: string[];
  expiringEntries: number;
}

export interface CacheConfig {
  maxEntries: number;
  popularArtistTTL: number; // 30 days
  mediumArtistTTL: number;  // 14 days
  obscureArtistTTL: number; // 7 days
  cleanupInterval: number;  // 1 hour
  backupInterval: number;   // 24 hours
}

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 10000,
  popularArtistTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  mediumArtistTTL: 14 * 24 * 60 * 60 * 1000,  // 14 days
  obscureArtistTTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
  cleanupInterval: 60 * 60 * 1000,             // 1 hour
  backupInterval: 24 * 60 * 60 * 1000          // 24 hours
};

class PersistentCacheService {
  private cache = new Map<string, CachedArtistData>();
  private statistics: CacheStatistics;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;
  private readonly STORAGE_KEY = 'power_hour_artist_cache';
  private readonly STATS_KEY = 'power_hour_cache_stats';
  private readonly BACKUP_KEY = 'power_hour_cache_backup';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.initializeStatistics();
    this.loadCache();
    this.startCleanupTimer();
    this.startBackupTimer();
  }

  /**
   * Get cached artist data with intelligent expiration
   */
  get(artist: string): CachedArtistData | null {
    const normalized = this.normalizeArtistName(artist);
    const cached = this.cache.get(normalized);

    if (!cached) {
      this.statistics.missCount++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > cached.metadata.expiresAt) {
      console.log(`🕐 Cache expired for ${artist}, removing entry`);
      this.cache.delete(normalized);
      this.statistics.missCount++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    cached.metadata.lastAccessed = Date.now();
    cached.metadata.accessCount++;
    this.statistics.hitCount++;
    this.updateHitRate();

    console.log(`💾 Cache hit for ${artist} (accessed ${cached.metadata.accessCount} times)`);
    return cached;
  }

  /**
   * Store artist data with intelligent expiration
   */
  set(artist: string, similarArtists: SimilarArtist[], metadata: Partial<CachedArtistData['metadata']> = {}): void {
    const normalized = this.normalizeArtistName(artist);
    const now = Date.now();
    
    // Determine popularity and TTL
    const popularity = this.determinePopularity(similarArtists, metadata.accessCount || 0);
    const ttl = this.getTTLForPopularity(popularity);

    const cachedData: CachedArtistData = {
      artist: normalized,
      similarArtists,
      metadata: {
        timestamp: now,
        expiresAt: now + ttl,
        popularity,
        lastAccessed: now,
        accessCount: 1,
        source: metadata.source || 'lastfm',
        apiCallCount: metadata.apiCallCount || 1,
        ...metadata
      },
      genres: this.extractGenres(similarArtists),
      tags: this.extractTags(similarArtists),
      playcount: metadata.apiCallCount || 0
    };

    this.cache.set(normalized, cachedData);
    this.statistics.totalEntries = this.cache.size;
    
    console.log(`💾 Cached ${similarArtists.length} similar artists for ${artist} (${popularity} popularity, expires in ${Math.round(ttl / (24 * 60 * 60 * 1000))} days)`);

    // Cleanup if cache is too large
    if (this.cache.size > this.config.maxEntries) {
      this.performCleanup();
    }

    this.saveCache();
  }

  /**
   * Check if artist is cached and not expired
   */
  has(artist: string): boolean {
    return this.get(artist) !== null;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.statistics = this.initializeStatistics();
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STATS_KEY);
    console.log(`🗑️ Cleared all cached artist data`);
  }

  /**
   * Export cache data for backup
   */
  exportCache(): string {
    const exportData = {
      cache: Object.fromEntries(this.cache.entries()),
      statistics: this.statistics,
      timestamp: Date.now(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache data from backup
   */
  importCache(data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.cache || !importData.statistics) {
        throw new Error('Invalid cache data format');
      }

      this.cache = new Map(Object.entries(importData.cache));
      this.statistics = { ...this.statistics, ...importData.statistics };
      this.saveCache();
      
      console.log(`📥 Imported ${this.cache.size} cached entries`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to import cache data:`, error);
      return false;
    }
  }

  /**
   * Get cache entries that are about to expire
   */
  getExpiringEntries(withinHours: number = 24): CachedArtistData[] {
    const threshold = Date.now() + (withinHours * 60 * 60 * 1000);
    return Array.from(this.cache.values())
      .filter(entry => entry.metadata.expiresAt <= threshold)
      .sort((a, b) => a.metadata.expiresAt - b.metadata.expiresAt);
  }

  /**
   * Refresh expiring entries by making new API calls
   */
  async refreshExpiringEntries(): Promise<void> {
    const expiring = this.getExpiringEntries(48); // 48 hours
    console.log(`🔄 Found ${expiring.length} entries expiring soon`);
    
    // This would trigger background refresh - implementation depends on your API service
    // For now, just log the artists that need refreshing
    expiring.forEach(entry => {
      console.log(`⏰ ${entry.artist} expires in ${Math.round((entry.metadata.expiresAt - Date.now()) / (60 * 60 * 1000))} hours`);
    });
  }

  /**
   * Get most popular cached artists
   */
  getPopularArtists(limit: number = 10): string[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, limit)
      .map(entry => entry.artist);
  }

  /**
   * Get recently accessed artists
   */
  getRecentlyAccessed(limit: number = 10): string[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.metadata.lastAccessed - a.metadata.lastAccessed)
      .slice(0, limit)
      .map(entry => entry.artist);
  }

  // Private methods
  private normalizeArtistName(artist: string): string {
    return artist.trim().toLowerCase();
  }

  private determinePopularity(similarArtists: SimilarArtist[], accessCount: number): 'high' | 'medium' | 'low' {
    const avgSimilarity = similarArtists.reduce((sum, artist) => sum + artist.similarity, 0) / similarArtists.length;
    
    if (accessCount > 10 || avgSimilarity > 0.8 || similarArtists.length > 40) {
      return 'high';
    } else if (accessCount > 3 || avgSimilarity > 0.6 || similarArtists.length > 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getTTLForPopularity(popularity: 'high' | 'medium' | 'low'): number {
    switch (popularity) {
      case 'high': return this.config.popularArtistTTL;
      case 'medium': return this.config.mediumArtistTTL;
      case 'low': return this.config.obscureArtistTTL;
    }
  }

  private extractGenres(similarArtists: SimilarArtist[]): string[] {
    const genres = new Set<string>();
    similarArtists.forEach(artist => {
      artist.genres?.forEach(genre => genres.add(genre));
    });
    return Array.from(genres);
  }

  private extractTags(similarArtists: SimilarArtist[]): string[] {
    const tags = new Set<string>();
    similarArtists.forEach(artist => {
      artist.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  private initializeStatistics(): CacheStatistics {
    const stored = localStorage.getItem(this.STATS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to load cache statistics:', error);
      }
    }

    return {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      totalSize: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
      popularArtists: [],
      recentlyAccessed: [],
      expiringEntries: 0
    };
  }

  private updateHitRate(): void {
    const total = this.statistics.hitCount + this.statistics.missCount;
    this.statistics.hitRate = total > 0 ? (this.statistics.hitCount / total) * 100 : 0;
  }

  private updateStatistics(): void {
    this.statistics.totalEntries = this.cache.size;
    this.statistics.popularArtists = this.getPopularArtists(5);
    this.statistics.recentlyAccessed = this.getRecentlyAccessed(5);
    this.statistics.expiringEntries = this.getExpiringEntries(24).length;
    
    if (this.cache.size > 0) {
      const timestamps = Array.from(this.cache.values()).map(entry => entry.metadata.timestamp);
      this.statistics.oldestEntry = Math.min(...timestamps);
      this.statistics.newestEntry = Math.max(...timestamps);
    }

    // Calculate total size (approximate)
    this.statistics.totalSize = JSON.stringify(Object.fromEntries(this.cache.entries())).length;
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
        console.log(`📥 Loaded ${this.cache.size} cached artist entries`);
        
        // Clean expired entries on load
        this.performCleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache:', error);
      this.cache = new Map();
    }
  }

  private saveCache(): void {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.statistics));
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  }

  private performCleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (now > value.metadata.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    // If still too large, remove least recently accessed entries
    if (this.cache.size > this.config.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.metadata.lastAccessed - b.metadata.lastAccessed);
      
      const toRemove = this.cache.size - this.config.maxEntries;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} cache entries`);
      this.saveCache();
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private startBackupTimer(): void {
    this.backupTimer = setInterval(() => {
      const backup = this.exportCache();
      localStorage.setItem(this.BACKUP_KEY, backup);
      console.log(`💾 Created automatic cache backup`);
    }, this.config.backupInterval);
  }

  /**
   * Cleanup timers when service is destroyed
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
  }
}

// Export singleton instance
export const persistentCacheService = new PersistentCacheService();
