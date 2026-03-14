"use client";

import type { ScriptLine } from "@/types";

interface Props {
  currentLine: ScriptLine | null;
  isPlaying: boolean;
  progress: number; // 0-100
  currentTime: number; // seconds
  totalDuration: number; // seconds
}

export default function Teleprompter({ currentLine, isPlaying, progress, currentTime, totalDuration }: Props) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, paddingLeft: "40px", paddingRight: "40px" }}>
      {/* Now playing label */}
      <div
        style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px", color: "#98E4C9" }}
      >
        {isPlaying ? "▶ NOW PLAYING" : "⏸ PAUSED"}
      </div>

      {/* Section label */}
      {currentLine && (
        <div
          style={{ marginBottom: "32px", fontFamily: "var(--font-serif)", fontSize: "18px", color: "#FFD4B8" }}
        >
          {currentLine.speaker || "Host"}
        </div>
      )}

      {/* Main teleprompter text */}
      <div style={{ maxWidth: "700px", textAlign: "center", position: "relative" }}>
        {/* Speaker badge */}
        <div
          style={{ display: "inline-block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: "10px", paddingRight: "10px", paddingTop: "2px", paddingBottom: "2px", borderRadius: "4px", marginBottom: "16px", fontFamily: "var(--font-mono)", color: "#98E4C9", background: "rgba(152,228,201,0.15)" }}
        >
          AI HOST
        </div>

        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "32px",
            lineHeight: 1.6,
            color: "#FFF8E7",
            transition: "all 0.5s",
            minHeight: "80px",
          }}
        >
          {currentLine?.content || "Ready to broadcast..."}
        </div>
      </div>

      {/* Waveform visualization */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", height: "60px", marginTop: "32px", marginBottom: "32px" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "4px",
              borderRadius: "2px",
              background: i < 20 ? "#555" : "#98E4C9",
              height: `${Math.random() * 40 + 8}px`,
              animationName: isPlaying ? "wave" : "none",
              animationDuration: "0.8s",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDelay: `${i * 0.04}s`,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <div
          style={{ width: "100%", height: "6px", borderRadius: "2px", overflow: "hidden", marginBottom: "8px", background: "#444" }}
        >
          <div
            style={{ height: "100%", borderRadius: "2px", transition: "all 0.3s", background: "#98E4C9", width: `${progress}%` }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", letterSpacing: "0.08em", color: "#666" }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
