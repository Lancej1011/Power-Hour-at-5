import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import { Howl } from 'howler';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  LinearProgress,
  Chip,
  Container,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Popover,
  Slider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  ArrowBack as BackIcon,
  YouTube as YouTubeIcon,
  AccessTime as TimeIcon,
  QueueMusic as PlaylistIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useThemeContext } from '../contexts/ThemeContext';
import { getYouTubePlaylists, YouTubePlaylist, YouTubeClip, formatTime } from '../utils/youtubeUtils';
import { useCollaborationStore } from '../stores/collaborationStore';

const YouTubePlaylistPlayer: React.FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentTheme } = useThemeContext();
  const collaborationStore = useCollaborationStore();
  const [playlist, setPlaylist] = useState<YouTubePlaylist | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialVideoLoaded, setInitialVideoLoaded] = useState(false);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrinkingSoundPlaying, setIsDrinkingSoundPlaying] = useState(false);
  const [volume, setVolume] = useState(100); // YouTube volume is 0-100
  const [isMuted, setIsMuted] = useState(false);
  const [volumeAnchor, setVolumeAnchor] = useState<null | HTMLElement>(null);
  const [isAdvancing, setIsAdvancing] = useState(false); // Prevent duplicate advancement
  const [currentClipAdvanced, setCurrentClipAdvanced] = useState(false); // Track if current clip has already advanced
  const youtubePlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const drinkingSoundRef = useRef<any>(null);
  const drinkingSoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drinkingSoundFallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingDrinkingSoundRef = useRef<boolean>(false);

  // Load playlist data
  useEffect(() => {
    const loadPlaylistData = async () => {
      if (playlistId) {
        try {
          // Load regular YouTube playlists from localStorage
          let playlists = getYouTubePlaylists();
          console.log('Available YouTube playlists:', playlists);
          console.log('Looking for playlist ID:', playlistId);

          // Also check collaborative playlists
          let collaborativePlaylists = [];
          try {
            const activeCollaborations = collaborationStore.activeCollaborations;
            console.log('Active collaborations:', activeCollaborations);

            // Convert collaborative playlists to the expected format
            collaborativePlaylists = Object.values(activeCollaborations)
              .filter((playlist): playlist is any => {
                return playlist && typeof playlist === 'object' && playlist.id && playlist.name;
              })
              .map((playlist: any) => ({
                id: playlist.id,
                name: playlist.name,
                date: playlist.createdAt ?
                  (playlist.createdAt instanceof Date ?
                    playlist.createdAt.toISOString() :
                    (typeof playlist.createdAt === 'object' && 'toDate' in playlist.createdAt ?
                      playlist.createdAt.toDate().toISOString() :
                      playlist.createdAt.toString()
                    )
                  ) : new Date().toISOString(),
                clips: Array.isArray(playlist.clips) ? playlist.clips : [],
                drinkingSoundPath: playlist.drinkingSoundPath,
                imagePath: playlist.imagePath,
                isCollaborative: true
              }));

            console.log('Collaborative playlists:', collaborativePlaylists);
          } catch (collaborationError) {
            console.warn('⚠️ Error loading collaborative playlists:', collaborationError);
            collaborativePlaylists = [];
          }

          // Combine both types of playlists
          const allPlaylists = [...playlists, ...collaborativePlaylists];
          console.log('All available playlists:', allPlaylists);

          // If no playlists exist, create a test playlist for demo purposes
          if (allPlaylists.length === 0) {
            console.log('No playlists found, creating test playlist...');
            const testPlaylist = {
              id: 'test_youtube_playlist_1',
              name: 'Test YouTube Playlist',
              date: new Date().toISOString(),
              clips: [
                {
                  id: 'clip_1',
                  videoId: 'dQw4w9WgXcQ',
                  title: 'Rick Astley - Never Gonna Give You Up',
                  artist: 'Rick Astley',
                  startTime: 0,
                  duration: 60,
                  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/medium.jpg'
                },
                {
                  id: 'clip_2',
                  videoId: 'L_jWHffIx5E',
                  title: 'Smash Mouth - All Star',
                  artist: 'Smash Mouth',
                  startTime: 30,
                  duration: 60,
                  thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/medium.jpg'
                }
              ]
            };

            // Save test playlist to localStorage
            localStorage.setItem('youtube_playlists', JSON.stringify([testPlaylist]));
            allPlaylists.push(testPlaylist);
          }

          const foundPlaylist = allPlaylists.find(p => p.id === playlistId);
          if (foundPlaylist) {
            console.log('Found playlist:', foundPlaylist);
            setPlaylist(foundPlaylist);

            // Check if there's a clip parameter in the URL to start at a specific clip
            const clipParam = searchParams.get('clip');
            if (clipParam) {
              const clipIndex = parseInt(clipParam, 10);
              if (!isNaN(clipIndex) && clipIndex >= 0 && clipIndex < foundPlaylist.clips.length) {
                console.log(`Starting at clip index ${clipIndex} from URL parameter`);
                setCurrentClipIndex(clipIndex);
              } else {
                console.warn(`Invalid clip index ${clipParam} in URL parameter, using default (0)`);
              }
            }
          } else {
            console.log('Playlist not found in localStorage or collaborative playlists, redirecting to playlists page');
            console.log('Searched in:', allPlaylists.map(p => ({ id: p.id, name: p.name })));
            // Playlist not found, redirect back
            navigate('/playlists');
          }
        } catch (error) {
          console.error('Error loading YouTube playlist:', error);
          navigate('/playlists');
        }
      }
    };

    loadPlaylistData();
  }, [playlistId, navigate, searchParams]);

  // YouTube player event handlers
  const onPlayerReady = (event: any) => {
    try {
      youtubePlayerRef.current = event.target;
      setPlayerReady(true);
      console.log('YouTube player ready');

      if (event.target && event.target.getDuration) {
        setDuration(event.target.getDuration());
      }

      // Set initial volume
      if (event.target && event.target.setVolume) {
        event.target.setVolume(volume);
      }
    } catch (error) {
      console.error('Error in onPlayerReady:', error);
    }
  };

  const onPlayerStateChange = useCallback((event: any) => {
    const isCurrentlyPlaying = event.data === 1; // 1 = playing
    const hasEnded = event.data === 0; // 0 = ended
    const isCued = event.data === 5; // 5 = video cued
    const isBuffering = event.data === 3; // 3 = buffering

    console.log('Player state changed:', {
      data: event.data,
      isPlaying: isCurrentlyPlaying,
      hasEnded,
      isCued,
      isBuffering,
      currentClip: currentClipIndex + 1,
      pendingSeekTime
    });

    // Handle video cued state - seek to start time if needed
    if (isCued && pendingSeekTime !== null) {
      console.log(`Video cued, seeking to: ${pendingSeekTime}s`);
      // Reduced timeout and simplified seeking logic to prevent stuttering
      setTimeout(() => {
        if (youtubePlayerRef.current && pendingSeekTime !== null) {
          youtubePlayerRef.current.seekTo(pendingSeekTime, true);
          console.log(`Successfully seeked to ${pendingSeekTime}s`);
          setPendingSeekTime(null);

          // Start playback immediately after seeking if autoplay is enabled
          if (autoPlay) {
            youtubePlayerRef.current.playVideo();
          }
        }
      }, 100); // Reduced from 500ms to 100ms for faster transitions
    }

    // Update playing state
    setIsPlaying(isCurrentlyPlaying);

    // Handle loading state more efficiently
    if (isCurrentlyPlaying) {
      startProgressTracking();
      setIsLoading(false);
    } else if (isBuffering) {
      // Only show loading during buffering, not during normal pauses
      setIsLoading(true);
    } else {
      stopProgressTracking();
      // Don't set loading to false here to prevent flickering
    }

    // Handle video end for auto-advance (only if no other advancement is in progress)
    if (hasEnded && playlist && autoPlay && !isAdvancing && !currentClipAdvanced && !isDrinkingSoundPlaying) {
      console.log('Video ended, checking for auto-advance...');
      // Only advance if no timeout is active and we haven't already started advancing
      if (!clipTimeoutRef.current && !drinkingSoundTimeoutRef.current) {
        console.log('No clip timeout or drinking sound timeout active, advancing due to video end');
        setIsAdvancing(true);
        setCurrentClipAdvanced(true); // Mark this clip as advanced
        playDrinkingSoundAndPreload(currentClipIndex);
      } else {
        console.log('Clip timeout or drinking sound timeout is active, skipping video end advancement');
      }
    }
  }, [pendingSeekTime, currentClipIndex, autoPlay, playlist, isAdvancing, currentClipAdvanced]);

  // Progress tracking
  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      try {
        if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
          const current = youtubePlayerRef.current.getCurrentTime();
          setCurrentTime(current);

          // Check if we've reached the end of the clip
          const currentClip = getCurrentClip();
          if (playlist && currentClip && current >= currentClip.startTime + currentClip.duration && !isAdvancing && !currentClipAdvanced && !isDrinkingSoundPlaying) {
            console.log(`📊 Progress tracking detected clip end at ${current.toFixed(1)}s (clip end: ${(currentClip.startTime + currentClip.duration).toFixed(1)}s)`);
            console.log(`📊 State check - isAdvancing: ${isAdvancing}, currentClipAdvanced: ${currentClipAdvanced}, isDrinkingSoundPlaying: ${isDrinkingSoundPlaying}`);
            setIsAdvancing(true);
            setCurrentClipAdvanced(true); // Mark this clip as advanced

            // Clear the timeout since we're advancing via progress tracking
            if (clipTimeoutRef.current) {
              console.log('📊 Clearing clip timeout since progress tracking triggered first');
              clearTimeout(clipTimeoutRef.current);
              clipTimeoutRef.current = null;
            }

            // Start drinking sound and volume ducking
            playDrinkingSoundAndPreload(currentClipIndex);
          }
        }
      } catch (error) {
        console.error('Error in progress tracking:', error);
      }
    }, 500); // Reduced from 1000ms to 500ms for more responsive tracking
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      console.log('Fullscreen state changed:', isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (clipTimeoutRef.current) {
        clearTimeout(clipTimeoutRef.current);
      }
      if (drinkingSoundTimeoutRef.current) {
        clearTimeout(drinkingSoundTimeoutRef.current);
      }
      if (drinkingSoundFallbackTimeoutRef.current) {
        clearTimeout(drinkingSoundFallbackTimeoutRef.current);
      }
      if (drinkingSoundRef.current) {
        drinkingSoundRef.current.stop();
        drinkingSoundRef.current.unload();
      }
    };
  }, []);

  // Helper functions
  const getCurrentClip = (): YouTubeClip | undefined => {
    return playlist?.clips[currentClipIndex];
  };

  const getNextClip = (): YouTubeClip | undefined => {
    if (!playlist || currentClipIndex >= playlist.clips.length - 1) {
      return undefined;
    }
    return playlist.clips[currentClipIndex + 1];
  };

  // Play YouTube drinking clip with actual video playback
  const playYouTubeDrinkingClip = async (drinkingSoundData: any, finishedClipIndex: number) => {
    console.log(`🍻 Playing YouTube drinking clip: ${drinkingSoundData.name}`);
    console.log(`🍻 Drinking clip data:`, drinkingSoundData);

    // Clear any existing drinking sound timeout to prevent duplicates
    if (drinkingSoundTimeoutRef.current) {
      clearTimeout(drinkingSoundTimeoutRef.current);
      drinkingSoundTimeoutRef.current = null;
    }

    setIsDrinkingSoundPlaying(true);

    // Store current video state for restoration
    const currentVideoId = playlist?.clips[finishedClipIndex]?.videoId;
    const originalVolume = isMuted ? 0 : volume;

    console.log(`🍻 Storing current state - videoId: ${currentVideoId}, volume: ${originalVolume}`);

    try {
      // Step 1: Load the drinking clip video
      if (youtubePlayerRef.current && drinkingSoundData.youtubeId) {
        console.log(`🍻 Loading drinking clip video: ${drinkingSoundData.youtubeId}`);
        console.log(`🍻 Starting at: ${drinkingSoundData.startTime}s for ${drinkingSoundData.duration}s`);

        // Load the drinking clip video with start time
        youtubePlayerRef.current.loadVideoById({
          videoId: drinkingSoundData.youtubeId,
          startSeconds: drinkingSoundData.startTime || 0
        });

        // Set timeout for drinking clip duration
        const clipDuration = drinkingSoundData.duration || 5;
        console.log(`🍻 Setting timeout for ${clipDuration} seconds`);

        drinkingSoundTimeoutRef.current = setTimeout(() => {
          console.log('🍻 YouTube drinking clip duration ended, restoring original video');
          drinkingSoundTimeoutRef.current = null; // Clear the ref
          handleDrinkingClipEnd(finishedClipIndex, originalVolume, currentVideoId);
        }, clipDuration * 1000);
      } else {
        console.error('🍻 Missing YouTube player or drinking clip video ID');
        // Fallback to original behavior
        handleDrinkingClipEnd(finishedClipIndex, originalVolume, currentVideoId);
      }
    } catch (error) {
      console.error('🍻 Error playing YouTube drinking clip:', error);
      // Fallback to original behavior
      handleDrinkingClipEnd(finishedClipIndex, originalVolume, currentVideoId);
    }
  };

  // Handle drinking clip end and advancement
  const handleDrinkingClipEnd = (finishedClipIndex: number, originalVolume: number, originalVideoId?: string) => {
    console.log(`🍻 Handling drinking clip end for finishedClipIndex: ${finishedClipIndex} (currentClipIndex: ${currentClipIndex})`);
    console.log(`🍻 Should advance to clip ${finishedClipIndex + 2} (index ${finishedClipIndex + 1})`);
    console.log(`🍻 Original video ID: ${originalVideoId}`);

    setIsDrinkingSoundPlaying(false);

    // Clean up drinking sound
    if (drinkingSoundRef.current) {
      drinkingSoundRef.current.stop();
      drinkingSoundRef.current = null;
    }

    // Step 1: Restore original volume
    if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
      youtubePlayerRef.current.setVolume(originalVolume);
      console.log(`🔊 Restored YouTube volume to ${originalVolume}%`);
    }

    // Step 2: Advance to next clip (this will automatically load the correct video)
    if (finishedClipIndex < playlist.clips.length - 1) {
      const nextClipIndex = finishedClipIndex + 1;
      console.log(`🍻 Advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
      setIsAdvancing(false); // Reset flag before advancing
      loadClip(nextClipIndex); // Load next clip directly - this will load the correct video
    } else {
      // End of playlist
      console.log('🍻 Reached end of playlist');
      setIsPlaying(false);
      setCurrentTime(0);
      setIsAdvancing(false); // Reset flag at end
    }
  };

  // Play drinking sound and preload next clip
  const playDrinkingSoundAndPreload = async (finishedClipIndex: number) => {
    // Prevent multiple drinking sounds from starting simultaneously
    if (isDrinkingSoundPlaying) {
      console.log('🚫 Drinking sound already playing, skipping duplicate call');
      return;
    }

    // Also check if we're already advancing to prevent race conditions
    if (isAdvancing) {
      console.log('🚫 Already advancing, skipping duplicate drinking sound call');
      return;
    }

    // Check processing ref as additional guard
    if (isProcessingDrinkingSoundRef.current) {
      console.log('🚫 Already processing drinking sound, skipping duplicate call');
      return;
    }

    // Set processing flag immediately to prevent race conditions
    isProcessingDrinkingSoundRef.current = true;

    // Set state immediately to prevent race conditions
    setIsDrinkingSoundPlaying(true);
    setIsAdvancing(true);
    setCurrentClipAdvanced(true);

    // Clean up any existing drinking sound first
    if (drinkingSoundRef.current) {
      console.log('🧹 Cleaning up existing drinking sound before starting new one');
      drinkingSoundRef.current.stop();
      drinkingSoundRef.current.unload();
      drinkingSoundRef.current = null;
    }

    console.log(`🍻 Playing drinking sound after clip ${finishedClipIndex + 1} (currentClipIndex: ${currentClipIndex})`);
    console.log(`🍻 Next clip will be: ${finishedClipIndex + 2} (index ${finishedClipIndex + 1})`);
    console.log(`🍻 Playlist drinking sound path:`, playlist?.drinkingSoundPath);

    // Get next clip info for logging
    const nextClip = playlist?.clips[finishedClipIndex + 1];
    if (nextClip) {
      console.log(`Next clip ready: ${nextClip.title}`);
    }

    // Check if playlist has a drinking sound
    if (playlist?.drinkingSoundPath) {
      try {
        // Parse drinking sound data (could be JSON or simple path)
        let drinkingSoundData;
        try {
          drinkingSoundData = JSON.parse(playlist.drinkingSoundPath);
        } catch {
          // Legacy format - simple path
          drinkingSoundData = {
            type: 'audio',
            path: playlist.drinkingSoundPath,
            name: 'Drinking Sound'
          };
        }

        console.log('Drinking sound data:', drinkingSoundData);

        if (drinkingSoundData.type === 'youtube') {
          // Handle YouTube drinking clip
          await playYouTubeDrinkingClip(drinkingSoundData, finishedClipIndex);
          return;
        }

        // Handle audio file drinking sound
        let drinkingSoundSrc = drinkingSoundData.path;

        // Handle Electron file paths
        if (window.electronAPI && !drinkingSoundSrc.startsWith('blob:') && !drinkingSoundSrc.startsWith('http')) {
          const buffer = await window.electronAPI.getFileBlob(drinkingSoundSrc);
          const blob = new Blob([buffer], { type: 'audio/wav' });
          drinkingSoundSrc = URL.createObjectURL(blob);
        }

        // Step 1: Lower YouTube video volume but keep it playing
        const originalVolume = isMuted ? 0 : volume; // Store original volume
        if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
          youtubePlayerRef.current.setVolume(15); // Lower to 15% but keep playing
          console.log('🔊 Lowered YouTube volume to 15% for drinking sound');
        }

        const drinkingSound = new Howl({
          src: [drinkingSoundSrc],
          html5: true,
          format: ['wav', 'mp3', 'ogg'],
          volume: 0.7,
          loop: false, // Explicitly disable looping
          preload: true, // Ensure the audio is preloaded
          onload: () => {
            console.log('🎵 Drinking sound loaded successfully');
          },
          onend: () => {
            console.log('🎵 Audio drinking sound ended, advancing to next clip');

            // DON'T reset processing flag here - wait until we actually load the next clip
            // isProcessingDrinkingSoundRef.current = false;
            setIsDrinkingSoundPlaying(false);

            // Clear the fallback timeout since onend fired properly
            if (drinkingSoundFallbackTimeoutRef.current) {
              clearTimeout(drinkingSoundFallbackTimeoutRef.current);
              drinkingSoundFallbackTimeoutRef.current = null;
            }

            // Clean up the drinking sound reference immediately
            if (drinkingSoundRef.current) {
              drinkingSoundRef.current.unload();
              drinkingSoundRef.current = null;
            }

            // Step 3: Restore original YouTube video volume
            if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
              youtubePlayerRef.current.setVolume(originalVolume);
              console.log(`🔊 Restored YouTube volume to ${originalVolume}%`);
            }

            // Clean up blob URL if created
            if (drinkingSoundSrc.startsWith('blob:')) {
              URL.revokeObjectURL(drinkingSoundSrc);
            }

            // Add small delay before advancing to prevent stuttering
            setTimeout(() => {
              // Advance to next clip (now preloaded)
              if (finishedClipIndex < playlist.clips.length - 1) {
                const nextClipIndex = finishedClipIndex + 1;
                console.log(`🍻 Audio ended - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
                setIsAdvancing(false); // Reset flag before advancing
                loadClip(nextClipIndex); // Load next clip directly
              } else {
                // End of playlist
                console.log('🍻 Reached end of playlist');
                setIsPlaying(false);
                setCurrentTime(0);
                setIsAdvancing(false); // Reset flag at end
              }
            }, 200); // Small delay to prevent stuttering
          },
          onloaderror: (id, error) => {
            console.error('Error loading drinking sound:', error);
            setIsDrinkingSoundPlaying(false);
            drinkingSoundRef.current = null;

            // Continue to next clip even if drinking sound fails
            if (finishedClipIndex < playlist.clips.length - 1) {
              const nextClipIndex = finishedClipIndex + 1;
              console.log(`🍻 Audio load error - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
              setIsAdvancing(false); // Reset flag before advancing
              loadClip(nextClipIndex); // Load next clip directly
            }
          },
          onplayerror: (id, error) => {
            console.error('Error playing drinking sound:', error);
            setIsDrinkingSoundPlaying(false);
            drinkingSoundRef.current = null;

            // Continue to next clip even if drinking sound fails
            if (finishedClipIndex < playlist.clips.length - 1) {
              const nextClipIndex = finishedClipIndex + 1;
              console.log(`🍻 Audio play error - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
              setIsAdvancing(false); // Reset flag before advancing
              loadClip(nextClipIndex); // Load next clip directly
            }
          }
        });

        drinkingSoundRef.current = drinkingSound;

        // Add error handling for play() method
        try {
          drinkingSound.play();
          console.log('🎵 Audio drinking sound started playing');

          // Add fallback timeout in case onend doesn't fire
          const fallbackDuration = drinkingSound.duration() || 5; // Default to 5 seconds if duration unknown
          console.log(`🎵 Setting fallback timeout for ${fallbackDuration}s`);

          // Clear any existing fallback timeout
          if (drinkingSoundFallbackTimeoutRef.current) {
            clearTimeout(drinkingSoundFallbackTimeoutRef.current);
          }

          drinkingSoundFallbackTimeoutRef.current = setTimeout(() => {
            // Only trigger fallback if drinking sound is still playing and hasn't been cleaned up
            if (isDrinkingSoundPlaying && drinkingSoundRef.current === drinkingSound) {
              console.log('⚠️ Fallback timeout triggered - drinking sound may not have ended properly');

              // Clear the fallback timeout ref
              drinkingSoundFallbackTimeoutRef.current = null;

              // DON'T reset processing flag here - wait until we actually load the next clip
              // isProcessingDrinkingSoundRef.current = false;

              // Stop the sound manually
              if (drinkingSound && drinkingSound.playing()) {
                drinkingSound.stop();
              }

              // Trigger the same cleanup as onend
              setIsDrinkingSoundPlaying(false);
              if (drinkingSoundRef.current) {
                drinkingSoundRef.current.unload();
                drinkingSoundRef.current = null;
              }

              // Restore volume and advance
              if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
                youtubePlayerRef.current.setVolume(originalVolume);
                console.log(`🔊 Restored YouTube volume to ${originalVolume}% (fallback)`);
              }

              // Clean up blob URL if created
              if (drinkingSoundSrc.startsWith('blob:')) {
                URL.revokeObjectURL(drinkingSoundSrc);
              }

              // Advance to next clip
              setTimeout(() => {
                if (finishedClipIndex < playlist.clips.length - 1) {
                  const nextClipIndex = finishedClipIndex + 1;
                  console.log(`🍻 Fallback - advancing to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
                  setIsAdvancing(false);
                  loadClip(nextClipIndex);
                } else {
                  console.log('🍻 Fallback - reached end of playlist');
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setIsAdvancing(false);
                }
              }, 200);
            }
          }, (fallbackDuration + 1) * 1000); // Add 1 second buffer

        } catch (error) {
          console.error('Error starting drinking sound playback:', error);
          isProcessingDrinkingSoundRef.current = false; // Reset processing flag
          setIsDrinkingSoundPlaying(false);
          drinkingSoundRef.current = null;

          // Continue to next clip if sound fails to play
          setTimeout(() => {
            if (finishedClipIndex < playlist.clips.length - 1) {
              const nextClipIndex = finishedClipIndex + 1;
              console.log(`🍻 Play error - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
              setIsAdvancing(false);
              loadClip(nextClipIndex);
            }
          }, 200);
        }

      } catch (error) {
        console.error('Error setting up drinking sound:', error);
        isProcessingDrinkingSoundRef.current = false; // Reset processing flag
        setIsDrinkingSoundPlaying(false);

        // Continue to next clip even if drinking sound fails
        if (finishedClipIndex < playlist.clips.length - 1) {
          const nextClipIndex = finishedClipIndex + 1;
          console.log(`🍻 Setup error - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
          setIsAdvancing(false); // Reset flag before advancing
          loadClip(nextClipIndex); // Load next clip directly
        }
      }
    } else {
      // No drinking sound, advance immediately
      console.log('🍻 No drinking sound configured, advancing immediately');
      setIsDrinkingSoundPlaying(false);

      // Advance immediately without delay
      if (finishedClipIndex < playlist.clips.length - 1) {
        const nextClipIndex = finishedClipIndex + 1;
        console.log(`🍻 No drinking sound - advancing directly to next clip index ${nextClipIndex} (clip ${nextClipIndex + 1})`);
        setIsAdvancing(false); // Reset flag before advancing
        loadClip(nextClipIndex); // Load next clip directly
      } else {
        // End of playlist
        setIsPlaying(false);
        setCurrentTime(0);
        setIsAdvancing(false); // Reset flag at end
      }
    }
  };

  const getClipProgress = (): number => {
    const clip = getCurrentClip();
    if (!clip) return 0;
    
    const clipCurrentTime = Math.max(0, currentTime - clip.startTime);
    return Math.min(100, (clipCurrentTime / clip.duration) * 100);
  };

  const getClipCurrentTime = (): number => {
    const clip = getCurrentClip();
    if (!clip) return 0;
    return Math.max(0, currentTime - clip.startTime);
  };

  // Playback controls
  const handlePlayPause = () => {
    try {
      if (youtubePlayerRef.current) {
        if (isPlaying) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          // When playing, ensure we're at the correct clip position
          const currentClip = getCurrentClip();
          if (currentClip && youtubePlayerRef.current.getCurrentTime) {
            const currentVideoTime = youtubePlayerRef.current.getCurrentTime();
            const clipStartTime = currentClip.startTime;
            const clipEndTime = currentClip.startTime + currentClip.duration;

            // Check if we're outside the clip boundaries
            if (currentVideoTime < clipStartTime || currentVideoTime >= clipEndTime) {
              console.log(`Video position ${currentVideoTime}s is outside clip range ${clipStartTime}s-${clipEndTime}s, seeking to clip start`);
              if (youtubePlayerRef.current.seekTo) {
                youtubePlayerRef.current.seekTo(clipStartTime, true);
                // Reduced timeout for faster response
                setTimeout(() => {
                  if (youtubePlayerRef.current && youtubePlayerRef.current.playVideo) {
                    youtubePlayerRef.current.playVideo();
                  }
                }, 100); // Reduced from 300ms to 100ms
              }
            } else {
              // We're within the clip, just play
              youtubePlayerRef.current.playVideo();
            }
          } else {
            // No current clip or player not ready, just play
            youtubePlayerRef.current.playVideo();
          }
        }
      }
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
    }
  };

  // Optimized function to load the next clip with reduced stuttering
  const loadClip = useCallback((clipIndex: number) => {
    if (!youtubePlayerRef.current || !playlist) return;

    const clip = playlist.clips[clipIndex];
    if (!clip) return;

    console.log(`📼 loadClip called with index ${clipIndex} (clip ${clipIndex + 1})`);
    console.log(`📼 Loading clip: "${clip.title}" from ${clip.startTime}s for ${clip.duration}s`);
    console.log(`📼 Previous currentClipIndex was: ${currentClipIndex}`);
    console.log(`📼 Current state - isAdvancing: ${isAdvancing}, currentClipAdvanced: ${currentClipAdvanced}, isDrinkingSoundPlaying: ${isDrinkingSoundPlaying}`);

    // Reset processing flag when actually loading new clip
    isProcessingDrinkingSoundRef.current = false;

    // Batch state updates to prevent multiple re-renders
    setIsAdvancing(false); // Reset advancing flag when loading new clip
    setCurrentClipAdvanced(false); // Reset clip advanced flag for new clip
    setCurrentClipIndex(clipIndex);
    setCurrentTime(0);
    setIsLoading(true);

    try {
      // Clear any existing timeout first to prevent conflicts
      if (clipTimeoutRef.current) {
        clearTimeout(clipTimeoutRef.current);
        clipTimeoutRef.current = null;
      }

      // Set pending seek time for when video is cued
      setPendingSeekTime(clip.startTime);

      // Load video with startSeconds for initial positioning, seeking will fine-tune if needed
      youtubePlayerRef.current.loadVideoById({
        videoId: clip.videoId,
        startSeconds: clip.startTime
      });

      // Set timeout for drinking sound if auto-play is enabled
      if (autoPlay) {
        const timeoutDuration = clip.duration * 1000;
        console.log(`⏰ Setting timeout for ${timeoutDuration}ms (${clip.duration}s) for clip: ${clip.title}`);
        clipTimeoutRef.current = setTimeout(() => {
          // Check if we're already advancing or this clip has already advanced
          if (!isAdvancing && !currentClipAdvanced && !isDrinkingSoundPlaying) {
            console.log(`⏰ TIMEOUT TRIGGERED! Clip ${clipIndex + 1} duration reached, playing drinking sound...`);
            setIsAdvancing(true);
            setCurrentClipAdvanced(true); // Mark this clip as advanced
            playDrinkingSoundAndPreload(clipIndex);
          } else {
            console.log(`⏰ TIMEOUT TRIGGERED but already advancing (${isAdvancing}) or clip already advanced (${currentClipAdvanced}) or drinking sound playing (${isDrinkingSoundPlaying}), skipping...`);
          }
        }, timeoutDuration);
      }

    } catch (error) {
      console.error('Error loading clip:', error);
      setIsLoading(false);
    }
  }, [playlist, currentClipIndex, autoPlay, isAdvancing, currentClipAdvanced]);

  const handleNextClip = (isAutoAdvance: boolean = false) => {
    if (!playlist || isLoading) {
      console.log(`🚫 handleNextClip blocked - playlist: ${!!playlist}, isLoading: ${isLoading}`);
      return;
    }

    console.log(`🎬 handleNextClip called (auto: ${isAutoAdvance}). Current: ${currentClipIndex}, Total: ${playlist.clips.length}`);

    if (currentClipIndex < playlist.clips.length - 1) {
      const nextIndex = currentClipIndex + 1;
      console.log(`🎬 Loading next clip at index ${nextIndex} (clip ${nextIndex + 1})`);
      loadClip(nextIndex);
    } else {
      // End of playlist
      console.log('Reached end of playlist');
      setIsPlaying(false);
      setCurrentTime(0);
      setIsAdvancing(false); // Reset advancing flag

      // If auto-advance is enabled, loop back to start
      if (isAutoAdvance && autoPlay) {
        console.log('Looping back to start of playlist');
        setTimeout(() => {
          loadClip(0);
        }, 2000); // Brief pause before restarting
      }
    }
  };

  const handlePrevClip = () => {
    if (currentClipIndex > 0 && !isLoading) {
      loadClip(currentClipIndex - 1);
    }
  };

  const handleClipSelect = (index: number) => {
    if (!isLoading) {
      loadClip(index);
    }
  };

  // Volume controls
  const handleVolumeClick = (event: React.MouseEvent<HTMLElement>) => {
    setVolumeAnchor(event.currentTarget);
  };

  const handleVolumeClose = () => {
    setVolumeAnchor(null);
  };

  const handleVolumeChange = (_: any, value: number | number[]) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    setVolume(newVolume);
    if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
      youtubePlayerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
      youtubePlayerRef.current.setVolume(newMuted ? 0 : volume);
    }
  };

  // Drag and drop handler for reordering clips
  const handleClipDragEnd = useCallback((result: DropResult) => {
    const { destination, source } = result;

    if (!destination || !playlist) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      // Create a new playlist with reordered clips
      const updatedPlaylist = { ...playlist };
      const [movedClip] = updatedPlaylist.clips.splice(source.index, 1);
      updatedPlaylist.clips.splice(destination.index, 0, movedClip);

      // Update the playlist in localStorage
      const allPlaylists = JSON.parse(localStorage.getItem('youtube_playlists') || '[]');
      const playlistIndex = allPlaylists.findIndex((p: YouTubePlaylist) => p.id === playlist.id);

      if (playlistIndex !== -1) {
        allPlaylists[playlistIndex] = updatedPlaylist;
        localStorage.setItem('youtube_playlists', JSON.stringify(allPlaylists));

        // Update local state
        setPlaylist(updatedPlaylist);

        // Adjust current clip index if necessary
        if (source.index === currentClipIndex) {
          // The currently playing clip was moved
          setCurrentClipIndex(destination.index);
        } else if (source.index < currentClipIndex && destination.index >= currentClipIndex) {
          // A clip before the current one was moved to after it
          setCurrentClipIndex(currentClipIndex - 1);
        } else if (source.index > currentClipIndex && destination.index <= currentClipIndex) {
          // A clip after the current one was moved to before it
          setCurrentClipIndex(currentClipIndex + 1);
        }

        console.log('✅ Playlist clips reordered successfully');
      }
    } catch (error) {
      console.error('Error reordering playlist clips:', error);
    }
  }, [playlist, currentClipIndex]);

  // Fullscreen controls - Use YouTube's native fullscreen
  const handleFullscreenToggle = () => {
    if (!youtubePlayerRef.current) return;

    try {
      // Use YouTube Player API's fullscreen methods
      if (!isFullscreen) {
        // Enter fullscreen using YouTube's API
        if (youtubePlayerRef.current.getIframe) {
          const iframe = youtubePlayerRef.current.getIframe();
          if (iframe) {
            if (iframe.requestFullscreen) {
              iframe.requestFullscreen();
            } else if (iframe.webkitRequestFullscreen) {
              iframe.webkitRequestFullscreen();
            } else if (iframe.mozRequestFullScreen) {
              iframe.mozRequestFullScreen();
            } else if (iframe.msRequestFullscreen) {
              iframe.msRequestFullscreen();
            }
          }
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Fallback to container fullscreen if YouTube API fails
      if (!playerContainerRef.current) return;

      if (!isFullscreen) {
        if (playerContainerRef.current.requestFullscreen) {
          playerContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  // Load first clip when playlist becomes available
  useEffect(() => {
    if (playlist && playlist.clips.length > 0 && youtubePlayerRef.current && playerReady && !initialVideoLoaded) {
      console.log('Playlist loaded, loading first clip');
      setInitialVideoLoaded(true);
      loadClip(0);
    }
  }, [playlist, playerReady, initialVideoLoaded]);

  if (!playlist) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {playlistId ? 'Loading playlist...' : 'No playlist specified'}
        </Typography>
        {playlistId && (
          <Typography variant="body2" color="text.secondary">
            Playlist ID: {playlistId}
          </Typography>
        )}
      </Container>
    );
  }

  if (!playlist.clips || playlist.clips.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          This playlist is empty
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No videos found in this YouTube playlist.
        </Typography>
      </Container>
    );
  }

  const currentClip = getCurrentClip();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/playlists')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <YouTubeIcon sx={{ mr: 2, fontSize: 32, color: '#FF0000' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {playlist.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label="YouTube Playlist"
              size="small"
              sx={{
                backgroundColor: '#FF0000',
                color: 'white',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {playlist.clips.length} videos • Created {new Date(playlist.date).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)' }}>
        {/* Video Player */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Current Video Info */}
            {currentClip && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {currentClip.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  by {currentClip.artist}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="caption">
                    Clip {currentClipIndex + 1} of {playlist.clips.length}
                  </Typography>
                  <Typography variant="caption">
                    {formatTime(getClipCurrentTime())} / {formatTime(currentClip.duration)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getClipProgress()} 
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            {/* YouTube Player */}
            <Box
              ref={playerContainerRef}
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Single YouTube player instance - never re-renders */}
              <YouTube
                videoId={playlist?.clips[0]?.videoId || 'dQw4w9WgXcQ'} // Use first video or fallback
                opts={{
                  width: '100%',
                  height: '400',
                  playerVars: {
                    autoplay: 0, // We'll control this via API
                    controls: 1, // Keep native controls including fullscreen
                    rel: 0,
                    showinfo: 0,
                    modestbranding: 1,
                    fs: 1, // Enable fullscreen button
                    cc_load_policy: 0,
                    iv_load_policy: 3,
                    enablejsapi: 1,
                    origin: window.location.origin,
                    // Remove start/end params - we'll control via API
                  },
                }}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />

              {/* Fun Drinking Notification - Corner Toast Style */}
              {isDrinkingSoundPlaying && (
                <>
                  {/* Main Notification */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      zIndex: 10,
                      pointerEvents: 'none',
                      animation: 'drinkingNotification 0.5s ease-out',
                      '@keyframes drinkingNotification': {
                        '0%': {
                          transform: 'scale(0.8) translateY(-20px)',
                          opacity: 0,
                        },
                        '50%': {
                          transform: 'scale(1.1) translateY(0px)',
                          opacity: 1,
                        },
                        '100%': {
                          transform: 'scale(1) translateY(0px)',
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                        borderRadius: 3,
                        px: 3,
                        py: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        animation: 'partyPulse 1s ease-in-out infinite alternate',
                        '@keyframes partyPulse': {
                          '0%': {
                            transform: 'scale(1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                          },
                          '100%': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 12px 40px rgba(255,107,107,0.4)',
                          },
                        },
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                          fontSize: '1.2rem',
                          animation: 'textBounce 0.6s ease-in-out infinite alternate',
                          '@keyframes textBounce': {
                            '0%': { transform: 'translateY(0px)' },
                            '100%': { transform: 'translateY(-2px)' },
                          },
                        }}
                      >
                        🍻 DRINK UP! 🎉
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255,255,255,0.9)',
                          display: 'block',
                          textAlign: 'center',
                          mt: 0.5,
                          fontWeight: 'medium',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        Time to celebrate! 🥳
                      </Typography>
                    </Box>
                  </Box>

                  {/* Floating Party Emojis */}
                  {[...Array(6)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        top: `${20 + i * 15}%`,
                        right: `${10 + (i % 3) * 20}%`,
                        zIndex: 5,
                        pointerEvents: 'none',
                        fontSize: '1.5rem',
                        animation: `floatEmoji${i} ${2 + i * 0.3}s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                        '@keyframes floatEmoji0': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.8 },
                          '50%': { transform: 'translateY(-20px) rotate(10deg)', opacity: 1 },
                        },
                        '@keyframes floatEmoji1': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.7 },
                          '50%': { transform: 'translateY(-15px) rotate(-8deg)', opacity: 1 },
                        },
                        '@keyframes floatEmoji2': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.9 },
                          '50%': { transform: 'translateY(-25px) rotate(12deg)', opacity: 1 },
                        },
                        '@keyframes floatEmoji3': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.6 },
                          '50%': { transform: 'translateY(-18px) rotate(-5deg)', opacity: 1 },
                        },
                        '@keyframes floatEmoji4': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.8 },
                          '50%': { transform: 'translateY(-22px) rotate(15deg)', opacity: 1 },
                        },
                        '@keyframes floatEmoji5': {
                          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: 0.7 },
                          '50%': { transform: 'translateY(-16px) rotate(-10deg)', opacity: 1 },
                        },
                      }}
                    >
                      {['🎉', '🥳', '🍻', '🎊', '🎈', '✨'][i]}
                    </Box>
                  ))}
                </>
              )}

              {/* Minimal loading indicator for video transitions */}
              {isLoading && !isDrinkingSoundPlaying && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    zIndex: 1,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease-in-out',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                    Loading...
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
              <IconButton
                onClick={handlePrevClip}
                disabled={currentClipIndex === 0}
                size="large"
              >
                <PrevIcon />
              </IconButton>
              <IconButton
                onClick={handlePlayPause}
                size="large"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
              <IconButton
                onClick={() => handleNextClip(false)}
                disabled={currentClipIndex === playlist.clips.length - 1}
                size="large"
              >
                <NextIcon />
              </IconButton>

              {/* Volume Control */}
              <IconButton
                onClick={handleVolumeClick}
                size="large"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' }
                }}
              >
                {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>

              {/* Fullscreen Control */}
              <IconButton
                onClick={handleFullscreenToggle}
                size="large"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' }
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Box>

            {/* Auto-play toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Auto-advance:
              </Typography>
              <Button
                size="small"
                variant={autoPlay ? "contained" : "outlined"}
                onClick={() => setAutoPlay(!autoPlay)}
                sx={{ minWidth: 60 }}
              >
                {autoPlay ? 'ON' : 'OFF'}
              </Button>
              {isFullscreen && (
                <Chip
                  label="Fullscreen"
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
              {isLoading && (
                <Chip
                  label="Loading..."
                  size="small"
                  color="info"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Paper>
        </Box>

        {/* Playlist */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PlaylistIcon sx={{ mr: 1 }} />
                Playlist
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Playing: {currentClipIndex + 1} of {playlist.clips.length}
                </Typography>
                {autoPlay && (
                  <Chip
                    label="Auto-advance"
                    size="small"
                    color="success"
                    sx={{ height: 16, fontSize: '0.6rem' }}
                  />
                )}
                {playlist?.drinkingSoundPath && (
                  <Chip
                    label="🍻 Drinking sounds"
                    size="small"
                    color="warning"
                    sx={{ height: 16, fontSize: '0.6rem' }}
                  />
                )}
                {isDrinkingSoundPlaying && (
                  <Chip
                    label="🍻 PARTY TIME! 🎉"
                    size="small"
                    variant="filled"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                      color: 'white',
                      animation: 'partyChip 1s ease-in-out infinite alternate',
                      '@keyframes partyChip': {
                        '0%': {
                          transform: 'scale(1)',
                          boxShadow: '0 2px 8px rgba(255,107,107,0.3)',
                        },
                        '100%': {
                          transform: 'scale(1.1)',
                          boxShadow: '0 4px 16px rgba(255,107,107,0.6)',
                        },
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
            <DragDropContext onDragEnd={handleClipDragEnd}>
              <Droppable droppableId="youtube-playlist-clips">
                {(provided) => (
                  <List
                    sx={{ flex: 1, overflow: 'auto', p: 0 }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {playlist.clips.map((clip, index) => {
                      // Ensure unique key by combining clip.id with index as fallback
                      const uniqueKey = clip.id || `clip-${index}-${Date.now()}`;
                      const uniqueDraggableId = clip.id || `draggable-${index}-${Date.now()}`;

                      return (
                      <Draggable key={uniqueKey} draggableId={uniqueDraggableId} index={index}>
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            component="div"
                            onClick={() => !snapshot.isDragging && handleClipSelect(index)}
                            selected={index === currentClipIndex}
                            sx={{
                              borderBottom: 1,
                              borderColor: 'divider',
                              cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                              backgroundColor: snapshot.isDragging
                                ? 'rgba(0, 0, 0, 0.1)'
                                : index === currentClipIndex
                                  ? `${currentTheme.primary}20`
                                  : 'transparent',
                              '&:hover': {
                                bgcolor: snapshot.isDragging ? 'rgba(0, 0, 0, 0.1)' : 'action.hover',
                              },
                              transition: 'background-color 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              ...provided.draggableProps.style,
                            }}
                          >
                            <ListItemIcon>
                              <Typography variant="body2" color="text.secondary">
                                {index + 1}
                              </Typography>
                            </ListItemIcon>
                            <ListItemText
                              primary={clip.title}
                              secondary={
                                <>
                                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                                    {clip.artist}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                                    <TimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
                                    {formatTime(clip.startTime)} - {formatTime(clip.startTime + clip.duration)}
                                  </Typography>
                                </>
                              }
                              sx={{ flex: 1 }}
                            />
                            {/* Drag handle */}
                            <Box
                              {...provided.dragHandleProps}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                color: 'text.secondary',
                                cursor: 'grab',
                                '&:hover': {
                                  color: 'text.primary',
                                  backgroundColor: 'action.hover',
                                },
                                borderRadius: 1,
                                transition: 'all 0.2s ease',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                            >
                              <DragHandleIcon fontSize="small" />
                            </Box>
                          </ListItem>
                        )}
                      </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          </Paper>
        </Box>
      </Box>

      {/* Volume Popover */}
      <Popover
        open={Boolean(volumeAnchor)}
        anchorEl={volumeAnchor}
        onClose={handleVolumeClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{ zIndex: 2500 }}
        disablePortal={false}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          height: 140,
          minWidth: 56,
          overflow: 'hidden'
        }}>
          <Slider
            orientation="vertical"
            min={0}
            max={100}
            step={1}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            sx={{
              height: 100,
              '& .MuiSlider-track': {
                width: 4,
              },
              '& .MuiSlider-rail': {
                width: 4,
              },
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              }
            }}
          />
          <IconButton
            onClick={handleMuteToggle}
            size="small"
            sx={{ mt: 1 }}
          >
            {isMuted || volume === 0 ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Popover>
    </Container>
  );
};

export default YouTubePlaylistPlayer;
