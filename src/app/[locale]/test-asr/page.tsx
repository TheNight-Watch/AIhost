"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const ASR_PROXY_URL = process.env.NEXT_PUBLIC_ASR_PROXY_URL || "ws://localhost:8765";
const WINDOW_SIZE = 8;
const CONSECUTIVE_YES_THRESHOLD = 2;

interface SentenceEntry {
  text: string;
  timestamp: number;
  judgment?: "YES" | "NO" | "PENDING";
}

export default function TestASRPage() {
  // ── State ──
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sentences, setSentences] = useState<SentenceEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [consecutiveYes, setConsecutiveYes] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [asrReady, setAsrReady] = useState(false);

  // ── Refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sentencesRef = useRef<SentenceEntry[]>([]);
  const consecutiveYesRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ── Judge speech end ──
  const judgeSpeechEnd = useCallback(
    async (allSentences: SentenceEntry[]) => {
      const window = allSentences.slice(-WINDOW_SIZE);
      const texts = window.map((s) => s.text);

      addLog(`[LLM] Judging ${texts.length} sentences...`);

      try {
        const res = await fetch("/api/judge-speech-end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentences: texts }),
        });
        const data = await res.json();

        addLog(`[LLM] Result: ${data.judgment} (raw: "${data.raw}")`);

        // Update the last sentence's judgment
        setSentences((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].judgment = data.judgment;
          }
          return updated;
        });

        if (data.judgment === "YES") {
          const newCount = consecutiveYesRef.current + 1;
          consecutiveYesRef.current = newCount;
          setConsecutiveYes(newCount);
          addLog(`[TRIGGER] Consecutive YES: ${newCount}/${CONSECUTIVE_YES_THRESHOLD}`);

          if (newCount >= CONSECUTIVE_YES_THRESHOLD) {
            setTriggered(true);
            addLog(`[TRIGGER] TRIGGERED! Speaker has finished.`);
          }
        } else {
          consecutiveYesRef.current = 0;
          setConsecutiveYes(0);
        }
      } catch (err) {
        addLog(`[LLM] Error: ${err}`);
      }
    },
    [addLog]
  );

  // Track which definite sentences we've already processed (by text)
  const processedSentencesRef = useRef<Set<string>>(new Set());

  // ── Handle ASR result ──
  // ASR 2.0 returns: { text, utterances[], definite_sentences[], is_last }
  const handleASRResult = useCallback(
    (asrData: {
      text?: string;
      utterances?: Array<{ text: string; definite?: boolean; start_time?: number; end_time?: number }>;
      definite_sentences?: Array<{ text: string; definite: boolean }>;
      is_last?: boolean;
    }) => {
      const fullText = asrData.text || "";
      const definiteSentences = asrData.definite_sentences || [];

      // Show full text as interim
      if (fullText.trim()) {
        setInterimText(fullText.trim());
      }

      // Process new definite sentences (VAD confirmed)
      for (const ds of definiteSentences) {
        const key = ds.text.trim();
        if (!key || processedSentencesRef.current.has(key)) continue;

        processedSentencesRef.current.add(key);
        setInterimText("");

        const entry: SentenceEntry = {
          text: key,
          timestamp: Date.now(),
          judgment: "PENDING",
        };
        const newSentences = [...sentencesRef.current, entry];
        sentencesRef.current = newSentences;
        setSentences(newSentences);
        addLog(`[ASR] Definite: "${key}"`);

        // Async trigger LLM judgment
        judgeSpeechEnd(newSentences);
      }

      // Handle last response
      if (asrData.is_last) {
        addLog(`[ASR] Stream ended (last packet)`);
      }
    },
    [addLog, judgeSpeechEnd]
  );

  // ── Connect to ASR proxy ──
  const startRecording = useCallback(async () => {
    try {
      setTriggered(false);
      setConsecutiveYes(0);
      consecutiveYesRef.current = 0;
      setSentences([]);
      sentencesRef.current = [];
      setInterimText("");

      addLog("Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      addLog("Microphone granted. Connecting to ASR proxy...");

      // Connect WebSocket to proxy
      const ws = new WebSocket(ASR_PROXY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLog("Connected to ASR proxy. Waiting for ASR session...");
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "ready") {
          setAsrReady(true);
          addLog("ASR session ready. Starting audio capture...");
          startAudioCapture(stream);
        } else if (msg.type === "asr_result") {
          handleASRResult(msg.data);
        } else if (msg.type === "asr_error") {
          addLog(`ASR error: ${JSON.stringify(msg.data)}`);
        } else if (msg.type === "asr_closed") {
          addLog("ASR connection closed by server");
          setAsrReady(false);
        }
      };

      ws.onerror = (err) => {
        addLog(`WebSocket error: ${err}`);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setAsrReady(false);
        addLog("Disconnected from ASR proxy");
      };

      setIsRecording(true);
    } catch (err) {
      addLog(`Error: ${err}`);
    }
  }, [addLog, handleASRResult]);

  // ── Audio capture (PCM 16kHz 16bit mono) ──
  const startAudioCapture = useCallback(
    (stream: MediaStream) => {
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);

      // ScriptProcessorNode: 4096 samples per buffer
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 [-1,1] to Int16 PCM
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        wsRef.current.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      addLog("Audio capture started (PCM 16kHz 16bit mono)");
    },
    [addLog]
  );

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    addLog("Stopping...");

    // Stop audio capture
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Send stop to proxy
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => {
        wsRef.current?.close();
        wsRef.current = null;
      }, 500);
    }

    setIsRecording(false);
    setIsConnected(false);
    setAsrReady(false);
    addLog("Stopped.");
  }, [addLog]);

  // ── Reset trigger ──
  const resetTrigger = useCallback(() => {
    setTriggered(false);
    setConsecutiveYes(0);
    consecutiveYesRef.current = 0;
    addLog("[TRIGGER] Reset.");
  }, [addLog]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", color: "#98E4C9", margin: 0 }}>
          ASR + LLM Pipeline Test
        </h1>
        <p style={{ fontSize: "12px", opacity: 0.6, margin: "4px 0 0" }}>
          Microphone → ASR Proxy → Doubao ASR 2.0 → Sliding Window → LLM
          Judgment → Trigger
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            style={{
              padding: "10px 24px",
              background: "#2D6A5C",
              color: "#fff",
              border: "2px solid #98E4C9",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              padding: "10px 24px",
              background: "#8B2252",
              color: "#fff",
              border: "2px solid #FF6B9D",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Stop Recording
          </button>
        )}
        <button
          onClick={resetTrigger}
          style={{
            padding: "10px 24px",
            background: "transparent",
            color: "#98E4C9",
            border: "2px solid #98E4C9",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "14px",
          }}
        >
          Reset Trigger
        </button>
      </div>

      {/* Status indicators */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginBottom: "24px",
          fontSize: "13px",
        }}
      >
        <span>
          Proxy:{" "}
          <span style={{ color: isConnected ? "#4ade80" : "#ef4444" }}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </span>
        <span>
          ASR:{" "}
          <span style={{ color: asrReady ? "#4ade80" : "#facc15" }}>
            {asrReady ? "Ready" : "Waiting"}
          </span>
        </span>
        <span>
          Consecutive YES:{" "}
          <span
            style={{
              color: consecutiveYes >= CONSECUTIVE_YES_THRESHOLD ? "#ef4444" : "#facc15",
              fontWeight: 700,
            }}
          >
            {consecutiveYes} / {CONSECUTIVE_YES_THRESHOLD}
          </span>
        </span>
      </div>

      {/* TRIGGER banner */}
      {triggered && (
        <div
          style={{
            padding: "16px 24px",
            background: "linear-gradient(135deg, #FFD4B8 0%, #FF9966 100%)",
            color: "#333",
            borderRadius: "12px",
            marginBottom: "24px",
            fontSize: "18px",
            fontWeight: 700,
            textAlign: "center",
            animation: "pulse 1s infinite",
          }}
        >
          TRIGGERED — Speaker has finished! Start broadcast now.
        </div>
      )}

      {/* Main content: 3 columns */}
      <div style={{ display: "flex", gap: "16px" }}>
        {/* Column 1: Real-time transcription */}
        <div
          style={{
            flex: 1,
            background: "#16213e",
            borderRadius: "12px",
            padding: "16px",
            maxHeight: "500px",
            overflowY: "auto",
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              color: "#98E4C9",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Transcription (Sliding Window: last {WINDOW_SIZE})
          </h2>

          {sentences.length === 0 && !interimText && (
            <p style={{ fontSize: "12px", opacity: 0.4 }}>
              Waiting for speech...
            </p>
          )}

          {sentences.slice(-WINDOW_SIZE).map((s, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                marginBottom: "8px",
                background:
                  s.judgment === "YES"
                    ? "rgba(239, 68, 68, 0.15)"
                    : s.judgment === "NO"
                      ? "rgba(74, 222, 128, 0.1)"
                      : "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                borderLeft: `3px solid ${
                  s.judgment === "YES"
                    ? "#ef4444"
                    : s.judgment === "NO"
                      ? "#4ade80"
                      : "#666"
                }`,
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ flex: 1 }}>{s.text}</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color:
                      s.judgment === "YES"
                        ? "#ef4444"
                        : s.judgment === "NO"
                          ? "#4ade80"
                          : "#666",
                    marginLeft: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.judgment === "PENDING" ? "..." : s.judgment}
                </span>
              </div>
            </div>
          ))}

          {/* Interim text */}
          {interimText && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
                borderLeft: "3px solid #555",
                fontSize: "13px",
                opacity: 0.5,
                fontStyle: "italic",
              }}
            >
              {interimText}
            </div>
          )}
        </div>

        {/* Column 2: Logs */}
        <div
          style={{
            flex: 1,
            background: "#0f0f23",
            borderRadius: "12px",
            padding: "16px",
            maxHeight: "500px",
            overflowY: "auto",
            fontFamily: "'SF Mono', monospace",
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              color: "#facc15",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Debug Logs
          </h2>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                lineHeight: "1.6",
                color: log.includes("[TRIGGER]")
                  ? "#FFD4B8"
                  : log.includes("[LLM]")
                    ? "#c084fc"
                    : log.includes("[ASR]")
                      ? "#98E4C9"
                      : log.includes("Error")
                        ? "#ef4444"
                        : "#888",
              }}
            >
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.01); }
        }
      `}</style>
    </div>
  );
}
