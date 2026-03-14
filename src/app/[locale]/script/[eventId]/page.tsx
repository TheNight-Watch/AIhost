"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RetroNavbar from "@/components/ui/RetroNavbar";
import ScriptLineList from "@/components/script/ScriptLineList";
import AIChatSidebar from "@/components/script/AIChatSidebar";
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

  useEffect(() => {
    params.then(({ locale: l, eventId: eid }) => {
      setLocale(l);
      setEventId(eid);
      loadData(l, eid);
    });
  }, [params]);

  async function loadData(loc: string, eid: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${loc}/login`); return; }
      setUserEmail(user.email ?? "");

      // Load event
      const { data: event } = await supabase.from("events").select("title, voice_id").eq("id", eid).single();
      if (event) {
        setEventTitle(event.title);
        setVoiceId(event.voice_id);
      }

      // Load script lines
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

  const generatedCount = lines.filter((l) => !!l.audio_url).length;
  const totalDurationMs = lines.reduce((sum, l) => sum + (l.duration_ms || 0), 0);
  const progress = lines.length > 0 ? Math.round((generatedCount / lines.length) * 100) : 0;

  const durationMin = Math.floor(totalDurationMs / 60000);
  const durationSec = Math.round((totalDurationMs % 60000) / 1000);
  const durationStr = totalDurationMs ? `~${durationMin}:${String(durationSec).padStart(2, "0")}` : "--:--";

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
          background: "#C8F0E2",
          borderColor: "#6BD4AF",
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "16px", color: "#2D6A5C" }}>
          {eventTitle}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "11px", color: "#2D6A5C", opacity: 0.7 }}>
            SYS. VER 2.0 // Script Editor
          </span>
          <Link
            href={`/${locale}/broadcast/${eventId}`}
            style={{
              padding: "4px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              background: "#FFD4B8",
              color: "#333",
              border: "2px solid #333",
              borderRadius: "8px",
              textDecoration: "none",
              letterSpacing: "0.05em",
            }}
          >
            ⬤ Broadcast
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{ display: "grid", gap: "20px", padding: "24px", maxWidth: "1400px", marginLeft: "auto", marginRight: "auto", gridTemplateColumns: "1fr 340px" }}
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
          />
        )}

        {/* Chat sidebar */}
        <div style={{ position: "sticky", top: "20px" }}>
          <AIChatSidebar
            eventTitle={eventTitle}
            currentLine={selectedLine?.content}
          />
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
          background: "#2D6A5C",
          color: "#FFF8E7",
          borderColor: "#1F4F44",
        }}
      >
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
      </div>
    </div>
  );
}
