"use client";

import { useState, useRef, useCallback } from "react";
import type { ScriptLine } from "@/types";
import ScriptLineItem from "./ScriptLineItem";

interface Props {
  lines: ScriptLine[];
  eventId: string;
  voiceType?: string;
  onLinesUpdate: (lines: ScriptLine[]) => void;
  onLineSelect: (id: string | null) => void;
  selectedLineId: string | null;
}

export default function ScriptLineList({
  lines,
  eventId,
  voiceType,
  onLinesUpdate,
  onLineSelect,
  selectedLineId,
}: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function handleContentChange(id: string, content: string) {
    onLinesUpdate(lines.map((l) => (l.id === id ? { ...l, content } : l)));
  }

  function handleAddLine(afterIndex: number) {
    const newLine: ScriptLine = {
      id: crypto.randomUUID(),
      event_id: eventId,
      sort_order: afterIndex + 2,
      speaker: "host",
      content: "",
      audio_url: null,
      duration_ms: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...lines];
    updated.splice(afterIndex + 1, 0, newLine);
    // Re-number sort_order
    onLinesUpdate(updated.map((l, i) => ({ ...l, sort_order: i + 1 })));
    onLineSelect(newLine.id);
  }

  function handleDeleteLine(id: string) {
    if (lines.length <= 1) return;
    const updated = lines.filter((l) => l.id !== id);
    onLinesUpdate(updated.map((l, i) => ({ ...l, sort_order: i + 1 })));
    if (selectedLineId === id) onLineSelect(null);
  }

  async function handleGenerateAudio(lineId: string) {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;

    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_id: lineId,
        event_id: eventId,
        content: line.content,
        voice_type: voiceType || "zh_female_vv_uranus_bigtts",
      }),
    });

    const data = await response.json();
    if (data.success) {
      // Use audio_url if available, otherwise convert audio_base64 to a data URL
      const audioUrl = data.audio_url
        || (data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : null);

      onLinesUpdate(
        lines.map((l) =>
          l.id === lineId
            ? { ...l, audio_url: audioUrl || l.audio_url, duration_ms: data.duration_ms || l.duration_ms }
            : l
        )
      );
    }
  }

  async function handleBatchGenerate() {
    setBatchGenerating(true);
    setBatchProgress("Generating...");
    try {
      const response = await fetch("/api/generate-audio-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, voice_type: voiceType }),
      });

      const data = await response.json();
      if (data.success) {
        setBatchProgress(`Done: ${data.generated}/${data.total}`);
        // Refresh lines from server
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: updated } = await supabase
          .from("script_lines")
          .select("*")
          .eq("event_id", eventId)
          .order("sort_order");
        if (updated) onLinesUpdate(updated);
      }
    } catch {
      setBatchProgress("Error");
    } finally {
      setBatchGenerating(false);
      setTimeout(() => setBatchProgress(""), 3000);
    }
  }

  function handlePlayPause(line: ScriptLine) {
    if (!line.audio_url) return;

    if (playingId === line.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Play new
    const audio = new Audio(line.audio_url);
    audioRef.current = audio;
    setPlayingId(line.id);
    audio.play();
    audio.onended = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
  }

  const totalLines = lines.length;
  const generatedCount = lines.filter((l) => !!l.audio_url).length;
  const totalDurationMs = lines.reduce((sum, l) => sum + (l.duration_ms || 0), 0);
  const totalDurationMin = Math.floor(totalDurationMs / 60000);
  const totalDurationSec = Math.round((totalDurationMs % 60000) / 1000);
  const durationStr = totalDurationMs ? `~${totalDurationMin}:${String(totalDurationSec).padStart(2, "00")}` : "--:--";

  return (
    <div style={{ border: "2px solid #333", borderRadius: "14px", overflow: "hidden", background: "#FFF8E7" }}>
      {/* Window bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "12px", paddingRight: "12px", height: "36px", borderBottom: "2px solid #333", background: "#E8E0D0", borderColor: "#333" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FF6B6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FFDA6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#6BD4AF", borderColor: "#333" }} />
        </div>
        <span style={{ flex: 1, textAlign: "center", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#333" }}>
          script_lines.txt
        </span>
      </div>

      {/* Action bar */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", borderBottom: "2px dashed", borderColor: "#ddd", background: "#FFFDF5" }}
      >
        <button
          onClick={handleBatchGenerate}
          disabled={batchGenerating}
          style={{
            background: "#2D6A5C",
            color: "#FFF8E7",
            border: "2px solid #333",
            borderRadius: "10px",
            padding: "8px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: batchGenerating ? "not-allowed" : "pointer",
            opacity: batchGenerating ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {batchGenerating ? `▶ ${batchProgress}` : "▶ Generate All Audio"}
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", letterSpacing: "0.05em", color: "#aaa" }}>
          {totalLines} lines // {durationStr} total
        </span>
      </div>

      {/* Pixel divider */}
      <div style={{ display: "flex", gap: "4px", justifyContent: "center", paddingTop: "6px", paddingBottom: "6px", background: "#FFFDF5" }}>
        {["#98E4C9", "#FFD4B8", "#2D6A5C", "#FFF8E7", "#98E4C9", "#FFD4B8"].map((c, i) => (
          <div key={i} style={{ width: "6px", height: "6px", borderRadius: "2px", background: c, opacity: 0.6 }} />
        ))}
      </div>

      {/* Lines */}
      {lines.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", fontSize: "12px", color: "#aaa" }}>
          <p>No script lines yet. Generate script from the upload page.</p>
          <button
            onClick={() => handleAddLine(-1)}
            style={{
              marginTop: "12px",
              background: "#98E4C9",
              color: "#2D6A5C",
              border: "2px solid #2D6A5C",
              borderRadius: "8px",
              padding: "8px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Add First Line
          </button>
        </div>
      ) : (
        <>
          {lines.map((line, i) => (
            <div key={line.id}>
              <ScriptLineItem
                line={line}
                index={i}
                isSelected={selectedLineId === line.id}
                isPlaying={playingId === line.id}
                onSelect={onLineSelect}
                onContentChange={handleContentChange}
                onGenerateAudio={handleGenerateAudio}
                onPlayPause={handlePlayPause}
                onDelete={lines.length > 1 ? () => handleDeleteLine(line.id) : undefined}
              />
              {/* Add line button between items */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "2px 0",
                  background: "#FFFDF5",
                  opacity: 0.4,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
              >
                <button
                  onClick={() => handleAddLine(i)}
                  style={{
                    background: "transparent",
                    border: "1px dashed #aaa",
                    borderRadius: "4px",
                    padding: "1px 12px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "#aaa",
                    cursor: "pointer",
                  }}
                >
                  + insert line
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
