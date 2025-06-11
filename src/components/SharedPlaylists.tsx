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
  Person as PersonIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
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
  clearSharedPlaylistsLocal,
  getSharedPlaylistsLocal,
  saveSharedPlaylistLocal,
} from '../utils/sharedPlaylistUtils';
import { authService } from '../services/authService';
import { firebasePlaylistService } from '../services/firebasePlaylistService';
import { recordPlaylistDownload } from '../utils/playlistRating';
import { importPlaylistByCode } from '../utils/playlistImport';
import { useAuth, useAuthStatus } from '../contexts/AuthContext';
import { LoginModal } from './auth';
import SharedPlaylistCard from './SharedPlaylistCard';
import AdminPanel from './AdminPanel';
import { canManageCommunity } from '../utils/authUtils';
import DrinkingClipImportDialog from './DrinkingClipImportDialog';
import { DrinkingClipData } from '../utils/playlistImport';

const SharedPlaylists: React.FC = () => {
  const theme = useTheme();
  const { user, canAccessFeature } = useAuth();
  const { isAuthenticated, isAnonymous, hasFullAccount, canAccessCommunityFeatures } = useAuthStatus();

  const [playlists, setPlaylists] = useState<SharedPlaylist[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<SharedPlaylist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<SharedPlaylist[]>([]);

  // Ensure arrays are always defined
  const safePlaylists = Array.isArray(playlists) ? playlists : [];
  const safeUserPlaylists = Array.isArray(userPlaylists) ? userPlaylists : [];
  const safeFilteredPlaylists = Array.isArray(filteredPlaylists) ? filteredPlaylists : [];
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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Drinking clip import dialog state
  const [drinkingClipDialogOpen, setDrinkingClipDialogOpen] = useState(false);
  const [pendingDrinkingClip, setPendingDrinkingClip] = useState<DrinkingClipData | null>(null);
  const [pendingPlaylistName, setPendingPlaylistName] = useState<string>('');

  // Get available filter options
  const availableTags = useMemo(() => {
    try {
      return getAllTags(safePlaylists);
    } catch (error) {
      console.error('Error getting available tags:', error);
      return [];
    }
  }, [safePlaylists]);

  const availableCreators = useMemo(() => {
    try {
      return getAllCreators(safePlaylists);
    } catch (error) {
      console.error('Error getting available creators:', error);
      return [];
    }
  }, [safePlaylists]);

  // Load playlists on component mount and when category changes
  useEffect(() => {
    loadPlaylists();
  }, [selectedCategory]);

  // Debug function - expose to window for testing
  useEffect(() => {
    const debugFunctions = {
      createTestPlaylist: async () => {
        if (!authService.isAuthenticated()) {
          await authService.autoSignIn();
        }

        const testPlaylist = {
          id: `test_playlist_${Date.now()}`,
          name: 'Test Shared Playlist',
          clips: [
            {
              id: 'test_clip_1',
              videoId: 'dQw4w9WgXcQ',
              title: 'Rick Astley - Never Gonna Give You Up',
              artist: 'Rick Astley',
              startTime: 0,
              duration: 60,
              thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/medium.jpg'
            }
          ],
          date: new Date().toISOString(),
          isPublic: true,
          shareCode: `TEST${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          creator: 'TestUser',
          description: 'A test playlist for debugging owner actions',
          rating: 0,
          downloadCount: 0,
          tags: ['test', 'debug'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          originalPlaylistId: `test_playlist_${Date.now()}`
        };

        try {
          const result = await firebasePlaylistService.sharePlaylist(testPlaylist);
          console.log('✅ Test playlist created:', result);
          loadPlaylists();
          return result;
        } catch (error) {
          console.error('❌ Error creating test playlist:', error);
          throw error;
        }
      },
      checkAuth: () => {
        console.log('Auth status:', authService.isAuthenticated());
        console.log('Current user:', authService.getCurrentUser());
      },
      checkPlaylists: () => {
        console.log('Community playlists:', playlists);
        console.log('User playlists:', userPlaylists);

        // Check if playlists have creatorId field
        playlists.forEach(playlist => {
          console.log(`Playlist "${playlist.name}" (${playlist.id}):`, {
            hasCreatorId: 'creatorId' in playlist,
            creatorId: (playlist as any).creatorId,
            creator: playlist.creator
          });
        });
      },
      fixPlaylistOwnership: async () => {
        // Add creatorId to playlists that don't have it
        if (!authService.isAuthenticated()) {
          await authService.autoSignIn();
        }

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          console.error('Not authenticated');
          return;
        }

        console.log('🔧 Fixing playlist ownership for user:', currentUser.uid);

        // Get all playlists and add creatorId to those created by current user
        for (const playlist of playlists) {
          if (!(playlist as any).creatorId) {
            console.log('🔧 Adding creatorId to playlist:', playlist.name);
            try {
              await firebasePlaylistService.updatePlaylist(playlist.id, {
                creatorId: currentUser.uid
              });
              console.log('✅ Updated playlist:', playlist.name);
            } catch (error) {
              console.error('❌ Error updating playlist:', playlist.name, error);
            }
          }
        }

        loadPlaylists(); // Reload after fixing
      },
      clearLocalStorage: () => {
        // Clear localStorage playlists
        const success = clearSharedPlaylistsLocal();
        if (success) {
          console.log('✅ Cleared localStorage playlists');
          loadPlaylists(); // Refresh the display
        } else {
          console.error('❌ Failed to clear localStorage playlists');
        }
      }
    };

    // Expose debug functions to window for console access
    (window as any).communityDebug = debugFunctions;
  }, [playlists, userPlaylists]);



  // Reload playlists when authentication state changes or category changes
  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated, selectedCategory]);

  // Listen for playlist sharing events to refresh the community
  useEffect(() => {
    const handlePlaylistShared = () => {
      console.log('📢 Playlist shared event received, refreshing community playlists...');
      loadPlaylists();
    };

    window.addEventListener('playlistShared', handlePlaylistShared);

    return () => {
      window.removeEventListener('playlistShared', handlePlaylistShared);
    };
  }, []);

  // Filter playlists when filters change
  useEffect(() => {
    applyFilters();
  }, [playlists, userPlaylists, selectedCategory, searchQuery, selectedTags, selectedCreator, sortBy, sortOrder, minRating]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      // Load shared playlists using hybrid approach
      let loadedPlaylists = await getSharedPlaylists(selectedCategory);

      // Filter out any demo playlists that might still exist
      loadedPlaylists = loadedPlaylists.filter(playlist =>
        !playlist.id.startsWith('demo_') &&
        !['PARTY2024', 'CHILL001', 'ROCK2024'].includes(playlist.shareCode)
      );

      setPlaylists(loadedPlaylists);

      // Load user's own playlists if authenticated
      if (isAuthenticated) {
        const userOwnedPlaylists = await firebasePlaylistService.getUserPlaylists();
        setUserPlaylists(userOwnedPlaylists);
      } else {
        setUserPlaylists([]);
      }
    } catch (error) {
      console.error('Error loading shared playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      // Use user playlists for "my-playlists" category, otherwise use public playlists
      let sourcePlaylist = selectedCategory === 'my-playlists' ? safeUserPlaylists : safePlaylists;

      // For "my-playlists", ensure we only show playlists owned by the current user
      // and avoid duplicates by filtering out any that appear in both arrays
      if (selectedCategory === 'my-playlists') {
        sourcePlaylist = safeUserPlaylists;
      } else {
        // For community playlists, exclude user's own playlists to avoid duplicates
        const currentUser = authService.getCurrentUser();
        if (currentUser && safeUserPlaylists.length > 0) {
          sourcePlaylist = safePlaylists.filter(playlist =>
            !safeUserPlaylists.some(userPlaylist => userPlaylist.id === playlist.id)
          );
        } else {
          sourcePlaylist = safePlaylists;
        }
      }

      // Ensure sourcePlaylist is an array
      if (!Array.isArray(sourcePlaylist)) {
        console.warn('sourcePlaylist is not an array, using empty array');
        sourcePlaylist = [];
      }

      // Debug logging to understand duplicate issues
      console.log('🔍 Filtering Debug:', {
        selectedCategory,
        sourcePlaylistCount: sourcePlaylist.length,
        sourcePlaylistIds: sourcePlaylist.map(p => p?.id || 'unknown'),
        duplicateIds: sourcePlaylist.map(p => p?.id || 'unknown').filter((id, index, arr) => arr.indexOf(id) !== index)
      });

      const filters: SharedPlaylistFilters = {
        category: selectedCategory === 'my-playlists' ? 'new' : selectedCategory, // Treat my-playlists as 'new' for filtering
        searchQuery: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        creator: selectedCreator || undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sortBy,
        sortOrder,
      };

      const filtered = filterSharedPlaylists(sourcePlaylist, filters);

      // Ensure filtered is an array before processing
      if (!Array.isArray(filtered)) {
        console.warn('filterSharedPlaylists returned non-array, using empty array');
        setFilteredPlaylists([]);
        return;
      }

      // Remove any potential duplicates based on ID
      const uniqueFiltered = filtered.filter((playlist, index, arr) =>
        playlist && playlist.id && arr.findIndex(p => p && p.id === playlist.id) === index
      );

      console.log('🔍 Filter Results:', {
        beforeDedup: filtered.length,
        afterDedup: uniqueFiltered.length,
        removedDuplicates: filtered.length - uniqueFiltered.length
      });

      setFilteredPlaylists(uniqueFiltered);
    } catch (error) {
      console.error('Error in applyFilters:', error);
      setFilteredPlaylists([]);
    }
  };

  const handleImport = async (playlist: SharedPlaylist) => {
    try {
      // Use the proper import function that converts to regular YouTube playlist
      const result = await importPlaylistByCode(playlist.shareCode);

      if (result.success) {
        console.log(`✅ Successfully imported playlist: ${playlist.name}`);
        console.log(`✅ Playlist saved as regular YouTube playlist`);

        // Check if there's a new drinking clip to import
        if (result.hasNewDrinkingClip && result.drinkingClip) {
          setPendingDrinkingClip(result.drinkingClip);
          setPendingPlaylistName(playlist.name);
          setDrinkingClipDialogOpen(true);
        }

        // Record download if user is authenticated
        if (isAuthenticated) {
          recordPlaylistDownload(playlist.id);
        }
      } else {
        console.error(`❌ Failed to import playlist: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Error importing playlist:', error);
    }
  };

  const handlePreview = (playlist: SharedPlaylist) => {
    // This would open a preview dialog or navigate to a preview page
    console.log(`Previewing playlist: ${playlist.name}`);
  };

  const handlePlaylistUpdate = (updatedPlaylist: SharedPlaylist) => {
    // Update in user playlists
    setUserPlaylists(prev =>
      prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p)
    );

    // Update in main playlists if it's public
    if (updatedPlaylist.isPublic) {
      setPlaylists(prev =>
        prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p)
      );
    } else {
      // Remove from main playlists if it became private
      setPlaylists(prev => prev.filter(p => p.id !== updatedPlaylist.id));
    }

    // Refresh filters
    applyFilters();
  };

  const handlePlaylistDelete = (playlistId: string) => {
    // Remove from user playlists
    setUserPlaylists(prev => prev.filter(p => p.id !== playlistId));

    // Remove from main playlists
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));

    // Refresh filters
    applyFilters();
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
        console.log('✅ Successfully imported playlist:', result.message);
        console.log('✅ Playlist saved as regular YouTube playlist and should appear on Playlists page');

        // Check if there's a new drinking clip to import
        if (result.hasNewDrinkingClip && result.drinkingClip && result.playlist) {
          setPendingDrinkingClip(result.drinkingClip);
          setPendingPlaylistName(result.playlist.name);
          setDrinkingClipDialogOpen(true);
        }
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

  // Authentication prompt handler
  const handleAuthenticationRequired = (message: string) => {
    setAuthPromptMessage(message);
    setLoginModalOpen(true);
  };

  // Category tabs configuration
  const categories = [
    { value: 'featured', label: 'Featured', icon: <FeaturedIcon /> },
    { value: 'highly-rated', label: 'Highly Rated', icon: <StarIcon /> },
    { value: 'trending', label: 'Trending', icon: <TrendingIcon /> },
    { value: 'new', label: 'New', icon: <NewIcon /> },
    ...(isAuthenticated ? [{ value: 'my-playlists', label: 'My Playlists', icon: <PersonIcon /> }] : []),
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

        {/* Authentication and playlist status */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Status: {isAuthenticated
                  ? (isAnonymous ? '🔒 Anonymous Account' : '✅ Full Account')
                  : '❌ Not Signed In'
                } |
                Community Playlists: {playlists.length} |
                Your Playlists: {userPlaylists.length}
              </Typography>
            </Box>

            {!isAuthenticated && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleAuthenticationRequired('Sign in to access all community features, including sharing your own playlists and managing your collection.')}
                startIcon={<PersonIcon />}
              >
                Sign In
              </Button>
            )}

            {isAuthenticated && isAnonymous && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleAuthenticationRequired('Upgrade to a full account to share playlists and access advanced community features.')}
                startIcon={<PersonIcon />}
              >
                Upgrade Account
              </Button>
            )}

            {/* Admin Panel Button */}
            {canManageCommunity(user) && (
              <Button
                variant="contained"
                size="small"
                onClick={() => setAdminPanelOpen(true)}
                startIcon={<AdminPanelSettingsIcon />}
                color="warning"
              >
                Admin Panel
              </Button>
            )}
          </Box>
        </Box>
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
          <Grid size={{ xs: 12, md: 4 }}>
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
          <Grid size={{ xs: 12, md: 3 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
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

          {/* Refresh and Clear filters */}
          <Grid size={{ xs: 6, md: 1 }}>
            <Button
              variant="outlined"
              onClick={loadPlaylists}
              startIcon={<RefreshIcon />}
              fullWidth
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 1 }}>
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
          {selectedCategory === 'my-playlists'
            ? 'You haven\'t created any playlists yet. Share a playlist to see it here!'
            : 'No playlists found matching your criteria. Try adjusting your filters.'
          }
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            {selectedCategory === 'my-playlists' ? 'Your Playlists' : 'Community Playlists'}
            ({filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''})
          </Typography>

          <Grid container spacing={3}>
            {filteredPlaylists.map((playlist, index) => (
              <Grid key={`${selectedCategory}-${playlist.id}-${index}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <SharedPlaylistCard
                  playlist={playlist}
                  onImport={handleImport}
                  onPreview={handlePreview}
                  onUpdate={handlePlaylistUpdate}
                  onDelete={handlePlaylistDelete}
                  showOwnerActions={selectedCategory === 'my-playlists'} // Only show owner actions in "My Playlists" tab
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

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          // Reload playlists after successful authentication
          loadPlaylists();
        }}
        title="Join the Community"
        subtitle={authPromptMessage || 'Sign in to access all community features'}
      />

      {/* Admin Panel */}
      <AdminPanel
        open={adminPanelOpen}
        onClose={() => {
          setAdminPanelOpen(false);
          // Reload playlists after admin actions
          loadPlaylists();
        }}
      />

      {/* Drinking Clip Import Dialog */}
      {pendingDrinkingClip && (
        <DrinkingClipImportDialog
          open={drinkingClipDialogOpen}
          onClose={() => {
            setDrinkingClipDialogOpen(false);
            setPendingDrinkingClip(null);
            setPendingPlaylistName('');
          }}
          drinkingClip={pendingDrinkingClip}
          playlistName={pendingPlaylistName}
        />
      )}
    </Container>
  );
};

export default SharedPlaylists;
