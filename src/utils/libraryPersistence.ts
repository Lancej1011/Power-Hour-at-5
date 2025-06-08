interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  duration?: number;
  bpm?: number;
  albumArt?: string;
  fileSize?: number;
  lastModified?: number;
  tags?: string[];
  // Library information (added when loading from multiple libraries)
  libraryPath?: string;
  libraryName?: string;
}

interface LibraryCache {
  id: string;
  name: string;
  path: string;
  songs: LibrarySong[];
  lastScanned: number;
  songCount: number;
  totalSize: number;
  version: number;
}

interface LibrarySettings {
  lastUsedLibrary?: string;
  autoRefreshEnabled: boolean;
  cacheExpiryDays: number;
  maxCacheSize: number; // in MB
  showTagsColumn: boolean; // Show/hide tags column in Music Library
  showExtractColumn: boolean; // Show/hide extract clip column in Music Library
  showWildCardColumn: boolean; // Show/hide individual wild card column in Music Library
}

const STORAGE_KEYS = {
  LIBRARIES: 'power_hour_libraries',
  SETTINGS: 'power_hour_library_settings',
  CURRENT_LIBRARY: 'power_hour_current_library'
};

const DEFAULT_SETTINGS: LibrarySettings = {
  autoRefreshEnabled: true,
  cacheExpiryDays: 7,
  maxCacheSize: 100, // 100MB cache limit
  showTagsColumn: true, // Show tags column by default
  showExtractColumn: true, // Show extract column by default
  showWildCardColumn: false // Hide individual wild card column by default
};

class LibraryPersistenceManager {
  private static instance: LibraryPersistenceManager;
  private libraries: Map<string, LibraryCache> = new Map();
  private settings: LibrarySettings = DEFAULT_SETTINGS;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): LibraryPersistenceManager {
    if (!LibraryPersistenceManager.instance) {
      LibraryPersistenceManager.instance = new LibraryPersistenceManager();
    }
    return LibraryPersistenceManager.instance;
  }

  // Load libraries and settings from localStorage
  private loadFromStorage(): void {
    try {
      // Load libraries
      const librariesData = localStorage.getItem(STORAGE_KEYS.LIBRARIES);

      if (librariesData) {
        const parsedLibraries = JSON.parse(librariesData);
        this.libraries = new Map(Object.entries(parsedLibraries));
        console.log('LibraryPersistenceManager: Loaded', this.libraries.size, 'libraries from storage');

        // Migrate libraries with old ID format to new format
        this.migrateLibraryIds();
      }

      // Load settings
      const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settingsData) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) };
      }

      // Clean up expired caches
      this.cleanupExpiredCaches();
    } catch (error) {
      console.error('Error loading library data from storage:', error);
      this.libraries.clear();
      this.settings = DEFAULT_SETTINGS;
    }
  }

  // Save libraries and settings to localStorage
  private saveToStorage(): void {
    try {
      // Convert Map to object for storage
      const librariesObj = Object.fromEntries(this.libraries);
      localStorage.setItem(STORAGE_KEYS.LIBRARIES, JSON.stringify(librariesObj));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving library data to storage:', error);
      // If storage is full, try to clean up and retry
      this.cleanupOldestCaches();
      try {
        const librariesObj = Object.fromEntries(this.libraries);
        localStorage.setItem(STORAGE_KEYS.LIBRARIES, JSON.stringify(librariesObj));
      } catch (retryError) {
        console.error('Failed to save even after cleanup:', retryError);
      }
    }
  }

  // Generate unique ID for library path
  private generateLibraryId(path: string): string {
    // Use a more robust ID generation that includes the full path hash
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const base64 = btoa(normalizedPath).replace(/[^a-zA-Z0-9]/g, '');

    // Create a simple hash of the path for additional uniqueness
    let hash = 0;
    for (let i = 0; i < normalizedPath.length; i++) {
      const char = normalizedPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Combine base64 and hash for a more unique ID
    const hashStr = Math.abs(hash).toString(36);
    const id = `${base64.substring(0, 12)}_${hashStr}`.substring(0, 20);
    return id;
  }

  // Migrate libraries from old ID format to new format
  private migrateLibraryIds(): void {
    const librariesToMigrate: Array<[string, LibraryCache]> = [];

    // Find libraries that need migration (old format IDs are typically 16 chars without underscore)
    for (const [oldId, library] of this.libraries) {
      if (oldId.length <= 16 && !oldId.includes('_')) {
        const newId = this.generateLibraryId(library.path);
        if (newId !== oldId) {
          librariesToMigrate.push([oldId, library]);
        }
      }
    }

    // Migrate libraries to new ID format
    if (librariesToMigrate.length > 0) {
      console.log(`Migrating ${librariesToMigrate.length} libraries to new ID format`);

      for (const [oldId, library] of librariesToMigrate) {
        const newId = this.generateLibraryId(library.path);

        // Update the library with new ID
        library.id = newId;
        this.libraries.set(newId, library);
        this.libraries.delete(oldId);

        // Update current library reference if needed
        const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_LIBRARY);
        if (currentId === oldId) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_LIBRARY, newId);
        }

        console.log(`Migrated library "${library.name}" from ID ${oldId} to ${newId}`);
      }

      // Save the migrated libraries
      this.saveToStorage();
    }
  }

  // Check if library needs refresh
  async needsRefresh(libraryPath: string): Promise<boolean> {
    const libraryId = this.generateLibraryId(libraryPath);
    const cached = this.libraries.get(libraryId);

    if (!cached) return true;

    // Check if cache is expired
    const now = Date.now();
    const cacheAge = now - cached.lastScanned;
    const maxAge = this.settings.cacheExpiryDays * 24 * 60 * 60 * 1000;

    if (cacheAge > maxAge) return true;

    // Check if auto-refresh is enabled and we should check for file changes
    if (this.settings.autoRefreshEnabled) {
      try {
        // TODO: Implement folder modification time checking with electron API
        // For now, we'll rely on cache expiry time
        console.log('Auto-refresh enabled, but folder stats checking not yet implemented');
      } catch (error) {
        console.warn('Could not check folder modification time:', error);
      }
    }

    return false;
  }

  // Save library to cache
  saveLibrary(libraryPath: string, songs: LibrarySong[], libraryName?: string, setAsCurrent: boolean = false): void {
    const libraryId = this.generateLibraryId(libraryPath);
    const now = Date.now();

    // Calculate total size
    const totalSize = songs.reduce((sum, song) => sum + (song.fileSize || 0), 0);

    const libraryCache: LibraryCache = {
      id: libraryId,
      name: libraryName || this.extractLibraryName(libraryPath),
      path: libraryPath,
      songs: songs,
      lastScanned: now,
      songCount: songs.length,
      totalSize: totalSize,
      version: 1
    };

    this.libraries.set(libraryId, libraryCache);
    this.saveToStorage();

    // Only set as current library if explicitly requested
    if (setAsCurrent) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_LIBRARY, libraryId);
      console.log(`Saved library "${libraryCache.name}" with ${songs.length} songs to cache and set as current`);
    } else {
      console.log(`Saved library "${libraryCache.name}" with ${songs.length} songs to cache`);
    }
  }

  // Load library from cache
  loadLibrary(libraryPath: string, setAsCurrent: boolean = false): LibrarySong[] | null {
    const libraryId = this.generateLibraryId(libraryPath);
    const cached = this.libraries.get(libraryId);

    if (!cached) return null;

    console.log(`Loaded library "${cached.name}" from cache with ${cached.songs.length} songs`);

    // Only set as current library if explicitly requested
    if (setAsCurrent) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_LIBRARY, libraryId);
    }

    return cached.songs;
  }

  // Get all cached libraries
  getAllLibraries(): LibraryCache[] {
    return Array.from(this.libraries.values()).sort((a, b) => b.lastScanned - a.lastScanned);
  }

  // Get current library
  getCurrentLibrary(): LibraryCache | null {
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_LIBRARY);
    if (!currentId) return null;

    return this.libraries.get(currentId) || null;
  }

  // Set a library as current
  setCurrentLibrary(libraryPath: string): void {
    const libraryId = this.generateLibraryId(libraryPath);
    const library = this.libraries.get(libraryId);

    if (library) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_LIBRARY, libraryId);
      console.log(`Set library "${library.name}" as current`);
    } else {
      console.warn(`Cannot set library as current - library not found: ${libraryPath}`);
    }
  }

  // Remove library from cache
  removeLibrary(libraryPath: string): void {
    const libraryId = this.generateLibraryId(libraryPath);
    this.libraries.delete(libraryId);
    this.saveToStorage();

    // Clear current library if it was the removed one
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_LIBRARY);
    if (currentId === libraryId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_LIBRARY);
    }
  }

  // Update library metadata (name, etc.)
  updateLibraryMetadata(libraryPath: string, updates: Partial<Pick<LibraryCache, 'name'>>): void {
    const libraryId = this.generateLibraryId(libraryPath);
    const cached = this.libraries.get(libraryId);

    if (cached) {
      Object.assign(cached, updates);
      this.saveToStorage();
    }
  }

  // Add a single song to the library cache
  addSongToLibrary(libraryPath: string, song: LibrarySong): LibrarySong[] | null {
    const libraryId = this.generateLibraryId(libraryPath);
    const cached = this.libraries.get(libraryId);

    if (!cached) {
      console.warn('No cached library found, cannot add song to cache');
      return null;
    }

    // Check if song already exists (by path)
    const existingIndex = cached.songs.findIndex(s => s.path === song.path);
    if (existingIndex >= 0) {
      // Update existing song
      cached.songs[existingIndex] = song;
    } else {
      // Add new song
      cached.songs.push(song);
    }

    // Update cache metadata
    cached.songCount = cached.songs.length;
    cached.totalSize = cached.songs.reduce((sum, s) => sum + (s.fileSize || 0), 0);
    cached.lastScanned = Date.now();

    this.saveToStorage();
    console.log(`Added song "${song.title || song.name}" to library cache`);

    return cached.songs;
  }

  // Update song metadata in the library cache
  updateSongMetadata(libraryPath: string, songPath: string, updates: Partial<LibrarySong>): boolean {
    console.log('updateSongMetadata called with:', { libraryPath, songPath, updates });

    const libraryId = this.generateLibraryId(libraryPath);
    const cached = this.libraries.get(libraryId);

    if (!cached) {
      console.warn('No cached library found, cannot update song metadata');
      return false;
    }

    console.log(`Found cached library with ${cached.songs.length} songs`);

    // Find the song by path
    const songIndex = cached.songs.findIndex(s => s.path === songPath);
    if (songIndex === -1) {
      console.warn('Song not found in cache, cannot update metadata. Available paths:', cached.songs.map(s => s.path));
      return false;
    }

    console.log(`Found song at index ${songIndex}:`, cached.songs[songIndex]);

    // Update the song metadata
    const oldSong = cached.songs[songIndex];
    cached.songs[songIndex] = { ...oldSong, ...updates };

    console.log('Updated song:', cached.songs[songIndex]);

    // Update cache timestamp
    cached.lastScanned = Date.now();

    this.saveToStorage();
    console.log(`Updated metadata for song "${cached.songs[songIndex].title || cached.songs[songIndex].name}"`);

    return true;
  }

  // Get settings
  getSettings(): LibrarySettings {
    return { ...this.settings };
  }

  // Update settings
  updateSettings(updates: Partial<LibrarySettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveToStorage();
  }

  // Clean up expired caches
  private cleanupExpiredCaches(): void {
    const now = Date.now();
    const maxAge = this.settings.cacheExpiryDays * 24 * 60 * 60 * 1000;

    for (const [id, library] of this.libraries) {
      if (now - library.lastScanned > maxAge) {
        console.log(`Removing expired library cache: ${library.name}`);
        this.libraries.delete(id);
      }
    }
  }

  // Clean up oldest caches when storage is full
  private cleanupOldestCaches(): void {
    const libraries = Array.from(this.libraries.entries())
      .sort(([,a], [,b]) => a.lastScanned - b.lastScanned);

    // Remove oldest 25% of libraries
    const toRemove = Math.ceil(libraries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [id, library] = libraries[i];
      console.log(`Removing old library cache to free space: ${library.name}`);
      this.libraries.delete(id);
    }
  }

  // Extract library name from path
  private extractLibraryName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Music Library';
  }

  // Get cache statistics
  getCacheStats(): {
    totalLibraries: number;
    totalSongs: number;
    totalSize: number;
    oldestCache: number;
    newestCache: number;
  } {
    const libraries = Array.from(this.libraries.values());

    return {
      totalLibraries: libraries.length,
      totalSongs: libraries.reduce((sum, lib) => sum + lib.songCount, 0),
      totalSize: libraries.reduce((sum, lib) => sum + lib.totalSize, 0),
      oldestCache: Math.min(...libraries.map(lib => lib.lastScanned)),
      newestCache: Math.max(...libraries.map(lib => lib.lastScanned))
    };
  }

  // Clear all caches
  clearAllCaches(): void {
    this.libraries.clear();
    localStorage.removeItem(STORAGE_KEYS.LIBRARIES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_LIBRARY);
    console.log('Cleared all library caches');
  }
}

export default LibraryPersistenceManager;
