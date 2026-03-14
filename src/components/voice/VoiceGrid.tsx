"use client";

import { useState } from "react";
import { VOICES, type VoiceDef } from "@/lib/doubao/voices";
import VoiceCard from "./VoiceCard";

type Filter = "all" | "female" | "male" | "english";

interface Props {
  selectedVoiceType: string | null;
  onSelect: (voice: VoiceDef) => void;
}

export default function VoiceGrid({ selectedVoiceType, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredVoices = VOICES.filter((v) => {
    if (filter === "all") return true;
    if (filter === "english") return v.category === "english";
    return v.category === filter;
  });

  const filterLabels: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: VOICES.length },
    { key: "female", label: "Female", count: VOICES.filter((v) => v.category === "female").length },
    { key: "male", label: "Male", count: VOICES.filter((v) => v.category === "male").length },
    { key: "english", label: "English", count: VOICES.filter((v) => v.category === "english").length },
  ];

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", paddingLeft: "40px", paddingRight: "40px", maxWidth: "1200px", marginLeft: "auto", marginRight: "auto", marginBottom: "20px", flexWrap: "wrap" }}>
        {filterLabels.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "8px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: filter === key ? "#2D6A5C" : "transparent",
              borderColor: filter === key ? "#333" : "#ddd",
              border: "2px solid",
              borderRadius: "8px",
              cursor: "pointer",
              color: filter === key ? "#FFF8E7" : "#888",
              transition: "all 0.2s",
            }}
          >
            {label} <span style={{ opacity: 0.7 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Voice grid window */}
      <div style={{ maxWidth: "1200px", marginLeft: "auto", marginRight: "auto", paddingLeft: "40px", paddingRight: "40px" }}>
        <div style={{ border: "2px solid #333", borderRadius: "14px", overflow: "hidden", background: "#FFF8E7" }}>
          {/* Window bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "12px", paddingRight: "12px", height: "36px", borderBottom: "2px solid #333", background: "#E8E0D0", borderColor: "#333" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FF6B6B", borderColor: "#333" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FFDA6B", borderColor: "#333" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#6BD4AF", borderColor: "#333" }} />
            </div>
            <span style={{ flex: 1, textAlign: "center", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#333" }}>
              voice_library.db // {filteredVoices.length} voices
            </span>
          </div>

          {/* Pixel divider */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center", paddingTop: "6px", paddingBottom: "6px", paddingLeft: "16px", paddingRight: "16px", background: "#FFFDF5" }}>
            {["#98E4C9", "#FFD4B8", "#2D6A5C", "#FFF8E7", "#98E4C9", "#FFD4B8", "#2D6A5C", "#FFF8E7"].map((c, i) => (
              <div key={i} style={{ width: "6px", height: "6px", borderRadius: "2px", background: c, opacity: 0.6 }} />
            ))}
          </div>

          {/* Grid */}
          <div
            style={{ display: "grid", gap: "16px", padding: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {filteredVoices.map((voice) => (
              <VoiceCard
                key={voice.voice_type}
                voice={voice}
                isSelected={selectedVoiceType === voice.voice_type}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
