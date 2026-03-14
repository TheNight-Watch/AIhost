import React from "react";

interface RetroWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
}

export default function RetroWindow({ title, children, className = "", shadow = false }: RetroWindowProps) {
  return (
    <div
      style={{
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "14px",
        background: "#FFF8E7",
        overflow: "hidden",
        borderColor: "#333",
        ...(shadow ? { boxShadow: "6px 6px 0px rgba(45,106,92,0.15)" } : {}),
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          paddingLeft: "12px",
          paddingRight: "12px",
          paddingTop: "8px",
          paddingBottom: "8px",
          height: "36px",
          borderBottomWidth: "2px",
          borderBottomStyle: "solid",
          background: "#E8E0D0",
          borderColor: "#333",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", borderWidth: "1.5px", borderStyle: "solid", background: "#FF6B6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", borderWidth: "1.5px", borderStyle: "solid", background: "#FFDA6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", borderWidth: "1.5px", borderStyle: "solid", background: "#6BD4AF", borderColor: "#333" }} />
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
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
