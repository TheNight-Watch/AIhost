"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ScriptLine } from "@/types";
import ScriptLineItem from "./ScriptLineItem";

interface Props {
  lines: ScriptLine[];
  eventId: string;
  voiceType?: string;
  onLinesUpdate: (lines: ScriptLine[]) => void;
  onLineSelect: (id: string | null) => void;
  selectedLineId: string | null;
  broadcastMode?: boolean;
  broadcastIndex?: number;
  broadcastPhase?: string;
  enhancedText?: string | null;
  enhancedLineIndex?: number;
}

export default function ScriptLineList({
  lines,
  eventId,
  voiceType,
  onLinesUpdate,
  onLineSelect,
  selectedLineId,
  broadcastMode,
  broadcastIndex = -1,
  broadcastPhase,
  enhancedText,
  enhancedLineIndex = -1,
}: Props) {
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // No auto-scroll — user controls scroll manually
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  async function handleDeleteLine(id: string) {
    if (lines.length <= 1) return;
    if (!window.confirm("Delete this line? This action cannot be undone.")) return;

    const updated = lines.filter((l) => l.id !== id).map((l, i) => ({ ...l, sort_order: i + 1 }));
    onLinesUpdate(updated);
    if (selectedLineId === id) onLineSelect(null);

    // Persist to Supabase
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("script_lines").delete().eq("id", id);
      // Update sort_order for remaining lines
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("script_lines").update({ sort_order: i + 1 }).eq("id", updated[i].id);
      }
    } catch (err) {
      console.error("Failed to delete line from Supabase:", err);
    }
  }

  function handleToggleCheck(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === lines.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lines.map((l) => l.id)));
    }
  }

  function handleCancelSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    // Ensure at least one line remains
    const remaining = lines.filter((l) => !selectedIds.has(l.id));
    if (remaining.length === 0) {
      window.alert("Cannot delete all lines. At least one line must remain.");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.size} selected line(s)? This action cannot be undone.`)) return;

    setDeleting(true);
    const updated = remaining.map((l, i) => ({ ...l, sort_order: i + 1 }));
    onLinesUpdate(updated);
    if (selectedLineId && selectedIds.has(selectedLineId)) onLineSelect(null);

    // Persist to Supabase
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("script_lines").delete().in("id", Array.from(selectedIds));
      for (let i = 0; i < updated.length; i++) {
        await supabase.from("script_lines").update({ sort_order: i + 1 }).eq("id", updated[i].id);
      }
    } catch (err) {
      console.error("Failed to batch delete from Supabase:", err);
    } finally {
      setDeleting(false);
      setSelectMode(false);
      setSelectedIds(new Set());
    }
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
        {!broadcastMode && selectMode ? (
          <>
            <button
              onClick={handleBatchDelete}
              disabled={deleting || selectedIds.size === 0}
              style={{
                background: selectedIds.size > 0 ? "#DC2626" : "#ccc",
                color: "#FFF8E7",
                border: "2px solid #333",
                borderRadius: "10px",
                padding: "8px 18px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: deleting || selectedIds.size === 0 ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {deleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
            </button>
            <button
              onClick={handleSelectAll}
              style={{
                background: "transparent",
                color: "#2D6A5C",
                border: "2px solid #2D6A5C",
                borderRadius: "10px",
                padding: "8px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {selectedIds.size === lines.length ? "Deselect All" : "Select All"}
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleCancelSelect}
              style={{
                background: "transparent",
                color: "#999",
                border: "2px solid #ccc",
                borderRadius: "10px",
                padding: "8px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
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
            {!broadcastMode && (
              <button
                onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
                style={{
                  background: "transparent",
                  color: "#2D6A5C",
                  border: "2px solid #2D6A5C",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Select
              </button>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "10px", letterSpacing: "0.05em", color: "#aaa" }}>
              {totalLines} lines // {durationStr} total
            </span>
          </>
        )}
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
            <div
              key={line.id}
              ref={(el) => { if (el) lineRefs.current.set(i, el); }}
              style={broadcastMode ? {
                borderLeft: i === broadcastIndex ? "4px solid" : "4px solid transparent",
                borderLeftColor: i === broadcastIndex ? (broadcastPhase === "listening" ? "#FFD4B8" : "#98E4C9") : "transparent",
                background: i === broadcastIndex ? "rgba(152, 228, 201, 0.08)" : i < broadcastIndex ? "rgba(0,0,0,0.02)" : "transparent",
                opacity: i < broadcastIndex ? 0.5 : 1,
                transition: "all 0.3s",
              } : undefined}
            >
              <ScriptLineItem
                line={broadcastMode && enhancedText && i === enhancedLineIndex
                  ? { ...line, content: enhancedText }
                  : line}
                index={i}
                isSelected={selectedLineId === line.id}
                isPlaying={playingId === line.id}
                onSelect={onLineSelect}
                onContentChange={handleContentChange}
                onGenerateAudio={handleGenerateAudio}
                onPlayPause={handlePlayPause}
                onDelete={!broadcastMode && !selectMode && lines.length > 1 ? () => handleDeleteLine(line.id) : undefined}
                selectMode={!broadcastMode && selectMode}
                isChecked={selectedIds.has(line.id)}
                onCheckToggle={handleToggleCheck}
              />
              {/* Enhanced line indicator */}
              {broadcastMode && enhancedText && i === enhancedLineIndex && (
                <div style={{
                  margin: "0 16px 8px",
                  padding: "6px 12px",
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  borderRadius: "6px",
                  fontSize: "10px",
                  color: "#b45309",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  ENHANCED — AI generated transition based on guest speech
                </div>
              )}
              {/* Add line button between items (hidden in broadcast mode and select mode) */}
              {(broadcastMode || selectMode) ? null : (
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
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
