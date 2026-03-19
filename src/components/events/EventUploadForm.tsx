"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { fileToBase64 } from "@/lib/supabase/storage";
import { useEventStore } from "@/stores/eventStore";
import type { AdvanceMode, Locale } from "@/types";
import { t } from "@/lib/i18n";

interface Props {
  locale: Locale;
  userId: string;
}

interface PreviewLine {
  id: string;
  sort_order: number;
  speaker: string;
  content: string;
  advance_mode: AdvanceMode;
}

export default function EventUploadForm({ locale, userId }: Props) {
  const router = useRouter();
  const {
    isGeneratingScript,
    setIsGeneratingScript,
    agendaText,
    setAgendaText,
    agendaImageBase64,
    setAgendaImageBase64,
    resetUploadState,
  } = useEventStore();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState<string | null>(null);

  // Mode: "extract" = user has complete MC script, "generate" = user has agenda/flowchart
  const [mode, setMode] = useState<"extract" | "generate">("extract");

  // Preview/edit state (Step 3)
  const [previewLines, setPreviewLines] = useState<PreviewLine[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Confirm state (Step 4)
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      const base64 = await fileToBase64(file);
      setAgendaImageBase64(base64);
      setError("");
      // Image uploads always use "generate" mode
      setMode("generate");
    },
    [setAgendaImageBase64]
  );

  const onDropDoc = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsParsingDoc(true);
      setDocFileName(file.name);
      setError("");

      try {
        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:application/...;base64,)
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch("/api/parse-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Failed to parse document");
          return;
        }

        setAgendaText(data.text);
        setMode("extract");
      } catch {
        setError("Failed to parse document file");
      } finally {
        setIsParsingDoc(false);
      }
    },
    [setAgendaText]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
    multiple: false,
  });

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: isDocDragActive } = useDropzone({
    onDrop: onDropDoc,
    accept: {
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    multiple: false,
  });

  function removeImage() {
    setImagePreviewUrl(null);
    setAgendaImageBase64(null);
  }

  function validateStep1(): boolean {
    if (!title.trim()) { setError(t("upload.requiredField", locale)); return false; }
    setError(""); return true;
  }

  function validateStep2(): boolean {
    if (!agendaText.trim() && !agendaImageBase64) { setError(t("upload.agendaRequired", locale)); return false; }
    setError(""); return true;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) handleGeneratePreview();
  }

  function handlePrev() {
    setError("");
    if (step === 3) {
      // Going back from preview clears generated lines
      setPreviewLines([]);
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  }

  // Step 2 → Step 3: call API to generate/extract, then show preview
  async function handleGeneratePreview() {
    if (!validateStep2()) return;
    setIsGeneratingScript(true);
    setError("");
    setStep(3); // Show the loading state in step 3

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: "preview", // temporary; real event created on confirm
          agenda_text: agendaText.trim() || undefined,
          agenda_image_base64: agendaImageBase64 || undefined,
          event_title: title.trim(),
          mode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t("upload.generateError", locale));
        setStep(2);
        return;
      }

      // Convert API response to preview lines
      const lines: PreviewLine[] = (data.script_lines || []).map(
        (line: { id?: string; sort_order: number; speaker: string; content: string; advance_mode?: AdvanceMode }, i: number) => ({
          id: line.id || crypto.randomUUID(),
          sort_order: i + 1,
          speaker: line.speaker || "host",
          content: line.content,
          advance_mode: line.advance_mode || "listen",
        })
      );
      setPreviewLines(lines);
    } catch {
      setError(t("upload.generateError", locale));
      setStep(2);
    } finally {
      setIsGeneratingScript(false);
    }
  }

  // Preview editing functions
  function handlePreviewLineChange(id: string, content: string) {
    setPreviewLines((prev) => prev.map((l) => (l.id === id ? { ...l, content } : l)));
  }

  function handlePreviewLineSpeakerChange(id: string, speaker: string) {
    setPreviewLines((prev) => prev.map((l) => (l.id === id ? { ...l, speaker } : l)));
  }

  function handlePreviewLineAdvanceModeChange(id: string, advanceMode: AdvanceMode) {
    setPreviewLines((prev) => prev.map((l) => (l.id === id ? { ...l, advance_mode: advanceMode } : l)));
  }

  function handleAddPreviewLine(afterIndex: number) {
    const newLine: PreviewLine = {
      id: crypto.randomUUID(),
      sort_order: afterIndex + 2,
      speaker: "host",
      content: "",
      advance_mode: "listen",
    };
    setPreviewLines((prev) => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newLine);
      return updated.map((l, i) => ({ ...l, sort_order: i + 1 }));
    });
    setEditingLineId(newLine.id);
  }

  function handleDeletePreviewLine(id: string) {
    if (previewLines.length <= 1) return;
    setPreviewLines((prev) =>
      prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, sort_order: i + 1 }))
    );
  }

  // Step 3 → Confirm: create event in Supabase and save lines
  async function handleConfirm() {
    if (previewLines.length === 0) {
      setError("No script lines to save.");
      return;
    }
    setIsSaving(true);
    setError("");

    try {
      // Create event in Supabase
      let eventId: string | null = null;
      try {
        const supabase = createClient();
        const { data: event, error: createError } = await supabase
          .from("events")
          .insert({
            user_id: userId,
            title: title.trim(),
            description: description.trim() || null,
            status: "draft",
          })
          .select()
          .single();
        if (!createError && event) eventId = event.id;
      } catch {
        console.warn("Supabase not configured, using local ID");
      }

      if (!eventId) eventId = crypto.randomUUID();

      // Save script lines via a dedicated save endpoint (reuse generate-script with pre-built lines)
      const supabase = createClient();
      // Insert lines directly
      const linesToInsert = previewLines.map((line) => ({
        event_id: eventId!,
        sort_order: line.sort_order,
        speaker: line.speaker,
        content: line.content,
        advance_mode: line.advance_mode,
        duration_ms: Math.round(line.content.length * 150),
      }));

      const { error: insertError } = await supabase
        .from("script_lines")
        .insert(linesToInsert);

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      // Update event status
      await supabase
        .from("events")
        .update({ status: "ready" })
        .eq("id", eventId);

      setSaveSuccess(true);
      setTimeout(() => {
        resetUploadState();
        router.push(`/${locale}/script/${eventId}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const steps = [
    { num: 1, label: "Event Info" },
    { num: 2, label: "Upload" },
    { num: 3, label: "Preview & Edit" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    background: "#fff",
    border: "2px solid #333",
    borderRadius: "10px",
    color: "#333",
    outline: "none",
    transition: "all 0.2s",
  };

  return (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      {/* Window chrome */}
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
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FF6B6B" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FFDA6B" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#6BD4AF" }} />
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
            new_event.setup // Step {step} of {steps.length}
          </span>
        </div>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "20px",
            paddingBottom: "20px",
            borderBottom: "2px dashed #ddd",
          }}
        >
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: step >= s.num ? "#2D6A5C" : "#E8E0D0",
                  color: step >= s.num ? "#FFF8E7" : "#999",
                  border: "2px solid #333",
                }}
              >
                {s.num}
              </div>
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: step >= s.num ? "#333" : "#aaa",
                }}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: "40px",
                    height: "2px",
                    marginLeft: "12px",
                    marginRight: "12px",
                    background: step > s.num ? "#98E4C9" : "#ddd",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "24px" }}>
          {/* ─────────── Step 1: Event Info ─────────── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("upload.eventTitlePlaceholder", locale)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  Event Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("upload.eventDescriptionPlaceholder", locale)}
                  rows={3}
                  style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          )}

          {/* ─────────── Step 2: Upload + Mode Select ─────────── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Mode selector */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px", color: "#2D6A5C" }}>
                  Script Mode
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {/* Extract mode card */}
                  <div
                    onClick={() => { if (!agendaImageBase64) setMode("extract"); }}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "10px",
                      border: mode === "extract" ? "2px solid #2D6A5C" : "2px solid #ccc",
                      background: mode === "extract" ? "#C8F0E2" : "#FFFDF5",
                      cursor: agendaImageBase64 ? "not-allowed" : "pointer",
                      opacity: agendaImageBase64 ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>&#128196;</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#333", marginBottom: "4px" }}>
                      I have a complete script
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", lineHeight: 1.5 }}>
                      Paste your full MC script. AI will split it into individual spoken lines.
                    </div>
                  </div>
                  {/* Generate mode card */}
                  <div
                    onClick={() => setMode("generate")}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "10px",
                      border: mode === "generate" ? "2px solid #2D6A5C" : "2px solid #ccc",
                      background: mode === "generate" ? "#C8F0E2" : "#FFFDF5",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>&#9889;</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#333", marginBottom: "4px" }}>
                      I have an agenda / flowchart
                    </div>
                    <div style={{ fontSize: "10px", color: "#888", lineHeight: 1.5 }}>
                      Upload image or describe your event flow. AI will generate a full MC script.
                    </div>
                  </div>
                </div>
              </div>

              {/* Image upload (always available) */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  Upload Image (optional)
                </label>
                {imagePreviewUrl ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={imagePreviewUrl}
                      alt="Agenda preview"
                      style={{ width: "100%", borderRadius: "10px", border: "2px solid #333" }}
                    />
                    <button
                      onClick={removeImage}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "8px",
                        background: "#FF6B6B",
                        color: "#fff",
                        border: "2px solid #333",
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      cursor: "pointer",
                      borderRadius: "10px",
                      border: `2px dashed ${isDragActive ? "#2D6A5C" : "#bbb"}`,
                      background: isDragActive ? "#C8F0E2" : "#FFFDF5",
                      transition: "all 0.2s",
                    }}
                  >
                    <input {...getInputProps()} />
                    <div style={{ fontSize: "28px", marginBottom: "6px" }}>&#128247;</div>
                    <p style={{ fontSize: "11px", color: "#666" }}>{t("upload.dropzoneText", locale)}</p>
                    <p style={{ fontSize: "10px", marginTop: "4px", color: "#aaa" }}>{t("upload.dropzoneHint", locale)}</p>
                  </div>
                )}
              </div>

              {/* Doc upload */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  Upload .doc / .docx File
                </label>
                {docFileName ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #2D6A5C",
                    background: "#C8F0E2",
                  }}>
                    <span style={{ fontSize: "12px", color: "#2D6A5C", fontWeight: 600 }}>
                      {isParsingDoc ? "Parsing..." : `\u2713 ${docFileName}`}
                    </span>
                    <button
                      onClick={() => { setDocFileName(null); }}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: "14px",
                        color: "#999",
                        cursor: "pointer",
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div
                    {...getDocRootProps()}
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      cursor: "pointer",
                      borderRadius: "10px",
                      border: `2px dashed ${isDocDragActive ? "#2D6A5C" : "#bbb"}`,
                      background: isDocDragActive ? "#C8F0E2" : "#FFFDF5",
                      transition: "all 0.2s",
                    }}
                  >
                    <input {...getDocInputProps()} />
                    <div style={{ fontSize: "24px", marginBottom: "4px" }}>&#128196;</div>
                    <p style={{ fontSize: "11px", color: "#666" }}>
                      Drop .doc/.docx file here or click to browse
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ flex: 1, borderTop: "2px dashed #ddd" }} />
                <span style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa" }}>
                  {mode === "extract" ? "paste your script" : "or describe your agenda"}
                </span>
                <span style={{ flex: 1, borderTop: "2px dashed #ddd" }} />
              </div>

              {/* Text input */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#2D6A5C" }}>
                  {mode === "extract" ? "Paste Full Script" : "Describe Event Agenda"}
                </label>
                <textarea
                  value={agendaText}
                  onChange={(e) => setAgendaText(e.target.value)}
                  placeholder={
                    mode === "extract"
                      ? "Paste your complete MC hosting script here. AI will split it into individual spoken lines..."
                      : t("upload.pasteAgendaPlaceholder", locale)
                  }
                  rows={10}
                  style={{ ...inputStyle, resize: "none", fontSize: "12px", lineHeight: 1.7 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          )}

          {/* ─────────── Step 3: Preview & Edit ─────────── */}
          {step === 3 && (
            <div>
              {isGeneratingScript ? (
                /* Loading state */
                <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center" }}>
                  <div style={{ display: "inline-flex", gap: "4px", justifyContent: "center", marginBottom: "16px" }}>
                    {["#98E4C9", "#FFD4B8", "#2D6A5C", "#98E4C9", "#FFD4B8"].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "2px",
                          background: c,
                          animationName: "blink",
                          animationDuration: `${0.5 + i * 0.1}s`,
                          animationIterationCount: "infinite",
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>
                    {mode === "extract" ? "Extracting script lines..." : "Generating MC script..."}
                  </p>
                  <p style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                    {t("upload.generatingHint", locale)}
                  </p>
                </div>
              ) : saveSuccess ? (
                /* Save success */
                <div style={{ paddingTop: "48px", paddingBottom: "48px", textAlign: "center" }}>
                  <div style={{ fontSize: "48px", color: "#6BD4AF" }}>&#10003;</div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#333", marginTop: "12px" }}>
                    {t("upload.generateSuccess", locale)}
                  </p>
                </div>
              ) : (
                /* Preview/Edit UI */
                <div>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#333" }}>
                        {mode === "extract" ? "Extracted Script Lines" : "Generated MC Script"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                        {previewLines.length} lines // Review and edit before saving
                      </div>
                    </div>
                    <button
                      onClick={() => handleGeneratePreview()}
                      style={{
                        padding: "6px 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        background: "#E8E0D0",
                        color: "#333",
                        border: "2px solid #333",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      Regenerate
                    </button>
                  </div>

                  {/* Lines list */}
                  <div style={{ border: "2px solid #ddd", borderRadius: "10px", overflow: "hidden" }}>
                    {previewLines.map((line, i) => (
                      <PreviewLineRow
                        key={line.id}
                        line={line}
                        index={i}
                        isEditing={editingLineId === line.id}
                        onEdit={() => setEditingLineId(line.id)}
                        onBlur={() => setEditingLineId(null)}
                        onContentChange={handlePreviewLineChange}
                        onSpeakerChange={handlePreviewLineSpeakerChange}
                        onAdvanceModeChange={handlePreviewLineAdvanceModeChange}
                        onDelete={previewLines.length > 1 ? () => handleDeletePreviewLine(line.id) : undefined}
                        onAddAfter={() => handleAddPreviewLine(i)}
                        isLast={i === previewLines.length - 1}
                      />
                    ))}
                  </div>

                  {/* Add line at end */}
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => handleAddPreviewLine(previewLines.length - 1)}
                      style={{
                        padding: "6px 16px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "transparent",
                        color: "#2D6A5C",
                        border: "2px dashed #2D6A5C",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      + Add Line
                    </button>
                  </div>

                  {/* Confirm button */}
                  <div style={{ marginTop: "20px", textAlign: "center" }}>
                    <button
                      onClick={handleConfirm}
                      disabled={isSaving}
                      style={{
                        padding: "14px 36px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: "#98E4C9",
                        color: "#2D6A5C",
                        border: "2px solid #333",
                        borderRadius: "10px",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 0 #2D6A5C, 0 6px 0 #333",
                        opacity: isSaving ? 0.7 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {isSaving ? "Saving..." : "Confirm & Continue"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "11px",
                background: "#FFE0E0",
                color: "#CC4444",
                border: "2px dashed #FF6B6B",
              }}
            >
              &gt; {error}
            </div>
          )}

          {/* Navigation (Steps 1 & 2 only; Step 3 has its own buttons) */}
          {!isGeneratingScript && !saveSuccess && step < 3 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "2px dashed #ddd",
              }}
            >
              <button
                onClick={step === 1 ? () => router.push(`/${locale}/dashboard`) : handlePrev}
                style={{
                  padding: "10px 20px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "transparent",
                  color: "#666",
                  border: "2px solid #ccc",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                {step === 1 ? t("common.back", locale) : t("upload.prev", locale)}
              </button>
              <button
                onClick={handleNext}
                style={{
                  padding: "10px 20px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#98E4C9",
                  color: "#2D6A5C",
                  border: "2px solid #333",
                  borderRadius: "10px",
                  cursor: "pointer",
                  boxShadow: "0 3px 0 #2D6A5C, 0 5px 0 #333",
                }}
              >
                {step === 2 ? (mode === "extract" ? "Extract Lines" : "Generate Script") : t("upload.next", locale)} &rarr;
              </button>
            </div>
          )}

          {/* Step 3 back button */}
          {step === 3 && !isGeneratingScript && !saveSuccess && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "2px dashed #ddd" }}>
              <button
                onClick={handlePrev}
                style={{
                  padding: "10px 20px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "transparent",
                  color: "#666",
                  border: "2px solid #ccc",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                &larr; Back to Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Preview Line Row — inline editable row for Step 3
   ═══════════════════════════════════════════════════════ */

function PreviewLineRow({
  line,
  index,
  isEditing,
  onEdit,
  onBlur,
  onContentChange,
  onSpeakerChange,
  onAdvanceModeChange,
  onDelete,
  onAddAfter,
  isLast,
}: {
  line: PreviewLine;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onBlur: () => void;
  onContentChange: (id: string, content: string) => void;
  onSpeakerChange: (id: string, speaker: string) => void;
  onAdvanceModeChange: (id: string, advanceMode: AdvanceMode) => void;
  onDelete?: () => void;
  onAddAfter: () => void;
  isLast: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [line.content, autoResize]);

  const secNum = String(index + 1).padStart(2, "0");

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 40px",
          borderBottom: isLast ? "none" : "1px solid #eee",
          minHeight: "60px",
          background: isEditing ? "#F0FFF8" : "transparent",
          transition: "background 0.2s",
        }}
      >
        {/* Left: speaker + index */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 12px",
            borderRight: "1px solid #eee",
          }}
        >
          <input
            type="text"
            value={line.speaker}
            onChange={(e) => onSpeakerChange(line.id, e.target.value)}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "13px",
              color: "#2D6A5C",
              background: "transparent",
              border: "none",
              borderBottom: "1px dashed transparent",
              outline: "none",
              width: "100%",
              padding: "2px 0",
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottom = "1px dashed #2D6A5C"; }}
            onBlur={(e) => { e.currentTarget.style.borderBottom = "1px dashed transparent"; }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "9px", letterSpacing: "0.05em", color: "#bbb" }}>
              SEC. {secNum}
            </span>
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "11px",
                  color: "#ccc",
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
                title="Delete line"
              >
                &times;
              </button>
            )}
          </div>
          <select
            value={line.advance_mode}
            onChange={(e) => onAdvanceModeChange(line.id, e.target.value as AdvanceMode)}
            style={{
              width: "100%",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "#2D6A5C",
              background: "#F7F2E7",
              border: "1px solid #d8d0bf",
              borderRadius: "6px",
              padding: "4px 6px",
              outline: "none",
            }}
          >
            <option value="listen">LISTEN</option>
            <option value="continue">CONTINUE</option>
            <option value="manual">MANUAL</option>
          </select>
        </div>

        {/* Center: content */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 12px" }}>
          <textarea
            ref={textareaRef}
            value={line.content}
            onChange={(e) => {
              onContentChange(line.id, e.target.value);
              autoResize();
            }}
            onFocus={onEdit}
            onBlur={onBlur}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: 1.7,
              color: "#333",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              width: "100%",
              minHeight: "36px",
              overflow: "hidden",
            }}
          />
        </div>

        {/* Right: add button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px solid #eee",
          }}
        >
          <button
            onClick={onAddAfter}
            title="Insert line after"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "16px",
              color: "#bbb",
              cursor: "pointer",
              lineHeight: 1,
              padding: "4px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#2D6A5C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#bbb"; }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
