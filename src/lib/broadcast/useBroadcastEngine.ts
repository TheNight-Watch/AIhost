"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AdvanceMode, ScriptLine } from "@/types";

const ASR_PROXY_URL = process.env.NEXT_PUBLIC_ASR_PROXY_URL || "ws://localhost:8765";
const WINDOW_SIZE = 8;
const SILENCE_THRESHOLD_MS = 1000; // 1 second of silence required
const SILENCE_CHECK_INTERVAL_MS = 500;
const ENHANCE_CHAR_THRESHOLD = 50; // trigger enhance when transcript >= 50 chars

export type BroadcastPhase =
  | "idle"
  | "playing"
  | "listening"
  | "judging"
  | "waiting_manual"
  | "finished";

export type EnhanceStatus = "idle" | "generating" | "ready" | "failed";

interface DefiniteSentence {
  text: string;
  timestamp: number;
  judgment?: "YES" | "NO" | "PENDING";
}

export function useBroadcastEngine(lines: ScriptLine[], enhanceMode: boolean, voiceType?: string) {
  const [phase, setPhase] = useState<BroadcastPhase>("idle");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [sentences, setSentences] = useState<DefiniteSentence[]>([]);
  const [interimText, setInterimText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [silenceMs, setSilenceMs] = useState(0);
  const [hasYes, setHasYes] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState<EnhanceStatus>("idle");
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [enhancedLineIndex, setEnhancedLineIndex] = useState<number>(-1);

  // Refs for stable access in callbacks
  const phaseRef = useRef<BroadcastPhase>("idle");
  const currentIndexRef = useRef(-1);
  const linesRef = useRef(lines);
  const enhanceModeRef = useRef(enhanceMode);
  const voiceTypeRef = useRef(voiceType);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startListeningRef = useRef<(nextLineIndex: number) => void | Promise<void>>(() => {});
  const startAudioCaptureRef = useRef<(stream: MediaStream) => void>(() => {});
  const sentencesRef = useRef<DefiniteSentence[]>([]);
  const processedTextsRef = useRef<Set<string>>(new Set());

  // Silence + YES tracking
  const lastSentenceTimeRef = useRef<number>(0);
  const hasYesRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enhance mode refs
  const fullTranscriptRef = useRef<string[]>([]); // accumulates ALL definite sentences
  const enhanceTriggeredRef = useRef(false); // whether enhance generation has been kicked off
  const enhancedAudioBase64Ref = useRef<string | null>(null); // pre-generated enhanced audio
  const enhancedTextRef = useRef<string | null>(null); // the enhanced line text
  const enhanceStatusRef = useRef<EnhanceStatus>("idle");

  // Keep refs fresh
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { enhanceModeRef.current = enhanceMode; }, [enhanceMode]);
  useEffect(() => { voiceTypeRef.current = voiceType; }, [voiceType]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((prev) => [...prev.slice(-100), `[${ts}] ${msg}`]);
  }, []);

  const setPhaseSync = useCallback((p: BroadcastPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const setIndexSync = useCallback((i: number) => {
    currentIndexRef.current = i;
    setCurrentIndex(i);
  }, []);

  const setHasYesSync = useCallback((v: boolean) => {
    hasYesRef.current = v;
    setHasYes(v);
  }, []);

  const setEnhanceStatusSync = useCallback((s: EnhanceStatus) => {
    enhanceStatusRef.current = s;
    setEnhanceStatus(s);
  }, []);

  const getAdvanceMode = useCallback((line?: ScriptLine): AdvanceMode => {
    return line?.advance_mode || "listen";
  }, []);

  // ── Reset enhance state (called when starting a new listening session) ──
  const resetEnhanceState = useCallback(() => {
    fullTranscriptRef.current = [];
    enhanceTriggeredRef.current = false;
    enhancedAudioBase64Ref.current = null;
    enhancedTextRef.current = null;
    setEnhanceStatusSync("idle");
    setEnhancedText(null);
    setEnhancedLineIndex(-1);
  }, [setEnhanceStatusSync]);

  // ── Stop silence check timer ──
  const stopSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceMs(0);
  }, []);

  // ── Stop ASR connection ──
  const stopASR = useCallback(() => {
    stopSilenceTimer();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 300);
    } else {
      wsRef.current = null;
    }
  }, [stopSilenceTimer]);

  // ── Play audio (either from URL or base64) ──
  const playAudio = useCallback((source: { url?: string; base64?: string }, onEnd: () => void) => {
    let audioSrc: string;
    if (source.base64) {
      audioSrc = `data:audio/mp3;base64,${source.base64}`;
    } else if (source.url) {
      audioSrc = source.url;
    } else {
      onEnd();
      return;
    }

    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    audio.onended = () => { audioRef.current = null; onEnd(); };
    audio.onerror = () => { audioRef.current = null; onEnd(); };
    audio.play().catch(() => { audioRef.current = null; onEnd(); });
  }, []);

  // ── Play host line audio ──
  const playHostLine = useCallback((index: number) => {
    const line = linesRef.current[index];
    if (!line) {
      addLog(`[ENGINE] No line at index ${index}, broadcast finished`);
      setPhaseSync("finished");
      return;
    }

    setIndexSync(index);
    setPhaseSync("playing");

    // Check if we have an enhanced version for this line
    const useEnhanced = enhanceModeRef.current
      && enhanceStatusRef.current === "ready"
      && enhancedAudioBase64Ref.current;

    if (useEnhanced) {
      addLog(`[ENGINE] Playing ENHANCED line ${index + 1}: "${enhancedTextRef.current?.slice(0, 60)}..."`);
      playAudio({ base64: enhancedAudioBase64Ref.current! }, () => {
        addLog(`[ENGINE] Enhanced line ${index + 1} audio finished`);
        afterHostLinePlayed(index);
      });
    } else {
      addLog(`[ENGINE] Playing line ${index + 1}/${linesRef.current.length}: "${line.content.slice(0, 50)}..."`);
      if (!line.audio_url) {
        addLog(`[ENGINE] Line ${index + 1} has no audio, skipping to listen`);
        afterHostLinePlayed(index);
        return;
      }
      playAudio({ url: line.audio_url }, () => {
        addLog(`[ENGINE] Line ${index + 1} audio finished`);
        afterHostLinePlayed(index);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, setPhaseSync, setIndexSync, playAudio]);

  // ── After a host line finishes playing ──
  const afterHostLinePlayed = useCallback((index: number) => {
    const currentLine = linesRef.current[index];
    const nextIndex = index + 1;
    if (nextIndex >= linesRef.current.length) {
      addLog(`[ENGINE] All lines completed!`);
      setPhaseSync("finished");
      return;
    }

    const advanceMode = getAdvanceMode(currentLine);

    if (advanceMode === "continue") {
      addLog(`[ENGINE] Line ${index + 1} is CONTINUE — playing line ${nextIndex + 1} immediately`);
      playHostLine(nextIndex);
      return;
    }

    if (advanceMode === "manual") {
      addLog(`[ENGINE] Line ${index + 1} is MANUAL — waiting for operator before line ${nextIndex + 1}`);
      setPhaseSync("waiting_manual");
      return;
    }

    addLog(`[ENGINE] Line ${index + 1} is LISTEN — waiting for speaker before line ${nextIndex + 1}...`);
    startListeningRef.current(nextIndex);
  }, [addLog, getAdvanceMode, playHostLine, setPhaseSync]);

  // ── Background enhance generation ──
  const triggerEnhanceGeneration = useCallback(async (nextIndex: number) => {
    const nextLine = linesRef.current[nextIndex];
    if (!nextLine) return;

    const transcript = fullTranscriptRef.current.join("");
    addLog(`[ENHANCE] Transcript ${transcript.length} chars — starting enhance generation...`);
    setEnhanceStatusSync("generating");

    try {
      // Step 1: Generate enhanced text
      const enhanceRes = await fetch("/api/enhance-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          originalLine: nextLine.content,
        }),
      });
      const enhanceData = await enhanceRes.json();

      if (!enhanceRes.ok || !enhanceData.enhancedLine) {
        addLog(`[ENHANCE] LLM failed: ${enhanceData.error || "unknown"}`);
        setEnhanceStatusSync("failed");
        return;
      }

      enhancedTextRef.current = enhanceData.enhancedLine;
      setEnhancedText(enhanceData.enhancedLine);
      setEnhancedLineIndex(nextIndex);
      addLog(`[ENHANCE] Generated: "${enhanceData.referenceSentences}"`);

      // Step 2: Generate TTS for enhanced line
      const ttsRes = await fetch("/api/tts-realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: enhanceData.enhancedLine,
          voice_type: voiceTypeRef.current,
        }),
      });
      const ttsData = await ttsRes.json();

      if (!ttsRes.ok || !ttsData.audio_base64) {
        addLog(`[ENHANCE] TTS failed: ${ttsData.error || "unknown"}`);
        setEnhanceStatusSync("failed");
        return;
      }

      enhancedAudioBase64Ref.current = ttsData.audio_base64;
      setEnhanceStatusSync("ready");
      addLog(`[ENHANCE] Audio ready! Enhanced line will be used on trigger.`);
    } catch (err) {
      addLog(`[ENHANCE] Error: ${err}`);
      setEnhanceStatusSync("failed");
    }
  }, [addLog, setEnhanceStatusSync]);

  // ── Trigger: called when silence > 1s AND hasYes ──
  const triggerNextLine = useCallback((nextIndex: number) => {
    addLog(`[TRIGGER] Silence > 1s + YES confirmed — advancing to line ${nextIndex + 1}`);
    stopASR();

    setSentences([]);
    sentencesRef.current = [];
    processedTextsRef.current = new Set();
    setInterimText("");
    setHasYesSync(false);

    // Play next host line (will use enhanced audio if available)
    playHostLine(nextIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, stopASR, setHasYesSync]);

  // ── Start silence check interval ──
  const startSilenceTimer = useCallback((nextIndex: number) => {
    stopSilenceTimer();

    silenceTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = lastSentenceTimeRef.current > 0
        ? now - lastSentenceTimeRef.current
        : 0;

      setSilenceMs(elapsed);

      if (hasYesRef.current && elapsed >= SILENCE_THRESHOLD_MS) {
        triggerNextLine(nextIndex);
      }
    }, SILENCE_CHECK_INTERVAL_MS);
  }, [stopSilenceTimer, triggerNextLine]);

  // ── LLM judgment ──
  const judgeSpeechEnd = useCallback(async (allSentences: DefiniteSentence[]) => {
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
      addLog(`[LLM] Result: ${data.judgment}`);

      setSentences((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { ...updated[updated.length - 1], judgment: data.judgment };
        }
        return updated;
      });

      if (data.judgment === "YES") {
        setHasYesSync(true);
        addLog(`[TRIGGER] YES — waiting for silence > 1s...`);
      } else {
        setHasYesSync(false);
      }
    } catch (err) {
      addLog(`[LLM] Error: ${err}`);
    }
  }, [addLog, setHasYesSync]);

  // ── Handle ASR result ──
  const handleASRResult = useCallback((data: {
    text?: string;
    definite_sentences?: Array<{ text: string }>;
  }, nextLineIndex: number) => {
    const definiteSentences = data.definite_sentences || [];
    const currentText = data.text || "";

    setInterimText(currentText);

    for (const ds of definiteSentences) {
      if (!ds.text.trim()) continue;
      if (processedTextsRef.current.has(ds.text)) continue;

      processedTextsRef.current.add(ds.text);
      const trimmed = ds.text.trim();
      const entry: DefiniteSentence = { text: trimmed, timestamp: Date.now(), judgment: "PENDING" };
      sentencesRef.current = [...sentencesRef.current, entry];
      setSentences([...sentencesRef.current]);
      addLog(`[ASR] Definite: "${trimmed}"`);

      lastSentenceTimeRef.current = Date.now();
      setHasYesSync(false);

      // Accumulate full transcript for enhance mode
      fullTranscriptRef.current.push(trimmed);

      // Check if we should trigger enhance generation
      if (enhanceModeRef.current && !enhanceTriggeredRef.current) {
        const totalChars = fullTranscriptRef.current.join("").length;
        if (totalChars >= ENHANCE_CHAR_THRESHOLD) {
          enhanceTriggeredRef.current = true;
          triggerEnhanceGeneration(nextLineIndex);
        }
      }

      // Trigger LLM judgment async
      judgeSpeechEnd([...sentencesRef.current]);
    }
  }, [addLog, judgeSpeechEnd, setHasYesSync, triggerEnhanceGeneration]);

  // ── Start ASR listening ──
  const startListening = useCallback(async (nextLineIndex: number) => {
    try {
      setPhaseSync("listening");
      setSentences([]);
      sentencesRef.current = [];
      processedTextsRef.current = new Set();
      setInterimText("");
      setHasYesSync(false);
      lastSentenceTimeRef.current = Date.now();
      resetEnhanceState();

      addLog("[ASR] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      addLog("[ASR] Connecting to ASR proxy...");
      const ws = new WebSocket(ASR_PROXY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog("[ASR] Connected, waiting for session...");
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          addLog("[ASR] Session ready, capturing audio...");
          startAudioCaptureRef.current(stream);
          startSilenceTimer(nextLineIndex);
          if (enhanceModeRef.current) {
            addLog("[ENHANCE] Mode ON — will generate enhanced line at 50+ chars");
          }
        } else if (msg.type === "asr_result") {
          handleASRResult(msg.data, nextLineIndex);
        } else if (msg.type === "asr_error") {
          addLog(`[ASR] Error: ${JSON.stringify(msg.data)}`);
        } else if (msg.type === "asr_closed") {
          addLog("[ASR] Connection closed by server");
        }
      };

      ws.onerror = () => addLog("[ASR] WebSocket error");
      ws.onclose = () => addLog("[ASR] Disconnected");
    } catch (err) {
      addLog(`[ASR] Failed: ${err}`);
    }
  }, [addLog, setPhaseSync, setHasYesSync, resetEnhanceState, handleASRResult, startSilenceTimer]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── Audio capture (PCM 16kHz 16bit mono) ──
  const startAudioCapture = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      wsRef.current.send(int16.buffer);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    addLog("[ASR] Audio capture started (PCM 16kHz)");
  }, [addLog]);

  useEffect(() => {
    startAudioCaptureRef.current = startAudioCapture;
  }, [startAudioCapture]);

  // ── Public API ──
  const startBroadcast = useCallback(() => {
    addLog("[ENGINE] Starting broadcast...");
    setLogs([]);
    setSentences([]);
    sentencesRef.current = [];
    processedTextsRef.current = new Set();
    setInterimText("");
    setHasYesSync(false);
    lastSentenceTimeRef.current = 0;
    resetEnhanceState();

    const firstLine = linesRef.current[0];
    if (!firstLine) {
      addLog("[ENGINE] No lines to broadcast");
      return;
    }

    playHostLine(0);
  }, [addLog, playHostLine, setHasYesSync, resetEnhanceState]);

  const stopBroadcast = useCallback(() => {
    addLog("[ENGINE] Stopping broadcast...");

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopASR();

    setPhaseSync("idle");
    setIndexSync(-1);
    setSentences([]);
    sentencesRef.current = [];
    processedTextsRef.current = new Set();
    setInterimText("");
    setHasYesSync(false);
    lastSentenceTimeRef.current = 0;
    resetEnhanceState();
  }, [addLog, stopASR, setPhaseSync, setIndexSync, setHasYesSync, resetEnhanceState]);

  const skipToNext = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx < 0) return;

    addLog(`[ENGINE] Manual skip from line ${idx + 1}`);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopASR();
    setSentences([]);
    sentencesRef.current = [];
    processedTextsRef.current = new Set();
    setInterimText("");
    setHasYesSync(false);
    resetEnhanceState();

    const nextIdx = idx + 1;
    if (nextIdx >= linesRef.current.length) {
      setPhaseSync("finished");
      addLog("[ENGINE] No more lines, broadcast finished");
    } else {
      playHostLine(nextIdx);
    }
  }, [addLog, stopASR, setHasYesSync, setPhaseSync, playHostLine, resetEnhanceState]);

  const continueAfterManual = useCallback(() => {
    if (phaseRef.current !== "waiting_manual") return;

    const idx = currentIndexRef.current;
    const nextIdx = idx + 1;
    if (idx < 0 || nextIdx >= linesRef.current.length) {
      setPhaseSync("finished");
      addLog("[ENGINE] Manual continue reached end of script");
      return;
    }

    addLog(`[ENGINE] Manual continue from line ${idx + 1} to line ${nextIdx + 1}`);
    playHostLine(nextIdx);
  }, [addLog, playHostLine, setPhaseSync]);

  const jumpToIndex = useCallback((index: number) => {
    const targetLine = linesRef.current[index];
    if (!targetLine) return;

    addLog(`[ENGINE] Manual jump to line ${index + 1}`);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    stopASR();
    setSentences([]);
    sentencesRef.current = [];
    processedTextsRef.current = new Set();
    setInterimText("");
    setHasYesSync(false);
    lastSentenceTimeRef.current = 0;
    resetEnhanceState();

    playHostLine(index);
  }, [addLog, playHostLine, resetEnhanceState, setHasYesSync, stopASR]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      stopASR();
    };
  }, [stopASR]);

  return {
    phase,
    currentIndex,
    sentences,
    interimText,
    logs,
    silenceMs,
    hasYes,
    enhanceStatus,
    enhancedText,
    enhancedLineIndex,
    startBroadcast,
    stopBroadcast,
    skipToNext,
    continueAfterManual,
    jumpToIndex,
  };
}
