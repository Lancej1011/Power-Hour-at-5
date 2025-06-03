console.log('preload.cjs loaded!');
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectMixFolder: () => ipcRenderer.invoke('select-mix-folder'),
  saveMix: (mix, buffer) => ipcRenderer.invoke('save-mix', mix, buffer),
  listMixes: () => ipcRenderer.invoke('list-mixes'),
  getMixFolder: () => ipcRenderer.invoke('get-mix-folder'),
  deleteMix: (mix) => ipcRenderer.invoke('delete-mix', mix),
  renameMix: (mix, newName) => ipcRenderer.invoke('rename-mix', mix, newName),
  getMixFilePath: (mixName) => ipcRenderer.invoke('get-mix-file-path', mixName),
  // Library folder handlers
  selectLibraryFolder: () => ipcRenderer.invoke('select-library-folder'),
  getLibraryFolder: () => ipcRenderer.invoke('get-library-folder'),
  listLibraryAudio: () => ipcRenderer.invoke('list-library-audio'),
  cancelLibraryLoading: () => ipcRenderer.invoke('cancel-library-loading'),
  onLibraryLoadProgress: (callback) => ipcRenderer.on('library-load-progress', callback),
  removeLibraryLoadProgressListener: (callback) => ipcRenderer.removeListener('library-load-progress', callback),
  getFileBlob: (filePath) => ipcRenderer.invoke('get-file-blob', filePath),
  // Window control handlers
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  // Temporary clips handlers
  saveTempClip: (clipMeta, buffer) => ipcRenderer.invoke('save-temp-clip', clipMeta, buffer),
  listTempClips: () => ipcRenderer.invoke('list-temp-clips'),
  getTempClip: (clipId) => ipcRenderer.invoke('get-temp-clip', clipId),
  deleteTempClip: (clipId) => ipcRenderer.invoke('delete-temp-clip', clipId),
  clearTempClips: () => ipcRenderer.invoke('clear-temp-clips'),
  // Temporary songs handlers
  saveTempSong: (songMeta, buffer) => ipcRenderer.invoke('save-temp-song', songMeta, buffer),
  listTempSongs: () => ipcRenderer.invoke('list-temp-songs'),
  getTempSong: (songId, extension) => ipcRenderer.invoke('get-temp-song', songId, extension),
  deleteTempSong: (songId, extension) => ipcRenderer.invoke('delete-temp-song', songId, extension),
  clearTempSongs: () => ipcRenderer.invoke('clear-temp-songs'),
  updateMixMetadata: (mixMeta) => ipcRenderer.invoke('update-mix-metadata', mixMeta),
  // Project archive handlers
  exportProjectArchive: (mixId) => ipcRenderer.invoke('export-project-archive', mixId),
  importProjectArchive: (archivePath) => ipcRenderer.invoke('import-project-archive', archivePath),
  backupOriginalFiles: (mixId, originalFiles) => ipcRenderer.invoke('backup-original-files', mixId, originalFiles),
  loadOriginalFiles: (mixId) => ipcRenderer.invoke('load-original-files', mixId),
  // Playlist handlers
  listPlaylists: () => ipcRenderer.invoke('listPlaylists'),
  savePlaylist: (playlist) => ipcRenderer.invoke('savePlaylist', playlist),
  deletePlaylist: (playlistId) => ipcRenderer.invoke('deletePlaylist', playlistId),
  exportPlaylist: (playlistId) => ipcRenderer.invoke('exportPlaylist', playlistId),
  exportPlaylistAsAudio: (playlistId) => ipcRenderer.invoke('exportPlaylistAsAudio', playlistId),
  importPlaylist: () => ipcRenderer.invoke('importPlaylist'),
  savePlaylistFromCreator: (playlist) => ipcRenderer.invoke('savePlaylistFromCreator', playlist),
  createMixFromPlaylist: (playlistId) => ipcRenderer.invoke('createMixFromPlaylist', playlistId),
  // Drinking sound handlers
  selectDrinkingSound: () => ipcRenderer.invoke('selectDrinkingSound'),
  // Playlist image handlers
  selectPlaylistImage: () => ipcRenderer.invoke('selectPlaylistImage'),
  // Clip file operations
  saveClipToFile: (clipId, buffer, clipMeta) => ipcRenderer.invoke('saveClipToFile', clipId, buffer, clipMeta),
  getClipFromFile: (clipPath) => ipcRenderer.invoke('getClipFromFile', clipPath),
  // PowerHour-specific: YouTube meta fetch via yt-dlp
  fetchYoutubeMeta: (url) =>
    new Promise((resolve, reject) => {
      const { exec } = require("child_process");
      exec(
        `yt-dlp --dump-json --no-playlist "${url}"`,
        { maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error) return reject(error);
          try {
            const meta = JSON.parse(stdout);
            resolve({
              id: meta.id,
              title: meta.title,
              webpage_url: meta.webpage_url,
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    }),
});