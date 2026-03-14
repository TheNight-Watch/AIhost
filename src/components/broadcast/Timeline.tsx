"use client";

import type { ScriptLine } from "@/types";

interface Props {
  lines: ScriptLine[];
  currentIndex: number;
  onJump: (index: number) => void;
}

export default function Timeline({ lines, currentIndex, onJump }: Props) {
  // Calculate cumulative times
  let elapsed = 0;
  const timings: { start: number; end: number }[] = [];
  for (const line of lines) {
    const dur = (line.duration_ms || 8000) / 1000;
    timings.push({ start: elapsed, end: elapsed + dur });
    elapsed += dur;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#1E1E1E", borderRight: "2px solid #444" }}
    >
      {/* Header */}
      <div
        style={{ paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #333", color: "#666", background: "#252525", borderColor: "#333" }}
      >
        Timeline // Script Lines
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, paddingTop: "8px", paddingBottom: "8px" }}>
        {lines.map((line, i) => {
          const state = i < currentIndex ? "past" : i === currentIndex ? "current" : "upcoming";

          return (
            <div
              key={line.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                borderLeft: `3px solid ${state === "current" ? "#98E4C9" : "transparent"}`,
                background: state === "current" ? "rgba(152,228,201,0.15)" : "transparent",
                opacity: state === "past" ? 0.5 : state === "upcoming" ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (state !== "current") e.currentTarget.style.background = "rgba(152,228,201,0.08)"; }}
              onMouseLeave={(e) => { if (state !== "current") e.currentTarget.style.background = "transparent"; }}
              onClick={() => onJump(i)}
            >
              {/* Marker */}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: "2px",
                  border: "2px solid",
                  borderColor: state === "current" ? "#2D6A5C" : state === "past" ? "#6BD4AF" : "#555",
                  background: state === "current" ? "#98E4C9" : state === "past" ? "#6BD4AF" : "#2A2A2A",
                  color: state === "current" ? "#2D6A5C" : state === "past" ? "#1E1E1E" : "#888",
                  animation: state === "current" ? "currentPulse 2s infinite" : "none",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "2px",
                    color: state === "past" ? "#888" : "#FFF8E7",
                    textDecoration: state === "past" ? "line-through" : "none",
                    textDecorationColor: "#6BD4AF",
                  }}
                >
                  {line.speaker || `Line ${i + 1}`}
                </div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  {formatTime(timings[i].start)} - {formatTime(timings[i].end)}
                  {state === "past" && (
                    <span style={{ marginLeft: "4px", color: "#6BD4AF" }}>✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
