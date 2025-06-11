/**
 * Music Discovery Debug Utilities
 * Tools for testing and debugging music similarity discovery
 */

import { musicSimilarityService } from '../services/musicSimilarityService';
import { backupMusicDiscovery } from '../services/backupMusicDiscovery';
import { multiTierMusicDiscovery } from '../services/multiTierMusicDiscovery';
import { aiMusicDiscovery } from '../services/aiMusicDiscovery';
import { enhancedPowerHourGenerator } from '../services/enhancedPowerHourGenerator';
import { smartArtistSelector } from '../services/smartArtistSelector';
import { smartSongSelector } from '../services/smartSongSelector';
import { persistentCacheService } from '../services/persistentCacheService';
import { artistDisambiguationService } from '../services/artistDisambiguationService';
import { LASTFM_CONFIG } from '../config/musicServices';
import axios from 'axios';

export interface SimilarityTestResult {
  artist: string;
  lastfmAvailable: boolean;
  lastfmApiKey: string;
  lastfmApiKeyValid: boolean;
  lastfmResults: number;
  lastfmArtists: string[];
  lastfmScores: number[];
  lastfmError?: string;
  lastfmRawResponse?: any;
  backupResults: number;
  backupArtists: string[];
  backupScores: number[];
  recommendedAction: string;
}

/**
 * Test Last.fm API directly with raw HTTP call
 */
export async function testLastFmApiDirect(artist: string): Promise<any> {
  console.log(`🔍 Testing Last.fm API directly for: ${artist}`);
  console.log(`🔑 API Key: ${LASTFM_CONFIG.API_KEY ? LASTFM_CONFIG.API_KEY.substring(0, 8) + '...' : 'NOT_SET'}`);

  if (!LASTFM_CONFIG.API_KEY) {
    console.error(`❌ No Last.fm API key configured`);
    return { error: 'No API key' };
  }

  try {
    const url = `${LASTFM_CONFIG.BASE_URL}?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&limit=10&autocorrect=1`;
    console.log(`🌐 Making request to: ${url.replace(LASTFM_CONFIG.API_KEY, 'API_KEY_HIDDEN')}`);

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'PHat5-PowerHour/1.0.0'
      }
    });

    console.log(`✅ Response status: ${response.status}`);
    console.log(`📊 Response data:`, response.data);

    return response.data;
  } catch (error) {
    console.error(`❌ Direct API call failed:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`📊 Error response:`, error.response.data);
      return { error: error.response.data };
    }
    return { error: error.message };
  }
}

/**
 * Test similarity discovery for an artist
 */
export async function testSimilarityDiscovery(artist: string): Promise<SimilarityTestResult> {
  console.log(`🧪 Testing similarity discovery for: ${artist}`);
  
  const result: SimilarityTestResult = {
    artist,
    lastfmAvailable: musicSimilarityService.isAvailable(),
    lastfmApiKey: LASTFM_CONFIG.API_KEY ? LASTFM_CONFIG.API_KEY.substring(0, 8) + '...' : 'NOT_SET',
    lastfmApiKeyValid: false,
    lastfmResults: 0,
    lastfmArtists: [],
    lastfmScores: [],
    lastfmError: undefined,
    lastfmRawResponse: undefined,
    backupResults: 0,
    backupArtists: [],
    backupScores: [],
    recommendedAction: ''
  };

  // Test Last.fm API directly first
  console.log(`🔍 Testing Last.fm API directly for ${artist}...`);
  const directApiResult = await testLastFmApiDirect(artist);
  result.lastfmRawResponse = directApiResult;

  if (directApiResult.error) {
    result.lastfmError = directApiResult.error;
    result.lastfmApiKeyValid = false;
    console.log(`❌ Direct API test failed: ${directApiResult.error}`);
  } else if (directApiResult.similarartists) {
    result.lastfmApiKeyValid = true;
    console.log(`✅ Direct API test successful`);
  } else {
    result.lastfmApiKeyValid = false;
    console.log(`⚠️ Direct API test returned unexpected format`);
  }

  // Test Last.fm API through service
  if (result.lastfmAvailable) {
    try {
      console.log(`🔍 Testing Last.fm API through service for ${artist} (requesting 50 artists)...`);
      const lastfmArtists = await musicSimilarityService.getSimilarArtists(artist, 50);
      result.lastfmResults = lastfmArtists.length;
      result.lastfmArtists = lastfmArtists.slice(0, 10).map(a => a.name);
      result.lastfmScores = lastfmArtists.slice(0, 10).map(a => a.similarity);

      console.log(`✅ Last.fm service returned ${result.lastfmResults} artists`);
      if (result.lastfmResults > 0) {
        console.log(`🎵 Top Last.fm results:`, result.lastfmArtists.slice(0, 5).join(', '));
        console.log(`📊 Similarity scores:`, result.lastfmScores.slice(0, 5).map(s => s.toFixed(3)).join(', '));
        console.log(`📈 Total artists found: ${result.lastfmResults} (showing top 10)`);
      }
    } catch (error) {
      console.error(`❌ Last.fm service error:`, error);
      result.lastfmError = error.message;
      result.recommendedAction = 'Last.fm API error - check API key and network connection';
    }
  } else {
    console.log(`⚠️ Last.fm API not available`);
    result.recommendedAction = 'Configure Last.fm API key for better similarity discovery';
  }

  // Test backup discovery
  console.log(`🎯 Testing backup discovery for ${artist}...`);
  const backupArtists = backupMusicDiscovery.getSimilarArtists(artist, 15);
  result.backupResults = backupArtists.length;
  result.backupArtists = backupArtists.map(a => a.name);
  result.backupScores = backupArtists.map(a => a.similarity);
  
  if (result.backupResults > 0) {
    console.log(`✅ Backup discovery found ${result.backupResults} artists`);
    console.log(`🎵 Backup results:`, result.backupArtists.slice(0, 5).join(', '));
  } else {
    console.log(`⚠️ No backup data available for ${artist}`);
  }

  // Determine recommended action
  if (result.lastfmResults === 0 && result.backupResults === 0) {
    result.recommendedAction = 'No similarity data available - will use genre-based fallbacks';
  } else if (result.lastfmResults === 0 && result.backupResults > 0) {
    result.recommendedAction = 'Using backup discovery data - consider configuring Last.fm for more variety';
  } else if (result.lastfmResults > 0 && result.backupResults > 0) {
    result.recommendedAction = 'Both Last.fm and backup data available - optimal configuration';
  } else if (result.lastfmResults > 0 && result.backupResults === 0) {
    result.recommendedAction = 'Last.fm working but no backup data - consider adding artist to backup database';
  }

  console.log(`💡 Recommendation: ${result.recommendedAction}`);
  return result;
}

/**
 * Clear Last.fm cache and test fresh API call
 */
export async function testFreshSimilarityCall(artist: string): Promise<SimilarityTestResult> {
  console.log(`🧹 Clearing cache and testing fresh API call for: ${artist}`);
  
  // Clear cache
  musicSimilarityService.clearCache(artist);
  
  // Test with fresh call
  return await testSimilarityDiscovery(artist);
}

/**
 * Test similarity filtering with different thresholds
 */
export async function testSimilarityFiltering(artist: string): Promise<void> {
  console.log(`🔬 Testing similarity filtering for: ${artist}`);
  
  if (!musicSimilarityService.isAvailable()) {
    console.log(`⚠️ Last.fm not available, skipping filtering test`);
    return;
  }

  try {
    const allArtists = await musicSimilarityService.getSimilarArtists(artist);
    console.log(`📊 Total artists from Last.fm: ${allArtists.length}`);
    
    if (allArtists.length === 0) {
      console.log(`❌ No artists to filter`);
      return;
    }

    const scores = allArtists.map(a => a.similarity);
    console.log(`📈 Similarity range: ${Math.min(...scores).toFixed(3)} - ${Math.max(...scores).toFixed(3)}`);
    
    // Test different thresholds
    const thresholds = {
      strict: 0.4,
      moderate: 0.2,
      loose: 0.1,
      'very-loose': 0.05
    };

    Object.entries(thresholds).forEach(([name, threshold]) => {
      const filtered = allArtists.filter(a => a.similarity >= threshold);
      console.log(`🎯 ${name} (≥${threshold}): ${filtered.length} artists`);
      if (filtered.length > 0) {
        console.log(`   Top 3: ${filtered.slice(0, 3).map(a => `${a.name} (${a.similarity.toFixed(3)})`).join(', ')}`);
      }
    });
  } catch (error) {
    console.error(`❌ Filtering test error:`, error);
  }
}

/**
 * Generate a comprehensive similarity report
 */
export async function generateSimilarityReport(artist: string): Promise<void> {
  console.log(`📋 Generating comprehensive similarity report for: ${artist}`);
  console.log(`${'='.repeat(60)}`);
  
  // Test current state
  const currentResult = await testSimilarityDiscovery(artist);
  
  // Test fresh call
  console.log(`\n🧹 Testing fresh API call...`);
  const freshResult = await testFreshSimilarityCall(artist);
  
  // Test filtering
  console.log(`\n🔬 Testing similarity filtering...`);
  await testSimilarityFiltering(artist);
  
  // Summary
  console.log(`\n📊 SUMMARY FOR ${artist.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Last.fm Available: ${currentResult.lastfmAvailable ? '✅' : '❌'}`);
  console.log(`Last.fm Results: ${currentResult.lastfmResults}`);
  console.log(`Backup Results: ${currentResult.backupResults}`);
  console.log(`Recommendation: ${currentResult.recommendedAction}`);
  
  if (currentResult.lastfmResults > 0) {
    console.log(`\nTop Last.fm Artists:`);
    currentResult.lastfmArtists.slice(0, 5).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name} (${currentResult.lastfmScores[i].toFixed(3)})`);
    });
  }
  
  if (currentResult.backupResults > 0) {
    console.log(`\nTop Backup Artists:`);
    currentResult.backupArtists.slice(0, 5).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name} (${currentResult.backupScores[i].toFixed(3)})`);
    });
  }
  
  console.log(`${'='.repeat(60)}`);
}

/**
 * Test the new multi-tier discovery system
 */
export async function testMultiTierDiscovery(artist: string): Promise<void> {
  console.log(`🚀 Testing multi-tier discovery system for: ${artist}`);
  console.log(`${'='.repeat(80)}`);

  const result = await multiTierMusicDiscovery.testDiscovery(artist);

  console.log(`\n🔬 DETAILED BREAKDOWN:`);
  console.log(`${'='.repeat(80)}`);

  // Test each tier individually
  console.log(`\n1️⃣ LAST.FM TEST (requesting 50 artists):`);
  if (musicSimilarityService.isAvailable()) {
    try {
      const lastfmResults = await musicSimilarityService.getSimilarArtists(artist, 50);
      console.log(`   ✅ Found ${lastfmResults.length} artists`);
      if (lastfmResults.length > 0) {
        console.log(`   🎵 Top 5: ${lastfmResults.slice(0, 5).map(a => a.name).join(', ')}`);
        console.log(`   📊 Total available: ${lastfmResults.length} artists`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  } else {
    console.log(`   ⚠️ Last.fm not available`);
  }

  console.log(`\n2️⃣ CURATED DATABASE TEST:`);
  if (backupMusicDiscovery.hasDataFor(artist)) {
    const curatedResults = backupMusicDiscovery.getSimilarArtists(artist);
    console.log(`   ✅ Found ${curatedResults.length} artists`);
    console.log(`   🎵 Top 3: ${curatedResults.slice(0, 3).map(a => a.name).join(', ')}`);
  } else {
    console.log(`   ⚠️ No curated data for ${artist}`);
  }

  console.log(`\n3️⃣ AI DISCOVERY TEST:`);
  try {
    const aiResults = await aiMusicDiscovery.findSimilarArtists(artist, 10);
    console.log(`   ✅ Found ${aiResults.length} artists`);
    if (aiResults.length > 0) {
      console.log(`   🎵 Top 3: ${aiResults.slice(0, 3).map(a => a.name).join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  console.log(`\n📊 DISCOVERY STATISTICS:`);
  const stats = multiTierMusicDiscovery.getStats();
  console.log(`   Total Requests: ${stats.totalRequests}`);
  console.log(`   Success Rates: LastFM(${stats.successRate.lastfm}) Curated(${stats.successRate.curated}) AI(${stats.successRate.ai})`);

  console.log(`${'='.repeat(80)}`);
}

/**
 * Test discovery across multiple genres
 */
export async function testMultipleGenres(): Promise<void> {
  const testArtists = [
    'Goose',           // Jam band
    'Taylor Swift',    // Pop
    'Drake',           // Hip hop
    'Led Zeppelin',    // Classic rock
    'Deadmau5',        // Electronic
    'Johnny Cash',     // Country
    'Metallica',       // Metal
    'Unknown Artist'   // Test fallback
  ];

  console.log(`🌍 Testing multi-tier discovery across genres`);
  console.log(`${'='.repeat(80)}`);

  for (const artist of testArtists) {
    console.log(`\n🎵 Testing: ${artist}`);
    console.log(`${'-'.repeat(40)}`);

    try {
      const result = await multiTierMusicDiscovery.findSimilarArtists(artist, { maxResults: 5 });
      console.log(`   Method: ${result.method} (${result.confidence})`);
      console.log(`   Found: ${result.totalFound} artists`);
      console.log(`   Top 3: ${result.similarArtists.slice(0, 3).map(a => a.name).join(', ')}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  console.log(`\n📊 Final Statistics:`);
  const stats = multiTierMusicDiscovery.getStats();
  console.log(stats);
  console.log(`${'='.repeat(80)}`);
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).musicDebug = {
    // Original functions
    testSimilarityDiscovery,
    testFreshSimilarityCall,
    testSimilarityFiltering,
    generateSimilarityReport,
    clearCache: (artist?: string) => musicSimilarityService.clearCache(artist),

    // Direct API testing
    testLastFmApiDirect,

    // New multi-tier functions
    testMultiTierDiscovery,
    testMultipleGenres,
    multiTierDiscovery: multiTierMusicDiscovery,
    aiDiscovery: aiMusicDiscovery,
    backupDiscovery: backupMusicDiscovery,

    // Quick test functions
    testGoose: () => testMultiTierDiscovery('Goose'),
    testTaylorSwift: () => testMultiTierDiscovery('Taylor Swift'),
    testDrake: () => testMultiTierDiscovery('Drake'),
    testUnknown: () => testMultiTierDiscovery('Unknown Artist'),
    testAll: testMultipleGenres,

    // Direct API tests
    testGooseApi: () => testLastFmApiDirect('Goose'),
    testTaylorApi: () => testLastFmApiDirect('Taylor Swift'),

    // Comprehensive diagnosis
    diagnose: async (artist: string) => {
      console.log(`🔬 Running comprehensive diagnosis for: ${artist}`);
      console.log(`${'='.repeat(60)}`);

      // Test direct API
      console.log(`\n1️⃣ Testing Last.fm API directly...`);
      const directResult = await testLastFmApiDirect(artist);

      // Test service
      console.log(`\n2️⃣ Testing through service...`);
      const serviceResult = await testSimilarityDiscovery(artist);

      // Test multi-tier
      console.log(`\n3️⃣ Testing multi-tier discovery...`);
      await testMultiTierDiscovery(artist);

      console.log(`\n📊 DIAGNOSIS SUMMARY:`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Direct API: ${directResult.error ? '❌ Failed' : '✅ Working'}`);
      console.log(`Service: ${serviceResult.lastfmResults > 0 ? '✅ Working' : '❌ Failed'}`);
      console.log(`Backup: ${serviceResult.backupResults > 0 ? '✅ Available' : '⚠️ No data'}`);
      console.log(`Recommendation: ${serviceResult.recommendedAction}`);

      return { directResult, serviceResult };
    },

    // Enhanced system tests
    testEnhancedPowerHour: async (artist: string) => {
      console.log(`🚀 Testing Enhanced Power Hour Generation for: ${artist}`);
      console.log(`${'='.repeat(60)}`);

      try {
        const result = await enhancedPowerHourGenerator.generatePowerHour({
          seedArtist: artist,
          totalTracks: 10, // Small test
          prioritizeCachedResults: true,
          maxApiCalls: 5
        }, (progress) => {
          console.log(`📈 Progress: ${progress.currentTrack}/${progress.totalTracks} - ${progress.currentStep}`);
        });

        console.log(`✅ Generated ${result.tracks.length} tracks`);
        console.log(`📊 Cache hit rate: ${result.generationStats.cacheHitRate.toFixed(1)}%`);
        console.log(`🎵 Diversity score: ${result.qualityMetrics.diversityScore.toFixed(2)}`);

        return result;
      } catch (error) {
        console.error(`❌ Enhanced power hour test failed:`, error);
        return { error: error.message };
      }
    },

    testSmartArtistSelection: (artists: any[]) => {
      console.log(`🎯 Testing Smart Artist Selection with ${artists.length} candidates`);

      const result = smartArtistSelector.selectArtists(artists, {
        maxArtists: 20,
        diversityWeight: 0.4,
        similarityWeight: 0.6
      });

      console.log(`✅ Selected ${result.selectedArtists.length} artists`);
      console.log(`📊 Diversity score: ${result.selectionStats.diversityScore.toFixed(2)}`);
      console.log(`🎭 Genre distribution:`, result.selectionStats.genreDistribution);

      return result;
    },

    testSmartSongSelection: async (artist: any) => {
      console.log(`🎵 Testing Smart Song Selection for: ${artist.name || artist}`);

      const artistObj = typeof artist === 'string' ? { name: artist, similarity: 0.8, genres: ['pop'], tags: [] } : artist;

      const result = await smartSongSelector.selectSongForArtist(artistObj);

      console.log(`✅ Selected: ${result.selectedSong.title}`);
      console.log(`📊 Selection method: ${result.selectionMethod}`);
      console.log(`🔍 Found ${result.searchStats.totalFound} total songs`);

      return result;
    },

    getCacheStats: () => {
      const stats = persistentCacheService.getStatistics();
      console.log(`💾 Cache Statistics:`);
      console.log(`   Total entries: ${stats.totalEntries}`);
      console.log(`   Hit rate: ${stats.hitRate.toFixed(1)}%`);
      console.log(`   Cache size: ${(stats.totalSize / 1024).toFixed(1)} KB`);
      console.log(`   Popular artists:`, stats.popularArtists);
      return stats;
    },

    exportCache: () => {
      const data = enhancedPowerHourGenerator.exportCache();
      console.log(`📤 Cache exported (${data.length} characters)`);
      return data;
    },

    clearEnhancedCache: () => {
      enhancedPowerHourGenerator.clearCache();
      console.log(`🗑️ Enhanced cache cleared`);
    },

    // Artist disambiguation tests
    testDisambiguation: (artist: string) => {
      console.log(`🔍 Testing disambiguation for: ${artist}`);

      const result = artistDisambiguationService.disambiguateArtist(artist);
      console.log(`📊 Disambiguation result:`, result);

      if (result.suggestions && result.suggestions.length > 1) {
        console.log(`⚠️ Found ${result.suggestions.length} possible matches:`);
        result.suggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion.name} (${suggestion.genres.join(', ')}) - ${suggestion.description}`);
        });
      } else {
        console.log(`✅ No disambiguation needed - single match or not in database`);
      }

      return result;
    },

    testDisambiguatedSearch: async (artist: string, context?: any) => {
      console.log(`🔍 Testing disambiguated search for: ${artist}`);

      const lastfmQuery = artistDisambiguationService.getLastFmQuery(artist, context);
      const youtubeQuery = artistDisambiguationService.getYouTubeQuery(artist, 'songs', context);

      console.log(`🎵 Last.fm query: "${artist}" → "${lastfmQuery}"`);
      console.log(`📺 YouTube query: "${artist}" → "${youtubeQuery}"`);

      // Test with actual search
      try {
        const result = await musicSimilarityService.getSimilarArtists(artist, 10, context);
        console.log(`✅ Found ${result.length} similar artists using disambiguation`);
        console.log(`🎯 Top 5:`, result.slice(0, 5).map(a => `${a.name}: ${a.similarity.toFixed(3)}`));
        return result;
      } catch (error) {
        console.error(`❌ Disambiguated search failed:`, error);
        return [];
      }
    },

    getAmbiguousArtists: () => {
      const ambiguous = artistDisambiguationService.getAmbiguousArtists();
      console.log(`🔍 Known ambiguous artists (${ambiguous.length}):`, ambiguous);
      return ambiguous;
    },

    testAllAmbiguous: async () => {
      const ambiguous = artistDisambiguationService.getAmbiguousArtists();
      console.log(`🧪 Testing all ${ambiguous.length} ambiguous artists...`);

      for (const artist of ambiguous) {
        console.log(`\n🔍 Testing: ${artist}`);
        const result = artistDisambiguationService.disambiguateArtist(artist);
        console.log(`  Confidence: ${result.confidence}, Method: ${result.method}`);
        if (result.suggestions) {
          console.log(`  Options: ${result.suggestions.length}`);
        }
      }
    },

    // Enhanced power hour debugging
    testEnhancedDiscovery: async (artist: string) => {
      console.log(`🔍 Testing enhanced discovery for: ${artist}`);

      try {
        // Test the discovery step
        const discoveryResult = await multiTierMusicDiscovery.findSimilarArtists(artist, {
          maxResults: 20,
          enableLastFm: true,
          enableCurated: true,
          enableAI: true,
          enableFallback: true
        });

        console.log(`✅ Discovery result:`, discoveryResult);
        console.log(`📊 Found ${discoveryResult.similarArtists.length} artists using ${discoveryResult.method}`);
        console.log(`🎯 Top 10:`, discoveryResult.similarArtists.slice(0, 10).map(a => `${a.name}: ${a.similarity.toFixed(3)}`));

        return discoveryResult;
      } catch (error) {
        console.error(`❌ Enhanced discovery failed:`, error);
        return null;
      }
    },

    testSmallPowerHour: async (artist: string) => {
      console.log(`🚀 Testing small power hour for: ${artist}`);

      try {
        const result = await enhancedPowerHourGenerator.generatePowerHour({
          seedArtist: artist,
          totalTracks: 5, // Small test
          prioritizeCachedResults: false, // Force fresh discovery
          maxApiCalls: 3
        }, (progress) => {
          console.log(`📈 Progress: ${progress.currentTrack}/${progress.totalTracks} - ${progress.currentStep}`);
        });

        console.log(`✅ Small power hour result:`, result);
        console.log(`🎵 Generated tracks:`, result.tracks.map(t => `${t.artist} - ${t.song.title}`));

        return result;
      } catch (error) {
        console.error(`❌ Small power hour test failed:`, error);
        return null;
      }
    },

    // Compare Discovery Tester vs Enhanced Generator
    compareDiscoveryMethods: async (artist: string) => {
      console.log(`🔬 Comparing Discovery Tester vs Enhanced Generator for: ${artist}`);
      console.log(`${'='.repeat(80)}`);

      // Test Discovery Tester method
      console.log(`\n1️⃣ DISCOVERY TESTER METHOD:`);
      console.log(`${'-'.repeat(40)}`);
      const discoveryTesterResult = await multiTierMusicDiscovery.testDiscovery(artist);

      // Test Enhanced Generator method (discovery step only)
      console.log(`\n2️⃣ ENHANCED GENERATOR METHOD:`);
      console.log(`${'-'.repeat(40)}`);
      const enhancedDiscoveryResult = await multiTierMusicDiscovery.findSimilarArtists(artist, {
        maxResults: Math.max(60 * 2, 100), // Same as Enhanced Generator
        enableLastFm: true,
        enableCurated: true,
        enableAI: true,
        enableFallback: true
      });

      // Compare results
      console.log(`\n📊 COMPARISON RESULTS:`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Discovery Tester:`);
      console.log(`  Method: ${discoveryTesterResult.method} (${discoveryTesterResult.confidence})`);
      console.log(`  Total Found: ${discoveryTesterResult.totalFound}`);
      console.log(`  Top 5: ${discoveryTesterResult.similarArtists.slice(0, 5).map(a => a.name).join(', ')}`);

      console.log(`\nEnhanced Generator:`);
      console.log(`  Method: ${enhancedDiscoveryResult.method} (${enhancedDiscoveryResult.confidence})`);
      console.log(`  Total Found: ${enhancedDiscoveryResult.totalFound}`);
      console.log(`  Top 5: ${enhancedDiscoveryResult.similarArtists.slice(0, 5).map(a => a.name).join(', ')}`);

      // Check if results are identical
      const identical = JSON.stringify(discoveryTesterResult.similarArtists) === JSON.stringify(enhancedDiscoveryResult.similarArtists);
      console.log(`\n🎯 Results Identical: ${identical ? '✅ YES' : '❌ NO'}`);

      if (!identical) {
        console.log(`⚠️ Results differ - this indicates a potential issue!`);
        console.log(`Discovery Tester found ${discoveryTesterResult.similarArtists.length} artists`);
        console.log(`Enhanced Generator found ${enhancedDiscoveryResult.similarArtists.length} artists`);
      }

      console.log(`${'='.repeat(80)}`);
      return { discoveryTesterResult, enhancedDiscoveryResult, identical };
    }
  };

  console.log(`🧪 Enhanced music discovery debug tools available at window.musicDebug`);
  console.log(`💡 Quick tests:`);
  console.log(`   musicDebug.testGoose() - Test jam band discovery`);
  console.log(`   musicDebug.testTaylorSwift() - Test pop discovery`);
  console.log(`   musicDebug.testDrake() - Test hip hop discovery`);
  console.log(`   musicDebug.testUnknown() - Test fallback system`);
  console.log(`   musicDebug.testAll() - Test all genres`);
  console.log(`   musicDebug.testMultiTierDiscovery('Artist Name') - Test any artist`);
  console.log(`🔍 Direct API tests:`);
  console.log(`   musicDebug.testLastFmApiDirect('Artist Name') - Test Last.fm API directly`);
  console.log(`   musicDebug.testGooseApi() - Test Goose with direct API`);
  console.log(`   musicDebug.testTaylorApi() - Test Taylor Swift with direct API`);
  console.log(`🚀 Enhanced system tests:`);
  console.log(`   musicDebug.diagnose('Artist Name') - Run comprehensive diagnosis`);
  console.log(`   musicDebug.testEnhancedPowerHour('Artist Name') - Test full power hour generation`);
  console.log(`   musicDebug.testSmartArtistSelection(artists) - Test artist selection algorithm`);
  console.log(`   musicDebug.testSmartSongSelection('Artist Name') - Test song selection`);
  console.log(`💾 Cache management:`);
  console.log(`   musicDebug.getCacheStats() - View cache statistics`);
  console.log(`   musicDebug.exportCache() - Export cache data`);
  console.log(`   musicDebug.clearCache() - Clear similarity cache data`);
  console.log(`   musicDebug.clearEnhancedCache() - Clear enhanced generator cache`);
  console.log(`🔍 Artist disambiguation:`);
  console.log(`   musicDebug.testDisambiguation('Artist Name') - Test disambiguation for an artist`);
  console.log(`   musicDebug.testDisambiguatedSearch('Artist Name') - Test search with disambiguation`);
  console.log(`   musicDebug.getAmbiguousArtists() - List all known ambiguous artists`);
  console.log(`   musicDebug.testAllAmbiguous() - Test all ambiguous artists`);
  console.log(`🚀 Enhanced power hour debugging:`);
  console.log(`   musicDebug.testEnhancedDiscovery('Artist Name') - Test artist discovery step`);
  console.log(`   musicDebug.testSmallPowerHour('Artist Name') - Test small power hour generation`);
  console.log(`   musicDebug.compareDiscoveryMethods('Artist Name') - Compare Discovery Tester vs Enhanced Generator`);

  // Auto-run disabled to prevent unnecessary startup requests
  // Uncomment below to enable automatic testing on startup
  /*
  setTimeout(() => {
    console.log(`🔬 Running automatic diagnosis for Goose...`);
    testSimilarityDiscovery('Goose').then(result => {
      console.log(`📊 Auto-diagnosis complete:`, result);
      console.log(`💾 Cache stats:`, persistentCacheService.getStatistics());
    });
  }, 2000);
  */
}
