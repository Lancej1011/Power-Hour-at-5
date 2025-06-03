import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface Clip {
  id: string;
  url: string;
  title: string;
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
}

interface PowerHourEditorProps {
  onStart: (playlist: Playlist) => void;
}

const PowerHourEditor: React.FC<PowerHourEditorProps> = ({ onStart }) => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [playlistName, setPlaylistName] = useState<string>("My Power Hour");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved playlists (from IPC)
  useEffect(() => {
    // Optionally: Load saved playlists for selection/edit
  }, []);

  async function handleAddClip(url: string) {
    setError(null);
    setLoading(true);
    try {
      // Fetch YouTube metadata via backend IPC
      const meta = await (window as any).electronAPI.fetchYoutubeMeta(url);
      setClips((prev) => [
        ...prev,
        {
          id: meta.id || uuidv4(),
          url: meta.webpage_url || url,
          title: meta.title || url,
        },
      ]);
      setInput("");
    } catch (e: any) {
      setError(e.message || "Failed to add clip.");
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveClip(id: string) {
    setClips((prev) => prev.filter((clip) => clip.id !== id));
  }

  function handleReorderClip(from: number, to: number) {
    setClips((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function handleClear() {
    setClips([]);
  }

  function handleStart() {
    onStart({
      id: uuidv4(),
      name: playlistName,
      clips,
    });
  }

  return (
    <div className="ph-main">
      <header className="ph-header">
        <h1>PowerHour 🎉</h1>
        <p>
          Build your ultimate Power Hour playlist.<br />
          Paste YouTube links, search songs, drag & drop, and let's play!
        </p>
      </header>
      <div className="ph-form" style={{ marginBottom: 16 }}>
        <input
          className="ph-input"
          type="text"
          placeholder="Paste YouTube URL..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          className="ph-btn"
          disabled={loading || !input.trim()}
          onClick={() => handleAddClip(input.trim())}
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
      <input
        className="ph-input"
        style={{ width: "100%", marginBottom: 12 }}
        type="text"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        placeholder="Playlist name"
      />
      <section className="ph-playlist">
        <div className="ph-playlist-header">
          <h2>Playlist ({clips.length}/60)</h2>
          <button className="ph-btn-clear" onClick={handleClear} disabled={loading || clips.length === 0}>
            Clear All
          </button>
        </div>
        <ul>
          {clips.map((clip, idx) => (
            <li key={clip.id} className="ph-clip">
              <span className="ph-clip-index">{idx + 1}.</span>
              <span className="ph-clip-title">{clip.title}</span>
              <button className="ph-btn-remove" onClick={() => handleRemoveClip(clip.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        {clips.length === 60 && (
          <div className="ph-ready">Ready to start your Power Hour! 🥳</div>
        )}
      </section>
      {error && (
        <div className="ph-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      <button
        className="ph-btn"
        style={{ width: "100%", marginTop: 24, fontSize: "1.2rem" }}
        disabled={clips.length < 1 || clips.length > 60}
        onClick={handleStart}
      >
        Start Power Hour
      </button>
    </div>
  );
};

export default PowerHourEditor;