import { YouTubeVideo, YouTubeSearchResult } from '../utils/youtubeUtils';

// Electron IPC wrapper for yt-dlp
class ElectronYtDlpWrapper {
  async executeCommand(args: string[]): Promise<any> {
    // This will be handled by the main process
    throw new Error('Direct command execution not available in renderer process');
  }

  async getVideoInfo(args: string[]): Promise<any> {
    // This will be handled by the main process
    throw new Error('Direct video info not available in renderer process');
  }
}

// Initialize yt-dlp wrapper
let ytDlp: ElectronYtDlpWrapper | null = null;
let ytDlpAvailable: boolean | null = null;

const initializeYtDlp = async (): Promise<ElectronYtDlpWrapper> => {
  if (!ytDlp) {
    ytDlp = new ElectronYtDlpWrapper();
  }
  return ytDlp;
};

// Convert yt-dlp duration to YouTube API format
const convertDuration = (duration: number): string => {
  if (!duration) return 'PT0S';
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  if (seconds > 0) result += `${seconds}S`;
  
  return result || 'PT0S';
};

// Format view count from yt-dlp
const formatViewCount = (viewCount: number | string): string => {
  if (!viewCount) return '0';
  return viewCount.toString();
};

// Search YouTube using yt-dlp via Electron IPC
export const searchYouTubeWithYtDlp = async (
  query: string,
  maxResults: number = 25
): Promise<YouTubeSearchResult> => {
  try {
    console.log('🚀 Starting yt-dlp search for:', query);

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpSearch) {
      throw new Error('yt-dlp not available: Electron API not found');
    }

    // Use Electron IPC to search via main process
    const result = await window.electronAPI.ytDlpSearch(query, maxResults);

    if (!result.success) {
      throw new Error(result.error || 'yt-dlp search failed');
    }

    console.log('📊 yt-dlp returned:', result.data);

    // Convert yt-dlp results to our format
    const results = Array.isArray(result.data) ? result.data : [result.data];

    const videos: YouTubeVideo[] = results
      .filter(info => info && (info.id || info.url)) // Filter out invalid entries
      .map((info: any, index: number) => {
        // Handle both flat playlist and detailed results
        let videoId = info.id;
        if (!videoId && info.url) {
          // Extract video ID from URL
          const match = info.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          videoId = match ? match[1] : `ytdlp_${Date.now()}_${index}`;
        }
        if (!videoId) {
          videoId = `ytdlp_${Date.now()}_${index}`;
        }

        const title = info.title || info.fulltitle || `Video ${index + 1}`;
        const channelTitle = info.uploader || info.channel || info.uploader_id || 'Unknown Channel';
        const duration = convertDuration(info.duration || 0);
        const thumbnail = info.thumbnail || info.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        const description = info.description || '';
        const publishedAt = info.upload_date ?
          new Date(info.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString() :
          new Date().toISOString();
        const viewCount = formatViewCount(info.view_count || 0);
        const likeCount = formatViewCount(info.like_count || 0);

        return {
          id: videoId,
          title,
          channelTitle,
          duration,
          thumbnail,
          description,
          publishedAt,
          viewCount,
          likeCount
        };
      });

    console.log('✅ Successfully processed', videos.length, 'videos from yt-dlp');

    return {
      videos,
      totalResults: 1000000, // yt-dlp can access much more content
      resultsPerPage: maxResults,
      nextPageToken: `ytdlp_page_2`,
      source: 'yt-dlp'
    };

  } catch (error: any) {
    console.error('❌ yt-dlp search failed:', error);

    // Provide helpful error messages
    if (error.message?.includes('not found') || error.message?.includes('command not found')) {
      throw new Error('yt-dlp is not installed. Please install yt-dlp: pip install yt-dlp');
    } else if (error.message?.includes('network') || error.message?.includes('connection')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    } else if (error.message?.includes('No module named')) {
      throw new Error('yt-dlp Python module not found. Please install: pip install yt-dlp');
    } else {
      throw new Error(`yt-dlp search failed: ${error.message || 'Unknown error'}`);
    }
  }
};

// Get video details using yt-dlp via Electron IPC
export const getVideoDetailsWithYtDlp = async (videoId: string): Promise<YouTubeVideo | null> => {
  try {
    console.log('🎬 Getting video details for:', videoId);

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpGetVideoDetails) {
      throw new Error('yt-dlp not available: Electron API not found');
    }

    const result = await window.electronAPI.ytDlpGetVideoDetails(videoId);

    if (!result.success) {
      console.warn('Failed to get video details:', result.error);
      return null;
    }

    const info = Array.isArray(result.data) ? result.data[0] : result.data;

    if (!info) {
      console.warn('No video info returned for:', videoId);
      return null;
    }

    return {
      id: info.id || videoId,
      title: info.title || info.fulltitle || 'Unknown Title',
      channelTitle: info.uploader || info.channel || info.uploader_id || 'Unknown Channel',
      duration: convertDuration(info.duration || 0),
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      description: info.description || '',
      publishedAt: info.upload_date ?
        new Date(info.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString() :
        new Date().toISOString(),
      viewCount: formatViewCount(info.view_count || 0),
      likeCount: formatViewCount(info.like_count || 0)
    };

  } catch (error) {
    console.error('❌ Failed to get video details:', error);
    return null;
  }
};

// Get playlist videos using yt-dlp via Electron IPC
export const getPlaylistVideosWithYtDlp = async (
  playlistId: string,
  maxResults: number = 50
): Promise<YouTubeSearchResult> => {
  try {
    console.log('🎵 Getting playlist videos for:', playlistId, 'maxResults:', maxResults);

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpGetPlaylistVideos) {
      throw new Error('yt-dlp not available: Electron API not found');
    }

    // Use Electron IPC to get playlist videos via main process
    const result = await window.electronAPI.ytDlpGetPlaylistVideos(playlistId, maxResults);

    if (!result.success) {
      throw new Error(result.error || 'yt-dlp playlist extraction failed');
    }

    console.log('📊 yt-dlp returned playlist data:', result.data);

    // Convert yt-dlp results to our format
    const results = Array.isArray(result.data) ? result.data : [result.data];

    const videos: YouTubeVideo[] = results
      .filter(info => info && info.id) // Filter out invalid entries
      .map((info: any, index: number) => {
        const videoId = info.id || `playlist_video_${Date.now()}_${index}`;

        return {
          id: videoId,
          title: info.title || info.fulltitle || 'Unknown Title',
          channelTitle: info.uploader || info.channel || info.uploader_id || 'Unknown Channel',
          duration: convertDuration(info.duration || 0),
          thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          description: info.description || '',
          publishedAt: info.upload_date ?
            new Date(info.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString() :
            new Date().toISOString(),
          viewCount: formatViewCount(info.view_count || 0),
          likeCount: formatViewCount(info.like_count || 0)
        };
      });

    console.log('✅ Successfully processed', videos.length, 'videos from playlist');

    return {
      videos,
      totalResults: result.totalVideos || videos.length,
      resultsPerPage: maxResults,
      nextPageToken: null, // Playlists are typically loaded all at once
      source: 'yt-dlp-playlist'
    };

  } catch (error) {
    console.error('❌ Failed to get playlist videos:', error);
    throw error;
  }
};

// Check if yt-dlp is available via Electron IPC
export const isYtDlpAvailable = async (forceCheck: boolean = false): Promise<boolean> => {
  try {
    // Cache the result to avoid repeated checks, but allow forcing a fresh check
    if (ytDlpAvailable !== null && !forceCheck) {
      console.log('🔄 Using cached yt-dlp availability result:', ytDlpAvailable);
      return ytDlpAvailable;
    }

    console.log('🔧 Checking yt-dlp availability...');

    // Check if we're in Electron environment
    if (!window.electronAPI?.ytDlpCheckAvailability) {
      console.log('⚠️ yt-dlp not available: Electron API not found');
      ytDlpAvailable = false;
      return false;
    }

    const result = await window.electronAPI.ytDlpCheckAvailability();
    ytDlpAvailable = result.available;

    if (result.available) {
      console.log('✅ yt-dlp is available via:', result.pythonCommand);
    } else {
      console.log('⚠️ yt-dlp not available');
    }

    return ytDlpAvailable;
  } catch (error) {
    console.log('⚠️ yt-dlp availability check failed:', error);
    ytDlpAvailable = false;
    return false;
  }
};

// Clear the yt-dlp availability cache
export const clearYtDlpCache = (): void => {
  console.log('🗑️ Clearing yt-dlp availability cache');
  ytDlpAvailable = null;
};

// Get yt-dlp version info
export const getYtDlpVersion = async (): Promise<string | null> => {
  try {
    const available = await isYtDlpAvailable();
    return available ? 'Available via Electron IPC' : null;
  } catch (error) {
    console.error('Failed to get yt-dlp version:', error);
    return null;
  }
};
