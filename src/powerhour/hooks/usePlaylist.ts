import { useState } from "react";
import { fetchYoutubeMeta } from "../backend/yt-dlp";

interface Clip {
  id: string;
  title: string;
  url: string;
}

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addClip = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (playlist.length >= 60) {
        throw new Error("Power Hour is full! (60 clips)");
      }
      // Check for duplicates
      if (playlist.some((clip) => clip.url === url)) {
        throw new Error("Clip already in playlist.");
      }
      // Fetch YouTube metadata using yt-dlp
      const meta = await fetchYoutubeMeta(url);
      setPlaylist((prev) => [
        ...prev,
        {
          id: meta.id,
          title: meta.title,
          url: meta.webpage_url,
        },
      ]);
    } catch (e: any) {
      setError(e.message || "Failed to add clip.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeClip = (id: string) => {
    setPlaylist((prev) => prev.filter((c) => c.id !== id));
  };

  const reorderClip = (from: number, to: number) => {
    setPlaylist((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const clearPlaylist = () => setPlaylist([]);

  return {
    playlist,
    addClip,
    removeClip,
    reorderClip,
    clearPlaylist,
    isLoading,
    error,
  };
}