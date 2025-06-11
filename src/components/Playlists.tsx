import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Chip,
  Drawer,
  AppBar,
  Toolbar,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { Howl } from 'howler';
import ImageIcon from '@mui/icons-material/Image';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SortIcon from '@mui/icons-material/Sort';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

import { useTheme } from '@mui/material/styles';
import { useAudio } from '../contexts/AudioContext';
import { usePlaylistImages } from '../hooks/usePlaylistImage';
import DrinkingSoundManager from './DrinkingSoundManager';
import YouTubeDrinkingSoundManager from './YouTubeDrinkingSoundManager';
import PlaylistSharingDialog from './PlaylistSharingDialog';
import PlaylistEditDialog from './PlaylistEditDialog';
import {
  CollaborativePlaylistDialog,
  CollaborationInviteDialog,
  CollaboratorsList,
  UserPresenceIndicator,
  CollaborationNotifications,
  PlaylistConversionDialog,
  JoinCollaborativePlaylistDialog
} from './playlist';
import {
  getYouTubePlaylists,
  YouTubePlaylist,
  YouTubeClip,
  saveYouTubePlaylist,
  deleteYouTubePlaylist,
  setRandomThumbnailForPlaylist,
  setCustomImageForPlaylist,
  clearPlaylistThumbnail
} from '../utils/youtubeUtils';
import { getShareCodeForPlaylist, SharedPlaylist } from '../utils/sharedPlaylistUtils';
import { authService } from '../services/authService';
import { firebasePlaylistService } from '../services/firebasePlaylistService';
import { useCollaborationStore, useCollaborativePlaylist } from '../stores/collaborationStore';
import { CollaborativePlaylist } from '../types/collaboration';

import UIPreferencesManager from '../utils/uiPreferences';

interface Clip {
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
}

interface Playlist {
  id: string;
  name: string;
  date: string;
  clips: Clip[];
  drinkingSoundPath?: string;
  imagePath?: string;
}

// Unified playlist interface that can handle both regular, YouTube, and collaborative playlists
interface UnifiedPlaylist {
  id: string;
  name: string;
  date: string;
  clips: (Clip | YouTubeClip)[];
  drinkingSoundPath?: string;
  imagePath?: string;
  type: 'regular' | 'youtube';
  // Collaborative properties
  isCollaborative?: boolean;
  collaborationId?: string;
}

interface PlaylistsProps {
  onPlayMix: (mix: any, playlistName: string) => void;
}

type ViewMode = 'grid' | 'list';

// Helper to format time (seconds to MM:SS)
const formatTime = (secs: number): string => {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${returnedSeconds}`;
};

const Playlists: React.FC<PlaylistsProps> = ({ onPlayMix }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<UnifiedPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistForInfo, setSelectedPlaylistForInfo] = useState<Playlist | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [playlistNameEditing, setPlaylistNameEditing] = useState(false);
  const audio = useAudio();

  // Use the playlist images hook to handle image loading
  const { imageUrls } = usePlaylistImages(playlists);

  // Local UI state only
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Drinking sound manager state
  const [drinkingSoundManagerOpen, setDrinkingSoundManagerOpen] = useState(false);
  const [youtubeDrinkingSoundManagerOpen, setYoutubeDrinkingSoundManagerOpen] = useState(false);
  const [selectedPlaylistForDrinking, setSelectedPlaylistForDrinking] = useState<UnifiedPlaylist | null>(null);

  // Card sizing state - load from preferences
  const uiPreferences = UIPreferencesManager.getInstance();
  const [cardSize, setCardSize] = useState(() => uiPreferences.getPlaylistCardSize());
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState(() => uiPreferences.getPlaylistCardSize());

  // Enhanced playlist management state
  const [enhancedDialogOpen, setEnhancedDialogOpen] = useState(false);
  const [selectedPlaylistForManagement, setSelectedPlaylistForManagement] = useState<UnifiedPlaylist | null>(null);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [playlistTags, setPlaylistTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Playlist sharing state
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  const [playlistToShare, setPlaylistToShare] = useState<UnifiedPlaylist | null>(null);

  // Playlist edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<SharedPlaylist | null>(null);

  // Share code display state
  const [shareCodeCache, setShareCodeCache] = useState<Record<string, string | null>>({});

  // Collaborative playlist state
  const [collaborativeDialogOpen, setCollaborativeDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCollaborativePlaylist, setSelectedCollaborativePlaylist] = useState<CollaborativePlaylist | null>(null);

  // Conversion dialog state
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [playlistToConvert, setPlaylistToConvert] = useState<UnifiedPlaylist | null>(null);

  // Join dialog state
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Collaboration store
  const collaborationStore = useCollaborationStore();
  const { activeCollaborations, connectionStatus } = collaborationStore;

  // --- Start of useCallback wrapped functions ---

  const handleStop = useCallback(() => {
    console.log('[PH] handleStop called');
    audio.stopPlaylist();
  }, [audio]);

  // Collaborative playlist handlers
  const handleCreateCollaborativePlaylist = () => {
    setCollaborativeDialogOpen(true);
  };

  const handleInviteToCollaboration = (playlist: CollaborativePlaylist) => {
    setSelectedCollaborativePlaylist(playlist);
    setInviteDialogOpen(true);
  };

  const handleCollaborativeDialogClose = () => {
    setCollaborativeDialogOpen(false);
  };

  const handleInviteDialogClose = () => {
    setInviteDialogOpen(false);
    setSelectedCollaborativePlaylist(null);
  };

  // Conversion handlers
  const handleConvertToCollaborative = (playlist: UnifiedPlaylist) => {
    setPlaylistToConvert(playlist);
    setConversionDialogOpen(true);
  };

  const handleConversionDialogClose = () => {
    setConversionDialogOpen(false);
    setPlaylistToConvert(null);
  };

  const handleConversionSuccess = (collaborativePlaylistId: string) => {
    setSuccess(`Playlist "${playlistToConvert?.name}" successfully converted to collaborative!`);
    // Reload playlists to show the new collaborative version
    loadPlaylists();
  };

  // Join handlers
  const handleJoinDialogOpen = () => {
    setJoinDialogOpen(true);
  };

  const handleJoinDialogClose = () => {
    setJoinDialogOpen(false);
  };

  const handleJoinSuccess = (playlistId: string) => {
    setSuccess('Successfully joined collaborative playlist!');
    // Reload playlists to show the joined playlist
    loadPlaylists();
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Share code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy share code to clipboard');
    }
  };

  // Function to load share code for a playlist
  const loadShareCode = useCallback(async (playlist: UnifiedPlaylist) => {
    if (shareCodeCache[playlist.id] !== undefined) {
      return shareCodeCache[playlist.id];
    }

    try {
      const shareCode = await getShareCodeForPlaylist(playlist.id, playlist.name);
      setShareCodeCache(prev => ({ ...prev, [playlist.id]: shareCode }));
      return shareCode;
    } catch (error) {
      console.error('Error loading share code:', error);
      setShareCodeCache(prev => ({ ...prev, [playlist.id]: null }));
      return null;
    }
  }, [shareCodeCache]);

  // Audio functions are now handled by AudioContext

  useEffect(() => {
    loadPlaylists();
    // Initialize collaboration store
    collaborationStore.initialize();

    // Cleanup on unmount
    return () => {
      collaborationStore.cleanup();
    };
  }, []); // Initial load

  // --- End of useCallback wrapped functions ---

  // Helper function to check if a clip is a YouTube clip
  const isYouTubeClip = (clip: Clip | YouTubeClip): clip is YouTubeClip => {
    return 'videoId' in clip;
  };

  // Helper function to get clip count display text
  const getClipCountText = (playlist: UnifiedPlaylist): string => {
    const count = playlist.clips.length;

    // Debug logging for playlist clip counts
    console.log(`[Playlist Debug] ${playlist.name} (${playlist.id}): ${count} clips`, {
      type: playlist.type,
      clips: playlist.clips,
      isCollaborative: playlist.isCollaborative
    });

    if (playlist.type === 'youtube') {
      return `${count} video${count !== 1 ? 's' : ''}`;
    }
    return `${count} clip${count !== 1 ? 's' : ''}`;
  };

  // Sorting function
  const sortPlaylists = (playlistsToSort: UnifiedPlaylist[], sortByField: 'name' | 'date', order: 'asc' | 'desc') => {
    return [...playlistsToSort].sort((a, b) => {
      let comparison = 0;

      if (sortByField === 'name') {
        comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortByField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      }

      return order === 'asc' ? comparison : -comparison;
    });
  };

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load regular playlists from file system
      let regularPlaylists: UnifiedPlaylist[] = [];
      if (window.electronAPI) {
        const data = await window.electronAPI.listPlaylists();
        if (Array.isArray(data)) {
          regularPlaylists = data.map((playlist: Playlist) => ({
            ...playlist,
            type: 'regular' as const
          }));
        }
      }

      // Load YouTube playlists from localStorage
      // First, clean up any duplicate clip IDs
      const { cleanupAllPlaylistDuplicateIds } = await import('../utils/youtubeUtils');
      cleanupAllPlaylistDuplicateIds();

      const youtubePlaylistsData = getYouTubePlaylists();
      console.log('🔍 Raw YouTube playlists from localStorage:', youtubePlaylistsData);
      const youtubePlaylists: UnifiedPlaylist[] = youtubePlaylistsData.map((playlist: YouTubePlaylist) => ({
        ...playlist,
        type: 'youtube' as const
      }));
      console.log('🔍 Unified YouTube playlists:', youtubePlaylists);

      // Load collaborative playlists
      console.log('🔍 Active collaborations:', activeCollaborations);
      let collaborativePlaylists: UnifiedPlaylist[] = [];

      try {
        collaborativePlaylists = Object.values(activeCollaborations)
        .filter((playlist): playlist is CollaborativePlaylist => {
          // Filter out null, undefined, or invalid playlist objects
          if (!playlist || typeof playlist !== 'object') {
            console.warn('⚠️ Skipping invalid collaborative playlist:', playlist);
            return false;
          }

          // Check for required properties
          if (!playlist.id || !playlist.name) {
            console.warn('⚠️ Skipping collaborative playlist missing required properties:', playlist);
            return false;
          }

          return true;
        })
        .map((playlist: CollaborativePlaylist) => {
        console.log('🔍 Processing collaborative playlist:', playlist.id, 'clips:', playlist.clips?.length || 0);

        let dateString: string;
        try {
          if (playlist.createdAt instanceof Date) {
            dateString = playlist.createdAt.toISOString();
          } else if (playlist.createdAt && typeof playlist.createdAt === 'object' && 'toDate' in playlist.createdAt) {
            // Firestore Timestamp
            dateString = (playlist.createdAt as any).toDate().toISOString();
          } else if (typeof playlist.createdAt === 'string') {
            dateString = playlist.createdAt;
          } else {
            // Fallback to current date
            console.warn('⚠️ No valid createdAt found for playlist:', playlist.id, 'using current date');
            dateString = new Date().toISOString();
          }
        } catch (error) {
          console.warn('⚠️ Error converting createdAt for playlist:', playlist.id, error);
          dateString = new Date().toISOString();
        }

        try {
          const unifiedPlaylist = {
            id: playlist.id,
            name: playlist.name || 'Untitled Collaborative Playlist',
            date: dateString,
            clips: Array.isArray(playlist.clips) ? playlist.clips : [],
            drinkingSoundPath: playlist.drinkingSoundPath || undefined,
            imagePath: playlist.imagePath || undefined,
            type: (playlist.type as 'regular' | 'youtube') || 'youtube',
            isCollaborative: true,
            collaborationId: playlist.collaborationId || playlist.id
          };

          console.log('🔍 Unified collaborative playlist:', unifiedPlaylist.id, 'clips:', unifiedPlaylist.clips.length);
          return unifiedPlaylist;
        } catch (error) {
          console.error('❌ Error creating unified playlist for:', playlist.id, error);
          // Return a minimal valid playlist to prevent crashes
          return {
            id: playlist.id || `error_${Date.now()}`,
            name: 'Error Loading Playlist',
            date: new Date().toISOString(),
            clips: [],
            type: 'youtube' as const,
            isCollaborative: true,
            collaborationId: playlist.id || `error_${Date.now()}`
          };
        }
      });
      } catch (collaborativeError) {
        console.error('❌ Error processing collaborative playlists:', collaborativeError);
        // Set empty array to prevent crashes
        collaborativePlaylists = [];
      }

      // Combine all types of playlists
      const allPlaylists = [...regularPlaylists, ...youtubePlaylists, ...collaborativePlaylists];

      console.log('📋 Playlist loading summary:', {
        regular: regularPlaylists.length,
        youtube: youtubePlaylists.length,
        collaborative: collaborativePlaylists.length,
        total: allPlaylists.length,
        activeCollaborations: Object.keys(activeCollaborations).length
      });

      // Debug: Log each playlist's clip count and check for duplicate IDs
      allPlaylists.forEach(playlist => {
        const clipIds = playlist.clips.map(c => c.id);
        const duplicateIds = clipIds.filter((id, index) => clipIds.indexOf(id) !== index);

        console.log(`[Playlist Load Debug] ${playlist.name}: ${playlist.clips.length} clips`, {
          id: playlist.id,
          type: playlist.type,
          isCollaborative: playlist.isCollaborative,
          clips: playlist.clips.map(c => ({ id: c.id, name: c.name || c.title })),
          duplicateClipIds: duplicateIds.length > 0 ? duplicateIds : 'None'
        });

        if (duplicateIds.length > 0) {
          console.warn(`⚠️ Playlist "${playlist.name}" has duplicate clip IDs:`, duplicateIds);
        }
      });

      const sortedData = sortPlaylists(allPlaylists, sortBy, sortOrder);
      setPlaylists(sortedData);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to fetch playlists. Ensure the application has permissions to access its data directory.');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting changes
  const handleSortChange = (newSortBy: 'name' | 'date') => {
    if (newSortBy === sortBy) {
      // If clicking the same sort field, toggle the order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different sort field, set it and use default order
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'date' ? 'desc' : 'asc'); // Default: newest first for date, A-Z for name
    }
  };

  // Re-sort playlists when sort criteria changes
  useEffect(() => {
    if (playlists.length > 0) {
      const sortedPlaylists = sortPlaylists(playlists, sortBy, sortOrder);
      setPlaylists(sortedPlaylists);
    }
  }, [sortBy, sortOrder]);

  // Reload playlists when collaborative playlists change
  useEffect(() => {
    loadPlaylists();
  }, [activeCollaborations]);



  // Resize handling functions
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize(cardSize);
    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;

    // Use the average of horizontal and vertical movement for more intuitive resizing
    const delta = (deltaX - deltaY) / 2;
    const newSize = Math.max(180, Math.min(500, resizeStartSize + delta)); // Allow much smaller cards

    setCardSize(newSize);
  }, [isResizing, resizeStartPos, resizeStartSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save the current card size to preferences
    uiPreferences.setPlaylistCardSize(cardSize);
  }, [cardSize, uiPreferences]);

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleCreatePlaylist = () => {
    setPlaylistName('');
    setCurrentPlaylistId(null);
    setNewPlaylistDialog(true);
    setIsEditing(false);
    setPlaylistNameEditing(false);
  };

  const handleEditPlaylist = (playlist: UnifiedPlaylist) => {
    setSelectedPlaylistForManagement(playlist);

    // Initialize state based on playlist type and data
    if (playlist.type === 'youtube') {
      const ytPlaylist = playlist as UnifiedPlaylist & { isPublic?: boolean; description?: string; tags?: string[] };
      setSharingEnabled(ytPlaylist.isPublic || false);
      setPlaylistDescription(ytPlaylist.description || '');
      setPlaylistTags(ytPlaylist.tags || []);
    } else {
      setSharingEnabled(false);
      setPlaylistDescription('');
      setPlaylistTags([]);
    }

    setEnhancedDialogOpen(true);
  };

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) {
      setError('Playlist name is required');
      return;
    }
    try {
      let successFlag = false;
      let message = '';

      if (isEditing && currentPlaylistId) {
        const playlistToUpdate = playlists.find(p => p.id === currentPlaylistId);
        if (!playlistToUpdate) throw new Error('Playlist not found for update');

        if (playlistToUpdate.isCollaborative) {
          // Handle collaborative playlist update
          successFlag = await collaborationStore.updateCollaborativePlaylistMetadata(
            playlistToUpdate.id,
            { name: playlistName.trim() }
          );
          message = successFlag ? `Collaborative playlist "${playlistName}" updated.` : 'Failed to update collaborative playlist.';
        } else if (playlistToUpdate.type === 'youtube') {
          // Handle YouTube playlist update
          const updatedYouTubePlaylist: YouTubePlaylist = {
            id: playlistToUpdate.id,
            name: playlistName.trim(),
            date: playlistToUpdate.date,
            clips: playlistToUpdate.clips as YouTubeClip[],
            drinkingSoundPath: playlistToUpdate.drinkingSoundPath,
            imagePath: playlistToUpdate.imagePath
          };
          saveYouTubePlaylist(updatedYouTubePlaylist);
          successFlag = true;
          message = `YouTube playlist "${playlistName}" updated.`;
        } else {
          // Handle regular playlist update
          if (!window.electronAPI) throw new Error('Electron API not available');
          const updatedPlaylist = { ...playlistToUpdate, name: playlistName.trim() };
          successFlag = await window.electronAPI.savePlaylist(updatedPlaylist);
          message = successFlag ? `Playlist "${playlistName}" updated.` : 'Failed to update playlist.';
        }
      } else {
        // Creating new playlist (always regular type)
        if (!window.electronAPI) throw new Error('Electron API not available');
        const newPlaylist: Playlist = {
          id: `pl_${Date.now()}`,
          name: playlistName.trim(),
          date: new Date().toISOString(),
          clips: [] // New playlists start empty, clips are added via SongUploader or import
        };
        successFlag = await window.electronAPI.savePlaylist(newPlaylist);
        message = successFlag ? `Playlist "${playlistName}" created.` : 'Failed to create playlist.';
      }

      if (successFlag) {
        setSuccess(message);
        loadPlaylists();
        setNewPlaylistDialog(false);
        setIsEditing(false);
        setCurrentPlaylistId(null);
        setPlaylistName('');
        setPlaylistNameEditing(false);
      } else {
        setError(message);
      }
    } catch (err) {
      console.error('Error saving playlist:', err);
      setError(`Failed to save playlist: ${(err as Error).message}`);
    }
  };

  const handleDeletePlaylist = async (playlist: UnifiedPlaylist) => {
    if (!window.confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) return;
    try {
      let successFlag = false;

      if (playlist.isCollaborative) {
        // Handle collaborative playlist deletion
        try {
          const collaborativePlaylist = Object.values(activeCollaborations)
            .filter(p => p && typeof p === 'object' && p.id)
            .find(p => p.id === playlist.id);

          if (collaborativePlaylist) {
            // Check if user is owner or collaborator
            const currentUser = authService.getCurrentUser();
            if (currentUser && collaborativePlaylist.ownerId === currentUser.uid) {
              // Owner can delete the playlist
              successFlag = await collaborationStore.deleteCollaborativePlaylist(playlist.id);
            } else {
              // Collaborator can only leave the playlist
              successFlag = await collaborationStore.leaveCollaboration(playlist.id);
            }
          } else {
            console.warn('⚠️ Collaborative playlist not found in activeCollaborations:', playlist.id);
            // Try to leave anyway
            successFlag = await collaborationStore.leaveCollaboration(playlist.id);
          }
        } catch (collaborativeDeleteError) {
          console.error('❌ Error handling collaborative playlist deletion:', collaborativeDeleteError);
          successFlag = false;
        }
      } else if (playlist.type === 'youtube') {
        // Handle YouTube playlist deletion
        deleteYouTubePlaylist(playlist.id);
        successFlag = true;
      } else {
        // Handle regular playlist deletion
        if (!window.electronAPI) throw new Error('Electron API not available');
        successFlag = await window.electronAPI.deletePlaylist(playlist.id);
      }

      if (successFlag) {
        const action = playlist.isCollaborative &&
          Object.values(activeCollaborations)
            .filter(p => p && typeof p === 'object' && p.id)
            .find(p => p.id === playlist.id)?.ownerId !== authService.getCurrentUser()?.uid
          ? 'left' : 'deleted';
        setSuccess(`Playlist "${playlist.name}" ${action}.`);
        setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
        setNewPlaylistDialog(false);
        setIsEditing(false);
        setCurrentPlaylistId(null);
        setPlaylistName('');
        setPlaylistNameEditing(false);
      } else {
        setError('Failed to delete playlist.');
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError(`Failed to delete playlist: ${(err as Error).message}`);
    }
  };

  const handleExportPlaylist = async (playlist: UnifiedPlaylist) => {
    if (playlist.type === 'youtube') {
      setError('YouTube playlists cannot be exported as regular playlists.');
      return;
    }

    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }
    try {
      setLoading(true);
      const result = await window.electronAPI.exportPlaylist(playlist.id);
      if (result && result.success) {
        setSuccess(`Playlist "${playlist.name}" exported to ${result.path}`);
      } else {
        setError(result.message || 'Failed to export playlist.');
      }
    } catch (err) {
      console.error('Error exporting playlist:', err);
      setError(`Failed to export playlist: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPlaylistAsAudio = async (playlist: UnifiedPlaylist) => {
    if (playlist.type === 'youtube') {
      setError('YouTube playlists cannot be exported as audio files.');
      return;
    }

    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }

    if (!playlist.clips.length) {
      setError('Cannot export empty playlist as audio');
      return;
    }

    if (!playlist.drinkingSoundPath) {
      setError('Playlist needs a drinking sound set before exporting as audio');
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.exportPlaylistAsAudio(playlist.id);
      if (result && result.success) {
        setSuccess(`Playlist "${playlist.name}" exported to audio file: ${result.path}`);
      } else {
        setError(result.message || 'Failed to export playlist as audio.');
      }
    } catch (err) {
      console.error('Error exporting playlist as audio:', err);
      setError(`Failed to export playlist as audio: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }
    try {
      setLoading(true);
      const result = await window.electronAPI.importPlaylist();
      if (result && result.success && result.playlist) {
        setSuccess(`Playlist "${result.playlist.name}" imported successfully.`);
        loadPlaylists(); // Reload to show the new playlist
      } else {
        setError(result.message || 'Failed to import playlist.');
      }
    } catch (err) {
      console.error('Error importing playlist:', err);
      setError(`Failed to import playlist: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPlaylist = async (playlist: UnifiedPlaylist) => {
    console.log(`[PH] handlePlayPlaylist called for: ${playlist.name} (ID: ${playlist.id})`);
    console.log(`[PH] Current playlist before change: ${audio.currentPlaylist?.name} (ID: ${audio.currentPlaylist?.id})`);

    if (playlist.type === 'youtube') {
      // Navigate to the dedicated YouTube Video Player page
      console.log(`[PH] Navigating to YouTube Video Player for playlist: ${playlist.id}`);
      navigate(`/youtube-player/${playlist.id}`);
      return;
    }

    audio.playPlaylist(playlist as Playlist);
    setSidebarOpen(true);
  };





  const handlePlaylistClipsDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination || !audio.currentPlaylist) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      // Create a new playlist with reordered clips
      const updatedPlaylist = { ...audio.currentPlaylist };
      const [movedClip] = updatedPlaylist.clips.splice(source.index, 1);
      updatedPlaylist.clips.splice(destination.index, 0, movedClip);

      // Save the updated playlist
      if (window.electronAPI) {
        await window.electronAPI.savePlaylist(updatedPlaylist);
        setSuccess('Playlist clips reordered successfully.');

        // Reload playlists to reflect changes
        loadPlaylists();
      }
    } catch (err) {
      console.error('Error reordering playlist clips:', err);
      setError(`Failed to save reordered playlist: ${(err as Error).message}`);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handlePlayPause = () => {
    if (audio.playlistPlaying) {
      audio.pausePlaylist();
    } else {
      // If there's a current playlist but no sound is playing, restart from current clip or beginning
      if (audio.currentPlaylist) {
        if (audio.currentClipIndex >= 0) {
          // Resume from current clip if we have one
          audio.resumePlaylist();
        } else {
          // Start from beginning if no current clip
          audio.playPlaylist(audio.currentPlaylist);
        }
      } else {
        // Fallback to resume if no playlist context
        audio.resumePlaylist();
      }
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    audio.setPlaylistVolume(newVolume);
  };

  const handleMuteToggle = () => {
    audio.togglePlaylistMute();
  };



  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(event.target.value);
    audio.seekPlaylist(seekTime);
  };

  // Drag and Drop for playlists
  const onDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const reorderedPlaylists = Array.from(playlists);
    const [removed] = reorderedPlaylists.splice(source.index, 1);
    reorderedPlaylists.splice(destination.index, 0, removed);
    setPlaylists(reorderedPlaylists);

    // Here you might want to save the new order if persistence is needed, e.g., by updating a sortOrder field.
    // For now, it's frontend only reordering.
    // Example: await window.electronAPI.updatePlaylistsOrder(reorderedPlaylists.map(p => p.id));
    setSuccess('Playlist order changed (visual only for now).');
  };

  const handleNextClip = useCallback(() => {
    console.log('[PH] handleNextClip called. Current clip index:', audio.currentClipIndex);
    audio.nextClip();
  }, [audio]);

  const handlePrevClip = useCallback(() => {
    console.log('[PH] handlePrevClip called. Current clip index:', audio.currentClipIndex);
    audio.previousClip();
  }, [audio]);

  // Helper function to get grid columns based on view mode
  const getGridColumns = () => {
    switch (viewMode) {
      case 'list':
        return '1fr';
      case 'grid':
      default:
        return `repeat(auto-fill, minmax(${Math.max(cardSize, 180)}px, 1fr))`;
    }
  };

  // Render function for list view
  const renderListView = () => (
    <Box sx={{ py: 2 }}>
      {playlists.map((playlist) => (
        <Paper
          key={playlist.id}
          elevation={1}
          sx={{
            mb: 2,
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${theme.palette.primary.main}20`,
              borderColor: theme.palette.primary.main,
            },
          }}
          onClick={() => handlePlayPlaylist(playlist)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            {/* Playlist Image */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                overflow: 'hidden',
                mr: 3,
                flexShrink: 0,
                background: imageUrls[playlist.id]
                  ? 'transparent'
                  : `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
              }}
            >
              {imageUrls[playlist.id] ? (
                <Box
                  component="img"
                  src={imageUrls[playlist.id]}
                  alt={playlist.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <QueueMusicIcon sx={{
                    fontSize: 32,
                    color: theme.palette.primary.main,
                    opacity: 0.6,
                  }} />
                </Box>
              )}
            </Box>

            {/* Playlist Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={playlist.name}
              >
                {playlist.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                {new Date(playlist.date).toLocaleDateString()} • {getClipCountText(playlist)}
                {playlist.type === 'youtube' && (
                  <Chip
                    label="YouTube"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                )}
                {playlist.isCollaborative && (
                  <Chip
                    label="Collaborative"
                    size="small"
                    icon={<GroupIcon sx={{ fontSize: 12 }} />}
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {playlist.drinkingSoundPath ? 'Custom drinking sound' : 'Default drinking sound'}
              </Typography>

              {/* User Presence for Collaborative Playlists */}
              {playlist.isCollaborative && (
                <Box sx={{ mt: 1 }}>
                  <UserPresenceIndicator
                    presence={collaborationStore.userPresence[playlist.id] || {}}
                    playlistId={playlist.id}
                    compact={true}
                  />
                </Box>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
              <Tooltip title={playlist.drinkingSoundPath ? "Custom drinking sound set" : "Set drinking sound"}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDrinkingSound(playlist);
                  }}
                  sx={{
                    bgcolor: playlist.drinkingSoundPath ? 'primary.main' : 'action.hover',
                    color: playlist.drinkingSoundPath ? 'white' : 'text.secondary',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <LocalBarIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>


              {playlist.isCollaborative && (
                <Tooltip title="Invite Collaborators">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      const collaborativePlaylist = activeCollaborations[playlist.id];
                      if (collaborativePlaylist) {
                        handleInviteToCollaboration(collaborativePlaylist);
                      }
                    }}
                    sx={{
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: 'secondary.main',
                        color: 'white',
                      },
                    }}
                  >
                    <PersonAddIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="View Details & Edit">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditPlaylist(playlist);
                  }}
                  sx={{
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <InfoIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Play Playlist">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPlaylist(playlist);
                  }}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <PlayArrowIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );

  // Render function for grid view
  const renderGridView = () => {

    return (
      <Box
        className="playlist-grid-container"
        sx={{
          display: 'grid',
          gridTemplateColumns: getGridColumns(),
          gap: { xs: 2, sm: 3, md: 4 },
          justifyContent: 'center',
          py: 2,
          // Ensure the grid doesn't override parent padding
          width: '100%',
          boxSizing: 'border-box',
        }}>
        {playlists.map((playlist) => (
          <Paper
            key={playlist.id}
            elevation={2}
            sx={{
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              width: '100%',
              maxWidth: `${cardSize}px`,
              height: cardSize * 1.1875, // Maintain aspect ratio (380/320 = 1.1875)
              display: 'flex',
              flexDirection: 'column',
              transition: isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              '&:hover': {
                transform: isResizing ? 'none' : 'translateY(-8px)',
                boxShadow: `0 12px 32px ${theme.palette.primary.main}25`,
                borderColor: theme.palette.primary.main,
                '& .playlist-image': {
                  transform: isResizing ? 'none' : 'scale(1.05)',
                },
                '& .playlist-play-overlay': {
                  opacity: isResizing ? 0 : 1,
                },
                '& .playlist-corner-button': {
                  opacity: isResizing ? 0 : 1,
                  visibility: isResizing ? 'hidden' : 'visible',
                },
                '& .resize-handle': {
                  opacity: 1,
                  visibility: 'visible',
                }
              },
            }}
          >
            {/* Resize Handle */}
            <Box
              className="resize-handle"
              onMouseDown={handleResizeStart}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 48,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                color: 'text.secondary',
                borderRadius: '0 4px 0 12px',
                cursor: 'nw-resize',
                opacity: 0,
                visibility: 'hidden',
                transition: 'all 0.3s ease',
                zIndex: 10,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.1)',
                  color: 'text.primary',
                  transform: 'scale(1.02)',
                }
              }}
              title="Drag to resize all playlist cards"
            >
              <OpenWithIcon sx={{ fontSize: 18 }} />
            </Box>

            {/* Clickable Image Area */}
            <Box
              sx={{
                width: '100%',
                height: cardSize * 0.9375, // Maintain proportion (300/320 = 0.9375)
                position: 'relative',
                overflow: 'hidden',
                background: imageUrls[playlist.id]
                  ? 'transparent'
                  : `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
              }}
              onClick={() => handlePlayPlaylist(playlist)}
            >
              {imageUrls[playlist.id] ? (
                <Box
                  className="playlist-image"
                  component="img"
                  src={imageUrls[playlist.id]}
                  alt={playlist.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transition: 'transform 0.3s ease',
                  }}
                />
              ) : (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}>
                  <QueueMusicIcon sx={{
                    fontSize: 72,
                    color: theme.palette.primary.main,
                    opacity: 0.6,
                  }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {getClipCountText(playlist)}
                  </Typography>
                </Box>
              )}

              {/* Play Overlay - Only shown on hover */}
              <Box
                className="playlist-play-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPlaylist(playlist);
                  }}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    color: theme.palette.primary.main,
                    width: 72,
                    height: 72,
                    '&:hover': {
                      bgcolor: 'white',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                    boxShadow: 4,
                  }}
                >
                  <PlayArrowIcon sx={{ fontSize: 36 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Playlist Info - Centered */}
            <Box
              className="playlist-info"
              sx={{
                position: 'relative',
                p: cardSize < 200 ? 1 : 2, // Reduce padding for very small cards
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                // Remove fixed minHeight to allow natural content flow
                flex: 1, // Allow the info section to grow/shrink as needed
              }}
            >
              {/* Centered Information */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    // Responsive font size based on card size
                    fontSize: cardSize < 200 ? '0.7rem' : cardSize < 250 ? '0.8rem' : cardSize < 300 ? '0.9rem' : '1rem',
                    lineHeight: 1.2,
                    mb: 0,
                    // Remove all truncation - let text wrap naturally
                    maxWidth: '100%',
                    // Add word-break for very long words
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    // Allow text to wrap naturally without any line limits
                    whiteSpace: 'normal',
                    textAlign: 'center',
                  }}
                  title={playlist.name}
                >
                  {playlist.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {playlist.type === 'youtube' && (
                    <Chip
                      label="YouTube"
                      size="small"
                      sx={{
                        height: cardSize < 250 ? 16 : 20,
                        fontSize: cardSize < 250 ? '0.6rem' : '0.7rem',
                        backgroundColor: '#FF0000',
                        color: 'white',
                        '& .MuiChip-label': {
                          px: cardSize < 250 ? 0.5 : 1
                        }
                      }}
                    />
                  )}
                  {playlist.isCollaborative && (
                    <Chip
                      label="Collaborative"
                      size="small"
                      icon={<GroupIcon sx={{ fontSize: cardSize < 250 ? 10 : 12 }} />}
                      sx={{
                        height: cardSize < 250 ? 16 : 20,
                        fontSize: cardSize < 250 ? '0.6rem' : '0.7rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        '& .MuiChip-label': {
                          px: cardSize < 250 ? 0.5 : 1
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: cardSize < 250 ? '0.7rem' : '0.8rem',
                  mb: 0.25,
                  whiteSpace: 'nowrap', // Keep date on one line
                }}
              >
                {new Date(playlist.date).toLocaleDateString()}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: cardSize < 250 ? '0.7rem' : '0.8rem',
                  whiteSpace: 'nowrap', // Keep clip count on one line
                }}
              >
                {getClipCountText(playlist)}
              </Typography>

              {/* User Presence for Collaborative Playlists */}
              {playlist.isCollaborative && (
                <Box sx={{ mt: 1 }}>
                  <UserPresenceIndicator
                    presence={collaborationStore.userPresence[playlist.id] || {}}
                    playlistId={playlist.id}
                    compact={true}
                  />
                </Box>
              )}

              {/* Bottom Left - Drinking Sound Button */}
              <IconButton
                className="playlist-corner-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetDrinkingSound(playlist);
                }}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  bgcolor: playlist.drinkingSoundPath ? 'primary.main' : 'rgba(0, 0, 0, 0.04)',
                  color: playlist.drinkingSoundPath ? 'white' : 'text.secondary',
                  width: 64,
                  height: 48,
                  borderRadius: '0 16px 0 0',
                  opacity: 0,
                  visibility: 'hidden',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.3s ease',
                  boxShadow: 2,
                }}
                title={playlist.drinkingSoundPath ? "Custom drinking sound set" : "Set drinking sound"}
              >
                <LocalBarIcon sx={{ fontSize: 22 }} />
              </IconButton>



              {/* Bottom Right - View Details Button */}
              <IconButton
                className="playlist-corner-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPlaylist(playlist);
                }}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.secondary',
                  width: 64,
                  height: 48,
                  borderRadius: '16px 0 0 0',
                  opacity: 0,
                  visibility: 'hidden',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.3s ease',
                  boxShadow: 2,
                }}
                title="View Details & Edit"
              >
                <InfoIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  // Add function to set drinking sound for a playlist
  const handleSetDrinkingSound = (playlist: UnifiedPlaylist) => {
    setSelectedPlaylistForDrinking(playlist);

    if (playlist.type === 'youtube') {
      // Use enhanced YouTube drinking sound manager
      setYoutubeDrinkingSoundManagerOpen(true);
    } else {
      // Use regular drinking sound manager
      setDrinkingSoundManagerOpen(true);
    }
  };

  // Handle drinking sound selection from manager
  const handleDrinkingSoundSelected = async (soundPath: string) => {
    if (!selectedPlaylistForDrinking) return;

    try {
      // Update the playlist with the new drinking sound
      const updatedPlaylist = {
        ...selectedPlaylistForDrinking,
        drinkingSoundPath: soundPath
      };

      if (selectedPlaylistForDrinking.type === 'youtube') {
        // Handle YouTube playlist
        const { saveYouTubePlaylist } = await import('../utils/youtubeUtils');
        const saved = await saveYouTubePlaylist(updatedPlaylist);
        if (saved) {
          setSuccess(`Drinking sound updated for YouTube playlist "${selectedPlaylistForDrinking.name}"`);
          loadPlaylists(); // Reload to show updated info
        } else {
          setError('Failed to update drinking sound for YouTube playlist');
        }
      } else {
        // Handle regular playlist
        if (!window.electronAPI) throw new Error('Electron API not available');

        const saved = await window.electronAPI.savePlaylist(updatedPlaylist);
        if (saved) {
          setSuccess(`Drinking sound updated for "${selectedPlaylistForDrinking.name}"`);
          loadPlaylists(); // Reload to show updated info

          // If this is the currently playing playlist, the AudioContext will handle the update
        } else {
          setError('Failed to update drinking sound');
        }
      }
    } catch (err) {
      console.error('Error setting drinking sound:', err);
      setError(`Error setting drinking sound: ${(err as Error).message}`);
    }

    setSelectedPlaylistForDrinking(null);
  };

  // Handle drinking sound manager close
  const handleDrinkingSoundManagerClose = () => {
    setDrinkingSoundManagerOpen(false);
    setSelectedPlaylistForDrinking(null);
  };

  const handleYoutubeDrinkingSoundManagerClose = () => {
    setYoutubeDrinkingSoundManagerOpen(false);
    setSelectedPlaylistForDrinking(null);
  };

  // Add function to set playlist image
  const handleSetPlaylistImage = async (playlist: Playlist) => {
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      const result = await window.electronAPI.selectPlaylistImage();

      if (result && result.success && result.path) {
        const imagePath = result.path;

        const updatedPlaylist = {
          ...playlist,
          imagePath: imagePath
        };

        const saved = await window.electronAPI.savePlaylist(updatedPlaylist);
        if (saved) {
          setSuccess(`Playlist image updated for "${playlist.name}"`);
          loadPlaylists();

          // If this is the currently playing playlist, the AudioContext will handle the update
        } else {
          setError('Failed to update playlist image');
        }
      }
    } catch (err) {
      console.error('Error setting playlist image:', err);
      setError(`Error setting playlist image: ${(err as Error).message}`);
    }
  };

  // Enhanced Playlist Management Functions
  const handleSetCustomImageInDialog = async () => {
    if (!selectedPlaylistForManagement || selectedPlaylistForManagement.type !== 'youtube') return;

    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      const result = await window.electronAPI.selectPlaylistImage();

      if (result && result.success && result.path) {
        const updatedPlaylist = setCustomImageForPlaylist(selectedPlaylistForManagement.id, result.path);
        if (updatedPlaylist) {
          setSuccess(`Custom image set for "${selectedPlaylistForManagement.name}"`);
          loadPlaylists();
        } else {
          setError('Failed to set custom image');
        }
      }
    } catch (err) {
      console.error('Error setting custom image:', err);
      setError(`Error setting custom image: ${(err as Error).message}`);
    }
  };

  const handleSetRandomThumbnailInDialog = () => {
    if (!selectedPlaylistForManagement || selectedPlaylistForManagement.type !== 'youtube') return;

    try {
      const updatedPlaylist = setRandomThumbnailForPlaylist(selectedPlaylistForManagement.id);
      if (updatedPlaylist) {
        setSuccess(`Random thumbnail set for "${selectedPlaylistForManagement.name}"`);
        loadPlaylists();
      } else {
        setError('Failed to set random thumbnail. Make sure the playlist has videos with thumbnails.');
      }
    } catch (err) {
      console.error('Error setting random thumbnail:', err);
      setError(`Error setting random thumbnail: ${(err as Error).message}`);
    }
  };

  const handleClearThumbnailInDialog = () => {
    if (!selectedPlaylistForManagement || selectedPlaylistForManagement.type !== 'youtube') return;

    try {
      const updatedPlaylist = clearPlaylistThumbnail(selectedPlaylistForManagement.id);
      if (updatedPlaylist) {
        setSuccess(`Thumbnail cleared for "${selectedPlaylistForManagement.name}"`);
        loadPlaylists();
      } else {
        setError('Failed to clear thumbnail');
      }
    } catch (err) {
      console.error('Error clearing thumbnail:', err);
      setError(`Error clearing thumbnail: ${(err as Error).message}`);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !playlistTags.includes(newTag.trim())) {
      setPlaylistTags([...playlistTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPlaylistTags(playlistTags.filter(tag => tag !== tagToRemove));
  };

  const handleEditClip = (playlist: UnifiedPlaylist, clipIndex: number) => {
    if (playlist.type !== 'youtube') return;

    // Store the playlist and clip context for the YouTube page
    const editContext = {
      playlistId: playlist.id,
      clipIndex: clipIndex,
      timestamp: Date.now()
    };

    localStorage.setItem('youtube_edit_context', JSON.stringify(editContext));

    // Navigate to YouTube page
    navigate('/youtube');
  };

  const handleSharePlaylist = async (playlist: UnifiedPlaylist) => {
    if (playlist.type !== 'youtube') {
      setError('Only YouTube playlists can be shared to the community');
      return;
    }

    // Check if this playlist is already shared
    try {
      // Auto sign-in if Firebase is available and user is not authenticated
      if (!authService.isAuthenticated()) {
        await authService.autoSignIn();
      }

      if (authService.isAuthenticated()) {
        const existingShared = await firebasePlaylistService.getSharedVersionOfPlaylist(playlist.id);

        if (existingShared) {
          // Playlist is already shared, open edit dialog
          setPlaylistToEdit(existingShared);
          setEditDialogOpen(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for existing shared version:', error);
      // Continue with sharing flow if check fails
    }

    // Playlist is not shared yet, open sharing dialog
    setPlaylistToShare(playlist);
    setSharingDialogOpen(true);
  };

  const handleSharingSuccess = (sharedPlaylist: any) => {
    setSuccess(`Playlist "${sharedPlaylist.name}" shared successfully! Share code: ${sharedPlaylist.shareCode}`);
    setSharingDialogOpen(false);
    setPlaylistToShare(null);

    // Notify other components that a playlist was shared
    window.dispatchEvent(new CustomEvent('playlistShared', { detail: sharedPlaylist }));
  };

  const handleSharingClose = () => {
    setSharingDialogOpen(false);
    setPlaylistToShare(null);
  };

  const handleEditSuccess = (updatedPlaylist: SharedPlaylist) => {
    setSuccess(`Playlist "${updatedPlaylist.name}" updated successfully!`);
    setEditDialogOpen(false);
    setPlaylistToEdit(null);

    // Notify other components that a playlist was updated
    window.dispatchEvent(new CustomEvent('playlistShared', { detail: updatedPlaylist }));
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setPlaylistToEdit(null);
  };

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      bgcolor: 'background.default',
      transition: 'margin-right 0.3s ease',
      marginRight: sidebarOpen && audio.currentPlaylist ? '320px' : 0,
    }}>
      {/* Main Content Area with Integrated Controls */}
      <Box
        className="playlists-main-content"
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: 3,
          pb: 8,
          maxWidth: '100%',
          mx: 'auto',
        }}>

        {/* Integrated Controls Row */}
        <Box sx={{
          maxWidth: 1400,
          mx: 'auto',
          mb: 3,
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}>
            {/* Left side - Action Buttons */}
            <Box sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CreateNewFolderIcon />}
                onClick={handleCreatePlaylist}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.75,
                  fontWeight: 600,
                  boxShadow: 2,
                  fontSize: '0.875rem',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Create Playlist
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<GroupIcon />}
                onClick={handleCreateCollaborativePlaylist}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.75,
                  fontWeight: 600,
                  boxShadow: 2,
                  fontSize: '0.875rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-1px)',
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Collaborate
              </Button>
              <Button
                variant="outlined"
                startIcon={<VpnKeyIcon />}
                onClick={handleJoinDialogOpen}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.75,
                  fontWeight: 600,
                  borderWidth: 2,
                  fontSize: '0.875rem',
                  color: '#4CAF50',
                  borderColor: '#4CAF50',
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-1px)',
                    bgcolor: '#4CAF50',
                    color: 'white',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Join with Code
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FileUploadIcon />}
                onClick={handleImportPlaylist}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.75,
                  fontWeight: 600,
                  borderWidth: 2,
                  fontSize: '0.875rem',
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Import Playlist
              </Button>
            </Box>

            {/* Center - Title and Description */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              flex: 1,
              mx: 3,
            }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.25,
                  lineHeight: 1.2,
                }}
              >
                Playlists
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Manage and play your Power Hour collections
              </Typography>
            </Box>

            {/* Right side controls */}
            <Box sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {/* View Mode Controls */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                p: 0.25,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}>
                <Tooltip title="Grid View">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('grid')}
                    sx={{
                      bgcolor: viewMode === 'grid' ? 'primary.main' : 'transparent',
                      color: viewMode === 'grid' ? 'white' : 'text.secondary',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: viewMode === 'grid' ? 'primary.dark' : 'action.hover',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <GridViewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="List View">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('list')}
                    sx={{
                      bgcolor: viewMode === 'list' ? 'primary.main' : 'transparent',
                      color: viewMode === 'list' ? 'white' : 'text.secondary',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: viewMode === 'list' ? 'primary.dark' : 'action.hover',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ViewListIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Sorting Controls */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                p: 0.5,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}>
                <SortIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Button
                  variant={sortBy === 'name' ? 'contained' : 'text'}
                  size="small"
                  onClick={() => handleSortChange('name')}
                  endIcon={
                    sortBy === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 12 }} /> : <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                    ) : null
                  }
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: 1,
                    textTransform: 'none',
                  }}
                >
                  Name
                </Button>
                <Button
                  variant={sortBy === 'date' ? 'contained' : 'text'}
                  size="small"
                  onClick={() => handleSortChange('date')}
                  endIcon={
                    sortBy === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 12 }} /> : <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                    ) : null
                  }
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: 1,
                    textTransform: 'none',
                  }}
                >
                  Date
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
        {loading && playlists.length === 0 ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Loading playlists...
              </Typography>
            </Box>
          </Box>
        ) : !loading && playlists.length === 0 ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}>
            <Paper sx={{
              p: 6,
              textAlign: 'center',
              maxWidth: 400,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}>
              <QueueMusicIcon sx={{
                fontSize: 64,
                color: 'text.secondary',
                mb: 2,
                opacity: 0.5,
              }} />
              <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                No playlists found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
                Create your first Power Hour playlist or import an existing one to get started.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={handleCreatePlaylist}
                  size="small"
                >
                  Create Playlist
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={handleImportPlaylist}
                  size="small"
                >
                  Import
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          viewMode === 'list' ? renderListView() : renderGridView()
        )}
      </Box>
      {/* Edit Playlist Dialog (reuse newPlaylistDialog for editing) */}
      <Dialog
        open={newPlaylistDialog}
        onClose={() => {
          setNewPlaylistDialog(false);
          setIsEditing(false);
          setCurrentPlaylistId(null);
          setPlaylistName('');
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 3,
          pt: 3,
          px: 3,
          bgcolor: 'background.default'
        }}>
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            {isEditing ? 'Edit Playlist' : 'Create New Playlist'}
          </Typography>
          <IconButton
            onClick={() => {
              setNewPlaylistDialog(false);
              setIsEditing(false);
              setCurrentPlaylistId(null);
              setPlaylistName('');
              setPlaylistNameEditing(false);
            }}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {isEditing && currentPlaylistId && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                {/* Playlist Name Display/Edit */}
                <Box sx={{ mb: 3 }}>
                  {playlistNameEditing ? (
                    <TextField
                      fullWidth
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      variant="outlined"
                      autoFocus
                      onBlur={() => setPlaylistNameEditing(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setPlaylistNameEditing(false);
                        }
                        if (e.key === 'Escape') {
                          setPlaylistName(playlists.find(p => p.id === currentPlaylistId)?.name || '');
                          setPlaylistNameEditing(false);
                        }
                      }}
                      InputProps={{
                        sx: {
                          fontSize: '1.5rem',
                          fontWeight: 600,
                        }
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          flex: 1
                        }}
                      >
                        {playlistName}
                      </Typography>
                      <IconButton
                        onClick={() => setPlaylistNameEditing(true)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'action.hover',
                          }
                        }}
                        title="Edit playlist name"
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                {/* Playlist Info Section */}
                {(() => {
                  const playlist = playlists.find(p => p.id === currentPlaylistId);
                  if (!playlist) return null;

                  return (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Playlist Information</Typography>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="body2" color="text.secondary">ID: {playlist.id}</Typography>
                        <Typography variant="body2" color="text.secondary">Date Created: {new Date(playlist.date).toLocaleString()}</Typography>
                        {playlist.drinkingSoundPath && (
                          <Typography variant="body2" color="text.secondary">Drinking Sound: {playlist.drinkingSoundPath}</Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Total Clips: {playlist.clips.length}
                        </Typography>

                        {/* Share Code Section */}
                        {(() => {
                          const [shareCode, setShareCode] = React.useState<string | null>(shareCodeCache[playlist.id] || null);
                          const [loading, setLoading] = React.useState(false);

                          React.useEffect(() => {
                            const loadCode = async () => {
                              if (shareCodeCache[playlist.id] === undefined) {
                                setLoading(true);
                                const code = await loadShareCode(playlist);
                                setShareCode(code);
                                setLoading(false);
                              } else {
                                setShareCode(shareCodeCache[playlist.id]);
                              }
                            };
                            loadCode();
                          }, [playlist.id]);

                          if (loading) {
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <CircularProgress size={16} sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                  Checking for share code...
                                </Typography>
                              </Box>
                            );
                          }

                          if (shareCode) {
                            return (
                              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                                  Import Code
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      px: 2,
                                      py: 1,
                                      bgcolor: 'action.hover',
                                      fontFamily: 'monospace',
                                      fontSize: '1.1rem',
                                      fontWeight: 'bold',
                                      letterSpacing: '0.1em',
                                      flex: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {shareCode}
                                  </Paper>
                                  <Tooltip title="Copy share code">
                                    <IconButton
                                      size="small"
                                      onClick={() => copyToClipboard(shareCode)}
                                      sx={{
                                        color: 'primary.main',
                                        '&:hover': {
                                          bgcolor: 'primary.main',
                                          color: 'white'
                                        }
                                      }}
                                    >
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  Share this code with others so they can import your playlist
                                </Typography>
                              </Box>
                            );
                          }

                          return null;
                        })()}
                      </Paper>
                    </Box>
                  );
                })()}

                {/* Clips List */}
                {(() => {
                  const playlist = playlists.find(p => p.id === currentPlaylistId);
                  if (!playlist || playlist.clips.length === 0) return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
                      This playlist has no clips.
                    </Typography>
                  );

                  return (
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Clips</Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          maxHeight: 250,
                          overflow: 'auto',
                          borderRadius: 2
                        }}
                      >
                        <List dense disablePadding>
                          {playlist.clips.map((clip, index) => {
                            // Ensure unique key for each clip
                            const uniqueKey = clip.id ? `${clip.id}-${index}` : `clip-${index}-${playlist.id}`;

                            return (
                            <ListItem
                              key={uniqueKey}
                              divider={index < playlist.clips.length - 1}
                              sx={{
                                bgcolor: index % 2 === 0 ? `${theme.palette.primary.main}08` : 'transparent',
                                transition: 'background-color 0.2s',
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: `${theme.palette.primary.main}15`
                                }
                              }}
                              onClick={() => {
                                console.log(`[PH] Playing clip from details view at index ${index}: ${clip.name}`);

                                // Check if this is a YouTube playlist
                                if (playlist.type === 'youtube') {
                                  // Navigate to YouTube Video Player page
                                  console.log(`[PH] Navigating to YouTube Video Player for playlist: ${playlist.id} at clip index: ${index}`);
                                  navigate(`/youtube-player/${playlist.id}?clip=${index}`);
                                  return;
                                }

                                // For regular audio playlists, use the audio context
                                // First set the playlist as current if it's not already
                                if (audio.currentPlaylist?.id !== playlist.id) {
                                  audio.playPlaylist(playlist);
                                  // Wait a moment for the playlist to be set, then play the specific clip
                                  setTimeout(() => audio.playClipAtIndex(index), 100);
                                } else {
                                  // If it's already the current playlist, just play the clip
                                  audio.playClipAtIndex(index);
                                }
                                setSidebarOpen(true); // Ensure sidebar is open to show current clip
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2" noWrap title={clip.name}>
                                    {index + 1}. {clip.name}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" noWrap title={`Song: ${clip.songName || 'N/A'} | Duration: ${formatTime(clip.duration)}`}>
                                    {clip.songName || 'N/A'} • {formatTime(clip.duration)}
                                  </Typography>
                                }
                              />
                            </ListItem>
                            );
                          })}
                        </List>
                      </Paper>
                    </Box>
                  );
                })()}
              </Box>

              {/* Actions Panel */}
              <Box sx={{
                width: { xs: '100%', md: 260 },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    const playlist = playlists.find(p => p.id === currentPlaylistId);
                    if (playlist) {
                      // Store playlist in localStorage for editing
                      localStorage.setItem('edit_playlist', JSON.stringify(playlist));
                      // Navigate to create mix page
                      navigate('/');
                      // Close dialog
                      setNewPlaylistDialog(false);
                    }
                  }}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    boxShadow: 2,
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Edit in Mix Creator
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportPlaylist(playlists.find(p => p.id === currentPlaylistId)!)}
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    '&:hover': {
                      bgcolor: 'secondary.dark',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Export Playlist
                </Button>

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  onClick={() => handleExportPlaylistAsAudio(playlists.find(p => p.id === currentPlaylistId)!)}
                  sx={{
                    bgcolor: 'info.main',
                    color: 'info.contrastText',
                    '&:hover': {
                      bgcolor: 'info.dark',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Export as Audio
                </Button>

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LocalBarIcon />}
                  onClick={() => handleSetDrinkingSound(playlists.find(p => p.id === currentPlaylistId)!)}
                  sx={{
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    '&:hover': {
                      bgcolor: 'success.dark',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Manage Drinking Sounds
                </Button>

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<ImageIcon />}
                  onClick={() => handleSetPlaylistImage(playlists.find(p => p.id === currentPlaylistId)!)}
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    '&:hover': {
                      bgcolor: 'warning.dark',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Set Playlist Image
                </Button>
              </Box>
            </Box>
          )}

          {/* Show just the name field for new playlists */}
          {(!isEditing || !currentPlaylistId) && (
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Playlist Name"
              type="text"
              fullWidth
              variant="outlined"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              error={error !== null}
              helperText={error}
              sx={{ mt: 2, mb: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'background.default'
        }}>
          {/* Left side - Delete button (only show when editing) */}
          <Box>
            {isEditing && currentPlaylistId && (
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeletePlaylist(playlists.find(p => p.id === currentPlaylistId)!)}
                sx={{
                  minWidth: 120,
                  fontWeight: 600,
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Delete
              </Button>
            )}
          </Box>

          {/* Right side - Cancel and Save buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={() => {
                setNewPlaylistDialog(false);
                setIsEditing(false);
                setCurrentPlaylistId(null);
                setPlaylistName('');
                setPlaylistNameEditing(false);
              }}
              variant="outlined"
              color="inherit"
              size="large"
              sx={{
                minWidth: 100,
                fontWeight: 500,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'action.hover',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePlaylist}
              variant="contained"
              color="primary"
              size="large"
              sx={{
                minWidth: 100,
                fontWeight: 600,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      {/* Snackbar for success/error messages */}
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>

      {/* Media Player Sidebar */}
      <div style={{ position: 'fixed', top: '80px', right: 0, height: 'calc(100% - 80px)', zIndex: 1250 }}>
        {/* PLAYLIST toggle button */}
        {audio.currentPlaylist && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: sidebarOpen ? '320px' : '20px',
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
              PLAYLIST
            </div>
          </div>
        )}

        {/* Sidebar implementation */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={sidebarOpen && !!audio.currentPlaylist}
          PaperProps={{
            sx: {
              width: 320,
              bgcolor: theme.palette.primary.dark,
              color: '#fff',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
              boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
              zIndex: 1250,
              top: '80px !important',
              height: 'calc(100vh - 80px) !important'
            }
          }}
        >
          {audio.currentPlaylist && (
            <>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
                  {audio.currentPlaylist.name}
                </Typography>
                <IconButton onClick={closeSidebar} sx={{ color: '#fff', p: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>



              {/* Clips List */}
              <Box sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                // Theme-aware scrollbar styles
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }
                },
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)',
                paddingRight: '4px'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#fff' }}>
                  Clips ({audio.currentPlaylist.clips.length})
                </Typography>
                <DragDropContext onDragEnd={handlePlaylistClipsDragEnd}>
                  <Droppable droppableId="playlist-clips">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {audio.currentPlaylist?.clips.map((clip, index) => {
                          // Ensure unique keys for draggable items
                          const uniqueKey = clip.id ? `${clip.id}-${index}` : `clip-${index}-${audio.currentPlaylist?.id}`;
                          const uniqueDraggableId = clip.id ? `${clip.id}-drag-${index}` : `drag-${index}-${audio.currentPlaylist?.id}`;

                          return (
                          <Draggable key={uniqueKey} draggableId={uniqueDraggableId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                style={{
                                  ...provided.draggableProps.style,
                                  marginBottom: '8px',
                                  backgroundColor: index === audio.currentClipIndex
                                    ? 'rgba(0,0,0,0.6)'
                                    : snapshot.isDragging
                                      ? 'rgba(0,0,0,0.5)'
                                      : 'rgba(0,0,0,0.4)',
                                  borderRadius: '4px',
                                  border: index === audio.currentClipIndex ? `1px solid ${theme.palette.secondary.main}` : '1px solid transparent',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                {/* Clickable content area - NOT draggable */}
                                <div
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '4px 0 0 4px'
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log(`[PH] CLICK - Playing clip at index ${index}: ${clip.name}`);
                                    console.log(`[PH] Current playlist:`, audio.currentPlaylist?.name);
                                    console.log(`[PH] Current clip index:`, audio.currentClipIndex);

                                    // Ensure we have a current playlist
                                    if (!audio.currentPlaylist) {
                                      console.error('[PH] No current playlist set!');
                                      return;
                                    }

                                    audio.playClipAtIndex(index);
                                    setSidebarOpen(true);
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {index + 1}. {clip.songName || 'Unknown'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {clip.artist || 'Unknown Artist'} • {formatTime(clip.start)} - {formatTime(clip.start + clip.duration)}
                                  </div>
                                </div>

                                {/* Draggable handle area */}
                                <div
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    marginLeft: '8px',
                                    color: 'rgba(255,255,255,0.5)',
                                    cursor: 'grab',
                                    padding: '8px',
                                    borderRadius: '0 4px 4px 0',
                                    minWidth: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={(e) => {
                                    // Prevent drag handle clicks from triggering play
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <DragHandleIcon fontSize="small" />
                                </div>
                              </div>
                            )}
                          </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </Box>
            </>
          )}
        </Drawer>
      </div>

      {/* Drinking Sound Manager Dialog */}
      <DrinkingSoundManager
        open={drinkingSoundManagerOpen}
        onClose={handleDrinkingSoundManagerClose}
        onSoundSelected={handleDrinkingSoundSelected}
        currentSoundPath={selectedPlaylistForDrinking?.drinkingSoundPath}
        title={`Manage Drinking Sounds - ${selectedPlaylistForDrinking?.name || ''}`}
      />

      {/* YouTube Drinking Sound Manager Dialog */}
      <YouTubeDrinkingSoundManager
        open={youtubeDrinkingSoundManagerOpen}
        onClose={handleYoutubeDrinkingSoundManagerClose}
        onSoundSelected={handleDrinkingSoundSelected}
        currentSoundPath={selectedPlaylistForDrinking?.drinkingSoundPath}
        title={`Manage Drinking Sounds - ${selectedPlaylistForDrinking?.name || ''}`}
      />

      {/* Enhanced Playlist Management Dialog */}
      <Dialog
        open={enhancedDialogOpen}
        onClose={() => {
          setEnhancedDialogOpen(false);
          setSelectedPlaylistForManagement(null);
          setSharingEnabled(false);
          setPlaylistDescription('');
          setPlaylistTags([]);
          setNewTag('');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: selectedPlaylistForManagement?.type === 'youtube' ? '#FF0000' : 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              {selectedPlaylistForManagement?.type === 'youtube' ? (
                <YouTubeIcon sx={{ fontSize: 24 }} />
              ) : (
                <QueueMusicIcon sx={{ fontSize: 24 }} />
              )}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Manage Playlist
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPlaylistForManagement?.name}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => {
              setEnhancedDialogOpen(false);
              setSelectedPlaylistForManagement(null);
              setSharingEnabled(false);
              setPlaylistDescription('');
              setPlaylistTags([]);
              setNewTag('');
            }}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {selectedPlaylistForManagement && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
              {/* Left Column - Playlist Information */}
              <Box sx={{ flex: 1 }}>
                {/* Basic Information */}
                <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon sx={{ color: 'primary.main' }} />
                    Playlist Information
                  </Typography>

                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedPlaylistForManagement.name}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Type
                      </Typography>
                      <Chip
                        label={selectedPlaylistForManagement.type === 'youtube' ? 'YouTube Playlist' : 'Audio Playlist'}
                        size="small"
                        sx={{
                          bgcolor: selectedPlaylistForManagement.type === 'youtube' ? '#FF0000' : 'primary.main',
                          color: 'white'
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Clips
                      </Typography>
                      <Typography variant="body1">
                        {selectedPlaylistForManagement.clips?.length || 0} clips
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedPlaylistForManagement.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Thumbnail Management - YouTube Only */}
                {selectedPlaylistForManagement.type === 'youtube' && (
                  <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon sx={{ color: 'secondary.main' }} />
                      Thumbnail Management
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoLibraryIcon />}
                        onClick={handleSetCustomImageInDialog}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Set Custom Image
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<ShuffleIcon />}
                        onClick={handleSetRandomThumbnailInDialog}
                        disabled={!selectedPlaylistForManagement.clips?.length}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Use Random Video Thumbnail
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        onClick={handleClearThumbnailInDialog}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        Clear Thumbnail
                      </Button>
                    </Box>
                  </Paper>
                )}
              </Box>

              {/* Right Column - Actions & Clips */}
              <Box sx={{ flex: 1 }}>
                {/* Action Buttons */}
                <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon sx={{ color: 'primary.main' }} />
                    Actions
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => {
                        handlePlayPlaylist(selectedPlaylistForManagement);
                        setEnhancedDialogOpen(false);
                      }}
                      fullWidth
                      size="large"
                    >
                      Play Playlist
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        if (selectedPlaylistForManagement.type === 'youtube') {
                          // Store the playlist context for editing and navigate to YouTube page
                          console.log('🔍 Creating edit context for playlist:', selectedPlaylistForManagement);
                          console.log('🔍 Playlist ID being used:', selectedPlaylistForManagement.id);
                          const editContext = {
                            playlistId: selectedPlaylistForManagement.id,
                            clipIndex: 0,
                            timestamp: Date.now()
                          };
                          console.log('🔍 Edit context created:', editContext);
                          localStorage.setItem('youtube_edit_context', JSON.stringify(editContext));
                          navigate('/youtube');
                        } else {
                          // Store playlist in localStorage for editing
                          localStorage.setItem('edit_playlist', JSON.stringify(selectedPlaylistForManagement));
                          navigate('/');
                        }
                        setEnhancedDialogOpen(false);
                      }}
                      fullWidth
                    >
                      Edit Playlist
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<LocalBarIcon />}
                      onClick={() => {
                        handleSetDrinkingSound(selectedPlaylistForManagement);
                        setEnhancedDialogOpen(false);
                      }}
                      fullWidth
                    >
                      Set Drinking Sound
                    </Button>

                    {selectedPlaylistForManagement?.type === 'youtube' && (
                      <Button
                        variant="outlined"
                        startIcon={<ShareIcon />}
                        onClick={() => {
                          handleSharePlaylist(selectedPlaylistForManagement);
                          setEnhancedDialogOpen(false);
                        }}
                        fullWidth
                        sx={{
                          color: 'secondary.main',
                          borderColor: 'secondary.main',
                          '&:hover': {
                            bgcolor: 'secondary.main',
                            color: 'white'
                          }
                        }}
                      >
                        Share to Community
                      </Button>
                    )}

                    {/* Make Collaborative Button for Non-Collaborative Playlists */}
                    {!selectedPlaylistForManagement?.isCollaborative && (
                      <Button
                        variant="outlined"
                        startIcon={<GroupIcon />}
                        onClick={() => {
                          handleConvertToCollaborative(selectedPlaylistForManagement);
                          setEnhancedDialogOpen(false);
                        }}
                        fullWidth
                        sx={{
                          color: '#4CAF50',
                          borderColor: '#4CAF50',
                          '&:hover': {
                            bgcolor: '#4CAF50',
                            color: 'white'
                          }
                        }}
                      >
                        Make Collaborative
                      </Button>
                    )}

                    {/* Collaboration Invite Button for Collaborative Playlists */}
                    {selectedPlaylistForManagement?.isCollaborative && (
                      <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                          const collaborativePlaylist = Object.values(activeCollaborations).find(
                            p => p.id === selectedPlaylistForManagement.id
                          );
                          if (collaborativePlaylist) {
                            handleInviteToCollaboration(collaborativePlaylist);
                            setEnhancedDialogOpen(false);
                          }
                        }}
                        fullWidth
                        sx={{
                          color: 'info.main',
                          borderColor: 'info.main',
                          '&:hover': {
                            bgcolor: 'info.main',
                            color: 'white'
                          }
                        }}
                      >
                        Invite Collaborators
                      </Button>
                    )}

                    {/* Delete Button with confirmation */}
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${selectedPlaylistForManagement.name}"? This action cannot be undone.`)) {
                          handleDeletePlaylist(selectedPlaylistForManagement);
                          setEnhancedDialogOpen(false);
                        }
                      }}
                      fullWidth
                      sx={{
                        color: 'error.main',
                        borderColor: 'error.main',
                        '&:hover': {
                          bgcolor: 'error.main',
                          color: 'white'
                        }
                      }}
                    >
                      Delete Playlist
                    </Button>
                  </Box>
                </Paper>

                {/* Clips List */}
                {selectedPlaylistForManagement.clips && selectedPlaylistForManagement.clips.length > 0 && (
                  <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <QueueMusicIcon sx={{ color: 'primary.main' }} />
                      Clips ({selectedPlaylistForManagement.clips.length})
                    </Typography>

                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {selectedPlaylistForManagement.clips.map((clip, index) => (
                        <Box
                          key={clip.id || index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            mb: 1,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.divider}`
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                              {index + 1}. {clip.name || clip.title || 'Untitled'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {clip.artist || 'Unknown Artist'} • {formatTime(clip.start || 0)} - {formatTime((clip.start || 0) + (clip.duration || 60))}
                            </Typography>
                          </Box>

                          {selectedPlaylistForManagement.type === 'youtube' && (
                            <IconButton
                              size="small"
                              onClick={() => handleEditClip(selectedPlaylistForManagement, index)}
                              sx={{
                                ml: 1,
                                color: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'primary.main',
                                  color: 'white'
                                }
                              }}
                              title="Edit this clip"
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Playlist Sharing Dialog */}
      <PlaylistSharingDialog
        open={sharingDialogOpen}
        onClose={handleSharingClose}
        playlist={playlistToShare?.type === 'youtube' ? playlistToShare as any : null}
        onSuccess={handleSharingSuccess}
      />

      {/* Playlist Edit Dialog */}
      <PlaylistEditDialog
        open={editDialogOpen}
        onClose={handleEditClose}
        playlist={playlistToEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Collaborative Playlist Dialog */}
      <CollaborativePlaylistDialog
        open={collaborativeDialogOpen}
        onClose={handleCollaborativeDialogClose}
      />

      {/* Collaboration Invite Dialog */}
      {selectedCollaborativePlaylist && (
        <CollaborationInviteDialog
          open={inviteDialogOpen}
          onClose={handleInviteDialogClose}
          playlistId={selectedCollaborativePlaylist.id}
          playlistName={selectedCollaborativePlaylist.name}
          inviteCode={selectedCollaborativePlaylist.inviteCode}
        />
      )}

      {/* Playlist Conversion Dialog */}
      {playlistToConvert && (
        <PlaylistConversionDialog
          open={conversionDialogOpen}
          onClose={handleConversionDialogClose}
          playlist={playlistToConvert}
          playlistType={playlistToConvert.type === 'youtube' ? 'youtube' : 'regular'}
          onSuccess={handleConversionSuccess}
        />
      )}

      {/* Join Collaborative Playlist Dialog */}
      <JoinCollaborativePlaylistDialog
        open={joinDialogOpen}
        onClose={handleJoinDialogClose}
        onSuccess={handleJoinSuccess}
      />



    </Box>
  );
};

export default Playlists;