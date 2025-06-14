import { YouTubePlaylist, YouTubeClip, saveYouTubePlaylist, generatePlaylistId } from './youtubeUtils';
import {
  SharedPlaylist,
  getSharedPlaylistByCode,
  importPlaylistByCode as hybridImportPlaylistByCode,
} from './sharedPlaylistUtils';
import { recordPlaylistDownload } from './playlistRating';

// Interface for drinking clip data
export interface DrinkingClipData {
  type: 'audio' | 'youtube';
  path?: string;
  name: string;
  youtubeId?: string;
  duration?: number;
  startTime?: number;
}

// Import result interface
export interface ImportResult {
  success: boolean;
  playlist?: YouTubePlaylist;
  message: string;
  warnings?: string[];
  drinkingClip?: DrinkingClipData;
  hasNewDrinkingClip?: boolean;
}

// Validate YouTube clip
const validateYouTubeClip = (clip: YouTubeClip): boolean => {
  return !!(
    clip.id &&
    clip.videoId &&
    clip.title &&
    clip.artist &&
    typeof clip.startTime === 'number' &&
    typeof clip.duration === 'number' &&
    clip.thumbnail
  );
};

// Validate shared playlist
const validateSharedPlaylist = (playlist: SharedPlaylist): boolean => {
  if (!playlist.id || !playlist.name || !Array.isArray(playlist.clips)) {
    return false;
  }

  // Check if all clips are valid
  return playlist.clips.every(validateYouTubeClip);
};

// Extract drinking clip data from playlist
const extractDrinkingClipData = (playlist: SharedPlaylist): DrinkingClipData | null => {
  if (!playlist.drinkingSoundPath) {
    return null;
  }

  try {
    // Try to parse as JSON first (new format)
    const drinkingData = JSON.parse(playlist.drinkingSoundPath);
    return {
      type: drinkingData.type || 'audio',
      path: drinkingData.path,
      name: drinkingData.name || 'Imported Drinking Clip',
      youtubeId: drinkingData.youtubeId,
      duration: drinkingData.duration,
      startTime: drinkingData.startTime,
    };
  } catch {
    // Legacy format - simple path
    return {
      type: 'audio',
      path: playlist.drinkingSoundPath,
      name: 'Imported Drinking Clip',
    };
  }
};

// Check if drinking clip already exists in user's library
const isDrinkingClipInLibrary = (clipData: DrinkingClipData): boolean => {
  try {
    const saved = localStorage.getItem('drinking_clips_library');
    if (!saved) return false;

    const library = JSON.parse(saved);
    return library.some((clip: any) => {
      if (clipData.type === 'youtube' && clip.type === 'youtube') {
        return clip.youtubeId === clipData.youtubeId &&
               clip.startTime === clipData.startTime &&
               clip.duration === clipData.duration;
      } else if (clipData.type === 'audio' && clip.type === 'audio') {
        return clip.name === clipData.name;
      }
      return false;
    });
  } catch (error) {
    console.error('Error checking drinking clip library:', error);
    return false;
  }
};

// Add drinking clip to user's library
export const addDrinkingClipToLibrary = (clipData: DrinkingClipData): boolean => {
  try {
    // Check if already exists
    if (isDrinkingClipInLibrary(clipData)) {
      console.log('Drinking clip already exists in library');
      return true;
    }

    // Get current library
    const saved = localStorage.getItem('drinking_clips_library');
    const library = saved ? JSON.parse(saved) : [];

    // Create new clip entry
    const newClip = {
      id: Math.random().toString(36).substr(2, 9),
      name: clipData.name,
      type: clipData.type,
      youtubeId: clipData.youtubeId,
      duration: clipData.duration,
      startTime: clipData.startTime,
      path: clipData.path,
    };

    // Add to library
    library.push(newClip);
    localStorage.setItem('drinking_clips_library', JSON.stringify(library));

    console.log('Added drinking clip to library:', newClip);
    return true;
  } catch (error) {
    console.error('Error adding drinking clip to library:', error);
    return false;
  }
};

// Convert shared playlist to regular YouTube playlist
const convertSharedToRegular = (sharedPlaylist: SharedPlaylist): YouTubePlaylist => {
  return {
    id: generatePlaylistId(),
    name: `${sharedPlaylist.name} (Imported)`,
    clips: sharedPlaylist.clips,
    drinkingSoundPath: sharedPlaylist.drinkingSoundPath,
    imagePath: sharedPlaylist.imagePath,
    date: new Date().toISOString(),
    // Optional sharing properties (not needed for regular playlists)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
};

// Import playlist by share code (uses hybrid approach)
export const importPlaylistByCode = async (shareCode: string): Promise<ImportResult> => {
  try {
    // Use the hybrid import function from sharedPlaylistUtils
    const hybridResult = await hybridImportPlaylistByCode(shareCode);

    if (!hybridResult.success || !hybridResult.playlist) {
      return {
        success: false,
        message: hybridResult.message || 'Failed to import playlist.',
      };
    }

    // Validate playlist
    if (!validateSharedPlaylist(hybridResult.playlist)) {
      return {
        success: false,
        message: 'Invalid playlist data. The playlist may be corrupted.',
      };
    }

    // Extract drinking clip data if present
    const drinkingClip = extractDrinkingClipData(hybridResult.playlist);
    const hasNewDrinkingClip = drinkingClip && !isDrinkingClipInLibrary(drinkingClip);

    // Convert to regular playlist
    const regularPlaylist = convertSharedToRegular(hybridResult.playlist);

    // Save the playlist
    const saveSuccess = saveYouTubePlaylist(regularPlaylist);

    if (!saveSuccess) {
      return {
        success: false,
        message: 'Failed to save imported playlist. Please try again.',
      };
    }

    return {
      success: true,
      playlist: regularPlaylist,
      message: `Successfully imported "${hybridResult.playlist.name}" with ${hybridResult.playlist.clips.length} clips.`,
      drinkingClip,
      hasNewDrinkingClip,
    };
  } catch (error) {
    console.error('Error importing playlist by code:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while importing the playlist.',
    };
  }
};

// Import playlist from shared playlist object
export const importSharedPlaylist = async (sharedPlaylist: SharedPlaylist): Promise<ImportResult> => {
  try {
    // Validate playlist
    if (!validateSharedPlaylist(sharedPlaylist)) {
      return {
        success: false,
        message: 'Invalid playlist data. The playlist may be corrupted.',
      };
    }

    // Extract drinking clip data if present
    const drinkingClip = extractDrinkingClipData(sharedPlaylist);
    const hasNewDrinkingClip = drinkingClip && !isDrinkingClipInLibrary(drinkingClip);

    // Convert to regular playlist
    const regularPlaylist = convertSharedToRegular(sharedPlaylist);

    // Save the playlist
    const saveSuccess = saveYouTubePlaylist(regularPlaylist);

    if (!saveSuccess) {
      return {
        success: false,
        message: 'Failed to save imported playlist. Please try again.',
      };
    }

    // Record the download
    recordPlaylistDownload(sharedPlaylist.id);

    return {
      success: true,
      playlist: regularPlaylist,
      message: `Successfully imported "${sharedPlaylist.name}" with ${sharedPlaylist.clips.length} clips.`,
      drinkingClip,
      hasNewDrinkingClip,
    };
  } catch (error) {
    console.error('Error importing shared playlist:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while importing the playlist.',
    };
  }
};

// Import playlist from JSON file
export const importPlaylistFromFile = async (file: File): Promise<ImportResult> => {
  try {
    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.phpl')) {
      return {
        success: false,
        message: 'Invalid file type. Please select a JSON or PHPL file.',
      };
    }

    // Read file content
    const fileContent = await file.text();
    let playlistData: any;

    try {
      playlistData = JSON.parse(fileContent);
    } catch (parseError) {
      return {
        success: false,
        message: 'Invalid file format. The file does not contain valid JSON data.',
      };
    }

    // Check if it's a shared playlist or regular playlist
    let sharedPlaylist: SharedPlaylist;
    
    if (playlistData.shareCode && playlistData.creator) {
      // It's a shared playlist
      sharedPlaylist = playlistData as SharedPlaylist;
    } else {
      // Convert regular playlist to shared playlist format for validation
      sharedPlaylist = {
        ...playlistData,
        isPublic: true,
        shareCode: 'IMPORTED',
        creator: 'Unknown',
        description: '',
        rating: 0,
        downloadCount: 0,
        tags: [],
        createdAt: playlistData.date || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
    }

    // Import the playlist
    return await importSharedPlaylist(sharedPlaylist);
  } catch (error) {
    console.error('Error importing playlist from file:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while reading the file.',
    };
  }
};

// Export playlist to file for sharing
export const exportPlaylistToFile = (playlist: YouTubePlaylist | SharedPlaylist): void => {
  try {
    const dataStr = JSON.stringify(playlist, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${playlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting playlist to file:', error);
    throw new Error('Failed to export playlist to file');
  }
};

// Validate playlist integrity (check for missing videos, etc.)
export const validatePlaylistIntegrity = async (playlist: YouTubePlaylist): Promise<{
  valid: boolean;
  issues: string[];
  validClips: number;
  totalClips: number;
}> => {
  const issues: string[] = [];
  let validClips = 0;

  for (const clip of playlist.clips) {
    let clipValid = true;

    // Check required fields
    if (!clip.videoId) {
      issues.push(`Clip "${clip.title}" is missing video ID`);
      clipValid = false;
    }

    if (!clip.title || !clip.artist) {
      issues.push(`Clip "${clip.title || 'Unknown'}" is missing title or artist`);
      clipValid = false;
    }

    if (typeof clip.startTime !== 'number' || clip.startTime < 0) {
      issues.push(`Clip "${clip.title}" has invalid start time`);
      clipValid = false;
    }

    if (typeof clip.duration !== 'number' || clip.duration <= 0) {
      issues.push(`Clip "${clip.title}" has invalid duration`);
      clipValid = false;
    }

    // Note: We can't easily check if YouTube videos are still available
    // without making API calls, so we'll skip that for now

    if (clipValid) {
      validClips++;
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    validClips,
    totalClips: playlist.clips.length,
  };
};

// Batch import multiple playlists
export const batchImportPlaylists = async (
  shareCodes: string[]
): Promise<{
  successful: ImportResult[];
  failed: ImportResult[];
  total: number;
}> => {
  const successful: ImportResult[] = [];
  const failed: ImportResult[] = [];

  for (const shareCode of shareCodes) {
    const result = await importPlaylistByCode(shareCode);
    
    if (result.success) {
      successful.push(result);
    } else {
      failed.push(result);
    }
  }

  return {
    successful,
    failed,
    total: shareCodes.length,
  };
};
