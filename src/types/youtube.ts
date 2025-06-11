/**
 * YouTube-related types for PHat5
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  url?: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  customUrl?: string;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  channelId?: string;
  itemCount?: number;
  publishedAt?: string;
}

export interface YouTubeSearchOptions {
  query: string;
  maxResults?: number;
  pageToken?: string;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  duration?: 'short' | 'medium' | 'long';
  definition?: 'standard' | 'high';
  category?: string;
}
