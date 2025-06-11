/**
 * Cache Management Panel
 * Interface for monitoring and managing the persistent cache system
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CloudDownload as ImportIcon,
  CloudUpload as ExportIcon,
  Delete as ClearIcon,
  Refresh as RefreshIcon,
  TrendingUp as WarmIcon
} from '@mui/icons-material';
import { persistentCacheService, CacheStatistics } from '../services/persistentCacheService';
import { enhancedPowerHourGenerator } from '../services/enhancedPowerHourGenerator';

const CacheManagementPanel: React.FC = () => {
  const [statistics, setStatistics] = useState<CacheStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [warmCacheDialogOpen, setWarmCacheDialogOpen] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [warmCacheArtists, setWarmCacheArtists] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatistics();
    const interval = setInterval(loadStatistics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = () => {
    try {
      const stats = persistentCacheService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load cache statistics:', error);
    }
  };

  const handleExportCache = () => {
    try {
      const data = enhancedPowerHourGenerator.exportCache();
      setExportData(data);
      setExportDialogOpen(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export cache data' });
    }
  };

  const handleImportCache = () => {
    try {
      const success = enhancedPowerHourGenerator.importCache(importData);
      if (success) {
        setMessage({ type: 'success', text: 'Cache data imported successfully' });
        setImportDialogOpen(false);
        setImportData('');
        loadStatistics();
      } else {
        setMessage({ type: 'error', text: 'Failed to import cache data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid cache data format' });
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached data? This cannot be undone.')) {
      try {
        enhancedPowerHourGenerator.clearCache();
        setMessage({ type: 'success', text: 'Cache cleared successfully' });
        loadStatistics();
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to clear cache' });
      }
    }
  };

  const handleWarmCache = async () => {
    const artists = warmCacheArtists
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (artists.length === 0) {
      setMessage({ type: 'error', text: 'Please enter at least one artist name' });
      return;
    }

    setLoading(true);
    try {
      await enhancedPowerHourGenerator.warmCache(artists);
      setMessage({ type: 'success', text: `Cache warmed for ${artists.length} artists` });
      setWarmCacheDialogOpen(false);
      setWarmCacheArtists('');
      loadStatistics();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to warm cache' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard' });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!statistics) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading cache statistics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🗄️ Cache Management
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)}
          sx={{ mb: 3 }}
        >
          {message.text}
        </Alert>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Entries
              </Typography>
              <Typography variant="h4">
                {statistics.totalEntries.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Hit Rate
              </Typography>
              <Typography variant="h4" color="primary">
                {statistics.hitRate.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={statistics.hitRate} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cache Size
              </Typography>
              <Typography variant="h4">
                {formatBytes(statistics.totalSize)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography variant="h4" color="warning.main">
                {statistics.expiringEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<ExportIcon />}
          onClick={handleExportCache}
        >
          Export Cache
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<ImportIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import Cache
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<WarmIcon />}
          onClick={() => setWarmCacheDialogOpen(true)}
          disabled={loading}
        >
          Warm Cache
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStatistics}
        >
          Refresh
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<ClearIcon />}
          onClick={handleClearCache}
        >
          Clear All
        </Button>
      </Box>

      {/* Detailed Statistics */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">📊 Detailed Statistics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Cache Performance
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Cache Hits</TableCell>
                      <TableCell align="right">{statistics.hitCount.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cache Misses</TableCell>
                      <TableCell align="right">{statistics.missCount.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Oldest Entry</TableCell>
                      <TableCell align="right">{formatDate(statistics.oldestEntry)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Newest Entry</TableCell>
                      <TableCell align="right">{formatDate(statistics.newestEntry)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Popular Artists
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {statistics.popularArtists.map((artist, index) => (
                  <Chip 
                    key={index} 
                    label={artist} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Recently Accessed
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {statistics.recentlyAccessed.map((artist, index) => (
                  <Chip 
                    key={index} 
                    label={artist} 
                    size="small" 
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Export Cache Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Copy this data to backup your cache or share with other instances:
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={exportData}
            variant="outlined"
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(exportData)}>
            Copy to Clipboard
          </Button>
          <Button onClick={() => setExportDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Cache Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Paste exported cache data to restore or merge with existing cache:
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            variant="outlined"
            placeholder="Paste cache data here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportCache}
            variant="contained"
            disabled={!importData.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Warm Cache Dialog */}
      <Dialog open={warmCacheDialogOpen} onClose={() => setWarmCacheDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Warm Cache</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter artist names (one per line) to pre-populate the cache:
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            value={warmCacheArtists}
            onChange={(e) => setWarmCacheArtists(e.target.value)}
            variant="outlined"
            placeholder="Taylor Swift&#10;Drake&#10;The Beatles&#10;..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarmCacheDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleWarmCache}
            variant="contained"
            disabled={loading || !warmCacheArtists.trim()}
          >
            {loading ? 'Warming...' : 'Start Warming'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CacheManagementPanel;
