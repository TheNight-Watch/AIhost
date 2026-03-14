"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EventCard from "./EventCard";
import type { Event, Locale } from "@/types";
import { t } from "@/lib/i18n";

interface Props {
  locale: Locale;
  initialEvents: Event[];
}

export default function EventList({ locale, initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("events")
          .select("*, script_lines(count)")
          .order("created_at", { ascending: false });

        if (fetchError) {
          setError(t("dashboard.errorLoadingEvents", locale));
          return;
        }

        if (data) {
          const mapped: Event[] = data.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            user_id: e.user_id as string,
            title: e.title as string,
            description: e.description as string | null,
            status: e.status as Event["status"],
            voice_id: e.voice_id as string | null,
            created_at: e.created_at as string,
            updated_at: e.updated_at as string,
            script_lines_count:
              Array.isArray(e.script_lines) && e.script_lines.length > 0
                ? (e.script_lines[0] as { count: number }).count
                : 0,
          }));
          setEvents(mapped);
        }
      } catch {
        // Supabase not configured — keep initial events
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [locale]);

  if (loading && events.length === 0) {
    return (
      <div
        style={{
          padding: "48px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            marginBottom: "12px",
          }}
        >
          {["#98E4C9", "#FFD4B8", "#2D6A5C", "#FFF8E7"].map((c, i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "2px",
                background: c,
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "#aaa" }}>
          {t("dashboard.loadingEvents", locale)}
        </p>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#FF6B6B" }}>&gt; {error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: "64px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px", color: "#C8F0E2" }}>+</div>
        <p style={{ fontSize: "13px", color: "#999" }}>
          {t("dashboard.noEvents", locale)}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
      }}
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} locale={locale} />
      ))}
    </div>
  );
}
