import React from "react";

interface StatItem {
  label: string;
  value: string;
}

interface RetroStatusBarProps {
  stats: StatItem[];
  sysText?: string;
}

export default function RetroStatusBar({ stats, sysText = "SYS.HOST.V2 // Retro Edition" }: RetroStatusBarProps) {
  return (
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
        fontSize: "12px",
        borderTopWidth: "3px",
        borderTopStyle: "solid",
        background: "#2D6A5C",
        color: "#FFF8E7",
        borderColor: "#1F4F44",
      }}
    >
      {stats.map((stat, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            {stat.label}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>{stat.value}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: "10px", opacity: 0.4 }}>{sysText}</span>
    </div>
  );
}
