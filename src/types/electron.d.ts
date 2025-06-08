// Declare the Electron API interface for TypeScript
interface Mix {
  id: string;
  name: string;
  date: string;
  songList: string[];
  filename: string;
  localFilePath?: string;
}

interface Playlist {
  id: string;
  name: string;
  date: string;
  clips: Array<{
    id: string;
    name: string;
    start: number;
    duration: number;
    songName?: string;
    clipPath?: string;
    // Add metadata fields
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
  }>;
  drinkingSoundPath?: string;
}

interface ElectronAPI {
  // Window control functions
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Mix related functions
  selectMixFolder: () => Promise<string>;
  saveMix: (mix: any, buffer: ArrayBuffer) => Promise<boolean>;
  listMixes: () => Promise<any[]>;
  getMixFolder: () => Promise<string>;
  deleteMix: (mix: any) => Promise<boolean>;
  renameMix: (mix: any, newName: string) => Promise<boolean>;
  getMixFilePath: (mixName: string) => Promise<string | null>;

  // Library folder handlers
  selectLibraryFolder: () => Promise<string | null>;
  getLibraryFolder: () => Promise<string | null>;
  setLibraryFolder: (folderPath: string) => Promise<string>;
  listLibraryAudio: () => Promise<any[]>;
  scanFolderAudio: (folderPath: string) => Promise<any[]>;
  cancelLibraryLoading: () => Promise<boolean>;
  onLibraryLoadProgress: (callback: (event: any, progress: { processed: number; current: string }) => void) => void;
  removeLibraryLoadProgressListener: (callback: (event: any, progress: { processed: number; current: string }) => void) => void;
  getFileBlob: (filePath: string) => Promise<ArrayBuffer>;

  // Temporary clips handlers
  saveTempClip: (clipMeta: any, buffer: ArrayBuffer) => Promise<boolean>;
  listTempClips: () => Promise<any[]>;
  getTempClip: (clipId: string) => Promise<ArrayBuffer | null>;
  deleteTempClip: (clipId: string) => Promise<boolean>;
  clearTempClips: () => Promise<boolean>;

  // Temporary songs handlers
  saveTempSong: (songMeta: any, buffer: ArrayBuffer) => Promise<boolean>;
  listTempSongs: () => Promise<any[]>;
  getTempSong: (songId: string, extension: string) => Promise<ArrayBuffer | null>;
  deleteTempSong: (songId: string, extension: string) => Promise<boolean>;
  clearTempSongs: () => Promise<boolean>;
  updateMixMetadata: (mixMeta: any) => Promise<boolean>;

  // Project archive handlers
  exportProjectArchive: (mixId: string) => Promise<string | null>;
  importProjectArchive: (archivePath?: string) => Promise<any | null>;
  backupOriginalFiles: (mixId: string, originalFiles: any[]) => Promise<boolean>;
  loadOriginalFiles: (mixId: string) => Promise<any[] | null>;

  // Playlist handlers
  listPlaylists: () => Promise<any[]>;
  savePlaylist: (playlist: any) => Promise<boolean>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  exportPlaylist: (playlistId: string) => Promise<{ success: boolean; path?: string; message?: string }>;
  exportPlaylistAsAudio: (playlistId: string) => Promise<{ success: boolean; path?: string; message?: string }>;
  importPlaylist: () => Promise<{ success: boolean; name?: string; playlist?: any; message?: string }>;
  savePlaylistFromCreator: (playlist: any) => Promise<{ success: boolean; playlist?: any; message?: string }>;
  createMixFromPlaylist: (playlistId: string) => Promise<{ success: boolean; mix?: any; message?: string }>;

  // Drinking sound handlers
  selectDrinkingSound: () => Promise<{ success: boolean; path?: string; message?: string }>;

  // Playlist image handlers
  selectPlaylistImage: () => Promise<{ success: boolean; path?: string; message?: string }>;

  // Clip file operations
  saveClipToFile: (clipId: string, buffer: ArrayBuffer, clipMeta: any) => Promise<{ success: boolean; clipPath?: string; metadata?: any; message?: string }>;
  getClipFromFile: (clipPath: string) => Promise<{ buffer: ArrayBuffer; metadata: any } | null>;

  // Album art operations
  extractAlbumArt: (filePath: string) => Promise<{ success: boolean; imageBuffer?: ArrayBuffer; mimeType?: string; message?: string }>;
  lookupAlbumArt: (artist: string, album: string) => Promise<{ success: boolean; imageUrl?: string; message?: string }>;
  saveDrinkingSound: (buffer: ArrayBuffer) => Promise<{ success: boolean; path?: string; message?: string }>;

  // yt-dlp operations
  ytDlpSearch: (query: string, maxResults: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  ytDlpChannelSearch: (query: string, maxResults: number, pageToken?: string, sortOrder?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  ytDlpChannelVideos: (channelId: string, maxResults: number, pageToken?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  ytDlpGetVideoDetails: (videoId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

// Extend the Window interface to include our Electron API
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};