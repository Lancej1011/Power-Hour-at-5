import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../contexts/AudioContext';

// Global flag to prevent multiple instances from interfering with each other
let globalAudioConnectionActive = false;
let globalConnectedElement: HTMLAudioElement | null = null;

export interface EnhancedAudioAnalysisData {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  volume: number;
  isActive: boolean;
  // Enhanced analysis data
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  beatDetected: boolean;
  beatStrength: number;
  peakFrequency: number;
  spectralCentroid: number;
  spectralRolloff: number;
  frequencyBands: number[];
}

export const useEnhancedAudioAnalysis = (fftSize: number = 2048) => {
  const audio = useAudio();
  const [analysisData, setAnalysisData] = useState<EnhancedAudioAnalysisData>({
    frequencyData: new Uint8Array(fftSize / 2),
    waveformData: new Uint8Array(fftSize),
    volume: 0,
    isActive: false,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    beatDetected: false,
    beatStrength: 0,
    peakFrequency: 0,
    spectralCentroid: 0,
    spectralRolloff: 0,
    frequencyBands: new Array(8).fill(0),
  });

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Beat detection variables
  const beatHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const energyHistoryRef = useRef<number[]>([]);

  // Enhanced analysis functions
  const calculateSpectralCentroid = (frequencyData: Uint8Array): number => {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i] / 255;
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  };

  const calculateSpectralRolloff = (frequencyData: Uint8Array, threshold: number = 0.85): number => {
    const totalEnergy = frequencyData.reduce((sum, val) => sum + (val / 255) ** 2, 0);
    const targetEnergy = totalEnergy * threshold;

    let cumulativeEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      cumulativeEnergy += (frequencyData[i] / 255) ** 2;
      if (cumulativeEnergy >= targetEnergy) {
        return i / frequencyData.length;
      }
    }

    return 1;
  };

  const detectBeat = (frequencyData: Uint8Array): { detected: boolean; strength: number } => {
    // Calculate current energy in bass frequencies (roughly 20-200 Hz)
    const bassEnd = Math.floor(frequencyData.length * 0.1);
    let bassEnergy = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += (frequencyData[i] / 255) ** 2;
    }

    // Store energy history
    energyHistoryRef.current.push(bassEnergy);
    if (energyHistoryRef.current.length > 43) { // ~1 second at 60fps
      energyHistoryRef.current.shift();
    }

    // Calculate average energy
    const avgEnergy = energyHistoryRef.current.reduce((sum, val) => sum + val, 0) / energyHistoryRef.current.length;

    // Beat detection threshold
    const threshold = 1.3;
    const currentTime = Date.now();
    const minBeatInterval = 100; // Minimum 100ms between beats

    const beatDetected = bassEnergy > avgEnergy * threshold &&
                        currentTime - lastBeatTimeRef.current > minBeatInterval;

    if (beatDetected) {
      lastBeatTimeRef.current = currentTime;
    }

    const beatStrength = Math.min(bassEnergy / (avgEnergy || 1), 3);

    return { detected: beatDetected, strength: beatStrength };
  };

  const calculateFrequencyBands = (frequencyData: Uint8Array): number[] => {
    const bands = 8;
    const bandSize = Math.floor(frequencyData.length / bands);
    const result: number[] = [];

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      const start = i * bandSize;
      const end = Math.min(start + bandSize, frequencyData.length);

      for (let j = start; j < end; j++) {
        sum += frequencyData[j] / 255;
      }

      result.push(sum / (end - start));
    }

    return result;
  };

  // Fallback function to generate fake audio data for testing
  const generateFakeAudioData = () => {
    const frequencyData = new Uint8Array(fftSize / 2);
    const waveformData = new Uint8Array(fftSize);

    // Generate fake frequency data with some randomness
    for (let i = 0; i < frequencyData.length; i++) {
      const baseValue = Math.max(0, 100 - i * 0.5); // Decreasing with frequency
      const randomness = Math.random() * 50;
      frequencyData[i] = Math.min(255, baseValue + randomness);
    }

    // Generate fake waveform data
    const time = Date.now() * 0.001;
    for (let i = 0; i < waveformData.length; i++) {
      const sample = Math.sin(time * 3 + i * 0.05) * 60 + 128;
      waveformData[i] = Math.max(0, Math.min(255, sample));
    }

    const volume = Math.random() * 0.6 + 0.3;
    const bassLevel = Math.random() * 0.8;
    const midLevel = Math.random() * 0.6;
    const trebleLevel = Math.random() * 0.7;

    return {
      frequencyData,
      waveformData,
      volume,
      bassLevel,
      midLevel,
      trebleLevel,
      beatDetected: Math.random() > 0.9,
      beatStrength: Math.random() * 2,
      peakFrequency: Math.random(),
      spectralCentroid: Math.random() * 0.5,
      spectralRolloff: Math.random() * 0.8 + 0.2,
      frequencyBands: new Array(8).fill(0).map(() => Math.random() * 0.8),
    };
  };

  const initializeAutoHowlerConnection = (): boolean => {
    console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Attempting automatic Howler connection');

    try {
      if ((window as any).Howler && (window as any).Howler.ctx) {
        const howlerContext = (window as any).Howler.ctx;
        console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Found Howler context');

        if ((window as any).Howler._howls && (window as any).Howler._howls.length > 0) {
          const activeHowl = (window as any).Howler._howls.find((h: any) => h.playing());
          if (activeHowl && activeHowl._sounds && activeHowl._sounds.length > 0) {
            const sound = activeHowl._sounds[0];
            if (sound._node) {
              console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Found active sound node');

              // Disconnect any existing connections
              if (analyserRef.current) {
                try {
                  analyserRef.current.disconnect();
                } catch (e) {
                  // Ignore disconnect errors
                }
              }

              if (sourceRef.current) {
                try {
                  sourceRef.current.disconnect();
                } catch (e) {
                  // Ignore disconnect errors
                }
                sourceRef.current = null;
              }

              // Create new analyser
              const analyser = howlerContext.createAnalyser();
              analyser.fftSize = fftSize;
              analyser.smoothingTimeConstant = 0.8;

              // Handle different node types (same logic as force connection)
              if (sound._node instanceof HTMLAudioElement) {
                console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Connecting HTMLAudioElement');

                try {
                  // Check if this element is already connected to avoid disrupting audio
                  if (currentAudioElementRef.current === sound._node && sourceRef.current && analyserRef.current) {
                    console.log('[EnhancedAudioAnalysis] AUTO HOWLER - HTMLAudioElement already connected, reusing existing connection');
                    return true;
                  }

                  // Check global connection state to prevent conflicts
                  if (globalAudioConnectionActive && globalConnectedElement === sound._node) {
                    console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Element already connected globally, using fallback mode');
                    return false;
                  }

                  // Check if the element already has a source node to avoid disrupting audio
                  if ((sound._node as any).audioSourceNode) {
                    console.log('[EnhancedAudioAnalysis] AUTO HOWLER - HTMLAudioElement already has source node, using fallback to avoid disruption');
                    return false;
                  }

                  // If we have a different element connected, disconnect it first
                  if (sourceRef.current && currentAudioElementRef.current !== sound._node) {
                    console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Disconnecting previous connection');
                    try {
                      sourceRef.current.disconnect();
                    } catch (e) {
                      // Ignore disconnect errors
                    }
                    sourceRef.current = null;
                    currentAudioElementRef.current = null;
                    globalAudioConnectionActive = false;
                    globalConnectedElement = null;
                  }

                  const source = howlerContext.createMediaElementSource(sound._node);
                  source.connect(analyser);
                  analyser.connect(howlerContext.destination);

                  sourceRef.current = source;
                  analyserRef.current = analyser;
                  audioContextRef.current = howlerContext;
                  currentAudioElementRef.current = sound._node;
                  globalAudioConnectionActive = true;
                  globalConnectedElement = sound._node;

                  console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Successfully connected HTMLAudioElement!');
                  return true;
                } catch (sourceError) {
                  console.warn('[EnhancedAudioAnalysis] AUTO HOWLER - HTMLAudioElement connection failed (may already be connected):', sourceError);

                  // If the error is about the element already being connected,
                  // it means another instance is using it - use fallback mode to preserve audio
                  console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Connection failed, using fallback mode to preserve audio playback');
                  return false;
                }
              } else {
                console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Connecting Web Audio node');

                try {
                  // For Web Audio nodes, we can safely connect multiple times
                  sound._node.connect(analyser);
                  analyser.connect(howlerContext.destination);

                  analyserRef.current = analyser;
                  audioContextRef.current = howlerContext;

                  console.log('[EnhancedAudioAnalysis] AUTO HOWLER - Successfully connected Web Audio node!');
                  return true;
                } catch (connectError) {
                  console.error('[EnhancedAudioAnalysis] AUTO HOWLER - Web Audio connection failed:', connectError);
                  return false;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[EnhancedAudioAnalysis] AUTO HOWLER - Error:', error);
    }

    return false;
  };

  const initializeHowlerAnalyser = (howlSound: any): boolean => {
    console.log('[EnhancedAudioAnalysis] Attempting to connect to Howler Web Audio context');

    try {
      if ((window as any).Howler && (window as any).Howler.ctx) {
        const audioContext = (window as any).Howler.ctx;
        console.log('[EnhancedAudioAnalysis] Found Howler audio context');

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0.8;

        // Try to find the audio node from the Howl sound
        if (howlSound._sounds && howlSound._sounds.length > 0) {
          const sound = howlSound._sounds[0];
          if (sound._node) {
            console.log('[EnhancedAudioAnalysis] Found sound node, attempting connection');

            try {
              // Try to insert our analyser into Howler's audio graph
              const audioNode = sound._node;
              audioNode.connect(analyser);
              analyser.connect(audioContext.destination);

              analyserRef.current = analyser;
              audioContextRef.current = audioContext;

              console.log('[EnhancedAudioAnalysis] Successfully connected to Howler Web Audio context');
              return true;
            } catch (connectError) {
              console.error('[EnhancedAudioAnalysis] Error connecting to Howler audio graph:', connectError);
            }
          }
        }
      }
    } catch (error) {
      console.error('[EnhancedAudioAnalysis] Error accessing Howler context:', error);
    }

    return false;
  };

  const initializeAnalyser = (audioElement: HTMLAudioElement): boolean => {
    try {
      console.log('[EnhancedAudioAnalysis] Initializing analyser for audio element');

      // Skip if same audio element is already connected
      if (currentAudioElementRef.current === audioElement && sourceRef.current && analyserRef.current) {
        console.log('[EnhancedAudioAnalysis] Audio element already connected, skipping initialization');
        return true;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        console.log('[EnhancedAudioAnalysis] Resuming suspended AudioContext');
        audioContext.resume();
      }

      // Create analyser node
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = fftSize;
        analyserRef.current.smoothingTimeConstant = 0.8;
        console.log('[EnhancedAudioAnalysis] Created analyser node with FFT size:', fftSize);
      }

      // Disconnect previous source if exists
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
          console.log('[EnhancedAudioAnalysis] Disconnected previous source');
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = null;
      }

      // Try to create media element source and connect to analyser
      try {
        // Check if the element is already connected to avoid disrupting audio
        if ((audioElement as any).audioSourceNode) {
          console.log('[EnhancedAudioAnalysis] Audio element already has a source node, using fallback to avoid disruption');
          return false;
        }

        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);

        sourceRef.current = source;
        currentAudioElementRef.current = audioElement;
        console.log('[EnhancedAudioAnalysis] Successfully connected audio element to analyser');

        return true;
      } catch (sourceError) {
        console.warn('[EnhancedAudioAnalysis] Failed to create MediaElementSource (element may already be connected):', sourceError);

        // If the element is already connected to another context, we can't use it
        // This is expected when switching from playlist page to visualizer
        // Use fallback mode to avoid disrupting audio playback
        console.log('[EnhancedAudioAnalysis] Using fallback mode to preserve audio playback');
        return false;
      }
    } catch (error) {
      console.error('[EnhancedAudioAnalysis] Error initializing audio analyser:', error);

      // Clean up on error
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        sourceRef.current = null;
      }

      return false;
    }
  };

  const updateAnalysisData = () => {
    let frequencyData: Uint8Array;
    let waveformData: Uint8Array;
    let volume: number;

    if (useFallback || !analyserRef.current) {
      // Use fallback fake data
      const fakeData = generateFakeAudioData();
      frequencyData = fakeData.frequencyData;
      waveformData = fakeData.waveformData;
      volume = fakeData.volume;
    } else {
      // Use real audio analysis
      const analyser = analyserRef.current;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      waveformData = new Uint8Array(analyser.fftSize);

      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(waveformData);

      // Calculate volume
      volume = frequencyData.reduce((sum, val) => sum + val, 0) / (frequencyData.length * 255);
    }

    // Calculate frequency band levels
    const bassEnd = Math.floor(frequencyData.length * 0.2);
    const midEnd = Math.floor(frequencyData.length * 0.6);

    const bassLevel = frequencyData.slice(0, bassEnd).reduce((sum, val) => sum + val, 0) / (bassEnd * 255);
    const midLevel = frequencyData.slice(bassEnd, midEnd).reduce((sum, val) => sum + val, 0) / ((midEnd - bassEnd) * 255);
    const trebleLevel = frequencyData.slice(midEnd).reduce((sum, val) => sum + val, 0) / ((frequencyData.length - midEnd) * 255);

    // Beat detection
    const beatInfo = detectBeat(frequencyData);

    // Find peak frequency
    let peakFrequency = 0;
    let maxMagnitude = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxMagnitude) {
        maxMagnitude = frequencyData[i];
        peakFrequency = i;
      }
    }

    // Calculate spectral features
    const spectralCentroid = calculateSpectralCentroid(frequencyData);
    const spectralRolloff = calculateSpectralRolloff(frequencyData);
    const frequencyBands = calculateFrequencyBands(frequencyData);

    setAnalysisData({
      frequencyData,
      waveformData,
      volume,
      isActive: true,
      bassLevel,
      midLevel,
      trebleLevel,
      beatDetected: beatInfo.detected,
      beatStrength: beatInfo.strength,
      peakFrequency: peakFrequency / frequencyData.length,
      spectralCentroid,
      spectralRolloff,
      frequencyBands,
    });
  };



  const startAnalysis = () => {
    if (animationFrameRef.current) return;

    const analyze = () => {
      updateAnalysisData();
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  const stopAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAnalysisData(prev => ({
      ...prev,
      isActive: false,
      volume: 0,
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
      beatDetected: false,
      beatStrength: 0,
    }));
  };

  // Auto-connect to audio sources
  useEffect(() => {
    console.log('[EnhancedAudioAnalysis] Audio state changed:', {
      mixAudio: !!audio.mixAudio,
      mixPlaying: audio.mixPlaying,
      playlistSound: !!audio.playlistSound,
      playlistPlaying: audio.playlistPlaying,
      audioSource: audio.audioSource
    });

    // Check for mix audio (HTML5 Audio)
    const currentMixAudio = audio.mixAudio;
    const isMixPlaying = audio.mixPlaying;

    // Check for playlist audio (Howler.js)
    const currentPlaylistSound = audio.playlistSound;
    const isPlaylistPlaying = audio.playlistPlaying;

    if (currentMixAudio && isMixPlaying) {
      console.log('[EnhancedAudioAnalysis] Attempting to connect mix audio');
      const success = initializeAnalyser(currentMixAudio);
      if (success) {
        setUseFallback(false);
        startAnalysis();
      } else {
        console.log('[EnhancedAudioAnalysis] Failed to connect mix audio (may already be connected elsewhere), using fallback');
        setUseFallback(true);
        startAnalysis();
      }
    } else if (currentPlaylistSound && isPlaylistPlaying) {
      console.log('[EnhancedAudioAnalysis] Attempting to connect playlist audio');

      // Check if we're switching pages while audio is already playing
      // In this case, prioritize preserving audio playback over getting real analysis data
      if (globalAudioConnectionActive) {
        console.log('[EnhancedAudioAnalysis] Audio already connected elsewhere, using fallback mode to preserve playback');
        setUseFallback(true);
        startAnalysis();
        return;
      }

      // Try the automatic Howler connection only if no other connection is active
      const autoHowlerSuccess = initializeAutoHowlerConnection();
      if (autoHowlerSuccess) {
        console.log('[EnhancedAudioAnalysis] Auto Howler connection succeeded!');
        setUseFallback(false);
        startAnalysis();
        return;
      }

      // If auto connection failed, immediately use fallback mode to avoid disrupting audio
      console.log('[EnhancedAudioAnalysis] Auto Howler connection failed, using fallback mode to avoid audio disruption');
      setUseFallback(true);
      startAnalysis();
    } else {
      console.log('[EnhancedAudioAnalysis] No active audio, stopping analysis');
      setUseFallback(false);
      stopAnalysis();
    }

    return () => {
      stopAnalysis();

      // Clean up global connection state if this instance was using it
      if (currentAudioElementRef.current === globalConnectedElement) {
        globalAudioConnectionActive = false;
        globalConnectedElement = null;
      }
    };
  }, [audio.mixAudio, audio.mixPlaying, audio.playlistSound, audio.playlistPlaying, audio.audioSource, fftSize]);

  const forceConnection = (): boolean => {
    console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Attempting manual connection');

    // Try to access Howler's global context directly
    if ((window as any).Howler && (window as any).Howler.ctx) {
      console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Found global Howler context');

      try {
        const howlerContext = (window as any).Howler.ctx;

        // Try to connect to Howler's master gain node
        if ((window as any).Howler._howls && (window as any).Howler._howls.length > 0) {
          const activeHowl = (window as any).Howler._howls.find((h: any) => h.playing());
          if (activeHowl && activeHowl._sounds && activeHowl._sounds.length > 0) {
            const sound = activeHowl._sounds[0];
            if (sound._node) {
              console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Found audio node:', sound._node.constructor.name);

              // Disconnect any existing analyser
              if (analyserRef.current) {
                try {
                  analyserRef.current.disconnect();
                } catch (e) {
                  // Ignore disconnect errors
                }
              }

              // Disconnect any existing source
              if (sourceRef.current) {
                try {
                  sourceRef.current.disconnect();
                } catch (e) {
                  // Ignore disconnect errors
                }
                sourceRef.current = null;
              }

              // Create new analyser
              const analyser = howlerContext.createAnalyser();
              analyser.fftSize = fftSize;
              analyser.smoothingTimeConstant = 0.8;

              // Handle different node types
              if (sound._node instanceof HTMLAudioElement) {
                console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Connecting HTMLAudioElement');

                // For HTMLAudioElement, we need to create a MediaElementSource
                try {
                  const source = howlerContext.createMediaElementSource(sound._node);
                  source.connect(analyser);
                  analyser.connect(howlerContext.destination);

                  sourceRef.current = source;
                  analyserRef.current = analyser;
                  audioContextRef.current = howlerContext;
                  currentAudioElementRef.current = sound._node;

                  console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Successfully connected HTMLAudioElement!');
                  setUseFallback(false);
                  startAnalysis();

                  return true;
                } catch (sourceError) {
                  console.error('[EnhancedAudioAnalysis] FORCE CONNECTION - HTMLAudioElement connection failed:', sourceError);
                  return false;
                }
              } else {
                console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Connecting Web Audio node');

                // For Web Audio nodes, connect directly
                sound._node.connect(analyser);
                analyser.connect(howlerContext.destination);

                analyserRef.current = analyser;
                audioContextRef.current = howlerContext;

                console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Successfully connected Web Audio node!');
                setUseFallback(false);
                startAnalysis();

                return true;
              }
            }
          }
        }
      } catch (error) {
        console.error('[EnhancedAudioAnalysis] FORCE CONNECTION - Error:', error);
      }
    }

    // Fallback: Try to find any audio element and connect to it
    console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Trying HTML audio elements as fallback');
    const audioElements = document.querySelectorAll('audio');
    for (const audioElement of audioElements) {
      if (!audioElement.paused) {
        const success = initializeAnalyser(audioElement);
        if (success) {
          setUseFallback(false);
          startAnalysis();
          return true;
        }
      }
    }

    console.log('[EnhancedAudioAnalysis] FORCE CONNECTION - Failed');
    return false;
  };

  return {
    ...analysisData,
    startAnalysis,
    stopAnalysis,
    forceConnection,
  };
};
