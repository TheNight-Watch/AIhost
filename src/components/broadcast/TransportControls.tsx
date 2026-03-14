"use client";

type Speed = 0.5 | 1 | 1.5 | 2;

interface Props {
  isPlaying: boolean;
  speed: Speed;
  volume: number;
  canPrev: boolean;
  canNext: boolean;
  currentTime: number;
  totalDuration: number;
  onPlayPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeedChange: (speed: Speed) => void;
  onVolumeChange: (volume: number) => void;
}

export default function TransportControls({
  isPlaying,
  speed,
  volume,
  canPrev,
  canNext,
  currentTime,
  totalDuration,
  onPlayPause,
  onStop,
  onPrev,
  onNext,
  onSpeedChange,
  onVolumeChange,
}: Props) {
  const speeds: Speed[] = [0.5, 1, 1.5, 2];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const ctrlBtnStyle = (active?: boolean): React.CSSProperties => ({
    width: "40px",
    height: "40px",
    border: `2px solid ${active ? "#98E4C9" : "#555"}`,
    borderRadius: "10px",
    background: "#2A2A2A",
    color: active ? "#98E4C9" : "#FFF8E7",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    transition: "all 0.15s",
    boxShadow: "0 3px 0 #1A1A1A",
    position: "relative" as const,
    top: 0,
    flexShrink: 0,
  });

  return (
    <div
      style={{ display: "flex", alignItems: "center", height: "72px", paddingLeft: "24px", paddingRight: "24px", gap: "16px", background: "#333", borderTop: "2px solid #444" }}
    >
      {/* Transport buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={!canPrev}
          style={{
            ...ctrlBtnStyle(),
            opacity: canPrev ? 1 : 0.4,
            cursor: canPrev ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => { if (canPrev) { e.currentTarget.style.borderColor = "#98E4C9"; e.currentTarget.style.color = "#98E4C9"; e.currentTarget.style.top = "1px"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#FFF8E7"; e.currentTarget.style.top = "0px"; }}
        >
          ⏮
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          style={{
            width: "50px",
            height: "50px",
            border: "2px solid",
            borderColor: isPlaying ? "#CC8866" : "#2D6A5C",
            borderRadius: "14px",
            background: isPlaying ? "#FFD4B8" : "#98E4C9",
            color: isPlaying ? "#333" : "#2D6A5C",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            boxShadow: isPlaying ? "0 4px 0 #CC8866" : "0 4px 0 #2D6A5C",
            position: "relative",
            top: 0,
            flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.top = "1px"; }}
          onMouseLeave={(e) => { e.currentTarget.style.top = "0px"; }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!canNext}
          style={{
            ...ctrlBtnStyle(),
            opacity: canNext ? 1 : 0.4,
            cursor: canNext ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => { if (canNext) { e.currentTarget.style.borderColor = "#98E4C9"; e.currentTarget.style.color = "#98E4C9"; e.currentTarget.style.top = "1px"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#FFF8E7"; e.currentTarget.style.top = "0px"; }}
        >
          ⏭
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          style={{
            ...ctrlBtnStyle(),
            background: "#FF6B6B",
            borderColor: "#CC4444",
            color: "#fff",
            boxShadow: "0 3px 0 #CC4444",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.top = "1px"; }}
          onMouseLeave={(e) => { e.currentTarget.style.top = "0px"; }}
        >
          ■
        </button>
      </div>

      {/* Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "16px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>VOL</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          style={{
            width: "96px",
            height: "6px",
            borderRadius: "3px",
            cursor: "pointer",
            appearance: "none",
            background: `linear-gradient(to right, #98E4C9 ${volume * 100}%, #444 ${volume * 100}%)`,
            outline: "none",
          }}
        />
      </div>

      {/* Speed */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "16px" }}>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            style={{
              padding: "4px 8px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 600,
              background: speed === s ? "#2D6A5C" : "transparent",
              border: `1.5px solid ${speed === s ? "#2D6A5C" : "#555"}`,
              borderRadius: "4px",
              color: speed === s ? "#FFF8E7" : "#888",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Time display */}
      <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em", color: "#98E4C9" }}>
        {formatTime(currentTime)}
        <span style={{ marginLeft: "4px", marginRight: "4px", color: "#555" }}>/</span>
        <span style={{ color: "#666" }}>{formatTime(totalDuration)}</span>
      </div>
    </div>
  );
}
