"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RetroNavbar from "@/components/ui/RetroNavbar";
import VoiceGrid from "@/components/voice/VoiceGrid";
import type { VoiceDef } from "@/lib/doubao/voices";
import { getVoiceByType } from "@/lib/doubao/voices";
import type { VoiceMode } from "@/types";

interface Props {
  params: Promise<{ locale: string }>;
}

function VoiceSelectInner({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState("zh");
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("Select Voice");
  const [primaryVoice, setPrimaryVoice] = useState<VoiceDef | null>(null);
  const [secondaryVoice, setSecondaryVoice] = useState<VoiceDef | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("single");
  const [activeSlot, setActiveSlot] = useState<"primary" | "secondary">("primary");
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");

  const selectedVoice = activeSlot === "primary" ? primaryVoice : secondaryVoice;
  const canContinue = useMemo(() => {
    if (!eventId || !primaryVoice) return false;
    if (voiceMode === "dual_alternate" && !secondaryVoice) return false;
    return true;
  }, [eventId, primaryVoice, secondaryVoice, voiceMode]);

  useEffect(() => {
    params.then(({ locale: l }) => setLocale(l));
  }, [params]);

  useEffect(() => {
    const eid = searchParams.get("eventId");

    async function init() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/zh/login`); return; }
        setUserEmail(user.email ?? "");

        if (eid) {
          const { data: event } = await supabase
            .from("events")
            .select("title, voice_id, secondary_voice_id, voice_mode")
            .eq("id", eid)
            .single();
          if (event) {
            setEventId(eid);
            setEventTitle(event.title);
            if (event.voice_id) {
              const v = getVoiceByType(event.voice_id);
              if (v) setPrimaryVoice(v);
            }
            if (event.secondary_voice_id) {
              const secondary = getVoiceByType(event.secondary_voice_id);
              if (secondary) setSecondaryVoice(secondary);
            }
            setVoiceMode((event.voice_mode as VoiceMode) || "single");
          }
        }
      } catch {
        // ignore
      }
    }
    init();
  }, [searchParams, router]);

  function handleVoiceSelect(voice: VoiceDef) {
    setError("");
    if (activeSlot === "primary") {
      setPrimaryVoice(voice);
      return;
    }
    setSecondaryVoice(voice);
  }

  async function handleConfirm() {
    if (!eventId || !primaryVoice) return;
    if (voiceMode === "dual_alternate" && !secondaryVoice) {
      setError("Select the secondary host voice before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      await supabase
        .from("events")
        .update({
          voice_id: primaryVoice.voice_type,
          secondary_voice_id: voiceMode === "dual_alternate" ? secondaryVoice?.voice_type ?? null : null,
          voice_mode: voiceMode,
        })
        .eq("id", eventId);

      const batchResponse = await fetch("/api/generate-audio-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });

      const batchData = await batchResponse.json();
      if (!batchResponse.ok || !batchData.success) {
        throw new Error(batchData.error || "Failed to generate audio");
      }

      router.push(`/${locale}/script/${eventId}`);
    } catch {
      setError("Failed to save voices or generate audio.");
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "80px", background: "#FFF8E7", fontFamily: "var(--font-mono)" }}>
      <RetroNavbar
        locale={locale}
        userEmail={userEmail}
        activeLink="Voices"
        links={[
          { href: `/${locale}/dashboard`, label: "Projects" },
          { href: `/${locale}/voice-select`, label: "Voices", active: true },
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
        <span style={{ fontSize: "11px", color: "#2D6A5C", opacity: 0.7 }}>
          SYS. VER 2.0 // Voice Selection
        </span>
      </div>

      {/* Page header */}
      <div style={{ maxWidth: "1200px", marginLeft: "auto", marginRight: "auto", paddingLeft: "40px", paddingRight: "40px", paddingTop: "24px", paddingBottom: "16px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", color: "#2D6A5C" }}>
          Select a Voice
        </h1>
        <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px", color: "#999" }}>
          Preview and choose the AI voice for your event
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#2D6A5C" }}>
            <input
              type="radio"
              checked={voiceMode === "single"}
              onChange={() => {
                setVoiceMode("single");
                setActiveSlot("primary");
              }}
            />
            Single Host
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#2D6A5C" }}>
            <input
              type="radio"
              checked={voiceMode === "dual_alternate"}
              onChange={() => setVoiceMode("dual_alternate")}
            />
            Dual Host Alternate
          </label>
          {voiceMode === "dual_alternate" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setActiveSlot("primary")}
                style={{
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "2px solid #333",
                  borderRadius: "8px",
                  background: activeSlot === "primary" ? "#2D6A5C" : "#FFF8E7",
                  color: activeSlot === "primary" ? "#FFF8E7" : "#2D6A5C",
                  cursor: "pointer",
                }}
              >
                Primary
              </button>
              <button
                onClick={() => setActiveSlot("secondary")}
                style={{
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "2px solid #333",
                  borderRadius: "8px",
                  background: activeSlot === "secondary" ? "#8B2252" : "#FFF8E7",
                  color: activeSlot === "secondary" ? "#FFF8E7" : "#8B2252",
                  cursor: "pointer",
                }}
              >
                Secondary
              </button>
            </div>
          )}
        </div>
        {voiceMode === "dual_alternate" && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
            Host lines will alternate between the primary and secondary voices in script order.
          </div>
        )}
        {error && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#B42318" }}>
            {error}
          </div>
        )}
      </div>

      <VoiceGrid
        selectedVoiceType={selectedVoice?.voice_type ?? null}
        onSelect={handleVoiceSelect}
      />

      {/* Bottom action bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          height: "64px",
          paddingLeft: "40px",
          paddingRight: "40px",
          gap: "20px",
          zIndex: 100,
          borderTop: "3px solid",
          background: "#2D6A5C",
          color: "#FFF8E7",
          borderColor: "#1F4F44",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
            Selected Voice
          </span>
          {primaryVoice ? (
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px" }}>
              {primaryVoice.name}
              {voiceMode === "dual_alternate" && secondaryVoice ? ` / ${secondaryVoice.name}` : ""}
            </span>
          ) : (
            <span style={{ opacity: 0.5, fontSize: "12px" }}>None selected</span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {canContinue && (
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{
              padding: "10px 28px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "#98E4C9",
              color: "#2D6A5C",
              border: "2px solid #333",
              borderRadius: "10px",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 3px 0 #1A4A3C",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving & Generating..." : "Confirm & Continue \u2192"}
          </button>
        )}
        <span style={{ fontSize: "10px", opacity: 0.4 }}>SYS.HOST.V2 // Voice Module</span>
      </div>
    </div>
  );
}

export default function VoiceSelectPage({ params }: Props) {
  return (
    <Suspense>
      <VoiceSelectInner params={params} />
    </Suspense>
  );
}
