"use client";

import React from "react";

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "teal";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export default function RetroButton({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: RetroButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    border: "2px solid #333",
    borderRadius: "10px",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    position: "relative",
    top: 0,
    transition: "all 0.15s",
    opacity: disabled || loading ? 0.7 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  };

  const sizeStyle: Record<string, React.CSSProperties> = {
    sm: { padding: "6px 14px", fontSize: "11px" },
    md: { padding: "12px 24px", fontSize: "13px" },
    lg: { padding: "14px 28px", fontSize: "14px" },
  };

  const variantStyle: Record<string, React.CSSProperties> = {
    primary: {
      background: "#98E4C9",
      color: "#2D6A5C",
      boxShadow: "0 4px 0 #2D6A5C, 0 6px 0 #333",
    },
    secondary: {
      background: "#FFD4B8",
      color: "#333",
      boxShadow: "0 4px 0 #CC8866, 0 6px 0 #333",
    },
    danger: {
      background: "#FF6B6B",
      color: "#fff",
      boxShadow: "0 4px 0 #CC4444, 0 6px 0 #333",
    },
    teal: {
      background: "#2D6A5C",
      color: "#FFF8E7",
      boxShadow: "0 4px 0 #1F4F44, 0 6px 0 #333",
    },
  };

  return (
    <button
      style={{ ...baseStyle, ...sizeStyle[size], ...variantStyle[variant] }}
      disabled={disabled || loading}
      className={className}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          const el = e.currentTarget;
          el.style.top = "1px";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.top = "0px";
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          const el = e.currentTarget;
          el.style.top = "4px";
        }
      }}
      onMouseUp={(e) => {
        const el = e.currentTarget;
        el.style.top = "0px";
      }}
      {...props}
    >
      {loading ? "..." : children}
    </button>
  );
}
