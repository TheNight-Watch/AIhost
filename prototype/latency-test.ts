/**
 * P1 Latency Optimization — Prototype Validation Script
 *
 * Run with:  npx tsx prototype/latency-test.ts
 *
 * This script uses mock LLM / TTS / AudioPlayer providers to simulate the
 * full ASR → LLM → TTS pipeline and compare the three latency strategies:
 *
 *   1. Streaming Pipeline  — sentence-level overlap
 *   2. Fallback + Dynamic  — pre-generated filler, then real content
 *   3. SFX + Short Prompt  — audio mask over generation time
 */

// ── Mock helpers ───────────────────────────────────────────────────────────

import type {
  LLMProvider,
  LLMChunk,
  TTSProvider,
  TTSAudioChunk,
  AudioPlayer,
  AudioSegment,
  StrategyContext,
} from "../src/lib/pipeline/types";

import { StreamingPipeline } from "../src/lib/pipeline/streaming-pipeline";
import {
  FallbackManager,
  FallbackPlusDynamicStrategy,
} from "../src/lib/pipeline/fallback-manager";
import {
  SFXPlusShortPromptStrategy,
  TransitionOrchestrator,
} from "../src/lib/pipeline/transition-orchestrator";
import type { SFXAsset } from "../src/lib/pipeline/transition-orchestrator";

// ── Timing helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock LLM Provider ──────────────────────────────────────────────────────

/**
 * Simulates a streaming LLM that outputs tokens with realistic inter-token
 * latency. The response is pre-defined but delivered token-by-token.
 */
class MockLLMProvider implements LLMProvider {
  /** Simulated first-token latency (ms). */
  private firstTokenLatencyMs: number;
  /** Simulated inter-token latency (ms). */
  private tokenIntervalMs: number;
  /** The full response text. */
  private responseText: string;

  constructor(opts?: {
    firstTokenLatencyMs?: number;
    tokenIntervalMs?: number;
    responseText?: string;
  }) {
    this.firstTokenLatencyMs = opts?.firstTokenLatencyMs ?? 800;
    this.tokenIntervalMs = opts?.tokenIntervalMs ?? 30;
    this.responseText =
      opts?.responseText ??
      "感谢张教授刚才关于人工智能在医疗领域应用的精彩分享。" +
        "您提到的AI辅助诊断系统确实令人振奋！" +
        "接下来，让我们深入探讨这项技术的实际落地挑战。";
  }

  async *streamChat(
    _prompt: string,
    maxTokens?: number,
  ): AsyncGenerator<LLMChunk, void, unknown> {
    // Simulate first-token latency
    await sleep(this.firstTokenLatencyMs);

    let text = this.responseText;
    if (maxTokens && maxTokens < 100) {
      // For short-prompt strategy, return only the first sentence
      text = text.split(/[。！？]/)[0] + "。";
    }

    // Emit character by character (Chinese has ~1 char per token)
    const chars = [...text];
    for (const char of chars) {
      await sleep(this.tokenIntervalMs);
      yield { text: char, done: false };
    }
    yield { text: "", done: true };
  }
}

// ── Mock TTS Provider ──────────────────────────────────────────────────────

/**
 * Simulates TTS synthesis with configurable latency. Returns dummy audio
 * bytes; duration is estimated from text length.
 */
class MockTTSProvider implements TTSProvider {
  /** Base synthesis latency (ms). */
  private baseLatencyMs: number;
  /** Additional latency per character (ms). */
  private perCharMs: number;

  constructor(opts?: { baseLatencyMs?: number; perCharMs?: number }) {
    this.baseLatencyMs = opts?.baseLatencyMs ?? 500;
    this.perCharMs = opts?.perCharMs ?? 10;
  }

  async synthesize(text: string, _voiceId: string): Promise<TTSAudioChunk> {
    const latency = this.baseLatencyMs + text.length * this.perCharMs;
    await sleep(latency);

    // Estimate audio duration: ~200ms per Chinese character at normal speed
    const durationMs = text.length * 200;
    return {
      data: new Uint8Array(durationMs * 16), // dummy bytes
      durationMs,
    };
  }
}

// ── Mock Audio Player ──────────────────────────────────────────────────────

/**
 * Simulates audio playback by sleeping for the duration of each segment.
 * Logs playback events to console.
 */
class MockAudioPlayer implements AudioPlayer {
  private queue: AudioSegment[] = [];

  enqueue(segment: AudioSegment): void {
    this.queue.push(segment);
  }

  async play(): Promise<void> {
    while (this.queue.length > 0) {
      const segment = this.queue.shift()!;
      console.log(
        `  [Player] Playing "${segment.label}" (${segment.audio.durationMs}ms)`,
      );
      // Simulate playback time (scaled down 10x for faster test runs)
      await sleep(segment.audio.durationMs / 10);
    }
  }

  stop(): void {
    this.queue = [];
  }
}

// ── Main test ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  P1 Latency Optimization — Prototype Validation");
  console.log("=".repeat(60));
  console.log();
  console.log("Mock configuration:");
  console.log("  LLM first-token latency : 800 ms");
  console.log("  LLM inter-token interval : 30 ms/token");
  console.log("  TTS base latency        : 500 ms");
  console.log("  TTS per-char latency     : 10 ms/char");
  console.log("  Audio playback           : 10x speed (for test)");
  console.log();

  const llm = new MockLLMProvider();
  const tts = new MockTTSProvider();

  // ── Strategy 1: Streaming Pipeline ───────────────────────────────────

  console.log(">>> Strategy 1: Streaming LLM -> TTS Pipeline");
  console.log("-".repeat(50));

  const streamingStrategy = new StreamingPipeline();
  const player1 = new MockAudioPlayer();
  const ctx1: StrategyContext = {
    prompt: "请对张教授的AI医疗分享进行过渡点评",
    voiceId: "zh_female_1",
    llm,
    tts,
    player: player1,
  };
  const result1 = await streamingStrategy.execute(ctx1);
  console.log(`  >> Time to first audio: ${result1.timeToFirstAudioMs} ms`);
  console.log(`  >> Total latency:       ${result1.totalLatencyMs} ms`);
  console.log();

  // ── Strategy 2: Fallback + Dynamic ───────────────────────────────────

  console.log(">>> Strategy 2: Fallback + Dynamic Append");
  console.log("-".repeat(50));

  const fallbackMgr = new FallbackManager();
  // Warm up fallback audio (pre-generate)
  console.log("  [Warmup] Pre-generating fallback audio...");
  await fallbackMgr.warmUp(tts, "zh_female_1");
  console.log("  [Warmup] Done.");

  const fallbackStrategy = new FallbackPlusDynamicStrategy(fallbackMgr, [
    "thank",
    "professor",
  ]);
  const player2 = new MockAudioPlayer();
  const ctx2: StrategyContext = {
    prompt: "请对张教授的AI医疗分享进行深入点评和过渡",
    voiceId: "zh_female_1",
    llm,
    tts,
    player: player2,
  };
  const result2 = await fallbackStrategy.execute(ctx2);
  console.log(`  >> Time to first audio: ${result2.timeToFirstAudioMs} ms`);
  console.log(`  >> Total latency:       ${result2.totalLatencyMs} ms`);
  console.log();

  // ── Strategy 3: SFX + Short Prompt ───────────────────────────────────

  console.log(">>> Strategy 3: Transition SFX + Short Prompt");
  console.log("-".repeat(50));

  const applauseSfx: SFXAsset = {
    id: "applause-short",
    label: "Short applause",
    audio: {
      data: new Uint8Array(1500 * 16), // 1.5s of dummy audio
      durationMs: 1500,
    },
  };
  const sfxStrategy = new SFXPlusShortPromptStrategy(applauseSfx, 80);
  const player3 = new MockAudioPlayer();
  const ctx3: StrategyContext = {
    prompt: "用一句话过渡到下一个话题",
    voiceId: "zh_female_1",
    llm,
    tts,
    player: player3,
  };
  const result3 = await sfxStrategy.execute(ctx3);
  console.log(`  >> Time to first audio: ${result3.timeToFirstAudioMs} ms`);
  console.log(`  >> Total latency:       ${result3.totalLatencyMs} ms`);
  console.log();

  // ── Comparative summary ──────────────────────────────────────────────

  const orchestrator = new TransitionOrchestrator();
  TransitionOrchestrator.printReport([
    { strategy: "1. Streaming Pipeline", result: result1 },
    { strategy: "2. Fallback + Dynamic", result: result2 },
    { strategy: "3. SFX + Short Prompt", result: result3 },
  ]);

  // ── Baseline comparison ──────────────────────────────────────────────

  console.log("--- Baseline (no optimization) ---");
  console.log("  Estimated: 5000-8000 ms (full LLM wait + full TTS wait)");
  console.log();
  console.log(
    "Strategy 1 reduces time-to-first-audio by streaming sentence-by-sentence.",
  );
  console.log(
    "Strategy 2 achieves near-zero perceived latency via pre-generated fallback.",
  );
  console.log(
    "Strategy 3 masks latency with SFX while a short prompt generates quickly.",
  );
  console.log();
  console.log(
    "Recommendation: Combine Strategy 2 (fallback) with Strategy 1 (streaming)",
  );
  console.log(
    "for the dynamic portion. Strategy 3 is a good fallback when pre-generation",
  );
  console.log("is not feasible.");
}

main().catch(console.error);
