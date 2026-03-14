import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/types";
import RetroNavbar from "@/components/ui/RetroNavbar";
import EventUploadForm from "@/components/events/EventUploadForm";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let userId = "";
  let userEmail = "";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/login`);
    }

    userId = user.id;
    userEmail = user.email ?? "";
  } catch {
    userId = "demo-user-id";
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
        links={[
          { href: `/${locale}/dashboard`, label: "Projects" },
          { href: `/${locale}/upload`, label: "New Event", active: true },
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
          borderBottom: "2px dashed #6BD4AF",
          background: "#C8F0E2",
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "16px", color: "#2D6A5C" }}>
          Create New Event
        </span>
        <span style={{ fontSize: "11px", color: "#2D6A5C", opacity: 0.7 }}>
          SYS. VER 2.0 // Event Setup
        </span>
      </div>

      <div
        style={{
          maxWidth: "672px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "32px",
          paddingBottom: "32px",
        }}
      >
        <EventUploadForm locale={locale as Locale} userId={userId} />
      </div>
    </main>
  );
}
