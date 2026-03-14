"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timeline from "@/components/broadcast/Timeline";
import Teleprompter from "@/components/broadcast/Teleprompter";
import TransportControls from "@/components/broadcast/TransportControls";
import type { ScriptLine } from "@/types";

type Speed = 0.5 | 1 | 1.5 | 2;

interface Props {
  params: Promise<{ locale: string; eventId: string }>;
}

export default function BroadcastPage({ params }: Props) {
  const router = useRouter();
  const [locale, setLocale] = useState("zh");
  const [eventId, setEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("Loading...");
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    params.then(({ locale: l, eventId: eid }) => {
      setLocale(l);
      setEventId(eid);
      loadData(l, eid);
    });
  }, [params]);

  async function loadData(loc: string, eid: string) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${loc}/login`); return; }

      const { data: event } = await supabase.from("events").select("title").eq("id", eid).single();
      if (event) setEventTitle(event.title);

      const { data: scriptLines } = await supabase
        .from("script_lines")
        .select("*")
        .eq("event_id", eid)
        .order("sort_order");

      if (scriptLines) setLines(scriptLines);
    } catch {
      // ignore
    }
  }

  const currentLine = lines[currentIndex] || null;

  const totalDuration = lines.reduce((sum, l) => sum + (l.duration_ms || 8000) / 1000, 0);

  // Calculate elapsed time up to current line
  const elapsedToCurrentLine = lines.slice(0, currentIndex).reduce((sum, l) => sum + (l.duration_ms || 8000) / 1000, 0);

  const progress = totalDuration > 0 ? ((elapsedToCurrentLine + currentTime) / totalDuration) * 100 : 0;

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function playLine(index: number) {
    if (index >= lines.length) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const line = lines[index];
    setCurrentIndex(index);
    setCurrentTime(0);

    if (!line.audio_url) {
      // No audio — simulate with timer
      const duration = (line.duration_ms || 8000) / 1000 / speed;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setCurrentTime(Math.min(elapsed, duration));
        if (elapsed >= duration) {
          clearInterval(timerRef.current!);
          if (autoAdvance && index + 1 < lines.length) {
            playLine(index + 1);
          } else {
            setIsPlaying(false);
          }
        }
      }, 100);
      return;
    }

    const audio = new Audio(line.audio_url);
    audio.playbackRate = speed;
    audio.volume = volume;
    audioRef.current = audio;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);

    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      setIsPlaying(false);
    });

    audio.onended = () => {
      clearInterval(timerRef.current!);
      if (autoAdvance && index + 1 < lines.length) {
        playLine(index + 1);
      } else {
        setIsPlaying(false);
      }
    };
  }

  function handlePlayPause() {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playLine(currentIndex);
    }
  }

  function handleStop() {
    stopAudio();
    setIsPlaying(false);
    setCurrentIndex(0);
    setCurrentTime(0);
  }

  function handlePrev() {
    stopAudio();
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentTime(0);
    if (isPlaying) {
      playLine(newIndex);
    } else {
      setCurrentIndex(newIndex);
    }
  }

  function handleNext() {
    stopAudio();
    const newIndex = Math.min(lines.length - 1, currentIndex + 1);
    setCurrentTime(0);
    if (isPlaying) {
      playLine(newIndex);
    } else {
      setCurrentIndex(newIndex);
    }
  }

  function handleJump(index: number) {
    stopAudio();
    setCurrentTime(0);
    if (isPlaying) {
      playLine(index);
    } else {
      setCurrentIndex(index);
    }
  }

  function handleSpeedChange(newSpeed: Speed) {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }

  function handleVolumeChange(newVolume: number) {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const lineDuration = currentLine ? (currentLine.duration_ms || 8000) / 1000 : 0;

  // Right info panel data
  const overallProgress = lines.length > 0 ? ((currentIndex + 1) / lines.length) * 100 : 0;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden", background: "#2A2A2A", color: "#FFF8E7", fontFamily: "var(--font-mono)" }}
    >
      {/* Top bar */}
      <div
        style={{ display: "flex", alignItems: "center", height: "42px", paddingLeft: "20px", paddingRight: "20px", gap: "16px", flexShrink: 0, borderBottom: "2px solid #444", background: "#333", borderColor: "#444" }}
      >
        <Link
          href={`/${locale}/dashboard`}
          style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-serif)", fontSize: "18px", color: "#98E4C9", textDecoration: "none" }}
        >
          <span style={{ width: "14px", height: "14px", borderRadius: "2px", border: "1.5px solid #FFF8E7", background: "#98E4C9", borderColor: "#FFF8E7" }} />
          AI Host
        </Link>

        <span style={{ flex: 1, fontSize: "12px", color: "#aaa" }}>
          {eventTitle} // Live Broadcast
        </span>

        <div
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: "12px", paddingRight: "12px", paddingTop: "4px", paddingBottom: "4px", borderRadius: "6px", border: "1.5px solid #FF6B6B", color: "#FF6B6B", background: "rgba(255,107,107,0.15)", borderColor: "#FF6B6B" }}
        >
          <div
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#FF6B6B", animation: isPlaying ? "livePulse 1.2s infinite" : "none" }}
          />
          {isPlaying ? "LIVE" : "READY"}
        </div>

        <Link
          href={`/${locale}/script/${eventId}`}
          style={{ fontSize: "11px", paddingLeft: "10px", paddingRight: "10px", paddingTop: "4px", paddingBottom: "4px", borderRadius: "4px", border: "1px solid #555", transition: "all 0.2s", color: "#888", borderColor: "#555", textDecoration: "none" }}
        >
          Back to Editor
        </Link>
      </div>

      {/* Main layout */}
      <div
        style={{
          flex: 1,
          display: "grid",
          overflow: "hidden",
          gridTemplateColumns: "280px 1fr 260px",
          height: "calc(100vh - 42px - 72px)",
        }}
      >
        {/* Timeline sidebar */}
        <Timeline lines={lines} currentIndex={currentIndex} onJump={handleJump} />

        {/* Center: teleprompter */}
        <Teleprompter
          currentLine={currentLine}
          isPlaying={isPlaying}
          progress={progress}
          currentTime={elapsedToCurrentLine + currentTime}
          totalDuration={totalDuration}
        />

        {/* Right info panel */}
        <div
          style={{ display: "flex", flexDirection: "column", overflowY: "auto", background: "#1E1E1E", borderLeft: "2px solid #444" }}
        >
          <div
            style={{ paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #333", color: "#666", background: "#252525", borderColor: "#333" }}
          >
            Event Info
          </div>

          <div style={{ padding: "16px", borderBottom: "1px solid #333", borderColor: "#333" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px", color: "#666" }}>
              Current Line
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-serif)", color: "#98E4C9" }}>
              {String(currentIndex + 1).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
            </div>
          </div>

          <div style={{ padding: "16px", borderBottom: "1px solid #333", borderColor: "#333" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px", color: "#666" }}>
              Overall Progress
            </div>
            <div style={{ width: "100%", height: "8px", borderRadius: "4px", marginTop: "8px", background: "#333" }}>
              <div
                style={{ height: "100%", borderRadius: "4px", transition: "all 0.2s", background: "#98E4C9", width: `${overallProgress}%` }}
              />
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px", color: "#FFF8E7" }}>
              {Math.round(overallProgress)}%
            </div>
          </div>

          <div style={{ padding: "16px", borderBottom: "1px solid #333", borderColor: "#333" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px", color: "#666" }}>
              Status
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFF8E7" }}>
              {isPlaying ? "Playing" : "Paused"}
            </div>
          </div>

          {/* Auto-advance toggle */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", borderBottom: "1px solid #333", borderColor: "#333" }}
          >
            <span style={{ fontSize: "11px", color: "#aaa" }}>Auto-advance</span>
            <div
              style={{ width: "40px", height: "22px", borderRadius: "50%", cursor: "pointer", position: "relative", transition: "all 0.2s", background: autoAdvance ? "#2D6A5C" : "#444" }}
              onClick={() => setAutoAdvance(!autoAdvance)}
            >
              <div
                style={{ width: "18px", height: "18px", background: "#FFF8E7", borderRadius: "50%", position: "absolute", top: "2px", transition: "all 0.2s", left: autoAdvance ? "20px" : "2px" }}
              />
            </div>
          </div>

          <div style={{ padding: "16px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>
              Lines With Audio
            </div>
            <div style={{ fontSize: "13px", color: "#FFF8E7" }}>
              {lines.filter((l) => !!l.audio_url).length} / {lines.length}
            </div>
            {lines.filter((l) => !l.audio_url).length > 0 && (
              <p style={{ fontSize: "10px", marginTop: "4px", color: "#888" }}>
                Lines without audio will simulate playback
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ flexShrink: 0 }}>
        <TransportControls
          isPlaying={isPlaying}
          speed={speed}
          volume={volume}
          canPrev={currentIndex > 0}
          canNext={currentIndex < lines.length - 1}
          currentTime={elapsedToCurrentLine + currentTime}
          totalDuration={totalDuration}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onPrev={handlePrev}
          onNext={handleNext}
          onSpeedChange={handleSpeedChange}
          onVolumeChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
