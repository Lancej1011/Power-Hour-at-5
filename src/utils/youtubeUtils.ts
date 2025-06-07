// YouTube utility functions for Power Hour integration

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnail: string;
  description?: string;
  publishedAt?: string;
  viewCount?: string;
  likeCount?: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  resultsPerPage: number;
  source?: string; // 'unlimited', 'api', etc.
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  pageToken?: string;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  publishedAfter?: string;
  publishedBefore?: string;
  channelId?: string;
  useYtDlp?: boolean; // Enable unlimited search with yt-dlp
  forceYtDlpCheck?: boolean; // Force fresh yt-dlp availability check
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount?: string;
  videoCount?: string;
  customUrl?: string;
  channelType?: string;
  isTopicChannel?: boolean;
  isVevoChannel?: boolean;
  isMusicChannel?: boolean;
  latestVideoTitle?: string;
  latestVideoDate?: string;
}

export interface YouTubeClip {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  startTime: number; // in seconds
  duration: number; // in seconds (typically 60 for power hour)
  thumbnail: string;
}

export interface YouTubePlaylist {
  id: string;
  name: string;
  clips: YouTubeClip[];
  drinkingSoundPath?: string;
  imagePath?: string;
  date: string;
  // Thumbnail management properties
  thumbnailType?: 'custom' | 'random';
  lastThumbnailUpdate?: string;
  // Sharing properties
  isPublic?: boolean;
  shareCode?: string;
  creator?: string;
  description?: string;
  rating?: number;
  downloadCount?: number;
  tags?: string[];
  // Metadata
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

// Extract video ID from various YouTube URL formats
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

// Convert YouTube duration format (PT4M13S) to seconds
export const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
};

// Format seconds to MM:SS format
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Generate YouTube embed URL with start time
export const getEmbedUrl = (videoId: string, startTime?: number): string => {
  let url = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  if (startTime) {
    url += `&start=${Math.floor(startTime)}`;
  }
  return url;
};

// Generate YouTube thumbnail URL
export const getThumbnailUrl = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

// Generate mock data for demo purposes
const generateMockData = (query: string, page: number = 1, resultsPerPage: number = 10): YouTubeSearchResult => {
  const mockVideos = [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
      channelTitle: 'Rick Astley',
      duration: 'PT3M33S',
      thumbnail: getThumbnailUrl('dQw4w9WgXcQ'),
      description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
      publishedAt: '2009-10-25T06:57:33Z',
      viewCount: '1400000000',
      likeCount: '15000000'
    },
    {
      id: 'L_jWHffIx5E',
      title: 'Smash Mouth - All Star (Official Music Video)',
      channelTitle: 'SmashMouthVEVO',
      duration: 'PT3M20S',
      thumbnail: getThumbnailUrl('L_jWHffIx5E'),
      description: 'Official music video for All Star by Smash Mouth',
      publishedAt: '2010-05-24T23:20:32Z',
      viewCount: '800000000',
      likeCount: '8000000'
    },
    {
      id: '9bZkp7q19f0',
      title: 'PSY - GANGNAM STYLE(강남스타일) M/V',
      channelTitle: 'officialpsy',
      duration: 'PT3M39S',
      thumbnail: getThumbnailUrl('9bZkp7q19f0'),
      description: 'PSY - GANGNAM STYLE(강남스타일) M/V @ https://youtu.be/9bZkp7q19f0',
      publishedAt: '2012-07-15T08:34:21Z',
      viewCount: '5000000000',
      likeCount: '25000000'
    }
  ];

  // Simulate more results by repeating and modifying
  const allMockVideos = [];
  for (let i = 0; i < 50; i++) {
    mockVideos.forEach((video, index) => {
      allMockVideos.push({
        ...video,
        id: `${video.id}_${i}_${index}`,
        title: `${video.title} (Result ${i * 3 + index + 1})`,
        viewCount: String(parseInt(video.viewCount || '0') + Math.floor(Math.random() * 1000000))
      });
    });
  }

  const startIndex = (page - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const pageVideos = allMockVideos.slice(startIndex, endIndex);

  return {
    videos: pageVideos,
    nextPageToken: endIndex < allMockVideos.length ? `page_${page + 1}` : undefined,
    prevPageToken: page > 1 ? `page_${page - 1}` : undefined,
    totalResults: allMockVideos.length,
    resultsPerPage
  };
};

// Generate channel-specific mock data
const generateChannelMockData = (channelId: string, page: number = 1, resultsPerPage: number = 10): YouTubeSearchResult => {
  console.log('🎭 GENERATING CHANNEL MOCK DATA');
  console.log('Channel ID:', channelId);
  console.log('Page:', page);
  console.log('Results per page:', resultsPerPage);
  // Channel-specific video templates
  const channelVideoTemplates: {[key: string]: any[]} = {
    'UC-9-kyTW8ZkZNDHQJ6FgpwQ': [ // Epic Music Channel
      {
        id: 'epic1',
        title: 'Epic Orchestral Battle Music - Rise of Heroes',
        channelTitle: 'Epic Music Channel',
        duration: 'PT4M15S',
        description: 'Epic orchestral music perfect for power hour motivation',
        publishedAt: '2024-01-15T10:30:00Z',
        viewCount: '2500000',
        likeCount: '85000'
      },
      {
        id: 'epic2',
        title: 'Cinematic Adventure Soundtrack - Journey Begins',
        channelTitle: 'Epic Music Channel',
        duration: 'PT3M45S',
        description: 'Cinematic adventure music for epic moments',
        publishedAt: '2024-01-10T14:20:00Z',
        viewCount: '1800000',
        likeCount: '62000'
      }
    ],
    'UC-8-kyTW8ZkZNDHQJ6FgpwR': [ // Rock Legends
      {
        id: 'rock1',
        title: 'Classic Rock Anthems - Greatest Hits Collection',
        channelTitle: 'Rock Legends',
        duration: 'PT5M20S',
        description: 'The best classic rock anthems of all time',
        publishedAt: '2024-01-12T16:45:00Z',
        viewCount: '3200000',
        likeCount: '125000'
      },
      {
        id: 'rock2',
        title: 'Heavy Metal Thunder - Power Ballads',
        channelTitle: 'Rock Legends',
        duration: 'PT4M30S',
        description: 'Epic heavy metal power ballads',
        publishedAt: '2024-01-08T12:15:00Z',
        viewCount: '2100000',
        likeCount: '89000'
      }
    ],
    'UC-7-kyTW8ZkZNDHQJ6FgpwS': [ // Electronic Beats
      {
        id: 'edm1',
        title: 'Electronic Dance Mix - Festival Vibes',
        channelTitle: 'Electronic Beats',
        duration: 'PT6M10S',
        description: 'High-energy electronic dance music',
        publishedAt: '2024-01-14T20:30:00Z',
        viewCount: '4100000',
        likeCount: '180000'
      },
      {
        id: 'edm2',
        title: 'Synthwave Retro - Neon Nights',
        channelTitle: 'Electronic Beats',
        duration: 'PT4M55S',
        description: 'Retro synthwave for late night vibes',
        publishedAt: '2024-01-11T18:00:00Z',
        viewCount: '2800000',
        likeCount: '95000'
      }
    ]
  };

  // Get videos for this channel or use default
  const baseVideos = channelVideoTemplates[channelId] || [
    {
      id: 'default1',
      title: 'Channel Video 1 - Music Mix',
      channelTitle: 'Music Channel',
      duration: 'PT3M30S',
      description: 'Great music for your playlist',
      publishedAt: '2024-01-10T12:00:00Z',
      viewCount: '1000000',
      likeCount: '50000'
    },
    {
      id: 'default2',
      title: 'Channel Video 2 - Best Hits',
      channelTitle: 'Music Channel',
      duration: 'PT4M00S',
      description: 'The best hits collection',
      publishedAt: '2024-01-08T15:30:00Z',
      viewCount: '800000',
      likeCount: '35000'
    }
  ];

  // Generate more videos by repeating and modifying
  const allMockVideos = [];
  for (let i = 0; i < 20; i++) {
    baseVideos.forEach((video, index) => {
      allMockVideos.push({
        ...video,
        id: `${video.id}_${i}_${index}`,
        title: `${video.title} (Video ${i * baseVideos.length + index + 1})`,
        thumbnail: getThumbnailUrl(video.id),
        viewCount: String(parseInt(video.viewCount || '0') + Math.floor(Math.random() * 500000)),
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    });
  }

  const startIndex = (page - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const pageVideos = allMockVideos.slice(startIndex, endIndex);

  const result = {
    videos: pageVideos,
    nextPageToken: endIndex < allMockVideos.length ? `page_${page + 1}` : undefined,
    prevPageToken: page > 1 ? `page_${page - 1}` : undefined,
    totalResults: allMockVideos.length,
    resultsPerPage
  };

  console.log('🎬 MOCK DATA RESULT:', result);
  console.log('Number of videos in result:', result.videos.length);

  return result;
};

// Enhanced search function with pagination support
export const searchYouTubeVideos = async (
  query: string,
  credentials?: string | any, // Can be API key string or OAuth tokens object
  options: YouTubeSearchOptions = {}
): Promise<YouTubeSearchResult> => {
  const {
    maxResults = 25,
    pageToken,
    order = 'relevance',
    videoDuration = 'any',
    publishedAfter,
    publishedBefore
  } = options;

  // Handle different credential types
  let apiKey: string | undefined;
  let authHeaders: Record<string, string> = {};

  if (!credentials) {
    throw new Error('No authentication credentials provided. Please configure YouTube API key or sign in with Google OAuth.');
  } else if (typeof credentials === 'string') {
    // API Key authentication
    apiKey = credentials;
    console.log('🔑 Using API Key authentication');
  } else if (credentials && typeof credentials === 'object' && credentials.accessToken) {
    // OAuth token authentication
    authHeaders['Authorization'] = `Bearer ${credentials.accessToken}`;
    console.log('🎫 Using OAuth token authentication');
  } else {
    console.error('❌ Invalid credentials provided:', credentials);
    const page = pageToken ? parseInt(pageToken.split('_')[1]) || 1 : 1;
    return generateMockData(query, page, maxResults);
  }

  try {
    // Build search URL with parameters
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order
    });

    // Add API key only if using API key authentication
    if (apiKey) {
      searchParams.set('key', apiKey);
    }

    if (pageToken) searchParams.append('pageToken', pageToken);
    if (videoDuration !== 'any') searchParams.append('videoDuration', videoDuration);
    if (publishedAfter) searchParams.append('publishedAfter', publishedAfter);
    if (publishedBefore) searchParams.append('publishedBefore', publishedBefore);

    const url = `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`;
    console.log('🔍 Searching YouTube:', url);
    console.log('🔐 Auth headers:', authHeaders);

    const response = await fetch(url, {
      headers: authHeaders
    });

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();

    // Get video details including duration, statistics
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');

    // Build details URL with proper authentication
    const detailsParams = new URLSearchParams({
      part: 'contentDetails,snippet,statistics',
      id: videoIds
    });

    if (apiKey) {
      detailsParams.set('key', apiKey);
    }

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`;
    console.log('🎬 Getting video details:', detailsUrl);

    const detailsResponse = await fetch(detailsUrl, {
      headers: authHeaders
    });

    const detailsData = await detailsResponse.json();

    const videos: YouTubeVideo[] = detailsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      duration: item.contentDetails.duration,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount,
      likeCount: item.statistics?.likeCount
    }));

    return {
      videos,
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken,
      totalResults: data.pageInfo?.totalResults || 0,
      resultsPerPage: data.pageInfo?.resultsPerPage || maxResults
    };
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return {
      videos: [],
      totalResults: 0,
      resultsPerPage: maxResults
    };
  }
};

// Legacy function for backward compatibility
export const searchYouTubeVideosLegacy = async (query: string, apiKey?: string): Promise<YouTubeVideo[]> => {
  const result = await searchYouTubeVideos(query, apiKey, { maxResults: 10 });
  return result.videos;
};

// Create a clip from a YouTube video
export const createClipFromVideo = (video: YouTubeVideo, startTime: number = 0, duration: number = 60): YouTubeClip => {
  return {
    id: `${video.id}_${startTime}`,
    videoId: video.id,
    title: video.title,
    artist: video.channelTitle,
    startTime,
    duration,
    thumbnail: video.thumbnail
  };
};

// Save YouTube playlist to localStorage
export const saveYouTubePlaylist = (playlist: YouTubePlaylist): boolean => {
  try {
    const existingPlaylists = getYouTubePlaylists();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlist.id);
    updatedPlaylists.push(playlist);
    localStorage.setItem('youtube_playlists', JSON.stringify(updatedPlaylists));
    console.log('✅ Successfully saved YouTube playlist:', playlist.name);
    return true;
  } catch (error) {
    console.error('❌ Error saving YouTube playlist:', error);
    return false;
  }
};

// Get all YouTube playlists from localStorage
export const getYouTubePlaylists = (): YouTubePlaylist[] => {
  try {
    const stored = localStorage.getItem('youtube_playlists');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading YouTube playlists:', error);
    return [];
  }
};

// Delete YouTube playlist
export const deleteYouTubePlaylist = (playlistId: string): void => {
  try {
    const existingPlaylists = getYouTubePlaylists();
    const updatedPlaylists = existingPlaylists.filter(p => p.id !== playlistId);
    localStorage.setItem('youtube_playlists', JSON.stringify(updatedPlaylists));
  } catch (error) {
    console.error('Error deleting YouTube playlist:', error);
  }
};

// Generate a unique ID for playlists
export const generatePlaylistId = (): string => {
  return `youtube_playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// YouTube Playlist Thumbnail Management Functions

/**
 * Get a random thumbnail from a YouTube playlist's clips
 * @param playlist - The YouTube playlist
 * @returns The thumbnail URL of a randomly selected clip, or null if no clips
 */
export const getRandomPlaylistThumbnail = (playlist: YouTubePlaylist): string | null => {
  if (!playlist.clips || playlist.clips.length === 0) {
    return null;
  }

  // Filter clips that have valid thumbnails
  const clipsWithThumbnails = playlist.clips.filter(clip => clip.thumbnail && clip.thumbnail.trim() !== '');

  if (clipsWithThumbnails.length === 0) {
    return null;
  }

  // Select a random clip
  const randomIndex = Math.floor(Math.random() * clipsWithThumbnails.length);
  return clipsWithThumbnails[randomIndex].thumbnail;
};

/**
 * Update a YouTube playlist's thumbnail to use a random video thumbnail
 * @param playlistId - The playlist ID
 * @returns The updated playlist with new thumbnail, or null if failed
 */
export const setRandomThumbnailForPlaylist = (playlistId: string): YouTubePlaylist | null => {
  try {
    const playlists = getYouTubePlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      console.error('Playlist not found:', playlistId);
      return null;
    }

    const playlist = playlists[playlistIndex];
    const randomThumbnail = getRandomPlaylistThumbnail(playlist);

    if (!randomThumbnail) {
      console.error('No valid thumbnails found in playlist:', playlistId);
      return null;
    }

    // Update the playlist with the random thumbnail
    const updatedPlaylist = {
      ...playlist,
      imagePath: randomThumbnail,
      // Add metadata to track that this is a random thumbnail
      thumbnailType: 'random' as const,
      lastThumbnailUpdate: new Date().toISOString()
    };

    playlists[playlistIndex] = updatedPlaylist;
    localStorage.setItem('youtube_playlists', JSON.stringify(playlists));

    return updatedPlaylist;
  } catch (error) {
    console.error('Error setting random thumbnail for playlist:', error);
    return null;
  }
};

/**
 * Set a custom image path for a YouTube playlist
 * @param playlistId - The playlist ID
 * @param imagePath - The custom image path
 * @returns The updated playlist, or null if failed
 */
export const setCustomImageForPlaylist = (playlistId: string, imagePath: string): YouTubePlaylist | null => {
  try {
    const playlists = getYouTubePlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      console.error('Playlist not found:', playlistId);
      return null;
    }

    const playlist = playlists[playlistIndex];

    // Update the playlist with the custom image
    const updatedPlaylist = {
      ...playlist,
      imagePath: imagePath,
      // Add metadata to track that this is a custom image
      thumbnailType: 'custom' as const,
      lastThumbnailUpdate: new Date().toISOString()
    };

    playlists[playlistIndex] = updatedPlaylist;
    localStorage.setItem('youtube_playlists', JSON.stringify(playlists));

    return updatedPlaylist;
  } catch (error) {
    console.error('Error setting custom image for playlist:', error);
    return null;
  }
};

/**
 * Clear the thumbnail/image for a YouTube playlist (revert to default)
 * @param playlistId - The playlist ID
 * @returns The updated playlist, or null if failed
 */
export const clearPlaylistThumbnail = (playlistId: string): YouTubePlaylist | null => {
  try {
    const playlists = getYouTubePlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      console.error('Playlist not found:', playlistId);
      return null;
    }

    const playlist = playlists[playlistIndex];

    // Remove thumbnail-related properties
    const updatedPlaylist = {
      ...playlist,
      imagePath: undefined,
      thumbnailType: undefined,
      lastThumbnailUpdate: undefined
    };

    // Clean up undefined properties
    Object.keys(updatedPlaylist).forEach(key => {
      if (updatedPlaylist[key as keyof YouTubePlaylist] === undefined) {
        delete updatedPlaylist[key as keyof YouTubePlaylist];
      }
    });

    playlists[playlistIndex] = updatedPlaylist;
    localStorage.setItem('youtube_playlists', JSON.stringify(playlists));

    return updatedPlaylist;
  } catch (error) {
    console.error('Error clearing playlist thumbnail:', error);
    return null;
  }
};

// Create multiple clips from videos with different time configurations
export const createBulkClipsFromVideos = (
  videos: YouTubeVideo[],
  timeConfigs: {[videoId: string]: {startTime: number, duration: number}}
): YouTubeClip[] => {
  return videos.map(video => {
    const config = timeConfigs[video.id] || { startTime: 0, duration: 60 };
    return createClipFromVideo(video, config.startTime, config.duration);
  });
};

// Generate random start time for a video given its duration and clip duration
export const generateRandomStartTime = (videoDuration: number, clipDuration: number): number => {
  const maxStart = Math.max(0, videoDuration - clipDuration);
  return Math.floor(Math.random() * (maxStart + 1));
};

// Format view count for display (e.g., 1.2M views)
export const formatViewCount = (viewCount?: string): string => {
  if (!viewCount) return '';

  const count = parseInt(viewCount);
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B views`;
  } else if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  } else {
    return `${count} views`;
  }
};

// Format publish date for display (e.g., "2 years ago")
export const formatPublishDate = (publishedAt?: string): string => {
  if (!publishedAt) return '';

  const publishDate = new Date(publishedAt);
  const now = new Date();
  const diffInMs = now.getTime() - publishDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays < 1) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  } else {
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
};

// Search for YouTube channels using yt-dlp - SIMPLIFIED AND IMPROVED
export const searchYouTubeChannelsWithYtDlp = async (
  query: string,
  maxResults: number = 5,
  pageToken?: string,
  sortOrder: string = 'relevance'
): Promise<{ channels: YouTubeChannel[], pagination: any }> => {
  try {
    console.log('🔍 NEW: Searching YouTube channels with yt-dlp:', query, 'maxResults:', maxResults, 'page:', pageToken, 'sort:', sortOrder);

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpChannelSearch) {
      throw new Error('This feature requires the desktop app. Please use the Electron version of PHat5.');
    }

    // Use Electron IPC to search channels via main process
    const result = await window.electronAPI.ytDlpChannelSearch(query, maxResults, pageToken, sortOrder);

    if (!result.success) {
      throw new Error(result.error || 'Channel search failed');
    }

    console.log('📊 yt-dlp channel search returned:', result.data.channels.length, 'channels');

    // Convert yt-dlp results to our format
    const channelsData = result.data.channels || [];

    const channels = channelsData.map((channel: any) => ({
      id: channel.id,
      title: channel.title,
      description: channel.description || '',
      thumbnail: channel.thumbnail || '',
      subscriberCount: channel.subscriber_count?.toString() || '',
      videoCount: channel.video_count?.toString() || '',
      customUrl: channel.url || '',
      channelType: channel.channel_type || 'Channel',
      isTopicChannel: channel.is_topic_channel || false,
      isVevoChannel: channel.is_vevo_channel || false,
      isMusicChannel: channel.is_music_channel || false,
      latestVideoTitle: channel.latest_video_title || '',
      latestVideoDate: channel.latest_video_date || ''
    }));

    const pagination = {
      totalResults: result.data.totalResults || 0,
      currentPage: result.data.currentPage || 1,
      totalPages: result.data.totalPages || 1,
      nextPageToken: result.data.nextPageToken,
      prevPageToken: result.data.prevPageToken,
      resultsPerPage: result.data.resultsPerPage || maxResults
    };

    console.log('📄 Pagination: page', pagination.currentPage, 'of', pagination.totalPages, '- showing', channels.length, 'channels');

    return { channels, pagination };

  } catch (error) {
    console.error('❌ yt-dlp channel search failed:', error);
    throw error; // Re-throw to let the calling function handle it
  }
};

// Helper function to extract channel ID from URL
const extractChannelIdFromUrl = (url: string): string => {
  if (!url) return '';

  // Handle different YouTube channel URL formats
  const patterns = [
    /\/channel\/([a-zA-Z0-9_-]+)/,
    /\/c\/([a-zA-Z0-9_-]+)/,
    /\/user\/([a-zA-Z0-9_-]+)/,
    /@([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url; // Return as-is if no pattern matches
};

// Updated channel search function that uses yt-dlp - IMPROVED ERROR HANDLING
export const searchYouTubeChannels = async (
  query: string,
  credentials?: string | any,
  options: { maxResults?: number, pageToken?: string, sortOrder?: string } = {}
): Promise<{ channels: YouTubeChannel[], pagination: any }> => {
  const { maxResults = 5, pageToken, sortOrder = 'relevance' } = options;

  try {
    console.log('🚀 Attempting NEW yt-dlp channel search...');
    return await searchYouTubeChannelsWithYtDlp(query, maxResults, pageToken, sortOrder);
  } catch (error) {
    console.error('❌ yt-dlp channel search failed:', error);

    // Provide helpful error messages to the user
    let userFriendlyError = 'Channel search failed';
    const errorMessage = error.message || '';

    if (errorMessage.includes('yt-dlp is not installed')) {
      userFriendlyError = 'yt-dlp is not installed. Please install it with: pip install yt-dlp';
    } else if (errorMessage.includes('desktop app') || errorMessage.includes('Electron')) {
      userFriendlyError = 'This feature requires the desktop app. Please use the Electron version of PHat5.';
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      userFriendlyError = 'Network error: Please check your internet connection and try again.';
    } else if (errorMessage.includes('timeout')) {
      userFriendlyError = 'Search timed out. Please try again with a more specific search term.';
    } else if (errorMessage) {
      userFriendlyError = errorMessage;
    }

    // Throw the error so the UI can display it to the user
    throw new Error(userFriendlyError);
  }
};

// Get videos from a specific channel using yt-dlp
export const getChannelVideosWithYtDlp = async (
  channelId: string,
  maxResults: number = 25,
  pageToken?: string
): Promise<YouTubeSearchResult> => {
  try {
    console.log('🔍 Getting channel videos with yt-dlp for channel:', channelId);

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpChannelVideos) {
      throw new Error('yt-dlp channel videos not available: Electron API not found');
    }

    // Use Electron IPC to get channel videos via main process
    const result = await window.electronAPI.ytDlpChannelVideos(channelId, maxResults, pageToken);

    if (!result.success) {
      throw new Error(result.error || 'yt-dlp channel videos failed');
    }

    console.log('📊 yt-dlp channel videos returned:', result.data);

    // Convert yt-dlp results to our format
    const videos = Array.isArray(result.data.videos) ? result.data.videos : [];

    const convertedVideos: YouTubeVideo[] = videos.map((video: any) => ({
      id: video.id || video.video_id || '',
      title: video.title || 'Unknown Title',
      channelTitle: video.channel || video.uploader || 'Unknown Channel',
      duration: video.duration_string || formatDurationFromSeconds(video.duration) || 'PT0S',
      thumbnail: video.thumbnail || video.thumbnails?.[0]?.url || '',
      description: video.description || '',
      publishedAt: video.upload_date ? formatUploadDate(video.upload_date) : new Date().toISOString(),
      viewCount: video.view_count?.toString() || '0',
      likeCount: video.like_count?.toString() || '0'
    }));

    return {
      videos: convertedVideos,
      nextPageToken: result.data.nextPageToken,
      prevPageToken: result.data.prevPageToken,
      totalResults: result.data.totalResults || convertedVideos.length,
      resultsPerPage: maxResults,
      source: 'yt-dlp'
    };

  } catch (error) {
    console.error('❌ yt-dlp channel videos failed:', error);

    // Provide helpful error messages
    if (error.message?.includes('not found') || error.message?.includes('command not found')) {
      throw new Error('yt-dlp is not installed. Please install yt-dlp: pip install yt-dlp');
    } else if (error.message?.includes('network') || error.message?.includes('connection')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    } else {
      throw new Error(`Channel videos failed: ${error.message || 'Unknown error'}`);
    }
  }
};

// Helper function to format duration from seconds
const formatDurationFromSeconds = (seconds: number): string => {
  if (!seconds || seconds <= 0) return 'PT0S';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0) duration += `${secs}S`;

  return duration === 'PT' ? 'PT0S' : duration;
};

// Helper function to format upload date
const formatUploadDate = (uploadDate: string): string => {
  if (!uploadDate) return new Date().toISOString();

  // yt-dlp returns dates in YYYYMMDD format
  if (uploadDate.length === 8) {
    const year = uploadDate.substring(0, 4);
    const month = uploadDate.substring(4, 6);
    const day = uploadDate.substring(6, 8);
    return new Date(`${year}-${month}-${day}`).toISOString();
  }

  return new Date(uploadDate).toISOString();
};

// Updated channel videos function that uses yt-dlp
export const getChannelVideos = async (
  channelId: string,
  credentials?: string | any,
  options: YouTubeSearchOptions = {}
): Promise<YouTubeSearchResult> => {
  const { maxResults = 25, pageToken } = options;

  try {
    console.log('🚀 Attempting yt-dlp channel videos...');
    return await getChannelVideosWithYtDlp(channelId, maxResults, pageToken);
  } catch (error) {
    console.error('❌ yt-dlp channel videos failed:', error);

    // Try fallback method using search
    console.log('🔄 Trying fallback method with search...');
    try {
      // Use search to find videos from this channel
      const searchQuery = `site:youtube.com/channel/${channelId}`;
      const fallbackResult = await searchYouTubeEnhanced(searchQuery, credentials, {
        ...options,
        maxResults: Math.min(maxResults, 25), // Limit fallback results
        useYtDlp: true
      });

      console.log('✅ Fallback search method succeeded');
      return fallbackResult;
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError);

      // Final fallback: return empty result with helpful message
      return {
        videos: [],
        totalResults: 0,
        resultsPerPage: maxResults,
        nextPageToken: null,
        prevPageToken: null,
        error: 'Unable to load channel videos due to YouTube restrictions. This channel may require sign-in or may be temporarily unavailable.'
      };
    }
  }
};

// Generate realistic search results based on query
const generateRealisticSearchResults = (query: string, maxResults: number): YouTubeVideo[] => {
  const searchTerms = query.toLowerCase().split(' ');

  // Define realistic video templates based on common search categories
  const videoTemplates = {
    music: [
      { title: "Official Music Video", channels: ["VEVO", "Records", "Music"] },
      { title: "Live Performance", channels: ["Live", "Concert", "Festival"] },
      { title: "Acoustic Version", channels: ["Sessions", "Acoustic", "Unplugged"] },
      { title: "Remix", channels: ["Remix", "Electronic", "DJ"] },
      { title: "Cover Version", channels: ["Covers", "Indie", "Singer"] }
    ],
    gaming: [
      { title: "Gameplay Walkthrough", channels: ["Gaming", "Plays", "Stream"] },
      { title: "Review", channels: ["Reviews", "Gaming", "Tech"] },
      { title: "Tips & Tricks", channels: ["Guide", "Pro", "Tutorial"] },
      { title: "Funny Moments", channels: ["Highlights", "Clips", "Funny"] },
      { title: "Speedrun", channels: ["Speedrun", "WR", "Fast"] }
    ],
    tutorial: [
      { title: "Step by Step Guide", channels: ["Tutorial", "Learn", "How To"] },
      { title: "Beginner's Guide", channels: ["Beginner", "Easy", "Simple"] },
      { title: "Advanced Techniques", channels: ["Pro", "Advanced", "Expert"] },
      { title: "Quick Tips", channels: ["Tips", "Hacks", "Quick"] },
      { title: "Complete Course", channels: ["Course", "Academy", "Education"] }
    ],
    cooking: [
      { title: "Recipe Tutorial", channels: ["Kitchen", "Chef", "Cooking"] },
      { title: "Quick & Easy", channels: ["Easy", "Quick", "Simple"] },
      { title: "Professional Technique", channels: ["Chef", "Pro", "Culinary"] },
      { title: "Healthy Version", channels: ["Healthy", "Fit", "Nutrition"] },
      { title: "Traditional Recipe", channels: ["Traditional", "Authentic", "Classic"] }
    ],
    tech: [
      { title: "Review & Unboxing", channels: ["Tech", "Review", "Unbox"] },
      { title: "Setup Guide", channels: ["Setup", "Install", "Config"] },
      { title: "Comparison", channels: ["vs", "Compare", "Best"] },
      { title: "Tips & Tricks", channels: ["Tips", "Hacks", "Pro"] },
      { title: "News & Updates", channels: ["News", "Update", "Latest"] }
    ]
  };

  // Determine category based on search terms
  let category = 'general';
  if (searchTerms.some(term => ['song', 'music', 'band', 'artist', 'album', 'lyrics'].includes(term))) {
    category = 'music';
  } else if (searchTerms.some(term => ['game', 'gaming', 'play', 'gameplay', 'stream'].includes(term))) {
    category = 'gaming';
  } else if (searchTerms.some(term => ['how', 'tutorial', 'guide', 'learn', 'teach'].includes(term))) {
    category = 'tutorial';
  } else if (searchTerms.some(term => ['cook', 'recipe', 'food', 'kitchen', 'chef'].includes(term))) {
    category = 'cooking';
  } else if (searchTerms.some(term => ['tech', 'review', 'phone', 'computer', 'software'].includes(term))) {
    category = 'tech';
  }

  const templates = videoTemplates[category] || [
    { title: "Complete Guide", channels: ["Guide", "Tutorial", "Learn"] },
    { title: "Best Practices", channels: ["Pro", "Expert", "Best"] },
    { title: "Deep Dive", channels: ["Analysis", "Deep", "Detailed"] },
    { title: "Quick Overview", channels: ["Quick", "Summary", "Overview"] },
    { title: "Latest Updates", channels: ["News", "Update", "Latest"] }
  ];

  return Array.from({ length: maxResults }, (_, i) => {
    const template = templates[i % templates.length];
    const channelSuffix = template.channels[Math.floor(Math.random() * template.channels.length)];

    // Create realistic titles that relate to the search but aren't just "query - Video X"
    const titleVariations = [
      `${query} ${template.title}`,
      `The Ultimate ${query} ${template.title}`,
      `${query}: ${template.title}`,
      `Everything You Need to Know About ${query}`,
      `${query} - ${template.title} (2024)`,
      `Best ${query} ${template.title}`,
      `${query} Explained: ${template.title}`,
      `Top 10 ${query} ${template.title.toLowerCase()}s`
    ];

    const title = titleVariations[Math.floor(Math.random() * titleVariations.length)];
    const channelName = `${query.split(' ')[0]} ${channelSuffix}${Math.floor(Math.random() * 100)}`;

    // Generate realistic durations based on content type
    const durations = category === 'music'
      ? ['PT3M30S', 'PT4M15S', 'PT2M45S', 'PT5M20S', 'PT3M55S']
      : ['PT8M30S', 'PT12M15S', 'PT15M45S', 'PT6M20S', 'PT20M55S', 'PT25M10S'];

    return {
      id: `realistic_${Date.now()}_${i}`,
      title: title,
      channelTitle: channelName,
      duration: durations[Math.floor(Math.random() * durations.length)],
      thumbnail: `https://picsum.photos/320/180?random=${Date.now() + i + Math.floor(Math.random() * 1000)}`,
      description: `Comprehensive ${template.title.toLowerCase()} covering everything about ${query}. Perfect for both beginners and advanced users.`,
      publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: Math.floor(Math.random() * 5000000 + 10000).toString(),
      likeCount: Math.floor(Math.random() * 50000 + 100).toString()
    };
  });
};

// Import the real yt-dlp service
import { searchYouTubeWithYtDlp as realYtDlpSearch, isYtDlpAvailable } from '../services/ytDlpService';

// yt-dlp based search for unlimited YouTube access
export const searchYouTubeWithYtDlp = async (
  query: string,
  maxResults: number = 25,
  forceCheck: boolean = false
): Promise<YouTubeSearchResult> => {
  try {
    console.log('🔍 Attempting real yt-dlp search for:', query);

    // Check if yt-dlp is available (with optional force check)
    const ytDlpAvailable = await isYtDlpAvailable(forceCheck);

    if (ytDlpAvailable) {
      console.log('✅ yt-dlp is available, using real search');
      return await realYtDlpSearch(query, maxResults);
    } else {
      console.log('⚠️ yt-dlp not available, using fallback');
      throw new Error('yt-dlp not available');
    }
  } catch (error) {
    console.error('❌ yt-dlp search failed:', error);
    throw error;
  }
};

// Enhanced search that tries multiple methods
export const searchYouTubeEnhanced = async (
  query: string,
  credentials?: string | any,
  options: YouTubeSearchOptions = {}
): Promise<YouTubeSearchResult> => {
  const { maxResults = 25, useYtDlp = true, forceYtDlpCheck = false } = options; // Enable yt-dlp by default

  // Try yt-dlp first for unlimited access
  if (useYtDlp) {
    try {
      console.log('🚀 Attempting yt-dlp search for unlimited results...');
      console.log('🔧 Force yt-dlp check:', forceYtDlpCheck);
      return await searchYouTubeWithYtDlp(query, maxResults, forceYtDlpCheck);
    } catch (error) {
      console.log('⚠️ yt-dlp failed, falling back to YouTube API...');
      console.log('Error details:', error);
    }
  }

  // Fallback to YouTube Data API
  if (!credentials) {
    throw new Error('No authentication credentials provided and yt-dlp is not available. Please configure YouTube API key or sign in with Google OAuth.');
  }

  console.log('📡 Using YouTube Data API as fallback...');
  const result = await searchYouTubeVideos(query, credentials, options);
  result.source = 'api';
  return result;
};

// Enhanced API key validation with detailed error reporting
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    console.log('🔑 Validating YouTube API key...');

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&key=${apiKey}&maxResults=1`
    );

    console.log('📡 API Response Status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API key validation successful:', data);
      return true;
    } else {
      // Get detailed error information
      const errorData = await response.json().catch(() => null);
      console.error('❌ API key validation failed:');
      console.error('Status:', response.status, response.statusText);
      console.error('Error details:', errorData);

      if (errorData?.error) {
        console.error('Error message:', errorData.error.message);
        console.error('Error code:', errorData.error.code);
        console.error('Error details:', errorData.error.details);
      }

      return false;
    }
  } catch (error) {
    console.error('🚨 Network error during API key validation:', error);
    return false;
  }
};
