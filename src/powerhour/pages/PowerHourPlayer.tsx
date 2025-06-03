import React, { useState, useEffect, useRef } from "react";

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

interface PowerHourPlayerProps {
  playlist: Playlist;
  onExit: () => void;
}

const SECONDS_PER_CLIP = 60;

const PowerHourPlayer: React.FC<PowerHourPlayerProps> = ({ playlist, onExit }) => {
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(SECONDS_PER_CLIP);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s === 1) {
            handleNext();
            return SECONDS_PER_CLIP;
          }
          return s - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, current]);

  function handleNext() {
    if (current < playlist.clips.length - 1) {
      setCurrent((c) => c + 1);
      setSeconds(SECONDS_PER_CLIP);
    } else {
      setPlaying(false);
    }
  }

  function handlePrev() {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setSeconds(SECONDS_PER_CLIP);
    }
  }

  function handlePause() {
    setPlaying((p) => !p);
  }

  const currentClip = playlist.clips[current];

  return (
    <div className="ph-main">
      <header className="ph-header">
        <h2>
          Playing: {playlist.name} <br />
          <span style={{ fontSize: "1.1rem", color: "#ffd600" }}>
            Clip {current + 1} / {playlist.clips.length}
          </span>
        </h2>
      </header>
      <div className="ph-player-clip">
        <div className="ph-clip-title" style={{ fontSize: "2rem", marginBottom: 8 }}>
          {currentClip.title}
        </div>
        <div className="ph-timer">
          <span>
            {Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(seconds % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <div className="ph-player-controls" style={{ marginTop: 18 }}>
          <button className="ph-btn" onClick={handlePrev} disabled={current === 0}>
            ◀
          </button>
          <button className="ph-btn" onClick={handlePause}>
            {playing ? "Pause" : "Play"}
          </button>
          <button className="ph-btn" onClick={handleNext} disabled={current === playlist.clips.length - 1}>
            ▶
          </button>
        </div>
      </div>
      <div style={{ margin: "24px auto 0", textAlign: "center" }}>
        <iframe
          width="420"
          height="236"
          src={`https://www.youtube.com/embed/${currentClip.url.split("v=")[1]?.split("&")[0]}?autoplay=1&start=0&controls=1`}
          title={currentClip.title}
          allow="autoplay; encrypted-media"
          style={{
            borderRadius: "1rem",
            border: "2px solid #ffd600",
            width: "100%",
            maxWidth: "500px",
            margin: "auto"
          }}
        ></iframe>
      </div>
      <button
        className="ph-btn"
        style={{ width: "100%", marginTop: 32 }}
        onClick={onExit}
      >
        Exit to Editor
      </button>
    </div>
  );
};

export default PowerHourPlayer;