import React from "react";

interface Clip {
  id: string;
  title: string;
  url: string;
}

interface PlaylistProps {
  playlist: Clip[];
  removeClip: (id: string) => void;
  reorderClip: (from: number, to: number) => void;
  clearPlaylist: () => void;
  isLoading: boolean;
}

export const Playlist: React.FC<PlaylistProps> = ({
  playlist,
  removeClip,
  reorderClip,
  clearPlaylist,
  isLoading,
}) => {
  return (
    <section className="ph-playlist">
      <div className="ph-playlist-header">
        <h2>Playlist ({playlist.length}/60)</h2>
        <button className="ph-btn-clear" onClick={clearPlaylist} disabled={isLoading}>
          Clear All
        </button>
      </div>
      <ul>
        {playlist.map((clip, idx) => (
          <li key={clip.id} className="ph-clip">
            <span className="ph-clip-index">{idx + 1}.</span>
            <span className="ph-clip-title">{clip.title}</span>
            <button className="ph-btn-remove" onClick={() => removeClip(clip.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      {playlist.length === 60 && (
        <div className="ph-ready">Ready to start your Power Hour! 🥳</div>
      )}
    </section>
  );
};