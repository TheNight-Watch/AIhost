"use client";

import { useState } from "react";
import type { VoiceDef } from "@/lib/doubao/voices";

interface Props {
  voice: VoiceDef;
  isSelected: boolean;
  onSelect: (voice: VoiceDef) => void;
}

export default function VoiceCard({ voice, isSelected, onSelect }: Props) {
  const [previewing, setPreviewing] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  async function handlePreview(e: React.MouseEvent) {
    e.stopPropagation();

    if (previewing && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setPreviewing(false);
      return;
    }

    setPreviewing(true);
    try {
      const sampleText =
        voice.locale === "en"
          ? "Hello, welcome to this event. I am your AI host today."
          : "大家好，欢迎来到本次活动。我是您的 AI 主持人。";

      const response = await fetch("/api/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_type: voice.voice_type, text: sampleText }),
      });

      if (!response.ok) throw new Error("Preview failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setAudioElement(audio);
      audio.play();
      audio.onended = () => {
        setPreviewing(false);
        URL.revokeObjectURL(url);
      };
    } catch {
      setPreviewing(false);
    }
  }

  return (
    <div
      style={{
        border: isSelected ? "3px solid #2D6A5C" : "2px solid #333",
        borderRadius: "12px",
        background: isSelected ? "#C8F0E2" : "#FFFDF5",
        overflow: "hidden",
        transition: "all 0.25s",
        position: "relative",
        cursor: "pointer",
        boxShadow: isSelected ? "0 0 0 3px rgba(152,228,201,0.4)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "3px 3px 0 rgba(45,106,92,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
      onClick={() => onSelect(voice)}
    >
      {/* Selected badge */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            fontSize: "9px",
            fontWeight: 700,
            paddingLeft: "8px",
            paddingRight: "8px",
            paddingTop: "2px",
            paddingBottom: "2px",
            borderRadius: "6px",
            letterSpacing: "0.06em",
            background: "#2D6A5C",
            color: "#FFF8E7",
          }}
        >
          SELECTED
        </div>
      )}

      {/* Card header */}
      <div
        style={{
          paddingLeft: "14px",
          paddingRight: "14px",
          paddingTop: "16px",
          paddingBottom: "12px",
          textAlign: "center",
          borderBottom: "2px solid",
          borderStyle: "dashed",
          borderColor: isSelected ? "#6BD4AF" : "#ddd",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            marginLeft: "auto",
            marginRight: "auto",
            marginBottom: "10px",
            borderRadius: "12px",
            border: "2px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            background: voice.category === "female" ? "#FFD4B8" : voice.category === "male" ? "#98E4C9" : "#E8E0D0",
            borderColor: "#333",
          }}
        >
          {voice.category === "female" ? "♀" : voice.category === "male" ? "♂" : "🌐"}
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "17px", color: "#2D6A5C" }}>
          {voice.name}
        </div>
        <div style={{ fontSize: "10px", marginTop: "4px", color: "#888" }}>{voice.description}</div>
        <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "9px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "2px",
              paddingBottom: "2px",
              borderRadius: "4px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              background: "rgba(45,106,92,0.1)",
              color: "#2D6A5C",
            }}
          >
            {voice.use_case}
          </span>
          <span
            style={{
              fontSize: "9px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "2px",
              paddingBottom: "2px",
              borderRadius: "4px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              background: "rgba(45,106,92,0.08)",
              color: "#2D6A5C",
            }}
          >
            {voice.locale === "en" ? "EN" : "ZH"}
          </span>
        </div>

        {/* Waveform animation when previewing */}
        {previewing && (
          <div style={{ display: "flex", gap: "2px", justifyContent: "center", marginTop: "8px", height: "20px", alignItems: "center" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "3px",
                  borderRadius: "2px",
                  background: "#2D6A5C",
                  height: "4px",
                  animationName: "wave",
                  animationDuration: "0.8s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 0.07}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px", padding: "12px" }}>
        <button
          onClick={handlePreview}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: previewing ? "#FFD4B8" : "#E8E0D0",
            color: "#333",
            border: "2px solid #333",
            borderRadius: "8px",
            cursor: "pointer",
            animation: previewing ? "pulse-preview 1s infinite" : "none",
          }}
        >
          {previewing ? "■ Stop" : "▶ Preview"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(voice); }}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: isSelected ? "#2D6A5C" : "#98E4C9",
            color: isSelected ? "#FFF8E7" : "#2D6A5C",
            border: isSelected ? "2px solid #2D6A5C" : "2px solid #2D6A5C",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {isSelected ? "✓ Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}
