import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  NewReleases as NewIcon,
  Recommend as FeaturedIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  SharedPlaylist,
  SharedPlaylistFilters,
  PlaylistCategory,
  getSharedPlaylists,
  filterSharedPlaylists,
  getAllTags,
  getAllCreators,
} from '../utils/sharedPlaylistUtils';
import { recordPlaylistDownload } from '../utils/playlistRating';
import { importPlaylistByCode } from '../utils/playlistImport';
import SharedPlaylistCard from './SharedPlaylistCard';

const SharedPlaylists: React.FC = () => {
  const theme = useTheme();
  const [playlists, setPlaylists] = useState<SharedPlaylist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<SharedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PlaylistCategory>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'date' | 'name'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minRating, setMinRating] = useState<number>(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Get available filter options
  const availableTags = useMemo(() => getAllTags(), [playlists]);
  const availableCreators = useMemo(() => getAllCreators(), [playlists]);

  // Load playlists on component mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  // Filter playlists when filters change
  useEffect(() => {
    applyFilters();
  }, [playlists, selectedCategory, searchQuery, selectedTags, selectedCreator, sortBy, sortOrder, minRating]);

  const loadPlaylists = () => {
    setLoading(true);
    try {
      // Load shared playlists from localStorage only
      let loadedPlaylists = getSharedPlaylists();

      // Filter out any demo playlists that might still exist
      loadedPlaylists = loadedPlaylists.filter(playlist =>
        !playlist.id.startsWith('demo_') &&
        !['PARTY2024', 'CHILL001', 'ROCK2024'].includes(playlist.shareCode)
      );

      setPlaylists(loadedPlaylists);
    } catch (error) {
      console.error('Error loading shared playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const filters: SharedPlaylistFilters = {
      category: selectedCategory,
      searchQuery: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      creator: selectedCreator || undefined,
      minRating: minRating > 0 ? minRating : undefined,
      sortBy,
      sortOrder,
    };

    const filtered = filterSharedPlaylists(playlists, filters);
    setFilteredPlaylists(filtered);
  };

  const handleImport = (playlist: SharedPlaylist) => {
    // Record the download
    recordPlaylistDownload(playlist.id);
    
    // Show success message (you might want to use a snackbar here)
    console.log(`Successfully imported playlist: ${playlist.name}`);
  };

  const handlePreview = (playlist: SharedPlaylist) => {
    // This would open a preview dialog or navigate to a preview page
    console.log(`Previewing playlist: ${playlist.name}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCreator('');
    setMinRating(0);
    setSortBy('rating');
    setSortOrder('desc');
  };

  const handleImportByCode = async () => {
    if (!importCode.trim()) {
      setImportError('Please enter a share code');
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const result = await importPlaylistByCode(importCode.trim());

      if (result.success) {
        setImportDialogOpen(false);
        setImportCode('');
        console.log('Successfully imported playlist:', result.message);
        // You might want to show a success snackbar here
      } else {
        setImportError(result.message);
      }
    } catch (error) {
      setImportError('An unexpected error occurred');
      console.error('Import error:', error);
    } finally {
      setImportLoading(false);
    }
  };

  // Category tabs configuration
  const categories = [
    { value: 'featured', label: 'Featured', icon: <FeaturedIcon /> },
    { value: 'highly-rated', label: 'Highly Rated', icon: <StarIcon /> },
    { value: 'trending', label: 'Trending', icon: <TrendingIcon /> },
    { value: 'new', label: 'New', icon: <NewIcon /> },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Community Playlists
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and import amazing Power Hour playlists created by the community
        </Typography>
      </Box>

      {/* Category Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, newValue) => setSelectedCategory(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '1rem',
            },
          }}
        >
          {categories.map((category) => (
            <Tab
              key={category.value}
              value={category.value}
              label={category.label}
              icon={category.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1 }} />
          Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search playlists"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Tags */}
          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              options={availableTags}
              value={selectedTags}
              onChange={(_, newValue) => setSelectedTags(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Tags" placeholder="Select tags" />
              )}
            />
          </Grid>

          {/* Creator */}
          <Grid item xs={12} md={2}>
            <Autocomplete
              options={availableCreators}
              value={selectedCreator}
              onChange={(_, newValue) => setSelectedCreator(newValue || '')}
              renderInput={(params) => (
                <TextField {...params} label="Creator" placeholder="Any creator" />
              )}
            />
          </Grid>

          {/* Sort */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="downloads">Downloads</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Clear filters */}
          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
              fullWidth
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {filteredPlaylists.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No playlists found matching your criteria. Try adjusting your filters.
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''} found
          </Typography>
          
          <Grid container spacing={3}>
            {filteredPlaylists.map((playlist) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={playlist.id}>
                <SharedPlaylistCard
                  playlist={playlist}
                  onImport={handleImport}
                  onPreview={handlePreview}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Import by Code FAB */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setImportDialogOpen(true)}
          sx={{
            borderRadius: 28,
            px: 3,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: theme.shadows[8],
            '&:hover': {
              boxShadow: theme.shadows[12],
            },
          }}
        >
          Import by Code
        </Button>
      </Box>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Playlist by Share Code</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the 8-character share code to import a playlist from another user.
          </Typography>

          <TextField
            fullWidth
            label="Share Code"
            value={importCode}
            onChange={(e) => {
              setImportCode(e.target.value.toUpperCase());
              setImportError('');
            }}
            placeholder="e.g., PARTY2024"
            inputProps={{ maxLength: 8 }}
            error={!!importError}
            helperText={importError || 'Share codes are 8 characters long'}
            sx={{ mb: 2 }}
          />

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleImportByCode}
            variant="contained"
            disabled={importLoading || !importCode.trim()}
          >
            {importLoading ? 'Importing...' : 'Import Playlist'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SharedPlaylists;
