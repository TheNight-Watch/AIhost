"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RetroNavbar from "@/components/ui/RetroNavbar";
import ScriptLineList from "@/components/script/ScriptLineList";
import AIChatSidebar from "@/components/script/AIChatSidebar";
import { useBroadcastEngine } from "@/lib/broadcast/useBroadcastEngine";
import type { ScriptLine } from "@/types";

interface Props {
  params: Promise<{ locale: string; eventId: string }>;
}

export default function ScriptPage({ params }: Props) {
  const router = useRouter();
  const [locale, setLocale] = useState("zh");
  const [eventId, setEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("Loading...");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [enhanceMode, setEnhanceMode] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const engine = useBroadcastEngine(lines, enhanceMode, voiceId || undefined);

  useEffect(() => {
    params.then(({ locale: l, eventId: eid }) => {
      setLocale(l);
      setEventId(eid);
      loadData(l, eid);
    });
  }, [params]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [engine.logs]);

  async function loadData(loc: string, eid: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${loc}/login`); return; }
      setUserEmail(user.email ?? "");

      const { data: event } = await supabase.from("events").select("title, voice_id").eq("id", eid).single();
      if (event) {
        setEventTitle(event.title);
        setVoiceId(event.voice_id);
      }

      const { data: scriptLines } = await supabase
        .from("script_lines")
        .select("*")
        .eq("event_id", eid)
        .order("sort_order");

      if (scriptLines) setLines(scriptLines);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const selectedLine = lines.find((l) => l.id === selectedLineId);

  // Callback for AI chat sidebar to apply refined content to a script line
  const handleApplyRefinement = useCallback((lineId: string, newContent: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, content: newContent, audio_url: null, duration_ms: 0 } : l))
    );
  }, []);

  const generatedCount = lines.filter((l) => !!l.audio_url).length;
  const totalDurationMs = lines.reduce((sum, l) => sum + (l.duration_ms || 0), 0);
  const progress = lines.length > 0 ? Math.round((generatedCount / lines.length) * 100) : 0;

  const durationMin = Math.floor(totalDurationMs / 60000);
  const durationSec = Math.round((totalDurationMs % 60000) / 1000);
  const durationStr = totalDurationMs ? `~${durationMin}:${String(durationSec).padStart(2, "0")}` : "--:--";

  function handleStartBroadcast() {
    setBroadcastMode(true);
    engine.startBroadcast();
  }

  function handleStopBroadcast() {
    engine.stopBroadcast();
    setBroadcastMode(false);
  }

  const phaseLabel = {
    idle: "READY",
    playing: "PLAYING",
    listening: "LISTENING",
    judging: "ANALYZING",
    finished: "COMPLETE",
  }[engine.phase];

  const phaseColor = {
    idle: "#888",
    playing: "#98E4C9",
    listening: "#FFD4B8",
    judging: "#c084fc",
    finished: "#4ade80",
  }[engine.phase];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "56px", background: "#FFF8E7", fontFamily: "var(--font-mono)" }}>
      <RetroNavbar
        locale={locale}
        userEmail={userEmail}
        activeLink="Script"
        links={[
          { href: `/${locale}/dashboard`, label: "Projects" },
          { href: `/${locale}/script/${eventId}`, label: "Script", active: true },
          { href: `/${locale}/voice-select?eventId=${eventId}`, label: "Voices" },
        ]}
      />

      {/* Event bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "10px",
          paddingBottom: "10px",
          fontSize: "12px",
          borderBottom: "2px dashed",
          background: broadcastMode ? "#1a1a2e" : "#C8F0E2",
          borderColor: broadcastMode ? "#333" : "#6BD4AF",
          transition: "all 0.3s",
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "16px", color: broadcastMode ? "#98E4C9" : "#2D6A5C" }}>
          {eventTitle}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {broadcastMode && (
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              color: phaseColor,
              letterSpacing: "0.1em",
            }}>
              {phaseLabel}
            </span>
          )}
          {!broadcastMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#2D6A5C",
                cursor: "pointer",
                userSelect: "none",
              }}>
                <input
                  type="checkbox"
                  checked={enhanceMode}
                  onChange={(e) => setEnhanceMode(e.target.checked)}
                  style={{ accentColor: "#2D6A5C" }}
                />
                Enhance Line
              </label>
              <button
                onClick={handleStartBroadcast}
                disabled={lines.length === 0 || loading}
                style={{
                  padding: "6px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#FFD4B8",
                  color: "#333",
                  border: "2px solid #333",
                  borderRadius: "8px",
                  cursor: lines.length === 0 ? "not-allowed" : "pointer",
                  letterSpacing: "0.05em",
                  opacity: lines.length === 0 ? 0.5 : 1,
                }}
              >
                Auto Broadcast
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={engine.skipToNext}
                style={{
                  padding: "6px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "transparent",
                  color: "#98E4C9",
                  border: "2px solid #98E4C9",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <button
                onClick={handleStopBroadcast}
                style={{
                  padding: "6px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#8B2252",
                  color: "#fff",
                  border: "2px solid #FF6B9D",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          display: "grid",
          gap: "20px",
          padding: "24px",
          maxWidth: "1400px",
          marginLeft: "auto",
          marginRight: "auto",
          gridTemplateColumns: broadcastMode ? "1fr 400px" : "1fr 340px",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "#999" }}>
            Loading script...
          </div>
        ) : (
          <ScriptLineList
            lines={lines}
            eventId={eventId}
            voiceType={voiceId || undefined}
            onLinesUpdate={setLines}
            onLineSelect={setSelectedLineId}
            selectedLineId={selectedLineId}
            broadcastMode={broadcastMode}
            broadcastIndex={engine.currentIndex}
            broadcastPhase={engine.phase}
            enhancedText={engine.enhancedText}
            enhancedLineIndex={engine.enhancedLineIndex}
          />
        )}

        {/* Sidebar: Chat or Broadcast Panel */}
        <div style={{ position: "sticky", top: "20px" }}>
          {!broadcastMode ? (
            <AIChatSidebar
              eventTitle={eventTitle}
              currentLine={selectedLine?.content}
              selectedLineId={selectedLineId}
              onApplyRefinement={handleApplyRefinement}
            />
          ) : (
            <BroadcastPanel
              phase={engine.phase}
              currentIndex={engine.currentIndex}
              totalLines={lines.length}
              currentLine={lines[engine.currentIndex]}
              sentences={engine.sentences}
              interimText={engine.interimText}
              logs={engine.logs}
              logsEndRef={logsEndRef}
              silenceMs={engine.silenceMs}
              hasYes={engine.hasYes}
              enhanceStatus={engine.enhanceStatus}
              enhanceMode={enhanceMode}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          height: "48px",
          paddingLeft: "24px",
          paddingRight: "24px",
          gap: "32px",
          zIndex: 100,
          borderTop: "3px solid",
          fontSize: "12px",
          background: broadcastMode ? "#1a1a2e" : "#2D6A5C",
          color: "#FFF8E7",
          borderColor: broadcastMode ? "#333" : "#1F4F44",
          transition: "all 0.3s",
        }}
      >
        {broadcastMode ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Position</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: phaseColor }}>
                {engine.currentIndex >= 0 ? `${String(engine.currentIndex + 1).padStart(2, "0")} / ${String(lines.length).padStart(2, "0")}` : "-- / --"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Phase</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: phaseColor }}>{phaseLabel}</span>
            </div>
            {(engine.phase === "listening" || engine.phase === "judging") && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Sentences</span>
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>{engine.sentences.length}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Silence</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: engine.silenceMs >= 1000 ? "#4ade80" : "#facc15" }}>
                    {(engine.silenceMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>LLM</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: engine.hasYes ? "#4ade80" : "#888" }}>
                    {engine.hasYes ? "YES" : "—"}
                  </span>
                </div>
              </>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "10px", opacity: 0.4 }}>AUTO BROADCAST // LIVE</span>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Lines</span>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{String(lines.length).padStart(2, "0")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Generated</span>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{String(generatedCount).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Progress</span>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>Est. Duration</span>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{durationStr}</span>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "10px", opacity: 0.4 }}>SYS.HOST.V2 // Retro Edition</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Broadcast Panel (sidebar in broadcast mode) ──
function BroadcastPanel({
  phase,
  currentIndex,
  totalLines,
  currentLine,
  sentences,
  interimText,
  logs,
  logsEndRef,
  silenceMs,
  hasYes,
  enhanceStatus,
  enhanceMode,
}: {
  phase: string;
  currentIndex: number;
  totalLines: number;
  currentLine?: ScriptLine;
  sentences: Array<{ text: string; timestamp: number; judgment?: string }>;
  interimText: string;
  logs: string[];
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  silenceMs: number;
  hasYes: boolean;
  enhanceStatus: string;
  enhanceMode: boolean;

}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Current line info */}
      <div style={{
        background: "#1a1a2e",
        border: "2px solid #333",
        borderRadius: "12px",
        padding: "16px",
      }}>
        <div style={{ fontSize: "10px", color: "#98E4C9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
          Current Line ({currentIndex + 1}/{totalLines})
        </div>
        {currentLine ? (
          <>
            <div style={{ fontSize: "11px", color: "#FFD4B8", marginBottom: "6px", textTransform: "uppercase" }}>
              {currentLine.speaker}
            </div>
            <div style={{ fontSize: "13px", color: "#e0e0e0", lineHeight: "1.5" }}>
              {currentLine.content.length > 120 ? currentLine.content.slice(0, 120) + "..." : currentLine.content}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "12px", color: "#666" }}>Waiting...</div>
        )}
      </div>

      {/* Trigger conditions (only when listening) */}
      {(phase === "listening" || phase === "judging") && (
        <div style={{
          background: "#1a1a2e",
          border: "2px solid #333",
          borderRadius: "12px",
          padding: "12px 16px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
              LLM Judgment
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: hasYes ? "#4ade80" : "#666" }}>
              {hasYes ? "YES" : "waiting..."}
            </div>
          </div>
          <div style={{ width: "1px", height: "30px", background: "#333" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
              Silence
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: silenceMs >= 1000 ? "#4ade80" : "#facc15" }}>
              {(silenceMs / 1000).toFixed(1)}s / 1.0s
            </div>
          </div>
          {enhanceMode && (
            <>
              <div style={{ width: "1px", height: "30px", background: "#333" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  Enhance
                </div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: enhanceStatus === "ready" ? "#4ade80"
                    : enhanceStatus === "generating" ? "#facc15"
                    : enhanceStatus === "failed" ? "#ef4444"
                    : "#666",
                }}>
                  {enhanceStatus === "ready" ? "READY"
                    : enhanceStatus === "generating" ? "GEN..."
                    : enhanceStatus === "failed" ? "FAIL"
                    : "idle"}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Live ASR (only when listening) */}
      {(phase === "listening" || phase === "judging") && (
        <div style={{
          background: "#16213e",
          border: "2px solid #2D6A5C",
          borderRadius: "12px",
          padding: "16px",
          maxHeight: "200px",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: "10px", color: "#FFD4B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Live Transcription
          </div>
          {sentences.slice(-6).map((s, i) => (
            <div key={i} style={{
              fontSize: "12px",
              color: "#e0e0e0",
              marginBottom: "4px",
              paddingLeft: "8px",
              borderLeft: `2px solid ${s.judgment === "YES" ? "#ef4444" : s.judgment === "NO" ? "#4ade80" : "#98E4C9"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span>{s.text}</span>
              {s.judgment && s.judgment !== "PENDING" && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: s.judgment === "YES" ? "#ef4444" : "#4ade80",
                  marginLeft: "8px",
                  flexShrink: 0,
                }}>
                  {s.judgment}
                </span>
              )}
            </div>
          ))}
          {interimText && (
            <div style={{
              fontSize: "12px",
              color: "#888",
              fontStyle: "italic",
              paddingLeft: "8px",
              borderLeft: "2px solid #444",
            }}>
              {interimText}
            </div>
          )}
          {sentences.length === 0 && !interimText && (
            <div style={{ fontSize: "11px", color: "#555" }}>Waiting for speaker...</div>
          )}
        </div>
      )}

      {/* Debug logs */}
      <div style={{
        background: "#0f0f23",
        border: "2px solid #222",
        borderRadius: "12px",
        padding: "12px",
        maxHeight: "240px",
        overflowY: "auto",
      }}>
        <div style={{ fontSize: "10px", color: "#facc15", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
          Engine Logs
        </div>
        {logs.slice(-30).map((log, i) => (
          <div key={i} style={{
            fontSize: "10px",
            lineHeight: "1.5",
            fontFamily: "'SF Mono', monospace",
            color: log.includes("[TRIGGER]") ? "#FFD4B8"
              : log.includes("[ENHANCE]") ? "#fbbf24"
              : log.includes("[LLM]") ? "#c084fc"
              : log.includes("[ASR]") ? "#98E4C9"
              : log.includes("[ENGINE]") ? "#60a5fa"
              : "#666",
          }}>
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
