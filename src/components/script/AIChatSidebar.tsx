"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  eventTitle?: string;
  currentLine?: string;
}

export default function AIChatSidebar({ eventTitle, currentLine }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I can help you refine your script lines. Select a section and tell me what you'd like to change -- tone, length, word choice, anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/refine-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          current_line: currentLine,
          event_title: eventTitle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", border: "2px solid #333", borderRadius: "14px", overflow: "hidden", borderColor: "#333", background: "#FFF8E7", height: "520px" }}
    >
      {/* Window bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "12px", paddingRight: "12px", height: "36px", borderBottom: "2px solid #333", flexShrink: 0, background: "#E8E0D0", borderColor: "#333" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FF6B6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#FFDA6B", borderColor: "#333" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #333", background: "#6BD4AF", borderColor: "#333" }} />
        </div>
        <span style={{ flex: 1, textAlign: "center", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#333" }}>
          ai_assistant.chat
        </span>
      </div>

      {/* Messages */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "#FFFDF5" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: "85%",
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingTop: "10px",
              paddingBottom: "10px",
              borderRadius: "12px",
              fontSize: "12px",
              lineHeight: 1.625,
              border: "2px solid",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background: msg.role === "user" ? "#FFD4B8" : "#C8F0E2",
              borderColor: msg.role === "user" ? "#333" : "#2D6A5C",
            }}
          >
            <div
              style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px", color: msg.role === "user" ? "#333" : "#2D6A5C" }}
            >
              {msg.role === "user" ? "You" : "AI Assistant"}
            </div>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div
            style={{ maxWidth: "85%", paddingLeft: "14px", paddingRight: "14px", paddingTop: "10px", paddingBottom: "10px", borderRadius: "12px", fontSize: "12px", border: "2px solid", background: "#C8F0E2", borderColor: "#2D6A5C" }}
          >
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px", color: "#2D6A5C" }}>AI Assistant</div>
            <span style={{ opacity: 0.6 }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: "8px", padding: "12px", borderTop: "2px dashed", flexShrink: 0, borderColor: "#ddd", background: "#FFF8E7" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
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
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; }}
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
