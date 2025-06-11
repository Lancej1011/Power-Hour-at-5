/**
 * Debug Page for Testing Music Discovery
 * Temporary page for debugging the artist similarity system
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { testSimilarityDiscovery, testLastFmApiDirect, SimilarityTestResult } from '../utils/musicDiscoveryDebug';
import CacheManagementPanel from '../components/CacheManagementPanel';
import ArtistDisambiguationDialog from '../components/ArtistDisambiguationDialog';
import { enhancedPowerHourGenerator } from '../services/enhancedPowerHourGenerator';
import { artistDisambiguationService, ArtistDisambiguationInfo } from '../services/artistDisambiguationService';

const DebugPage: React.FC = () => {
  const [artist, setArtist] = useState('Goose');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimilarityTestResult | null>(null);
  const [directApiResult, setDirectApiResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [powerHourResult, setPowerHourResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [disambiguationOpen, setDisambiguationOpen] = useState(false);
  const [disambiguationSuggestions, setDisambiguationSuggestions] = useState<ArtistDisambiguationInfo[]>([]);

  const handleTestSimilarity = async () => {
    if (!artist.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    setDirectApiResult(null);

    try {
      console.log(`🧪 Testing similarity discovery for: ${artist}`);
      
      // Test direct API first
      const directResult = await testLastFmApiDirect(artist);
      setDirectApiResult(directResult);
      
      // Test through service
      const serviceResult = await testSimilarityDiscovery(artist);
      setResults(serviceResult);
      
    } catch (err) {
      console.error('Debug test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPreset = (presetArtist: string) => {
    setArtist(presetArtist);
    setTimeout(() => handleTestSimilarity(), 100);
  };

  const handleTestPowerHour = async () => {
    if (!artist.trim()) return;

    setLoading(true);
    setError(null);
    setPowerHourResult(null);

    try {
      console.log(`🚀 Testing Enhanced Power Hour for: ${artist}`);

      const result = await enhancedPowerHourGenerator.generatePowerHour({
        seedArtist: artist,
        totalTracks: 10, // Small test
        prioritizeCachedResults: true,
        maxApiCalls: 5
      }, (progress) => {
        console.log(`📈 Progress: ${progress.currentTrack}/${progress.totalTracks} - ${progress.currentStep}`);
      });

      setPowerHourResult(result);

    } catch (err) {
      console.error('Enhanced power hour test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDisambiguation = () => {
    if (!artist.trim()) return;

    const suggestions = artistDisambiguationService.getDisambiguationSuggestions(artist);
    if (suggestions.length > 1) {
      setDisambiguationSuggestions(suggestions);
      setDisambiguationOpen(true);
    } else {
      alert(`No disambiguation needed for "${artist}" - only one match found or artist not in disambiguation database.`);
    }
  };

  const handleDisambiguationSelect = (selectedArtist: ArtistDisambiguationInfo) => {
    console.log(`✅ Selected disambiguation:`, selectedArtist);
    alert(`Selected: ${selectedArtist.name} (${selectedArtist.genres.join(', ')})`);
  };

  const handleCustomSearch = (customQuery: string) => {
    console.log(`🔍 Custom search query:`, customQuery);
    alert(`Custom search: "${customQuery}"`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Enhanced Music Discovery Debug Tool
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Test the comprehensive artist similarity, caching, and power hour generation system.
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="🔍 Discovery Testing" />
        <Tab label="🚀 Power Hour Testing" />
        <Tab label="💾 Cache Management" />
      </Tabs>

      {/* Tab 1: Discovery Testing */}
      {activeTab === 0 && (
        <Box>
          {/* Input Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                label="Artist Name"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                variant="outlined"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && handleTestSimilarity()}
              />
              <Button
                variant="contained"
                onClick={handleTestSimilarity}
                disabled={loading || !artist.trim()}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Test Discovery'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleTestDisambiguation}
                disabled={!artist.trim()}
                sx={{ minWidth: 140 }}
              >
                Test Disambiguation
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="body2" sx={{ width: '100%', mb: 1 }}>
                <strong>Regular Artists:</strong>
              </Typography>
              {['Goose', 'Taylor Swift', 'Drake', 'Led Zeppelin'].map((preset) => (
                <Button
                  key={preset}
                  variant="outlined"
                  size="small"
                  onClick={() => handleTestPreset(preset)}
                  disabled={loading}
                >
                  {preset}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ width: '100%', mb: 1 }}>
                <strong>Ambiguous Artists (test disambiguation):</strong>
              </Typography>
              {['Genesis', 'Bush', 'America', 'Kansas', 'Boston', 'Europe'].map((preset) => (
                <Button
                  key={preset}
                  variant="outlined"
                  size="small"
                  color="warning"
                  onClick={() => handleTestPreset(preset)}
                  disabled={loading}
                >
                  {preset}
                </Button>
              ))}
            </Box>
          </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {(results || directApiResult) && (
        <Box sx={{ mb: 3 }}>
          {/* Direct API Results */}
          {directApiResult && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  🌐 Direct Last.fm API Test
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  {directApiResult.error ? (
                    <Alert severity="error">
                      <Typography variant="subtitle2">API Error:</Typography>
                      <Typography variant="body2" component="pre">
                        {JSON.stringify(directApiResult.error, null, 2)}
                      </Typography>
                    </Alert>
                  ) : directApiResult.similarartists ? (
                    <Alert severity="success">
                      <Typography variant="subtitle2">✅ API Working!</Typography>
                      <Typography variant="body2">
                        Found {directApiResult.similarartists.artist?.length || 0} similar artists
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning">
                      <Typography variant="subtitle2">Unexpected Response Format</Typography>
                    </Alert>
                  )}
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>Raw Response:</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {JSON.stringify(directApiResult, null, 2)}
                  </Typography>
                </Paper>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Service Results */}
          {results && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  🔧 Service Test Results
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                  {/* Configuration Status */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Configuration</Typography>
                    <Typography variant="body2">API Available: {results.lastfmAvailable ? '✅' : '❌'}</Typography>
                    <Typography variant="body2">API Key: {results.lastfmApiKey}</Typography>
                    <Typography variant="body2">Key Valid: {results.lastfmApiKeyValid ? '✅' : '❌'}</Typography>
                  </Paper>

                  {/* Last.fm Results */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Last.fm Results</Typography>
                    <Typography variant="body2">Found: {results.lastfmResults} artists</Typography>
                    {results.lastfmError && (
                      <Typography variant="body2" color="error">Error: {results.lastfmError}</Typography>
                    )}
                    {results.lastfmArtists.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight="bold">Top Artists:</Typography>
                        {results.lastfmArtists.slice(0, 5).map((name, i) => (
                          <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                            {i + 1}. {name} ({results.lastfmScores[i]?.toFixed(3)})
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>

                  {/* Backup Results */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Backup Database</Typography>
                    <Typography variant="body2">Found: {results.backupResults} artists</Typography>
                    {results.backupArtists.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight="bold">Top Artists:</Typography>
                        {results.backupArtists.slice(0, 5).map((name, i) => (
                          <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                            {i + 1}. {name} ({results.backupScores[i]?.toFixed(3)})
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>

                  {/* Recommendation */}
                  <Paper sx={{ p: 2, gridColumn: '1 / -1' }}>
                    <Typography variant="subtitle1" gutterBottom>Recommendation</Typography>
                    <Typography variant="body2">{results.recommendedAction}</Typography>
                  </Paper>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

          {/* Instructions */}
          <Paper sx={{ p: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
            <Typography variant="h6" gutterBottom>Debug Instructions</Typography>
            <Typography variant="body2" component="div">
              <strong>Console Commands:</strong>
              <br />• <code>musicDebug.testLastFmApiDirect('Artist Name')</code> - Test API directly
              <br />• <code>musicDebug.testSimilarityDiscovery('Artist Name')</code> - Test full service
              <br />• <code>musicDebug.testMultiTierDiscovery('Artist Name')</code> - Test multi-tier system
              <br />• <code>musicDebug.testAll()</code> - Test multiple genres
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Tab 2: Power Hour Testing */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>🚀 Enhanced Power Hour Generation Test</Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Test the complete power hour generation system with caching, smart selection, and randomization.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                label="Seed Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                variant="outlined"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && handleTestPowerHour()}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleTestPowerHour}
                disabled={loading || !artist.trim()}
                sx={{ minWidth: 150 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Power Hour'}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['Goose', 'Taylor Swift', 'Drake', 'The Beatles'].map((preset) => (
                <Button
                  key={preset}
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setArtist(preset);
                    setTimeout(() => handleTestPowerHour(), 100);
                  }}
                  disabled={loading}
                >
                  {preset}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Power Hour Results */}
          {powerHourResult && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  🎵 Power Hour Generation Results
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Generation Stats</Typography>
                    <Typography variant="body2">Tracks Generated: {powerHourResult.tracks.length}</Typography>
                    <Typography variant="body2">Cache Hit Rate: {powerHourResult.generationStats.cacheHitRate.toFixed(1)}%</Typography>
                    <Typography variant="body2">API Calls Made: {powerHourResult.generationStats.apiCallsMade}</Typography>
                    <Typography variant="body2">Generation Time: {(powerHourResult.generationStats.generationTimeMs / 1000).toFixed(1)}s</Typography>
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Quality Metrics</Typography>
                    <Typography variant="body2">Diversity Score: {powerHourResult.qualityMetrics.diversityScore.toFixed(2)}</Typography>
                    <Typography variant="body2">Similarity Score: {powerHourResult.qualityMetrics.similarityScore.toFixed(2)}</Typography>
                    <Typography variant="body2">Completion Rate: {powerHourResult.qualityMetrics.completionRate.toFixed(1)}%</Typography>
                  </Paper>

                  <Paper sx={{ p: 2, gridColumn: '1 / -1' }}>
                    <Typography variant="subtitle1" gutterBottom>Generated Tracks (First 10)</Typography>
                    {powerHourResult.tracks.slice(0, 10).map((track: any, index: number) => (
                      <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                        {index + 1}. {track.artist} - {track.song.title} ({track.selectionMethod})
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Tab 3: Cache Management */}
      {activeTab === 2 && (
        <CacheManagementPanel />
      )}

      {/* Artist Disambiguation Dialog */}
      <ArtistDisambiguationDialog
        open={disambiguationOpen}
        onClose={() => setDisambiguationOpen(false)}
        artistName={artist}
        suggestions={disambiguationSuggestions}
        onSelect={handleDisambiguationSelect}
        onCustomSearch={handleCustomSearch}
      />
    </Container>
  );
};

export default DebugPage;
