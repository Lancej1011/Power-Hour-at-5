import React, { useState } from "react";
import PowerHourEditor from "./PowerHourEditor";
import PowerHourPlayer from "./PowerHourPlayer";

type View = "editor" | "player";

const PowerHourHome: React.FC = () => {
  const [view, setView] = useState<View>("editor");
  const [playlist, setPlaylist] = useState<any | null>(null);

  return (
    <div className="ph-container">
      {view === "editor" && (
        <PowerHourEditor
          onStart={(pl) => {
            setPlaylist(pl);
            setView("player");
          }}
        />
      )}
      {view === "player" && playlist && (
        <PowerHourPlayer
          playlist={playlist}
          onExit={() => setView("editor")}
        />
      )}
    </div>
  );
};

export default PowerHourHome;