/**
 * Enhanced Music Discovery Service
 * Comprehensive fallback system for when Last.fm API fails
 */

import { SimilarArtist } from '../types/powerHour';
import { backupMusicDiscovery } from './backupMusicDiscovery';

// Comprehensive genre-based artist database
const GENRE_ARTIST_DATABASE: Record<string, SimilarArtist[]> = {
  'jam band': [
    { name: 'Phish', similarity: 0.95, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Grateful Dead', similarity: 0.93, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Widespread Panic', similarity: 0.90, genres: ['jam band', 'southern rock'], tags: ['improvisational', 'blues'] },
    { name: 'String Cheese Incident', similarity: 0.88, genres: ['jam band', 'bluegrass'], tags: ['improvisational', 'folk'] },
    { name: "Umphrey's McGee", similarity: 0.85, genres: ['jam band', 'progressive rock'], tags: ['improvisational', 'metal'] },
    { name: 'moe.', similarity: 0.83, genres: ['jam band', 'rock'], tags: ['improvisational', 'alternative'] },
    { name: 'Disco Biscuits', similarity: 0.80, genres: ['jam band', 'electronic'], tags: ['improvisational', 'trance'] },
    { name: 'Lotus', similarity: 0.78, genres: ['jam band', 'electronic'], tags: ['improvisational', 'dance'] },
    { name: 'Spafford', similarity: 0.75, genres: ['jam band', 'rock'], tags: ['improvisational', 'progressive'] },
    { name: 'Aqueous', similarity: 0.73, genres: ['jam band', 'rock'], tags: ['improvisational', 'progressive'] },
    { name: 'Pigeons Playing Ping Pong', similarity: 0.70, genres: ['jam band', 'funk'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Goose', similarity: 0.68, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Dopapod', similarity: 0.65, genres: ['jam band', 'electronic'], tags: ['improvisational', 'funk'] },
    { name: 'Tauk', similarity: 0.63, genres: ['jam band', 'instrumental'], tags: ['improvisational', 'progressive'] },
    { name: 'Lettuce', similarity: 0.60, genres: ['funk', 'jam band'], tags: ['improvisational', 'soul'] }
  ],

  'pop': [
    { name: 'Taylor Swift', similarity: 0.95, genres: ['pop', 'country'], tags: ['singer-songwriter', 'mainstream'] },
    { name: 'Ariana Grande', similarity: 0.93, genres: ['pop', 'r&b'], tags: ['contemporary', 'dance pop'] },
    { name: 'Billie Eilish', similarity: 0.90, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Dua Lipa', similarity: 0.88, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'Olivia Rodrigo', similarity: 0.85, genres: ['pop', 'alternative'], tags: ['singer-songwriter', 'indie pop'] },
    { name: 'Lorde', similarity: 0.83, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Katy Perry', similarity: 0.80, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'Ed Sheeran', similarity: 0.78, genres: ['pop', 'folk'], tags: ['singer-songwriter', 'acoustic'] },
    { name: 'Selena Gomez', similarity: 0.75, genres: ['pop', 'dance'], tags: ['dance pop', 'latin pop'] },
    { name: 'Miley Cyrus', similarity: 0.73, genres: ['pop', 'rock'], tags: ['pop rock', 'country pop'] },
    { name: 'Halsey', similarity: 0.70, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Camila Cabello', similarity: 0.68, genres: ['pop', 'latin'], tags: ['latin pop', 'dance pop'] },
    { name: 'Shawn Mendes', similarity: 0.65, genres: ['pop', 'folk'], tags: ['singer-songwriter', 'acoustic'] },
    { name: 'Doja Cat', similarity: 0.63, genres: ['pop', 'hip hop'], tags: ['contemporary', 'r&b'] },
    { name: 'The Weeknd', similarity: 0.60, genres: ['r&b', 'pop'], tags: ['contemporary r&b', 'alternative r&b'] }
  ],

  'hip hop': [
    { name: 'Drake', similarity: 0.95, genres: ['hip hop', 'r&b'], tags: ['contemporary rap', 'melodic rap'] },
    { name: 'Kendrick Lamar', similarity: 0.93, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'west coast'] },
    { name: 'J. Cole', similarity: 0.90, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'southern hip hop'] },
    { name: 'Kanye West', similarity: 0.88, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'experimental hip hop'] },
    { name: 'Travis Scott', similarity: 0.85, genres: ['hip hop', 'trap'], tags: ['psychedelic rap', 'southern hip hop'] },
    { name: 'Future', similarity: 0.83, genres: ['hip hop', 'trap'], tags: ['southern hip hop', 'mumble rap'] },
    { name: 'Post Malone', similarity: 0.80, genres: ['hip hop', 'pop'], tags: ['melodic rap', 'pop rap'] },
    { name: 'Lil Wayne', similarity: 0.78, genres: ['hip hop', 'rap'], tags: ['southern hip hop', 'hardcore hip hop'] },
    { name: 'Tyler, The Creator', similarity: 0.75, genres: ['hip hop', 'alternative'], tags: ['alternative hip hop', 'experimental'] },
    { name: 'Childish Gambino', similarity: 0.73, genres: ['hip hop', 'r&b'], tags: ['alternative hip hop', 'funk'] },
    { name: 'Chance the Rapper', similarity: 0.70, genres: ['hip hop', 'gospel'], tags: ['conscious rap', 'gospel rap'] },
    { name: 'Big Sean', similarity: 0.68, genres: ['hip hop', 'rap'], tags: ['midwest hip hop', 'contemporary rap'] },
    { name: 'Joey Bada$$', similarity: 0.65, genres: ['hip hop', 'rap'], tags: ['east coast hip hop', 'boom bap'] },
    { name: 'Vince Staples', similarity: 0.63, genres: ['hip hop', 'rap'], tags: ['west coast hip hop', 'alternative hip hop'] },
    { name: 'Mac Miller', similarity: 0.60, genres: ['hip hop', 'alternative'], tags: ['alternative hip hop', 'conscious rap'] }
  ],

  'rock': [
    { name: 'The Beatles', similarity: 0.95, genres: ['rock', 'pop'], tags: ['british invasion', 'psychedelic'] },
    { name: 'Led Zeppelin', similarity: 0.93, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues'] },
    { name: 'Queen', similarity: 0.90, genres: ['rock', 'arena rock'], tags: ['classic rock', 'progressive'] },
    { name: 'The Rolling Stones', similarity: 0.88, genres: ['rock', 'classic rock'], tags: ['british invasion', 'blues'] },
    { name: 'Pink Floyd', similarity: 0.85, genres: ['rock', 'progressive rock'], tags: ['psychedelic', 'experimental'] },
    { name: 'The Who', similarity: 0.83, genres: ['rock', 'hard rock'], tags: ['british invasion', 'progressive'] },
    { name: 'AC/DC', similarity: 0.80, genres: ['rock', 'hard rock'], tags: ['classic rock', 'heavy metal'] },
    { name: 'Aerosmith', similarity: 0.78, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues rock'] },
    { name: 'Deep Purple', similarity: 0.75, genres: ['rock', 'hard rock'], tags: ['classic rock', 'heavy metal'] },
    { name: 'Black Sabbath', similarity: 0.73, genres: ['rock', 'heavy metal'], tags: ['hard rock', 'doom metal'] },
    { name: 'Nirvana', similarity: 0.70, genres: ['rock', 'grunge'], tags: ['alternative rock', 'punk'] },
    { name: 'Pearl Jam', similarity: 0.68, genres: ['rock', 'grunge'], tags: ['alternative rock', 'hard rock'] },
    { name: 'Radiohead', similarity: 0.65, genres: ['alternative rock', 'experimental'], tags: ['art rock', 'electronic'] },
    { name: 'Foo Fighters', similarity: 0.63, genres: ['rock', 'alternative rock'], tags: ['post-grunge', 'hard rock'] },
    { name: 'Red Hot Chili Peppers', similarity: 0.60, genres: ['rock', 'funk rock'], tags: ['alternative rock', 'rap rock'] }
  ],

  'electronic': [
    { name: 'Daft Punk', similarity: 0.95, genres: ['electronic', 'house'], tags: ['french house', 'disco'] },
    { name: 'Deadmau5', similarity: 0.93, genres: ['electronic', 'progressive house'], tags: ['edm', 'techno'] },
    { name: 'Calvin Harris', similarity: 0.90, genres: ['electronic', 'house'], tags: ['edm', 'dance'] },
    { name: 'Skrillex', similarity: 0.88, genres: ['electronic', 'dubstep'], tags: ['edm', 'bass music'] },
    { name: 'Avicii', similarity: 0.85, genres: ['electronic', 'house'], tags: ['edm', 'progressive house'] },
    { name: 'Tiësto', similarity: 0.83, genres: ['electronic', 'trance'], tags: ['edm', 'progressive trance'] },
    { name: 'David Guetta', similarity: 0.80, genres: ['electronic', 'house'], tags: ['edm', 'electro house'] },
    { name: 'Diplo', similarity: 0.78, genres: ['electronic', 'trap'], tags: ['edm', 'moombahton'] },
    { name: 'Zedd', similarity: 0.75, genres: ['electronic', 'electro house'], tags: ['edm', 'progressive house'] },
    { name: 'Martin Garrix', similarity: 0.73, genres: ['electronic', 'big room house'], tags: ['edm', 'progressive house'] },
    { name: 'Marshmello', similarity: 0.70, genres: ['electronic', 'future bass'], tags: ['edm', 'trap'] },
    { name: 'The Chainsmokers', similarity: 0.68, genres: ['electronic', 'pop'], tags: ['edm', 'electropop'] },
    { name: 'Flume', similarity: 0.65, genres: ['electronic', 'future bass'], tags: ['experimental', 'ambient'] },
    { name: 'Porter Robinson', similarity: 0.63, genres: ['electronic', 'electro house'], tags: ['edm', 'progressive house'] },
    { name: 'ODESZA', similarity: 0.60, genres: ['electronic', 'future bass'], tags: ['ambient', 'chillwave'] }
  ]
};

// Artist name to genre mapping for intelligent detection
const ARTIST_TO_GENRE_MAP: Record<string, string> = {
  // Jam bands
  'goose': 'jam band',
  'phish': 'jam band',
  'grateful dead': 'jam band',
  'widespread panic': 'jam band',
  'string cheese incident': 'jam band',
  "umphrey's mcgee": 'jam band',
  'moe.': 'jam band',
  'disco biscuits': 'jam band',
  
  // Pop artists
  'taylor swift': 'pop',
  'ariana grande': 'pop',
  'billie eilish': 'pop',
  'dua lipa': 'pop',
  'olivia rodrigo': 'pop',
  'ed sheeran': 'pop',
  
  // Hip hop artists
  'drake': 'hip hop',
  'kendrick lamar': 'hip hop',
  'j. cole': 'hip hop',
  'kanye west': 'hip hop',
  'travis scott': 'hip hop',
  'post malone': 'hip hop',
  
  // Rock artists
  'the beatles': 'rock',
  'led zeppelin': 'rock',
  'queen': 'rock',
  'the rolling stones': 'rock',
  'pink floyd': 'rock',
  'nirvana': 'rock',
  
  // Electronic artists
  'daft punk': 'electronic',
  'deadmau5': 'electronic',
  'calvin harris': 'electronic',
  'skrillex': 'electronic',
  'avicii': 'electronic',
  'tiësto': 'electronic'
};

export class EnhancedMusicDiscoveryService {
  /**
   * Find similar artists using enhanced genre-based discovery
   */
  findSimilarArtists(artist: string, maxCount: number = 15): SimilarArtist[] {
    const normalizedArtist = artist.toLowerCase().trim();
    
    console.log(`🎯 Enhanced discovery for: ${artist}`);
    
    // First try exact match in backup database
    if (backupMusicDiscovery.hasDataFor(artist)) {
      const backupResults = backupMusicDiscovery.getSimilarArtists(artist, maxCount);
      console.log(`✅ Found ${backupResults.length} artists in backup database`);
      return backupResults;
    }
    
    // Try genre-based discovery
    const detectedGenre = this.detectGenre(normalizedArtist);
    if (detectedGenre && GENRE_ARTIST_DATABASE[detectedGenre]) {
      const genreArtists = GENRE_ARTIST_DATABASE[detectedGenre]
        .filter(a => a.name.toLowerCase() !== normalizedArtist)
        .slice(0, maxCount);
      
      console.log(`🎭 Found ${genreArtists.length} artists in ${detectedGenre} genre`);
      return genreArtists;
    }
    
    // Fallback to popular artists
    console.log(`⚠️ No specific genre detected, using popular fallback`);
    return this.getFallbackArtists(artist, maxCount);
  }
  
  /**
   * Detect genre from artist name
   */
  private detectGenre(artist: string): string | null {
    // Direct mapping
    if (ARTIST_TO_GENRE_MAP[artist]) {
      return ARTIST_TO_GENRE_MAP[artist];
    }
    
    // Pattern matching
    if (artist.includes('dj') || artist.includes('electronic')) {
      return 'electronic';
    }
    if (artist.includes('mc') || artist.includes('lil') || artist.includes('young')) {
      return 'hip hop';
    }
    if (artist.includes('band') || artist.includes('brothers') || artist.includes('sisters')) {
      return 'rock';
    }
    
    return null;
  }
  
  /**
   * Get fallback artists for unknown artists
   */
  private getFallbackArtists(artist: string, maxCount: number): SimilarArtist[] {
    const popularArtists = [
      { name: 'The Beatles', similarity: 0.6, genres: ['rock', 'pop'], tags: ['classic', 'popular'] },
      { name: 'Taylor Swift', similarity: 0.58, genres: ['pop', 'country'], tags: ['contemporary', 'popular'] },
      { name: 'Drake', similarity: 0.56, genres: ['hip hop', 'r&b'], tags: ['contemporary', 'popular'] },
      { name: 'Led Zeppelin', similarity: 0.54, genres: ['rock', 'hard rock'], tags: ['classic', 'popular'] },
      { name: 'Ariana Grande', similarity: 0.52, genres: ['pop', 'r&b'], tags: ['contemporary', 'popular'] },
      { name: 'Queen', similarity: 0.50, genres: ['rock', 'arena rock'], tags: ['classic', 'popular'] },
      { name: 'Kendrick Lamar', similarity: 0.48, genres: ['hip hop', 'rap'], tags: ['contemporary', 'popular'] },
      { name: 'Daft Punk', similarity: 0.46, genres: ['electronic', 'house'], tags: ['electronic', 'popular'] },
      { name: 'Billie Eilish', similarity: 0.44, genres: ['pop', 'alternative'], tags: ['contemporary', 'popular'] },
      { name: 'Pink Floyd', similarity: 0.42, genres: ['rock', 'progressive'], tags: ['classic', 'popular'] }
    ];
    
    return popularArtists
      .filter(a => a.name.toLowerCase() !== artist.toLowerCase())
      .slice(0, maxCount);
  }
  
  /**
   * Get all supported genres
   */
  getSupportedGenres(): string[] {
    return Object.keys(GENRE_ARTIST_DATABASE);
  }
  
  /**
   * Get artists by genre
   */
  getArtistsByGenre(genre: string, maxCount: number = 15): SimilarArtist[] {
    return GENRE_ARTIST_DATABASE[genre]?.slice(0, maxCount) || [];
  }
}

// Export singleton instance
export const enhancedMusicDiscovery = new EnhancedMusicDiscoveryService();
