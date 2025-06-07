import { useState, useEffect } from 'react';

/**
 * Custom hook to handle playlist image loading from file paths
 * Converts local file paths to blob URLs for display in Electron
 */
export const usePlaylistImage = (imagePath?: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const loadImage = async () => {
      if (!imagePath) {
        setImageUrl(null);
        setLoading(false);
        setError(null);
        return;
      }

      // If it's already a blob URL or HTTP URL, use it directly
      if (imagePath.startsWith('blob:') || imagePath.startsWith('http')) {
        setImageUrl(imagePath);
        setLoading(false);
        setError(null);
        return;
      }

      // For local file paths in Electron, convert to blob URL
      if (window.electronAPI) {
        setLoading(true);
        setError(null);

        try {
          const buffer = await window.electronAPI.getFileBlob(imagePath);
          
          if (!isMounted) return;

          // Determine MIME type based on file extension
          const extension = imagePath.toLowerCase().split('.').pop();
          let mimeType = 'image/jpeg'; // default
          
          switch (extension) {
            case 'png':
              mimeType = 'image/png';
              break;
            case 'gif':
              mimeType = 'image/gif';
              break;
            case 'webp':
              mimeType = 'image/webp';
              break;
            case 'jpg':
            case 'jpeg':
            default:
              mimeType = 'image/jpeg';
              break;
          }

          const blob = new Blob([buffer], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          
          setImageUrl(blobUrl);
          setLoading(false);
        } catch (err) {
          if (!isMounted) return;
          
          console.error('Error loading playlist image:', err);
          setError(`Failed to load image: ${(err as Error).message}`);
          setImageUrl(null);
          setLoading(false);
        }
      } else {
        // Fallback for non-Electron environments
        setImageUrl(imagePath);
        setLoading(false);
        setError(null);
      }
    };

    loadImage();

    // Cleanup function to revoke blob URLs
    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [imagePath]);

  return { imageUrl, loading, error };
};

/**
 * Hook for managing multiple playlist images
 * Useful for components that display multiple playlists
 */
export const usePlaylistImages = (playlists: Array<{ id: string; imagePath?: string }>) => {
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let isMounted = true;
    const blobUrls: string[] = [];

    const loadImages = async () => {
      const newImageUrls: Record<string, string | null> = {};
      const newLoading: Record<string, boolean> = {};
      const newErrors: Record<string, string | null> = {};

      for (const playlist of playlists) {
        newLoading[playlist.id] = false;
        newErrors[playlist.id] = null;

        if (!playlist.imagePath) {
          newImageUrls[playlist.id] = null;
          continue;
        }

        // If it's already a blob URL or HTTP URL, use it directly
        if (playlist.imagePath.startsWith('blob:') || playlist.imagePath.startsWith('http')) {
          newImageUrls[playlist.id] = playlist.imagePath;
          continue;
        }

        // For local file paths in Electron, convert to blob URL
        if (window.electronAPI) {
          newLoading[playlist.id] = true;

          try {
            const buffer = await window.electronAPI.getFileBlob(playlist.imagePath);
            
            if (!isMounted) return;

            // Determine MIME type based on file extension
            const extension = playlist.imagePath.toLowerCase().split('.').pop();
            let mimeType = 'image/jpeg'; // default
            
            switch (extension) {
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'webp':
                mimeType = 'image/webp';
                break;
              case 'jpg':
              case 'jpeg':
              default:
                mimeType = 'image/jpeg';
                break;
            }

            const blob = new Blob([buffer], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            blobUrls.push(blobUrl);
            
            newImageUrls[playlist.id] = blobUrl;
            newLoading[playlist.id] = false;
          } catch (err) {
            if (!isMounted) return;
            
            console.error(`Error loading playlist image for ${playlist.id}:`, err);
            newErrors[playlist.id] = `Failed to load image: ${(err as Error).message}`;
            newImageUrls[playlist.id] = null;
            newLoading[playlist.id] = false;
          }
        } else {
          // Fallback for non-Electron environments
          newImageUrls[playlist.id] = playlist.imagePath;
        }
      }

      if (isMounted) {
        setImageUrls(newImageUrls);
        setLoading(newLoading);
        setErrors(newErrors);
      }
    };

    loadImages();

    // Cleanup function to revoke blob URLs
    return () => {
      isMounted = false;
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [playlists]);

  return { imageUrls, loading, errors };
};
