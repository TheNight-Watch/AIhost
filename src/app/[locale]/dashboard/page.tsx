import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale, Event } from "@/types";
import RetroNavbar from "@/components/ui/RetroNavbar";
import EventList from "@/components/events/EventList";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let userEmail = "";
  let initialEvents: Event[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/login`);
    }

    userEmail = user.email ?? "";

    const { data: eventsData } = await supabase
      .from("events")
      .select("*, script_lines(count)")
      .order("created_at", { ascending: false });

    if (eventsData) {
      initialEvents = eventsData.map((e: Record<string, unknown>) => ({
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
    }
  } catch {
    userEmail = "demo@example.com";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        paddingBottom: "64px",
        background: "#FFF8E7",
        fontFamily: "var(--font-mono)",
      }}
    >
      <RetroNavbar
        locale={locale}
        userEmail={userEmail}
        activeLink="Projects"
        links={[
          { href: `/${locale}/dashboard`, label: "Projects", active: true },
          { href: `/${locale}/upload`, label: "New Event" },
        ]}
      />

      {/* Page header */}
      <div
        style={{
          maxWidth: "1300px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "40px",
          paddingRight: "40px",
          paddingTop: "28px",
          paddingBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "#2D6A5C" }}>
            My Events
          </h1>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: "4px",
              color: "#999",
            }}
          >
            SYS.DASHBOARD // {initialEvents.length} event{initialEvents.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href={`/${locale}/upload`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            background: "#98E4C9",
            color: "#2D6A5C",
            border: "2px solid #333",
            borderRadius: "10px",
            textDecoration: "none",
            boxShadow: "0 4px 0 #2D6A5C, 0 6px 0 #333",
            position: "relative",
            top: 0,
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 700 }}>+</span>
          New Event
        </Link>
      </div>

      {/* Events window */}
      <div
        style={{
          maxWidth: "1300px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "40px",
          paddingRight: "40px",
        }}
      >
        <div
          style={{
            border: "2px solid #333",
            borderRadius: "14px",
            overflow: "hidden",
            background: "#FFF8E7",
          }}
        >
          {/* Window bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "12px",
              paddingRight: "12px",
              height: "36px",
              borderBottom: "2px solid #333",
              background: "#E8E0D0",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  border: "1.5px solid #333",
                  background: "#FF6B6B",
                }}
              />
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  border: "1.5px solid #333",
                  background: "#FFDA6B",
                }}
              />
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  border: "1.5px solid #333",
                  background: "#6BD4AF",
                }}
              />
            </div>
            <span
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#333",
              }}
            >
              events.db
            </span>
          </div>

          <EventList locale={locale as Locale} initialEvents={initialEvents} />
        </div>
      </div>
    </main>
  );
}
