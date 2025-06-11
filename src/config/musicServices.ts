/**
 * Music Services Configuration
 * Configuration for external music APIs and services
 */

// Last.fm API Configuration
export const LASTFM_CONFIG = {
  // Replace with your actual Last.fm API key
  // Get one free at: https://www.last.fm/api/account/create
  API_KEY: import.meta.env.VITE_LASTFM_API_KEY || '',
  BASE_URL: 'https://ws.audioscrobbler.com/2.0/',
  RATE_LIMIT_DELAY: 200, // milliseconds between requests
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_SIMILAR_ARTISTS: 50,
};

// MusicBrainz API Configuration (fallback option)
export const MUSICBRAINZ_CONFIG = {
  BASE_URL: 'https://musicbrainz.org/ws/2/',
  RATE_LIMIT_DELAY: 1000, // 1 second between requests (required by MusicBrainz)
  USER_AGENT: 'PHat5-PowerHour/1.0.0 (https://github.com/your-repo)',
};

// Service availability checks
export const isLastFmAvailable = (): boolean => {
  return !!LASTFM_CONFIG.API_KEY && LASTFM_CONFIG.API_KEY.length > 0;
};

export const isMusicBrainzAvailable = (): boolean => {
  return true; // MusicBrainz doesn't require API key
};

// Configuration validation
export const validateMusicServiceConfig = (): {
  lastfm: boolean;
  musicbrainz: boolean;
  hasAnyService: boolean;
} => {
  const lastfm = isLastFmAvailable();
  const musicbrainz = isMusicBrainzAvailable();
  
  return {
    lastfm,
    musicbrainz,
    hasAnyService: lastfm || musicbrainz,
  };
};

// Instructions for setting up API keys
export const SETUP_INSTRUCTIONS = {
  lastfm: {
    title: 'Last.fm API Setup',
    steps: [
      '1. Go to https://www.last.fm/api/account/create',
      '2. Create a free Last.fm account if you don\'t have one',
      '3. Fill out the application form with your app details',
      '4. Copy the API key provided',
      '5. Add VITE_LASTFM_API_KEY=your_api_key to your .env file',
      '6. Restart the application',
    ],
    benefits: [
      'High-quality artist similarity recommendations',
      'Large music database with detailed metadata',
      'Free tier with reasonable rate limits',
      'Well-documented and reliable API',
    ],
  },
  musicbrainz: {
    title: 'MusicBrainz API (No Setup Required)',
    steps: [
      'MusicBrainz API works without an API key',
      'Provides basic artist relationship data',
      'Lower rate limits but still functional',
    ],
    benefits: [
      'No API key required',
      'Open source music database',
      'Good for basic artist relationships',
    ],
  },
};

// Default configuration for development/testing
export const getDefaultConfig = () => {
  const config = validateMusicServiceConfig();
  
  if (!config.hasAnyService) {
    console.warn('⚠️ No music similarity services configured');
    console.log('📖 Setup instructions:');
    console.log(SETUP_INSTRUCTIONS.lastfm.steps.join('\n'));
  }
  
  return config;
};

// Export the current configuration status
export const MUSIC_SERVICES_STATUS = getDefaultConfig();
