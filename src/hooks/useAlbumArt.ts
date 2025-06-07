import { useState, useEffect } from 'react';

/**
 * Custom hook to handle album art loading from audio files
 * Extracts embedded album art from audio file metadata and optionally looks up online
 */
export const useAlbumArt = (songPath?: string, artist?: string, album?: string, enableOnlineLookup: boolean = true) => {
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const loadAlbumArt = async () => {
      if (!songPath && (!artist || !album)) {
        setAlbumArtUrl(null);
        setLoading(false);
        setError(null);
        return;
      }

      if (window.electronAPI) {
        setLoading(true);
        setError(null);

        try {
          // First try to extract album art from the audio file if we have a path
          if (songPath) {
            const albumArtData = await window.electronAPI.extractAlbumArt(songPath);
            
            if (!isMounted) return;

            if (albumArtData && albumArtData.success && albumArtData.imageBuffer) {
              const blob = new Blob([albumArtData.imageBuffer], { type: albumArtData.mimeType || 'image/jpeg' });
              const blobUrl = URL.createObjectURL(blob);
              currentBlobUrl = blobUrl;
              
              setAlbumArtUrl(blobUrl);
              setLoading(false);
              return;
            }
          }

          // If no embedded art found and we have artist/album info, try online lookup (if enabled)
          if (enableOnlineLookup && artist && album) {
            const onlineArtData = await window.electronAPI.lookupAlbumArt(artist, album);

            if (!isMounted) return;

            if (onlineArtData && onlineArtData.success && onlineArtData.imageUrl) {
              setAlbumArtUrl(onlineArtData.imageUrl);
              setLoading(false);
              return;
            }
          }

          // No album art found
          setAlbumArtUrl(null);
          setLoading(false);
        } catch (err) {
          if (!isMounted) return;
          
          console.error('Error loading album art:', err);
          setError(`Failed to load album art: ${(err as Error).message}`);
          setAlbumArtUrl(null);
          setLoading(false);
        }
      } else {
        // Fallback for non-Electron environments
        setAlbumArtUrl(null);
        setLoading(false);
        setError(null);
      }
    };

    loadAlbumArt();

    // Cleanup function to revoke blob URLs
    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [songPath, artist, album, enableOnlineLookup]);

  return { albumArtUrl, loading, error };
};

/**
 * Hook for managing multiple album arts (for playlists)
 */
export const useMultipleAlbumArts = (clips: Array<{ id: string; songPath?: string; artist?: string; album?: string; songName?: string }>, enableOnlineLookup: boolean = true) => {
  const [albumArtUrls, setAlbumArtUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let isMounted = true;
    const blobUrls: string[] = [];

    const loadAllAlbumArts = async () => {
      if (!clips.length) {
        setAlbumArtUrls({});
        setLoading({});
        setErrors({});
        return;
      }

      const newAlbumArtUrls: Record<string, string | null> = {};
      const newLoading: Record<string, boolean> = {};
      const newErrors: Record<string, string | null> = {};

      for (const clip of clips) {
        newLoading[clip.id] = false;
        newErrors[clip.id] = null;

        if (!clip.songPath && (!clip.artist || !clip.album)) {
          newAlbumArtUrls[clip.id] = null;
          continue;
        }

        if (window.electronAPI) {
          newLoading[clip.id] = true;

          try {
            // First try to extract album art from the audio file if we have a path
            if (clip.songPath) {
              const albumArtData = await window.electronAPI.extractAlbumArt(clip.songPath);
              
              if (!isMounted) return;

              if (albumArtData && albumArtData.success && albumArtData.imageBuffer) {
                const blob = new Blob([albumArtData.imageBuffer], { type: albumArtData.mimeType || 'image/jpeg' });
                const blobUrl = URL.createObjectURL(blob);
                blobUrls.push(blobUrl);
                
                newAlbumArtUrls[clip.id] = blobUrl;
                newLoading[clip.id] = false;
                continue;
              }
            }

            // If no embedded art found and we have artist/album info, try online lookup (if enabled)
            if (enableOnlineLookup && clip.artist && clip.album) {
              const onlineArtData = await window.electronAPI.lookupAlbumArt(clip.artist, clip.album);

              if (!isMounted) return;

              if (onlineArtData && onlineArtData.success && onlineArtData.imageUrl) {
                newAlbumArtUrls[clip.id] = onlineArtData.imageUrl;
                newLoading[clip.id] = false;
                continue;
              }
            }

            // No album art found
            newAlbumArtUrls[clip.id] = null;
            newLoading[clip.id] = false;
          } catch (err) {
            if (!isMounted) return;
            
            console.error(`Error loading album art for ${clip.id}:`, err);
            newErrors[clip.id] = `Failed to load album art: ${(err as Error).message}`;
            newAlbumArtUrls[clip.id] = null;
            newLoading[clip.id] = false;
          }
        } else {
          // Fallback for non-Electron environments
          newAlbumArtUrls[clip.id] = null;
        }
      }

      if (isMounted) {
        setAlbumArtUrls(newAlbumArtUrls);
        setLoading(newLoading);
        setErrors(newErrors);
      }
    };

    loadAllAlbumArts();

    // Cleanup function to revoke blob URLs
    return () => {
      isMounted = false;
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [clips, enableOnlineLookup]);

  return { albumArtUrls, loading, errors };
};
