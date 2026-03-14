"use client";

import React from "react";

interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelSuffix?: string;
}

export default function RetroInput({ label, error, labelSuffix, className = "", ...props }: RetroInputProps) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
            color: "#2D6A5C",
          }}
        >
          {label}{labelSuffix && <span style={{ color: "#999" }}>{labelSuffix}</span>}
        </label>
      )}
      <input
        style={{
          width: "100%",
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          background: "#fff",
          border: error ? "2px dashed #FF6B6B" : "2px solid #333",
          borderRadius: "10px",
          color: "#333",
          outline: "none",
          transition: "all 0.2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#2D6A5C";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152, 228, 201, 0.3)";
          e.currentTarget.style.borderStyle = "solid";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#FF6B6B" : "#333";
          e.currentTarget.style.boxShadow = "none";
          if (error) e.currentTarget.style.borderStyle = "dashed";
        }}
        {...props}
      />
      {error && (
        <p
          style={{
            fontSize: "11px",
            marginTop: "6px",
            paddingLeft: "2px",
            color: "#FF6B6B",
          }}
        >
          &gt; {error}
        </p>
      )}
    </div>
  );
}

interface RetroTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function RetroTextarea({ label, error, className = "", ...props }: RetroTextareaProps) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
            color: "#2D6A5C",
          }}
        >
          {label}
        </label>
      )}
      <textarea
        style={{
          width: "100%",
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          background: "#fff",
          border: error ? "2px dashed #FF6B6B" : "2px solid #333",
          borderRadius: "10px",
          color: "#333",
          outline: "none",
          transition: "all 0.2s",
          resize: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#2D6A5C";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152, 228, 201, 0.3)";
          e.currentTarget.style.borderStyle = "solid";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#FF6B6B" : "#333";
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
      {error && (
        <p style={{ fontSize: "11px", marginTop: "6px", color: "#FF6B6B" }}>
          &gt; {error}
        </p>
      )}
    </div>
  );
}
