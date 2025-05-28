import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Howl } from 'howler';

interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  songName?: string;
  clipPath?: string;
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
}

type AudioSource = 'mix' | 'playlist' | 'preview' | null;

interface AudioContextType {
  // Current audio source
  audioSource: AudioSource;

  // Mix playback state
  currentMix: Mix | null;
  mixAudio: HTMLAudioElement | null;
  mixPlaying: boolean;
  mixCurrentTime: number;
  mixDuration: number;

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

  // Mix controls
  playMix: (mix: Mix) => void;
  pauseMix: () => void;
  resumeMix: () => void;
  stopMix: () => void;
  seekMix: (time: number) => void;

  // Playlist controls
  playPlaylist: (playlist: Playlist) => void;
  pausePlaylist: () => void;
  resumePlaylist: () => void;
  stopPlaylist: () => void;
  nextClip: () => void;
  previousClip: () => void;
  seekPlaylist: (time: number) => void;
  setPlaylistVolume: (volume: number) => void;
  togglePlaylistMute: () => void;

  // Preview controls
  playPreview: (audioPath: string) => void;
  stopPreview: () => void;

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
  // Current audio source tracking
  const [audioSource, setAudioSource] = useState<AudioSource>(null);

  // Mix state
  const [currentMix, setCurrentMix] = useState<Mix | null>(null);
  const [mixAudio, setMixAudio] = useState<HTMLAudioElement | null>(null);
  const [mixPlaying, setMixPlaying] = useState(false);
  const [mixCurrentTime, setMixCurrentTime] = useState(0);
  const [mixDuration, setMixDuration] = useState(0);

  // Playlist state
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistSound, setPlaylistSound] = useState<Howl | null>(null);
  const [playlistPlaying, setPlaylistPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [playlistProgress, setPlaylistProgress] = useState(0);
  const [playlistDuration, setPlaylistDuration] = useState(0);
  const [playlistVolume, setPlaylistVolumeState] = useState(1);
  const [playlistMuted, setPlaylistMuted] = useState(false);
  const [isDrinkingSoundPlaying, setIsDrinkingSoundPlaying] = useState(false);
  const [drinkingSound, setDrinkingSound] = useState<Howl | null>(null);

  // Preview state
  const [previewSound, setPreviewSound] = useState<Howl | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Refs for callbacks
  const currentPlaylistRef = useRef<Playlist | null>(null);
  const playDrinkingSoundRef = useRef<((finishedClipIndex: number) => Promise<void>) | null>(null);

  // Keep playlist ref in sync
  useEffect(() => {
    currentPlaylistRef.current = currentPlaylist;
  }, [currentPlaylist]);

  // Progress tracking for playlist
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startProgressTracking = () => {
    // Clear any existing interval first
    if (progressIntervalRef.current) {
      console.log('[AudioContext] Clearing existing progress tracking interval');
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (playlistSound && playlistPlaying) {
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
        isPlaying: playlistPlaying
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
    if (previewSound) {
      previewSound.stop();
      previewSound.unload();
      setPreviewSound(null);
      setPreviewPlaying(false);
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
    } else {
      audioSource = `http://localhost:4000/mix/${mix.filename}`;
    }

    const audio = new Audio(audioSource);
    audio.crossOrigin = 'anonymous'; // Enable CORS for Web Audio API
    setMixAudio(audio);
    setCurrentMix(mix);
    setMixPlaying(true);
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

    const sound = new Howl({
      src: [clip.clipPath],
      html5: true, // Force HTML5 Audio for Web Audio API compatibility
      format: ['mp3', 'wav', 'ogg'], // Specify formats to help with HTML5 mode
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
  };

  const playDrinkingSound = async (finishedClipIndex: number) => {
    const playlist = currentPlaylistRef.current;
    if (!playlist || !playlist.drinkingSoundPath) {
      console.log('[AudioContext] No drinking sound, advancing to next clip');
      if (finishedClipIndex < playlist.clips.length - 1) {
        playClipAtIndex(finishedClipIndex + 1);
      } else {
        stopPlaylist();
      }
      return;
    }

    console.log(`[AudioContext] Playing drinking sound after clip ${finishedClipIndex}`);
    setIsDrinkingSoundPlaying(true);

    const sound = new Howl({
      src: [playlist.drinkingSoundPath],
      html5: true, // Force HTML5 Audio for Web Audio API compatibility
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
      playlistSound.pause();
      setPlaylistPlaying(false);
      stopProgressTracking();
    }
  };

  const resumePlaylist = () => {
    if (playlistSound && !playlistPlaying) {
      console.log('[AudioContext] Resuming playlist');
      playlistSound.play();
      setPlaylistPlaying(true);
      // Progress tracking will restart automatically via the useEffect
    } else if (currentPlaylist && !playlistSound && !playlistPlaying) {
      // If we have a playlist but no sound object, restart from current clip or beginning
      console.log('[AudioContext] Restarting playlist from clip:', currentClipIndex >= 0 ? currentClipIndex : 0);
      const startIndex = currentClipIndex >= 0 ? currentClipIndex : 0;
      playClipAtIndex(startIndex);
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

    if (audioSource === 'playlist') {
      setAudioSource(null);
    }
  };

  const nextClip = () => {
    if (currentPlaylist && currentClipIndex < currentPlaylist.clips.length - 1) {
      if (playDrinkingSoundRef.current) {
        playDrinkingSoundRef.current(currentClipIndex);
      } else {
        playClipAtIndex(currentClipIndex + 1);
      }
    }
  };

  const previousClip = () => {
    if (currentClipIndex > 0) {
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
    setPlaylistVolumeState(volume);
    if (playlistSound) {
      playlistSound.volume(playlistMuted ? 0 : volume);
    }
    if (drinkingSound) {
      drinkingSound.volume(playlistMuted ? 0 : volume);
    }
  };

  const togglePlaylistMute = () => {
    const newMuted = !playlistMuted;
    setPlaylistMuted(newMuted);
    const vol = newMuted ? 0 : playlistVolume;
    if (playlistSound) {
      playlistSound.volume(vol);
    }
    if (drinkingSound) {
      drinkingSound.volume(vol);
    }
  };

  // Preview controls
  const playPreview = (audioPath: string) => {
    // Stop all other audio first
    stopAll();

    const sound = new Howl({
      src: [audioPath],
      html5: true, // Force HTML5 Audio for Web Audio API compatibility
      onload: () => {
        setPreviewPlaying(true);
        setAudioSource('preview');
        sound.play();
      },
      onend: () => {
        setPreviewPlaying(false);
        setPreviewSound(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
      },
      onloaderror: (id, error) => {
        console.error('Error loading preview:', error);
        setPreviewPlaying(false);
        setPreviewSound(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
        showSnackbar?.('Error loading preview', 'error');
      },
      onplayerror: (id, error) => {
        console.error('Error playing preview:', error);
        setPreviewPlaying(false);
        setPreviewSound(null);
        if (audioSource === 'preview') {
          setAudioSource(null);
        }
        showSnackbar?.('Error playing preview', 'error');
      }
    });

    setPreviewSound(sound);
  };

  const stopPreview = () => {
    if (previewSound) {
      previewSound.stop();
      previewSound.unload();
      setPreviewSound(null);
      setPreviewPlaying(false);
      if (audioSource === 'preview') {
        setAudioSource(null);
      }
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
    playMix,
    pauseMix,
    resumeMix,
    stopMix,
    seekMix,
    playPlaylist,
    pausePlaylist,
    resumePlaylist,
    stopPlaylist,
    nextClip,
    previousClip,
    seekPlaylist,
    setPlaylistVolume,
    togglePlaylistMute,
    playPreview,
    stopPreview,
    stopAll,
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};
