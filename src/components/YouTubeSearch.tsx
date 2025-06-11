import React, { useState, useCallback, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  Radio,
  FormLabel,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  alpha,
  useTheme,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  ExpandMore as ExpandMoreIcon,
  Shuffle as ShuffleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Settings as SettingsIcon,
  Explore as ExploreIcon,
  Edit as EditIcon,
  DragHandle as DragHandleIcon,
  Delete as DeleteIcon,
  SkipPrevious as SkipPreviousIcon,
  SkipNext as SkipNextIcon,
  Repeat as RepeatIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Casino as CasinoIcon,
  QueueMusic as QueueMusicIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  YouTubeVideo,
  YouTubeClip,
  YouTubePlaylist,
  YouTubeSearchResult,
  YouTubeSearchOptions,
  YouTubeChannel,
  searchYouTubeVideos,
  searchYouTubeChannels,
  getChannelVideos,
  getPlaylistVideos,
  createClipFromVideo,
  parseDuration,
  formatTime,
  getThumbnailUrl,
  saveYouTubePlaylist,
  generatePlaylistId,
  createBulkClipsFromVideos,
  generateRandomStartTime,
  formatViewCount,
  formatPublishDate,
  searchYouTubeEnhanced,
} from '../utils/youtubeUtils';
import { useCollaborationStore } from '../stores/collaborationStore';


interface YouTubeSearchProps {
  editingPlaylist?: YouTubePlaylist | null;
  onPlaylistUpdated?: (playlist: YouTubePlaylist) => void;
  specificClipToEdit?: {clip: any; index: number} | null;
  onSpecificClipEditComplete?: () => void;
  onEditingPlaylistChanged?: (playlist: YouTubePlaylist) => void;
}

const YouTubeSearch: React.FC<YouTubeSearchProps> = ({
  editingPlaylist,
  onPlaylistUpdated,
  specificClipToEdit,
  onSpecificClipEditComplete,
  onEditingPlaylistChanged
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const { updateCollaborativePlaylistMetadata } = useCollaborationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<YouTubeSearchResult | null>(null);

  // Pagination and search options
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'date' | 'rating' | 'viewCount' | 'title'>('relevance');
  const [videoDuration, setVideoDuration] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [showFilters, setShowFilters] = useState(false);

  // Channel search
  const [searchMode, setSearchMode] = useState<'videos' | 'channels'>('videos');
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [channelPagination, setChannelPagination] = useState<any>(null);
  const [channelSortOrder, setChannelSortOrder] = useState<string>('music');
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [channelVideoResult, setChannelVideoResult] = useState<YouTubeSearchResult | null>(null);

  // Video playback
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);

  // Card size customization
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showSizeControls, setShowSizeControls] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipStartTime, setClipStartTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(60);
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('60');
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [clipPausedAt, setClipPausedAt] = useState<number | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<YouTubeClip[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [originalPlaylistId, setOriginalPlaylistId] = useState<string | null>(null);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const youtubePlayerRef = useRef<any>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-selection state
  const [selectedVideos, setSelectedVideos] = useState<YouTubeVideo[]>([]);
  const [bulkConfigDialogOpen, setBulkConfigDialogOpen] = useState(false);
  const [timeSelectionMode, setTimeSelectionMode] = useState<'manual' | 'random' | 'same'>('random');
  const [bulkStartTime, setBulkStartTime] = useState(0);
  const [bulkDuration, setBulkDuration] = useState(60);
  const [videoTimeConfigs, setVideoTimeConfigs] = useState<{[videoId: string]: {startTime: number, duration: number}}>({});
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Sequential manual extraction state
  const [sequentialExtractionActive, setSequentialExtractionActive] = useState(false);
  const [sequentialVideos, setSequentialVideos] = useState<YouTubeVideo[]>([]);
  const [currentSequentialIndex, setCurrentSequentialIndex] = useState(0);
  const [sequentialClips, setSequentialClips] = useState<YouTubeClip[]>([]);

  // Enhanced search options
  const [unlimitedSearch, setUnlimitedSearch] = useState(true); // Enable unlimited search by default

  // Direct link input state
  const [inputMode, setInputMode] = useState<'search' | 'video' | 'playlist'>('search');
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [directPlaylistUrl, setDirectPlaylistUrl] = useState('');
  const [linkProcessing, setLinkProcessing] = useState(false);
  const [playlistImportProgress, setPlaylistImportProgress] = useState<{
    isImporting: boolean;
    videosFound: number;
    currentStatus: string;
  }>({
    isImporting: false,
    videosFound: 0,
    currentStatus: ''
  });

  // Initialize editing mode when editingPlaylist is provided
  useEffect(() => {
    if (editingPlaylist) {
      setIsEditingMode(true);
      setOriginalPlaylistId(editingPlaylist.id);
      setCurrentPlaylist([...editingPlaylist.clips]);
      setPlaylistName(editingPlaylist.name);
      console.log('🎬 Editing mode initialized for playlist:', editingPlaylist.name);
      console.log('🎬 Playlist clips:', editingPlaylist.clips.length);
      console.log('🎬 isEditingMode set to:', true);
    } else {
      setIsEditingMode(false);
      setOriginalPlaylistId(null);
      setCurrentPlaylist([]);
      setPlaylistName('');
      console.log('🎬 Editing mode disabled - no editingPlaylist provided');
    }
  }, [editingPlaylist]);

  // Handle specific clip editing when provided
  useEffect(() => {
    if (specificClipToEdit && specificClipToEdit.clip) {
      const clip = specificClipToEdit.clip;
      console.log('🎯 Opening specific clip for editing:', clip.title);
      console.log('🎯 Clip details:', clip);

      // Add a small delay to ensure the component is fully loaded
      const timer = setTimeout(() => {
        // Create a mock video object for the clip
        const mockVideo: YouTubeVideo = {
          id: clip.videoId,
          title: clip.title,
          channelTitle: clip.artist,
          thumbnail: clip.thumbnail,
          duration: 'PT300S', // Default to 5 minutes, will be updated when video loads
          publishedAt: '',
          viewCount: '',
          description: ''
        };

        console.log('🎯 Setting up clip editing dialog...');

        // Set up the clip editing dialog
        setSelectedVideo(mockVideo);
        setClipStartTime(clip.startTime);
        setClipDuration(clip.duration);

        // Set custom duration state based on clip duration
        const isCustomDuration = ![30, 45, 60, 90, 120].includes(clip.duration);
        setUseCustomDuration(isCustomDuration);
        setCustomDurationInput(clip.duration.toString());

        setPreviewVideoId(clip.videoId);

        // Open the dialog after a brief delay to ensure state is set
        setTimeout(() => {
          console.log('🎯 Opening clip dialog...');
          setClipDialogOpen(true);
        }, 100);

        // Mark the specific clip edit as handled
        if (onSpecificClipEditComplete) {
          onSpecificClipEditComplete();
        }
      }, 500); // 500ms delay to ensure component is ready

      return () => clearTimeout(timer);
    }
  }, [specificClipToEdit, onSpecificClipEditComplete]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 YouTubeSearch STATE DEBUG:');
    console.log('selectedChannel:', selectedChannel);
    console.log('channelVideos.length:', channelVideos.length);
    console.log('searchResults.length:', searchResults.length);
    console.log('loading:', loading);
    console.log('isEditingMode:', isEditingMode);
    console.log('editingPlaylist:', editingPlaylist);
    console.log('originalPlaylistId:', originalPlaylistId);
    console.log('currentPlaylist.length:', currentPlaylist.length);
    console.log('playlistName:', playlistName);
    console.log('specificClipToEdit:', specificClipToEdit);
    console.log('clipDialogOpen:', clipDialogOpen);
    console.log('Show video section condition:', (searchResults.length > 0 || channelVideos.length > 0 || selectedChannel));
    console.log('Show playlist section condition:', (currentPlaylist.length > 0 || isEditingMode));
    console.log('Should show quick save button:', isEditingMode);
  }, [selectedChannel, channelVideos, searchResults, loading, isEditingMode, editingPlaylist, originalPlaylistId, currentPlaylist, playlistName, specificClipToEdit, clipDialogOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // Add state for error handling
  const [searchError, setSearchError] = useState<string | null>(null);

  // Utility functions for YouTube URL parsing
  const extractVideoIdFromUrl = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractPlaylistIdFromUrl = (url: string): string | null => {
    const match = url.match(/[?&]list=([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url);
  };

  const handleSearch = useCallback(async (pageToken?: string, resetPage: boolean = true) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSelectedChannel(null);
    setSearchError(null); // Clear previous errors

    try {
      if (searchMode === 'channels') {
        const options = {
          maxResults: resultsPerPage,
          pageToken,
          sortOrder: channelSortOrder
        };

        console.log('🔍 NEW Channel search options:', options);
        const result = await searchYouTubeChannels(searchQuery, null, options);
        setChannelResults(result.channels);
        setChannelPagination(result.pagination);
        setSearchResults([]);
        setSearchResult(null);
      } else {
        const options: YouTubeSearchOptions = {
          maxResults: resultsPerPage,
          pageToken,
          order: sortOrder,
          videoDuration,
          useYtDlp: unlimitedSearch
        };

        console.log('🔍 Search options:', { unlimitedSearch, options });
        const result = await searchYouTubeEnhanced(searchQuery, null, options);
        setSearchResult(result);
        setSearchResults(result.videos);
        setChannelResults([]);
        setChannelPagination(null);
      }

      if (resetPage) {
        setCurrentPage(1);
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
  }, [searchQuery, resultsPerPage, sortOrder, videoDuration, searchMode, channelSortOrder, unlimitedSearch]);

  const handleChannelSelect = useCallback(async (channel: YouTubeChannel) => {
    console.log('🔥 CHANNEL SELECTION STARTED');
    console.log('Selected channel:', channel);
    console.log('Channel ID:', channel.id);
    setSelectedChannel(channel);
    setLoading(true);

    console.log('State after setting selectedChannel:', {
      selectedChannel: channel,
      loading: true
    });

    try {
      const options: YouTubeSearchOptions = {
        maxResults: resultsPerPage,
        order: 'date'
      };

      console.log('Fetching channel videos with options:', options);
      const result = await getChannelVideos(channel.id, null, options);
      console.log('🎬 CHANNEL VIDEOS RESULT:', result);
      console.log('Number of videos returned:', result.videos.length);

      setChannelVideoResult(result);
      setChannelVideos(result.videos);
      setCurrentPage(1);

      console.log('State after setting channel videos:', {
        channelVideoResult: result,
        channelVideos: result.videos,
        channelVideosLength: result.videos.length
      });

      // Clear channel search results to show videos
      setChannelResults([]);

      console.log('✅ CHANNEL SELECTION COMPLETED');
    } catch (error) {
      console.error('❌ Failed to load channel videos:', error);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  }, [resultsPerPage]);

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
    } finally {
      setLoading(false);
    }
  }, [resultsPerPage]);

  const handleNewSearch = () => {
    setCurrentPage(1);
    setSelectedChannel(null);
    setChannelVideos([]);
    setChannelVideoResult(null);
    handleSearch(undefined, true);
  };

  // Handle direct video URL input
  const handleDirectVideoUrl = async () => {
    if (!directVideoUrl.trim()) return;

    setLinkProcessing(true);
    setSearchError(null);

    try {
      if (!isValidYouTubeUrl(directVideoUrl)) {
        throw new Error('Please enter a valid YouTube URL');
      }

      const videoId = extractVideoIdFromUrl(directVideoUrl);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      // Try to get video details using yt-dlp if available
      let videoDetails: YouTubeVideo;

      try {
        // Attempt to get real video details
        const searchResult = await searchYouTubeEnhanced(`https://www.youtube.com/watch?v=${videoId}`, null, {
          maxResults: 1,
          useYtDlp: true
        });

        if (searchResult.videos.length > 0) {
          videoDetails = searchResult.videos[0];
          console.log('✅ Retrieved video details via yt-dlp:', videoDetails.title);
        } else {
          throw new Error('No video details found');
        }
      } catch (detailsError) {
        console.log('⚠️ Could not get video details, using basic info:', detailsError.message);

        // Fallback to basic video object
        videoDetails = {
          id: videoId,
          title: `YouTube Video (${videoId})`,
          channelTitle: 'Unknown Channel',
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: 'PT0S',
          publishedAt: '',
          viewCount: '',
          description: 'Video added via direct URL'
        };
      }

      // Add to search results
      setSearchResults([videoDetails]);
      setSearchResult({
        videos: [videoDetails],
        totalResults: 1,
        nextPageToken: null,
        prevPageToken: null
      });

      // Clear the input
      setDirectVideoUrl('');

      console.log('✅ Direct video URL processed:', videoId);
    } catch (error) {
      console.error('❌ Failed to process video URL:', error);
      setSearchError(error.message || 'Failed to process video URL');
    } finally {
      setLinkProcessing(false);
    }
  };

  // Handle direct playlist URL input
  const handleDirectPlaylistUrl = async () => {
    if (!directPlaylistUrl.trim()) return;

    setLinkProcessing(true);
    setSearchError(null);
    setPlaylistImportProgress({
      isImporting: true,
      videosFound: 0,
      currentStatus: 'Validating playlist URL...'
    });

    try {
      if (!isValidYouTubeUrl(directPlaylistUrl)) {
        throw new Error('Please enter a valid YouTube playlist URL');
      }

      const playlistId = extractPlaylistIdFromUrl(directPlaylistUrl);
      if (!playlistId) {
        throw new Error('Could not extract playlist ID from URL. Make sure the URL contains "list=" parameter');
      }

      setPlaylistImportProgress(prev => ({
        ...prev,
        currentStatus: 'Extracting playlist videos...'
      }));

      console.log('🎵 Extracting playlist videos:', playlistId);

      // Use the new playlist extraction functionality
      const playlistResult = await getPlaylistVideos(playlistId, null, {
        maxResults: Math.min(resultsPerPage * 3, 100) // Get more videos for playlists
      });

      if (playlistResult.videos.length === 0) {
        throw new Error('No videos found in playlist. The playlist may be empty or private.');
      }

      setPlaylistImportProgress(prev => ({
        ...prev,
        videosFound: playlistResult.videos.length,
        currentStatus: `Processing ${playlistResult.videos.length} videos...`
      }));

      // Add playlist videos to search results
      setSearchResults(playlistResult.videos);
      setSearchResult(playlistResult);

      // Clear channel results since we're showing playlist videos
      setChannelResults([]);
      setChannelPagination(null);
      setSelectedChannel(null);
      setChannelVideos([]);
      setChannelVideoResult(null);

      // Clear the input
      setDirectPlaylistUrl('');

      setPlaylistImportProgress(prev => ({
        ...prev,
        currentStatus: `✅ Successfully imported ${playlistResult.videos.length} videos!`
      }));

      // Clear progress after a delay
      setTimeout(() => {
        setPlaylistImportProgress({
          isImporting: false,
          videosFound: 0,
          currentStatus: ''
        });
      }, 3000);

      console.log(`✅ Successfully imported ${playlistResult.videos.length} videos from playlist`);

    } catch (error) {
      console.error('❌ Failed to process playlist URL:', error);
      setSearchError(error.message || 'Failed to process playlist URL');
      setPlaylistImportProgress({
        isImporting: false,
        videosFound: 0,
        currentStatus: ''
      });
    } finally {
      setLinkProcessing(false);
    }
  };

  const handlePlayVideo = (video: YouTubeVideo, startTime: number = 0) => {
    setPlayingVideoId(video.id);
    setPlaybackStartTime(startTime);
  };

  const handleClosePlayer = () => {
    setPlayingVideoId(null);
    setPlaybackStartTime(0);
  };

  // Get card dimensions based on size setting
  const getCardDimensions = () => {
    switch (cardSize) {
      case 'small':
        return {
          height: 340,
          thumbnailHeight: 120,
          titleHeight: 32, // Fixed pixel height for 2 lines
          titleLines: 2,
          fontSize: '0.75rem',
          buttonFontSize: '0.65rem',
          padding: 12,
          metadataHeight: 40, // Fixed pixel height
          channelHeight: 20, // Fixed pixel height
          buttonAreaHeight: 32
        };
      case 'large':
        return {
          height: 500,
          thumbnailHeight: 200,
          titleHeight: 48, // Fixed pixel height for 3 lines
          titleLines: 3,
          fontSize: '0.9rem',
          buttonFontSize: '0.8rem',
          padding: 16,
          metadataHeight: 50, // Fixed pixel height
          channelHeight: 24, // Fixed pixel height
          buttonAreaHeight: 40
        };
      default: // medium
        return {
          height: 420,
          thumbnailHeight: 140,
          titleHeight: 40, // Fixed pixel height for 2 lines
          titleLines: 2,
          fontSize: '0.8rem',
          buttonFontSize: '0.7rem',
          padding: 14,
          metadataHeight: 45, // Fixed pixel height
          channelHeight: 22, // Fixed pixel height
          buttonAreaHeight: 36
        };
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleNewSearch();
    }
  };

  const handleAddToPlaylist = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setClipStartTime(0);
    setClipDuration(60);
    setUseCustomDuration(false);
    setCustomDurationInput('60');
    setPreviewVideoId(video.id);
    setClipDialogOpen(true);
  };

  const handlePreviewVideo = (video: YouTubeVideo) => {
    setPreviewVideoId(video.id);
    setIsPreviewPlaying(true);
  };

  const onYouTubeReady = (event: any) => {
    youtubePlayerRef.current = event.target;

    // Get the video duration and update the selected video if needed
    if (selectedVideo && youtubePlayerRef.current) {
      try {
        const duration = youtubePlayerRef.current.getDuration();
        if (duration && duration > 0) {
          // Update the selected video with the actual duration
          const updatedVideo = {
            ...selectedVideo,
            duration: `PT${Math.floor(duration)}S`
          };
          setSelectedVideo(updatedVideo);
          console.log('📹 Updated video duration:', duration, 'seconds');
        }
      } catch (error) {
        console.log('Could not get video duration:', error);
      }
    }
  };

  const onYouTubeStateChange = (event: any) => {
    setIsPreviewPlaying(event.data === 1); // 1 = playing

    // Update clip playing state based on YouTube player state
    if (event.data === 2) { // 2 = paused
      setIsClipPlaying(false);
    } else if (event.data === 0) { // 0 = ended
      setIsClipPlaying(false);
      setClipPausedAt(null);
    }
  };

  const handlePreviewAtTime = () => {
    if (youtubePlayerRef.current && selectedVideo) {
      // Clear any existing timeout
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }

      // Start playing from the clip start time
      youtubePlayerRef.current.seekTo(clipStartTime, true);
      youtubePlayerRef.current.playVideo();

      // Set timeout to stop at clip end time
      const clipEndTime = clipStartTime + clipDuration;
      previewTimeoutRef.current = setTimeout(() => {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
        }
      }, clipDuration * 1000); // Convert seconds to milliseconds
    }
  };

  const handleClipConfirm = () => {
    if (!selectedVideo) return;

    // Check if we're in sequential extraction mode
    if (sequentialExtractionActive) {
      handleSequentialClipConfirm();
      return;
    }

    // Check if we're editing an existing clip
    const existingClipIndex = currentPlaylist.findIndex(clip => clip.videoId === selectedVideo.id);

    if (existingClipIndex !== -1) {
      // Update existing clip
      handleUpdateClip();
    } else {
      // Add new clip
      const clip = createClipFromVideo(selectedVideo, clipStartTime, clipDuration);
      setCurrentPlaylist(prev => [...prev, clip]);
      setClipDialogOpen(false);
      setSelectedVideo(null);
    }
  };

  const handleClipCancel = () => {
    // Clear any existing preview timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    // Check if we're in sequential extraction mode
    if (sequentialExtractionActive) {
      cancelSequentialExtraction();
      return;
    }

    setClipDialogOpen(false);
    setSelectedVideo(null);
    setPreviewVideoId(null);
    setIsPreviewPlaying(false);
    setIsClipPlaying(false);
    setClipPausedAt(null);
  };

  const removeFromPlaylist = (clipId: string) => {
    setCurrentPlaylist(prev => prev.filter(clip => clip.id !== clipId));
  };

  const handleEditClip = (clip: YouTubeClip) => {
    // Find the video data for this clip (we'll need to create a mock video object)
    const mockVideo: YouTubeVideo = {
      id: clip.videoId,
      title: clip.title,
      channelTitle: clip.artist,
      thumbnail: clip.thumbnail,
      duration: 'PT0S', // We don't have the full duration, but it's not critical for editing
      publishedAt: '',
      viewCount: '',
      description: ''
    };

    setSelectedVideo(mockVideo);
    setClipStartTime(clip.startTime);
    setClipDuration(clip.duration);

    // Set custom duration state based on clip duration
    const isCustomDuration = ![30, 45, 60, 90, 120].includes(clip.duration);
    setUseCustomDuration(isCustomDuration);
    setCustomDurationInput(clip.duration.toString());

    setPreviewVideoId(clip.videoId);
    setClipDialogOpen(true);
  };

  const handleUpdateClip = () => {
    if (!selectedVideo) return;

    // Update the existing clip in the playlist
    setCurrentPlaylist(prev => prev.map(clip => {
      if (clip.videoId === selectedVideo.id) {
        return {
          ...clip,
          startTime: clipStartTime,
          duration: clipDuration
        };
      }
      return clip;
    }));

    setClipDialogOpen(false);
    setSelectedVideo(null);
  };

  const handleSavePlaylist = () => {
    if (currentPlaylist.length === 0) return;
    if (!isEditingMode) {
      setPlaylistName(`YouTube Power Hour ${new Date().toLocaleDateString()}`);
    }
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = (saveAsNew: boolean = false) => {
    if (!playlistName.trim() || currentPlaylist.length === 0) return;

    const playlist: YouTubePlaylist = {
      id: (isEditingMode && !saveAsNew && originalPlaylistId) ? originalPlaylistId : generatePlaylistId(),
      name: playlistName.trim(),
      clips: currentPlaylist,
      date: isEditingMode && !saveAsNew && editingPlaylist ? editingPlaylist.date : new Date().toISOString(),
      // Preserve existing playlist properties when updating
      ...(isEditingMode && !saveAsNew && editingPlaylist && {
        drinkingSoundPath: editingPlaylist.drinkingSoundPath,
        imagePath: editingPlaylist.imagePath,
        isPublic: editingPlaylist.isPublic,
        shareCode: editingPlaylist.shareCode,
        creator: editingPlaylist.creator,
        description: editingPlaylist.description,
        rating: editingPlaylist.rating,
        downloadCount: editingPlaylist.downloadCount,
        tags: editingPlaylist.tags,
        createdAt: editingPlaylist.createdAt,
        updatedAt: new Date().toISOString(),
        version: editingPlaylist.version
      })
    };

    saveYouTubePlaylist(playlist);

    // Notify parent component if provided
    if (onPlaylistUpdated) {
      onPlaylistUpdated(playlist);
    }

    // Reset state based on mode
    if (!isEditingMode || saveAsNew) {
      setCurrentPlaylist([]);
      setPlaylistName('');
      setIsEditingMode(false);
      setOriginalPlaylistId(null);
    }

    setSaveDialogOpen(false);

    // Show success message
    const action = isEditingMode && !saveAsNew ? 'updated' : 'saved';
    console.log(`Playlist ${action} successfully!`);
  };

  const handleSaveCancel = () => {
    setSaveDialogOpen(false);
  };

  const handleQuickSave = async () => {
    if (!isEditingMode || !editingPlaylist || !originalPlaylistId) return;

    try {
      // Check if this is a collaborative playlist
      const isCollaborative = (editingPlaylist as any).isCollaborative || (editingPlaylist as any).collaborationId;

      if (isCollaborative) {
        console.log('🤝 Saving collaborative playlist...');
        console.log('🤝 Original clips:', editingPlaylist.clips.length);
        console.log('🤝 Current clips:', currentPlaylist.length);

        // For collaborative playlists, we need to update the entire playlist data
        // including both metadata and clips in a single update to avoid race conditions
        const updateData: any = {};

        // Add name if changed
        if (playlistName.trim() && playlistName.trim() !== editingPlaylist.name) {
          updateData.name = playlistName.trim();
        }

        // Always update clips and date
        updateData.clips = currentPlaylist;
        updateData.date = new Date().toISOString();

        console.log('🤝 Updating collaborative playlist with data:', updateData);
        console.log('🤝 Playlist ID:', originalPlaylistId);
        console.log('🤝 Update data clips length:', updateData.clips?.length);

        const success = await updateCollaborativePlaylistMetadata(originalPlaylistId, updateData);

        if (!success) {
          throw new Error('Failed to update collaborative playlist');
        }

        console.log('✅ Collaborative playlist saved successfully');
        console.log('✅ Saved clips count:', updateData.clips?.length);

        // Update the local editing playlist to reflect the changes
        // This prevents the real-time listener from reverting our changes
        const updatedEditingPlaylist = {
          ...editingPlaylist,
          ...updateData
        };

        // Notify parent component to update the editing playlist
        if (onEditingPlaylistChanged) {
          onEditingPlaylistChanged(updatedEditingPlaylist);
        }

        // Notify parent component if provided
        if (onPlaylistUpdated) {
          onPlaylistUpdated(updatedEditingPlaylist);
        }

      } else {
        console.log('💾 Saving regular YouTube playlist...');

        // For regular YouTube playlists, save to localStorage
        const playlist: YouTubePlaylist = {
          id: originalPlaylistId,
          name: playlistName.trim() || editingPlaylist.name,
          clips: currentPlaylist,
          date: editingPlaylist.date,
          // Preserve existing playlist properties
          drinkingSoundPath: editingPlaylist.drinkingSoundPath,
          imagePath: editingPlaylist.imagePath,
          isPublic: editingPlaylist.isPublic,
          shareCode: editingPlaylist.shareCode,
          creator: editingPlaylist.creator,
          description: editingPlaylist.description,
          rating: editingPlaylist.rating,
          downloadCount: editingPlaylist.downloadCount,
          tags: editingPlaylist.tags,
          createdAt: editingPlaylist.createdAt,
          updatedAt: new Date().toISOString(),
          version: editingPlaylist.version
        };

        saveYouTubePlaylist(playlist);

        // Notify parent component if provided
        if (onPlaylistUpdated) {
          onPlaylistUpdated(playlist);
        }
      }

      // Show success feedback
      setQuickSaveSuccess(true);
      setSnackbarMessage(`Playlist "${playlistName.trim() || editingPlaylist.name}" saved successfully!`);
      setSnackbarOpen(true);
      setTimeout(() => setQuickSaveSuccess(false), 3000);

      console.log('✅ Playlist saved successfully!');

    } catch (error) {
      console.error('❌ Error saving playlist:', error);
      setSnackbarMessage(`Failed to save playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    }
  };

  const getVideoDuration = (video: YouTubeVideo): number => {
    const duration = parseDuration(video.duration);
    // If duration parsing fails or returns 0, try to get it from the YouTube player
    if (duration <= 0 && youtubePlayerRef.current) {
      try {
        const playerDuration = youtubePlayerRef.current.getDuration();
        return playerDuration > 0 ? playerDuration : 300; // Default to 5 minutes if all else fails
      } catch (error) {
        return 300; // Default to 5 minutes
      }
    }
    return duration > 0 ? duration : 300; // Default to 5 minutes if duration is 0
  };

  const maxStartTime = selectedVideo ? Math.max(0, getVideoDuration(selectedVideo) - clipDuration) : 0;

  // Custom duration handlers
  const handleCustomDurationToggle = (checked: boolean) => {
    setUseCustomDuration(checked);
    if (!checked) {
      // Reset to default 60 seconds when unchecked
      setClipDuration(60);
      setCustomDurationInput('60');
    } else {
      // Use current duration value when checked
      setCustomDurationInput(clipDuration.toString());
    }
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDurationInput(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 600) { // Max 10 minutes
      setClipDuration(numValue);
    }
  };

  const handlePresetDurationChange = (duration: number) => {
    setClipDuration(duration);
    setCustomDurationInput(duration.toString());
  };

  // Enhanced media control handlers
  const handleJumpToVideoStart = () => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(0, true);
      setIsClipPlaying(false);
      setClipPausedAt(null);
    }
  };

  const handleRepeatClip = () => {
    if (youtubePlayerRef.current) {
      // Clear any existing timeout
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }

      // Start playing from the clip start time
      youtubePlayerRef.current.seekTo(clipStartTime, true);
      youtubePlayerRef.current.playVideo();
      setIsClipPlaying(true);
      setClipPausedAt(null);

      // Set timeout to stop at clip end time
      previewTimeoutRef.current = setTimeout(() => {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
          setIsClipPlaying(false);
        }
      }, clipDuration * 1000);
    }
  };

  const handlePlayPauseClip = () => {
    if (!youtubePlayerRef.current) return;

    if (isClipPlaying) {
      // Pause the clip
      youtubePlayerRef.current.pauseVideo();
      setIsClipPlaying(false);

      // Store current position for resume
      const currentTime = youtubePlayerRef.current.getCurrentTime();
      setClipPausedAt(currentTime);

      // Clear timeout
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    } else {
      // Resume or start playing
      const startFrom = clipPausedAt !== null ? clipPausedAt : clipStartTime;
      const remainingTime = clipPausedAt !== null
        ? Math.max(0, (clipStartTime + clipDuration) - clipPausedAt)
        : clipDuration;

      youtubePlayerRef.current.seekTo(startFrom, true);
      youtubePlayerRef.current.playVideo();
      setIsClipPlaying(true);

      // Set timeout for remaining time
      if (remainingTime > 0) {
        previewTimeoutRef.current = setTimeout(() => {
          if (youtubePlayerRef.current) {
            youtubePlayerRef.current.pauseVideo();
            setIsClipPlaying(false);
            setClipPausedAt(null);
          }
        }, remainingTime * 1000);
      }
    }
  };

  const handleStopClip = () => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo();
      setIsClipPlaying(false);
      setClipPausedAt(null);

      // Clear timeout
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    }
  };

  const handleJumpToVideoEnd = () => {
    if (youtubePlayerRef.current && selectedVideo) {
      const videoDuration = getVideoDuration(selectedVideo);
      const lastMinuteStart = Math.max(0, videoDuration - 60); // Last minute
      youtubePlayerRef.current.seekTo(lastMinuteStart, true);
      setIsClipPlaying(false);
      setClipPausedAt(null);
    }
  };

  const handleRandomStartTime = () => {
    if (selectedVideo) {
      const videoDuration = getVideoDuration(selectedVideo);
      const maxStart = Math.max(0, videoDuration - clipDuration);
      const randomStart = Math.floor(Math.random() * (maxStart + 1));
      setClipStartTime(randomStart);

      // Jump to the random time
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(randomStart, true);
      }
    }
  };

  // Multi-selection handlers
  const handleVideoSelect = (video: YouTubeVideo, checked: boolean) => {
    if (checked) {
      setSelectedVideos(prev => [...prev, video]);
      // Initialize time config for this video
      setVideoTimeConfigs(prev => ({
        ...prev,
        [video.id]: { startTime: 0, duration: 60 }
      }));
    } else {
      setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
      setVideoTimeConfigs(prev => {
        const newConfigs = { ...prev };
        delete newConfigs[video.id];
        return newConfigs;
      });
    }
  };

  const handleSelectAll = () => {
    const currentVideos = selectedChannel ? channelVideos : searchResults;
    setSelectedVideos([...currentVideos]);
    const newConfigs: {[videoId: string]: {startTime: number, duration: number}} = {};
    currentVideos.forEach(video => {
      newConfigs[video.id] = { startTime: 0, duration: 60 };
    });
    setVideoTimeConfigs(newConfigs);
  };

  const handleDeselectAll = () => {
    setSelectedVideos([]);
    setVideoTimeConfigs({});
  };

  const handleBulkAddToPlaylist = () => {
    if (selectedVideos.length === 0) return;

    // Initialize video time configs if not already set
    const newConfigs = { ...videoTimeConfigs };
    selectedVideos.forEach(video => {
      if (!newConfigs[video.id]) {
        newConfigs[video.id] = { startTime: 0, duration: 60 };
      }
    });
    setVideoTimeConfigs(newConfigs);
    setBulkConfigDialogOpen(true);
  };

  const handleBulkConfirm = async () => {
    if (selectedVideos.length === 0) return;

    // Check if manual mode should use sequential workflow
    if (timeSelectionMode === 'manual') {
      startSequentialExtraction();
      return;
    }

    setBulkProcessing(true);

    try {
      let timeConfigs: {[videoId: string]: {startTime: number, duration: number}} = {};

      // Generate time configurations based on selection mode
      selectedVideos.forEach(video => {
        switch (timeSelectionMode) {
          case 'random':
            const videoDuration = getVideoDuration(video);
            timeConfigs[video.id] = {
              startTime: generateRandomStartTime(videoDuration, bulkDuration),
              duration: bulkDuration
            };
            break;
          case 'same':
            timeConfigs[video.id] = {
              startTime: bulkStartTime,
              duration: bulkDuration
            };
            break;
          default:
            timeConfigs[video.id] = { startTime: 0, duration: 60 };
        }
      });

      const newClips = createBulkClipsFromVideos(selectedVideos, timeConfigs);
      setCurrentPlaylist(prev => [...prev, ...newClips]);
      setBulkConfigDialogOpen(false);
      setSelectedVideos([]);
      setVideoTimeConfigs({});
    } catch (error) {
      console.error('Error creating bulk clips:', error);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCancel = () => {
    setBulkConfigDialogOpen(false);
  };

  const updateVideoTimeConfig = (videoId: string, startTime: number, duration: number) => {
    setVideoTimeConfigs(prev => ({
      ...prev,
      [videoId]: { startTime, duration }
    }));
  };

  // Sequential extraction workflow functions
  const startSequentialExtraction = () => {
    if (selectedVideos.length === 0) return;

    setSequentialVideos([...selectedVideos]);
    setCurrentSequentialIndex(0);
    setSequentialClips([]);
    setSequentialExtractionActive(true);
    setBulkConfigDialogOpen(false);

    // Open the clip dialog for the first video
    openClipDialogForSequentialVideo(selectedVideos[0]);
  };

  const openClipDialogForSequentialVideo = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setClipStartTime(0);
    setClipDuration(60);
    setUseCustomDuration(false);
    setCustomDurationInput('60');
    setPreviewVideoId(video.id);
    setClipDialogOpen(true);
  };

  const handleSequentialClipConfirm = () => {
    if (!selectedVideo) return;

    // Create clip from current video
    const newClip = createClipFromVideo(selectedVideo, clipStartTime, clipDuration);

    // Move to next video or complete the process
    const nextIndex = currentSequentialIndex + 1;

    if (nextIndex < sequentialVideos.length) {
      // Add current clip and move to next video
      setSequentialClips(prev => [...prev, newClip]);
      setCurrentSequentialIndex(nextIndex);
      setClipDialogOpen(false);

      // Small delay to ensure dialog closes before opening for next video
      setTimeout(() => {
        openClipDialogForSequentialVideo(sequentialVideos[nextIndex]);
      }, 100);
    } else {
      // This is the last video - add the clip and complete the workflow
      setSequentialClips(prev => {
        const updatedClips = [...prev, newClip];
        // Complete the workflow with the final clip included
        setTimeout(() => {
          completeSequentialExtractionWithClips(updatedClips);
        }, 0);
        return updatedClips;
      });
    }
  };

  const completeSequentialExtraction = () => {
    // Add all sequential clips to the main playlist
    setCurrentPlaylist(prev => [...prev, ...sequentialClips]);

    // Reset sequential extraction state
    setSequentialExtractionActive(false);
    setSequentialVideos([]);
    setCurrentSequentialIndex(0);
    setSequentialClips([]);
    setClipDialogOpen(false);
    setSelectedVideo(null);

    // Clear bulk selection
    setSelectedVideos([]);
    setVideoTimeConfigs({});
  };

  const completeSequentialExtractionWithClips = (finalClips: YouTubeClip[]) => {
    // Add all sequential clips (including the final one) to the main playlist
    setCurrentPlaylist(prev => [...prev, ...finalClips]);

    // Reset sequential extraction state
    setSequentialExtractionActive(false);
    setSequentialVideos([]);
    setCurrentSequentialIndex(0);
    setSequentialClips([]);
    setClipDialogOpen(false);
    setSelectedVideo(null);

    // Clear bulk selection
    setSelectedVideos([]);
    setVideoTimeConfigs({});
  };

  const cancelSequentialExtraction = () => {
    // Reset all sequential extraction state
    setSequentialExtractionActive(false);
    setSequentialVideos([]);
    setCurrentSequentialIndex(0);
    setSequentialClips([]);
    setClipDialogOpen(false);
    setSelectedVideo(null);
  };

  // Drag and drop handler for reordering clips
  const handleClipDragEnd = useCallback((result: DropResult) => {
    const { destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const reorderedClips = Array.from(currentPlaylist);
    const [movedClip] = reorderedClips.splice(source.index, 1);
    reorderedClips.splice(destination.index, 0, movedClip);

    setCurrentPlaylist(reorderedClips);
  }, [currentPlaylist]);

  return (
    <Box>
      {/* Search Section */}
      <Box sx={{ mb: 4 }}>
        {/* Enhanced Search Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              <SearchIcon sx={{ color: currentTheme.primary }} />
              YouTube Search & Clip Creation
            </Typography>

            {/* Input Mode Toggle - Modern Design */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<SearchIcon />}
                label="Search"
                color="primary"
                variant={inputMode === 'search' ? 'filled' : 'outlined'}
                onClick={() => setInputMode('search')}
                clickable
                disabled={loading || linkProcessing}
                sx={{
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  }
                }}
              />
              <Chip
                icon={<PlayIcon />}
                label="Video URL"
                color="secondary"
                variant={inputMode === 'video' ? 'filled' : 'outlined'}
                onClick={() => setInputMode('video')}
                clickable
                disabled={loading || linkProcessing}
                sx={{
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  }
                }}
              />
              <Chip
                icon={<QueueMusicIcon />}
                label="Playlist URL"
                color="info"
                variant={inputMode === 'playlist' ? 'filled' : 'outlined'}
                onClick={() => setInputMode('playlist')}
                clickable
                disabled={loading || linkProcessing}
                sx={{
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Search Mode Toggle - Only show when in search input mode */}
        {inputMode === 'search' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Search Type:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={searchMode === 'videos' ? 'contained' : 'outlined'}
                onClick={() => setSearchMode('videos')}
                disabled={loading}
                size="small"
                startIcon={<SearchIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(searchMode === 'videos' && {
                    background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                  })
                }}
              >
                Search Videos
              </Button>
              <Button
                variant={searchMode === 'channels' ? 'contained' : 'outlined'}
                onClick={() => setSearchMode('channels')}
                disabled={loading}
                size="small"
                startIcon={<PersonIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(searchMode === 'channels' && {
                    background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                  })
                }}
              >
                Search Channels
              </Button>
            </Box>
          </Box>
        )}

        {/* Channel Sort Options */}
        {inputMode === 'search' && searchMode === 'channels' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Sort Channels By:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { value: 'relevance', label: 'Best Match', icon: '🎯' },
                { value: 'music', label: 'Music Priority', icon: '🎵' },
                { value: 'title', label: 'Name (A-Z)', icon: '🔤' },
                { value: 'subscribers', label: 'Subscribers', icon: '👥' },
                { value: 'recent', label: 'Recent Activity', icon: '📅' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={channelSortOrder === option.value ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setChannelSortOrder(option.value)}
                  startIcon={<span>{option.icon}</span>}
                  sx={{
                    ...(channelSortOrder === option.value && {
                      background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                    })
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Dynamic Input Bar based on mode */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {inputMode === 'search' && (
            <>
              <TextField
                fullWidth
                label={searchMode === 'videos' ? 'Search Videos' : 'Search Channels'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={searchMode === 'videos' ? 'Enter song name, artist, or keywords...' : 'Enter channel name or creator...'}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${currentTheme.primary}20`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 2px ${currentTheme.primary}40`,
                    },
                  },
                }}
              />
              {searchMode === 'videos' && (
                <Button
                  variant="outlined"
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={<FilterListIcon />}
                  sx={{
                    minWidth: 120,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 2,
                    }
                  }}
                >
                  Filters
                </Button>
              )}
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
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${currentTheme.primary}40`,
                    background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                    filter: 'brightness(1.1)',
                  },
                  '&:disabled': {
                    background: 'action.disabledBackground',
                    transform: 'none',
                    boxShadow: 'none',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
              </Button>
            </>
          )}

          {inputMode === 'video' && (
            <>
              <TextField
                fullWidth
                label="YouTube Video URL"
                value={directVideoUrl}
                onChange={(e) => setDirectVideoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDirectVideoUrl()}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                InputProps={{
                  startAdornment: <PlayIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${currentTheme.secondary}20`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 2px ${currentTheme.secondary}40`,
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleDirectVideoUrl}
                disabled={linkProcessing || !directVideoUrl.trim()}
                sx={{
                  minWidth: 120,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${currentTheme.secondary} 0%, ${currentTheme.primary} 100%)`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${currentTheme.secondary}40`,
                    background: `linear-gradient(135deg, ${currentTheme.secondary} 0%, ${currentTheme.primary} 100%)`,
                    filter: 'brightness(1.1)',
                  },
                  '&:disabled': {
                    background: 'action.disabledBackground',
                    transform: 'none',
                    boxShadow: 'none',
                  }
                }}
              >
                {linkProcessing ? <CircularProgress size={24} color="inherit" /> : 'Add Video'}
              </Button>
            </>
          )}

          {inputMode === 'playlist' && (
            <>
              <TextField
                fullWidth
                label="YouTube Playlist URL"
                value={directPlaylistUrl}
                onChange={(e) => setDirectPlaylistUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDirectPlaylistUrl()}
                placeholder="https://www.youtube.com/playlist?list=..."
                InputProps={{
                  startAdornment: <QueueMusicIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px #2196f320`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 2px #2196f340`,
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleDirectPlaylistUrl}
                disabled={linkProcessing || !directPlaylistUrl.trim()}
                sx={{
                  minWidth: 140,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px #2196f340',
                    background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
                    filter: 'brightness(1.1)',
                  },
                  '&:disabled': {
                    background: 'action.disabledBackground',
                    transform: 'none',
                    boxShadow: 'none',
                  }
                }}
              >
                {linkProcessing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    <Typography variant="caption">
                      {playlistImportProgress.videosFound > 0
                        ? `${playlistImportProgress.videosFound} videos`
                        : 'Processing...'
                      }
                    </Typography>
                  </Box>
                ) : 'Import Playlist'}
              </Button>
            </>
          )}

          {/* Size Controls - Always available */}
          <Button
            variant="outlined"
            onClick={() => setShowSizeControls(!showSizeControls)}
            startIcon={<SettingsIcon />}
            sx={{
              minWidth: 120,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
              }
            }}
          >
            Size
          </Button>
        </Box>



        {/* Search Filters - Only show in search mode */}
        {inputMode === 'search' && showFilters && (
          <Box sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'action.hover',
            borderRadius: 2,
            border: `1px solid ${currentTheme.primary}20`
          }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Search Options
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Results per page</InputLabel>
                  <Select
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(e.target.value as number)}
                    label="Results per page"
                  >
                    <MenuItem value={10}>10 results</MenuItem>
                    <MenuItem value={25}>25 results</MenuItem>
                    <MenuItem value={50}>50 results</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    label="Sort by"
                  >
                    <MenuItem value="relevance">Relevance</MenuItem>
                    <MenuItem value="date">Upload date</MenuItem>
                    <MenuItem value="viewCount">View count</MenuItem>
                    <MenuItem value="rating">Rating</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value as any)}
                    label="Duration"
                  >
                    <MenuItem value="any">Any duration</MenuItem>
                    <MenuItem value="short">Under 4 minutes</MenuItem>
                    <MenuItem value="medium">4-20 minutes</MenuItem>
                    <MenuItem value="long">Over 20 minutes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleNewSearch}
                  disabled={loading}
                  startIcon={<SearchIcon />}
                >
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Size Controls */}
        {showSizeControls && (
          <Box sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'action.hover',
            borderRadius: 2,
            border: `1px solid ${currentTheme.primary}20`
          }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Card Size Options
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Choose how large you want the video cards to appear
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { key: 'small', label: 'Small', icon: '📱', desc: 'Compact view, more cards per row' },
                    { key: 'medium', label: 'Medium', icon: '💻', desc: 'Balanced view (default)' },
                    { key: 'large', label: 'Large', icon: '🖥️', desc: 'Detailed view, larger thumbnails' }
                  ].map((size) => (
                    <Button
                      key={size.key}
                      variant={cardSize === size.key ? 'contained' : 'outlined'}
                      onClick={() => setCardSize(size.key as any)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        flexDirection: 'column',
                        minHeight: 80,
                        flex: 1,
                        ...(cardSize === size.key && {
                          background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                        })
                      }}
                    >
                      <Box sx={{ fontSize: '1.5rem', mb: 0.5 }}>{size.icon}</Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {size.label}
                      </Typography>
                    </Button>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    {cardSize === 'small' && '📱 Small Cards'}
                    {cardSize === 'medium' && '💻 Medium Cards'}
                    {cardSize === 'large' && '🖥️ Large Cards'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cardSize === 'small' && 'Compact view with more videos visible at once. Perfect for browsing large collections quickly.'}
                    {cardSize === 'medium' && 'Balanced view with good detail and reasonable density. Recommended for most users.'}
                    {cardSize === 'large' && 'Detailed view with large thumbnails and more information. Great for careful selection.'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Playlist Import Progress */}
        {playlistImportProgress.isImporting && (
          <Box sx={{
            p: 2,
            mb: 3,
            backgroundColor: alpha('#2196f3', 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha('#2196f3', 0.3)}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <CircularProgress size={20} sx={{ color: '#2196f3' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196f3' }}>
                Importing Playlist
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {playlistImportProgress.currentStatus}
            </Typography>
            {playlistImportProgress.videosFound > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Found {playlistImportProgress.videosFound} videos so far...
              </Typography>
            )}
          </Box>
        )}

        {/* Help Information for different input modes */}
        {inputMode === 'video' && (
          <Box sx={{
            p: 2,
            mb: 3,
            backgroundColor: alpha(currentTheme.secondary, 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha(currentTheme.secondary, 0.2)}`
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: currentTheme.secondary }}>
              📹 Direct Video URL
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paste any YouTube video URL to add it directly to your search results. Supports:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <Typography component="li" variant="caption" color="text.secondary">
                youtube.com/watch?v=VIDEO_ID
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                youtu.be/VIDEO_ID
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                youtube.com/embed/VIDEO_ID
              </Typography>
            </Box>
          </Box>
        )}

        {inputMode === 'playlist' && (
          <Box sx={{
            p: 2,
            mb: 3,
            backgroundColor: alpha('#2196f3', 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha('#2196f3', 0.2)}`
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#2196f3' }}>
              🎵 YouTube Playlist Import
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Import all videos from a YouTube playlist at once using yt-dlp. Perfect for:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 1, pl: 2 }}>
              <Typography component="li" variant="caption" color="text.secondary">
                Music albums or compilations
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Curated song collections
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Artist discographies
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Live concert recordings
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              ✅ Supports public playlists • ⚡ Powered by yt-dlp • 📊 Up to 100 videos
            </Typography>
          </Box>
        )}

      </Box>

      {/* Video Preview */}
      {previewVideoId && !clipDialogOpen && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Video Preview
          </Typography>
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            '& iframe': {
              maxWidth: '100%',
              height: 'auto'
            }
          }}>
            <YouTube
              videoId={previewVideoId}
              opts={{
                height: '315',
                width: '560',
                playerVars: {
                  autoplay: 0,
                  controls: 1,
                  rel: 0,
                  showinfo: 0,
                },
              }}
              onReady={onYouTubeReady}
              onStateChange={onYouTubeStateChange}
            />
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setPreviewVideoId(null)}
            >
              Close Preview
            </Button>
          </Box>
        </Box>
      )}

      {/* Error Display */}
      {searchError && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setSearchError(null);
                  handleSearch(undefined, true);
                }}
              >
                Retry
              </Button>
            }
            sx={{ mb: 2 }}
          >
            <AlertTitle>Search Failed</AlertTitle>
            {searchError}
          </Alert>
        </Box>
      )}

      {/* No Results Message for Channel Search */}
      {searchMode === 'channels' && !loading && !searchError && searchQuery.trim() && channelResults.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, mb: 4 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No channels found for "{searchQuery}"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try different search terms or check your spelling
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleSearch(undefined, true)}
            startIcon={<SearchIcon />}
          >
            Search Again
          </Button>
        </Box>
      )}

      {/* Channel Results */}
      {channelResults.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Channel Results ({channelResults.length})
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
              xl: 'repeat(4, 1fr)'
            },
            gap: 2
          }}>
            {channelResults.map((channel) => {
              const dimensions = getCardDimensions();
              return (
              <Box key={channel.id}>
                <Card
                  onClick={() => handleChannelSelect(channel)}
                  sx={{
                    height: dimensions.height,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 24px ${currentTheme.primary}30`,
                      borderColor: currentTheme.primary,
                    }
                  }}
                >
                  <CardContent sx={{
                    flexGrow: 1,
                    p: `${dimensions.padding}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}>
                    {/* Header with Avatar and Title */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar
                        src={channel.thumbnail}
                        alt={channel.title}
                        sx={{
                          width: 56,
                          height: 56,
                          mr: 2,
                          bgcolor: currentTheme.primary,
                          fontSize: '1.4rem',
                          fontWeight: 600,
                          border: `2px solid ${currentTheme.primary}20`,
                          boxShadow: `0 2px 8px ${currentTheme.primary}20`,
                          flexShrink: 0
                        }}
                      >
                        {channel.title.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.2,
                            fontSize: dimensions.fontSize
                          }}
                        >
                          {channel.title}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Stats */}
                    <Box sx={{ mb: 2 }}>
                      {channel.subscriberCount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatViewCount(channel.subscriberCount).replace('views', 'subscribers')}
                          </Typography>
                        </Box>
                      )}
                      {channel.videoCount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PlayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatViewCount(channel.videoCount)} videos
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Description */}
                    <Box sx={{ flexGrow: 1, mb: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                          fontSize: '0.875rem'
                        }}
                      >
                        {channel.description || 'No description available'}
                      </Typography>
                    </Box>

                    {/* Click to view indicator */}
                    <Box sx={{
                      mt: 'auto',
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'center'
                    }}>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5
                        }}
                      >
                        <PlayIcon sx={{ fontSize: 14 }} />
                        Click to view videos
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Channel Videos or Search Results */}
      {(searchResults.length > 0 || channelVideos.length > 0 || selectedChannel) && (
        <Box sx={{ mb: 4 }}>
          {/* Results Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  {selectedChannel ? (
                    <>
                      📺 {selectedChannel.title} Videos
                    </>
                  ) : (
                    '🎬 Video Results'
                  )}
                </Typography>
                {selectedChannel && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      setSelectedChannel(null);
                      setChannelVideos([]);
                      setChannelVideoResult(null);
                      setSelectedVideos([]);
                      setVideoTimeConfigs({});

                      // Restore channel results if we were in channel search mode
                      if (searchMode === 'channels' && searchQuery.trim()) {
                        try {
                          const channels = await searchYouTubeChannels(searchQuery, null);
                          setChannelResults(channels);
                        } catch (error) {
                          console.error('Failed to restore channel results:', error);
                        }
                      }
                    }}
                    startIcon={<NavigateBeforeIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Back to Search
                  </Button>
                )}
              </Box>
              {(searchResult || channelVideoResult || channelPagination) && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {searchMode === 'channels' && channelPagination ? (
                      <>
                        Showing {channelResults.length} of {channelPagination.totalResults.toLocaleString()} channels
                        {channelPagination.currentPage > 1 && ` • Page ${channelPagination.currentPage} of ${channelPagination.totalPages}`}
                      </>
                    ) : (
                      <>
                        Showing {selectedChannel ? channelVideos.length : searchResults.length} of {(selectedChannel ? channelVideoResult : searchResult)?.totalResults.toLocaleString()} results
                        {currentPage > 1 && ` • Page ${currentPage}`}
                        {selectedChannel && ` • From ${selectedChannel.title}`}
                      </>
                    )}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedVideos.length > 0 && (
                <Chip
                  label={`${selectedVideos.length} selected`}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={handleSelectAll}
                disabled={selectedVideos.length === (selectedChannel ? channelVideos : searchResults).length}
                startIcon={<CheckBoxIcon />}
              >
                Select All
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleDeselectAll}
                disabled={selectedVideos.length === 0}
                startIcon={<CheckBoxOutlineBlankIcon />}
              >
                Deselect All
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleBulkAddToPlaylist}
                disabled={selectedVideos.length === 0}
                startIcon={<AddIcon />}
                sx={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                }}
              >
                Add Selected ({selectedVideos.length})
              </Button>
            </Box>
          </Box>

          {/* Pagination Controls - Top */}
          {((searchResult && (searchResult.nextPageToken || searchResult.prevPageToken)) ||
            (channelVideoResult && (channelVideoResult.nextPageToken || channelVideoResult.prevPageToken)) ||
            (channelPagination && (channelPagination.nextPageToken || channelPagination.prevPageToken))) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handlePrevPage}
                  disabled={
                    searchMode === 'channels'
                      ? !channelPagination?.prevPageToken || loading
                      : !(selectedChannel ? channelVideoResult?.prevPageToken : searchResult?.prevPageToken) || loading
                  }
                  startIcon={<NavigateBeforeIcon />}
                  size="small"
                >
                  Previous
                </Button>
                <Chip
                  label={
                    searchMode === 'channels' && channelPagination
                      ? `Page ${channelPagination.currentPage} of ${channelPagination.totalPages}`
                      : `Page ${currentPage}`
                  }
                  variant="outlined"
                  size="small"
                />
                <Button
                  variant="outlined"
                  onClick={handleNextPage}
                  disabled={
                    searchMode === 'channels'
                      ? !channelPagination?.nextPageToken || loading
                      : !(selectedChannel ? channelVideoResult?.nextPageToken : searchResult?.nextPageToken) || loading
                  }
                  endIcon={<NavigateNextIcon />}
                  size="small"
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* Loading state for channel videos */}
          {selectedChannel && channelVideos.length === 0 && loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Loading {selectedChannel.title} videos...
                </Typography>
              </Box>
            </Box>
          )}

          {/* No videos found state */}
          {selectedChannel && channelVideos.length === 0 && !loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  No videos found for {selectedChannel.title}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    setSelectedChannel(null);
                    setChannelVideos([]);
                    setChannelVideoResult(null);

                    // Restore channel results if we were in channel search mode
                    if (searchMode === 'channels' && searchQuery.trim()) {
                      try {
                        const channels = await searchYouTubeChannels(searchQuery, null);
                        setChannelResults(channels);
                      } catch (error) {
                        console.error('Failed to restore channel results:', error);
                      }
                    }
                  }}
                  startIcon={<NavigateBeforeIcon />}
                >
                  Back to Search
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
              xl: 'repeat(4, 1fr)'
            },
            gap: 2
          }}>
            {(selectedChannel ? channelVideos : searchResults).map((video) => {
              const isSelected = selectedVideos.some(v => v.id === video.id);
              const dimensions = getCardDimensions();
              return (
                <Box key={video.id}>
                  <Card sx={{
                    height: dimensions.height,
                    display: 'flex',
                    flexDirection: 'column',
                    border: isSelected ? `2px solid ${currentTheme.primary}` : '1px solid',
                    borderColor: isSelected ? currentTheme.primary : 'divider',
                    borderRadius: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected
                      ? `0 8px 24px ${currentTheme.primary}30, 0 0 0 1px ${currentTheme.primary}20`
                      : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 32px ${currentTheme.primary}25, 0 0 0 1px ${currentTheme.primary}30`,
                      borderColor: currentTheme.primary,
                    },
                    '&:before': isSelected ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: `linear-gradient(90deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                      zIndex: 1,
                    } : {}
                  }}>
                    <Box sx={{ position: 'relative', height: dimensions.thumbnailHeight }}>
                      <CardMedia
                        component="img"
                        height={dimensions.thumbnailHeight}
                        image={video.thumbnail}
                        alt={video.title}
                        sx={{
                          objectFit: 'cover',
                          width: '100%',
                          height: dimensions.thumbnailHeight
                        }}
                      />
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleVideoSelect(video, e.target.checked)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          borderRadius: '6px',
                          padding: '4px',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          },
                          '& .MuiSvgIcon-root': {
                            color: isSelected ? currentTheme.primary : 'white',
                            fontSize: '1.2rem'
                          }
                        }}
                      />
                      {/* Duration Badge */}
                      <Chip
                        label={formatTime(getVideoDuration(video))}
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: 'white',
                          fontWeight: 'bold',
                          height: 20,
                          '& .MuiChip-label': {
                            fontSize: '0.7rem',
                            padding: '0 6px'
                          }
                        }}
                      />
                    </Box>
                    <CardContent sx={{
                      height: dimensions.height - dimensions.thumbnailHeight,
                      p: `${dimensions.padding}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {/* Title - Fixed Height */}
                      <Box sx={{
                        height: `${dimensions.titleHeight}px`,
                        mb: 1,
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            display: '-webkit-box',
                            WebkitLineClamp: dimensions.titleLines,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.2,
                            height: '100%',
                            fontSize: dimensions.fontSize
                          }}
                        >
                          {video.title}
                        </Typography>
                      </Box>

                      {/* Channel - Fixed Height */}
                      <Box sx={{
                        height: `${dimensions.channelHeight}px`,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <PersonIcon sx={{ fontSize: cardSize === 'large' ? 16 : 14, mr: 0.5, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ fontWeight: 500, fontSize: dimensions.fontSize }}
                        >
                          {video.channelTitle}
                        </Typography>
                      </Box>

                      {/* Metadata - Fixed Height */}
                      <Box sx={{
                        height: `${dimensions.metadataHeight}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        gap: 0.5,
                        overflow: 'hidden',
                        flexShrink: 0,
                        mb: 1
                      }}>
                        {video.viewCount && (
                          <Box sx={{ display: 'flex', alignItems: 'center', height: '16px' }}>
                            <VisibilityIcon sx={{ fontSize: cardSize === 'large' ? 14 : 12, mr: 0.5, color: 'text.secondary', flexShrink: 0 }} />
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: dimensions.fontSize }}>
                              {formatViewCount(video.viewCount)}
                            </Typography>
                          </Box>
                        )}
                        {video.publishedAt && (
                          <Box sx={{ display: 'flex', alignItems: 'center', height: '16px' }}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: dimensions.fontSize }}>
                              {formatPublishDate(video.publishedAt)}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Spacer to push buttons to bottom */}
                      <Box sx={{ flexGrow: 1 }} />

                      {/* Buttons - Fixed Position at Bottom */}
                      <Box sx={{
                        height: `${dimensions.buttonAreaHeight}px`,
                        display: 'flex',
                        gap: cardSize === 'large' ? 1 : 0.5,
                        alignItems: 'center'
                      }}>
                        <Button
                          variant="outlined"
                          startIcon={cardSize !== 'small' ? <PlayIcon /> : undefined}
                          onClick={() => handlePlayVideo(video)}
                          size={cardSize === 'large' ? 'medium' : 'small'}
                          sx={{
                            flex: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: dimensions.buttonFontSize,
                            height: `${dimensions.buttonAreaHeight}px`,
                            minWidth: 0,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: 2,
                              backgroundColor: alpha(currentTheme.primary, 0.04),
                            }
                          }}
                        >
                          Play
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={cardSize !== 'small' ? <VisibilityIcon /> : undefined}
                          onClick={() => handlePreviewVideo(video)}
                          size={cardSize === 'large' ? 'medium' : 'small'}
                          sx={{
                            flex: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: dimensions.buttonFontSize,
                            height: `${dimensions.buttonAreaHeight}px`,
                            minWidth: 0,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: 2,
                              backgroundColor: alpha(currentTheme.secondary, 0.04),
                            }
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={cardSize !== 'small' ? <AddIcon /> : undefined}
                          onClick={() => handleAddToPlaylist(video)}
                          size={cardSize === 'large' ? 'medium' : 'small'}
                          sx={{
                            flex: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: dimensions.buttonFontSize,
                            height: `${dimensions.buttonAreaHeight}px`,
                            minWidth: 0,
                            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: `0 4px 12px ${currentTheme.primary}40`,
                              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                              filter: 'brightness(1.1)',
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>

          {/* Pagination Controls - Bottom */}
          {((searchResult && (searchResult.nextPageToken || searchResult.prevPageToken)) ||
            (channelVideoResult && (channelVideoResult.nextPageToken || channelVideoResult.prevPageToken)) ||
            (channelPagination && (channelPagination.nextPageToken || channelPagination.prevPageToken))) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handlePrevPage}
                  disabled={
                    searchMode === 'channels'
                      ? !channelPagination?.prevPageToken || loading
                      : !(selectedChannel ? channelVideoResult?.prevPageToken : searchResult?.prevPageToken) || loading
                  }
                  startIcon={<NavigateBeforeIcon />}
                >
                  Previous
                </Button>
                <Chip
                  label={
                    searchMode === 'channels' && channelPagination
                      ? `Page ${channelPagination.currentPage} of ${channelPagination.totalPages}`
                      : `Page ${currentPage}`
                  }
                  color="primary"
                  variant="outlined"
                />
                <Button
                  variant="outlined"
                  onClick={handleNextPage}
                  disabled={
                    searchMode === 'channels'
                      ? !channelPagination?.nextPageToken || loading
                      : !(selectedChannel ? channelVideoResult?.nextPageToken : searchResult?.nextPageToken) || loading
                  }
                  endIcon={<NavigateNextIcon />}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Current Playlist */}
      {(currentPlaylist.length > 0 || isEditingMode) && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {isEditingMode ? `Editing: ${playlistName}` : 'Current Playlist'} ({currentPlaylist.length} clip{currentPlaylist.length !== 1 ? 's' : ''})
            </Typography>
            {isEditingMode && (
              <Chip
                label="Editing Mode"
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          {currentPlaylist.length > 0 ? (
            <DragDropContext onDragEnd={handleClipDragEnd}>
              <Droppable droppableId="youtube-playlist-clips">
                {(provided) => (
                  <List
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      backgroundColor: 'background.paper',
                      borderRadius: 2,
                      border: `1px solid ${currentTheme.primary}20`,
                      mb: 3
                    }}
                  >
                    {currentPlaylist.map((clip, index) => (
                    <Draggable key={clip.id} draggableId={clip.id} index={index}>
                      {(provided, snapshot) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            borderBottom: index < currentPlaylist.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            backgroundColor: snapshot.isDragging ? 'action.hover' : 'transparent',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            }
                          }}
                        >
                          {/* Drag Handle */}
                          <Box
                            {...provided.dragHandleProps}
                            sx={{
                              mr: 2,
                              cursor: 'grab',
                              color: 'text.secondary',
                              '&:active': {
                                cursor: 'grabbing'
                              }
                            }}
                          >
                            <DragHandleIcon />
                          </Box>

                          {/* Thumbnail */}
                          <Box sx={{ mr: 2 }}>
                            <img
                              src={clip.thumbnail}
                              alt={clip.title}
                              style={{
                                width: 60,
                                height: 45,
                                borderRadius: 4,
                                objectFit: 'cover'
                              }}
                            />
                          </Box>

                          {/* Content */}
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" noWrap>
                                {clip.title}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {clip.artist}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                  <Chip
                                    label={`Start: ${formatTime(clip.startTime)}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`${clip.duration}s`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>
                            }
                          />

                          {/* Actions */}
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleEditClip(clip)}
                                sx={{ color: 'primary.main' }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => removeFromPlaylist(clip.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <Box sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              border: `1px solid ${currentTheme.primary}20`,
              p: 4,
              textAlign: 'center',
              mb: 3
            }}>
              <Typography variant="body1" color="text.secondary">
                {isEditingMode ? 'This playlist is currently empty. Add clips by searching for videos above.' : 'No clips added yet. Search for videos and add them to your playlist.'}
              </Typography>
            </Box>
          )}

          <Box sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Quick Save Button - Only show in editing mode */}
            {isEditingMode && (
              <Button
                variant="outlined"
                size="large"
                startIcon={quickSaveSuccess ? <CheckCircleIcon /> : <SaveIcon />}
                onClick={handleQuickSave}
                disabled={!editingPlaylist}
                sx={{
                  borderColor: quickSaveSuccess ? 'success.main' : currentTheme.primary,
                  color: quickSaveSuccess ? 'success.main' : currentTheme.primary,
                  fontWeight: 600,
                  minWidth: 180,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: quickSaveSuccess ? 'success.dark' : currentTheme.secondary,
                    backgroundColor: quickSaveSuccess ? alpha(theme.palette.success.main, 0.1) : alpha(currentTheme.primary, 0.1),
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                {quickSaveSuccess ? 'Saved!' : 'Save to Current Playlist'}
              </Button>
            )}

            {/* Main Save/Update Button */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSavePlaylist}
              sx={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                fontWeight: 600,
                minWidth: 180,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 4,
                }
              }}
            >
              {isEditingMode ? 'Update Options...' : 'Save Playlist'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Enhanced Video Player Dialog */}
      <Dialog
        open={!!playingVideoId}
        onClose={handleClosePlayer}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#000',
            borderRadius: 3,
            overflow: 'hidden',
            '& .MuiDialogContent-root': {
              padding: 0
            }
          }
        }}
        sx={{
          '& .MuiDialog-paper': {
            margin: 2,
            maxHeight: 'calc(100vh - 32px)',
          }
        }}
      >
        <DialogTitle sx={{
          color: 'white',
          backgroundColor: '#000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlayIcon sx={{ color: currentTheme.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Video Player
            </Typography>
          </Box>
          <IconButton
            onClick={handleClosePlayer}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#000', p: 0, position: 'relative' }}>
          {playingVideoId && (
            <Box sx={{
              position: 'relative',
              paddingBottom: '56.25%', // 16:9 aspect ratio
              height: 0,
              overflow: 'hidden',
              '& iframe': {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }
            }}>
              <YouTube
                videoId={playingVideoId}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    start: playbackStartTime,
                    modestbranding: 1,
                    rel: 0,
                    fs: 1, // Enable fullscreen
                    cc_load_policy: 0,
                    iv_load_policy: 3,
                    enablejsapi: 1,
                    origin: window.location.origin,
                  }
                }}
                onReady={(event) => {
                  if (playbackStartTime > 0) {
                    event.target.seekTo(playbackStartTime);
                  }
                }}
                onStateChange={(event) => {
                  // Handle fullscreen changes if needed
                  console.log('Player state changed:', event.data);
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Clip Configuration Dialog */}
      <Dialog open={clipDialogOpen} onClose={handleClipCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {sequentialExtractionActive
            ? `Configure Clip - Video ${currentSequentialIndex + 1} of ${sequentialVideos.length}`
            : 'Configure Clip'
          }
        </DialogTitle>
        <DialogContent>
          {selectedVideo && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {selectedVideo.title}
              </Typography>

              {/* YouTube Player for Preview */}
              <Box sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'center',
                '& iframe': {
                  maxWidth: '100%',
                  height: 'auto'
                }
              }}>
                <YouTube
                  videoId={selectedVideo.id}
                  opts={{
                    height: '240',
                    width: '426',
                    playerVars: {
                      autoplay: 0,
                      controls: 1,
                      rel: 0,
                      showinfo: 0,
                      start: clipStartTime,
                    },
                  }}
                  onReady={onYouTubeReady}
                  onStateChange={onYouTubeStateChange}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Video Duration: {formatTime(getVideoDuration(selectedVideo))}
                </Typography>
              </Box>

              {/* Start Time Configuration */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                  Start Time: {formatTime(clipStartTime)}
                </Typography>

                {/* Precise Time Input */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Minutes"
                    type="number"
                    value={Math.floor(clipStartTime / 60)}
                    onChange={(e) => {
                      const minutes = parseInt(e.target.value) || 0;
                      const seconds = clipStartTime % 60;
                      const newTime = Math.min(minutes * 60 + seconds, maxStartTime);
                      setClipStartTime(newTime);
                    }}
                    inputProps={{ min: 0, max: Math.floor(maxStartTime / 60) }}
                    sx={{ width: 80 }}
                  />
                  <Typography variant="body2">:</Typography>
                  <TextField
                    size="small"
                    label="Seconds"
                    type="number"
                    value={clipStartTime % 60}
                    onChange={(e) => {
                      const seconds = parseInt(e.target.value) || 0;
                      const minutes = Math.floor(clipStartTime / 60);
                      const newTime = Math.min(minutes * 60 + seconds, maxStartTime);
                      setClipStartTime(newTime);
                    }}
                    inputProps={{ min: 0, max: 59 }}
                    sx={{ width: 80 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setClipStartTime(Math.max(0, clipStartTime - 5))}
                      disabled={clipStartTime <= 0}
                    >
                      -5s
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setClipStartTime(Math.min(maxStartTime, clipStartTime + 5))}
                      disabled={clipStartTime >= maxStartTime}
                    >
                      +5s
                    </Button>
                  </Box>
                </Box>

                {/* Time Slider */}
                <Slider
                  value={clipStartTime}
                  onChange={(_, value) => setClipStartTime(value as number)}
                  min={0}
                  max={maxStartTime}
                  step={1}
                  marks={[
                    { value: 0, label: '0:00' },
                    { value: Math.floor(maxStartTime / 2), label: formatTime(Math.floor(maxStartTime / 2)) },
                    { value: maxStartTime, label: formatTime(maxStartTime) }
                  ]}
                  sx={{ mb: 2 }}
                />

                {/* Enhanced Media Controls */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {/* Jump to Video Start */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SkipPreviousIcon />}
                    onClick={handleJumpToVideoStart}
                    title="Jump to video beginning"
                  >
                    Start
                  </Button>

                  {/* Repeat Clip */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RepeatIcon />}
                    onClick={handleRepeatClip}
                    title="Restart clip from designated start time"
                  >
                    Repeat
                  </Button>

                  {/* Play/Pause Clip */}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={isClipPlaying ? <PauseIcon /> : <PlayIcon />}
                    onClick={handlePlayPauseClip}
                    title={isClipPlaying ? "Pause clip" : "Play clip"}
                    sx={{
                      background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                      minWidth: 100
                    }}
                  >
                    {isClipPlaying ? 'Pause' : 'Play'}
                  </Button>

                  {/* Stop */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<StopIcon />}
                    onClick={handleStopClip}
                    title="Stop playback"
                  >
                    Stop
                  </Button>

                  {/* Jump to Video End */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SkipNextIcon />}
                    onClick={handleJumpToVideoEnd}
                    title="Jump to last minute of video"
                  >
                    End
                  </Button>

                  {/* Random Start Time */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CasinoIcon />}
                    onClick={handleRandomStartTime}
                    title="Set random start time"
                    sx={{
                      color: 'secondary.main',
                      borderColor: 'secondary.main',
                      '&:hover': {
                        backgroundColor: 'secondary.main',
                        color: 'white',
                      }
                    }}
                  >
                    Random
                  </Button>
                </Box>
              </Box>

              {/* Duration Configuration */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                  Clip Duration
                </Typography>

                {/* Preset Duration Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {[30, 45, 60, 90, 120].map((duration) => (
                    <Button
                      key={duration}
                      variant={clipDuration === duration && !useCustomDuration ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        setUseCustomDuration(false);
                        handlePresetDurationChange(duration);
                      }}
                      sx={{
                        minWidth: 'auto',
                        px: 2,
                        ...(clipDuration === duration && !useCustomDuration && {
                          background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                        })
                      }}
                    >
                      {duration === 60 ? '60s (Power Hour)' : `${duration}s`}
                    </Button>
                  ))}
                </Box>

                {/* Custom Duration Option */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useCustomDuration}
                      onChange={(e) => handleCustomDurationToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Custom duration"
                  sx={{ mb: useCustomDuration ? 1 : 0 }}
                />

                {/* Custom Duration Input */}
                {useCustomDuration && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Duration (seconds)"
                    type="number"
                    value={customDurationInput}
                    onChange={(e) => handleCustomDurationChange(e.target.value)}
                    inputProps={{
                      min: 1,
                      max: 600,
                      step: 1
                    }}
                    helperText="Enter duration in seconds (1-600)"
                    sx={{ mt: 1 }}
                  />
                )}

                {/* Duration Display */}
                <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current duration: <strong>{clipDuration} seconds</strong>
                    {clipDuration >= 60 && ` (${Math.floor(clipDuration / 60)}:${(clipDuration % 60).toString().padStart(2, '0')})`}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Clip will play from {formatTime(clipStartTime)} to {formatTime(clipStartTime + clipDuration)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClipCancel}>
            {sequentialExtractionActive ? 'Cancel All' : 'Cancel'}
          </Button>
          <Button onClick={handleClipConfirm} variant="contained">
            {sequentialExtractionActive
              ? (currentSequentialIndex === sequentialVideos.length - 1 ? 'Finish' : 'Next Video')
              : (selectedVideo && currentPlaylist.some(clip => clip.videoId === selectedVideo.id)
                ? 'Update Clip'
                : 'Add to Playlist'
              )
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Playlist Dialog */}
      <Dialog open={saveDialogOpen} onClose={handleSaveCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditingMode ? 'Update YouTube Playlist' : 'Save YouTube Playlist'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Playlist Name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Enter playlist name..."
              sx={{ mb: 2 }}
            />

            {isEditingMode && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Editing Mode Options:
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • <strong>Update Existing:</strong> Save changes to the original playlist<br/>
                  • <strong>Save As New:</strong> Create a new playlist while keeping the original
                </Typography>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary">
              This playlist contains {currentPlaylist.length} clips with a total duration of {formatTime(currentPlaylist.reduce((total, clip) => total + clip.duration, 0))}.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveCancel}>Cancel</Button>
          {isEditingMode ? (
            <>
              <Button
                onClick={() => handleSaveConfirm(true)}
                variant="outlined"
                disabled={!playlistName.trim()}
              >
                Save As New
              </Button>
              <Button
                onClick={() => handleSaveConfirm(false)}
                variant="contained"
                disabled={!playlistName.trim()}
                sx={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                }}
              >
                Update Existing
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleSaveConfirm(false)}
              variant="contained"
              disabled={!playlistName.trim()}
              sx={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
              }}
            >
              Save Playlist
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk Configuration Dialog */}
      <Dialog open={bulkConfigDialogOpen} onClose={handleBulkCancel} maxWidth="md" fullWidth>
        <DialogTitle>
          Configure Multiple Videos ({selectedVideos.length} selected)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Time Selection Mode */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Time Selection Mode</FormLabel>
              <RadioGroup
                value={timeSelectionMode}
                onChange={(e) => setTimeSelectionMode(e.target.value as 'manual' | 'random' | 'same')}
                row
              >
                <FormControlLabel
                  value="random"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShuffleIcon sx={{ mr: 1 }} />
                      Random minute for each video
                    </Box>
                  }
                />
                <FormControlLabel
                  value="same"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 1 }} />
                      Same time for all videos
                    </Box>
                  }
                />
                <FormControlLabel
                  value="manual"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ mr: 1 }} />
                        Manual time for each video
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 3, mt: 0.5 }}>
                        Opens the minute extractor for each video sequentially
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Global Duration Setting */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Clip Duration</InputLabel>
                <Select
                  value={bulkDuration}
                  onChange={(e) => setBulkDuration(e.target.value as number)}
                  label="Clip Duration"
                >
                  <MenuItem value={30}>30 seconds</MenuItem>
                  <MenuItem value={45}>45 seconds</MenuItem>
                  <MenuItem value={60}>60 seconds (Power Hour)</MenuItem>
                  <MenuItem value={90}>90 seconds</MenuItem>
                  <MenuItem value={120}>2 minutes</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Same Time Configuration */}
            {timeSelectionMode === 'same' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Start Time for All Videos: {formatTime(bulkStartTime)}
                </Typography>
                <Slider
                  value={bulkStartTime}
                  onChange={(_, value) => setBulkStartTime(value as number)}
                  min={0}
                  max={300} // 5 minutes max
                  step={1}
                  marks={[
                    { value: 0, label: '0:00' },
                    { value: 60, label: '1:00' },
                    { value: 120, label: '2:00' },
                    { value: 180, label: '3:00' },
                    { value: 240, label: '4:00' },
                    { value: 300, label: '5:00' }
                  ]}
                />
              </Box>
            )}

            {/* Manual Configuration Info */}
            {timeSelectionMode === 'manual' && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Sequential Manual Configuration
                </Typography>
                <Typography variant="body2">
                  When you click "Add Clips", the minute extractor will open for each video one by one.
                  You'll be able to set precise start and end times for each video using the full interface
                  with video preview and controls.
                </Typography>
              </Box>
            )}

            {/* Summary */}
            <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {timeSelectionMode === 'random' && 'Random start times will be generated for each video.'}
                {timeSelectionMode === 'same' && `All videos will start at ${formatTime(bulkStartTime)}.`}
                {timeSelectionMode === 'manual' && 'The minute extractor will open sequentially for each video, allowing you to set precise start and end times.'}
                <br />
                Total clips to add: {selectedVideos.length}
              </Typography>
            </Box>

            {bulkProcessing && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Creating clips...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBulkCancel} disabled={bulkProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkConfirm}
            variant="contained"
            disabled={bulkProcessing || selectedVideos.length === 0}
            sx={{
              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
            }}
          >
            {bulkProcessing ? 'Processing...' : `Add ${selectedVideos.length} Clips`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default YouTubeSearch;
