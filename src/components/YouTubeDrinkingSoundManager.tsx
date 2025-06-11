import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  TextField,
  Tabs,
  Tab,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  CircularProgress,
  Tooltip,
  Slider,
  Paper,
  Fade,
  Zoom,
  Collapse,
  Stack,
  Container,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Backdrop,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  ListItemIcon,
} from '@mui/material';
import {
  LocalBar as LocalBarIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Casino as CasinoIcon,
  YouTube as YouTubeIcon,
  AudioFile as AudioFileIcon,
  Timer as TimerIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  Fullscreen as FullscreenIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Pause as PauseIcon,
  TrendingUp as TrendingUpIcon,
  Whatshot as WhatshotIcon,
  MusicNote as MusicNoteIcon,
  SportsEsports as SportsEsportsIcon,
  Movie as MovieIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ViewComfy as ViewComfyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Howl } from 'howler';
import YouTube from 'react-youtube';
import { searchYouTubeEnhanced, YouTubeVideo, YouTubeSearchOptions } from '../utils/youtubeUtils';

interface DrinkingSound {
  id: string;
  name: string;
  type: 'audio' | 'youtube';
  file?: File;
  youtubeId?: string;
  duration?: number; // Custom duration for YouTube clips
  startTime?: number; // Start time for YouTube clips
  path?: string; // For saved sounds
}

interface YouTubeDrinkingSoundManagerProps {
  open: boolean;
  onClose: () => void;
  onSoundSelected: (soundData: string) => void; // JSON string with sound data
  currentSoundPath?: string;
  title?: string;
}

// Enhanced workflow steps
type WorkflowStep = 'search' | 'preview' | 'configure' | 'library';

// Search categories for better organization
interface SearchCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  keywords: string[];
  color: string;
}

const YouTubeDrinkingSoundManager: React.FC<YouTubeDrinkingSoundManagerProps> = ({
  open,
  onClose,
  onSoundSelected,
  currentSoundPath,
  title = "Create Drinking Clips"
}) => {
  const theme = useTheme();

  // Enhanced workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('search');
  const [drinkingSounds, setDrinkingSounds] = useState<DrinkingSound[]>(() => {
    // Load drinking sounds from localStorage on initialization
    try {
      const saved = localStorage.getItem('drinking_clips_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🍻 Loaded drinking clips from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('🍻 Error loading drinking clips from localStorage:', error);
    }
    return [];
  });
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);

  // Search and content type state
  const [contentType, setContentType] = useState<'youtube' | 'audio' | 'library'>('youtube');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Removed YouTube API settings - using only yt-dlp for drinking clips

  // Enhanced video preview and configuration state
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [clipStartTime, setClipStartTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(5);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(50);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Input field states for precise control
  const [startTimeInput, setStartTimeInput] = useState('0:00');
  const [durationInput, setDurationInput] = useState('5');
  const [inputErrors, setInputErrors] = useState({ startTime: '', duration: '' });

  // Video timeline and preview state
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPreviewingClip, setIsPreviewingClip] = useState(false);
  const [previewTimeout, setPreviewTimeout] = useState<NodeJS.Timeout | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showFallbackPlayer, setShowFallbackPlayer] = useState(false);

  // Manual URL input state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // View mode state for drinking clips library
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('compact');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'duration' | 'recent'>('recent');
  const [selectedClipsForDeletion, setSelectedClipsForDeletion] = useState<Set<string>>(new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const previewHowlRef = useRef<Howl | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const previewProgressRef = useRef<NodeJS.Timeout | null>(null);

  // Save drinking sounds to localStorage whenever they change
  React.useEffect(() => {
    try {
      // Filter out File objects for storage since they can't be serialized
      const soundsForStorage = drinkingSounds.map(sound => ({
        id: sound.id,
        name: sound.name,
        type: sound.type,
        youtubeId: sound.youtubeId,
        duration: sound.duration,
        startTime: sound.startTime,
        path: sound.path,
        // Exclude the file property as it can't be serialized
      }));

      localStorage.setItem('drinking_clips_library', JSON.stringify(soundsForStorage));
      console.log('🍻 Saved drinking clips to localStorage:', soundsForStorage);
    } catch (error) {
      console.error('🍻 Error saving drinking clips to localStorage:', error);
    }
  }, [drinkingSounds]);

  // Filter and sort drinking sounds
  const filteredAndSortedSounds = React.useMemo(() => {
    let filtered = drinkingSounds;

    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filtered = filtered.filter(sound =>
        sound.name.toLowerCase().includes(searchTerm) ||
        sound.type.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'duration':
          return (a.duration || 0) - (b.duration || 0);
        case 'recent':
        default:
          // Most recently added first (by array order)
          return drinkingSounds.indexOf(b) - drinkingSounds.indexOf(a);
      }
    });

    return filtered;
  }, [drinkingSounds, searchFilter, sortBy]);

  // Clip selection and deletion helpers
  const toggleClipSelection = useCallback((clipId: string) => {
    setSelectedClipsForDeletion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clipId)) {
        newSet.delete(clipId);
      } else {
        newSet.add(clipId);
      }
      return newSet;
    });
  }, []);

  const selectAllClips = useCallback(() => {
    setSelectedClipsForDeletion(new Set(filteredAndSortedSounds.map(sound => sound.id)));
  }, [filteredAndSortedSounds]);

  const clearSelection = useCallback(() => {
    setSelectedClipsForDeletion(new Set());
  }, []);

  const deleteSelectedClips = useCallback(() => {
    if (selectedClipsForDeletion.size === 0) return;

    setDrinkingSounds(prev =>
      prev.filter(sound => !selectedClipsForDeletion.has(sound.id))
    );
    setSelectedClipsForDeletion(new Set());
    setShowDeleteConfirmation(false);
  }, [selectedClipsForDeletion]);

  // Search categories for better user experience
  const searchCategories: SearchCategory[] = [
    {
      id: 'party',
      name: 'Party Sounds',
      icon: <WhatshotIcon />,
      keywords: ['party', 'celebration', 'cheers', 'crowd'],
      color: theme.palette.primary.main,
    },
    {
      id: 'drinks',
      name: 'Drinking Sounds',
      icon: <LocalBarIcon />,
      keywords: ['beer opening', 'bottle pop', 'clink glasses', 'pour'],
      color: theme.palette.secondary.main,
    },
    {
      id: 'music',
      name: 'Music & Beats',
      icon: <MusicNoteIcon />,
      keywords: ['horn', 'trumpet', 'drum roll', 'fanfare'],
      color: '#f44336',
    },
    {
      id: 'games',
      name: 'Game Sounds',
      icon: <SportsEsportsIcon />,
      keywords: ['game show', 'buzzer', 'ding', 'winner'],
      color: '#ff9800',
    },
    {
      id: 'movies',
      name: 'Movie Clips',
      icon: <MovieIcon />,
      keywords: ['movie quote', 'famous scene', 'dialogue'],
      color: '#9c27b0',
    },
  ];

  // Check yt-dlp availability on component mount
  React.useEffect(() => {
    const checkYtDlpAvailability = async () => {
      try {
        if (window.electronAPI?.ytDlpCheckAvailability) {
          console.log('🔧 Drinking clip manager: Checking yt-dlp availability...');
          const result = await window.electronAPI.ytDlpCheckAvailability();
          console.log('🔧 yt-dlp availability check result:', result);

          if (!result.available) {
            console.warn('⚠️ yt-dlp not available for drinking clip search');
          } else {
            console.log('✅ yt-dlp is available for drinking clip search');
          }
        }
      } catch (error) {
        console.error('Failed to check yt-dlp availability:', error);
      }
    };

    checkYtDlpAvailability();
  }, []);

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Time conversion utilities
  const formatTimeToMMSS = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseTimeFromMMSS = (timeString: string): number => {
    const parts = timeString.split(':');
    if (parts.length === 1) {
      // Just seconds
      const seconds = parseInt(parts[0]) || 0;
      return Math.max(0, seconds);
    } else if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return Math.max(0, minutes * 60 + seconds);
    }
    return 0;
  };

  const validateTimeInput = (timeString: string, maxTime: number = 600): { isValid: boolean; error: string; value: number } => {
    if (!timeString.trim()) {
      return { isValid: false, error: 'Time is required', value: 0 };
    }

    const value = parseTimeFromMMSS(timeString);

    if (isNaN(value) || value < 0) {
      return { isValid: false, error: 'Invalid time format', value: 0 };
    }

    if (value > maxTime) {
      return { isValid: false, error: `Time cannot exceed ${formatTimeToMMSS(maxTime)}`, value: 0 };
    }

    return { isValid: true, error: '', value };
  };

  const validateDurationInput = (durationString: string, startTime: number = 0, maxDuration: number = 30): { isValid: boolean; error: string; value: number } => {
    if (!durationString.trim()) {
      return { isValid: false, error: 'Duration is required', value: 0 };
    }

    let value: number;
    if (durationString.includes(':')) {
      value = parseTimeFromMMSS(durationString);
    } else {
      value = parseInt(durationString) || 0;
    }

    if (isNaN(value) || value <= 0) {
      return { isValid: false, error: 'Duration must be greater than 0', value: 0 };
    }

    if (value > maxDuration) {
      return { isValid: false, error: `Duration cannot exceed ${maxDuration} seconds`, value: 0 };
    }

    if (videoDuration > 0 && (startTime + value) > videoDuration) {
      return { isValid: false, error: 'Clip extends beyond video length', value: 0 };
    }

    return { isValid: true, error: '', value };
  };

  // Simplified YouTube search using only yt-dlp for drinking clips
  const handleYouTubeSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      // Use the search query as-is to avoid filtering out relevant videos
      let optimizedQuery = searchTerm;

      // Only add sound effect keywords for very specific generic terms to avoid over-filtering
      const veryGenericTerms = ['cheers', 'beer', 'party'];
      const isVeryGenericTerm = veryGenericTerms.some(term =>
        optimizedQuery.toLowerCase().trim() === term
      );

      if (isVeryGenericTerm) {
        optimizedQuery += ' sound';
      }

      console.log('🔍 Starting yt-dlp search for drinking clips:', optimizedQuery);

      // Use yt-dlp directly via Electron IPC
      if (!window.electronAPI?.ytDlpSearch) {
        throw new Error('yt-dlp not available: Electron API not found. Please make sure the app is running in Electron.');
      }

      console.log('🚀 Calling yt-dlp search directly...');
      const result = await window.electronAPI.ytDlpSearch(optimizedQuery, 50);

      if (!result.success) {
        throw new Error(result.error || 'yt-dlp search failed');
      }

      console.log('📊 yt-dlp returned:', result.data);

      // Convert yt-dlp results to our format
      const results = Array.isArray(result.data) ? result.data : [result.data];

      const videos = results
        .filter(info => info && (info.id || info.url)) // Filter out invalid entries
        .map((info: any, index: number) => {
          // Handle both flat playlist and detailed results
          let videoId = info.id;

          // Clean up video ID if it contains extra characters
          if (videoId && typeof videoId === 'string') {
            // Remove any non-alphanumeric characters except hyphens and underscores
            videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
            // Ensure it's 11 characters (standard YouTube video ID length)
            if (videoId.length !== 11) {
              console.warn('🎬 Unusual video ID length:', videoId, 'Length:', videoId.length);
            }
          }

          if (!videoId && info.url) {
            // Extract video ID from URL
            const match = info.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
            videoId = match ? match[1] : null;
          }

          // Final fallback - skip this video if we can't get a valid ID
          if (!videoId || videoId.length !== 11) {
            console.warn('🎬 Skipping video with invalid ID:', info);
            return null;
          }

          console.log('🎬 Processing video:', videoId, info.title);

          const title = info.title || info.fulltitle || `Video ${index + 1}`;
          const channelTitle = info.uploader || info.channel || info.uploader_id || 'Unknown Channel';
          const duration = info.duration ? `${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
          const thumbnail = info.thumbnail || info.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

          return {
            id: videoId,
            title,
            channelTitle,
            duration,
            thumbnail,
            description: info.description || '',
            publishedAt: info.upload_date ?
              new Date(info.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString() :
              new Date().toISOString(),
            viewCount: info.view_count?.toString() || '0',
            likeCount: info.like_count?.toString() || '0'
          };
        })
        .filter(video => video !== null); // Remove null entries from invalid video IDs

      setSearchResults(videos);
      console.log(`✅ Found ${videos.length} results for: "${optimizedQuery}" using yt-dlp`);

    } catch (error) {
      console.error('YouTube search failed:', error);

      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('not a valid URL') && errorMessage.includes('ytsearch')) {
        alert('yt-dlp configuration error. This should be fixed automatically. Please try again.');
      } else if (errorMessage.includes('yt-dlp not available')) {
        alert('yt-dlp is not installed.\n\nTo fix this, install yt-dlp:\npip install yt-dlp');
      } else if (errorMessage.includes('Electron API not found')) {
        alert('This feature requires the desktop app. Please use the Electron version of PHat5.');
      } else {
        alert(`YouTube search failed: ${errorMessage}`);
      }

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle category-based search
  const handleCategorySearch = useCallback((category: SearchCategory) => {
    const randomKeyword = category.keywords[Math.floor(Math.random() * category.keywords.length)];
    setSearchQuery(randomKeyword);
    handleYouTubeSearch(randomKeyword);
  }, [handleYouTubeSearch]);

  // Enhanced video selection for preview
  const handleVideoSelect = useCallback((video: YouTubeVideo) => {
    console.log('🎬 Selecting video for preview:', video.id, video.title);
    setSelectedVideo(video);
    setClipStartTime(0);
    setClipDuration(5);
    setStartTimeInput('0:00');
    setDurationInput('5');
    setInputErrors({ startTime: '', duration: '' });
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setIsPreviewingClip(false);
    setPlayerError(null);
    setShowFallbackPlayer(false);
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      setPreviewTimeout(null);
    }
    setCurrentStep('preview');
  }, [previewTimeout]);

  // Handle workflow navigation
  const handleStepChange = useCallback((step: WorkflowStep) => {
    setCurrentStep(step);
  }, []);

  // Go back to search from preview
  const handleBackToSearch = useCallback(() => {
    setSelectedVideo(null);
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      setPreviewTimeout(null);
    }
    setIsPreviewingClip(false);
    setCurrentStep('search');
  }, [previewTimeout]);

  // Handle start time input change
  const handleStartTimeInputChange = useCallback((value: string) => {
    setStartTimeInput(value);
    const validation = validateTimeInput(value, videoDuration || 600);

    if (validation.isValid) {
      setClipStartTime(validation.value);
      setInputErrors(prev => ({ ...prev, startTime: '' }));
    } else {
      setInputErrors(prev => ({ ...prev, startTime: validation.error }));
    }
  }, [videoDuration]);

  // Handle duration input change
  const handleDurationInputChange = useCallback((value: string) => {
    setDurationInput(value);
    const validation = validateDurationInput(value, clipStartTime, 30);

    if (validation.isValid) {
      setClipDuration(validation.value);
      setInputErrors(prev => ({ ...prev, duration: '' }));
    } else {
      setInputErrors(prev => ({ ...prev, duration: validation.error }));
    }
  }, [clipStartTime, videoDuration]);

  // Preview the selected clip segment
  const handlePreviewClip = useCallback(() => {
    if (!youtubePlayerRef.current) return;

    if (isPreviewingClip) {
      // Stop current preview
      youtubePlayerRef.current.pauseVideo();
      setIsPreviewingClip(false);
      if (previewTimeout) {
        clearTimeout(previewTimeout);
        setPreviewTimeout(null);
      }
    } else {
      // Start clip preview
      youtubePlayerRef.current.seekTo(clipStartTime, true);
      youtubePlayerRef.current.playVideo();
      setIsPreviewingClip(true);

      // Set timeout to stop at clip end
      const timeout = setTimeout(() => {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
        }
        setIsPreviewingClip(false);
        setPreviewTimeout(null);
      }, clipDuration * 1000);

      setPreviewTimeout(timeout);
    }
  }, [clipStartTime, clipDuration, isPreviewingClip, previewTimeout]);

  // Handle YouTube player ready event
  const handlePlayerReady = useCallback((event: any) => {
    console.log('🎬 YouTube player ready for video:', selectedVideo?.id);
    youtubePlayerRef.current = event.target;
    event.target.setVolume(previewMuted ? 0 : previewVolume);

    // Get video duration
    const duration = event.target.getDuration();
    console.log('🎬 Video duration:', duration);
    if (duration && duration > 0) {
      setVideoDuration(duration);
    } else {
      // Fallback: try to get duration after a delay
      setTimeout(() => {
        const retryDuration = event.target.getDuration();
        console.log('🎬 Retry video duration:', retryDuration);
        if (retryDuration && retryDuration > 0) {
          setVideoDuration(retryDuration);
        }
      }, 1000);
    }
  }, [previewMuted, previewVolume, selectedVideo?.id]);

  // Handle YouTube player state change
  const handlePlayerStateChange = useCallback((event: any) => {
    setPreviewPlaying(event.data === 1);

    // Update current time periodically when playing
    if (event.data === 1) { // Playing
      const updateTime = () => {
        if (youtubePlayerRef.current && previewPlaying) {
          const currentTime = youtubePlayerRef.current.getCurrentTime();
          setVideoCurrentTime(currentTime);
          setTimeout(updateTime, 100);
        }
      };
      updateTime();
    }
  }, [previewPlaying]);

  // Add configured clip to library
  const handleAddClipToLibrary = useCallback(() => {
    if (!selectedVideo) return;

    const newSound: DrinkingSound = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${selectedVideo.title.substring(0, 30)}... (${clipDuration}s)`,
      type: 'youtube',
      youtubeId: selectedVideo.id,
      duration: clipDuration,
      startTime: clipStartTime,
    };

    setDrinkingSounds(prev => [...prev, newSound]);
    setContentType('library');
    setCurrentStep('library');
  }, [selectedVideo, clipDuration, clipStartTime]);

  // Enhanced audio file handling with improved logging and persistence
  const handleAddAudioFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🍻 handleAddAudioFiles called');

    if (e.target.files) {
      const files = Array.from(e.target.files);
      console.log('🍻 Files selected:', files.map(f => f.name));

      const newSounds: DrinkingSound[] = [];

      for (const file of files) {
        const soundId = Math.random().toString(36).substr(2, 9);
        const soundName = file.name.replace(/\.[^/.]+$/, "");

        try {
          if (window.electronAPI) {
            // For Electron, save the file and store the path
            console.log('🍻 Saving audio file via Electron:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.electronAPI.saveDrinkingSound(arrayBuffer);

            if (result && result.success && result.path) {
              newSounds.push({
                id: soundId,
                name: soundName,
                type: 'audio',
                duration: 5, // Default duration for audio files
                path: result.path, // Store the saved file path
              });
              console.log('🍻 Audio file saved to:', result.path);
            } else {
              console.error('🍻 Failed to save audio file:', result);
            }
          } else {
            // For web, we'll store the file temporarily (note: this won't persist across sessions in web)
            newSounds.push({
              id: soundId,
              name: soundName,
              type: 'audio',
              file: file, // Keep file object for web (temporary)
              duration: 5, // Default duration for audio files
            });
            console.log('🍻 Audio file added for web (temporary):', soundName);
          }
        } catch (error) {
          console.error('🍻 Error processing audio file:', file.name, error);
        }
      }

      if (newSounds.length > 0) {
        console.log('🍻 New sounds created:', newSounds);
        setDrinkingSounds(prev => {
          const updated = [...prev, ...newSounds];
          console.log('🍻 Updated drinkingSounds:', updated);
          return updated;
        });
        setContentType('library');
        setCurrentStep('library');
      }
    } else {
      console.log('🍻 No files selected');
    }
  }, []);

  // Enhanced YouTube URL handling
  const handleAddYouTubeVideo = useCallback(() => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const newSound: DrinkingSound = {
      id: Math.random().toString(36).substr(2, 9),
      name: `YouTube Clip (${clipDuration}s)`,
      type: 'youtube',
      youtubeId: videoId,
      duration: clipDuration,
      startTime: clipStartTime,
    };

    setDrinkingSounds(prev => [...prev, newSound]);
    setYoutubeUrl('');
    setShowUrlInput(false);
    setCurrentStep('library');
  }, [youtubeUrl, clipDuration, clipStartTime]);

  // Remove a drinking sound
  const removeDrinkingSound = useCallback((id: string) => {
    setDrinkingSounds(prev => prev.filter(sound => sound.id !== id));
    if (previewingSound === id) {
      stopPreview();
    }
  }, [previewingSound]);

  // Preview a drinking sound
  const previewSound = useCallback((sound: DrinkingSound) => {
    stopPreview();

    if (sound.type === 'audio') {
      let audioSrc: string;

      if (sound.file) {
        // Use file object (for newly added files or web environment)
        audioSrc = URL.createObjectURL(sound.file);
      } else if (sound.path) {
        // Use saved file path (for persisted files in Electron)
        audioSrc = sound.path;
      } else {
        console.error('🍻 Audio sound has no file or path:', sound);
        return;
      }

      const howl = new Howl({
        src: [audioSrc],
        html5: true,
        volume: 0.7,
        onend: () => {
          setPreviewingSound(null);
          previewHowlRef.current = null;
        },
        onloaderror: (id, error) => {
          console.error('🍻 Error loading drinking sound preview:', error, 'Source:', audioSrc);
          setPreviewingSound(null);
          previewHowlRef.current = null;
          // Show user-friendly message for preview errors
          alert('Unable to preview this audio clip. The file may have been moved or deleted.');
        },
        onload: () => {
          console.log('🍻 Audio preview loaded successfully:', audioSrc);
        }
      });

      previewHowlRef.current = howl;
      setPreviewingSound(sound.id);
      howl.play();

      // Stop after custom duration if specified
      if (sound.duration) {
        setTimeout(() => {
          howl.stop();
          setPreviewingSound(null);
          previewHowlRef.current = null;
        }, sound.duration * 1000);
      }
    } else if (sound.type === 'youtube' && sound.youtubeId) {
      // For YouTube preview, create an embedded iframe preview
      console.log('🍻 Previewing YouTube clip:', sound.youtubeId, 'Start:', sound.startTime, 'Duration:', sound.duration);

      setPreviewingSound(sound.id);

      // Create preview overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.id = 'youtube-preview-overlay';

      // Create video container
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '80%';
      container.style.maxWidth = '800px';
      container.style.height = '450px';
      container.style.backgroundColor = '#000';
      container.style.borderRadius = '12px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';

      // Create close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '10px';
      closeButton.style.right = '10px';
      closeButton.style.background = 'rgba(255, 255, 255, 0.9)';
      closeButton.style.color = '#000';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '50%';
      closeButton.style.width = '40px';
      closeButton.style.height = '40px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.fontSize = '18px';
      closeButton.style.fontWeight = 'bold';
      closeButton.style.zIndex = '10000';
      closeButton.style.display = 'flex';
      closeButton.style.alignItems = 'center';
      closeButton.style.justifyContent = 'center';

      // Create iframe
      const iframe = document.createElement('iframe');
      const startTime = sound.startTime || 0;
      iframe.src = `https://www.youtube.com/embed/${sound.youtubeId}?start=${startTime}&autoplay=1&controls=1&modestbranding=1&rel=0`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;

      // Add info overlay
      const infoOverlay = document.createElement('div');
      infoOverlay.style.position = 'absolute';
      infoOverlay.style.bottom = '10px';
      infoOverlay.style.left = '10px';
      infoOverlay.style.background = 'rgba(0, 0, 0, 0.8)';
      infoOverlay.style.color = 'white';
      infoOverlay.style.padding = '8px 12px';
      infoOverlay.style.borderRadius = '6px';
      infoOverlay.style.fontSize = '14px';
      infoOverlay.style.zIndex = '10000';
      infoOverlay.innerHTML = `Preview: ${sound.name}<br>Duration: ${sound.duration}s | Start: ${formatTimeToMMSS(startTime)}`;

      // Assemble the preview
      container.appendChild(iframe);
      container.appendChild(closeButton);
      container.appendChild(infoOverlay);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Close functionality
      const closePreview = () => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        setPreviewingSound(null);
      };

      closeButton.onclick = closePreview;
      overlay.onclick = (e) => {
        if (e.target === overlay) closePreview();
      };

      // Auto-close after duration (optional)
      setTimeout(() => {
        closePreview();
      }, (sound.duration || 30) * 1000);

    } else {
      console.error('🍻 Unable to preview sound - missing data:', sound);
    }
  }, []);

  // Stop preview
  const stopPreview = useCallback(() => {
    if (previewHowlRef.current) {
      previewHowlRef.current.stop();
      previewHowlRef.current = null;
    }
    setPreviewingSound(null);
  }, []);

  // Handle setting drinking sound directly from library
  const handleSetDrinkingSound = useCallback(async (sound: DrinkingSound) => {
    console.log('🍻 handleSetDrinkingSound called with sound:', sound.id, sound.name);

    if (sound.type === 'audio') {
      console.log('🍻 Processing audio sound:', sound.name);

      let audioPath: string;

      if (sound.path) {
        // Use existing saved path
        audioPath = sound.path;
        console.log('🍻 Using existing saved path:', audioPath);
      } else if (sound.file) {
        // Handle new audio file
        console.log('🍻 Processing new audio file:', sound.file.name);

        if (window.electronAPI) {
          console.log('🍻 Using Electron API to save audio file');
          try {
            const arrayBuffer = await sound.file.arrayBuffer();
            const result = await window.electronAPI.saveDrinkingSound(arrayBuffer);

            console.log('🍻 Electron save result:', result);

            if (result && result.success && result.path) {
              audioPath = result.path;
            } else {
              console.error('🍻 Failed to save audio file via Electron:', result);
              alert('Failed to save audio file. Please try again.');
              return;
            }
          } catch (error) {
            console.error('🍻 Error saving audio file:', error);
            alert('Failed to save audio file. Please try again.');
            return;
          }
        } else {
          console.log('🍻 Using blob URL for web environment');
          // For web, create a blob URL
          audioPath = URL.createObjectURL(sound.file);
        }
      } else {
        console.error('🍻 Audio sound has no file or path:', sound);
        alert('Audio sound has no file or path. Please try again.');
        return;
      }

      const soundData = JSON.stringify({
        type: 'audio',
        path: audioPath,
        name: sound.name
      });
      console.log('🍻 Calling onSoundSelected with audio data:', soundData);
      onSoundSelected(soundData);
    } else if (sound.type === 'youtube') {
      console.log('🍻 Processing YouTube clip:', sound.youtubeId);

      // Handle YouTube video
      const soundData = JSON.stringify({
        type: 'youtube',
        youtubeId: sound.youtubeId,
        duration: sound.duration,
        startTime: sound.startTime,
        name: sound.name
      });
      console.log('🍻 Calling onSoundSelected with YouTube data:', soundData);
      onSoundSelected(soundData);
    } else {
      console.error('🍻 Invalid sound type or missing file:', sound);
      alert('Invalid sound configuration. Please try again.');
      return;
    }

    console.log('🍻 Successfully set drinking sound, closing dialog');
    onClose();
  }, [drinkingSounds, onSoundSelected, onClose]);

  // Select random sound and use it immediately
  const selectRandomSound = useCallback(() => {
    if (drinkingSounds.length === 0) return;
    const randomIndex = Math.floor(Math.random() * drinkingSounds.length);
    const randomSound = drinkingSounds[randomIndex];
    handleSetDrinkingSound(randomSound);
  }, [drinkingSounds, handleSetDrinkingSound]);

  // State for confirmation dialog
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Clear all sounds with confirmation
  const clearAllSounds = useCallback(() => {
    setClearAllDialogOpen(true);
  }, []);

  // Confirm clear all sounds
  const confirmClearAllSounds = useCallback(() => {
    stopPreview();
    setDrinkingSounds([]);
    setClearAllDialogOpen(false);
    setSelectedClipsForDeletion(new Set());
  }, [stopPreview]);



  // Enhanced dialog close handler
  const handleClose = useCallback(() => {
    stopPreview();
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      setPreviewTimeout(null);
    }
    setIsPreviewingClip(false);
    setCurrentStep('search');
    setSelectedVideo(null);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  }, [onClose, previewTimeout]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewTimeout) {
        clearTimeout(previewTimeout);
      }
      if (previewHowlRef.current) {
        previewHowlRef.current.stop();
      }
    };
  }, [previewTimeout]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.palette.divider}`,
          minHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        color: 'white',
        borderRadius: '12px 12px 0 0',
        mb: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalBarIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {/* Enhanced Content Type Selector */}
        <Box sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`
        }}>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant={contentType === 'youtube' ? 'contained' : 'outlined'}
              startIcon={<YouTubeIcon />}
              onClick={() => {
                setContentType('youtube');
                setCurrentStep('search');
              }}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                background: contentType === 'youtube'
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                  : 'transparent',
                '&:hover': {
                  background: contentType === 'youtube'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
                    : `rgba(${theme.palette.primary.main}, 0.1)`,
                }
              }}
            >
              YouTube Videos
            </Button>
            <Button
              variant={contentType === 'audio' ? 'contained' : 'outlined'}
              startIcon={<AudioFileIcon />}
              onClick={() => {
                setContentType('audio');
                setCurrentStep('search');
              }}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                background: contentType === 'audio'
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                  : 'transparent',
                '&:hover': {
                  background: contentType === 'audio'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
                    : `rgba(${theme.palette.primary.main}, 0.1)`,
                }
              }}
            >
              Audio Files
            </Button>
            <Button
              variant={contentType === 'library' ? 'contained' : 'outlined'}
              startIcon={<LocalBarIcon />}
              onClick={() => {
                setContentType('library');
                setCurrentStep('library');
              }}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                background: contentType === 'library'
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                  : 'transparent',
                borderColor: drinkingSounds.length > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
                color: contentType === 'library'
                  ? 'white'
                  : drinkingSounds.length > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
                '&:hover': {
                  background: contentType === 'library'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
                    : `rgba(${theme.palette.primary.main}, 0.1)`,
                  borderColor: theme.palette.primary.main,
                  color: contentType === 'library' ? 'white' : theme.palette.primary.main,
                }
              }}
            >
              {drinkingSounds.length > 0 ? `My Library (${drinkingSounds.length})` : 'My Library (Empty)'}
            </Button>
          </Stack>
        </Box>

        {/* Audio Files Content */}
        {contentType === 'audio' && (
          <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Upload Audio Files
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Add your own audio files to use as drinking sounds
              </Typography>

              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAddAudioFiles}
                style={{ display: 'none' }}
                id="audio-files-input"
              />
              <label htmlFor="audio-files-input">
                <Button
                  component="span"
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                    }
                  }}
                >
                  Choose Audio Files
                </Button>
              </label>
            </Box>
          </Container>
        )}

        {/* My Library Content */}
        {contentType === 'library' && (
          <Container maxWidth="lg" sx={{ py: 3, height: 'calc(80vh - 200px)', overflow: 'auto' }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Your Drinking Clip Library
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your collection of drinking clips and sounds
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => setContentType('youtube')}
                sx={{ borderRadius: 3, px: 3 }}
              >
                Add More Clips
              </Button>
              {drinkingSounds.length > 1 && (
                <Button
                  variant="outlined"
                  startIcon={<CasinoIcon />}
                  onClick={selectRandomSound}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  Random Selection
                </Button>
              )}
              {drinkingSounds.length > 0 && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (selectedClipsForDeletion.size === drinkingSounds.length) {
                      setSelectedClipsForDeletion(new Set());
                    } else {
                      setSelectedClipsForDeletion(new Set(drinkingSounds.map(s => s.id)));
                    }
                  }}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  {selectedClipsForDeletion.size === drinkingSounds.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
              {selectedClipsForDeletion.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={deleteSelectedClips}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  Delete Selected ({selectedClipsForDeletion.size})
                </Button>
              )}
              {drinkingSounds.length > 0 && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ClearIcon />}
                  onClick={clearAllSounds}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  Clear All
                </Button>
              )}
            </Box>

            {/* Library Content */}
            {drinkingSounds.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <LocalBarIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No drinking clips yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Add some clips to get started with your power hour
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setContentType('youtube')}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                    }
                  }}
                >
                  Add Your First Clip
                </Button>
              </Box>
            ) : (
              <Box>
                {/* Library Controls */}
                <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 2 }}>
                    {/* Search and Filter */}
                    <Box sx={{ display: 'flex', gap: 2, flex: 1, maxWidth: { md: '400px' } }}>
                      <TextField
                        size="small"
                        placeholder="Search clips..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        InputProps={{
                          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                        }}
                        sx={{ flex: 1 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Sort by</InputLabel>
                        <Select
                          value={sortBy}
                          label="Sort by"
                          onChange={(e) => setSortBy(e.target.value as any)}
                        >
                          <MenuItem value="recent">Recent</MenuItem>
                          <MenuItem value="name">Name</MenuItem>
                          <MenuItem value="type">Type</MenuItem>
                          <MenuItem value="duration">Duration</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {/* View Mode Toggle */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(e, newMode) => newMode && setViewMode(newMode)}
                        size="small"
                      >
                        <ToggleButton value="compact" aria-label="compact view">
                          <ViewListIcon />
                        </ToggleButton>
                        <ToggleButton value="list" aria-label="list view">
                          <ViewModuleIcon />
                        </ToggleButton>
                        <ToggleButton value="grid" aria-label="grid view">
                          <ViewComfyIcon />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  {/* Selection Controls */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      {filteredAndSortedSounds.length} clips
                      {selectedClipsForDeletion.size > 0 && ` (${selectedClipsForDeletion.size} selected)`}
                    </Typography>

                    {filteredAndSortedSounds.length > 0 && (
                      <>
                        <Button
                          size="small"
                          onClick={selectedClipsForDeletion.size === filteredAndSortedSounds.length ? clearSelection : selectAllClips}
                        >
                          {selectedClipsForDeletion.size === filteredAndSortedSounds.length ? 'Clear All' : 'Select All'}
                        </Button>

                        {selectedClipsForDeletion.size > 0 && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setShowDeleteConfirmation(true)}
                          >
                            Delete Selected ({selectedClipsForDeletion.size})
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                {/* Clips Display */}
                {viewMode === 'compact' ? (
                  // Compact List View
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                    {filteredAndSortedSounds.map((sound, index) => (
                      <React.Fragment key={sound.id}>
                        <ListItem
                          sx={{
                            py: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Checkbox
                              checked={selectedClipsForDeletion.has(sound.id)}
                              onChange={() => toggleClipSelection(sound.id)}
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {sound.type === 'audio' ? (
                              <AudioFileIcon sx={{ color: theme.palette.secondary.main }} />
                            ) : (
                              <YouTubeIcon sx={{ color: '#FF0000' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={sound.name}
                            secondary={`${sound.type === 'youtube' ? 'YouTube' : 'Audio'} • ${sound.duration || '?'}s`}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => previewingSound === sound.id ? stopPreview() : previewSound(sound)}
                              sx={{ color: previewingSound === sound.id ? 'primary.main' : 'text.secondary' }}
                            >
                              {previewingSound === sound.id ? <StopIcon /> : <PlayArrowIcon />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleSetDrinkingSound(sound)}
                              sx={{ color: 'primary.main' }}
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => removeDrinkingSound(sound.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItem>
                        {index < filteredAndSortedSounds.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : viewMode === 'list' ? (
                  // Medium List View
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredAndSortedSounds.map((sound) => (
                      <Card
                        key={sound.id}
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          '&:hover': { boxShadow: 2 }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                              checked={selectedClipsForDeletion.has(sound.id)}
                              onChange={() => toggleClipSelection(sound.id)}
                            />
                            {sound.type === 'audio' ? (
                              <AudioFileIcon sx={{ color: theme.palette.secondary.main, fontSize: 32 }} />
                            ) : (
                              <YouTubeIcon sx={{ color: '#FF0000', fontSize: 32 }} />
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {sound.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {sound.type === 'youtube' ? 'YouTube Clip' : 'Audio File'} • {sound.duration || '?'}s
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                onClick={() => previewingSound === sound.id ? stopPreview() : previewSound(sound)}
                                sx={{ color: previewingSound === sound.id ? 'primary.main' : 'text.secondary' }}
                              >
                                {previewingSound === sound.id ? <StopIcon /> : <PlayArrowIcon />}
                              </IconButton>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleSetDrinkingSound(sound)}
                                sx={{ minWidth: 80 }}
                              >
                                Use
                              </Button>
                              <IconButton
                                onClick={() => removeDrinkingSound(sound.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  // Original Grid View (more compact)
                  <Grid container spacing={2}>
                    {filteredAndSortedSounds.map((sound) => (
                      <Grid item xs={12} sm={6} lg={4} xl={3} key={sound.id}>
                        <Card
                          sx={{
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                          }}
                        >
                          <CardContent sx={{ p: 2, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                              <Checkbox
                                checked={selectedClipsForDeletion.has(sound.id)}
                                onChange={() => toggleClipSelection(sound.id)}
                                size="small"
                              />
                              {sound.type === 'audio' ? (
                                <AudioFileIcon sx={{ color: theme.palette.secondary.main, fontSize: 24 }} />
                              ) : (
                                <YouTubeIcon sx={{ color: '#FF0000', fontSize: 24 }} />
                              )}
                            </Box>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.3 }}>
                              {sound.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                              {sound.type === 'youtube' ? 'YouTube' : 'Audio'} • {sound.duration || '?'}s
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto' }}>
                              <IconButton
                                size="small"
                                onClick={() => previewingSound === sound.id ? stopPreview() : previewSound(sound)}
                                sx={{ color: previewingSound === sound.id ? 'primary.main' : 'text.secondary' }}
                              >
                                {previewingSound === sound.id ? <StopIcon /> : <PlayArrowIcon />}
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => removeDrinkingSound(sound.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                            <Button
                              fullWidth
                              variant="contained"
                              size="small"
                              onClick={() => handleSetDrinkingSound(sound)}
                              sx={{ mt: 1, py: 0.5 }}
                            >
                              Use
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Container>
        )}

        {/* YouTube Videos Content */}
        {contentType === 'youtube' && (
          <Box sx={{ height: 'calc(80vh - 200px)', overflow: 'hidden' }}>
            {/* Search Step */}
            {currentStep === 'search' && (
              <Container maxWidth="lg" sx={{ py: 3, height: '100%', overflow: 'auto' }}>
                {/* Enhanced Search Interface */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
                    Find the Perfect Drinking Clip
                  </Typography>
                  <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
                    Search YouTube for videos or browse by category
                  </Typography>

                  {/* Enhanced Search Bar */}
                  <Paper sx={{
                    p: 3,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.05) 100%)`,
                    border: `1px solid ${theme.palette.divider}`,
                    mb: 4
                  }}>


                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <TextField
                        fullWidth
                        label="Search YouTube"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for any YouTube video or sound..."
                        onKeyPress={(e) => e.key === 'Enter' && handleYouTubeSearch()}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            fontSize: '1.1rem',
                            '&:hover fieldset': {
                              borderColor: theme.palette.primary.main,
                            },
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: theme.palette.primary.main }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleYouTubeSearch()}
                        disabled={!searchQuery.trim() || isSearching}
                        sx={{
                          minWidth: 140,
                          borderRadius: 3,
                          px: 3,
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                          '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                          }
                        }}
                        startIcon={isSearching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </Button>
                    </Box>

                    {/* Manual URL Input Toggle */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Button
                        variant="text"
                        startIcon={<LinkIcon />}
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        sx={{
                          borderRadius: 2,
                          color: theme.palette.text.secondary,
                          '&:hover': { color: theme.palette.primary.main }
                        }}
                      >
                        Or add by YouTube URL
                      </Button>
                    </Box>

                    {/* URL Input Section */}
                    <Collapse in={showUrlInput}>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <TextField
                          fullWidth
                          label="YouTube URL"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            }
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <YouTubeIcon sx={{ color: '#FF0000' }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <Button
                          variant="outlined"
                          onClick={handleAddYouTubeVideo}
                          disabled={!youtubeUrl}
                          sx={{ minWidth: 100, borderRadius: 2 }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Collapse>
                  </Paper>



                  {/* Enhanced Search Results */}
                  {searchResults.length > 0 && (
                    <Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Search Results ({searchResults.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Click on any video to preview and configure your drinking clip
                      </Typography>

                      {/* Modern Search Results Grid */}
                      <Grid container spacing={2}>
                        {searchResults.map((video) => (
                          <Grid item xs={12} sm={6} lg={4} xl={3} key={video.id}>
                            <Card
                              sx={{
                                cursor: 'pointer',
                                borderRadius: 3,
                                border: `2px solid transparent`,
                                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  border: `2px solid ${theme.palette.primary.main}`,
                                  transform: 'translateY(-4px)',
                                  boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                                }
                              }}
                              onClick={() => handleVideoSelect(video)}
                            >
                              <CardMedia
                                component="img"
                                height="140"
                                image={video.thumbnail}
                                alt={video.title}
                                sx={{
                                  objectFit: 'cover',
                                  borderRadius: '12px 12px 0 0',
                                }}
                              />
                              <CardContent sx={{ p: 2 }}>
                                <Tooltip title={video.title}>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      fontSize: '0.85rem',
                                      lineHeight: 1.3,
                                      mb: 1,
                                      minHeight: '2.6em',
                                    }}
                                  >
                                    {video.title}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                  {video.channelTitle}
                                </Typography>
                                {video.duration && (
                                  <Chip
                                    label={video.duration}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
                                      color: theme.palette.primary.main,
                                      fontWeight: 'bold'
                                    }}
                                  />
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* No Results Message */}
                  {searchQuery && searchResults.length === 0 && !isSearching && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <SearchIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No results found for "{searchQuery}"
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try different search terms or keywords
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Container>
            )}



            {/* Preview Step */}
            {currentStep === 'preview' && selectedVideo && (
              <Container maxWidth="lg" sx={{ py: 3, height: '100%', overflow: 'auto' }}>
                {/* Header with Back Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <IconButton
                    onClick={handleBackToSearch}
                    sx={{
                      mr: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}40 0%, ${theme.palette.secondary.main}40 100%)`,
                      }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      Preview & Configure
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Set the perfect start time and duration for your drinking clip
                    </Typography>
                  </Box>
                </Box>

                {/* Enhanced Preview Interface */}
                <Paper sx={{
                  p: 4,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`,
                  border: `1px solid ${theme.palette.divider}`,
                  mb: 4
                }}>
                  <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', lg: 'row' } }}>
                    {/* Video Player */}
                    <Box sx={{ flex: { xs: '1', lg: '2' } }}>
                      <Box sx={{
                        position: 'relative',
                        paddingBottom: '56.25%',
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: 3,
                        boxShadow: `0 8px 32px ${theme.palette.primary.main}20`,
                        background: '#000',
                        border: '2px solid red', // Debug border
                        minHeight: '300px' // Ensure minimum height
                      }}>
                        {/* Debug Info */}
                        <Box sx={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'rgba(0,0,0,0.9)',
                          color: 'white',
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          zIndex: 1000
                        }}>
                          <div>Video ID: {selectedVideo.id}</div>
                          <div>Duration: {videoDuration}s</div>
                          <div>Player Ready: {youtubePlayerRef.current ? 'Yes' : 'No'}</div>
                          <div>Fallback: {showFallbackPlayer ? 'Yes' : 'No'}</div>
                        </Box>

                        {/* Video Container Test */}
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(45deg, #ff0000, #00ff00)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          zIndex: 0
                        }}>
                          VIDEO CONTAINER TEST
                        </Box>

                        {/* YouTube Player or Fallback */}
                        {!showFallbackPlayer ? (
                          <YouTube
                            key={selectedVideo.id} // Force re-render when video changes
                            videoId={selectedVideo.id}
                            opts={{
                              width: '100%',
                              height: '100%',
                              playerVars: {
                                autoplay: 0,
                                controls: 1,
                                modestbranding: 1,
                                rel: 0,
                                enablejsapi: 1,
                                origin: window.location.origin,
                                fs: 1, // Allow fullscreen
                                cc_load_policy: 0, // Hide captions by default
                                iv_load_policy: 3, // Hide annotations
                                start: 0 // Start from beginning
                              }
                            }}
                            onReady={handlePlayerReady}
                            onStateChange={handlePlayerStateChange}
                            onError={(error) => {
                              console.error('YouTube player error:', error);
                              console.log('Error data:', error.data);
                              setPlayerError(`YouTube player error: ${error.data}`);
                              setShowFallbackPlayer(true);
                            }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              borderRadius: '12px',
                              zIndex: 1,
                              backgroundColor: '#000'
                            }}
                          />
                        ) : (
                          /* Fallback iframe player */
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedVideo.id}?controls=1&modestbranding=1&rel=0&fs=1`}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              borderRadius: '12px',
                              border: 'none'
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={selectedVideo.title}
                          />
                        )}

                        {/* Error Message */}
                        {playerError && (
                          <Box sx={{
                            position: 'absolute',
                            top: 50,
                            left: 10,
                            right: 10,
                            background: 'rgba(255,0,0,0.8)',
                            color: 'white',
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            zIndex: 10
                          }}>
                            {playerError} - Using fallback player
                          </Box>
                        )}

                        {/* Player Controls */}
                        <Box sx={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          zIndex: 10,
                          display: 'flex',
                          gap: 1
                        }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => setShowFallbackPlayer(!showFallbackPlayer)}
                            sx={{
                              background: showFallbackPlayer ? 'rgba(0,255,0,0.8)' : 'rgba(0,0,0,0.8)',
                              color: 'white',
                              '&:hover': {
                                background: showFallbackPlayer ? 'rgba(0,255,0,1)' : 'rgba(0,0,0,1)',
                              }
                            }}
                          >
                            {showFallbackPlayer ? 'Use React Player' : 'Use Iframe Player'}
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              window.open(`https://www.youtube.com/watch?v=${selectedVideo.id}`, '_blank');
                            }}
                            sx={{
                              background: 'rgba(255,0,0,0.8)',
                              color: 'white',
                              '&:hover': {
                                background: 'rgba(255,0,0,1)',
                              }
                            }}
                          >
                            Open in YouTube
                          </Button>
                        </Box>

                        {/* Enhanced Video Timeline Overlay */}
                        {videoDuration > 0 && (
                          <Box sx={{
                            position: 'absolute',
                            bottom: 60,
                            left: 20,
                            right: 20,
                            background: 'rgba(0, 0, 0, 0.9)',
                            borderRadius: 3,
                            p: 3,
                            color: 'white',
                            backdropFilter: 'blur(10px)'
                          }}>
                            {/* Time Information */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Current: {formatTimeToMMSS(videoCurrentTime)}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{
                                color: theme.palette.primary.main,
                                background: 'rgba(255,255,255,0.1)',
                                px: 2,
                                py: 0.5,
                                borderRadius: 2
                              }}>
                                Clip: {formatTimeToMMSS(clipStartTime)} → {formatTimeToMMSS(clipStartTime + clipDuration)}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                Total: {formatTimeToMMSS(videoDuration)}
                              </Typography>
                            </Box>

                            {/* Interactive Timeline */}
                            <Box sx={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 2, cursor: 'pointer' }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = clickX / rect.width;
                                const seekTime = percentage * videoDuration;
                                if (youtubePlayerRef.current) {
                                  youtubePlayerRef.current.seekTo(seekTime, true);
                                }
                              }}
                            >
                              {/* Full video progress */}
                              <Box sx={{
                                position: 'absolute',
                                left: 0,
                                width: `${(videoCurrentTime / videoDuration) * 100}%`,
                                height: '100%',
                                background: 'rgba(255,255,255,0.4)',
                                borderRadius: 2,
                              }} />

                              {/* Clip segment highlight */}
                              <Box sx={{
                                position: 'absolute',
                                left: `${(clipStartTime / videoDuration) * 100}%`,
                                width: `${(clipDuration / videoDuration) * 100}%`,
                                height: '100%',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                borderRadius: 2,
                                opacity: 0.9,
                                border: '1px solid rgba(255,255,255,0.3)'
                              }} />

                              {/* Current time indicator */}
                              <Box sx={{
                                position: 'absolute',
                                left: `${(videoCurrentTime / videoDuration) * 100}%`,
                                width: 3,
                                height: '100%',
                                background: 'white',
                                borderRadius: 2,
                                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                                transform: 'translateX(-50%)'
                              }} />

                              {/* Clip start/end markers */}
                              <Box sx={{
                                position: 'absolute',
                                left: `${(clipStartTime / videoDuration) * 100}%`,
                                width: 2,
                                height: '150%',
                                top: '-25%',
                                background: theme.palette.primary.main,
                                borderRadius: 1,
                                transform: 'translateX(-50%)'
                              }} />
                              <Box sx={{
                                position: 'absolute',
                                left: `${((clipStartTime + clipDuration) / videoDuration) * 100}%`,
                                width: 2,
                                height: '150%',
                                top: '-25%',
                                background: theme.palette.secondary.main,
                                borderRadius: 1,
                                transform: 'translateX(-50%)'
                              }} />
                            </Box>

                            {/* Quick Navigation Buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (youtubePlayerRef.current) {
                                    youtubePlayerRef.current.seekTo(Math.max(0, videoCurrentTime - 10), true);
                                  }
                                }}
                                sx={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>-10s</Typography>
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (youtubePlayerRef.current) {
                                    youtubePlayerRef.current.seekTo(clipStartTime, true);
                                  }
                                }}
                                sx={{ color: theme.palette.primary.main, background: 'rgba(255,255,255,0.1)' }}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Start</Typography>
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (youtubePlayerRef.current) {
                                    youtubePlayerRef.current.seekTo(clipStartTime + clipDuration, true);
                                  }
                                }}
                                sx={{ color: theme.palette.secondary.main, background: 'rgba(255,255,255,0.1)' }}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>End</Typography>
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (youtubePlayerRef.current) {
                                    youtubePlayerRef.current.seekTo(Math.min(videoDuration, videoCurrentTime + 10), true);
                                  }
                                }}
                                sx={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>+10s</Typography>
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Enhanced Controls */}
                    <Box sx={{ flex: { xs: '1', lg: '1' } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Video Info */}
                        <Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {selectedVideo.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            {selectedVideo.channelTitle}
                          </Typography>
                          {selectedVideo.duration && (
                            <Chip
                              label={selectedVideo.duration}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
                                color: theme.palette.primary.main,
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                        </Box>

                        {/* Start Time Control */}
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            Start Time
                          </Typography>
                          <TextField
                            fullWidth
                            value={startTimeInput}
                            onChange={(e) => handleStartTimeInputChange(e.target.value)}
                            placeholder="0:00 or 30"
                            error={!!inputErrors.startTime}
                            helperText={inputErrors.startTime || 'Format: MM:SS or seconds (e.g., 1:30 or 90)'}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`,
                                '&:hover fieldset': {
                                  borderColor: theme.palette.primary.main,
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: theme.palette.primary.main,
                                }
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <TimerIcon sx={{ color: theme.palette.primary.main }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Box>

                        {/* Duration Control */}
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            Clip Duration
                          </Typography>
                          <TextField
                            fullWidth
                            value={durationInput}
                            onChange={(e) => handleDurationInputChange(e.target.value)}
                            placeholder="5"
                            error={!!inputErrors.duration}
                            helperText={inputErrors.duration || 'Format: seconds or MM:SS (e.g., 5 or 0:05)'}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`,
                                '&:hover fieldset': {
                                  borderColor: theme.palette.primary.main,
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: theme.palette.primary.main,
                                }
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <TimerIcon sx={{ color: theme.palette.secondary.main }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Box>

                        {/* Enhanced Clip Preview Controls */}
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            Clip Preview & Navigation
                          </Typography>

                          {/* Main Preview Button */}
                          <Button
                            variant="contained"
                            onClick={handlePreviewClip}
                            startIcon={isPreviewingClip ? <StopIcon /> : <PreviewIcon />}
                            fullWidth
                            sx={{
                              mb: 2,
                              py: 1.5,
                              borderRadius: 3,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: isPreviewingClip
                                ? `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`
                                : `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                              '&:hover': {
                                background: isPreviewingClip
                                  ? `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`
                                  : `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
                              }
                            }}
                          >
                            {isPreviewingClip ? 'Stop Preview' : 'Preview Clip'}
                          </Button>

                          {/* Quick Navigation Controls */}
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                if (youtubePlayerRef.current) {
                                  youtubePlayerRef.current.seekTo(clipStartTime, true);
                                }
                              }}
                              startIcon={<SkipNextIcon sx={{ transform: 'rotate(180deg)' }} />}
                              sx={{
                                borderRadius: 2,
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  background: `${theme.palette.primary.main}10`,
                                  borderColor: theme.palette.primary.main,
                                }
                              }}
                            >
                              Go to Start
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                if (youtubePlayerRef.current) {
                                  youtubePlayerRef.current.seekTo(clipStartTime + clipDuration, true);
                                }
                              }}
                              endIcon={<SkipNextIcon />}
                              sx={{
                                borderRadius: 2,
                                borderColor: theme.palette.secondary.main,
                                color: theme.palette.secondary.main,
                                '&:hover': {
                                  background: `${theme.palette.secondary.main}10`,
                                  borderColor: theme.palette.secondary.main,
                                }
                              }}
                            >
                              Go to End
                            </Button>
                          </Box>

                          {/* Playback Speed Control */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                              Playback Speed
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <Button
                                  key={speed}
                                  variant="outlined"
                                  size="small"
                                  onClick={() => {
                                    if (youtubePlayerRef.current) {
                                      youtubePlayerRef.current.setPlaybackRate(speed);
                                    }
                                  }}
                                  sx={{
                                    minWidth: 'auto',
                                    px: 1,
                                    py: 0.5,
                                    fontSize: '0.75rem',
                                    borderRadius: 1,
                                    borderColor: theme.palette.divider,
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                      background: `${theme.palette.primary.main}10`,
                                      borderColor: theme.palette.primary.main,
                                      color: theme.palette.primary.main,
                                    }
                                  }}
                                >
                                  {speed}x
                                </Button>
                              ))}
                            </Box>
                          </Box>

                          {/* Clip Information */}
                          {videoDuration > 0 && (
                            <Box sx={{
                              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255,255,255,0.02) 100%)`,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 2,
                              p: 2
                            }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                <strong>Video Length:</strong> {formatTimeToMMSS(videoDuration)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                <strong>Clip Range:</strong> {formatTimeToMMSS(clipStartTime)} → {formatTimeToMMSS(clipStartTime + clipDuration)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                <strong>Current Time:</strong> {formatTimeToMMSS(videoCurrentTime)}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {/* Volume Control */}
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            Volume: {previewMuted ? 'Muted' : `${previewVolume}%`}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton
                              onClick={() => {
                                setPreviewMuted(!previewMuted);
                                if (youtubePlayerRef.current) {
                                  youtubePlayerRef.current.setVolume(previewMuted ? previewVolume : 0);
                                }
                              }}
                              sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
                                '&:hover': {
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main}40 0%, ${theme.palette.secondary.main}40 100%)`,
                                }
                              }}
                            >
                              {previewMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                            </IconButton>
                            <Slider
                              value={previewVolume}
                              onChange={(_, value) => {
                                setPreviewVolume(value as number);
                                if (youtubePlayerRef.current && !previewMuted) {
                                  youtubePlayerRef.current.setVolume(value as number);
                                }
                              }}
                              min={0}
                              max={100}
                              sx={{
                                flex: 1,
                                '& .MuiSlider-thumb': {
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                  boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
                                },
                                '& .MuiSlider-track': {
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                },
                                '& .MuiSlider-rail': {
                                  background: `${theme.palette.divider}`,
                                }
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={handleAddClipToLibrary}
                            startIcon={<CheckCircleIcon />}
                            sx={{
                              flex: 1,
                              borderRadius: 3,
                              py: 1.5,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                              '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                              }
                            }}
                          >
                            Add to Library
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Container>
            )}


          </Box>
        )}

      </DialogContent>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
          color: 'white',
          borderRadius: '12px 12px 0 0',
          mb: 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ClearIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold">
              Clear All Drinking Clips
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              You are about to permanently delete all {drinkingSounds.length} drinking clips from your library.
            </Typography>
          </Alert>

          <Typography variant="body1" color="text.secondary">
            Are you sure you want to clear all drinking clips? This will remove:
          </Typography>

          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • All YouTube clips ({drinkingSounds.filter(s => s.type === 'youtube').length} clips)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • All audio files ({drinkingSounds.filter(s => s.type === 'audio').length} files)
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setClearAllDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: `${theme.palette.primary.main}10`,
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmClearAllSounds}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold',
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
              }
            }}
          >
            Clear All ({drinkingSounds.length} clips)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Selected Clips Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Delete Selected Clips
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete {selectedClipsForDeletion.size} selected clip{selectedClipsForDeletion.size !== 1 ? 's' : ''}?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setShowDeleteConfirmation(false)}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={deleteSelectedClips}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
          >
            Delete {selectedClipsForDeletion.size} Clip{selectedClipsForDeletion.size !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

    </Dialog>
  );
};

export default YouTubeDrinkingSoundManager;
