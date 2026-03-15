"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Event, EventStatus, Locale } from "@/types";
import { t } from "@/lib/i18n";

interface Props {
  event: Event;
  locale: Locale;
}

const statusColors: Record<EventStatus, { bg: string; color: string; border: string }> = {
  draft: { bg: "#E8E0D0", color: "#666", border: "#999" },
  ready: { bg: "#C8F0E2", color: "#2D6A5C", border: "#6BD4AF" },
  live: { bg: "#FFE0E0", color: "#CC4444", border: "#FF6B6B" },
  completed: { bg: "#E0E8FF", color: "#3355AA", border: "#7799DD" },
};

export default function EventCard({ event, locale }: Props) {
  const router = useRouter();
  const statusKey = `dashboard.eventStatus.${event.status}` as const;
  const statusLabel = t(statusKey, locale);
  const colors = statusColors[event.status] || statusColors.draft;

  const dateStr = new Date(event.created_at).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div
      onClick={() => router.push(`/${locale}/script/${event.id}`)}
      style={{ textDecoration: "none", cursor: "pointer" }}
    >
      <div
        style={{
          border: "2px solid #333",
          borderRadius: "12px",
          background: "#FFFDF5",
          padding: "20px",
          transition: "all 0.25s",
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "4px 4px 0 rgba(45,106,92,0.15)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = "none";
          el.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "18px",
              color: "#2D6A5C",
              flex: 1,
              marginRight: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.title}
          </h3>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "2px",
              paddingBottom: "2px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              background: colors.bg,
              color: colors.color,
              border: `1.5px solid ${colors.border}`,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p
          style={{
            fontSize: "12px",
            marginBottom: "12px",
            color: "#888",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: "36px",
            flex: 1,
          }}
        >
          {event.description || "\u00A0"}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#aaa",
          }}
        >
          <span>{dateStr}</span>
          <span>
            {event.script_lines_count != null && event.script_lines_count > 0
              ? `${event.script_lines_count} ${t("dashboard.scriptLines", locale)}`
              : t("dashboard.noScriptYet", locale)}
          </span>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "2px dashed",
            borderColor: "#ddd",
          }}
        >
          <Link
            href={`/${locale}/script/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "#98E4C9",
              color: "#2D6A5C",
              border: "2px solid #2D6A5C",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            Script
          </Link>
          <Link
            href={`/${locale}/voice-select?eventId=${event.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "#E8E0D0",
              color: "#333",
              border: "2px solid #333",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            Voice
          </Link>
        </div>
      </div>
    </div>
  );
}
