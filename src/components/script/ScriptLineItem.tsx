"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ScriptLine } from "@/types";

interface Props {
  line: ScriptLine;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onGenerateAudio: (id: string) => Promise<void>;
  onPlayPause: (line: ScriptLine) => void;
  onDelete?: () => void;
  selectMode?: boolean;
  isChecked?: boolean;
  onCheckToggle?: (id: string) => void;
}

export default function ScriptLineItem({
  line,
  index,
  isSelected,
  isPlaying,
  onSelect,
  onContentChange,
  onGenerateAudio,
  onPlayPause,
  onDelete,
  selectMode,
  isChecked,
  onCheckToggle,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [line.content, autoResize]);

  const sectionLabel = line.speaker || `Section ${index + 1}`;
  const secNum = String(index + 1).padStart(2, "0");
  const hasAudio = !!line.audio_url;

  const durationSec = line.duration_ms ? Math.round(line.duration_ms / 1000) : null;
  const durationDisplay = durationSec
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
    : "--:--";

  async function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation();
    setGenerating(true);
    try {
      await onGenerateAudio(line.id);
    } finally {
      setGenerating(false);
    }
  }

  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation();
    onPlayPause(line);
  }

  const bg = isPlaying ? "#FFD4B8" : isSelected ? "#98E4C9" : "transparent";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: selectMode ? "40px 160px 1fr 110px" : "160px 1fr 110px",
        borderBottom: "2px dashed",
        borderColor: "#ddd",
        minHeight: "90px",
        background: bg,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => selectMode && onCheckToggle ? onCheckToggle(line.id) : onSelect(line.id)}
    >
      {/* Checkbox column in select mode */}
      {selectMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "2px dashed",
            borderColor: "#ddd",
          }}
        >
          <div
            onClick={(e) => { e.stopPropagation(); onCheckToggle?.(line.id); }}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "4px",
              border: "2px solid #2D6A5C",
              background: isChecked ? "#2D6A5C" : "#FFF8E7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {isChecked && (
              <span style={{ color: "#FFF8E7", fontSize: "14px", fontWeight: 700, lineHeight: 1 }}>✓</span>
            )}
          </div>
        </div>
      )}
      {/* Left: section label */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "6px",
          padding: "16px",
          borderRight: "2px dashed",
          borderColor: "#ddd",
        }}
      >
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "17px", color: "#2D6A5C", lineHeight: 1.2 }}>
          {sectionLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.05em", color: "#999" }}>
            SEC. {secNum}
          </span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "#ccc",
                cursor: "pointer",
                padding: "0 2px",
                lineHeight: 1,
              }}
              title="Delete line"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Center: text + audio bar */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", padding: "16px" }}>
        <textarea
          ref={textareaRef}
          value={line.content}
          onChange={(e) => {
            e.stopPropagation();
            onContentChange(line.id, e.target.value);
            autoResize();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            lineHeight: 1.7,
            color: "#333",
            background: "transparent",
            border: "none",
            borderBottom: "2px dashed #ccc",
            padding: "6px 0",
            outline: "none",
            resize: "none",
            width: "100%",
            minHeight: "40px",
            overflow: "hidden",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottom = "2px solid #2D6A5C";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottom = "2px dashed #ccc";
          }}
        />

        {/* Audio bar */}
        {hasAudio && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePlay}
              style={{
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #333",
                borderRadius: "8px",
                background: isPlaying ? "#2D6A5C" : "#FFF8E7",
                color: isPlaying ? "#FFF8E7" : "#333",
                cursor: "pointer",
                fontSize: "10px",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            {/* Mini waveform */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, height: "20px" }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "3px",
                    borderRadius: "2px",
                    background: "#2D6A5C",
                    height: `${Math.random() * 14 + 4}px`,
                    opacity: isPlaying && i < 12 ? 0.9 : 0.25,
                    animationName: isPlaying ? "wave" : "none",
                    animationDuration: "0.8s",
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                    animationDelay: `${i * 0.03}s`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", flexShrink: 0, color: "#888" }}>
              {durationDisplay}
            </span>
          </div>
        )}
      </div>

      {/* Right: generate button */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "16px",
          borderLeft: "2px dashed",
          borderColor: "#ddd",
        }}
      >
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: hasAudio ? "#2D6A5C" : "#98E4C9",
            color: hasAudio ? "#FFF8E7" : "#2D6A5C",
            border: hasAudio ? "2px solid #2D6A5C" : "2px solid #2D6A5C",
            borderRadius: "10px",
            padding: "6px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 700,
            cursor: generating ? "not-allowed" : "pointer",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            opacity: generating ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {generating ? "..." : hasAudio ? "DONE" : "GENERATE"}
        </button>
        <span
          style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: isPlaying ? "#333" : "#aaa" }}
        >
          {isPlaying ? "PLAYING" : hasAudio ? `${durationDisplay}` : "PENDING"}
        </span>
      </div>
    </div>
  );
}
