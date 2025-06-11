import { SharedPlaylist } from './sharedPlaylistUtils';

export interface SocialMediaShareOptions {
  platform: 'facebook' | 'twitter' | 'instagram' | 'whatsapp' | 'generic';
  playlist: SharedPlaylist;
  appUrl?: string;
}

export interface ShareContent {
  title: string;
  description: string;
  url?: string;
  hashtags?: string[];
  text: string;
}

// Default app URL - configurable based on deployment
const DEFAULT_APP_URL = import.meta.env.VITE_APP_URL || 'https://phat5-app.com'; // Replace with actual app URL when deployed

/**
 * Generate share content for a playlist
 */
export const generateShareContent = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): ShareContent => {
  const title = `🎵 Check out "${playlist.name}" - Power Hour Playlist`;
  const description = playlist.description || `An awesome Power Hour playlist with ${playlist.clips.length} clips created by ${playlist.creator}`;
  const url = `${appUrl}/community?code=${playlist.shareCode}`;
  const hashtags = ['PowerHour', 'Music', 'Party', 'Playlist', ...playlist.tags.map(tag => tag.replace(/\s+/g, ''))];
  
  const text = `🎵 ${title}

${description}

🎯 Share Code: ${playlist.shareCode}
👤 Created by: ${playlist.creator}
🎶 ${playlist.clips.length} clips
⭐ Rating: ${playlist.rating}/5

Import this playlist in PHat5 using the share code!

${url}

#PowerHour #Music #Party #Playlist ${playlist.tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ')}`;

  return {
    title,
    description,
    url,
    hashtags,
    text
  };
};

/**
 * Generate Facebook share URL
 */
export const generateFacebookShareUrl = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): string => {
  const content = generateShareContent(playlist, appUrl);
  const params = new URLSearchParams({
    u: content.url || '',
    quote: `${content.title}\n\n${content.description}\n\nShare Code: ${playlist.shareCode}`
  });
  
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
};

/**
 * Generate Twitter/X share URL
 */
export const generateTwitterShareUrl = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): string => {
  const content = generateShareContent(playlist, appUrl);
  const tweetText = `🎵 "${playlist.name}" - Power Hour Playlist

${content.description}

🎯 Code: ${playlist.shareCode}
👤 By: ${playlist.creator}

${content.url}`;

  const params = new URLSearchParams({
    text: tweetText,
    hashtags: content.hashtags?.slice(0, 5).join(',') || 'PowerHour,Music,Party'
  });
  
  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

/**
 * Generate WhatsApp share URL
 */
export const generateWhatsAppShareUrl = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): string => {
  const content = generateShareContent(playlist, appUrl);
  const message = `🎵 *${playlist.name}* - Power Hour Playlist

${content.description}

🎯 *Share Code:* ${playlist.shareCode}
👤 *Created by:* ${playlist.creator}
🎶 *${playlist.clips.length} clips*

Import this playlist in PHat5 using the share code!

${content.url}`;

  const params = new URLSearchParams({
    text: message
  });
  
  return `https://wa.me/?${params.toString()}`;
};

/**
 * Generate Instagram share text (Instagram doesn't support direct URL sharing)
 */
export const generateInstagramShareText = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): string => {
  const content = generateShareContent(playlist, appUrl);
  
  return `🎵 "${playlist.name}" - Power Hour Playlist

${content.description}

🎯 Share Code: ${playlist.shareCode}
👤 Created by: ${playlist.creator}
🎶 ${playlist.clips.length} clips
⭐ Rating: ${playlist.rating}/5

Import this playlist in PHat5 using the share code!

Link in bio or search for PHat5 Power Hour app

${content.hashtags?.map(tag => `#${tag}`).join(' ')}`;
};

/**
 * Generate generic share text
 */
export const generateGenericShareText = (playlist: SharedPlaylist, appUrl: string = DEFAULT_APP_URL): string => {
  const content = generateShareContent(playlist, appUrl);
  return content.text;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Open URL in new window/tab
 */
export const openShareUrl = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Share playlist on specified platform
 */
export const sharePlaylistOnPlatform = async (
  platform: SocialMediaShareOptions['platform'],
  playlist: SharedPlaylist,
  appUrl: string = DEFAULT_APP_URL
): Promise<{ success: boolean; message: string }> => {
  try {
    switch (platform) {
      case 'facebook':
        openShareUrl(generateFacebookShareUrl(playlist, appUrl));
        return { success: true, message: 'Facebook share dialog opened' };
        
      case 'twitter':
        openShareUrl(generateTwitterShareUrl(playlist, appUrl));
        return { success: true, message: 'Twitter share dialog opened' };
        
      case 'whatsapp':
        openShareUrl(generateWhatsAppShareUrl(playlist, appUrl));
        return { success: true, message: 'WhatsApp share dialog opened' };
        
      case 'instagram':
        const instagramText = generateInstagramShareText(playlist, appUrl);
        const instagramSuccess = await copyToClipboard(instagramText);
        return {
          success: instagramSuccess,
          message: instagramSuccess 
            ? 'Instagram post text copied to clipboard' 
            : 'Failed to copy Instagram text'
        };
        
      case 'generic':
        const genericText = generateGenericShareText(playlist, appUrl);
        const genericSuccess = await copyToClipboard(genericText);
        return {
          success: genericSuccess,
          message: genericSuccess 
            ? 'Share text copied to clipboard' 
            : 'Failed to copy share text'
        };
        
      default:
        return { success: false, message: 'Unsupported platform' };
    }
  } catch (error) {
    console.error('Error sharing playlist:', error);
    return { success: false, message: 'An error occurred while sharing' };
  }
};
