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
}

interface LibraryProgress {
  processed: number;
  current: string;
}

interface LibraryContextType {
  // Library state
  libraryFolder: string | null;
  librarySongs: LibrarySong[];
  libraryLoading: boolean;
  libraryError: string | null;
  libraryProgress: LibraryProgress | null;

  // Library playback state
  libraryPlayingIndex: number | null;

  // Library sort and search
  librarySort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags'; direction: 'asc' | 'desc' };
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
  setLibrarySort: (sort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags'; direction: 'asc' | 'desc' }) => void;
  setLibrarySearch: (search: string) => void;
  setSelectedSongs: (songs: Set<string>) => void;
  addToRecentlyPlayed: (song: LibrarySong) => void;
  addSongToLibrary: (song: LibrarySong) => boolean;
  updateSongMetadata: (songPath: string, updates: Partial<LibrarySong>) => Promise<boolean>;
  toggleFavorite: (songPath: string) => void;
  selectLibrary: (libraryPath: string) => Promise<void>;
  chooseLibraryFolder: () => Promise<void>;
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

  // Load library folder and songs on mount
  useEffect(() => {
    const initializeLibrary = async () => {
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
  }, []);

  // Load songs in the library folder
  const loadLibrarySongs = useCallback(async (forceRefresh = false) => {
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

      const folder = await window.electronAPI.getLibraryFolder();
      setLibraryFolderState(folder);

      if (!folder) {
        setLibrarySongs([]);
        setLibraryLoading(false);
        setLibraryProgress(null);
        return;
      }

      // Check if we have cached data and if it needs refresh
      if (!forceRefresh) {
        const cachedSongs = persistenceManager.loadLibrary(folder);
        const needsRefresh = await persistenceManager.needsRefresh(folder);

        if (cachedSongs && !needsRefresh) {
          setLibrarySongs(cachedSongs);
          setLibraryProgress(null);
          setLibraryLoading(false);
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
        const files = await window.electronAPI.listLibraryAudio();

        // Save to cache
        persistenceManager.saveLibrary(folder, files);

        setLibrarySongs(files);
        showSnackbar?.(`Loaded ${files.length} songs from library`, 'success');
      } finally {
        // Clean up progress listener
        window.electronAPI.removeLibraryLoadProgressListener(handleProgress);
        setLibraryProgress(null);
      }
    } catch (error) {
      console.error('Error loading library songs:', error);
      setLibraryError('Failed to load library songs');
      showSnackbar?.('Failed to load library songs', 'error');
    } finally {
      setLibraryLoading(false);
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
    setLibraryFolderState(libraryPath);
    await loadLibrarySongs(true); // Force refresh when switching libraries
  }, [loadLibrarySongs]);

  // Choose library folder
  const chooseLibraryFolder = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const folder = await window.electronAPI.selectLibraryFolder();
      setLibraryFolderState(folder);
      if (folder) {
        await loadLibrarySongs();
      }
    } catch (error) {
      console.error('Error choosing library folder:', error);
      showSnackbar?.('Failed to select library folder', 'error');
    }
  }, [loadLibrarySongs, showSnackbar]);

  const contextValue: LibraryContextType = {
    libraryFolder,
    librarySongs,
    libraryLoading,
    libraryError,
    libraryProgress,
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
  };

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};
