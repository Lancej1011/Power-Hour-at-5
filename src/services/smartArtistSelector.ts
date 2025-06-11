/**
 * Smart Artist Selection Algorithm
 * Weighted random selection with diversity controls
 */

import { SimilarArtist } from '../types/powerHour';

export interface SelectionConfig {
  maxArtists: number;
  diversityWeight: number; // 0-1, higher = more diversity
  similarityWeight: number; // 0-1, higher = prefer similar artists
  genreDiversityEnabled: boolean;
  eraDiversityEnabled: boolean;
  maxSameGenre: number;
  maxSameEra: number;
  preventDuplicates: boolean;
}

export interface SelectionResult {
  selectedArtists: SimilarArtist[];
  selectionStats: {
    totalCandidates: number;
    genreDistribution: Record<string, number>;
    eraDistribution: Record<string, number>;
    averageSimilarity: number;
    diversityScore: number;
  };
  rejectedArtists: {
    artist: SimilarArtist;
    reason: string;
  }[];
}

export interface WeightedArtist extends SimilarArtist {
  weight: number;
  selectionProbability: number;
  diversityPenalty: number;
}

const DEFAULT_CONFIG: SelectionConfig = {
  maxArtists: 60,
  diversityWeight: 0.3,
  similarityWeight: 0.7,
  genreDiversityEnabled: true,
  eraDiversityEnabled: true,
  maxSameGenre: 8,
  maxSameEra: 10,
  preventDuplicates: true
};

// Era classification based on common music periods
const ERA_CLASSIFICATION: Record<string, string> = {
  'classic rock': '1960s-1980s',
  'new wave': '1980s',
  'grunge': '1990s',
  'britpop': '1990s',
  'nu metal': '2000s',
  'indie revival': '2000s',
  'edm boom': '2010s',
  'modern pop': '2010s-2020s',
  'contemporary': '2020s'
};

class SmartArtistSelector {
  private config: SelectionConfig;
  private selectedArtists: Set<string> = new Set();
  private genreCounts: Map<string, number> = new Map();
  private eraCounts: Map<string, number> = new Map();

  constructor(config: Partial<SelectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Select artists using weighted random selection with diversity controls
   */
  selectArtists(candidates: SimilarArtist[], config?: Partial<SelectionConfig>): SelectionResult {
    const finalConfig = { ...this.config, ...config };
    this.reset();

    console.log(`🎯 Smart artist selection: ${candidates.length} candidates → ${finalConfig.maxArtists} selected`);

    // Calculate weights for all candidates
    const weightedCandidates = this.calculateWeights(candidates, finalConfig);
    
    const selectedArtists: SimilarArtist[] = [];
    const rejectedArtists: { artist: SimilarArtist; reason: string }[] = [];

    // Selection loop
    while (selectedArtists.length < finalConfig.maxArtists && weightedCandidates.length > 0) {
      const selected = this.selectWeightedRandom(weightedCandidates);
      
      if (!selected) break;

      // Check diversity constraints
      const diversityCheck = this.checkDiversityConstraints(selected, finalConfig);
      
      if (diversityCheck.allowed) {
        selectedArtists.push(selected);
        this.updateSelectionState(selected);
        
        // Remove selected artist from candidates
        const index = weightedCandidates.findIndex(a => a.name === selected.name);
        if (index >= 0) {
          weightedCandidates.splice(index, 1);
        }

        // Recalculate weights for remaining candidates
        this.updateWeights(weightedCandidates, finalConfig);
        
      } else {
        rejectedArtists.push({
          artist: selected,
          reason: diversityCheck.reason
        });
        
        // Remove rejected artist from candidates
        const index = weightedCandidates.findIndex(a => a.name === selected.name);
        if (index >= 0) {
          weightedCandidates.splice(index, 1);
        }
      }
    }

    const selectionStats = this.calculateSelectionStats(selectedArtists, candidates.length);
    
    console.log(`✅ Selected ${selectedArtists.length} artists (diversity score: ${selectionStats.diversityScore.toFixed(2)})`);
    console.log(`📊 Genre distribution:`, selectionStats.genreDistribution);
    
    return {
      selectedArtists,
      selectionStats,
      rejectedArtists
    };
  }

  /**
   * Calculate selection weights for all candidates
   */
  private calculateWeights(candidates: SimilarArtist[], config: SelectionConfig): WeightedArtist[] {
    const maxSimilarity = Math.max(...candidates.map(a => a.similarity));
    const minSimilarity = Math.min(...candidates.map(a => a.similarity));
    const similarityRange = maxSimilarity - minSimilarity;

    return candidates.map(artist => {
      // Base weight from similarity score
      const normalizedSimilarity = similarityRange > 0 
        ? (artist.similarity - minSimilarity) / similarityRange 
        : 0.5;
      
      const similarityWeight = Math.pow(normalizedSimilarity, config.similarityWeight * 2);
      
      // Diversity bonus for underrepresented genres/eras
      const diversityBonus = this.calculateDiversityBonus(artist, config);
      
      // Combine weights
      const weight = (similarityWeight * config.similarityWeight) + 
                    (diversityBonus * config.diversityWeight);
      
      return {
        ...artist,
        weight,
        selectionProbability: 0, // Will be calculated during selection
        diversityPenalty: 0
      };
    });
  }

  /**
   * Calculate diversity bonus for underrepresented categories
   */
  private calculateDiversityBonus(artist: SimilarArtist, config: SelectionConfig): number {
    let bonus = 1.0;

    if (config.genreDiversityEnabled && artist.genres) {
      const primaryGenre = artist.genres[0];
      const genreCount = this.genreCounts.get(primaryGenre) || 0;
      
      // Bonus for underrepresented genres
      if (genreCount < config.maxSameGenre / 2) {
        bonus += 0.5;
      } else if (genreCount >= config.maxSameGenre) {
        bonus -= 0.8;
      }
    }

    if (config.eraDiversityEnabled) {
      const era = this.determineEra(artist);
      const eraCount = this.eraCounts.get(era) || 0;
      
      // Bonus for underrepresented eras
      if (eraCount < config.maxSameEra / 2) {
        bonus += 0.3;
      } else if (eraCount >= config.maxSameEra) {
        bonus -= 0.6;
      }
    }

    return Math.max(0.1, bonus); // Minimum bonus to ensure all artists have some chance
  }

  /**
   * Select artist using weighted random selection
   */
  private selectWeightedRandom(candidates: WeightedArtist[]): SimilarArtist | null {
    if (candidates.length === 0) return null;

    // Calculate selection probabilities
    const totalWeight = candidates.reduce((sum, artist) => sum + artist.weight, 0);
    
    if (totalWeight <= 0) {
      // Fallback to uniform random if all weights are zero
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    }

    candidates.forEach(artist => {
      artist.selectionProbability = artist.weight / totalWeight;
    });

    // Weighted random selection
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const artist of candidates) {
      cumulativeProbability += artist.selectionProbability;
      if (random <= cumulativeProbability) {
        return artist;
      }
    }

    // Fallback to last artist
    return candidates[candidates.length - 1];
  }

  /**
   * Check if artist selection meets diversity constraints
   */
  private checkDiversityConstraints(artist: SimilarArtist, config: SelectionConfig): { allowed: boolean; reason: string } {
    // Check for duplicates
    if (config.preventDuplicates && this.selectedArtists.has(artist.name.toLowerCase())) {
      return { allowed: false, reason: 'Duplicate artist' };
    }

    // Check genre diversity
    if (config.genreDiversityEnabled && artist.genres && artist.genres.length > 0) {
      const primaryGenre = artist.genres[0];
      const genreCount = this.genreCounts.get(primaryGenre) || 0;
      
      if (genreCount >= config.maxSameGenre) {
        return { allowed: false, reason: `Too many ${primaryGenre} artists (${genreCount}/${config.maxSameGenre})` };
      }
    }

    // Check era diversity
    if (config.eraDiversityEnabled) {
      const era = this.determineEra(artist);
      const eraCount = this.eraCounts.get(era) || 0;
      
      if (eraCount >= config.maxSameEra) {
        return { allowed: false, reason: `Too many ${era} artists (${eraCount}/${config.maxSameEra})` };
      }
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Update selection state after selecting an artist
   */
  private updateSelectionState(artist: SimilarArtist): void {
    this.selectedArtists.add(artist.name.toLowerCase());

    // Update genre counts
    if (artist.genres && artist.genres.length > 0) {
      const primaryGenre = artist.genres[0];
      this.genreCounts.set(primaryGenre, (this.genreCounts.get(primaryGenre) || 0) + 1);
    }

    // Update era counts
    const era = this.determineEra(artist);
    this.eraCounts.set(era, (this.eraCounts.get(era) || 0) + 1);
  }

  /**
   * Update weights for remaining candidates based on current selection
   */
  private updateWeights(candidates: WeightedArtist[], config: SelectionConfig): void {
    candidates.forEach(artist => {
      const diversityBonus = this.calculateDiversityBonus(artist, config);
      artist.weight = (artist.weight * 0.7) + (diversityBonus * config.diversityWeight * 0.3);
    });
  }

  /**
   * Determine era for an artist based on genres and tags
   */
  private determineEra(artist: SimilarArtist): string {
    // Check genres first
    if (artist.genres) {
      for (const genre of artist.genres) {
        if (ERA_CLASSIFICATION[genre.toLowerCase()]) {
          return ERA_CLASSIFICATION[genre.toLowerCase()];
        }
      }
    }

    // Check tags
    if (artist.tags) {
      for (const tag of artist.tags) {
        if (ERA_CLASSIFICATION[tag.toLowerCase()]) {
          return ERA_CLASSIFICATION[tag.toLowerCase()];
        }
      }
    }

    // Default era based on common patterns
    const name = artist.name.toLowerCase();
    if (name.includes('classic') || name.includes('vintage')) return '1960s-1980s';
    if (name.includes('modern') || name.includes('new')) return '2010s-2020s';
    
    return 'contemporary'; // Default era
  }

  /**
   * Calculate selection statistics
   */
  private calculateSelectionStats(selectedArtists: SimilarArtist[], totalCandidates: number): SelectionResult['selectionStats'] {
    const genreDistribution: Record<string, number> = {};
    const eraDistribution: Record<string, number> = {};
    let totalSimilarity = 0;

    selectedArtists.forEach(artist => {
      totalSimilarity += artist.similarity;

      // Count genres
      if (artist.genres && artist.genres.length > 0) {
        const genre = artist.genres[0];
        genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
      }

      // Count eras
      const era = this.determineEra(artist);
      eraDistribution[era] = (eraDistribution[era] || 0) + 1;
    });

    const averageSimilarity = selectedArtists.length > 0 ? totalSimilarity / selectedArtists.length : 0;
    
    // Calculate diversity score (0-1, higher = more diverse)
    const genreCount = Object.keys(genreDistribution).length;
    const eraCount = Object.keys(eraDistribution).length;
    const maxPossibleGenres = Math.min(10, selectedArtists.length); // Reasonable max
    const maxPossibleEras = Math.min(6, selectedArtists.length);
    
    const diversityScore = (
      (genreCount / maxPossibleGenres) * 0.6 +
      (eraCount / maxPossibleEras) * 0.4
    );

    return {
      totalCandidates,
      genreDistribution,
      eraDistribution,
      averageSimilarity,
      diversityScore: Math.min(1, diversityScore)
    };
  }

  /**
   * Reset selection state
   */
  private reset(): void {
    this.selectedArtists.clear();
    this.genreCounts.clear();
    this.eraCounts.clear();
  }

  /**
   * Get current selection state for debugging
   */
  getSelectionState() {
    return {
      selectedArtists: Array.from(this.selectedArtists),
      genreCounts: Object.fromEntries(this.genreCounts),
      eraCounts: Object.fromEntries(this.eraCounts)
    };
  }
}

// Export singleton instance
export const smartArtistSelector = new SmartArtistSelector();
