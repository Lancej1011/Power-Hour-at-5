/**
 * Artist Disambiguation Service
 * Helps identify and clarify which specific artist we're searching for
 */

import { SimilarArtist } from '../types/powerHour';

export interface ArtistDisambiguationInfo {
  name: string;
  disambiguationTerms: string[];
  genres: string[];
  activeYears?: string;
  country?: string;
  description?: string;
  aliases?: string[];
  mbid?: string; // MusicBrainz ID
}

export interface DisambiguationResult {
  originalQuery: string;
  disambiguatedQuery: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'exact_match' | 'genre_context' | 'year_context' | 'country_context' | 'manual_disambiguation';
  suggestions?: ArtistDisambiguationInfo[];
}

// Known artist disambiguation database
const ARTIST_DISAMBIGUATION_DB: Record<string, ArtistDisambiguationInfo[]> = {
  'genesis': [
    {
      name: 'Genesis',
      disambiguationTerms: ['progressive rock', 'phil collins', 'peter gabriel', 'british'],
      genres: ['progressive rock', 'art rock', 'pop rock'],
      activeYears: '1967-present',
      country: 'UK',
      description: 'British progressive rock band formed in 1967'
    },
    {
      name: 'Genesis',
      disambiguationTerms: ['rapper', 'hip hop', 'american'],
      genres: ['hip hop', 'rap'],
      activeYears: '1990s-2000s',
      country: 'USA',
      description: 'American rapper from the 1990s'
    }
  ],
  'bush': [
    {
      name: 'Bush',
      disambiguationTerms: ['grunge', 'alternative rock', 'gavin rossdale', 'british'],
      genres: ['grunge', 'alternative rock', 'post-grunge'],
      activeYears: '1992-present',
      country: 'UK',
      description: 'British grunge/alternative rock band'
    },
    {
      name: 'Bush',
      disambiguationTerms: ['canadian', 'indie rock'],
      genres: ['indie rock', 'alternative rock'],
      activeYears: '1990s',
      country: 'Canada',
      description: 'Canadian indie rock band'
    }
  ],
  'america': [
    {
      name: 'America',
      disambiguationTerms: ['folk rock', 'horse with no name', '1970s'],
      genres: ['folk rock', 'soft rock', 'country rock'],
      activeYears: '1970-present',
      country: 'USA',
      description: 'American folk rock band known for "A Horse with No Name"'
    }
  ],
  'kansas': [
    {
      name: 'Kansas',
      disambiguationTerms: ['progressive rock', 'carry on wayward son', 'dust in the wind'],
      genres: ['progressive rock', 'arena rock', 'hard rock'],
      activeYears: '1973-present',
      country: 'USA',
      description: 'American progressive rock band'
    }
  ],
  'chicago': [
    {
      name: 'Chicago',
      disambiguationTerms: ['rock band', 'horn section', 'saturday in the park'],
      genres: ['rock', 'jazz rock', 'soft rock'],
      activeYears: '1967-present',
      country: 'USA',
      description: 'American rock band with horn section'
    }
  ],
  'boston': [
    {
      name: 'Boston',
      disambiguationTerms: ['arena rock', 'more than a feeling', 'tom scholz'],
      genres: ['arena rock', 'hard rock', 'classic rock'],
      activeYears: '1976-present',
      country: 'USA',
      description: 'American arena rock band'
    }
  ],
  'europe': [
    {
      name: 'Europe',
      disambiguationTerms: ['swedish', 'the final countdown', 'hard rock'],
      genres: ['hard rock', 'heavy metal', 'glam metal'],
      activeYears: '1979-present',
      country: 'Sweden',
      description: 'Swedish hard rock band known for "The Final Countdown"'
    }
  ],
  'asia': [
    {
      name: 'Asia',
      disambiguationTerms: ['supergroup', 'progressive rock', 'heat of the moment'],
      genres: ['progressive rock', 'arena rock', 'art rock'],
      activeYears: '1981-present',
      country: 'UK',
      description: 'British progressive rock supergroup'
    }
  ],
  'journey': [
    {
      name: 'Journey',
      disambiguationTerms: ['arena rock', 'steve perry', 'dont stop believin'],
      genres: ['arena rock', 'soft rock', 'hard rock'],
      activeYears: '1973-present',
      country: 'USA',
      description: 'American arena rock band'
    }
  ],
  'foreigner': [
    {
      name: 'Foreigner',
      disambiguationTerms: ['arena rock', 'i want to know what love is', 'cold as ice'],
      genres: ['arena rock', 'hard rock', 'soft rock'],
      activeYears: '1976-present',
      country: 'USA/UK',
      description: 'British-American arena rock band'
    }
  ],
  'the police': [
    {
      name: 'The Police',
      disambiguationTerms: ['sting', 'new wave', 'every breath you take'],
      genres: ['new wave', 'post-punk', 'reggae rock'],
      activeYears: '1977-1986, 2007-2008',
      country: 'UK',
      description: 'British new wave band fronted by Sting'
    }
  ],
  'cream': [
    {
      name: 'Cream',
      disambiguationTerms: ['eric clapton', 'ginger baker', 'jack bruce', 'blues rock'],
      genres: ['blues rock', 'psychedelic rock', 'hard rock'],
      activeYears: '1966-1968, 1993, 2005',
      country: 'UK',
      description: 'British blues rock supergroup with Eric Clapton'
    }
  ]
};

// Genre-based disambiguation hints
const GENRE_DISAMBIGUATION_HINTS: Record<string, string[]> = {
  'rock': ['band', 'guitar', 'drums', 'album'],
  'hip hop': ['rapper', 'mc', 'hip hop', 'rap'],
  'pop': ['singer', 'pop', 'mainstream', 'chart'],
  'country': ['country', 'nashville', 'fiddle', 'banjo'],
  'jazz': ['jazz', 'saxophone', 'trumpet', 'swing'],
  'electronic': ['electronic', 'dj', 'synthesizer', 'techno'],
  'classical': ['classical', 'orchestra', 'symphony', 'composer'],
  'folk': ['folk', 'acoustic', 'traditional', 'singer-songwriter']
};

class ArtistDisambiguationService {
  /**
   * Disambiguate an artist name using context and known information
   */
  disambiguateArtist(
    artistName: string,
    context?: {
      genres?: string[];
      seedArtist?: string;
      seedGenres?: string[];
      userPreference?: string;
    }
  ): DisambiguationResult {
    const normalizedName = artistName.toLowerCase().trim();
    
    console.log(`🔍 Disambiguating artist: "${artistName}"`);
    
    // Check if we have disambiguation data for this artist
    const disambiguationOptions = ARTIST_DISAMBIGUATION_DB[normalizedName];
    
    if (!disambiguationOptions || disambiguationOptions.length === 1) {
      // No ambiguity or only one option
      return {
        originalQuery: artistName,
        disambiguatedQuery: artistName,
        confidence: 'high',
        method: 'exact_match'
      };
    }

    // Multiple options found - need to disambiguate
    console.log(`⚠️ Found ${disambiguationOptions.length} possible matches for "${artistName}"`);
    
    // Try context-based disambiguation
    const contextResult = this.disambiguateWithContext(artistName, disambiguationOptions, context);
    if (contextResult) {
      return contextResult;
    }

    // Return all suggestions for manual disambiguation
    return {
      originalQuery: artistName,
      disambiguatedQuery: artistName,
      confidence: 'low',
      method: 'manual_disambiguation',
      suggestions: disambiguationOptions
    };
  }

  /**
   * Create a disambiguated search query
   */
  createDisambiguatedQuery(artistName: string, context?: any): string {
    const result = this.disambiguateArtist(artistName, context);
    
    if (result.confidence === 'high' || result.confidence === 'medium') {
      const disambiguationInfo = this.getDisambiguationInfo(artistName, result.method, context);
      if (disambiguationInfo) {
        // Add disambiguation terms to the query
        const terms = disambiguationInfo.disambiguationTerms.slice(0, 2); // Use top 2 terms
        return `${artistName} ${terms.join(' ')}`;
      }
    }
    
    return artistName;
  }

  /**
   * Get Last.fm search query with disambiguation
   */
  getLastFmQuery(artistName: string, context?: any): string {
    const disambiguated = this.createDisambiguatedQuery(artistName, context);
    console.log(`🎵 Last.fm query: "${artistName}" → "${disambiguated}"`);
    return disambiguated;
  }

  /**
   * Get YouTube search query with disambiguation
   */
  getYouTubeQuery(artistName: string, songContext?: string, context?: any): string {
    const disambiguated = this.createDisambiguatedQuery(artistName, context);
    
    if (songContext) {
      return `${disambiguated} ${songContext}`;
    }
    
    return `${disambiguated} songs`;
  }

  /**
   * Disambiguate using context information
   */
  private disambiguateWithContext(
    artistName: string,
    options: ArtistDisambiguationInfo[],
    context?: any
  ): DisambiguationResult | null {
    if (!context) return null;

    // Try genre-based disambiguation
    if (context.genres || context.seedGenres) {
      const contextGenres = [...(context.genres || []), ...(context.seedGenres || [])];
      
      for (const option of options) {
        const genreMatch = option.genres.some(genre => 
          contextGenres.some(contextGenre => 
            genre.toLowerCase().includes(contextGenre.toLowerCase()) ||
            contextGenre.toLowerCase().includes(genre.toLowerCase())
          )
        );
        
        if (genreMatch) {
          console.log(`✅ Genre match found: ${option.name} (${option.genres.join(', ')})`);
          return {
            originalQuery: artistName,
            disambiguatedQuery: this.buildDisambiguatedQuery(artistName, option),
            confidence: 'high',
            method: 'genre_context'
          };
        }
      }
    }

    // Try seed artist context (if looking for similar artists)
    if (context.seedArtist) {
      // This could be enhanced with more sophisticated similarity matching
      console.log(`🌱 Using seed artist context: ${context.seedArtist}`);
    }

    return null;
  }

  /**
   * Build a disambiguated query string
   */
  private buildDisambiguatedQuery(artistName: string, info: ArtistDisambiguationInfo): string {
    const terms = info.disambiguationTerms.slice(0, 2); // Use top 2 disambiguation terms
    return `${artistName} ${terms.join(' ')}`;
  }

  /**
   * Get disambiguation info for an artist
   */
  private getDisambiguationInfo(artistName: string, method: string, context?: any): ArtistDisambiguationInfo | null {
    const normalizedName = artistName.toLowerCase().trim();
    const options = ARTIST_DISAMBIGUATION_DB[normalizedName];
    
    if (!options || options.length === 1) {
      return options?.[0] || null;
    }

    // Use the same logic as disambiguateWithContext to find the right option
    if (context?.genres || context?.seedGenres) {
      const contextGenres = [...(context.genres || []), ...(context.seedGenres || [])];
      
      for (const option of options) {
        const genreMatch = option.genres.some(genre => 
          contextGenres.some(contextGenre => 
            genre.toLowerCase().includes(contextGenre.toLowerCase()) ||
            contextGenre.toLowerCase().includes(genre.toLowerCase())
          )
        );
        
        if (genreMatch) {
          return option;
        }
      }
    }

    // Default to first option
    return options[0];
  }

  /**
   * Add new disambiguation entry
   */
  addDisambiguationEntry(artistName: string, info: ArtistDisambiguationInfo): void {
    const normalizedName = artistName.toLowerCase().trim();
    
    if (!ARTIST_DISAMBIGUATION_DB[normalizedName]) {
      ARTIST_DISAMBIGUATION_DB[normalizedName] = [];
    }
    
    ARTIST_DISAMBIGUATION_DB[normalizedName].push(info);
    console.log(`➕ Added disambiguation entry for: ${artistName}`);
  }

  /**
   * Get all known ambiguous artists
   */
  getAmbiguousArtists(): string[] {
    return Object.keys(ARTIST_DISAMBIGUATION_DB);
  }

  /**
   * Check if an artist name is potentially ambiguous
   */
  isAmbiguous(artistName: string): boolean {
    const normalizedName = artistName.toLowerCase().trim();
    const options = ARTIST_DISAMBIGUATION_DB[normalizedName];
    return options && options.length > 1;
  }

  /**
   * Get disambiguation suggestions for an artist
   */
  getDisambiguationSuggestions(artistName: string): ArtistDisambiguationInfo[] {
    const normalizedName = artistName.toLowerCase().trim();
    return ARTIST_DISAMBIGUATION_DB[normalizedName] || [];
  }
}

// Export singleton instance
export const artistDisambiguationService = new ArtistDisambiguationService();
