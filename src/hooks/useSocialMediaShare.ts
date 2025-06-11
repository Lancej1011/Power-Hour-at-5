import { useState, useCallback } from 'react';
import { SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { 
  sharePlaylistOnPlatform, 
  SocialMediaShareOptions 
} from '../utils/socialMediaSharing';

export interface UseSocialMediaShareResult {
  isSharing: boolean;
  lastShareResult: { success: boolean; message: string } | null;
  shareOnPlatform: (platform: SocialMediaShareOptions['platform'], playlist: SharedPlaylist, appUrl?: string) => Promise<void>;
  clearLastResult: () => void;
}

/**
 * Custom hook for handling social media sharing
 */
export const useSocialMediaShare = (): UseSocialMediaShareResult => {
  const [isSharing, setIsSharing] = useState(false);
  const [lastShareResult, setLastShareResult] = useState<{ success: boolean; message: string } | null>(null);

  const shareOnPlatform = useCallback(async (
    platform: SocialMediaShareOptions['platform'],
    playlist: SharedPlaylist,
    appUrl?: string
  ) => {
    setIsSharing(true);
    setLastShareResult(null);

    try {
      const result = await sharePlaylistOnPlatform(platform, playlist, appUrl);
      setLastShareResult(result);
    } catch (error) {
      console.error('Error in social media sharing:', error);
      setLastShareResult({
        success: false,
        message: 'An unexpected error occurred while sharing'
      });
    } finally {
      setIsSharing(false);
    }
  }, []);

  const clearLastResult = useCallback(() => {
    setLastShareResult(null);
  }, []);

  return {
    isSharing,
    lastShareResult,
    shareOnPlatform,
    clearLastResult
  };
};
