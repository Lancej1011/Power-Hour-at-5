import React, { useState, useCallback, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Container,
  Fade,
  Zoom,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import ModernSearchCard from './ModernSearchCard';
import ModernPagination from './ModernPagination';
import ModernFilters from './ModernFilters';
import {
  YouTubeVideo,
  YouTubeChannel,
  YouTubeSearchResult,
  YouTubeSearchOptions,
  searchYouTubeEnhanced,
  searchYouTubeChannels,
  getChannelVideos,
  createClipFromVideo,
} from '../utils/youtubeUtils';

interface YouTubeSearchV2Props {
  editingPlaylist?: any;
  onPlaylistUpdated?: (playlist: any) => void;
}

const YouTubeSearchV2: React.FC<YouTubeSearchV2Props> = ({
  editingPlaylist,
  onPlaylistUpdated,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResult, setSearchResult] = useState<YouTubeSearchResult | null>(null);
  const [channelPagination, setChannelPagination] = useState<any>(null);
  const [channelVideoResult, setChannelVideoResult] = useState<YouTubeSearchResult | null>(null);

  // Filter state
  const [searchMode, setSearchMode] = useState<'videos' | 'channels'>('videos');
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [videoDuration, setVideoDuration] = useState('any');
  const [channelSortOrder, setChannelSortOrder] = useState('relevance');
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Video player state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);

  // Search history and suggestions
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('youtube_search_history_v2');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('youtube_search_history_v2', JSON.stringify(newHistory));
  }, [searchHistory]);

  // Generate search suggestions
  const generateSuggestions = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions = [
      ...searchHistory.filter(h => h.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
      // Add some popular search suggestions based on the query
      ...(query.length > 2 ? [
        `${query} official music video`,
        `${query} live performance`,
        `${query} acoustic version`,
        `${query} remix`,
        `${query} cover`,
      ].slice(0, 5 - Math.min(3, searchHistory.filter(h => h.toLowerCase().includes(query.toLowerCase())).length)) : [])
    ];

    setSearchSuggestions([...new Set(suggestions)].slice(0, 5));
  }, [searchHistory]);

  // Main search function
  const handleSearch = useCallback(async (pageToken?: string, resetPage: boolean = true) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSelectedChannel(null);
    setSearchError(null);

    try {
      if (searchMode === 'channels') {
        const options = {
          maxResults: resultsPerPage,
          pageToken,
          sortOrder: channelSortOrder
        };

        const result = await searchYouTubeChannels(searchQuery, null, options);
        setChannelResults(result.channels);
        setChannelPagination(result.pagination);
        setSearchResults([]);
        setSearchResult(null);
      } else {
        const options: YouTubeSearchOptions = {
          maxResults: resultsPerPage,
          pageToken,
          order: sortOrder as any,
          videoDuration: videoDuration as any,
          useYtDlp: true, // Always use yt-dlp for V2
        };

        const result = await searchYouTubeEnhanced(searchQuery, null, options);
        setSearchResult(result);
        setSearchResults(result.videos);
        setChannelResults([]);
        setChannelPagination(null);
      }

      if (resetPage) {
        setCurrentPage(1);
        saveToHistory(searchQuery);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error.message || 'Search failed. Please try again.');

      // Clear results on error
      if (searchMode === 'channels') {
        setChannelResults([]);
        setChannelPagination(null);
      } else {
        setSearchResults([]);
        setSearchResult(null);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, resultsPerPage, sortOrder, videoDuration, searchMode, channelSortOrder, saveToHistory]);

  // Handle channel selection
  const handleChannelSelect = useCallback(async (channel: YouTubeChannel) => {
    setSelectedChannel(channel);
    setLoading(true);
    setSearchError(null);

    try {
      const options: YouTubeSearchOptions = {
        maxResults: resultsPerPage,
        order: 'date'
      };

      console.log(`🔍 Loading videos for channel: ${channel.title} (${channel.id})`);
      const result = await getChannelVideos(channel.id, null, options);
      setChannelVideoResult(result);
      setChannelVideos(result.videos);
      setCurrentPage(1);
      setChannelResults([]);
      console.log(`✅ Loaded ${result.videos.length} videos for ${channel.title}`);

      // Show a message if we got an empty result due to restrictions
      if (result.videos.length === 0 && result.error) {
        setSearchError(result.error);
      } else if (result.videos.length === 0) {
        // Provide helpful alternative when no videos are found
        setSearchError(`Unable to load videos from ${channel.title} due to YouTube's bot protection. Try searching for "${channel.title}" in the video search instead.`);
      }
    } catch (error) {
      console.error('Failed to load channel videos:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to load channel videos. ';
      if (error.message.includes('bot')) {
        errorMessage += 'YouTube is temporarily blocking requests. Please try again in a few minutes.';
      } else if (error.message.includes('Sign in')) {
        errorMessage += 'This channel may require sign-in to view videos. Try a different channel.';
      } else if (error.message.includes('throttling')) {
        errorMessage += 'YouTube is rate limiting requests. Please wait a moment and try again.';
      } else {
        errorMessage += 'Please try again or select a different channel.';
      }

      setSearchError(errorMessage);

      // Reset to channel list after error
      setTimeout(() => {
        setSelectedChannel(null);
        setChannelVideos([]);
        setChannelVideoResult(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [resultsPerPage]);

  // Pagination handlers
  const handleNextPage = () => {
    if (searchMode === 'channels' && channelPagination?.nextPageToken) {
      handleSearch(channelPagination.nextPageToken, false);
      setCurrentPage(prev => prev + 1);
    } else {
      const currentResult = selectedChannel ? channelVideoResult : searchResult;
      if (currentResult?.nextPageToken) {
        if (selectedChannel) {
          handleChannelVideosPage(selectedChannel, currentResult.nextPageToken, false);
        } else {
          handleSearch(currentResult.nextPageToken, false);
        }
        setCurrentPage(prev => prev + 1);
      }
    }
  };

  const handlePrevPage = () => {
    if (searchMode === 'channels' && channelPagination?.prevPageToken) {
      handleSearch(channelPagination.prevPageToken, false);
      setCurrentPage(prev => prev - 1);
    } else {
      const currentResult = selectedChannel ? channelVideoResult : searchResult;
      if (currentResult?.prevPageToken) {
        if (selectedChannel) {
          handleChannelVideosPage(selectedChannel, currentResult.prevPageToken, false);
        } else {
          handleSearch(currentResult.prevPageToken, false);
        }
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  const handleChannelVideosPage = useCallback(async (channel: YouTubeChannel, pageToken: string, resetPage: boolean) => {
    setLoading(true);

    try {
      const options: YouTubeSearchOptions = {
        maxResults: resultsPerPage,
        pageToken,
        order: 'date'
      };

      const result = await getChannelVideos(channel.id, null, options);
      setChannelVideoResult(result);
      setChannelVideos(result.videos);

      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to load channel videos page:', error);
      setSearchError('Failed to load more videos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resultsPerPage]);

  // Video actions
  const handlePlayVideo = (video: YouTubeVideo, startTime: number = 0) => {
    setPlayingVideoId(video.id);
    setPlaybackStartTime(startTime);
  };

  const handleClosePlayer = () => {
    setPlayingVideoId(null);
    setPlaybackStartTime(0);
  };

  const handleAddToPlaylist = (video: YouTubeVideo) => {
    // TODO: Implement add to playlist functionality
    console.log('Add to playlist:', video);
  };

  // New search
  const handleNewSearch = () => {
    setCurrentPage(1);
    setSelectedChannel(null);
    setChannelVideos([]);
    setChannelVideoResult(null);
    handleSearch(undefined, true);
  };

  // Key press handler
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleNewSearch();
    }
  };

  // Get current results for display
  const currentResults = selectedChannel ? channelVideos : searchResults;
  const hasResults = currentResults.length > 0 || channelResults.length > 0;
  const hasNextPage = searchMode === 'channels' 
    ? !!channelPagination?.nextPageToken 
    : !!(selectedChannel ? channelVideoResult?.nextPageToken : searchResult?.nextPageToken);
  const hasPrevPage = searchMode === 'channels' 
    ? !!channelPagination?.prevPageToken 
    : !!(selectedChannel ? channelVideoResult?.prevPageToken : searchResult?.prevPageToken);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          YouTube Search V2
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Enhanced YouTube search with modern design and powerful features
        </Typography>

        {/* Search Bar */}
        <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label={searchMode === 'videos' ? 'Search Videos' : 'Search Channels'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                generateSuggestions(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  generateSuggestions(searchQuery);
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={searchMode === 'videos' ? 'Enter song name, artist, or keywords...' : 'Enter channel name or creator...'}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleNewSearch}
              disabled={loading || !searchQuery.trim()}
              sx={{
                minWidth: 120,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(currentTheme.primary, 0.4)}`,
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </Box>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 120, // Account for search button width
                zIndex: 1000,
                mt: 1,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
                boxShadow: `0 8px 32px ${alpha(currentTheme.primary, 0.2)}`,
                border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
              }}
            >
              {searchSuggestions.map((suggestion, index) => (
                <Box
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    setShowSuggestions(false);
                    setTimeout(() => handleNewSearch(), 100);
                  }}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: index < searchSuggestions.length - 1 ? `1px solid ${alpha(currentTheme.primary, 0.1)}` : 'none',
                    '&:hover': {
                      backgroundColor: alpha(currentTheme.primary, 0.1),
                    },
                  }}
                >
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{suggestion}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Search History and Trending */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {/* Search History */}
          {searchHistory.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">Recent:</Typography>
              {searchHistory.slice(0, 5).map((query, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchQuery(query);
                    setTimeout(() => handleNewSearch(), 100);
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.7rem',
                    minHeight: 24,
                    px: 1,
                  }}
                >
                  {query}
                </Button>
              ))}
            </Box>
          )}

          {/* Trending Searches */}
          {!searchQuery && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TrendingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">Trending:</Typography>
              {['power hour music', 'party songs', 'drinking games music', 'upbeat songs', 'dance music'].map((query, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="text"
                  onClick={() => {
                    setSearchQuery(query);
                    setTimeout(() => handleNewSearch(), 100);
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.7rem',
                    minHeight: 24,
                    px: 1,
                    color: currentTheme.secondary,
                    '&:hover': {
                      backgroundColor: alpha(currentTheme.secondary, 0.1),
                    },
                  }}
                >
                  #{query}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <ModernFilters
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          resultsPerPage={resultsPerPage}
          onResultsPerPageChange={setResultsPerPage}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          videoDuration={videoDuration}
          onVideoDurationChange={setVideoDuration}
          channelSortOrder={channelSortOrder}
          onChannelSortOrderChange={setChannelSortOrder}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
          expanded={filtersExpanded}
          onToggleExpanded={() => setFiltersExpanded(!filtersExpanded)}
          onApplyFilters={handleNewSearch}
          loading={loading}
        />
      </Box>

      {/* Error Display */}
      {searchError && (
        <Fade in={!!searchError}>
          <Box sx={{ mb: 4 }}>
            <Alert
              severity={searchError.includes('bot') || searchError.includes('throttling') ? 'warning' : 'error'}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {selectedChannel && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setSearchError(null);
                        setSelectedChannel(null);
                        setChannelVideos([]);
                        setChannelVideoResult(null);
                      }}
                    >
                      Back to Channels
                    </Button>
                  )}
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setSearchError(null);
                      if (selectedChannel) {
                        handleChannelSelect(selectedChannel);
                      } else {
                        handleSearch(undefined, true);
                      }
                    }}
                    startIcon={<RefreshIcon />}
                  >
                    Retry
                  </Button>
                  {selectedChannel && searchError.includes('bot protection') && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setSearchError(null);
                        setSelectedChannel(null);
                        setChannelVideos([]);
                        setChannelVideoResult(null);
                        setSearchQuery(selectedChannel.title);
                        setSearchMode('videos');
                        setTimeout(() => handleNewSearch(), 100);
                      }}
                      startIcon={<SearchIcon />}
                    >
                      Search Videos Instead
                    </Button>
                  )}
                </Box>
              }
            >
              <AlertTitle>
                {searchError.includes('bot') || searchError.includes('throttling') ? 'Rate Limited' : 'Error'}
              </AlertTitle>
              {searchError}
            </Alert>
          </Box>
        </Fade>
      )}

      {/* Loading State */}
      {loading && !hasResults && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 2, color: currentTheme.primary }} />
            <Typography variant="h6" color="text.secondary">
              {selectedChannel ? `Loading videos from ${selectedChannel.title}...` : 'Searching YouTube...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedChannel ? 'Getting channel videos with anti-detection measures' : 'Using yt-dlp for unlimited results'}
            </Typography>
            {selectedChannel && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                This may take a moment to avoid YouTube's bot detection
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* No Results */}
      {!loading && !hasResults && searchQuery.trim() && !searchError && (
        <Fade in={true}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SearchIcon sx={{ fontSize: 48, color: currentTheme.primary }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              No {searchMode} found
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              for "{searchQuery}"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              Try different search terms, check your spelling, or adjust your filters to find what you're looking for.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => handleSearch(undefined, true)}
                startIcon={<RefreshIcon />}
                sx={{
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                }}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setSearchError(null);
                }}
                sx={{ borderRadius: 2 }}
              >
                Clear Search
              </Button>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Welcome State */}
      {!loading && !hasResults && !searchQuery.trim() && !searchError && (
        <Fade in={true}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box
              sx={{
                width: 160,
                height: 160,
                mx: 'auto',
                mb: 4,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                  opacity: 0.3,
                  animation: 'pulse 3s infinite',
                },
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 0.3 },
                  '50%': { transform: 'scale(1.1)', opacity: 0.1 },
                },
              }}
            >
              <SearchIcon sx={{ fontSize: 64, color: 'white' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Ready to Search
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Enter your search terms above to find videos and channels with our enhanced YouTube search experience.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
              <Typography variant="body2" color="text.secondary">
                ✨ Unlimited results • 🎯 Advanced filters • ⚡ Fast search • 🎨 Modern design
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Channel Results */}
      {channelResults.length > 0 && (
        <Fade in={channelResults.length > 0}>
          <Box sx={{ mb: 4 }}>
            {/* Results Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                📺 Channel Results
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({channelResults.length} channels)
                </Typography>
              </Typography>
            </Box>

            {/* Channel Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: cardSize === 'small' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                  lg: cardSize === 'small' ? 'repeat(5, 1fr)' : cardSize === 'large' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  xl: cardSize === 'small' ? 'repeat(6, 1fr)' : cardSize === 'large' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                },
                gap: 3,
              }}
            >
              {channelResults.map((channel, index) => (
                <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }} key={channel.id}>
                  <Box>
                    <ModernSearchCard
                      channel={channel}
                      size={cardSize}
                      onChannelClick={handleChannelSelect}
                      uniformHeight={true}
                    />
                  </Box>
                </Zoom>
              ))}
            </Box>

            {/* Channel Pagination */}
            {(channelPagination?.nextPageToken || channelPagination?.prevPageToken) && (
              <Box sx={{ mt: 4 }}>
                <ModernPagination
                  currentPage={currentPage}
                  totalResults={channelPagination?.totalResults}
                  resultsPerPage={resultsPerPage}
                  hasNextPage={!!channelPagination?.nextPageToken}
                  hasPrevPage={!!channelPagination?.prevPageToken}
                  onPageChange={(page) => setCurrentPage(page)}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  loading={loading}
                />
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* Video Results */}
      {currentResults.length > 0 && (
        <Fade in={currentResults.length > 0}>
          <Box sx={{ mb: 4 }}>
            {/* Results Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedChannel ? (
                  <>
                    📺 {selectedChannel.title} Videos
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedChannel(null);
                        setChannelVideos([]);
                        setChannelVideoResult(null);
                      }}
                      sx={{ ml: 2, borderRadius: 2 }}
                    >
                      ← Back to Channels
                    </Button>
                  </>
                ) : (
                  '🎬 Video Results'
                )}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({currentResults.length} videos)
                </Typography>
              </Typography>
            </Box>

            {/* Video Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: cardSize === 'small' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                  lg: cardSize === 'small' ? 'repeat(5, 1fr)' : cardSize === 'large' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  xl: cardSize === 'small' ? 'repeat(6, 1fr)' : cardSize === 'large' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                },
                gap: 3,
              }}
            >
              {currentResults.map((video, index) => (
                <Zoom in={true} style={{ transitionDelay: `${index * 50}ms` }} key={video.id}>
                  <Box>
                    <ModernSearchCard
                      video={video}
                      size={cardSize}
                      onPlay={handlePlayVideo}
                      onAdd={handleAddToPlaylist}
                      showActions={true}
                      uniformHeight={true}
                    />
                  </Box>
                </Zoom>
              ))}
            </Box>

            {/* Video Pagination */}
            {(hasNextPage || hasPrevPage) && (
              <Box sx={{ mt: 4 }}>
                <ModernPagination
                  currentPage={currentPage}
                  totalResults={selectedChannel ? channelVideoResult?.totalResults : searchResult?.totalResults}
                  resultsPerPage={resultsPerPage}
                  hasNextPage={hasNextPage}
                  hasPrevPage={hasPrevPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  loading={loading}
                />
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* Video Player Dialog */}
      <Dialog
        open={!!playingVideoId}
        onClose={handleClosePlayer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            color: 'white',
            backgroundColor: 'black',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Video Player
          </Typography>
          <IconButton onClick={handleClosePlayer} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: 'black', p: 0 }}>
          {playingVideoId && (
            <YouTube
              videoId={playingVideoId}
              opts={{
                width: '100%',
                height: '500',
                playerVars: {
                  autoplay: 1,
                  start: playbackStartTime,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
              onReady={(event) => {
                if (playbackStartTime > 0) {
                  event.target.seekTo(playbackStartTime);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default YouTubeSearchV2;
