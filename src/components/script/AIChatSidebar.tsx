"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  refinedContent?: string; // If present, this message contains an applicable refinement
}

interface Props {
  eventTitle?: string;
  currentLine?: string;
  selectedLineId?: string | null;
  onApplyRefinement?: (lineId: string, newContent: string) => void;
}

export default function AIChatSidebar({
  eventTitle,
  currentLine,
  selectedLineId,
  onApplyRefinement,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedSet, setAppliedSet] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLineRef = useRef<string | null | undefined>(undefined);

  // When selected line changes, reset chat
  useEffect(() => {
    if (prevLineRef.current !== currentLine) {
      prevLineRef.current = currentLine;
      setMessages([]);
      setAppliedSet(new Set());
    }
  }, [currentLine]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    if (!currentLine) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            "Please select a script line from the list first, then tell me how you'd like to modify it.",
        },
      ]);
      setInput("");
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build chat history for context
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.role === "assistant" && m.refinedContent ? m.refinedContent : m.content,
      }));

      const response = await fetch("/api/chat-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentContent: currentLine,
          instruction: text,
          chatHistory,
        }),
      });

      const data = await response.json();

      if (data.refinedContent) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.refinedContent,
            refinedContent: data.refinedContent,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleApply(messageIndex: number, refinedContent: string) {
    if (!selectedLineId || !onApplyRefinement) return;
    onApplyRefinement(selectedLineId, refinedContent);
    setAppliedSet((prev) => new Set(prev).add(messageIndex));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "2px solid #333",
        borderRadius: "14px",
        overflow: "hidden",
        background: "#FFF8E7",
        height: "520px",
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
          flexShrink: 0,
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
          ai_assistant.chat
        </span>
      </div>

      {/* Current line preview */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "2px dashed #ddd",
          flexShrink: 0,
          background: "#FFFDF5",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#999",
            marginBottom: "4px",
          }}
        >
          Selected Line
        </div>
        {currentLine ? (
          <div
            style={{
              fontSize: "11px",
              lineHeight: 1.5,
              color: "#2D6A5C",
              fontFamily: "var(--font-mono)",
              maxHeight: "48px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {currentLine}
          </div>
        ) : (
          <div
            style={{
              fontSize: "11px",
              color: "#bbb",
              fontStyle: "italic",
            }}
          >
            Click a script line to select it
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          background: "#FFFDF5",
        }}
      >
        {/* Welcome message when no messages yet */}
        {messages.length === 0 && (
          <div
            style={{
              maxWidth: "90%",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              lineHeight: 1.625,
              border: "2px solid #2D6A5C",
              background: "#C8F0E2",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "4px",
                color: "#2D6A5C",
              }}
            >
              AI Assistant
            </div>
            {currentLine
              ? 'Tell me how to refine this line -- e.g. "more enthusiastic", "shorter", "add audience interaction".'
              : "Select a script line first, then I can help you refine it."}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                lineHeight: 1.625,
                border: "2px solid",
                background: msg.role === "user" ? "#FFD4B8" : "#C8F0E2",
                borderColor: msg.role === "user" ? "#333" : "#2D6A5C",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  color: msg.role === "user" ? "#333" : "#2D6A5C",
                }}
              >
                {msg.role === "user" ? "You" : "AI Assistant"}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>

            {/* Apply button for AI responses with refined content */}
            {msg.role === "assistant" && msg.refinedContent && (
              <div style={{ marginTop: "6px", display: "flex", justifyContent: "flex-start" }}>
                {appliedSet.has(i) ? (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#2D6A5C",
                      letterSpacing: "0.05em",
                      padding: "4px 10px",
                      background: "#C8F0E2",
                      borderRadius: "6px",
                      border: "1.5px solid #2D6A5C",
                    }}
                  >
                    Applied
                  </span>
                ) : (
                  <button
                    onClick={() => handleApply(i, msg.refinedContent!)}
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#FFF8E7",
                      background: "#2D6A5C",
                      border: "2px solid #333",
                      borderRadius: "8px",
                      padding: "4px 14px",
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1F4F44";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#2D6A5C";
                    }}
                  >
                    Apply
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              maxWidth: "90%",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              border: "2px solid #2D6A5C",
              background: "#C8F0E2",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "4px",
                color: "#2D6A5C",
              }}
            >
              AI Assistant
            </div>
            <span style={{ opacity: 0.6 }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px",
          borderTop: "2px dashed #ddd",
          flexShrink: 0,
          background: "#FFF8E7",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentLine ? "e.g. make it shorter..." : "Select a line first"}
          disabled={loading}
          style={{
            flex: 1,
            border: "2px solid #333",
            borderRadius: "10px",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            background: "#fff",
            outline: "none",
            color: "#333",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#2D6A5C";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#333";
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: "#2D6A5C",
            color: "#FFF8E7",
            border: "2px solid #333",
            borderRadius: "10px",
            padding: "8px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
