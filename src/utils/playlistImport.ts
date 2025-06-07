import { YouTubePlaylist, YouTubeClip, saveYouTubePlaylist, generatePlaylistId } from './youtubeUtils';
import { SharedPlaylist, getSharedPlaylistByCode } from './sharedPlaylistUtils';
import { recordPlaylistDownload } from './playlistRating';

// Import result interface
export interface ImportResult {
  success: boolean;
  playlist?: YouTubePlaylist;
  message: string;
  warnings?: string[];
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

// Import playlist by share code
export const importPlaylistByCode = async (shareCode: string): Promise<ImportResult> => {
  try {
    // Validate share code format
    if (!shareCode || typeof shareCode !== 'string' || shareCode.length !== 8) {
      return {
        success: false,
        message: 'Invalid share code format. Share codes must be 8 characters long.',
      };
    }

    // Find playlist by share code
    const sharedPlaylist = getSharedPlaylistByCode(shareCode.toUpperCase());
    
    if (!sharedPlaylist) {
      return {
        success: false,
        message: 'Playlist not found. Please check the share code and try again.',
      };
    }

    // Validate playlist
    if (!validateSharedPlaylist(sharedPlaylist)) {
      return {
        success: false,
        message: 'Invalid playlist data. The playlist may be corrupted.',
      };
    }

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
