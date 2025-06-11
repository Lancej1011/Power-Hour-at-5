/**
 * Playlist Review Service
 * Handles clip regeneration and editing operations for playlist review interface
 */

import { smartSongSelector, SongSelectionConfig } from './smartSongSelector';
import { multiTierMusicDiscovery } from './multiTierMusicDiscovery';
import { persistentCacheService } from './persistentCacheService';

export interface ClipRegenerationOptions {
  artist: string;
  preferredDuration?: number;
  excludeCurrentSong?: string;
  maxAlternatives?: number;
}

export interface RegeneratedClipResult {
  artist: string;
  song: {
    title: string;
    url: string;
    duration?: number;
    source: string;
  };
  artistSimilarity: number;
  selectionMethod: 'cached' | 'api' | 'fallback';
  clipDuration: number;
  alternatives?: RegeneratedClipResult[];
}

class PlaylistReviewService {
  constructor() {
    // Use the singleton instance of smartSongSelector
    // No need to create a new instance
  }

  /**
   * Regenerate a single clip with a different song by the same or different artist
   */
  async regenerateClip(
    originalClip: any,
    options: ClipRegenerationOptions
  ): Promise<RegeneratedClipResult> {
    console.log(`🔄 Regenerating clip for artist: ${options.artist}`);

    try {
      // Create a similar artist object for the song selector
      const artistInfo = {
        name: options.artist,
        similarity: 1.0, // Full similarity since this is the target artist
        genres: [],
        popularity: 0.5
      };

      // Configure song selection to exclude current song if specified
      const selectionConfig: Partial<SongSelectionConfig> = {
        preferredDuration: options.preferredDuration || 60,
        durationTolerance: 30,
        albumDiversityEnabled: true,
        yearDiversityEnabled: true
      };

      // Select a new song for the artist using the singleton instance
      const songResult = await smartSongSelector.selectSongForArtist(
        artistInfo,
        selectionConfig
      );

      if (!songResult || !songResult.selectedSong) {
        throw new Error(`No songs found for artist: ${options.artist}`);
      }

      // Determine selection method
      let selectionMethod: 'cached' | 'api' | 'fallback' = 'api';
      if (persistentCacheService.has(options.artist)) {
        selectionMethod = 'cached';
      } else if (songResult.selectionMethod === 'fallback') {
        selectionMethod = 'fallback';
      }

      const regeneratedClip: RegeneratedClipResult = {
        artist: options.artist,
        song: {
          title: songResult.selectedSong.title,
          url: songResult.selectedSong.url || `https://youtube.com/results?search_query=${encodeURIComponent(`${options.artist} ${songResult.selectedSong.title}`)}`,
          duration: songResult.selectedSong.duration,
          source: songResult.selectedSong.source
        },
        artistSimilarity: artistInfo.similarity,
        selectionMethod,
        clipDuration: options.preferredDuration || 60,
        alternatives: []
      };

      // Add alternatives if available
      if (songResult.alternativeSongs && songResult.alternativeSongs.length > 0) {
        const maxAlternatives = Math.min(
          options.maxAlternatives || 3,
          songResult.alternativeSongs.length
        );

        regeneratedClip.alternatives = songResult.alternativeSongs
          .slice(0, maxAlternatives)
          .map(altSong => ({
            artist: options.artist,
            song: {
              title: altSong.title,
              url: altSong.url || `https://youtube.com/results?search_query=${encodeURIComponent(`${options.artist} ${altSong.title}`)}`,
              duration: altSong.duration,
              source: altSong.source
            },
            artistSimilarity: artistInfo.similarity,
            selectionMethod,
            clipDuration: options.preferredDuration || 60
          }));
      }

      console.log(`✅ Successfully regenerated clip: "${regeneratedClip.song.title}" by ${options.artist}`);
      return regeneratedClip;

    } catch (error) {
      console.error(`❌ Error regenerating clip for ${options.artist}:`, error);
      
      // Return a fallback result
      return this.createFallbackClip(options.artist, options.preferredDuration || 60);
    }
  }

  /**
   * Find similar artists and generate alternative clips
   */
  async findAlternativeArtists(
    originalArtist: string,
    maxAlternatives: number = 5
  ): Promise<string[]> {
    try {
      console.log(`🔍 Finding alternative artists similar to: ${originalArtist}`);

      const similarArtists = await multiTierMusicDiscovery.getSimilarArtists(originalArtist);
      
      if (similarArtists.length === 0) {
        console.log(`⚠️ No similar artists found for ${originalArtist}`);
        return [];
      }

      const alternatives = similarArtists
        .slice(0, maxAlternatives)
        .map(artist => artist.name);

      console.log(`✅ Found ${alternatives.length} alternative artists:`, alternatives);
      return alternatives;

    } catch (error) {
      console.error(`❌ Error finding alternatives for ${originalArtist}:`, error);
      return [];
    }
  }

  /**
   * Batch regenerate multiple clips
   */
  async regenerateMultipleClips(
    clips: any[],
    indices: number[],
    progressCallback?: (progress: { current: number; total: number; artist: string }) => void
  ): Promise<{ [index: number]: RegeneratedClipResult }> {
    const results: { [index: number]: RegeneratedClipResult } = {};
    
    console.log(`🔄 Batch regenerating ${indices.length} clips`);

    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const clip = clips[index];
      
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: indices.length,
          artist: clip.artist
        });
      }

      try {
        const regenerated = await this.regenerateClip(clip, {
          artist: clip.artist,
          preferredDuration: clip.clipDuration,
          excludeCurrentSong: clip.song?.title
        });

        results[index] = regenerated;
        
        // Small delay to prevent overwhelming the services
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to regenerate clip at index ${index}:`, error);
        // Continue with other clips even if one fails
      }
    }

    console.log(`✅ Batch regeneration complete. ${Object.keys(results).length}/${indices.length} successful`);
    return results;
  }

  /**
   * Analyze playlist quality and provide recommendations
   */
  analyzePlaylistQuality(tracks: any[]): {
    overallScore: number;
    issues: string[];
    recommendations: string[];
    artistDistribution: { [artist: string]: number };
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const artistDistribution: { [artist: string]: number } = {};

    // Count artist occurrences
    tracks.forEach(track => {
      artistDistribution[track.artist] = (artistDistribution[track.artist] || 0) + 1;
    });

    // Check for over-representation of artists
    const maxOccurrences = Math.max(...Object.values(artistDistribution));
    if (maxOccurrences > 3) {
      const overRepresentedArtists = Object.keys(artistDistribution)
        .filter(artist => artistDistribution[artist] > 3);
      
      issues.push(`Artists over-represented: ${overRepresentedArtists.join(', ')}`);
      recommendations.push('Consider regenerating some clips to improve artist diversity');
    }

    // Check similarity scores
    const lowSimilarityTracks = tracks.filter(track => track.artistSimilarity < 0.3);
    if (lowSimilarityTracks.length > 0) {
      issues.push(`${lowSimilarityTracks.length} tracks have low similarity scores`);
      recommendations.push('Regenerate tracks with low similarity for better quality');
    }

    // Check for fallback tracks
    const fallbackTracks = tracks.filter(track => track.selectionMethod === 'fallback');
    if (fallbackTracks.length > tracks.length * 0.3) {
      issues.push(`${fallbackTracks.length} tracks used fallback selection`);
      recommendations.push('Consider adjusting generation settings for better results');
    }

    // Calculate overall score
    const diversityScore = Object.keys(artistDistribution).length / tracks.length;
    const avgSimilarity = tracks.reduce((sum, track) => sum + track.artistSimilarity, 0) / tracks.length;
    const fallbackPenalty = fallbackTracks.length / tracks.length * 0.3;
    
    const overallScore = Math.max(0, Math.min(1, 
      (diversityScore * 0.4) + (avgSimilarity * 0.4) + (0.2 - fallbackPenalty)
    ));

    return {
      overallScore,
      issues,
      recommendations,
      artistDistribution
    };
  }

  /**
   * Create a fallback clip when regeneration fails
   */
  private createFallbackClip(artist: string, duration: number): RegeneratedClipResult {
    return {
      artist,
      song: {
        title: `Popular Song by ${artist}`,
        url: `https://youtube.com/results?search_query=${encodeURIComponent(artist + ' popular songs')}`,
        source: 'fallback'
      },
      artistSimilarity: 0.1,
      selectionMethod: 'fallback',
      clipDuration: duration,
      alternatives: []
    };
  }
}

// Export singleton instance
export const playlistReviewService = new PlaylistReviewService();
