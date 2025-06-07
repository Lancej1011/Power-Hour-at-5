import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Howl } from 'howler';
import VolumeManager from '../utils/volumePersistence';
import YouTube from 'react-youtube';

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

interface Mix {
  name: string;
  filename: string;
  localFilePath?: string;
  songList: string[];
  artist?: string; // Add artist information for library songs
  year?: string; // Add year information for library songs
  genre?: string; // Add genre information for library songs
}

type AudioSource = 'mix' | 'playlist' | 'preview' | 'youtube' | null;

interface AudioContextType {
  // Current audio source
  audioSource: AudioSource;

  // Mix playback state
  currentMix: Mix | null;
  mixAudio: HTMLAudioElement | null;
  mixPlaying: boolean;
  mixCurrentTime: number;
  mixDuration: number;
  mixVolume: number;
  mixMuted: boolean;
  mixArtist: string | null;
  mixYear: string | null;
  mixGenre: string | null;

  // Playlist playback state
  currentPlaylist: Playlist | null;
  playlistSound: Howl | null;
  playlistPlaying: boolean;
  currentClipIndex: number;
  playlistProgress: number;
  playlistDuration: number;
  playlistVolume: number;
  playlistMuted: boolean;
  isDrinkingSoundPlaying: boolean;

  // Preview playback state (for SongUploader)
  previewSound: Howl | null;
  previewPlaying: boolean;
  previewCurrentTime: number;
  previewDuration: number;
  previewClipName: string | null;
  previewClipIndex: number;
  previewClipsTotal: number;
  previewPlaylistName: string | null;
  previewClipArtist: string | null;
  previewVolume: number;
  previewMuted: boolean;

  // Mix controls
  playMix: (mix: Mix) => void;
  pauseMix: () => void;
  resumeMix: () => void;
  stopMix: () => void;
  seekMix: (time: number) => void;
  setMixVolume: (volume: number) => void;
  toggleMixMute: () => void;

  // Playlist controls
  playPlaylist: (playlist: Playlist) => void;
  playClipAtIndex: (index: number, playlistOverride?: Playlist) => Promise<void>;
  pausePlaylist: () => void;
  resumePlaylist: () => void;
  stopPlaylist: () => void;
  nextClip: () => void;
  previousClip: () => void;
  seekPlaylist: (time: number) => void;
  setPlaylistVolume: (volume: number) => void;
  togglePlaylistMute: () => void;

  // Preview controls
  playPreview: (audioPath: string, clipName?: string, clipIndex?: number, clipsTotal?: number, playlistName?: string, clipArtist?: string) => void;
  pausePreview: () => void;
  resumePreview: () => void;
  stopPreview: () => void;
  seekPreview: (time: number) => void;
  previousPreviewClip: () => void;
  nextPreviewClip: () => void;
  setPreviewClipNavigationCallback: (callback: ((clipIndex: number) => void) | null) => void;
  setPreviewVolume: (volume: number) => void;
  togglePreviewMute: () => void;

  // General controls
  stopAll: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
  showSnackbar?: (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children, showSnackbar }) => {
  // Volume manager instance
  const volumeManager = VolumeManager.getInstance();

  // Current audio source tracking
  const [audioSource, setAudioSource] = useState<AudioSource>(null);

  // Mix state
  const [currentMix, setCurrentMix] = useState<Mix | null>(null);
  const [mixAudio, setMixAudio] = useState<HTMLAudioElement | null>(null);
  const [mixPlaying, setMixPlaying] = useState(false);
  const [mixCurrentTime, setMixCurrentTime] = useState(0);
  const [mixDuration, setMixDuration] = useState(0);
  const [mixVolume, setMixVolumeState] = useState(() => volumeManager.getMixVolume());
  const [mixMuted, setMixMuted] = useState(() => volumeManager.getMixMuted());
  const [mixArtist, setMixArtist] = useState<string | null>(null);
  const [mixYear, setMixYear] = useState<string | null>(null);
  const [mixGenre, setMixGenre] = useState<string | null>(null);

  // Playlist state
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistSound, setPlaylistSound] = useState<Howl | null>(null);
  const [playlistPlaying, setPlaylistPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [playlistProgress, setPlaylistProgress] = useState(0);
  const [playlistDuration, setPlaylistDuration] = useState(0);
  const [playlistVolume, setPlaylistVolumeState] = useState(() => volumeManager.getPlaylistVolume());
  const [playlistMuted, setPlaylistMuted] = useState(() => volumeManager.getPlaylistMuted());
  const [isDrinkingSoundPlaying, setIsDrinkingSoundPlaying] = useState(false);
  const [drinkingSound, setDrinkingSound] = useState<Howl | null>(null);

  // Store pause position for reliable resume
  const pausePositionRef = useRef<number>(0);

  // Preview state
  const [previewSound, setPreviewSound] = useState<Howl | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewClipName, setPreviewClipName] = useState<string | null>(null);
  const [previewClipIndex, setPreviewClipIndex] = useState(-1);
  const [previewClipsTotal, setPreviewClipsTotal] = useState(0);
  const [previewPlaylistName, setPreviewPlaylistName] = useState<string | null>(null);
  const [previewClipArtist, setPreviewClipArtist] = useState<string | null>(null);
  const [previewVolume, setPreviewVolumeState] = useState(() => volumeManager.getPreviewVolume());
  const [previewMuted, setPreviewMuted] = useState(() => volumeManager.getPreviewMuted());

  // Refs for callbacks
  const currentPlaylistRef = useRef<Playlist | null>(null);
  const playDrinkingSoundRef = useRef<((finishedClipIndex: number) => Promise<void>) | null>(null);

  // Keep playlist ref in sync
  useEffect(() => {
    currentPlaylistRef.current = currentPlaylist;
  }, [currentPlaylist]);

  // Progress tracking for playlist
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewClipNavigationRef = useRef<((clipIndex: number) => void) | null>(null);

  const startProgressTracking = (forceStart = false) => {
    // Clear any existing interval first
    if (progressIntervalRef.current) {
      console.log('[AudioContext] Clearing existing progress tracking interval');
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (playlistSound && (playlistPlaying || forceStart)) {
      console.log('[AudioContext] Starting progress tracking interval');
      progressIntervalRef.current = setInterval(() => {
        if (playlistSound && playlistSound.playing()) {
          const seek = playlistSound.seek();
          if (typeof seek === 'number' && !isNaN(seek)) {
            setPlaylistProgress(seek);
          }
        }
      }, 100);
    } else {
      console.log('[AudioContext] Cannot start progress tracking - no sound or not playing', {
        hasSound: !!playlistSound,
        isPlaying: playlistPlaying,
        forceStart
      });
    }
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      console.log('[AudioContext] Stopping progress tracking interval');
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Preview progress tracking
  const startPreviewProgressTracking = (soundInstance?: Howl) => {
    if (previewProgressIntervalRef.current) {
      clearInterval(previewProgressIntervalRef.current);
    }

    const sound = soundInstance || previewSound;
    if (sound) {
      previewProgressIntervalRef.current = setInterval(() => {
        if (sound && sound.playing()) {
          const seek = sound.seek();
          if (typeof seek === 'number' && !isNaN(seek)) {
            setPreviewCurrentTime(seek);
          }
        }
      }, 100);
    }
  };

  const stopPreviewProgressTracking = () => {
    if (previewProgressIntervalRef.current) {
      clearInterval(previewProgressIntervalRef.current);
      previewProgressIntervalRef.current = null;
    }
  };

  // Stop all audio sources
  const stopAll = () => {
    console.log('[AudioContext] Stopping all audio');
    stopProgressTracking();

    // Stop mix
    if (mixAudio) {
      mixAudio.pause();
      mixAudio.currentTime = 0;
      setMixPlaying(false);
      setMixCurrentTime(0);
      setMixArtist(null);
      setMixYear(null);
      setMixGenre(null);
    }

    // Stop playlist
    if (playlistSound) {
      playlistSound.stop();
      playlistSound.unload();
      setPlaylistSound(null);
      setPlaylistPlaying(false);
      setPlaylistProgress(0);
      setPlaylistDuration(0);
    }

    // Stop drinking sound
    if (drinkingSound) {
      drinkingSound.stop();
      drinkingSound.unload();
      setDrinkingSound(null);
      setIsDrinkingSoundPlaying(false);
    }

    // Stop preview
    stopPreviewProgressTracking();
    if (previewSound) {
      previewSound.stop();
      previewSound.unload();
      setPreviewSound(null);
      setPreviewPlaying(false);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
      setPreviewClipName(null);
      setPreviewClipIndex(-1);
      setPreviewClipsTotal(0);
      setPreviewClipArtist(null);
    }

    setAudioSource(null);
  };

  // Mix controls
  const playMix = (mix: Mix) => {
    console.log('AudioContext: Playing mix:', mix.name);

    // Stop all other audio first
    stopAll();

    let audioSource = '';
    if (window.electronAPI && mix.localFilePath) {
      audioSource = mix.localFilePath;
    } else if (mix.localFilePath) {
      // Use the local file path directly (for web mode)
      audioSource = mix.localFilePath;
    } else {
      audioSource = `http://localhost:4000/mix/${mix.filename}`;
    }

    const audio = new Audio(audioSource);
    audio.crossOrigin = 'anonymous'; // Enable CORS for Web Audio API
    audio.volume = mixMuted ? 0 : mixVolume; // Set initial volume
    setMixAudio(audio);
    setCurrentMix(mix);
    setMixPlaying(true);
    setMixArtist(mix.artist || null);
    setMixYear(mix.year || null);
    setMixGenre(mix.genre || null);
    setAudioSource('mix');

    audio.onloadedmetadata = () => {
      setMixDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setMixCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setMixPlaying(false);
      setMixCurrentTime(0);
    };

    // Actually play the audio
    audio.play().catch(error => {
      console.error('Error playing mix:', error);
      setMixPlaying(false);
    });

    audio.onerror = (error) => {
      console.error("Error playing audio:", error);
      setMixPlaying(false);
      showSnackbar?.(`Error playing mix: ${mix.name}`, 'error');
    };

    audio.play().catch(err => {
      console.error("Playback error:", err);
      setMixPlaying(false);
      showSnackbar?.(`Error playing mix: ${mix.name}`, 'error');
    });
  };

  const pauseMix = () => {
    if (mixAudio && mixPlaying) {
      mixAudio.pause();
      setMixPlaying(false);
    }
  };

  const resumeMix = () => {
    if (mixAudio && !mixPlaying) {
      mixAudio.play();
      setMixPlaying(true);
    }
  };

  const stopMix = () => {
    if (mixAudio) {
      mixAudio.pause();
      mixAudio.currentTime = 0;
      setMixPlaying(false);
      setMixCurrentTime(0);
      setCurrentMix(null);
      setMixAudio(null);
      setMixArtist(null);
      setMixYear(null);
      setMixGenre(null);
      if (audioSource === 'mix') {
        setAudioSource(null);
      }
    }
  };

  const seekMix = (time: number) => {
    if (mixAudio) {
      mixAudio.currentTime = time;
      setMixCurrentTime(time);
    }
  };

  const setMixVolume = (volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));
    setMixVolumeState(newVolume);
    volumeManager.setMixVolume(newVolume);
    if (mixAudio) {
      mixAudio.volume = mixMuted ? 0 : newVolume;
    }
  };

  const toggleMixMute = () => {
    const newMuted = !mixMuted;
    setMixMuted(newMuted);
    volumeManager.setMixMuted(newMuted);
    if (mixAudio) {
      mixAudio.volume = newMuted ? 0 : mixVolume;
    }
  };

  // Playlist controls
  const playClipAtIndex = async (index: number, playlistOverride?: Playlist) => {
    const playlist = playlistOverride || currentPlaylistRef.current;
    if (!playlist || index < 0 || index >= playlist.clips.length) {
      console.error('[AudioContext] Invalid clip index or no playlist');
      return;
    }

    const clip = playlist.clips[index];
    console.log(`[AudioContext] Playing clip ${index}: ${clip.name}`);

    // Stop current sounds and progress tracking
    stopProgressTracking();
    if (playlistSound) {
      playlistSound.stop();
      playlistSound.unload();
    }
    if (drinkingSound) {
      drinkingSound.stop();
      drinkingSound.unload();
      setDrinkingSound(null);
    }

    // Reset progress state
    setPlaylistProgress(0);
    pausePositionRef.current = 0;

    if (!clip.clipPath) {
      console.error(`[AudioContext] Clip ${clip.name} has no audio file path`);
      showSnackbar?.(`Clip ${clip.name} has no audio file path`, 'error');
      if (index < playlist.clips.length - 1) {
        setTimeout(() => playClipAtIndex(index + 1), 50);
      } else {
        stopPlaylist();
      }
      return;
    }

    // Handle file loading for Electron vs web
    if (window.electronAPI && clip.clipPath && !clip.clipPath.startsWith('blob:') && !clip.clipPath.startsWith('http')) {
      // For Electron, use the getFileBlob API to get the file as a blob
      try {
        console.log(`[AudioContext] Loading clip from file: ${clip.clipPath}`);
        const buffer = await window.electronAPI.getFileBlob(clip.clipPath);
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);

        const sound = new Howl({
          src: [blobUrl],
          html5: true,
          format: ['wav'],
          volume: playlistMuted ? 0 : playlistVolume,
          onload: () => {
            console.log(`[AudioContext] Clip ${index} loaded, duration: ${sound.duration()}`);
            setPlaylistDuration(sound.duration());
            setCurrentClipIndex(index);
            setPlaylistPlaying(true);
            sound.play();
          },
          onplay: () => {
            console.log(`[AudioContext] Clip ${index} started playing`);
            // Ensure progress tracking starts when audio actually begins playing
            setTimeout(() => {
              if (playlistSound && playlistPlaying && !progressIntervalRef.current) {
                console.log('[AudioContext] Starting progress tracking from onplay event');
                startProgressTracking();
              }
            }, 100);
          },
          onend: () => {
            console.log(`[AudioContext] Clip ${index} ended`);
            if (playDrinkingSoundRef.current) {
              playDrinkingSoundRef.current(index);
            } else if (index < playlist.clips.length - 1) {
              playClipAtIndex(index + 1);
            } else {
              console.log('[AudioContext] Playlist finished');
              stopPlaylist();
            }
          },
          onloaderror: (id, error) => {
            console.error(`[AudioContext] Error loading clip ${clip.name}:`, error);
            showSnackbar?.(`Error loading clip: ${clip.name}`, 'error');
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            if (index < playlist.clips.length - 1) {
              setTimeout(() => playClipAtIndex(index + 1), 50);
            } else {
              stopPlaylist();
            }
          },
          onplayerror: (id, error) => {
            console.error(`[AudioContext] Error playing clip ${clip.name}:`, error);
            showSnackbar?.(`Error playing clip: ${clip.name}`, 'error');
            if (index < playlist.clips.length - 1) {
              setTimeout(() => playClipAtIndex(index + 1), 50);
            } else {
              stopPlaylist();
            }
          }
        });

        setPlaylistSound(sound);
      } catch (error) {
        console.error(`[AudioContext] Error loading clip file ${clip.clipPath}:`, error);
        showSnackbar?.(`Error loading clip: ${clip.name}`, 'error');
        if (index < playlist.clips.length - 1) {
          setTimeout(() => playClipAtIndex(index + 1), 50);
        } else {
          stopPlaylist();
        }
      }
    } else {
      // Fallback for web or when clipPath is already a URL
      console.log(`[AudioContext] Loading clip from URL: ${clip.clipPath}`);

      const sound = new Howl({
        src: [clip.clipPath],
        html5: true,
        format: ['mp3', 'wav', 'ogg'],
        volume: playlistMuted ? 0 : playlistVolume,
        onload: () => {
          console.log(`[AudioContext] Clip ${index} loaded, duration: ${sound.duration()}`);
          setPlaylistDuration(sound.duration());
          setCurrentClipIndex(index);
          setPlaylistPlaying(true);
          sound.play();
        },
        onplay: () => {
          console.log(`[AudioContext] Clip ${index} started playing`);
          // Ensure progress tracking starts when audio actually begins playing
          setTimeout(() => {
            if (playlistSound && playlistPlaying && !progressIntervalRef.current) {
              console.log('[AudioContext] Starting progress tracking from onplay event');
              startProgressTracking();
            }
          }, 100);
        },
        onend: () => {
          console.log(`[AudioContext] Clip ${index} ended`);
          if (playDrinkingSoundRef.current) {
            playDrinkingSoundRef.current(index);
          } else if (index < playlist.clips.length - 1) {
            playClipAtIndex(index + 1);
          } else {
            console.log('[AudioContext] Playlist finished');
            stopPlaylist();
          }
        },
        onloaderror: (id, error) => {
          console.error(`[AudioContext] Error loading clip ${clip.name}:`, error);
          showSnackbar?.(`Error loading clip: ${clip.name}`, 'error');
          if (index < playlist.clips.length - 1) {
            setTimeout(() => playClipAtIndex(index + 1), 50);
          } else {
            stopPlaylist();
          }
        },
        onplayerror: (id, error) => {
          console.error(`[AudioContext] Error playing clip ${clip.name}:`, error);
          showSnackbar?.(`Error playing clip: ${clip.name}`, 'error');
          if (index < playlist.clips.length - 1) {
            setTimeout(() => playClipAtIndex(index + 1), 50);
          } else {
            stopPlaylist();
          }
        }
      });

      setPlaylistSound(sound);
    }
  };

  const playDrinkingSound = async (finishedClipIndex: number) => {
    const playlist = currentPlaylistRef.current;
    if (!playlist || !playlist.drinkingSoundPath) {
      console.log('[AudioContext] No drinking sound, advancing to next clip');
      if (playlist && finishedClipIndex < playlist.clips.length - 1) {
        playClipAtIndex(finishedClipIndex + 1);
      } else {
        stopPlaylist();
      }
      return;
    }

    console.log(`[AudioContext] Playing drinking sound after clip ${finishedClipIndex}`);
    setIsDrinkingSoundPlaying(true);

    // Handle file loading for Electron vs web
    if (window.electronAPI && playlist.drinkingSoundPath && !playlist.drinkingSoundPath.startsWith('blob:') && !playlist.drinkingSoundPath.startsWith('http')) {
      // For Electron, use the getFileBlob API to get the file as a blob
      try {
        console.log(`[AudioContext] Loading drinking sound from file: ${playlist.drinkingSoundPath}`);
        const buffer = await window.electronAPI.getFileBlob(playlist.drinkingSoundPath);
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);

        const sound = new Howl({
          src: [blobUrl],
          html5: true,
          format: ['wav'],
          volume: playlistMuted ? 0 : playlistVolume,
          onend: () => {
            console.log('[AudioContext] Drinking sound ended');
            setIsDrinkingSoundPlaying(false);
            setDrinkingSound(null);
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            if (finishedClipIndex < playlist.clips.length - 1) {
              playClipAtIndex(finishedClipIndex + 1);
            } else {
              console.log('[AudioContext] Playlist finished after drinking sound');
              stopPlaylist();
            }
          },
          onloaderror: (id, error) => {
            console.error('[AudioContext] Error loading drinking sound:', error);
            setIsDrinkingSoundPlaying(false);
            setDrinkingSound(null);
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
            if (finishedClipIndex < playlist.clips.length - 1) {
              playClipAtIndex(finishedClipIndex + 1);
            } else {
              stopPlaylist();
            }
          },
          onplayerror: (id, error) => {
            console.error('[AudioContext] Error playing drinking sound:', error);
            setIsDrinkingSoundPlaying(false);
            setDrinkingSound(null);
            if (finishedClipIndex < playlist.clips.length - 1) {
              playClipAtIndex(finishedClipIndex + 1);
            } else {
              stopPlaylist();
            }
          }
        });

        setDrinkingSound(sound);
        sound.play();
      } catch (error) {
        console.error(`[AudioContext] Error loading drinking sound file ${playlist.drinkingSoundPath}:`, error);
        setIsDrinkingSoundPlaying(false);
        setDrinkingSound(null);
        if (finishedClipIndex < playlist.clips.length - 1) {
          playClipAtIndex(finishedClipIndex + 1);
        } else {
          stopPlaylist();
        }
      }
    } else {
      // Fallback for web or when drinkingSoundPath is already a URL
      console.log(`[AudioContext] Loading drinking sound from URL: ${playlist.drinkingSoundPath}`);

      const sound = new Howl({
        src: [playlist.drinkingSoundPath],
        html5: true,
        format: ['mp3', 'wav', 'ogg'],
        volume: playlistMuted ? 0 : playlistVolume,
        onend: () => {
          console.log('[AudioContext] Drinking sound ended');
          setIsDrinkingSoundPlaying(false);
          setDrinkingSound(null);
          if (finishedClipIndex < playlist.clips.length - 1) {
            playClipAtIndex(finishedClipIndex + 1);
          } else {
            console.log('[AudioContext] Playlist finished after drinking sound');
            stopPlaylist();
          }
        },
        onloaderror: (id, error) => {
          console.error('[AudioContext] Error loading drinking sound:', error);
          setIsDrinkingSoundPlaying(false);
          setDrinkingSound(null);
          if (finishedClipIndex < playlist.clips.length - 1) {
            playClipAtIndex(finishedClipIndex + 1);
          } else {
            stopPlaylist();
          }
        },
        onplayerror: (id, error) => {
          console.error('[AudioContext] Error playing drinking sound:', error);
          setIsDrinkingSoundPlaying(false);
          setDrinkingSound(null);
          if (finishedClipIndex < playlist.clips.length - 1) {
            playClipAtIndex(finishedClipIndex + 1);
          } else {
            stopPlaylist();
          }
        }
      });

      setDrinkingSound(sound);
      sound.play();
    }
  };

  // Set up drinking sound ref
  useEffect(() => {
    playDrinkingSoundRef.current = playDrinkingSound;
  }, [playDrinkingSound]);

  const playPlaylist = (playlist: Playlist) => {
    console.log('[AudioContext] Playing playlist:', playlist.name, '(ID:', playlist.id, ')');
    console.log('[AudioContext] Previous playlist was:', currentPlaylist?.name, '(ID:', currentPlaylist?.id, ')');

    // Stop all other audio first
    stopAll();

    setCurrentPlaylist(playlist);
    setCurrentClipIndex(-1);
    setPlaylistProgress(0);
    setPlaylistDuration(0);
    setAudioSource('playlist');

    if (playlist.clips.length > 0) {
      console.log('[AudioContext] Starting first clip of new playlist');
      playClipAtIndex(0, playlist);
    } else {
      console.log('[AudioContext] Playlist has no clips');
      showSnackbar?.('Playlist has no clips to play', 'error');
      setCurrentPlaylist(null);
      setAudioSource(null);
    }
  };

  const pausePlaylist = () => {
    if (playlistSound && playlistPlaying) {
      console.log('[AudioContext] Pausing playlist');

      // Store current position before pausing
      const currentSeek = playlistSound.seek();
      if (typeof currentSeek === 'number' && !isNaN(currentSeek)) {
        pausePositionRef.current = currentSeek;
        console.log('[AudioContext] Stored pause position:', currentSeek);
      }

      playlistSound.pause();
      setPlaylistPlaying(false);
      stopProgressTracking();
    }
  };

  const resumePlaylist = () => {
    console.log('[AudioContext] Resume attempt - Current state:', {
      hasPlaylistSound: !!playlistSound,
      playlistPlaying,
      hasCurrentPlaylist: !!currentPlaylist,
      currentClipIndex,
      pausePosition: pausePositionRef.current,
      soundState: playlistSound ? {
        playing: playlistSound.playing(),
        state: playlistSound.state(),
        seek: playlistSound.seek()
      } : null
    });

    if (playlistSound && !playlistPlaying) {
      console.log('[AudioContext] Resuming playlist with existing sound');

      // Check if the sound is actually loaded and ready
      if (playlistSound.state() === 'loaded') {
        // Seek to the stored pause position if we have one
        if (pausePositionRef.current > 0) {
          console.log('[AudioContext] Seeking to stored pause position:', pausePositionRef.current);
          playlistSound.seek(pausePositionRef.current);
          setPlaylistProgress(pausePositionRef.current);
        }

        // Try to resume playback
        const playId = playlistSound.play();
        console.log('[AudioContext] Play ID returned:', playId);

        setPlaylistPlaying(true);

        // Start progress tracking immediately
        setTimeout(() => {
          if (playlistSound && !progressIntervalRef.current) {
            console.log('[AudioContext] Starting progress tracking after resume');
            startProgressTracking(true); // Force start
          }
        }, 50); // Reduced timeout for faster response
      } else {
        console.log('[AudioContext] Sound not in loaded state, restarting clip');
        // If sound is not loaded, restart the current clip
        const startIndex = currentClipIndex >= 0 ? currentClipIndex : 0;
        playClipAtIndex(startIndex);
      }
    } else if (currentPlaylist && !playlistSound && !playlistPlaying) {
      // If we have a playlist but no sound object, restart from current clip or beginning
      console.log('[AudioContext] Restarting playlist from clip:', currentClipIndex >= 0 ? currentClipIndex : 0);
      const startIndex = currentClipIndex >= 0 ? currentClipIndex : 0;
      playClipAtIndex(startIndex);
    } else {
      console.log('[AudioContext] Resume failed - no valid state for resume');
    }
  };

  const stopPlaylist = () => {
    console.log('[AudioContext] Stopping playlist');
    stopProgressTracking();

    if (playlistSound) {
      playlistSound.stop();
      playlistSound.unload();
      setPlaylistSound(null);
    }
    if (drinkingSound) {
      drinkingSound.stop();
      drinkingSound.unload();
      setDrinkingSound(null);
    }

    setPlaylistPlaying(false);
    setCurrentClipIndex(-1);
    setPlaylistProgress(0);
    setPlaylistDuration(0);
    setIsDrinkingSoundPlaying(false);
    setCurrentPlaylist(null);
    pausePositionRef.current = 0;

    if (audioSource === 'playlist') {
      setAudioSource(null);
    }
  };

  const nextClip = () => {
    if (currentPlaylist && currentClipIndex < currentPlaylist.clips.length - 1) {
      // Stop current clip immediately when manually advancing
      if (playlistSound) {
        playlistSound.stop();
      }

      if (playDrinkingSoundRef.current) {
        playDrinkingSoundRef.current(currentClipIndex);
      } else {
        playClipAtIndex(currentClipIndex + 1);
      }
    }
  };

  const previousClip = () => {
    if (currentClipIndex > 0) {
      // Stop current clip immediately when manually going back
      if (playlistSound) {
        playlistSound.stop();
      }
      playClipAtIndex(currentClipIndex - 1);
    }
  };

  const seekPlaylist = (time: number) => {
    if (playlistSound && typeof time === 'number' && !isNaN(time)) {
      console.log('[AudioContext] Seeking to:', time);
      playlistSound.seek(time);
      setPlaylistProgress(time);

      // Don't restart progress tracking here - let the existing interval continue
      // The interval will pick up the new position automatically
    }
  };

  const setPlaylistVolume = (volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));
    console.log('[AudioContext] setPlaylistVolume called:', volume, '->', newVolume, 'playlistSound exists:', !!playlistSound, 'muted:', playlistMuted);

    // If volume is being set to a non-zero value and audio is muted, unmute it
    const shouldUnmute = newVolume > 0 && playlistMuted;
    if (shouldUnmute) {
      console.log('[AudioContext] Auto-unmuting because volume was set to:', newVolume);
      setPlaylistMuted(false);
      volumeManager.setPlaylistMuted(false);
    }

    setPlaylistVolumeState(newVolume);
    volumeManager.setPlaylistVolume(newVolume);

    // Apply the volume (use newVolume directly if we just unmuted, otherwise respect mute state)
    const actualVolume = shouldUnmute ? newVolume : (playlistMuted ? 0 : newVolume);
    if (playlistSound) {
      playlistSound.volume(actualVolume);
      console.log('[AudioContext] Applied volume to playlistSound:', actualVolume);
    }
    if (drinkingSound) {
      drinkingSound.volume(actualVolume);
    }
  };

  const togglePlaylistMute = () => {
    const newMuted = !playlistMuted;
    setPlaylistMuted(newMuted);
    volumeManager.setPlaylistMuted(newMuted);
    const vol = newMuted ? 0 : playlistVolume;
    if (playlistSound) {
      playlistSound.volume(vol);
    }
    if (drinkingSound) {
      drinkingSound.volume(vol);
    }
  };

  // Preview controls
  const playPreview = (audioPath: string, clipName?: string, clipIndex?: number, clipsTotal?: number, playlistName?: string, clipArtist?: string) => {
    console.log('AudioContext: Playing preview:', clipName || audioPath, 'Artist:', clipArtist);

    // Stop all other audio first
    stopAll();
    const sound = new Howl({
      src: [audioPath],
      format: ['wav'], // Explicitly specify format for blob URLs
      html5: true, // Force HTML5 Audio for Web Audio API compatibility
      volume: previewMuted ? 0 : previewVolume, // Set initial volume
      onload: () => {
        console.log(`Preview loaded, duration: ${sound.duration()}`);
        setPreviewDuration(sound.duration());
        setPreviewPlaying(true);
        setAudioSource('preview');
        setPreviewClipName(clipName || null);
        setPreviewClipIndex(clipIndex ?? -1);
        setPreviewClipsTotal(clipsTotal ?? 0);
        setPreviewPlaylistName(playlistName || null);
        setPreviewClipArtist(clipArtist || null);
        setPreviewCurrentTime(0);
        sound.play();
      },
      onplay: () => {
        console.log('Preview started playing');
        startPreviewProgressTracking(sound);
      },
      onend: () => {
        console.log('Preview ended');
        stopPreviewProgressTracking();
        setPreviewPlaying(false);
        setPreviewSound(null);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        setPreviewClipName(null);
        setPreviewPlaylistName(null);
        setPreviewClipArtist(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
      },
      onloaderror: (id, error) => {
        console.error('Error loading preview:', error);
        setPreviewPlaying(false);
        setPreviewSound(null);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        setPreviewClipName(null);
        setPreviewPlaylistName(null);
        setPreviewClipArtist(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
        showSnackbar?.('Error loading preview', 'error');
      },
      onplayerror: (id, error) => {
        console.error('Error playing preview:', error);
        setPreviewPlaying(false);
        setPreviewSound(null);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        setPreviewClipName(null);
        setPreviewPlaylistName(null);
        setPreviewClipArtist(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
        showSnackbar?.('Error playing preview', 'error');
      }
    });

    setPreviewSound(sound);
  };

  const pausePreview = () => {
    if (previewSound && previewPlaying) {
      console.log('Pausing preview');
      previewSound.pause();
      setPreviewPlaying(false);
      stopPreviewProgressTracking();
    }
  };

  const resumePreview = () => {
    if (previewSound && !previewPlaying) {
      console.log('Resuming preview');
      previewSound.play();
      setPreviewPlaying(true);
      startPreviewProgressTracking(previewSound);
    }
  };

  const stopPreview = () => {
    console.log('Stopping preview');
    stopPreviewProgressTracking();
    if (previewSound) {
      previewSound.stop();
      previewSound.unload();
      setPreviewSound(null);
      setPreviewPlaying(false);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
      setPreviewClipName(null);
      setPreviewClipIndex(-1);
      setPreviewClipsTotal(0);
      setPreviewPlaylistName(null);
      setPreviewClipArtist(null);
      if (audioSource === 'preview') {
        setAudioSource(null);
      }
    }
  };

  const seekPreview = (time: number) => {
    if (previewSound && typeof time === 'number' && !isNaN(time)) {
      console.log('Seeking preview to:', time);
      previewSound.seek(time);
      setPreviewCurrentTime(time);
    }
  };

  const previousPreviewClip = () => {
    if (previewClipNavigationRef.current && previewClipIndex > 0) {
      console.log('Playing previous clip:', previewClipIndex - 1);
      previewClipNavigationRef.current(previewClipIndex - 1);
    }
  };

  const nextPreviewClip = () => {
    if (previewClipNavigationRef.current && previewClipIndex < previewClipsTotal - 1) {
      console.log('Playing next clip:', previewClipIndex + 1);
      previewClipNavigationRef.current(previewClipIndex + 1);
    }
  };

  const setPreviewClipNavigationCallback = (callback: ((clipIndex: number) => void) | null) => {
    previewClipNavigationRef.current = callback;
  };

  const setPreviewVolume = (volume: number) => {
    const newVolume = Math.max(0, Math.min(1, volume));

    // If volume is being set to a non-zero value and audio is muted, unmute it
    const shouldUnmute = newVolume > 0 && previewMuted;
    if (shouldUnmute) {
      setPreviewMuted(false);
      volumeManager.setPreviewMuted(false);
    }

    setPreviewVolumeState(newVolume);
    volumeManager.setPreviewVolume(newVolume);

    // Apply the volume (use newVolume directly if we just unmuted, otherwise respect mute state)
    const actualVolume = shouldUnmute ? newVolume : (previewMuted ? 0 : newVolume);
    if (previewSound) {
      previewSound.volume(actualVolume);
    }
  };

  const togglePreviewMute = () => {
    const newMuted = !previewMuted;
    setPreviewMuted(newMuted);
    volumeManager.setPreviewMuted(newMuted);
    if (previewSound) {
      previewSound.volume(newMuted ? 0 : previewVolume);
    }
  };

  // Progress tracking effect
  useEffect(() => {
    console.log('[AudioContext] Progress tracking effect triggered', {
      playlistPlaying,
      hasPlaylistSound: !!playlistSound,
      currentClipIndex
    });

    if (playlistPlaying && playlistSound) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }

    return () => stopProgressTracking();
  }, [playlistPlaying, playlistSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopProgressTracking();
  }, []);

  const contextValue: AudioContextType = {
    audioSource,
    currentMix,
    mixAudio,
    mixPlaying,
    mixCurrentTime,
    mixDuration,
    mixVolume,
    mixMuted,
    mixArtist,
    mixYear,
    mixGenre,
    currentPlaylist,
    playlistSound,
    playlistPlaying,
    currentClipIndex,
    playlistProgress,
    playlistDuration,
    playlistVolume,
    playlistMuted,
    isDrinkingSoundPlaying,
    previewSound,
    previewPlaying,
    previewCurrentTime,
    previewDuration,
    previewClipName,
    previewClipIndex,
    previewClipsTotal,
    previewPlaylistName,
    previewClipArtist,
    previewVolume,
    previewMuted,
    playMix,
    pauseMix,
    resumeMix,
    stopMix,
    seekMix,
    setMixVolume,
    toggleMixMute,
    playPlaylist,
    playClipAtIndex,
    pausePlaylist,
    resumePlaylist,
    stopPlaylist,
    nextClip,
    previousClip,
    seekPlaylist,
    setPlaylistVolume,
    togglePlaylistMute,
    playPreview,
    pausePreview,
    resumePreview,
    stopPreview,
    seekPreview,
    previousPreviewClip,
    nextPreviewClip,
    setPreviewClipNavigationCallback,
    setPreviewVolume,
    togglePreviewMute,
    stopAll,
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};
