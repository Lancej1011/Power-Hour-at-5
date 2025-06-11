import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import LibraryPersistenceManager from '../utils/libraryPersistence';

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
  library?: string; // Add library field for sorting
}

interface LibraryProgress {
  processed: number;
  current: string;
}

interface LibraryContextType {
  // Library state
  libraryFolder: string | null; // Currently active library folder
  librarySongs: LibrarySong[]; // Songs from currently active library
  libraryLoading: boolean;
  libraryError: string | null;
  libraryProgress: LibraryProgress | null;
  allLibraries: any[]; // All available libraries

  // Library playback state
  libraryPlayingIndex: number | null;

  // Library sort and search
  librarySort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'library' | 'tags'; direction: 'asc' | 'desc' };
  librarySearch: string;

  // Selected songs
  selectedSongs: Set<string>;

  // Recently played
  recentlyPlayed: LibrarySong[];

  // Favorite tracks
  favoriteTracks: Set<string>;

  // Actions
  loadLibrarySongs: (forceRefresh?: boolean) => Promise<void>;
  setLibraryFolder: (folder: string | null) => void;
  setLibraryPlayingIndex: (index: number | null) => void;
  setLibrarySort: (sort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'library' | 'tags'; direction: 'asc' | 'desc' }) => void;
  setLibrarySearch: (search: string) => void;
  setSelectedSongs: (songs: Set<string>) => void;
  addToRecentlyPlayed: (song: LibrarySong) => void;
  addSongToLibrary: (song: LibrarySong) => boolean;
  updateSongMetadata: (songPath: string, updates: Partial<LibrarySong>) => Promise<boolean>;
  toggleFavorite: (songPath: string) => void;
  selectLibrary: (libraryPath: string) => Promise<void>;
  chooseLibraryFolder: () => Promise<void>;
  addLibraryFolder: (folderPath: string) => Promise<boolean>;
  refreshAllLibraries: () => void;
  removeLibrary: (libraryPath: string) => Promise<void>;
  refreshLibrary: (libraryPath: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

interface LibraryProviderProps {
  children: ReactNode;
  showSnackbar?: (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

const FAVORITES_STORAGE_KEY = 'power_hour_favorite_tracks';
const RECENTLY_PLAYED_STORAGE_KEY = 'power_hour_recently_played';

export const LibraryProvider: React.FC<LibraryProviderProps> = ({ children, showSnackbar }) => {
  const persistenceManager = LibraryPersistenceManager.getInstance();

  // Library state
  const [libraryFolder, setLibraryFolderState] = useState<string | null>(null);
  const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryProgress, setLibraryProgress] = useState<LibraryProgress | null>(null);
  const [allLibraries, setAllLibraries] = useState<any[]>([]);

  // Library playback state
  const [libraryPlayingIndex, setLibraryPlayingIndex] = useState<number | null>(null);

  // Library sort and search
  const [librarySort, setLibrarySort] = useState<{ field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags'; direction: 'asc' | 'desc' }>({
    field: 'title',
    direction: 'asc'
  });
  const [librarySearch, setLibrarySearch] = useState('');

  // Selected songs
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());

  // Recently played - load from localStorage
  const [recentlyPlayed, setRecentlyPlayed] = useState<LibrarySong[]>(() => {
    try {
      const saved = localStorage.getItem(RECENTLY_PLAYED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorite tracks - load from localStorage
  const [favoriteTracks, setFavoriteTracks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save favorites to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteTracks)));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favoriteTracks]);

  // Save recently played to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(RECENTLY_PLAYED_STORAGE_KEY, JSON.stringify(recentlyPlayed));
    } catch (error) {
      console.error('Error saving recently played:', error);
    }
  }, [recentlyPlayed]);

  // Refresh all libraries list
  const refreshAllLibraries = useCallback(() => {
    const libraries = persistenceManager.getAllLibraries();
    setAllLibraries(libraries);
    console.log('LibraryContext: Refreshed all libraries, found:', libraries.length);
  }, [persistenceManager]);

  // Load library folder and songs on mount
  useEffect(() => {
    const initializeLibrary = async () => {
      // Load all available libraries first
      refreshAllLibraries();

      if (window.electronAPI) {
        try {
          const folder = await window.electronAPI.getLibraryFolder();
          setLibraryFolderState(folder);

          // Auto-load the current library if it exists
          if (folder) {
            await loadLibrarySongs();
          } else {
            // Check if we have a cached library to restore
            const currentLibrary = persistenceManager.getCurrentLibrary();
            if (currentLibrary) {
              setLibraryFolderState(currentLibrary.path);
              await loadLibrarySongs();
            }
          }
        } catch (error) {
          console.error('Error initializing library:', error);
          setLibraryError('Failed to initialize library');
        }
      } else {
        // Running in web mode (development), set up empty state
        console.log('Running in web mode - Electron API not available');
        setLibraryFolderState(null);
        setLibrarySongs([]);
        setLibraryLoading(false);
        setLibraryError(null);
      }
    };

    initializeLibrary();
  }, [refreshAllLibraries]);

  // Load songs from all libraries or specific library
  const loadLibrarySongs = useCallback(async (forceRefresh = false, specificLibrary?: string) => {
    setLibraryLoading(true);
    setLibraryError(null);
    setLibraryProgress({ processed: 0, current: 'Checking cache...' });

    try {
      if (!window.electronAPI) {
        // Running in web mode, set empty state
        setLibrarySongs([]);
        setLibraryLoading(false);
        setLibraryProgress(null);
        return;
      }

      // Get all available libraries
      const allLibraries = persistenceManager.getAllLibraries();

      if (allLibraries.length === 0) {
        // No libraries available, try to get from electron
        let folder = libraryFolder;
        if (!folder) {
          folder = await window.electronAPI.getLibraryFolder();
          setLibraryFolderState(folder);
        }

        if (!folder) {
          setLibrarySongs([]);
          setLibraryLoading(false);
          setLibraryProgress(null);
          return;
        }

        // Handle single library case (legacy)
        await loadSingleLibrary(folder, forceRefresh);
        return;
      }

      // Load songs from all libraries
      console.log('LibraryContext: Loading songs from all libraries:', allLibraries.length);

      let allSongs: LibrarySong[] = [];
      let totalProcessed = 0;

      for (const library of allLibraries) {
        try {
          setLibraryProgress({
            processed: totalProcessed,
            current: `Loading ${library.name}...`
          });

          let librarySongs: LibrarySong[] | null = null;

          // Check if we need to refresh this library
          if (!forceRefresh) {
            const needsRefresh = await persistenceManager.needsRefresh(library.path);
            if (!needsRefresh) {
              librarySongs = persistenceManager.loadLibrary(library.path);
            }
          }

          // If no cached songs or refresh needed, scan the library
          if (!librarySongs || forceRefresh) {
            console.log('LibraryContext: Scanning library:', library.path);

            // Set up progress listener for this library
            const handleProgress = (_event: any, progress: { processed: number; current: string }) => {
              setLibraryProgress({
                processed: totalProcessed + progress.processed,
                current: `${library.name}: ${progress.current}`
              });
            };

            window.electronAPI.onLibraryLoadProgress(handleProgress);

            try {
              if (window.electronAPI.scanFolderAudio) {
                librarySongs = await window.electronAPI.scanFolderAudio(library.path);
              } else {
                // Fallback for older API
                if (library.path === libraryFolder) {
                  librarySongs = await window.electronAPI.listLibraryAudio();
                } else {
                  console.warn('Cannot scan non-current library with old API');
                  librarySongs = persistenceManager.loadLibrary(library.path) || [];
                }
              }

              // Save updated library to cache
              if (librarySongs) {
                persistenceManager.saveLibrary(library.path, librarySongs, library.name, false);
              }
            } finally {
              window.electronAPI.removeLibraryLoadProgressListener(handleProgress);
            }
          }

          if (librarySongs) {
            // Add library information to each song
            const songsWithLibraryInfo = librarySongs.map(song => ({
              ...song,
              libraryPath: library.path,
              libraryName: library.name
            }));

            allSongs = allSongs.concat(songsWithLibraryInfo);
            totalProcessed += librarySongs.length;

            console.log(`LibraryContext: Loaded ${librarySongs.length} songs from ${library.name}`);
          }
        } catch (error) {
          console.error(`Error loading library ${library.name}:`, error);
          // Continue with other libraries
        }
      }

      console.log(`LibraryContext: Total songs loaded from all libraries: ${allSongs.length}`);
      setLibrarySongs(allSongs);

      // Startup notification removed - library loads silently
      // if (allSongs.length > 0) {
      //   showSnackbar?.(`Loaded ${allSongs.length} songs from ${allLibraries.length} libraries`, 'success');
      // }

    } catch (error) {
      console.error('Error loading library songs:', error);
      setLibraryError('Failed to load library songs');
      showSnackbar?.('Failed to load library songs', 'error');
    } finally {
      setLibraryLoading(false);
      setLibraryProgress(null);
    }
  }, [showSnackbar, persistenceManager, libraryFolder]);

  // Helper function to load a single library (legacy support)
  const loadSingleLibrary = useCallback(async (folder: string, forceRefresh = false) => {
    // Check if we have cached data and if it needs refresh
    if (!forceRefresh) {
      const cachedSongs = persistenceManager.loadLibrary(folder);
      const needsRefresh = await persistenceManager.needsRefresh(folder);

      if (cachedSongs && !needsRefresh) {
        setLibrarySongs(cachedSongs);
        return;
      }
    }

    // Set up progress listener for scanning
    setLibraryProgress({ processed: 0, current: 'Scanning library...' });
    const handleProgress = (_event: any, progress: { processed: number; current: string }) => {
      setLibraryProgress(progress);
    };

    window.electronAPI.onLibraryLoadProgress(handleProgress);

    try {
      let files;

      // Check if we have the new scanFolderAudio API
      if (window.electronAPI.scanFolderAudio) {
        console.log('LibraryContext: Using new scanFolderAudio API for folder:', folder);
        files = await window.electronAPI.scanFolderAudio(folder);
      } else {
        console.log('LibraryContext: Falling back to listLibraryAudio API');
        files = await window.electronAPI.listLibraryAudio();
      }

      console.log('LibraryContext: Found', files.length, 'audio files in', folder);

      // Save to cache (this library is already current, so set it as current)
      persistenceManager.saveLibrary(folder, files, undefined, true);
      console.log('LibraryContext: Saved library to cache');

      setLibrarySongs(files);
      // Startup notification removed - library loads silently
      // showSnackbar?.(`Loaded ${files.length} songs from library`, 'success');
    } finally {
      // Clean up progress listener
      window.electronAPI.removeLibraryLoadProgressListener(handleProgress);
    }
  }, [showSnackbar, persistenceManager]);

  // Set library folder
  const setLibraryFolder = useCallback((folder: string | null) => {
    setLibraryFolderState(folder);
  }, []);

  // Add to recently played
  const addToRecentlyPlayed = useCallback((song: LibrarySong) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.path !== song.path);
      return [song, ...filtered].slice(0, 10); // Keep only last 10
    });
  }, []);

  // Add a single song to the library without rescanning
  const addSongToLibrary = useCallback((song: LibrarySong) => {
    if (!libraryFolder) return false;

    try {
      // Add to cache
      const updatedSongs = persistenceManager.addSongToLibrary(libraryFolder, song);

      if (updatedSongs) {
        // Update state directly
        setLibrarySongs(updatedSongs);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding song to library:', error);
      return false;
    }
  }, [libraryFolder, persistenceManager]);

  // Update song metadata
  const updateSongMetadata = useCallback(async (songPath: string, updates: Partial<LibrarySong>): Promise<boolean> => {
    if (!libraryFolder) {
      console.error('No library folder set');
      return false;
    }

    try {
      console.log('Updating song metadata:', { songPath, updates, libraryFolder });

      // Update in local state first
      setLibrarySongs(prev => {
        const updated = prev.map(song =>
          song.path === songPath ? { ...song, ...updates } : song
        );
        console.log('Updated local state for song:', songPath);
        return updated;
      });

      // Update in cache
      const success = persistenceManager.updateSongMetadata(libraryFolder, songPath, updates);

      if (success) {
        console.log('Successfully updated metadata in cache');
        showSnackbar?.('Song metadata updated successfully', 'success');
        return true;
      } else {
        console.error('Failed to update metadata in cache');
        // Revert local changes if cache update failed
        await loadLibrarySongs();
        showSnackbar?.('Failed to update song metadata', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error updating song metadata:', error);
      // Revert local changes
      await loadLibrarySongs();
      showSnackbar?.('Failed to update song metadata', 'error');
      return false;
    }
  }, [libraryFolder, persistenceManager, showSnackbar, loadLibrarySongs]);

  // Toggle favorite
  const toggleFavorite = useCallback((songPath: string) => {
    setFavoriteTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songPath)) {
        newSet.delete(songPath);
      } else {
        newSet.add(songPath);
      }
      return newSet;
    });
  }, []);

  // Select library
  const selectLibrary = useCallback(async (libraryPath: string) => {
    console.log('LibraryContext: Selecting library:', libraryPath);

    // Set as current library in persistence layer
    persistenceManager.setCurrentLibrary(libraryPath);

    // Set the library folder on the electron side
    if (window.electronAPI) {
      await window.electronAPI.setLibraryFolder(libraryPath);
    }

    setLibraryFolderState(libraryPath);
    await loadLibrarySongs(true); // Force refresh when switching libraries
    refreshAllLibraries(); // Refresh the libraries list to update current selection
  }, [loadLibrarySongs, refreshAllLibraries, persistenceManager]);

  // Enhanced add library folder function with better error handling
  const addLibraryFolder = useCallback(async (folderPath: string) => {
    if (!window.electronAPI) {
      console.error('LibraryContext: Electron API not available');
      showSnackbar?.('Electron API not available', 'error');
      return false;
    }

    if (!folderPath || typeof folderPath !== 'string') {
      console.error('LibraryContext: Invalid folder path provided:', folderPath);
      showSnackbar?.('Invalid folder path provided', 'error');
      return false;
    }

    try {
      console.log('LibraryContext: Adding new library folder:', folderPath);

      // Check if this library already exists
      const existingLibraries = persistenceManager.getAllLibraries();
      const existingLibrary = existingLibraries.find(lib => lib.path === folderPath);

      if (existingLibrary) {
        console.log('LibraryContext: Library already exists:', folderPath);
        showSnackbar?.(`Library already exists: ${existingLibrary.name}`, 'warning');
        return false;
      }

      setLibraryLoading(true);
      setLibraryError(null);
      setLibraryProgress({ processed: 0, current: 'Initializing scan...' });

      // Set up progress listener
      const handleProgress = (event: any, progress: LibraryProgress) => {
        console.log('LibraryContext: Scan progress:', progress);
        setLibraryProgress(progress);
      };

      window.electronAPI.onLibraryLoadProgress(handleProgress);

      // Validate that the folder exists and is accessible
      try {
        const testScan = await window.electronAPI.scanFolderAudio(folderPath);
        console.log('LibraryContext: Scanned new library, found', testScan.length, 'files');

        if (testScan.length === 0) {
          console.warn('LibraryContext: No audio files found in selected folder');
          showSnackbar?.('No audio files found in the selected folder', 'warning');
          return false;
        }

        // Save the new library to cache WITHOUT setting it as current
        const libraryName = folderPath.split(/[/\\]/).pop() || 'Music Library';
        persistenceManager.saveLibrary(folderPath, testScan, libraryName, false);
        console.log('LibraryContext: Saved new library to cache without setting as current');

        // Check if this should be the current library
        const allLibrariesAfterAdd = persistenceManager.getAllLibraries();
        const isFirstLibrary = !libraryFolder && allLibrariesAfterAdd.length === 1;

        if (isFirstLibrary) {
          console.log('LibraryContext: First library added, setting as current');
          persistenceManager.setCurrentLibrary(folderPath);
          setLibraryFolderState(folderPath);

          if (window.electronAPI) {
            await window.electronAPI.setLibraryFolder(folderPath);
          }
        } else {
          console.log('LibraryContext: Additional library added, reloading all libraries. Current:', libraryFolder, 'Total libraries:', allLibrariesAfterAdd.length);
        }

        // Refresh all libraries list
        refreshAllLibraries();

        // Reload all songs to include the new library in the unified view
        await loadLibrarySongs(false);

        showSnackbar?.(`Added library "${libraryName}" with ${testScan.length} songs`, 'success');
        return true;

      } catch (scanError) {
        console.error('LibraryContext: Error scanning folder:', scanError);
        showSnackbar?.(`Failed to scan folder: ${scanError instanceof Error ? scanError.message : 'Unknown error'}`, 'error');
        return false;
      }

    } catch (error) {
      console.error('LibraryContext: Error adding library folder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showSnackbar?.(`Failed to add library folder: ${errorMessage}`, 'error');
      setLibraryError(`Failed to add library folder: ${errorMessage}`);
      return false;
    } finally {
      // Always clean up
      try {
        if (window.electronAPI && window.electronAPI.removeLibraryLoadProgressListener) {
          window.electronAPI.removeLibraryLoadProgressListener(() => {});
        }
      } catch (cleanupError) {
        console.warn('LibraryContext: Error during cleanup:', cleanupError);
      }

      setLibraryLoading(false);
      setLibraryProgress(null);
    }
  }, [libraryFolder, showSnackbar, refreshAllLibraries, persistenceManager, loadLibrarySongs]);

  // Choose library folder - legacy function for compatibility
  const chooseLibraryFolder = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      console.log('LibraryContext: Opening folder selection dialog');
      const folder = await window.electronAPI.selectLibraryFolder();
      console.log('LibraryContext: Folder selection result:', folder);

      if (folder) {
        await addLibraryFolder(folder);
      } else {
        console.log('LibraryContext: Library folder selection cancelled by user');
      }
    } catch (error) {
      console.error('LibraryContext: Error choosing library folder:', error);
      showSnackbar?.('Failed to select library folder', 'error');
    }
  }, [addLibraryFolder]);

  // Remove a library
  const removeLibrary = useCallback(async (libraryPath: string) => {
    try {
      console.log('LibraryContext: Removing library:', libraryPath);

      // Remove from persistence
      persistenceManager.removeLibrary(libraryPath);

      // If this was the current library, clear it and switch to another one if available
      if (libraryFolder === libraryPath) {
        const remainingLibraries = persistenceManager.getAllLibraries();
        if (remainingLibraries.length > 0) {
          // Switch to the first available library
          await selectLibrary(remainingLibraries[0].path);
          // selectLibrary already calls loadLibrarySongs, so we don't need to call it again
        } else {
          // No libraries left, clear everything
          setLibraryFolderState(null);
          setLibrarySongs([]);
          if (window.electronAPI) {
            await window.electronAPI.setLibraryFolder(null);
          }
        }
      } else {
        // If we removed a non-current library, reload all libraries to update the unified view
        await loadLibrarySongs(false);
      }

      // Refresh the libraries list
      refreshAllLibraries();
      showSnackbar?.(`Library removed: ${libraryPath}`, 'success');
    } catch (error) {
      console.error('LibraryContext: Error removing library:', error);
      showSnackbar?.('Failed to remove library', 'error');
    }
  }, [libraryFolder, selectLibrary, refreshAllLibraries, showSnackbar, persistenceManager, loadLibrarySongs]);

  // Refresh a specific library
  const refreshLibrary = useCallback(async (libraryPath: string) => {
    try {
      console.log('LibraryContext: Refreshing library:', libraryPath);

      if (!window.electronAPI.scanFolderAudio) {
        throw new Error('scanFolderAudio API not available');
      }

      setLibraryLoading(true);
      setLibraryError(null);

      // Set up progress listener
      const handleProgress = (event: any, progress: LibraryProgress) => {
        setLibraryProgress(progress);
      };
      window.electronAPI.onLibraryLoadProgress(handleProgress);

      // Scan the library folder
      const files = await window.electronAPI.scanFolderAudio(libraryPath);
      console.log('LibraryContext: Refreshed library, found', files.length, 'files');

      // Save the updated library to cache (don't change current library)
      persistenceManager.saveLibrary(libraryPath, files, undefined, false);

      // Clean up progress listener
      window.electronAPI.removeLibraryLoadProgressListener(handleProgress);
      setLibraryProgress(null);

      // Refresh all libraries list
      refreshAllLibraries();

      // Reload all songs to include the refreshed library in the unified view
      await loadLibrarySongs(false);

      showSnackbar?.(`Library refreshed: ${files.length} songs found`, 'success');
    } catch (error) {
      console.error('LibraryContext: Error refreshing library:', error);
      showSnackbar?.('Failed to refresh library', 'error');
      setLibraryError('Failed to refresh library');
    } finally {
      setLibraryLoading(false);
    }
  }, [libraryFolder, refreshAllLibraries, showSnackbar, persistenceManager, loadLibrarySongs]);

  // Test function for debugging (can be called from browser console)
  const testScanFolder = useCallback(async (folderPath: string) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    console.log('Testing folder scan for:', folderPath);

    try {
      if (window.electronAPI.scanFolderAudio) {
        const files = await window.electronAPI.scanFolderAudio(folderPath);
        console.log('Scan result:', files.length, 'files found');
        console.log('Sample files:', files.slice(0, 5));
        return files;
      } else {
        console.error('scanFolderAudio API not available');
      }
    } catch (error) {
      console.error('Scan failed:', error);
    }
  }, []);

  // Expose test function globally for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testScanFolder = testScanFolder;
    }
  }, [testScanFolder]);

  const contextValue: LibraryContextType = {
    libraryFolder,
    librarySongs,
    libraryLoading,
    libraryError,
    libraryProgress,
    allLibraries,
    libraryPlayingIndex,
    librarySort,
    librarySearch,
    selectedSongs,
    recentlyPlayed,
    favoriteTracks,
    loadLibrarySongs,
    setLibraryFolder,
    setLibraryPlayingIndex,
    setLibrarySort,
    setLibrarySearch,
    setSelectedSongs,
    addToRecentlyPlayed,
    addSongToLibrary,
    updateSongMetadata,
    toggleFavorite,
    selectLibrary,
    chooseLibraryFolder,
    addLibraryFolder,
    refreshAllLibraries,
    removeLibrary,
    refreshLibrary,
  };

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};
