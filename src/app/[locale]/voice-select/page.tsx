"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RetroNavbar from "@/components/ui/RetroNavbar";
import VoiceGrid from "@/components/voice/VoiceGrid";
import type { VoiceDef } from "@/lib/doubao/voices";
import { getVoiceByType } from "@/lib/doubao/voices";

interface Props {
  params: Promise<{ locale: string }>;
}

function VoiceSelectInner({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState("zh");
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("Select Voice");
  const [selectedVoice, setSelectedVoice] = useState<VoiceDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    params.then(({ locale: l }) => setLocale(l));
  }, [params]);

  useEffect(() => {
    const eid = searchParams.get("eventId");
    setEventId(eid);

    async function init() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/zh/login`); return; }
        setUserEmail(user.email ?? "");

        if (eid) {
          const { data: event } = await supabase.from("events").select("title, voice_id").eq("id", eid).single();
          if (event) {
            setEventTitle(event.title);
            if (event.voice_id) {
              const v = getVoiceByType(event.voice_id);
              if (v) setSelectedVoice(v);
            }
          }
        }
      } catch {
        // ignore
      }
    }
    init();
  }, [searchParams, router]);

  async function handleConfirm() {
    if (!selectedVoice || !eventId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("events").update({ voice_id: selectedVoice.voice_type }).eq("id", eventId);
      router.push(`/${locale}/script/${eventId}`);
    } catch {
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
      </div>

      <VoiceGrid
        selectedVoiceType={selectedVoice?.voice_type ?? null}
        onSelect={setSelectedVoice}
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
          {selectedVoice ? (
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px" }}>
              {selectedVoice.name}
            </span>
          ) : (
            <span style={{ opacity: 0.5, fontSize: "12px" }}>None selected</span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {eventId && selectedVoice && (
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
            {saving ? "Saving..." : "Confirm & Continue \u2192"}
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
