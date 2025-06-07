// Global type definitions for the application
interface ElectronAPI {
  // Window control functions
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openDevTools: () => Promise<void>;

  // Mix related functions
  selectMixFolder: () => Promise<string>;
  saveMix: (mix: any, buffer: ArrayBuffer) => Promise<boolean>;
  listMixes: () => Promise<any[]>;
  getMixFolder: () => Promise<string>;
  deleteMix: (mix: any) => Promise<boolean>;
  renameMix: (mix: any, newName: string) => Promise<boolean>;
  getMixFilePath: (mixName: string) => Promise<string>;

  // Library folder handlers
  selectLibraryFolder: () => Promise<string>;
  getLibraryFolder: () => Promise<string>;
  listLibraryAudio: () => Promise<any[]>;
  getFileBlob: (filePath: string) => Promise<ArrayBuffer>;

  // Temporary clips handlers
  saveTempClip: (clipMeta: any, buffer: ArrayBuffer) => Promise<boolean>;
  listTempClips: () => Promise<any[]>;
  getTempClip: (clipId: string) => Promise<ArrayBuffer>;
  deleteTempClip: (clipId: string) => Promise<boolean>;
  clearTempClips: () => Promise<boolean>;

  // Temporary songs handlers
  saveTempSong: (songMeta: any, buffer: ArrayBuffer) => Promise<boolean>;
  listTempSongs: () => Promise<any[]>;
  getTempSong: (songId: string, extension: string) => Promise<ArrayBuffer>;
  deleteTempSong: (songId: string, extension: string) => Promise<boolean>;
  clearTempSongs: () => Promise<boolean>;
  updateMixMetadata: (mixMeta: any) => Promise<boolean>;

  // Project archive handlers
  exportProjectArchive: (mixId: string) => Promise<string>;
  importProjectArchive: (archivePath: string) => Promise<any>;
  backupOriginalFiles: (mixId: string, originalFiles: any[]) => Promise<boolean>;
  loadOriginalFiles: (mixId: string) => Promise<any[]>;

  // Playlist handlers
  listPlaylists: () => Promise<any[]>;
  savePlaylist: (playlist: any) => Promise<boolean>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  exportPlaylist: (playlistId: string) => Promise<string>;
  exportPlaylistAsAudio: (playlistId: string) => Promise<string>;
  importPlaylist: () => Promise<any>;
  savePlaylistFromCreator: (playlist: any) => Promise<boolean>;
  createMixFromPlaylist: (playlistId: string) => Promise<any>;

  // Drinking sound handlers
  selectDrinkingSound: () => Promise<string>;

  // Clip file operations
  saveClipToFile: (clipId: string, buffer: ArrayBuffer, clipMeta: any) => Promise<boolean>;
  getClipFromFile: (clipPath: string) => Promise<ArrayBuffer>;

  // yt-dlp operations
  ytDlpCheckAvailability: () => Promise<{ available: boolean; pythonCommand: string | null }>;
  ytDlpSearch: (query: string, maxResults?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  ytDlpGetVideoDetails: (videoId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  // Add other functions as needed
  [key: string]: any;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};