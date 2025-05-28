import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Stack,
  ListItemButton,
  Slider,
  CircularProgress,
  Paper,
  Collapse,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Modal,
  Drawer,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeOff from '@mui/icons-material/VolumeOff';
import { Howl } from 'howler';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import DownloadIcon from '@mui/icons-material/Download';
import CasinoIcon from '@mui/icons-material/Casino';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import CloseIcon from '@mui/icons-material/Close';
import SendToMobileIcon from '@mui/icons-material/SendToMobile';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLocation, useNavigate } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import audioBufferToWav from 'audiobuffer-to-wav';
import { useSnackbar } from '../App';
import { useTheme } from '@mui/material/styles';
import VirtualizedLibraryTable from './VirtualizedLibraryTable';

// Import the CD extract icon
import cdIcon from '../assets/cd-icon.svg';

// Helper to format time
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

interface Song {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  year?: string;
  file: File;
  minuteClip?: Blob;
  audioBuffer?: AudioBuffer;
  sourceFilePath?: string; // Add source file path to track where it came from
}

interface ExtractedClip {
  id: string;
  name: string;
  blob: Blob;
  start: number;
  duration: number;
  sound?: Howl;
  url?: string;
  waveform?: any;
  playing?: boolean;
  data?: AudioBuffer;
  isPlaceholder?: boolean;
  clipPath?: string;
  songName?: string;
}

// Add type for library song with metadata
interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
}

interface SongUploaderProps {
  playMix: (mix: any) => void;
}

// Add a type definition for the clip metadata
interface ClipMetadata {
  id: string;
  name: string;
  start?: number;
  duration?: number;
  songName?: string;
}

// Add interface for original song data from project
interface OriginalSongData {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  year?: string;
  filePath?: string;
  sourceFilePath?: string;
}

// Add interface for playlists
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
  }>;
  drinkingSoundPath?: string;
}

const SongUploader: React.FC<SongUploaderProps> = ({ playMix }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditingMix, setIsEditingMix] = useState(false);
  const [editMixInfo, setEditMixInfo] = useState<any>(null);
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [songs, setSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('powerhour_songs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // We can't restore File objects from localStorage, but we can still use metadata
          // This will keep the metadata but songs will need to be re-added if page refreshes
          return parsed.filter(song =>
            // Only keep songs that have metadata but no file (loaded from localStorage)
            // or songs that have both metadata and file (newly added)
            song.name || song.artist || song.album || song.year
          );
        }
      } catch {}
    }
    return [];
  });
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [drinkingSound, setDrinkingSound] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [howl, setHowl] = useState<Howl | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [volume, setVolume] = useState(1);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractSongIndex, setExtractSongIndex] = useState<number | null>(null);
  const [extractRange, setExtractRange] = useState<[number, number]>([0, 60]);
  const extractDuration = 60;
  const [extractAudioDuration, setExtractAudioDuration] = useState(0);
  const [extractedClips, setExtractedClips] = useState<ExtractedClip[]>([]);
  const [clipHowl, setClipHowl] = useState<Howl | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState<number | null>(null);
  const [clipIsPlaying, setClipIsPlaying] = useState(false);
  const [clipIsPaused, setClipIsPaused] = useState(false);
  const [clipProgress, setClipProgress] = useState(0);
  const [clipDuration, setClipDuration] = useState(0);
  const clipProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [extractPreviewHowl, setExtractPreviewHowl] = useState<Howl | null>(null);
  const [extractPreviewPlaying, setExtractPreviewPlaying] = useState(false);
  const [extractPreviewProgress, setExtractPreviewProgress] = useState(0);
  const extractPreviewInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const drinkingHowlRef = useRef<Howl | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [combinedBlob, setCombinedBlob] = useState<Blob | null>(null);
  const [combining, setCombining] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [mixName, setMixName] = useState('Power Hour Mix');
  const [clipLimitWarning, setClipLimitWarning] = useState(false);
  const [mixFolder, setMixFolder] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Power Hour Library state
  const [libraryFolder, setLibraryFolder] = useState<string | null>(null);
  const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryPlayingIndex, setLibraryPlayingIndex] = useState<number | null>(null);
  // Library sort state
  const [librarySort, setLibrarySort] = useState<{ field: 'title' | 'artist' | 'album' | 'genre' | 'year'; direction: 'asc' | 'desc' }>({ field: 'title', direction: 'asc' });
  // Library search state
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryPlayError, setLibraryPlayError] = useState<string | null>(null);
  // Library loading progress
  const [libraryProgress, setLibraryProgress] = useState<{ processed: number; current: string } | null>(null);
  // Library selection state
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  // Queue for multiple song extraction
  const [extractionQueue, setExtractionQueue] = useState<LibrarySong[]>([]);
  // State to track saved clip metadata when actual clips aren't loaded
  const [clipMetadata, setClipMetadata] = useState<Array<{id: string; name: string; start: number; duration: number}>>([]);
  const [playlistNameDialogOpen, setPlaylistNameDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistNameError, setPlaylistNameError] = useState('');
  const [processedPlaylistClips, setProcessedPlaylistClips] = useState<Playlist['clips']>([]);
  const showSnackbar = useSnackbar();
  // Add loading state
  const [loading, setLoading] = useState(false);

  // For checking if a file matches an existing song without a file reference
  // @ts-ignore - Keeping for future reference
  const findMatchingSongIndex = (songs: Song[], displayName: string, artist: string, album: string, fileName: string) => {
    return songs.findIndex(song =>
      !song.file && (
        // Match by exact name
        (song.name && song.name === displayName) ||
        // Or match by artist and album if both exist
        (song.artist && song.album &&
         artist && album &&
         song.artist === artist &&
         song.album === album) ||
        // Or match by the filename
        song.name === fileName.replace(/\.[^/.]+$/, '')
      )
    );
  };

  // Now modify the onDrop function to add songs to library
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setConversionError(null);
    let addedToLibraryCount = 0;

    // Process files one by one
    for (const file of acceptedFiles) {
      try {
        console.log('Processing file:', file.name);

        // Get base filename without extension
        const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        // Most basic approach: just use filename as title
        let title = filenameWithoutExt;
        let artist = '';
        let album = '';
        let year = '';

        // Simple pattern: check for Artist - Title format
        const dashSeparator = filenameWithoutExt.indexOf(' - ');
        if (dashSeparator > 0) {
          artist = filenameWithoutExt.substring(0, dashSeparator).trim();
          title = filenameWithoutExt.substring(dashSeparator + 3).trim();
          console.log('Split by dash:', { artist, title });
        }

        // Try to get album information from either metadata or folder structure
        try {
          // If file is from a folder, use folder name as artist (if not already set) or album
          if ((file as any).path) {
            const pathParts = (file as any).path.split(/[/\\]/);

            if (pathParts.length > 1) {
              const parentFolder = pathParts[pathParts.length - 2];
              const grandparentFolder = pathParts.length > 2 ? pathParts[pathParts.length - 3] : null;

              // If we don't have an artist yet, use the parent folder
              if (!artist) {
                artist = parentFolder;
                console.log('Using folder name as artist:', artist);
              }
              // If we have an artist but no album, use parent folder as album
              else if (!album) {
                album = parentFolder;
                console.log('Using folder name as album:', album);
              }

              // If we have both artist and album but grandparent exists, try using it for album
              if (artist && !album && grandparentFolder) {
                album = grandparentFolder;
                console.log('Using grandparent folder as album:', album);
              }
            }
          }
        } catch (err) {
          console.log('Error getting folder structure info:', err);
        }

        // For existing library users with Neighbor data, set "Neighbor" as the artist if not set
        // and it matches a known pattern or folder
        if (!artist && libraryFolder && libraryFolder.includes('Neighbor')) {
          artist = 'Neighbor';
          console.log('Set default artist to Neighbor based on library folder');

          // Set a default album for Neighbor songs if possible
          if (!album && (file as any).path && (file as any).path.includes('Levitate')) {
            album = 'Live At Levitate [Disc 1]';
            console.log('Set default album for Neighbor');
          }
        }

        // Check for track number at start and remove
        const trackNumMatch = title.match(/^(\d+)[\s.\-_]+(.+)$/);
        if (trackNumMatch) {
          title = trackNumMatch[2];
          console.log('Removed track number:', title);
        }

        // Final check that we have valid data
        if (!title) {
          title = filenameWithoutExt;
        }

        console.log('Final metadata:', { title, artist, album, year });

        // Create new song object with extracted metadata values
        const newSong = {
          id: Math.random().toString(36).substr(2, 9),
          name: title,
          artist: artist || "",
          album: album || "",
          year: year || "",
          file
        };

        console.log('New song object:', newSong);

        // Handle .m4a files if needed
        if (file.name.toLowerCase().endsWith('.m4a')) {
          setConversionLoading(true);
          try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('http://localhost:4000/convert', {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error('Conversion failed');
            const blob = await response.blob();
            const mp3File = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.mp3', { type: 'audio/mp3' });

            // Add the song with the converted file
            setSongs(prev => [{...newSong, file: mp3File}, ...prev]);

            // Add to library
            if (await addToLibrary({...newSong, file: mp3File})) {
              addedToLibraryCount++;
            }
          } catch (err: any) {
            setConversionError('Failed to convert .m4a to .mp3: ' + (err?.message || err));
            // Add the song anyway with the original file
            setSongs(prev => [newSong, ...prev]);

            // Add to library with original file
            if (await addToLibrary(newSong)) {
              addedToLibraryCount++;
            }
          } finally {
            setConversionLoading(false);
          }
        } else {
          // For regular files, add directly to the state
          setSongs(prev => [newSong, ...prev]);

          // Add to library
          if (await addToLibrary(newSong)) {
            addedToLibraryCount++;
          }
        }
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    // If songs were added to library, show message and refresh list
    if (addedToLibraryCount > 0) {
      showSnackbar(`Added ${addedToLibraryCount} song${addedToLibraryCount === 1 ? '' : 's'} to your Power Hour Library`, 'info');
      loadLibrarySongs();
    }
  }, [libraryFolder, showSnackbar]);

  // Helper function to add a song to the library
  const addToLibrary = async (song: Song): Promise<boolean> => {
    try {
      if (!window.electronAPI) {
        console.log('Electron API not available, cannot add to library');
        return false;
      }

      // First check if we have a library folder
      let folder = libraryFolder;
      if (!folder) {
        folder = await window.electronAPI.getLibraryFolder();

        // If still no folder, ask the user to select one
        if (!folder) {
          folder = await window.electronAPI.selectLibraryFolder();
          if (folder) {
            setLibraryFolder(folder);
          } else {
            console.log('No library folder selected, cannot add to library');
            return false;
          }
        }
      }

      // Convert the file to an array buffer
      const arrayBuffer = await song.file.arrayBuffer();

      // Create metadata for the song
      const songMeta = {
        id: song.id,
        name: song.name,
        artist: song.artist || "",
        album: song.album || "",
        year: song.year || "",
        originalName: song.file.name,
        targetFolder: folder, // Pass the library folder as the target
        addToLibrary: true // Flag to indicate this should be added to library
      };

      // Save using the temp song mechanism - backend will handle library copy
      const result = await window.electronAPI.saveTempSong(songMeta, arrayBuffer);

      if (result) {
        console.log(`Added "${song.name}" to library`);
        return true;
      } else {
        console.error('Failed to add song to library');
        return false;
      }
    } catch (err) {
      console.error('Error adding song to library:', err);
      return false;
    }
  };

  // Keep dropzone for handling file uploads but remove unused destructuring
  useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
    }
  });

  const handleDrinkingSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDrinkingSound(e.target.files[0]);
    }
  };

  // Open modal for extraction (modified to work with both Song and LibrarySong)
  const openExtractModal = async (index: number | LibrarySong) => {
    // If the parameter is a LibrarySong, we need to convert it to a Song first
    if (typeof index !== 'number') {
      try {
        if (!window.electronAPI) throw new Error('Electron API not available');

        // Get the file as a Blob and create a temporary Song object
        const arrayBuffer = await window.electronAPI.getFileBlob(index.path);
        const file = new File([arrayBuffer], index.name);

        // Create a temporary song
        const tempSong = {
          id: Math.random().toString(36).substr(2, 9),
          name: index.title || index.name.replace(/\.[^/.]+$/, ''),
          artist: index.artist,
          album: index.album,
          year: index.year,
          file,
          sourceFilePath: index.path,
        };

        // Add the temporary song to the songs array
        setSongs(prev => [tempSong, ...prev]);

        // Set modal state with the new song's index (0)
        setExtractSongIndex(0);
        setExtractRange([0, 60]);

        // Decode audio to get duration
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        setExtractAudioDuration(audioBuffer.duration);
        audioCtx.close();
        setExtractModalOpen(true);
      } catch (err) {
        console.error('Failed to open extract modal for library song:', err);
        showSnackbar('Failed to open extraction editor for this song.', 'error');
      }
    } else {
      // Original implementation for song index
      setExtractSongIndex(index);
      setExtractRange([0, 60]);
      // Decode audio to get duration
      const song = songs[index];
      const arrayBuffer = await song.file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      setExtractAudioDuration(audioBuffer.duration);
      audioCtx.close();
      setExtractModalOpen(true);
    }
  };
  const closeExtractModal = async () => {
    setExtractModalOpen(false);
    setExtractSongIndex(null);

    // Check if there are more songs in the extraction queue
    if (extractionQueue.length > 0) {
      const nextSong = extractionQueue[0];
      const remainingQueue = extractionQueue.slice(1);
      setExtractionQueue(remainingQueue);

      // Small delay to allow modal to close before opening the next one
      setTimeout(async () => {
        await openExtractModal(nextSong);
      }, 100);
    }
  };

  // Play preview of selected segment
  const playExtractPreview = async () => {
    if (extractSongIndex === null) return;
    stopExtractPreview();
    const song = songs[extractSongIndex];
    const src = URL.createObjectURL(song.file);
    const sound = new Howl({
      src: [src],
      html5: true,
      onplay: () => {
        setExtractPreviewPlaying(true);
        extractPreviewInterval.current = setInterval(() => {
          const pos = sound.seek() as number;
          setExtractPreviewProgress(pos);
          if (pos >= extractRange[1]) {
            sound.stop();
            stopExtractPreview();
          }
        }, 100);
      },
      onend: () => stopExtractPreview(),
    });
    sound.once('play', () => {
      sound.seek(extractRange[0]);
      setExtractPreviewProgress(extractRange[0]);
    });
    sound.play();
    setExtractPreviewHowl(sound);
  };
  const pauseExtractPreview = () => {
    if (extractPreviewHowl) {
      extractPreviewHowl.pause();
      setExtractPreviewPlaying(false);
      if (extractPreviewInterval.current) clearInterval(extractPreviewInterval.current);
    }
  };
  const stopExtractPreview = () => {
    if (extractPreviewHowl) {
      extractPreviewHowl.stop();
      setExtractPreviewHowl(null);
    }
    setExtractPreviewPlaying(false);
    setExtractPreviewProgress(extractRange[0]);
    if (extractPreviewInterval.current) clearInterval(extractPreviewInterval.current);
  };

  // Extract a 1-minute clip from the selected range and add to sidebar playlist
  const extractMinute = async () => {
    if (extractSongIndex === null) return;
    console.log('extractMinute called', songs[extractSongIndex].file.name, songs[extractSongIndex].file.type);
    const song = songs[extractSongIndex];
    let arrayBuffer;
    // Improved .m4a detection
    const isM4a = song.file.type === 'audio/x-m4a' || song.file.type === 'audio/m4a' || song.file.name.toLowerCase().endsWith('.m4a');
    if (isM4a) {
      console.error('This audio format is not supported for extraction. Please use MP3, WAV, or OGG.');
      return;
    } else {
      arrayBuffer = await song.file.arrayBuffer();
    }
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      setExtractError('This audio format is not supported for extraction. Please use MP3, WAV, or OGG.');
      audioCtx.close();
      return;
    }
    const start = extractRange[0];
    const duration = Math.min(extractDuration, audioBuffer.duration - start);
    const minuteBuffer = audioCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioCtx.sampleRate * duration,
      audioCtx.sampleRate
    );
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel).slice(
        Math.floor(audioCtx.sampleRate * start),
        Math.floor(audioCtx.sampleRate * (start + duration))
      );
      minuteBuffer.copyToChannel(channelData, channel);
    }
    const offlineCtx = new OfflineAudioContext(
      minuteBuffer.numberOfChannels,
      minuteBuffer.length,
      minuteBuffer.sampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = minuteBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = await bufferToWavBlob(renderedBuffer);
    const baseName = song.name.replace(/\.[^/.]+$/, '');
    const newClip = {
      id: Math.random().toString(36).substr(2, 9),
      name: baseName + ` [${formatTime(start)} - ${formatTime(start + duration)}]`,
      blob: wavBlob,
      start,
      duration,
    };
    console.log('Adding extracted clip:', newClip);
    addExtractedClips([newClip]);
    audioCtx.close();
    closeExtractModal();
    stopExtractPreview();
  };

  // Helper to convert AudioBuffer to WAV Blob
  const bufferToWavBlob = async (buffer: AudioBuffer): Promise<Blob> => {
    const wavData = audioBufferToWav(buffer);
    return new Blob([wavData], { type: 'audio/wav' });
  };

  const playSong = (index: number) => {
    stopPlayback();
    const song = songs[index];
    let src: string;
    if (song.minuteClip) {
      src = URL.createObjectURL(song.minuteClip);
    } else {
      src = URL.createObjectURL(song.file);
    }
    const sound = new Howl({
      src: [src],
      html5: true,
      onend: () => setIsPlaying(false),
      onload: () => {
        setDuration(sound.duration());
      },
    });
    sound.play();
    setHowl(sound);
    setCurrentSongIndex(index);
    setIsPlaying(true);
    setIsPaused(false);
    setDuration(sound.duration());
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress(sound.seek() as number);
    }, 200);
  };


  const playNext = (currentIndex?: number | null) => {
    const idx = currentIndex !== undefined && currentIndex !== null ? currentIndex : currentSongIndex;
    if (idx !== null && idx < songs.length - 1) {
      playSong(idx + 1);
    } else {
      setCurrentSongIndex(null);
      setIsPlaying(false);
      setHowl(null);
    }
  };

  const playPrevious = () => {
    if (currentSongIndex !== null && currentSongIndex > 0) {
      playSong(currentSongIndex - 1);
    }
  };

  const pausePlayback = () => {
    if (howl && isPlaying) {
      howl.pause();
      setIsPaused(true);
      setIsPlaying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const resumePlayback = () => {
    if (howl && isPaused) {
      howl.play();
      setIsPaused(false);
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    if (howl) {
      howl.stop();
      setHowl(null);
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setDuration(0);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  // Seek handler
  const handleSeek = (_: Event, value: number | number[]) => {
    if (howl && typeof value === 'number') {
      howl.seek(value);
      setProgress(value);
    }
  };

  // Set volume on Howl
  React.useEffect(() => {
    if (howl) {
      howl.volume(volume);
    }
  }, [volume, howl]);

  // Volume popover handlers
  const handleVolumeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleVolumeClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // Extracted clips playlist controls
  const playClip = (index: number) => {
    stopClipPlayback();
    const clip = extractedClips[index];

    if (!clip || !clip.blob) {
      console.error('Cannot play clip: Invalid clip data');
      return;
    }

    try {
      console.log(`Playing clip: ${clip.name}, blob size: ${clip.blob.size} bytes, type: ${clip.blob.type}`);

      // Create a blob with explicit type and extension
      const blob = new Blob([clip.blob], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);

      const sound = new Howl({
        src: [blobUrl],
        html5: true,
        format: ['wav'],  // Explicitly specify format
        onend: () => handleClipEnd(index),
        onload: () => {
          console.log(`Clip loaded, duration: ${sound.duration()}`);
          setClipDuration(sound.duration());
        },
        onloaderror: (_id, error) => {
          console.error(`Error loading clip audio: ${error}`);
        },
        onplayerror: (_id, error) => {
          console.error(`Error playing clip audio: ${error}`);
        }
      });

      sound.play();
      setClipHowl(sound);
      setCurrentClipIndex(index);
      setClipIsPlaying(true);
      setClipIsPaused(false);
      setClipDuration(sound.duration() || clip.duration || 60);
      setClipProgress(0);

      clipProgressInterval.current = setInterval(() => {
        if (sound && sound.playing()) {
          setClipProgress(sound.seek() as number);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to play clip:', error);
    }
  };
  const handleClipEnd = (index: number) => {
    setClipIsPlaying(false);
    setClipIsPaused(false);
    setClipHowl(null);
    // Play drinking sound if set and there is a next clip
    if (drinkingSound && index < extractedClips.length - 1) {
      console.log('Playing drinking sound between clips');
      drinkingHowlRef.current = new Howl({
        src: [URL.createObjectURL(drinkingSound)],
        html5: true,
        onend: () => {
          console.log('Drinking sound ended, playing next clip');
          playNextClip(index);
          drinkingHowlRef.current = null;
        },
      });
      drinkingHowlRef.current.play();
    } else {
      playNextClip(index);
    }
  };
  const playNextClip = (currentIndex?: number | null) => {
    const idx = currentIndex !== undefined && currentIndex !== null ? currentIndex : currentClipIndex;
    if (idx !== null && idx < extractedClips.length - 1) {
      playClip(idx + 1);
    } else {
      setCurrentClipIndex(null);
      setClipIsPlaying(false);
      setClipHowl(null);
    }
  };
  const playPreviousClip = () => {
    if (currentClipIndex !== null && currentClipIndex > 0) {
      playClip(currentClipIndex - 1);
    }
  };
  const pauseClipPlayback = () => {
    if (clipHowl && clipIsPlaying) {
      clipHowl.pause();
      setClipIsPaused(true);
      setClipIsPlaying(false);
      if (clipProgressInterval.current) clearInterval(clipProgressInterval.current);
    }
  };
  const resumeClipPlayback = () => {
    if (clipHowl && clipIsPaused) {
      clipHowl.play();
      setClipIsPaused(false);
      setClipIsPlaying(true);
    }
  };
  const stopClipPlayback = () => {
    if (clipHowl) {
      clipHowl.stop();
      setClipHowl(null);
    }
    setClipIsPlaying(false);
    setClipIsPaused(false);
    setClipProgress(0);
    setClipDuration(0);
    if (clipProgressInterval.current) clearInterval(clipProgressInterval.current);
  };
  const removeClip = (id: string) => {
    setExtractedClips(prev => prev.filter(clip => clip.id !== id));

    // Also delete from temp folder
    if (window.electronAPI) {
      window.electronAPI.deleteTempClip(id).catch(error => {
        console.error('Failed to delete clip from temp folder:', error);
      });
    }
  };

  // Combine all extracted clips and drinking sound into one .wav
  const combineClips = async () => {
    if (extractedClips.length === 0) return;
    setCombining(true);
    setCombinedBlob(null);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let buffers: AudioBuffer[] = [];
    for (let i = 0; i < extractedClips.length; i++) {
      // Decode clip
      const clipArrayBuffer = await extractedClips[i].blob.arrayBuffer();
      const clipBuffer = await audioCtx.decodeAudioData(clipArrayBuffer);
      buffers.push(clipBuffer);
      // Insert drinking sound between clips (except after last)
      if (drinkingSound && i < extractedClips.length - 1) {
        const drinkArrayBuffer = await drinkingSound.arrayBuffer();
        const drinkBuffer = await audioCtx.decodeAudioData(drinkArrayBuffer);
        buffers.push(drinkBuffer);
      }
    }
    // Calculate total length
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const numberOfChannels = Math.max(...buffers.map(b => b.numberOfChannels));
    const sampleRate = audioCtx.sampleRate;
    const combinedBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);
    // Copy all buffers into combinedBuffer
    let offset = 0;
    for (const buf of buffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const data = buf.getChannelData(channel < buf.numberOfChannels ? channel : 0);
        combinedBuffer.getChannelData(channel).set(data, offset);
      }
      offset += buf.length;
    }
    // Convert to WAV
    const wavData = audioBufferToWav(combinedBuffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    setCombinedBlob(blob);
    setCombining(false);
    audioCtx.close();
  };

  // Save combined mix locally using Electron
  const handleOpenSaveDialog = () => {
    setMixName('Power Hour Mix');
    setSaveDialogOpen(true);
  };
  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
  };
  const handleSaveMix = async () => {
    if (!combinedBlob) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      // Ask for folder if not set
      let folder = mixFolder;
      if (!folder && window.electronAPI) {
        folder = await window.electronAPI.selectMixFolder();
        setMixFolder(folder);
      }
      if (!folder) throw new Error('No folder selected');
      // Read blob as ArrayBuffer
      const buffer = await combinedBlob.arrayBuffer();

      // Save detailed clip information to allow for later editing
      const clipDetails = extractedClips.map(clip => ({
        id: clip.id,
        name: clip.name,
        start: clip.start,
        duration: clip.duration,
        songName: clip.name.split(' [')[0], // Extract the original song name
      }));

      // Create project data
      const projectData = {
        originalSongs: songs.map(song => ({
          id: song.id,
          name: song.name,
          artist: song.artist,
          album: song.album,
          year: song.year,
          filePath: song.file ? song.file.name : undefined,
          sourceFilePath: song.sourceFilePath || undefined // Include source file path if available
        })),
        drinkingSoundPath: drinkingSound ? drinkingSound.name : undefined,
        lastModified: new Date().toISOString(),
        version: '1.0',
        notes: '',
        tags: []
      };

      const mixMeta = {
        name: isEditingMix && editMixInfo ? editMixInfo.name : mixName,
        date: new Date().toISOString(),
        songList: extractedClips.map(c => c.name),
        clips: clipDetails,
        hasDrinkingSound: !!drinkingSound,
        id: isEditingMix && editMixInfo ? editMixInfo.id : undefined,
        projectData // Add project data to mix metadata
      };

      if (!window.electronAPI) {
        setSaveError('Saving mixes locally is only supported in the desktop app.');
        setSaveLoading(false);
        return;
      }

      // If we're editing, we need to delete the old mix first
      if (isEditingMix && editMixInfo) {
        await window.electronAPI.deleteMix(editMixInfo);
      }

      const success = await window.electronAPI.saveMix(mixMeta, buffer);
      if (!success) throw new Error('Failed to save mix');

      // Also backup original files for later editing
      if (success && window.electronAPI) {
        try {
          // Collect all original files that need to be backed up
          const originalFilesToBackup = [];

          // Add song files
          for (const song of songs) {
            if (song.file && song.audioBuffer) {
              originalFilesToBackup.push({
                path: song.file.name,
                relativePath: `songs/${song.file.name}`,
                buffer: await song.file.arrayBuffer()
              });
            }
          }

          // Add drinking sound if present
          if (drinkingSound) {
            originalFilesToBackup.push({
              path: drinkingSound.name,
              relativePath: `drinking/${drinkingSound.name}`,
              buffer: await drinkingSound.arrayBuffer()
            });
          }

          // Back up original files
          if (originalFilesToBackup.length > 0) {
            const backupSuccess = await window.electronAPI.backupOriginalFiles(mixMeta.id, originalFilesToBackup);
            console.log(`Backed up ${originalFilesToBackup.length} original files: ${backupSuccess ? 'success' : 'failed'}`);
          }

          // Also make sure all the clips are saved to the temp folder
          for (const clip of extractedClips) {
            if (!clip.isPlaceholder && clip.blob) {
              const clipBuffer = await clip.blob.arrayBuffer();
              const clipMeta = {
                id: clip.id,
                name: clip.name
              };
              await window.electronAPI.saveTempClip(clipMeta, clipBuffer);
            }
          }
        } catch (backupErr) {
          console.error('Error backing up original files:', backupErr);
          // We don't throw here - the mix was saved successfully
        }
      }

      setSaveDialogOpen(false);
      setMixName('Power Hour Mix');

      // Clear the edit state if we were editing
      if (isEditingMix) {
        setIsEditingMix(false);
        setEditMixInfo(null);
        localStorage.removeItem('edit_mix');
      }
    } catch (err) {
      console.error('Error saving mix:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save mix');
    } finally {
      setSaveLoading(false);
    }
  };

  // Modified add to extractedClips to enforce 60 limit for both single and bulk adds
  const addExtractedClips = (clips: ExtractedClip[]) => {
    setExtractedClips(prev => {
      const remaining = 60 - prev.length;
      if (remaining <= 0) {
        setClipLimitWarning(true);
        return prev;
      }
      if (clips.length > remaining) {
        setClipLimitWarning(true);
      }
      return [...prev, ...clips.slice(0, remaining)];
    });
  };

  // Drag-and-drop handler
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(extractedClips);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setExtractedClips(reordered);
  };

  // Save songs to localStorage when they change
  React.useEffect(() => {
    console.log('Songs changed, total count:', songs.length);

    // When saving to localStorage, create a copy without the File objects
    // since they can't be serialized
    const songsForStorage = songs.map(song => ({
      id: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album,
      year: song.year
      // Intentionally exclude the file property
    }));
    localStorage.setItem('powerhour_songs', JSON.stringify(songsForStorage));
    console.log('Songs saved to localStorage');

    // Save each song with a File object to the temp folder
    if (window.electronAPI) {
      console.log('Saving songs to temp folder');
      let savedCount = 0;

      songs.forEach(async (song) => {
        if (song.file) {
          try {
            console.log('Saving song to temp folder:', song.id, song.name);

            // Create metadata without the File object
            const songMeta = {
              id: song.id,
              name: song.name,
              artist: song.artist,
              album: song.album,
              year: song.year,
              originalName: song.file.name
            };

            console.log('Song metadata prepared:', songMeta);

            // Get array buffer from the file
            const arrayBuffer = await song.file.arrayBuffer();
            console.log('Array buffer obtained, size:', arrayBuffer.byteLength);

            // Save to temp folder
            const result = await window.electronAPI.saveTempSong(songMeta, arrayBuffer);
            console.log('Song saved to temp folder, result:', result);
            savedCount++;
            console.log(`Saved ${savedCount}/${songs.filter(s => s.file).length} songs`);
          } catch (error) {
            console.error('Failed to save song to temp folder:', error);
          }
        } else {
          console.log('Skipping song with no file:', song.id, song.name);
        }
      });
    }
  }, [songs]);

  // Save extracted clips metadata to localStorage when they change
  React.useEffect(() => {
    // When saving to localStorage, we need to exclude Blob data that can't be serialized
    const clipsForStorage = extractedClips.map(clip => ({
      id: clip.id,
      name: clip.name,
      start: clip.start,
      duration: clip.duration
      // Intentionally exclude the blob property
    }));
    localStorage.setItem('powerhour_clips_meta', JSON.stringify(clipsForStorage));

    // Save each clip to the temp folder
    if (window.electronAPI && extractedClips.length > 0) {
      extractedClips.forEach(async (clip) => {
        // Create a smaller metadata object without the blob
        const clipMeta = {
          id: clip.id,
          name: clip.name,
          start: clip.start,
          duration: clip.duration
        };

        // Save the clip to the temp folder
        try {
          // Convert the blob to an ArrayBuffer for IPC transfer
          const arrayBuffer = await clip.blob.arrayBuffer();
          await window.electronAPI.saveTempClip(clipMeta, arrayBuffer);
        } catch (error) {
          console.error('Failed to save clip to temp folder:', error);
        }
      });
    }
  }, [extractedClips]);

  // Load library folder and songs on mount
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getLibraryFolder().then((folder: string | null) => {
        setLibraryFolder(folder);
        // Remove the automatic loading here
      });
    }
    // eslint-disable-next-line
  }, []);

  // Load saved clip metadata and temp clips/songs on mount
  React.useEffect(() => {
    const savedClipsMeta = localStorage.getItem('powerhour_clips_meta');
    if (savedClipsMeta) {
      try {
        const parsedClips = JSON.parse(savedClipsMeta);
        if (Array.isArray(parsedClips) && parsedClips.length > 0) {
          // We don't restore the actual blob data (since it can't be serialized)
          // but we save the metadata to show in the UI
          setClipMetadata(parsedClips);
        }
      } catch (err) {
        console.error('Failed to parse saved clip metadata:', err);
      }
    }

    // Load clips from temp folder
    if (window.electronAPI) {
      loadTempClips();
      loadTempSongs();
    }
  }, []);

  // Function to load clips from temp folder
  const loadTempClips = async () => {
    try {
      if (!window.electronAPI) return;

      // Get the list of temp clips
      const tempClips = await window.electronAPI.listTempClips();

      if (tempClips && tempClips.length > 0) {
        // Load each clip's blob data
        const loadedClips: ExtractedClip[] = [];

        for (const clipInfo of tempClips) {
          try {
            // Get the clip's WAV data
            const arrayBuffer = await window.electronAPI.getTempClip(clipInfo.id);
            if (arrayBuffer) {
              // Create a blob from the array buffer
              const blob = new Blob([arrayBuffer], { type: 'audio/wav' });

              // Add to loaded clips
              loadedClips.push({
                id: clipInfo.id,
                name: clipInfo.name,
                start: clipInfo.start,
                duration: clipInfo.duration,
                blob
              });
            }
          } catch (error) {
            console.error(`Failed to load clip ${clipInfo.id}:`, error);
          }
        }

        if (loadedClips.length > 0) {
          setExtractedClips(loadedClips);
          // Clear clip metadata since we now have the actual clips
          setClipMetadata([]);
        }
      }
    } catch (error) {
      console.error('Failed to load temp clips:', error);
    }
  };

  // Function to load songs from temp folder
  const loadTempSongs = async () => {
    try {
      if (!window.electronAPI) return;

      console.log('Loading songs from temp folder');

      // Get list of songs from temp folder
      const tempSongs = await window.electronAPI.listTempSongs();
      console.log('Found temp songs:', tempSongs.length);

      if (tempSongs && tempSongs.length > 0) {
        // Load each song file
        const loadedSongs: Song[] = [];

        for (const songInfo of tempSongs) {
          try {
            console.log('Loading song file for:', songInfo.id, songInfo.name);

            // Get the song file data
            const arrayBuffer = await window.electronAPI.getTempSong(
              songInfo.id,
              songInfo.fileExtension
            );

            if (arrayBuffer) {
              console.log('Successfully got array buffer, size:', arrayBuffer.byteLength);

              // Create a file from the array buffer
              const fileName = songInfo.originalName || `${songInfo.name}.mp3`;
              const fileType = getFileType(fileName);

              console.log('Creating File object with name:', fileName, 'type:', fileType);

              const file = new File([arrayBuffer], fileName, {
                type: fileType
              });

              // Add to loaded songs with all metadata
              loadedSongs.push({
                id: songInfo.id,
                name: songInfo.name || fileName.replace(/\.[^/.]+$/, ''),
                artist: songInfo.artist || '',
                album: songInfo.album || '',
                year: songInfo.year || '',
                file
              });

              console.log('Added song to loaded songs:', songInfo.name);
            } else {
              console.error('Failed to get array buffer for song:', songInfo.id);
            }
          } catch (error) {
            console.error(`Failed to load song ${songInfo.id}:`, error);
          }
        }

        console.log('Total loaded songs:', loadedSongs.length);

        if (loadedSongs.length > 0) {
          // Replace the songs array entirely instead of merging
          setSongs(loadedSongs);
          console.log('Songs state updated with loaded songs');
        }
      }
    } catch (error) {
      console.error('Failed to load temp songs:', error);
    }
  };

  // Helper to determine file type from extension
  const getFileType = (fileName: string): string => {
    console.log('Getting file type for:', fileName);
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    console.log('File extension:', ext);

    let mimeType = 'audio/mp3'; // Default

    switch (ext) {
      case 'mp3':
        mimeType = 'audio/mp3';
        break;
      case 'wav':
        mimeType = 'audio/wav';
        break;
      case 'ogg':
        mimeType = 'audio/ogg';
        break;
      case 'm4a':
        mimeType = 'audio/m4a';
        break;
      case 'flac':
        mimeType = 'audio/flac';
        break;
    }

    console.log('Determined MIME type:', mimeType);
    return mimeType;
  };

  // Load songs in the library folder
  const loadLibrarySongs = async () => {
    setLibraryLoading(true);
    setLibraryError(null);
    setLibraryProgress(null);
    try {
      if (!window.electronAPI) return;
      const folder = await window.electronAPI.getLibraryFolder();
      setLibraryFolder(folder);
      if (!folder) {
        setLibrarySongs([]);
        setLibraryLoading(false);
        return;
      }

      // Set up progress listener
      const handleProgress = (_event: any, progress: { processed: number; current: string }) => {
        setLibraryProgress(progress);
      };

      window.electronAPI.onLibraryLoadProgress(handleProgress);

      try {
        const files = await window.electronAPI.listLibraryAudio();
        setLibrarySongs(files);
      } finally {
        // Clean up progress listener
        window.electronAPI.removeLibraryLoadProgressListener(handleProgress);
        setLibraryProgress(null);
      }
    } catch (err: any) {
      setLibraryError('Failed to load library: ' + (err?.message || err));
      setLibrarySongs([]);
      setLibraryProgress(null);
    } finally {
      setLibraryLoading(false);
    }
  };

  // Cancel library loading
  const cancelLibraryLoading = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelLibraryLoading();
      setLibraryLoading(false);
      setLibraryProgress(null);
    }
  };

  // Play a song from the library
  const playLibrarySong = async (song: LibrarySong) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');
      // Get the file as a Blob and create an object URL
      const arrayBuffer = await window.electronAPI.getFileBlob(song.path);
      const fileBlob = new Blob([arrayBuffer]);
      const fileUrl = URL.createObjectURL(fileBlob);
      // Use the global player
      playMix({
        name: song.title || song.name,
        localFilePath: fileUrl,
        songList: [],
      });
      // Optionally set playing index for UI highlight
      const idx = sortedLibrarySongs.findIndex(s => s.path === song.path);
      setLibraryPlayingIndex(idx);
    } catch (err) {
      console.error('Failed to play library song:', err);
      setLibraryPlayingIndex(null);
      setLibraryPlayError('Failed to play: ' + (song.title || song.name));
    }
  };

  // Add a library song to the mix
  // Extract 1 minute from a library song
  const extractLibrarySongMinute = async (song: LibrarySong | Song) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      // Get the file as a Blob
      let arrayBuffer;

      if ('path' in song) {
        // It's a LibrarySong
        arrayBuffer = await window.electronAPI.getFileBlob(song.path);
      } else if (song.file) {
        // It's a Song with a file
        arrayBuffer = await song.file.arrayBuffer();
      } else {
        showSnackbar('Cannot extract from this song - no file available', 'error');
        return;
      }

      // Create a File object if we have a LibrarySong
      const file = 'path' in song
        ? new File([arrayBuffer], song.name)
        : song.file;

      // Create audio context and decode the audio
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Check if file is .m4a format
      const isM4a = file.type === 'audio/x-m4a' || file.type === 'audio/m4a' || file.name.toLowerCase().endsWith('.m4a');
      if (isM4a) {
        showSnackbar('This audio format is not supported for extraction. Please use MP3, WAV, or OGG.', 'error');
        audioCtx.close();
        return;
      }

      let audioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch (e) {
        showSnackbar('This audio format is not supported for extraction. Please use MP3, WAV, or OGG.', 'error');
        audioCtx.close();
        return;
      }

      // Select a random 1-minute segment
      const totalDuration = audioBuffer.duration;
      const maxStart = Math.max(0, totalDuration - 60);
      const start = Math.random() * maxStart;
      const duration = Math.min(60, totalDuration - start);

      // Create a new buffer for the extracted minute
      const minuteBuffer = audioCtx.createBuffer(
        audioBuffer.numberOfChannels,
        audioCtx.sampleRate * duration,
        audioCtx.sampleRate
      );

      // Copy the audio data for the specified range
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel).slice(
          Math.floor(audioCtx.sampleRate * start),
          Math.floor(audioCtx.sampleRate * (start + duration))
        );
        minuteBuffer.copyToChannel(channelData, channel);
      }

      // Render the audio buffer
      const offlineCtx = new OfflineAudioContext(
        minuteBuffer.numberOfChannels,
        minuteBuffer.length,
        minuteBuffer.sampleRate
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = minuteBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const renderedBuffer = await offlineCtx.startRendering();

      // Convert to WAV and create clip
      const wavBlob = await bufferToWavBlob(renderedBuffer);
      const baseName = 'title' in song ? (song.title || song.name.replace(/\.[^/.]+$/, '')) : song.name.replace(/\.[^/.]+$/, '');
      const newClip = {
        id: Math.random().toString(36).substr(2, 9),
        name: baseName + ` [${formatTime(start)} - ${formatTime(start + duration)}]`,
        blob: wavBlob,
        start,
        duration,
      };

      // Add to extracted clips
      addExtractedClips([newClip]);
      audioCtx.close();

      // Show message
      showSnackbar(`Extracted 1 minute from "${baseName}" and added to your clips.`, 'success');

    } catch (err) {
      console.error('Failed to extract minute from song:', err);
      showSnackbar('Failed to extract minute from song.', 'error');
    }
  };

  // Selection handlers
  const handleSelectSong = (songPath: string) => {
    setSelectedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songPath)) {
        newSet.delete(songPath);
      } else {
        newSet.add(songPath);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSongs.size === sortedLibrarySongs.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(sortedLibrarySongs.map(song => song.path)));
    }
  };

  // Extract clips from selected songs
  const handleExtractSelected = async () => {
    if (selectedSongs.size === 0) {
      showSnackbar('Please select songs to extract clips from', 'warning');
      return;
    }

    // Get selected songs
    const selectedSongsList = librarySongs.filter(song => selectedSongs.has(song.path));

    if (selectedSongsList.length === 1) {
      // If only one song is selected, open the extract modal for precise selection
      await openExtractModal(selectedSongsList[0]);
    } else {
      // For multiple songs, set up the extraction queue
      const [firstSong, ...remainingSongs] = selectedSongsList;
      setExtractionQueue(remainingSongs);

      showSnackbar(`Starting extraction for ${selectedSongsList.length} songs. Extract modal will open for each song.`, 'info');
      await openExtractModal(firstSong);
    }
  };

  // Wild Card function for library songs
  const handleLibraryWildCard = async () => {
    if (selectedSongs.size === 0) {
      showSnackbar('Please select songs to use for Wild Card extraction', 'warning');
      return;
    }

    // We want to extract clips and add them to the sidebar instead of adding songs to the mix
    await processWildCardExtraction();
  };

  // Process Wild Card extraction for multiple songs
  const processWildCardExtraction = async () => {
    if (selectedSongs.size === 0) return;

    // Clear existing clips if needed
    if (extractedClips.length > 0) {
      if (!confirm("This will replace your current clips. Continue?")) {
        return;
      }
      setExtractedClips([]);
    }

    // Show loading indicator
    const originalTitle = document.title;
    document.title = "Creating Wild Card Mix...";

    // Get selected songs and shuffle them, limit to 60
    const selectedSongsList = librarySongs.filter(song => selectedSongs.has(song.path));
    const shuffledLibrarySongs = [...selectedSongsList]
      .sort(() => Math.random() - 0.5)
      .slice(0, 60);

    // Create an array to hold all clips we'll process
    const allNewClips: ExtractedClip[] = [];
    let processedCount = 0;

    // Show a progress dialog or notification
    const progressDialog = document.createElement('div');
    progressDialog.style.position = 'fixed';
    progressDialog.style.top = '50%';
    progressDialog.style.left = '50%';
    progressDialog.style.transform = 'translate(-50%, -50%)';
    progressDialog.style.backgroundColor = theme.palette.background.paper;
    progressDialog.style.color = theme.palette.text.primary;
    progressDialog.style.padding = '20px';
    progressDialog.style.borderRadius = '8px';
    progressDialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    progressDialog.style.zIndex = '9999';
    progressDialog.style.minWidth = '300px';
    progressDialog.style.textAlign = 'center';
    progressDialog.innerHTML = '<h3>Creating Wild Card Mix</h3><p>Processing songs: <span id="process-count">0</span>/60</p>';
    document.body.appendChild(progressDialog);

    try {
      for (const song of shuffledLibrarySongs) {
        try {
          if (!window.electronAPI) throw new Error('Electron API not available');

          // Get the file as a Blob
          const arrayBuffer = await window.electronAPI.getFileBlob(song.path);

          // Create audio context and decode the audio
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

          // Check if file is .m4a format
          const fileName = song.name.toLowerCase();
          const isM4a = fileName.endsWith('.m4a');
          if (isM4a) {
            console.log(`Skipping unsupported format: ${song.name}`);
            audioCtx.close();
            continue;
          }

          let audioBuffer;
          try {
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          } catch (e) {
            console.log(`Could not decode: ${song.name}`);
            audioCtx.close();
            continue;
          }

          // Select a random 1-minute segment
          const totalDuration = audioBuffer.duration;
          const maxStart = Math.max(0, totalDuration - 60);
          const start = Math.random() * maxStart;
          const duration = Math.min(60, totalDuration - start);

          // Create a new buffer for the extracted minute
          const minuteBuffer = audioCtx.createBuffer(
            audioBuffer.numberOfChannels,
            audioCtx.sampleRate * duration,
            audioCtx.sampleRate
          );

          // Copy the audio data for the specified range
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel).slice(
              Math.floor(audioCtx.sampleRate * start),
              Math.floor(audioCtx.sampleRate * (start + duration))
            );
            minuteBuffer.copyToChannel(channelData, channel);
          }

          // Render the audio buffer
          const offlineCtx = new OfflineAudioContext(
            minuteBuffer.numberOfChannels,
            minuteBuffer.length,
            minuteBuffer.sampleRate
          );
          const source = offlineCtx.createBufferSource();
          source.buffer = minuteBuffer;
          source.connect(offlineCtx.destination);
          source.start();
          const renderedBuffer = await offlineCtx.startRendering();

          // Convert to WAV and create clip
          const wavBlob = await bufferToWavBlob(renderedBuffer);
          const baseName = song.title || song.name.replace(/\.[^/.]+$/, '');
          const newClip = {
            id: Math.random().toString(36).substr(2, 9),
            name: baseName + ` [${formatTime(start)} - ${formatTime(start + duration)}]`,
            blob: wavBlob,
            start,
            duration,
          };

          // Add to our clips array
          allNewClips.push(newClip);
          processedCount++;

          // Update progress display
          const countElement = document.getElementById('process-count');
          if (countElement) countElement.textContent = processedCount.toString();

          audioCtx.close();
        } catch (err) {
          console.error('Failed to extract minute from song:', err);
        }

        // Break if we have 60 clips
        if (allNewClips.length >= 60) break;
      }

      // Add all clips to extracted clips at once
      setExtractedClips(allNewClips);

      // Open the sidebar if it's closed
      setSidebarOpen(true);

      // Alert the user that clips have been created
      showSnackbar(`Created ${processedCount} random 1-minute clips for your Power Hour!`, 'success');
    } finally {
      // Remove the progress dialog
      document.body.removeChild(progressDialog);

      // Restore original title
      document.title = originalTitle;
    }
  };

  // Sort and filter library songs
  const sortedLibrarySongs = React.useMemo(() => {
    const field = librarySort.field;
    const dir = librarySort.direction === 'asc' ? 1 : -1;

    // First filter by search term
    let filtered = librarySongs;
    if (librarySearch.trim()) {
      const searchTerm = librarySearch.toLowerCase().trim();
      filtered = librarySongs.filter(song =>
        (song.title || song.name || '').toLowerCase().includes(searchTerm) ||
        (song.artist || '').toLowerCase().includes(searchTerm) ||
        (song.album || '').toLowerCase().includes(searchTerm) ||
        (song.genre || '').toLowerCase().includes(searchTerm) ||
        (song.year || '').toLowerCase().includes(searchTerm)
      );
    }

    // Then sort the filtered results
    return [...filtered].sort((a, b) => {
      const aVal = (a[field] || '').toLowerCase();
      const bVal = (b[field] || '').toLowerCase();
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }, [librarySongs, librarySort, librarySearch]);

  // Choose library folder
  const handleChooseLibraryFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectLibraryFolder();
    setLibraryFolder(folder);
    if (folder) loadLibrarySongs();
  };

  // Add effect to update body class when sidebar changes
  React.useEffect(() => {
    // Add class to body when sidebar is open
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [sidebarOpen]);

  const clearAllClips = () => {
    setExtractedClips([]);
    setClipMetadata([]);
    if (window.electronAPI) {
      window.electronAPI.clearTempClips().catch(error => {
        console.error('Failed to clear temp clips:', error);
      });
    }
  };

  // Check for editMix parameter and load saved mix data
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isEditing = searchParams.get('editMix') === 'true';

    if (isEditing) {
      // Load mix data from localStorage
      const savedMixData = localStorage.getItem('edit_mix');
      if (savedMixData) {
        try {
          const mixData = JSON.parse(savedMixData);
          setEditMixInfo(mixData);
          setIsEditingMix(true);
          setIsEditInfoOpen(true);
          setMixName(mixData.name + ' (Edit)');

          // If there was a drinking sound, we can't restore it, but we can note it
          if (mixData.hasDrinkingSound) {
            console.log('This mix had a drinking sound, please upload it again');
          }
        } catch (e) {
          console.error('Failed to parse saved mix data:', e);
        }
      }
    }

    // Check if we're editing a playlist from the Playlists page
    const editPlaylistData = localStorage.getItem('edit_playlist');
    if (editPlaylistData) {
      try {
        const playlist = JSON.parse(editPlaylistData);
        console.log('Loading playlist for editing:', playlist);
        setMixName(`${playlist.name} (Edited)`);

        // Load the clips from the playlist
        if (playlist.clips && playlist.clips.length > 0) {
          loadClipsFromPlaylist(playlist);
        }

        // If the playlist has a drinking sound, set it
        if (playlist.drinkingSoundPath) {
          // Create a File object from the drinking sound path
          (async () => {
            try {
              if (window.electronAPI) {
                const drinkingSoundData = await window.electronAPI.getFileBlob(playlist.drinkingSoundPath);
                if (drinkingSoundData) {
                  const fileName = playlist.drinkingSoundPath.split('/').pop() || 'drinking-sound.wav';
                  const drinkingSoundFile = new File([drinkingSoundData], fileName, { type: 'audio/wav' });
                  setDrinkingSound(drinkingSoundFile);
                }
              }
            } catch (err) {
              console.error('Error loading drinking sound:', err);
            }
          })();
        }

        // Remove from localStorage after loading
        localStorage.removeItem('edit_playlist');
      } catch (err) {
        console.error('Error parsing edit playlist data:', err);
        localStorage.removeItem('edit_playlist');
      }
    }
  }, [location]);

  // Function to load clips from a playlist
  const loadClipsFromPlaylist = async (playlist: any) => {
    if (!playlist.clips || playlist.clips.length === 0) return;

    console.log(`Loading ${playlist.clips.length} clips from playlist`);
    setLoading(true);

    try {
      const clipPromises = playlist.clips.map(async (clip: any) => {
        if (!clip.clipPath) {
          console.error(`Clip ${clip.name} has no path`);
          return null;
        }

        try {
          // Get audio buffer from file
          if (!window.electronAPI) throw new Error('Electron API not available');
          const clipData = await window.electronAPI.getClipFromFile(clip.clipPath);
          if (!clipData) throw new Error(`Failed to load clip from ${clip.clipPath}`);

          const { buffer } = clipData;

          // Create blob and URL for the audio
          const blob = new Blob([buffer], { type: 'audio/wav' });
          const blobUrl = URL.createObjectURL(blob);

          // Create a sound object for playback
          const sound = new Howl({
            src: [blobUrl],
            format: ['wav'],
            html5: true
          });

          // Create clip object
          return {
            id: clip.id,
            name: clip.name || `Clip ${extractedClips.length + 1}`,
            sound,
            blob,
            url: blobUrl,
            waveform: null, // We'll generate this later if needed
            start: clip.start || 0,
            duration: clip.duration || 0,
            playing: false,
            songName: clip.songName,
            clipPath: clip.clipPath,
            data: buffer
          };
        } catch (err) {
          console.error(`Error loading clip ${clip.name}:`, err);
          return null;
        }
      });

      const loadedClips = await Promise.all(clipPromises);
      const validClips = loadedClips.filter(clip => clip !== null) as ExtractedClip[];

      setExtractedClips(validClips);
      console.log(`Successfully loaded ${validClips.length} of ${playlist.clips.length} clips`);
    } catch (err) {
      console.error('Error loading clips from playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load clips from saved mix data
  const loadSavedMixClips = async () => {
    if (!editMixInfo || !editMixInfo.clips || !editMixInfo.clips.length) {
      return;
    }

    console.log("Loading saved mix clips:", editMixInfo.clips.length);

    // Clear existing clips
    setExtractedClips([]);

    // Load original songs if they exist in project data
    if (editMixInfo.projectData?.originalSongs && window.electronAPI) {
      console.log("Loading original songs from project data");

      try {
        // Try to load original files from backup
        const originalFiles = await window.electronAPI.loadOriginalFiles(editMixInfo.id);

        if (originalFiles && originalFiles.length > 0) {
          console.log(`Found ${originalFiles.length} original files in backup`);

          // Create song objects from the original files
          const loadedSongs: Song[] = [];

          // Process each original song from the project data
          for (const songData of editMixInfo.projectData.originalSongs as OriginalSongData[]) {
            // Look for matching file in the original files
            const matchingFile = originalFiles.find(f =>
              f.relativePath.includes(`songs/${songData.filePath}`) ||
              f.name === songData.filePath
            );

            if (matchingFile && matchingFile.buffer) {
              // Create a File object from the buffer
              const file = new File(
                [matchingFile.buffer],
                songData.filePath || matchingFile.name,
                { type: getFileType(matchingFile.name) }
              );

              // Add to loaded songs array
              loadedSongs.push({
                id: songData.id,
                name: songData.name,
                artist: songData.artist,
                album: songData.album,
                year: songData.year,
                file,
                sourceFilePath: songData.sourceFilePath
              });

              console.log(`Loaded original song: ${songData.name}`);
            } else if (songData.sourceFilePath && window.electronAPI) {
              try {
                // Try to load directly from the source file path if available
                console.log(`Trying to load song from original path: ${songData.sourceFilePath}`);
                const arrayBuffer = await window.electronAPI.getFileBlob(songData.sourceFilePath);

                if (arrayBuffer) {
                  const fileName = songData.filePath || path.basename(songData.sourceFilePath);
                  const file = new File(
                    [arrayBuffer],
                    fileName,
                    { type: getFileType(fileName) }
                  );

                  // Add to loaded songs array
                  loadedSongs.push({
                    id: songData.id,
                    name: songData.name,
                    artist: songData.artist,
                    album: songData.album,
                    year: songData.year,
                    file,
                    sourceFilePath: songData.sourceFilePath
                  });

                  console.log(`Loaded song from original path: ${songData.name}`);
                }
              } catch (err) {
                console.error(`Failed to load song from original path: ${songData.sourceFilePath}`, err);
              }
            } else {
              console.log(`Could not find original file for song: ${songData.name}`);

              // Add metadata only as a placeholder
              loadedSongs.push({
                id: songData.id,
                name: songData.name,
                artist: songData.artist,
                album: songData.album,
                year: songData.year,
                file: null as any, // Will be populated when user uploads the file
                sourceFilePath: songData.sourceFilePath
              });
            }
          }

          // Update songs state with loaded songs
          if (loadedSongs.length > 0) {
            setSongs(loadedSongs);
            console.log(`Set ${loadedSongs.length} songs from original files`);
          }
        } else if (editMixInfo.projectData.originalSongs.length > 0) {
          // If no original files found but we have metadata, create placeholder entries
          console.log('No original files found, creating metadata placeholders');

          const metadataSongs = (editMixInfo.projectData.originalSongs as OriginalSongData[]).map(songData => ({
            id: songData.id,
            name: songData.name,
            artist: songData.artist,
            album: songData.album,
            year: songData.year,
            file: null as any, // Will be populated when user uploads the file
            sourceFilePath: songData.sourceFilePath
          }));

          setSongs(metadataSongs);
          console.log(`Set ${metadataSongs.length} song metadata placeholders`);
        }
      } catch (err) {
        console.error('Error loading original songs:', err);
      }
    }

    const clipPromises = editMixInfo.clips.map(async (clipInfo: ClipMetadata) => {
      try {
        // First check if the clip audio exists in the temp clips folder
        if (window.electronAPI) {
          // Try to load the actual clip audio from temp folder
          const clipBuffer = await window.electronAPI.getTempClip(clipInfo.id);

          if (clipBuffer) {
            console.log(`Found actual clip audio for ${clipInfo.id}`);

            // Create an AudioBuffer from the clip data
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = clipBuffer;
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // Create a blob URL for playback
            const wavData = audioBufferToWav(audioBuffer);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            const blobUrl = URL.createObjectURL(blob);

            // Create a sound object for playback
            const sound = new Howl({
              src: [blobUrl],
              format: ['wav'],
              html5: true,
              onend: () => handleClipEnd(extractedClips.length),
              onload: () => {
                console.log(`Clip loaded from temp folder, duration: ${sound.duration()}`);
              },
              onloaderror: (_id, error) => {
                console.error(`Error loading clip audio from temp folder: ${error}`);
              },
              onplayerror: (_id, error) => {
                console.error(`Error playing clip audio from temp folder: ${error}`);
              }
            });

            // Create clip object
            return {
              id: clipInfo.id,
              name: clipInfo.name || `Clip ${extractedClips.length + 1}`,
              sound,
              blob,
              url: blobUrl,
              waveform: null, // We'll generate this later if needed
              start: clipInfo.start || 0,
              duration: clipInfo.duration || sound.duration(),
              playing: false,
              data: audioBuffer
            };
          }
        }

        // If we couldn't load the actual clip, create a placeholder with a small sine wave
        console.log(`Creating placeholder audio for clip ${clipInfo.id}`);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create a 1-second sine wave as a placeholder
        const sampleRate = audioCtx.sampleRate;
        const buffer = audioCtx.createBuffer(2, sampleRate, sampleRate);

        // Fill channels with a sine wave
        for (let channel = 0; channel < 2; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < sampleRate; i++) {
            // Very quiet sine wave
            channelData[i] = Math.sin(i / 100) * 0.01;
          }
        }

        // Convert to WAV for playback compatibility
        const wavData = audioBufferToWav(buffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);

        // Create a sound object for playback
        const sound = new Howl({
          src: [blobUrl],
          format: ['wav'],  // Explicitly specify format
          html5: true,
          onend: () => handleClipEnd(extractedClips.length),
          onload: () => {
            console.log(`Placeholder clip loaded, duration: ${sound.duration()}`);
          },
          onloaderror: (_id, error) => {
            console.error(`Error loading placeholder clip audio: ${error}`);
          },
          onplayerror: (_id, error) => {
            console.error(`Error playing placeholder clip audio: ${error}`);
          }
        });

        // Create clip object
        return {
          id: clipInfo.id,
          name: clipInfo.name || `Clip ${extractedClips.length + 1}`,
          sound,
          blob,
          url: blobUrl,
          waveform: null, // We'll generate this later if needed
          start: clipInfo.start || 0,
          duration: clipInfo.duration || 1,
          playing: false,
          isPlaceholder: true,  // Mark as placeholder
          data: buffer
        };
      } catch (err) {
        console.error(`Error creating clip for ${clipInfo.id}:`, err);
        return null;
      }
    });

    // Wait for all clips to be created
    const clips = await Promise.all(clipPromises);
    // Filter out any failed clips
    const validClips = clips.filter(clip => clip !== null) as ExtractedClip[];
    setExtractedClips(validClips);

    console.log(`Loaded ${validClips.length} clips from saved mix`);
  };

  // Clear edit mode and navigate back to saved mixes
  const handleCancelEdit = () => {
    setIsEditingMix(false);
    setEditMixInfo(null);
    localStorage.removeItem('edit_mix');
    navigate('/saved');
  };

  // Function to send the current clips to the Playlist Page as a new playlist
  const handleSendToPlaylistsPage = async () => {
    if (extractedClips.length === 0) {
      setExportError("No clips to send to playlists.");
      showSnackbar("No clips to send to playlists.", 'error');
      return;
    }

    try {
      setExportLoading(true);
      setExportError(null);

      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const tempProcessedPlaylistClips: Playlist['clips'] = [];

      for (const clip of extractedClips) {
        let finalClipPath: string | undefined = undefined;
        let finalClipMetadata: any = {};

        if (clip.blob) {
          try {
            const arrayBuffer = await clip.blob.arrayBuffer();
            const clipMetadataForSave = {
              id: clip.id,
              name: clip.name,
              start: clip.start || 0,
              duration: clip.duration || 0,
              songName: clip.songName || clip.name.split(' - ')[0] || 'Unknown Song'
            };

            const saveResult = await window.electronAPI.saveClipToFile(clip.id, arrayBuffer, clipMetadataForSave);

            if (saveResult.success && saveResult.clipPath && saveResult.metadata) {
              finalClipPath = saveResult.clipPath;
              finalClipMetadata = saveResult.metadata;
            } else {
              throw new Error(saveResult.message || `Failed to save clip ${clip.name}`);
            }
          } catch (err) {
            console.error('Error saving clip before sending to playlist:', err);
            setExportError(`Error processing clip ${clip.name}: ${(err as Error).message}`);
            setExportLoading(false);
            return;
          }
        } else if (clip.clipPath && fs.existsSync(clip.clipPath)) {
            // If blob is missing but a valid clipPath exists (e.g. loaded from somewhere else)
            finalClipPath = clip.clipPath;
            // Try to load metadata if it exists
            try {
                const loadedMeta = await window.electronAPI.getClipFromFile(finalClipPath);
                if (loadedMeta && loadedMeta.metadata) {
                    finalClipMetadata = loadedMeta.metadata;
                } else {
                    // Create basic if not found
                    finalClipMetadata = { id: clip.id, name: clip.name, start: clip.start, duration: clip.duration, songName: clip.songName, clipPath: finalClipPath };
                }
            } catch (metaErr) {
                 console.warn("Could not load metadata for existing clip:", metaErr);
                 finalClipMetadata = { id: clip.id, name: clip.name, start: clip.start, duration: clip.duration, songName: clip.songName, clipPath: finalClipPath };
            }
        } else {
            console.warn('Clip without blob or valid existing clipPath skipped:', clip.name);
            continue; // Skip this clip
        }

        if (finalClipPath) {
            tempProcessedPlaylistClips.push({
                id: finalClipMetadata.id || clip.id,
                name: finalClipMetadata.name || clip.name,
                start: finalClipMetadata.start || clip.start || 0,
                duration: finalClipMetadata.duration || clip.duration || 0,
                songName: finalClipMetadata.songName || clip.songName || 'Unknown Song',
                clipPath: finalClipPath
            });
        }
      }

      if (tempProcessedPlaylistClips.length === 0) {
        setExportError("No valid clips could be processed to send to playlists.");
        showSnackbar("No valid clips could be processed.", 'error');
        setExportLoading(false);
        return;
      }

      // Store processed clips and open the naming dialog
      setProcessedPlaylistClips(tempProcessedPlaylistClips);
      setNewPlaylistName(`Playlist ${new Date().toLocaleDateString()}`);
      setPlaylistNameError('');
      setPlaylistNameDialogOpen(true);

    } catch (error) {
      console.error('Error preparing playlist:', error);
      setExportError(`Error: ${(error as Error).message}`);
      showSnackbar(`Error: ${(error as Error).message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Add new function to handle the final submission after naming
  const handleConfirmPlaylistName = async () => {
    if (!newPlaylistName.trim()) {
      setPlaylistNameError('Playlist name is required');
      return;
    }

    setPlaylistNameError('');
    setPlaylistNameDialogOpen(false);
    setExportLoading(true);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newPlaylist: Playlist = {
        id: `pl_${Date.now()}`,
        name: newPlaylistName.trim(),
        date: new Date().toISOString(),
        clips: processedPlaylistClips,
        drinkingSoundPath: drinkingSound && (drinkingSound as any).path ? (drinkingSound as any).path : undefined
      };

      const saveResult = await window.electronAPI.savePlaylistFromCreator(newPlaylist);

      if (saveResult && saveResult.success) {
        showSnackbar(`Playlist "${newPlaylist.name}" sent to Playlist Page!`, 'success');
        navigate('/playlists');
      } else {
        throw new Error(saveResult.message || 'Failed to send playlist to Playlist Page');
      }
    } catch (error) {
      console.error('Error sending to Playlist Page:', error);
      setExportError(`Error: ${(error as Error).message}`);
      showSnackbar(`Error: ${(error as Error).message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Add function to handle dialog close
  const handlePlaylistNameDialogClose = () => {
    setPlaylistNameDialogOpen(false);
  };

  // Add to existing JSX, right after the style tag at the beginning of the render function
  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      padding: '24px 10%', // Consistent padding regardless of sidebar state
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <style>{`
        .MuiDrawer-root.MuiDrawer-persistent .MuiDrawer-paper {
          position: fixed !important;
        }
        body.sidebar-open {
          padding-right: 0 !important;
          overflow: auto !important;
        }
        .library-table-container {
          overflow-x: auto !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .library-table {
          min-width: 800px !important;
          table-layout: fixed !important;
          width: 100% !important;
          margin: 0 auto;
        }
        .library-table th, .library-table td {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .library-table-container::-webkit-scrollbar {
          height: 8px;
          background-color: rgba(0,0,0,0.1);
        }
        .library-table-container::-webkit-scrollbar-thumb {
          background-color: ${theme.palette.primary.main}50;
          border-radius: 4px;
        }
        .library-table-container::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.palette.primary.main}80;
        }
        @media (max-width: 1200px) {
          body > div:first-child {
            padding-left: 5% !important;
            padding-right: 5% !important;
          }
          body.sidebar-open > div:first-child {
            padding-right: calc(320px + 5%) !important;
          }
        }
        @media (max-width: 768px) {
          body > div:first-child {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          body.sidebar-open > div:first-child {
            padding-right: calc(320px + 16px) !important;
          }
          .library-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          .library-controls > div:last-child {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
        }
      `}</style>

      {/* Edit mix info alert */}
      {isEditingMix && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            display: isEditInfoOpen ? 'flex' : 'none',
            width: '100%', // Make alert full width
            maxWidth: '100%'
          }}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={loadSavedMixClips}
              >
                LOAD CLIPS
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={handleCancelEdit}
              >
                CANCEL
              </Button>
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setIsEditInfoOpen(!isEditInfoOpen)}
              >
                <InfoIcon />
              </IconButton>
            </>
          }
          onClose={() => setIsEditInfoOpen(false)}
        >
          <div>
            <Typography variant="body1" fontWeight="bold">
              Editing: {editMixInfo?.name}
            </Typography>
            <Typography variant="body2">
              To edit this mix, first load the clip metadata, then replace any clips by extracting new segments.
            </Typography>
            {editMixInfo?.hasDrinkingSound && (
              <Typography variant="body2" color="warning.main">
                This mix used a drinking sound. Please upload it again.
              </Typography>
            )}
          </div>
        </Alert>
      )}



      {/* Seek bar and controls only when a song is loaded */}
      {howl && (
        <>
          <Box sx={{ mb: 2, px: 2, width: '100%', maxWidth: '1200px' }}>
            <Slider
              value={progress}
              min={0}
              max={duration}
              step={0.01}
              onChange={handleSeek}
              aria-labelledby="seek-bar"
              sx={{ color: 'secondary.main' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
            <IconButton onClick={playPrevious} disabled={currentSongIndex === null || currentSongIndex === 0}>
              <SkipPreviousIcon />
            </IconButton>
            {isPlaying ? (
              <IconButton onClick={pausePlayback}>
                <PauseIcon />
              </IconButton>
            ) : isPaused ? (
              <IconButton onClick={resumePlayback}>
                <PlayArrowIcon />
              </IconButton>
            ) : (
              <IconButton onClick={() => currentSongIndex !== null ? playSong(currentSongIndex) : playSong(0)} disabled={songs.length === 0}>
                <PlayArrowIcon />
              </IconButton>
            )}
            <IconButton onClick={stopPlayback} disabled={!isPlaying && !isPaused}>
              <StopIcon />
            </IconButton>
            <IconButton onClick={() => playNext()} disabled={currentSongIndex === null || currentSongIndex === songs.length - 1}>
              <SkipNextIcon />
            </IconButton>
            <IconButton onClick={handleVolumeClick}>
              {volume === 0 ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Stack>
        </>
      )}

      {/* Power Hour Library Section */}
      <div style={{ width: '100%', maxWidth: '100%' }}>
        <div
          className="library-controls"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            width: '100%',
            maxWidth: '1200px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Power Hour Library</h2>
            <Typography variant="body2" sx={{ ml: 1, color: theme.palette.text.secondary, fontWeight: 700, fontSize: '1rem' }}>
              ({librarySongs.length})
            </Typography>
          </div>
          <div>
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={handleChooseLibraryFolder}
              size="small"
              sx={{ marginRight: '8px' }}
            >
              Choose Library Folder
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              component="label"
              size="small"
              sx={{ marginRight: '8px' }}
            >
              Import Songs
              <input type="file" accept="audio/*" hidden multiple onChange={(e) => onDrop(e.target.files ? Array.from(e.target.files) : [])} />
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadLibrarySongs}
              size="small"
              disabled={!libraryFolder}
              color="primary"
            >
              Load Library
            </Button>
          </div>
        </div>

        <div style={{ padding: '0 0 12px 0', width: '100%', maxWidth: '1200px' }}>
          {libraryFolder ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
              Folder: <code>{libraryFolder}</code>
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
              No library folder selected.
            </Typography>
          )}
        </div>

        {libraryError && <Typography color="error" sx={{ padding: '0 0 12px 0', fontSize: '0.8rem', width: '100%', maxWidth: '1200px' }}>{libraryError}</Typography>}

        {/* Search Bar */}
        <div style={{ padding: '0 0 16px 0', width: '100%', maxWidth: '1200px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search songs, artists, albums, genres, or years..."
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                '& fieldset': {
                  borderColor: theme.palette.secondary.main,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.secondary.main,
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 0.7,
              },
            }}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
              ),
              endAdornment: librarySearch && (
                <IconButton
                  size="small"
                  onClick={() => setLibrarySearch('')}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </div>

        {/* Bulk Action Buttons */}
        {selectedSongs.size > 0 && (
          <div style={{
            padding: '0 0 16px 0',
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }}>
              {selectedSongs.size} song{selectedSongs.size === 1 ? '' : 's'} selected:
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={handleLibraryWildCard}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
                padding: '4px 12px',
                fontSize: '0.85rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Wild Card - Extract random clips from selected songs"
            >
              🎲 Wild Card (Random)
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleExtractSelected}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
                padding: '4px 12px',
                fontSize: '0.85rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Extract precise clips from selected songs using the extraction modal"
            >
              <img
                src={cdIcon}
                alt="Extract clips"
                style={{ width: '16px', height: '16px' }}
              />
              Extract (Precise)
            </Button>
          </div>
        )}

        {libraryLoading ? (
          <div style={{ width: '100%', maxWidth: '1200px', padding: '20px' }}>
            <Typography sx={{ fontSize: '0.9rem', marginBottom: '16px' }}>
              Loading library...
            </Typography>
            {libraryProgress && (
              <div>
                <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, marginBottom: '8px' }}>
                  Processed {libraryProgress.processed} files
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                  Current: {libraryProgress.current}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={cancelLibraryLoading}
                  sx={{ marginTop: '8px', fontSize: '0.75rem' }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <VirtualizedLibraryTable
            songs={sortedLibrarySongs}
            selectedSongs={selectedSongs}
            libraryPlayingIndex={libraryPlayingIndex}
            onSelectSong={handleSelectSong}
            onSelectAll={handleSelectAll}
            onPlaySong={(song, index) => {
              playLibrarySong(song);
              setLibraryPlayingIndex(index);
            }}
            onExtractClip={(song) => openExtractModal(song)}
            librarySort={librarySort}
            onSortChange={(field) => {
              setLibrarySort(s => ({
                field,
                direction: s.field === field ? (s.direction === 'asc' ? 'desc' : 'asc') : 'asc'
              }));
            }}
          />
        )}
      </div>

      {/* Extraction Modal */}
      <Modal
        open={extractModalOpen}
        onClose={() => { closeExtractModal(); stopExtractPreview(); }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          p: 3,
          borderRadius: 2,
          minWidth: 400,
          width: '40%',
          maxWidth: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          border: `1px solid ${theme.palette.secondary.main}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Header with close button */}
          <Box sx={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h5" sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              fontSize: '1.2rem',
              textAlign: 'center'
            }}>
              Select 1-Minute Segment
              {extractionQueue.length > 0 && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem', mt: 0.5 }}>
                  ({extractionQueue.length + 1} songs remaining)
                </Typography>
              )}
            </Typography>
            <IconButton
              onClick={() => { closeExtractModal(); stopExtractPreview(); }}
              sx={{
                color: theme.palette.text.primary,
                p: 1,
                position: 'absolute',
                right: -8,
                top: -8
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Instructions */}
          <Typography variant="body2" sx={{
            mb: 2,
            textAlign: 'center',
            width: '90%'
          }}>
            Drag either bracket to scroll the 1-minute window.
          </Typography>

          {/* Slider container - completely rebuilt */}
          <Box sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Box sx={{
              width: '80%',
              position: 'relative',
              height: '36px'
            }}>
              <Slider
                value={extractRange}
                min={0}
                max={extractAudioDuration > 0 ? extractAudioDuration : 60}
                step={0.01}
                onChange={(_, value) => {
                  if (Array.isArray(value)) {
                    let [start, end] = value;
                    // Always lock range to 60s
                    if (end - start !== extractDuration) {
                      if (start !== extractRange[0]) {
                        // Dragging start
                        start = Math.max(0, Math.min(start, extractAudioDuration - extractDuration));
                        end = start + extractDuration;
                      } else {
                        // Dragging end
                        end = Math.min(extractAudioDuration, Math.max(end, extractDuration));
                        start = end - extractDuration;
                      }
                    }
                    setExtractRange([start, end]);
                  }
                }}
                sx={{
                  color: theme.palette.secondary.main,
                  height: 4,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                  }
                }}
              />
            </Box>

            {/* Time labels */}
            <Box sx={{
              width: '80%',
              display: 'flex',
              justifyContent: 'space-between',
              mt: 0.5,
              mb: 2,
              color: theme.palette.text.secondary,
              fontSize: 13
            }}>
              <Box>Start: {formatTime(extractRange[0])}</Box>
              <Box>End: {formatTime(extractRange[1])}</Box>
            </Box>
          </Box>

          {/* Current time indicator */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 2
          }}>
            <Box sx={{
              display: 'inline-block',
              bgcolor: `${theme.palette.primary.main}20`,
              borderRadius: 1,
              px: 2,
              py: 1
            }}>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }}>
                Current: {formatTime(extractPreviewProgress)}
              </Typography>
            </Box>
          </Box>

          {/* Playback controls */}
          <Stack direction="row" spacing={2} sx={{ mb: 3, justifyContent: 'center', alignItems: 'center' }}>
            {extractPreviewPlaying ? (
              <Button
                variant="contained"
                startIcon={<PauseIcon />}
                onClick={pauseExtractPreview}
                size="small"
                sx={{ borderRadius: 28, px: 2, py: 0.5, bgcolor: theme.palette.secondary.main, fontSize: '0.8rem' }}
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={playExtractPreview}
                size="small"
                sx={{ borderRadius: 28, px: 2, py: 0.5, bgcolor: theme.palette.secondary.main, fontSize: '0.8rem' }}
              >
                Preview
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={stopExtractPreview}
              size="small"
              sx={{ borderRadius: 28, px: 2, py: 0.5, color: theme.palette.text.primary, borderColor: theme.palette.secondary.main, fontSize: '0.8rem' }}
            >
              Stop
            </Button>
          </Stack>

          {/* Save button and queue controls */}
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={extractMinute}
              sx={{
                width: '100%',
                borderRadius: 28,
                py: 1,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.9rem',
                fontWeight: 600,
                '&:hover': { bgcolor: theme.palette.primary.dark }
              }}
            >
              SAVE THIS CLIP
            </Button>

            {extractionQueue.length > 0 && (
              <Button
                variant="outlined"
                onClick={() => {
                  setExtractionQueue([]);
                  closeExtractModal();
                  stopExtractPreview();
                }}
                sx={{
                  width: '100%',
                  borderRadius: 28,
                  py: 0.5,
                  color: theme.palette.text.secondary,
                  borderColor: theme.palette.text.secondary,
                  fontSize: '0.8rem',
                  '&:hover': {
                    borderColor: theme.palette.error.main,
                    color: theme.palette.error.main
                  }
                }}
              >
                Skip Remaining ({extractionQueue.length} songs)
              </Button>
            )}
          </Box>
        </Box>
      </Modal>

      {/* Extracted Clips Sidebar with attached toggle button */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', zIndex: 1250 }}>
        {/* CLIPS toggle button */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: sidebarOpen ? '320px' : 0,
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: theme.palette.primary.dark,
            color: 'white',
            padding: '16px 8px',
            borderRadius: '8px 0 0 8px',
            cursor: 'pointer',
            boxShadow: '0 3px 5px rgba(0,0,0,0.3)',
            border: `1px solid ${theme.palette.secondary.main}`,
            borderRight: 'none',
            transition: 'right 0.3s ease',
            zIndex: 1251
          }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            marginTop: '8px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            fontSize: '12px'
          }}>
            CLIPS
          </div>
        </div>

        {/* Custom sidebar implementation */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={sidebarOpen}
          PaperProps={{
            sx: {
              width: 320,
              bgcolor: theme.palette.primary.dark,
              color: '#fff',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'hidden',
              boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
              zIndex: 1250
            }
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexShrink: 0
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6">Extracted Clips</Typography>
              <Typography variant="body2" sx={{ ml: 1, color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                ({extractedClips.length}/60)
              </Typography>
            </Box>
            {extractedClips.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={clearAllClips}
                sx={{ fontSize: '0.75rem', color: '#f44336', borderColor: '#f44336' }}
              >
                Clear All
              </Button>
            )}
          </Box>

          {/* Message about saved clips when there are saved metadata but no current clips */}
          {clipMetadata.length > 0 && extractedClips.length === 0 && (
            <Box sx={{
              bgcolor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid #FFC107',
              borderRadius: '4px',
              p: 1.5,
              mb: 2,
              flexShrink: 0
            }}>
              <Typography variant="body2" sx={{ color: '#FFC107', fontSize: '0.85rem' }}>
                You have {clipMetadata.length} previously saved clips.
                Re-extract these sections from your songs to restore them.
              </Typography>
            </Box>
          )}

          {combinedBlob && (
            <Button
              variant="outlined"
              color="secondary"
              href={URL.createObjectURL(combinedBlob)}
              download="power-hour.wav"
              startIcon={<DownloadIcon />}
              sx={{ mb: 2, width: '100%', color: '#fff', borderColor: '#fff', '&.Mui-disabled': { color: '#fff', borderColor: '#fff', opacity: 0.5 }, flexShrink: 0 }}
            >
              Download Combined WAV
            </Button>
          )}
          {combinedBlob && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenSaveDialog}
              disabled={saveLoading}
              sx={{ mb: 2, width: '100%', flexShrink: 0 }}
            >
              Save Mix Locally
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary" // Or a more appropriate color like primary or success
            startIcon={<SendToMobileIcon />}
            onClick={handleSendToPlaylistsPage}
            disabled={extractedClips.length === 0 || exportLoading}
            sx={{ mt: 1, backgroundColor: theme.palette.success?.main || '#4caf50', '&:hover': { backgroundColor: theme.palette.success?.dark || '#388e3c' }, fontSize: '0.8rem', padding: '6px 12px' }}
          >
            {exportLoading ? <CircularProgress size={20} /> : 'Save Power Hour'}
          </Button>
          {saveError && (
            <Snackbar
              open={!!saveError}
              autoHideDuration={6000}
              onClose={() => setSaveError(null)}
              message={saveError}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
          )}
          {/* Export success/error snackbars */}
          <Snackbar
            open={!!exportSuccess}
            autoHideDuration={6000}
            onClose={() => setExportSuccess(null)}
            message={exportSuccess}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
          <Snackbar
            open={!!exportError}
            autoHideDuration={6000}
            onClose={() => setExportError(null)}
            message={exportError}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="clips-droppable">
              {(provided) => (
                <List
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: extractedClips.length > 10 ? 'calc(100vh - 340px)' : 'none',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '8px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: `${theme.palette.primary.main}80`,
                      borderRadius: '8px',
                      '&:hover': {
                        backgroundColor: `${theme.palette.primary.main}CC`,
                      }
                    },
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${theme.palette.primary.main}80 rgba(0,0,0,0.1)`,
                    paddingRight: '4px',
                    mb: 2,
                  }}
                >
                  {extractedClips.map((clip, idx) => (
                    <Draggable key={clip.id} draggableId={clip.id} index={idx}>
                      {(provided, snapshot) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          disablePadding
                          sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: snapshot.isDragging ? 'secondary.dark' : undefined,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            minHeight: '56px',
                            maxHeight: '72px'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ flexGrow: 1, minWidth: 0, position: 'relative' }}>
                              {/* Progress background fill for currently playing clip */}
                              {currentClipIndex === idx && clipDuration > 0 && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${(clipProgress / clipDuration) * 100}%`,
                                    bgcolor: 'rgba(100, 181, 246, 0.4)',
                                    zIndex: 1,
                                    transition: 'width 0.2s linear',
                                    borderRadius: 1,
                                  }}
                                />
                              )}
                              <ListItemButton
                                selected={currentClipIndex === idx}
                                onClick={e => {
                                  if (currentClipIndex === idx && clipHowl) {
                                    // Seek if already playing
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    const x = (e as React.MouseEvent).clientX - rect.left;
                                    const width = rect.width;
                                    const percent = Math.max(0, Math.min(1, x / width));
                                    const newTime = percent * clipDuration;
                                    clipHowl.seek(newTime);
                                    setClipProgress(newTime);
                                  } else {
                                    // Start playback if not currently playing
                                    playClip(idx);
                                  }
                                }}
                                sx={{
                                  cursor: 'pointer',
                                  position: 'relative',
                                  zIndex: 2,
                                  minHeight: '56px',
                                  maxHeight: '72px',
                                  py: 1,
                                  pl: 2,
                                  pr: 1,
                                  borderRadius: 1,
                                  '&.Mui-selected': {
                                    backgroundColor: 'rgba(124, 77, 255, 0.2)'
                                  },
                                  '&:hover': {
                                    backgroundColor: 'rgba(124, 77, 255, 0.1)'
                                  }
                                }}
                                {...provided.dragHandleProps}
                              >
                                <ListItemText
                                  primary={clip.name}
                                  primaryTypographyProps={{
                                    sx: {
                                      color: currentClipIndex === idx ? '#fff' : 'rgba(255, 255, 255, 0.9)',
                                      fontWeight: currentClipIndex === idx ? 700 : 400,
                                      position: 'relative',
                                      zIndex: 2,
                                      fontSize: '0.85rem',
                                      lineHeight: 1.2,
                                      wordBreak: 'break-word',
                                      whiteSpace: 'normal',
                                      textShadow: '0px 1px 1px rgba(0,0,0,0.5)',
                                      display: '-webkit-box',
                                      overflow: 'hidden',
                                      WebkitBoxOrient: 'vertical',
                                      WebkitLineClamp: 2
                                    }
                                  }}
                                />
                              </ListItemButton>
                            </Box>
                            <IconButton edge="end" onClick={() => removeClip(clip.id)} sx={{ ml: 1, zIndex: 3 }}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>

          {/* Show saved metadata when no active clips exist */}
          {extractedClips.length === 0 && clipMetadata.length > 0 && (
            <List sx={{
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              mb: 2,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: `${theme.palette.primary.main}80`,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: `${theme.palette.primary.main}CC`,
                }
              },
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.palette.primary.main}80 rgba(0,0,0,0.1)`,
              paddingRight: '4px'
            }}>
              <Typography variant="subtitle2" sx={{ pl: 2, pb: 1, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400 }}>
                Previously Saved Clips:
              </Typography>
              {clipMetadata.map((meta) => (
                <ListItem
                  key={meta.id}
                  disablePadding
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 1,
                    mb: 1,
                    opacity: 0.7,
                    bgcolor: `${theme.palette.primary.main}20`,
                    minHeight: '56px'
                  }}
                >
                  <ListItemButton disabled sx={{ pl: 2 }}>
                    <ListItemText
                      primary={meta.name}
                      secondary={`${formatTime(meta.start)} - ${formatTime(meta.start + meta.duration)}`}
                      primaryTypographyProps={{
                        sx: {
                          color: 'rgba(255, 255, 255, 0.9)',
                          textShadow: '0px 1px 1px rgba(0,0,0,0.5)',
                          fontSize: '0.85rem',
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2
                        }
                      }}
                      secondaryTypographyProps={{
                        sx: { color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', textShadow: '0px 1px 1px rgba(0,0,0,0.3)' }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          <Box sx={{ mt: 1, textAlign: 'center', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
              ({extractedClips.length}/60)
            </Typography>
          </Box>
          {clipHowl && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mb: 1,
                mt: 1,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: 1
              }}
            >
              <IconButton
                onClick={playPreviousClip}
                disabled={currentClipIndex === null || currentClipIndex === 0}
                size="small"
                sx={{ color: 'white' }}
              >
                <SkipPreviousIcon fontSize="small" />
              </IconButton>

              {clipIsPlaying ? (
                <IconButton
                  onClick={pauseClipPlayback}
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(124, 77, 255, 0.3)',
                    '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.5)' }
                  }}
                >
                  <PauseIcon fontSize="small" />
                </IconButton>
              ) : clipIsPaused ? (
                <IconButton
                  onClick={resumeClipPlayback}
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(124, 77, 255, 0.3)',
                    '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.5)' }
                  }}
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              ) : (
                <IconButton
                  onClick={() => currentClipIndex !== null ? playClip(currentClipIndex) : playClip(0)}
                  disabled={extractedClips.length === 0}
                  size="small"
                  sx={{ color: 'white' }}
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              )}

              <IconButton
                onClick={stopClipPlayback}
                disabled={!clipIsPlaying && !clipIsPaused}
                size="small"
                sx={{ color: 'white' }}
              >
                <StopIcon fontSize="small" />
              </IconButton>

              <IconButton
                onClick={() => playNextClip()}
                disabled={currentClipIndex === null || currentClipIndex === extractedClips.length - 1}
                size="small"
                sx={{ color: 'white' }}
              >
                <SkipNextIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
          <Snackbar
            open={clipLimitWarning}
            autoHideDuration={4000}
            onClose={() => setClipLimitWarning(false)}
            message="You can only have 60 clips in your Power Hour!"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
        </Drawer>
      </div>

      {/* Extraction error snackbar */}
      <Snackbar
        open={!!extractError}
        autoHideDuration={6000}
        onClose={() => setExtractError(null)}
        message={extractError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Conversion Loading Modal */}
      <Modal open={conversionLoading} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ bgcolor: '#222', color: '#fff', p: 4, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="secondary" sx={{ mb: 2 }} />
          <Typography variant="h6">Converting .m4a to .mp3… please wait</Typography>
        </Box>
      </Modal>

      {/* Conversion error snackbar */}
      <Snackbar
        open={!!conversionError}
        autoHideDuration={6000}
        onClose={() => setConversionError(null)}
        message={conversionError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog open={saveDialogOpen} onClose={handleCloseSaveDialog}>
        <DialogTitle>{isEditingMix ? 'Update Mix' : 'Name Your Mix'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mix Name"
            fullWidth
            value={mixName}
            onChange={e => setMixName(e.target.value)}
            disabled={isEditingMix} // Don't allow name changes when editing
          />
          {isEditingMix && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This will update the existing mix "{editMixInfo?.name}".
              The original mix will be replaced with your new version.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>Cancel</Button>
          <Button onClick={handleSaveMix} disabled={saveLoading || (!isEditingMix && !mixName.trim())}>
            {saveLoading ? 'Saving...' : isEditingMix ? 'Update Mix' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Library play error snackbar */}
      <Snackbar
        open={!!libraryPlayError}
        autoHideDuration={6000}
        onClose={() => setLibraryPlayError(null)}
        message={libraryPlayError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Playlist Name Dialog */}
      <Dialog
        open={playlistNameDialogOpen}
        onClose={handlePlaylistNameDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Name Your Playlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Playlist Name"
            type="text"
            fullWidth
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            error={!!playlistNameError}
            helperText={playlistNameError}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePlaylistNameDialogClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmPlaylistName} color="primary" variant="contained">
            Send to Playlist Page
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export { SongUploader };
