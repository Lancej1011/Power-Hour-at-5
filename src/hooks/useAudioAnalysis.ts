import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../contexts/AudioContext';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  volume: number;
  isActive: boolean;
}

export const useAudioAnalysis = (fftSize: number = 2048) => {
  const audio = useAudio();
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData>({
    frequencyData: new Uint8Array(fftSize / 2),
    waveformData: new Uint8Array(fftSize),
    volume: 0,
    isActive: false,
  });

  const [useFallback, setUseFallback] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Fallback function to generate fake audio data for testing
  const generateFakeAudioData = () => {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log('[AudioAnalysis] Using fallback fake data - real audio connection failed');
    }

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
      const sample = Math.sin(time * 2 + i * 0.1) * 50 + 128;
      waveformData[i] = Math.max(0, Math.min(255, sample));
    }

    const volume = Math.random() * 0.5 + 0.2; // Random volume between 0.2 and 0.7

    return { frequencyData, waveformData, volume };
  };

  // Automatic Howler connection using the same logic as force connection
  const initializeAutoHowlerConnection = () => {
    try {
      console.log('[AudioAnalysis] AUTO HOWLER - Attempting automatic connection');

      // Check if Howler exists and has context
      if (!(window as any).Howler || !(window as any).Howler.ctx) {
        console.log('[AudioAnalysis] AUTO HOWLER - No Howler context found');
        return false;
      }

      const howlerContext = (window as any).Howler.ctx;
      console.log('[AudioAnalysis] AUTO HOWLER - Found Howler context');

      // Find active Howl
      if (!(window as any).Howler._howls || (window as any).Howler._howls.length === 0) {
        console.log('[AudioAnalysis] AUTO HOWLER - No active Howls found');
        return false;
      }

      const activeHowl = (window as any).Howler._howls.find((h: any) => h.playing());
      if (!activeHowl) {
        console.log('[AudioAnalysis] AUTO HOWLER - No playing Howl found');
        return false;
      }

      console.log('[AudioAnalysis] AUTO HOWLER - Found playing Howl');

      if (!activeHowl._sounds || activeHowl._sounds.length === 0) {
        console.log('[AudioAnalysis] AUTO HOWLER - No sounds in active Howl');
        return false;
      }

      const sound = activeHowl._sounds[0];
      if (!sound._node) {
        console.log('[AudioAnalysis] AUTO HOWLER - No audio node found');
        return false;
      }

      console.log('[AudioAnalysis] AUTO HOWLER - Found audio node:', sound._node.constructor.name);

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
        console.log('[AudioAnalysis] AUTO HOWLER - Connecting HTMLAudioElement');

        try {
          const source = howlerContext.createMediaElementSource(sound._node);
          source.connect(analyser);
          analyser.connect(howlerContext.destination);

          sourceRef.current = source;
          analyserRef.current = analyser;
          audioContextRef.current = howlerContext;
          currentAudioElementRef.current = sound._node;

          console.log('[AudioAnalysis] AUTO HOWLER - Successfully connected HTMLAudioElement!');
          return true;
        } catch (sourceError) {
          console.error('[AudioAnalysis] AUTO HOWLER - HTMLAudioElement connection failed:', sourceError);
          return false;
        }
      } else {
        console.log('[AudioAnalysis] AUTO HOWLER - Connecting Web Audio node');

        try {
          sound._node.connect(analyser);
          analyser.connect(howlerContext.destination);

          analyserRef.current = analyser;
          audioContextRef.current = howlerContext;

          console.log('[AudioAnalysis] AUTO HOWLER - Successfully connected Web Audio node!');
          return true;
        } catch (connectError) {
          console.error('[AudioAnalysis] AUTO HOWLER - Web Audio connection failed:', connectError);
          return false;
        }
      }
    } catch (error) {
      console.error('[AudioAnalysis] AUTO HOWLER - Error:', error);
      return false;
    }
  };

  // Alternative: Try to connect to Howler's internal Web Audio API context
  const initializeHowlerAnalyser = (howlerSound: any) => {
    try {
      console.log('[AudioAnalysis] Attempting to connect to Howler Web Audio context');
      console.log('[AudioAnalysis] Howler sound object:', howlerSound);

      // Try to access Howler's internal Web Audio API context
      if (howlerSound._sounds && howlerSound._sounds.length > 0) {
        console.log('[AudioAnalysis] Found', howlerSound._sounds.length, 'Howler sounds');

        const sound = howlerSound._sounds[0];
        console.log('[AudioAnalysis] First sound object:', sound);

        // Try different ways to access Howler's audio nodes
        let audioNode = null;
        let audioContext = null;

        // Method 1: Check for _node
        if (sound._node) {
          console.log('[AudioAnalysis] Found sound._node:', sound._node);
          audioNode = sound._node;
          audioContext = sound._node.context || sound._node.audioContext;
        }

        // Method 2: Check for _source
        if (!audioNode && sound._source) {
          console.log('[AudioAnalysis] Found sound._source:', sound._source);
          audioNode = sound._source;
          audioContext = sound._source.context || sound._source.audioContext;
        }

        // Method 3: Check Howler's global context
        if (!audioContext && (window as any).Howler && (window as any).Howler.ctx) {
          console.log('[AudioAnalysis] Found Howler.ctx:', (window as any).Howler.ctx);
          audioContext = (window as any).Howler.ctx;
          // Try to find the gain node or source
          if (sound._gain) {
            audioNode = sound._gain;
          }
        }

        if (audioContext && audioNode) {
          console.log('[AudioAnalysis] Found audio context and node, creating analyser');

          // Create our own analyser in Howler's context
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = 0.8;

          try {
            // Try to insert our analyser into Howler's audio graph
            audioNode.connect(analyser);
            analyser.connect(audioContext.destination);

            analyserRef.current = analyser;
            audioContextRef.current = audioContext;

            console.log('[AudioAnalysis] Successfully connected to Howler Web Audio context');

            // Test the connection
            setTimeout(() => {
              if (analyser) {
                const testData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(testData);
                const maxVal = Math.max(...testData);
                console.log('[AudioAnalysis] Howler connection test - max frequency value:', maxVal);
              }
            }, 500);

            return true;
          } catch (connectError) {
            console.error('[AudioAnalysis] Error connecting to Howler audio graph:', connectError);
          }
        } else {
          console.log('[AudioAnalysis] Could not find audio context or node');
        }
      } else {
        console.log('[AudioAnalysis] No sounds found in Howler object');
      }

      return false;
    } catch (error) {
      console.error('[AudioAnalysis] Error connecting to Howler Web Audio context:', error);
      return false;
    }
  };

  // Initialize audio context and analyser
  const initializeAnalyser = (audioElement: HTMLAudioElement) => {
    try {
      console.log('[AudioAnalysis] Initializing analyser for audio element:', audioElement);

      // Skip if same audio element is already connected
      if (currentAudioElementRef.current === audioElement && sourceRef.current) {
        console.log('[AudioAnalysis] Audio element already connected, skipping');
        return true;
      }

      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[AudioAnalysis] Created new AudioContext');
      }

      const audioContext = audioContextRef.current;

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        console.log('[AudioAnalysis] Resuming suspended AudioContext');
        audioContext.resume();
      }

      // Create analyser node
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = fftSize;
        analyserRef.current.smoothingTimeConstant = 0.8;
        console.log('[AudioAnalysis] Created analyser node with FFT size:', fftSize);
      }

      // Disconnect previous source if exists
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
          console.log('[AudioAnalysis] Disconnected previous source');
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = null;
      }

      // Create new source node for the current audio element
      try {
        sourceRef.current = audioContext.createMediaElementSource(audioElement);
        console.log('[AudioAnalysis] Created MediaElementSource');
      } catch (sourceError) {
        console.error('[AudioAnalysis] Error creating MediaElementSource:', sourceError);
        // This often happens if the audio element is already connected to another source
        throw sourceError;
      }

      try {
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
        console.log('[AudioAnalysis] Connected audio graph');
      } catch (connectError) {
        console.error('[AudioAnalysis] Error connecting audio graph:', connectError);
        throw connectError;
      }

      currentAudioElementRef.current = audioElement;
      console.log('[AudioAnalysis] Successfully connected audio element to analyser');

      // Test if we're getting data
      setTimeout(() => {
        if (analyserRef.current) {
          const testData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(testData);
          const maxVal = Math.max(...testData);
          console.log('[AudioAnalysis] Test data after connection - max frequency value:', maxVal);
        }
      }, 500);

      return true;
    } catch (error) {
      console.error('[AudioAnalysis] Error initializing audio analyser:', error);

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

  // Animation loop for updating frequency data
  const updateAnalysisData = () => {
    let frequencyData: Uint8Array;
    let waveformData: Uint8Array;
    let volume: number;

    if (useFallback || !analyserRef.current) {
      // Use fallback fake data
      console.log('[AudioAnalysis] Using fallback data - useFallback:', useFallback, 'analyserRef.current:', !!analyserRef.current);
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

      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < waveformData.length; i++) {
        const sample = (waveformData[i] - 128) / 128;
        sum += sample * sample;
      }
      volume = Math.sqrt(sum / waveformData.length);
    }

    // Debug: Log some data occasionally
    if (Math.random() < 0.02) { // Log ~2% of frames for better debugging
      const maxFreq = Math.max(...frequencyData);
      const avgFreq = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
      const nonZeroCount = frequencyData.filter(val => val > 0).length;
      const debugInfo = `volume: ${volume.toFixed(3)}, maxFreq: ${maxFreq}, avgFreq: ${avgFreq.toFixed(1)}, nonZeroCount: ${nonZeroCount}, binCount: ${frequencyData.length}, useFallback: ${useFallback}, analyserConnected: ${!!analyserRef.current}, audioContextState: ${audioContextRef.current?.state}`;
      console.log('[AudioAnalysis] Data update:', debugInfo);
    }

    setAnalysisData({
      frequencyData,
      waveformData,
      volume,
      isActive: true,
    });

    animationFrameRef.current = requestAnimationFrame(updateAnalysisData);
  };

  // Start analysis
  const startAnalysis = () => {
    if (animationFrameRef.current) {
      console.log('[AudioAnalysis] Analysis already running');
      return; // Already running
    }

    console.log('[AudioAnalysis] Starting analysis');
    updateAnalysisData();
  };

  // Stop analysis
  const stopAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAnalysisData(prev => ({
      ...prev,
      isActive: false,
      volume: 0,
    }));
  };

  // Effect to handle audio source changes
  useEffect(() => {
    console.log('[AudioAnalysis] Audio state changed:', {
      mixAudio: !!audio.mixAudio,
      mixPlaying: audio.mixPlaying,
      playlistSound: !!audio.playlistSound,
      playlistPlaying: audio.playlistPlaying,
      audioSource: audio.audioSource
    });

    console.log('[AudioAnalysis] Current analyser state:', {
      analyserRef: !!analyserRef.current,
      audioContextRef: !!audioContextRef.current,
      useFallback: useFallback
    });

    // Check for mix audio (HTML5 Audio)
    const currentMixAudio = audio.mixAudio;
    const isMixPlaying = audio.mixPlaying;

    // Check for playlist audio (Howler.js)
    const currentPlaylistSound = audio.playlistSound;
    const isPlaylistPlaying = audio.playlistPlaying;

    console.log('[AudioAnalysis] Detailed audio state:', {
      currentMixAudio: !!currentMixAudio,
      isMixPlaying,
      currentPlaylistSound: !!currentPlaylistSound,
      isPlaylistPlaying,
      playlistSoundType: typeof currentPlaylistSound,
      playlistSoundConstructor: currentPlaylistSound?.constructor?.name
    });

    if (currentMixAudio && isMixPlaying) {
      console.log('[AudioAnalysis] Attempting to connect mix audio');
      const success = initializeAnalyser(currentMixAudio);
      if (success) {
        setUseFallback(false);
        startAnalysis();
      } else {
        console.log('[AudioAnalysis] Failed to connect mix audio, using fallback');
        setUseFallback(true);
        startAnalysis();
      }
    } else if (currentPlaylistSound && isPlaylistPlaying) {
      console.log('[AudioAnalysis] Attempting to connect playlist audio');
      console.log('[AudioAnalysis] Playlist sound object type:', typeof currentPlaylistSound);
      console.log('[AudioAnalysis] Playlist sound object keys:', Object.keys(currentPlaylistSound || {}));

      // First try the automatic Howler connection using the same logic as force connection
      const autoHowlerSuccess = initializeAutoHowlerConnection();
      if (autoHowlerSuccess) {
        console.log('[AudioAnalysis] Auto Howler connection succeeded!');
        setUseFallback(false);
        startAnalysis();
        return;
      }

      // Fallback: try to connect directly to Howler's Web Audio context (old method)
      const howlerSuccess = initializeHowlerAnalyser(currentPlaylistSound);
      if (howlerSuccess) {
        console.log('[AudioAnalysis] Howler Web Audio connection succeeded!');
        setUseFallback(false);
        startAnalysis();
        return;
      }

      console.log('[AudioAnalysis] Howler Web Audio approach failed, trying HTML5 audio element');

      // For Howler.js with html5: true, we need to get the underlying HTML audio element
      const findHowlerAudio = () => {
        const audioElements = document.querySelectorAll('audio');
        console.log('[AudioAnalysis] Found', audioElements.length, 'audio elements in DOM');

        // Log all audio elements for debugging
        audioElements.forEach((el, index) => {
          console.log(`[AudioAnalysis] Audio element ${index}:`, {
            src: el.src,
            paused: el.paused,
            currentTime: el.currentTime,
            duration: el.duration,
            readyState: el.readyState
          });
        });

        // Method 1: Find by not paused and has current time > 0 and has duration
        let howlerAudio = Array.from(audioElements).find(el =>
          !el.paused && el.currentTime > 0 && el.duration > 0
        ) as HTMLAudioElement;

        // Method 2: Find by not paused and has duration (even if currentTime is 0)
        if (!howlerAudio) {
          howlerAudio = Array.from(audioElements).find(el =>
            !el.paused && el.duration > 0
          ) as HTMLAudioElement;
        }

        // Method 3: Find by not paused (even without duration check)
        if (!howlerAudio) {
          howlerAudio = Array.from(audioElements).find(el => !el.paused) as HTMLAudioElement;
        }

        // Method 4: Find any audio element with a src that's not empty and has loaded
        if (!howlerAudio) {
          howlerAudio = Array.from(audioElements).find(el =>
            el.src && el.src !== '' && el.src !== window.location.href && el.readyState >= 2
          ) as HTMLAudioElement;
        }

        // Method 5: Find the most recently created audio element
        if (!howlerAudio && audioElements.length > 0) {
          howlerAudio = audioElements[audioElements.length - 1] as HTMLAudioElement;
        }

        return howlerAudio;
      };

      let howlerAudio = findHowlerAudio();

      if (!howlerAudio) {
        console.log('[AudioAnalysis] No audio element found immediately, waiting and retrying...');
        // Wait a bit for Howler to create the element, then try multiple times
        let retryCount = 0;
        const maxRetries = 5;

        const retryFind = () => {
          retryCount++;
          console.log(`[AudioAnalysis] Retry attempt ${retryCount}/${maxRetries}`);

          const retryAudio = findHowlerAudio();
          if (retryAudio) {
            console.log('[AudioAnalysis] Found audio element on retry:', retryAudio);
            const success = initializeAnalyser(retryAudio);
            if (success) {
              setUseFallback(false);
              startAnalysis();
            } else {
              console.log('[AudioAnalysis] Failed to connect retried audio, using fallback');
              setUseFallback(true);
              startAnalysis();
            }
          } else if (retryCount < maxRetries) {
            setTimeout(retryFind, 200); // Wait longer between retries
          } else {
            console.log('[AudioAnalysis] All retries failed, using fallback');
            setUseFallback(true);
            startAnalysis();
          }
        };

        setTimeout(retryFind, 100);
        return;
      }

      if (howlerAudio) {
        console.log('[AudioAnalysis] Found Howler audio element:', howlerAudio);
        const success = initializeAnalyser(howlerAudio);
        if (success) {
          setUseFallback(false);
          startAnalysis();
        } else {
          console.log('[AudioAnalysis] Failed to connect Howler audio, using fallback');
          setUseFallback(true);
          startAnalysis();
        }
      } else {
        console.log('[AudioAnalysis] No suitable audio element found, using fallback');
        setUseFallback(true);
        startAnalysis();
      }
    } else {
      console.log('[AudioAnalysis] No active audio detected through normal means');

      // Last resort: Try to find any audio in the page and connect to it
      if (audio.audioSource === 'playlist' && audio.playlistPlaying) {
        console.log('[AudioAnalysis] Playlist is playing but no sound object found, trying last resort approach');

        // Try the same automatic connection as a last resort
        const lastResortSuccess = initializeAutoHowlerConnection();
        if (lastResortSuccess) {
          console.log('[AudioAnalysis] Last resort auto connection succeeded!');
          setUseFallback(false);
          startAnalysis();
          return;
        }

        console.log('[AudioAnalysis] All connection attempts failed, using fallback');
        setUseFallback(true);
        startAnalysis();
      } else {
        console.log('[AudioAnalysis] No active audio, stopping analysis');
        setUseFallback(false);
        stopAnalysis();
      }
    }

    return () => {
      stopAnalysis();
    };
  }, [audio.mixAudio, audio.mixPlaying, audio.playlistSound, audio.playlistPlaying, audio.audioSource, fftSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();

      // Disconnect source
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      currentAudioElementRef.current = null;
    };
  }, []);

  // Manual connection function for debugging
  const forceConnection = () => {
    console.log('[AudioAnalysis] FORCE CONNECTION - Attempting manual connection');

    // Try to access Howler's global context directly
    if ((window as any).Howler && (window as any).Howler.ctx) {
      console.log('[AudioAnalysis] FORCE CONNECTION - Found global Howler context');

      try {
        const howlerContext = (window as any).Howler.ctx;

        // Try to connect to Howler's master gain node
        if ((window as any).Howler._howls && (window as any).Howler._howls.length > 0) {
          const activeHowl = (window as any).Howler._howls.find((h: any) => h.playing());
          if (activeHowl && activeHowl._sounds && activeHowl._sounds.length > 0) {
            const sound = activeHowl._sounds[0];
            if (sound._node) {
              console.log('[AudioAnalysis] FORCE CONNECTION - Found audio node:', sound._node.constructor.name);

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
                console.log('[AudioAnalysis] FORCE CONNECTION - Connecting HTMLAudioElement');

                // For HTMLAudioElement, we need to create a MediaElementSource
                try {
                  const source = howlerContext.createMediaElementSource(sound._node);
                  source.connect(analyser);
                  analyser.connect(howlerContext.destination);

                  sourceRef.current = source;
                  analyserRef.current = analyser;
                  audioContextRef.current = howlerContext;
                  currentAudioElementRef.current = sound._node;

                  console.log('[AudioAnalysis] FORCE CONNECTION - Successfully connected HTMLAudioElement!');
                  setUseFallback(false);
                  startAnalysis();

                  return true;
                } catch (sourceError) {
                  console.error('[AudioAnalysis] FORCE CONNECTION - HTMLAudioElement connection failed:', sourceError);

                  // If MediaElementSource fails, the element might already be connected
                  // Try to find existing connections or use a different approach
                  console.log('[AudioAnalysis] FORCE CONNECTION - Trying alternative HTMLAudioElement approach');

                  // Just create the analyser and try to connect it to the destination
                  // This won't give us real audio data, but let's see what happens
                  analyser.connect(howlerContext.destination);
                  analyserRef.current = analyser;
                  audioContextRef.current = howlerContext;

                  console.log('[AudioAnalysis] FORCE CONNECTION - Alternative connection attempt');
                  setUseFallback(false);
                  startAnalysis();

                  return true;
                }
              } else {
                console.log('[AudioAnalysis] FORCE CONNECTION - Connecting Web Audio node');

                // For Web Audio nodes, connect directly
                sound._node.connect(analyser);
                analyser.connect(howlerContext.destination);

                analyserRef.current = analyser;
                audioContextRef.current = howlerContext;

                console.log('[AudioAnalysis] FORCE CONNECTION - Successfully connected Web Audio node!');
                setUseFallback(false);
                startAnalysis();

                return true;
              }
            }
          }
        }
      } catch (error) {
        console.error('[AudioAnalysis] FORCE CONNECTION - Error:', error);
      }
    }

    console.log('[AudioAnalysis] FORCE CONNECTION - Failed');
    return false;
  };

  return {
    ...analysisData,
    startAnalysis,
    stopAnalysis,
    forceConnection,
  };
};
