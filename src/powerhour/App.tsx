import React, { useState } from "react";
import { PowerHourForm } from "./components/PowerHourForm";
import { Playlist } from "./components/Playlist";
import { usePlaylist } from "./hooks/usePlaylist";
import "./App.css";

const App: React.FC = () => {
  const {
    playlist,
    addClip,
    removeClip,
    reorderClip,
    clearPlaylist,
    isLoading,
    error,
  } = usePlaylist();

  return (
    <div className="ph-container">
      <header className="ph-header">
        <h1>PowerHour 🎉</h1>
        <p>
          Create the ultimate Power Hour, instantly. Paste YouTube links or
          search for videos, and build your 60-minute playlist.
        </p>
      </header>
      <main className="ph-main">
        <PowerHourForm addClip={addClip} isLoading={isLoading} />
        <Playlist
          playlist={playlist}
          removeClip={removeClip}
          reorderClip={reorderClip}
          clearPlaylist={clearPlaylist}
          isLoading={isLoading}
        />
      </main>
      {error && (
        <div className="ph-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      <footer className="ph-footer">
        <span>
          Built with ❤️ | <a href="https://github.com/yt-dlp/yt-dlp">yt-dlp</a>{" "}
          powered
        </span>
      </footer>
    </div>
  );
};

export default App;