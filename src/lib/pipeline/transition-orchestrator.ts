/**
 * Strategy 3 — Transition SFX + Short Prompt
 *
 * Flow:
 *   1. Guest finishes → immediately play a 1-2 s transition sound effect
 *      (applause, short jingle, etc.).
 *   2. In parallel, send a **short** prompt to the LLM (max_tokens=80)
 *      requesting a single concise transition sentence.
 *   3. Run TTS on that single sentence.
 *   4. By the time the SFX finishes (~1.5 s), the dynamic audio should
 *      be ready (or nearly ready) and plays seamlessly.
 *
 * Result: 0 ms perceived latency (SFX masks generation time).
 *         Actual dynamic content arrives in ~2-3 s.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * TransitionOrchestrator also serves as the top-level coordinator that
 * can run *any* strategy (or combine them) and collect timing metrics.
 */

import type {
  LatencyStrategy,
  StrategyContext,
  StrategyResult,
  PipelineEvent,
  TTSAudioChunk,
  AudioPlayer,
} from "./types";

// ── SFX asset abstraction ──────────────────────────────────────────────────

export interface SFXAsset {
  id: string;
  label: string;
  /** Pre-loaded audio data. */
  audio: TTSAudioChunk;
}

// ── Strategy 3 implementation ──────────────────────────────────────────────

export class SFXPlusShortPromptStrategy implements LatencyStrategy {
  readonly name = "Transition SFX + Short Prompt";

  private sfx: SFXAsset;
  /** Maximum tokens for the short LLM call. */
  private maxTokens: number;

  constructor(sfx: SFXAsset, maxTokens = 80) {
    this.sfx = sfx;
    this.maxTokens = maxTokens;
  }

  async execute(ctx: StrategyContext): Promise<StrategyResult> {
    const events: PipelineEvent[] = [];
    const emit = (kind: PipelineEvent["kind"], detail?: string) => {
      events.push({ kind, timestampMs: Date.now(), detail });
    };

    const guestEndedAt = Date.now();
    emit("guest_ended");

    // 1. Play SFX immediately
    emit("sfx_play_start", this.sfx.label);
    ctx.player.enqueue({
      audio: this.sfx.audio,
      label: `sfx:${this.sfx.id}`,
      enqueuedAt: Date.now(),
    });
    const firstAudioAt = Date.now();
    emit("audio_play_start", `sfx:${this.sfx.id}`);

    // 2. In parallel: short LLM call + TTS
    const dynamicPromise = (async () => {
      emit("llm_stream_start");
      const stream = ctx.llm.streamChat(ctx.prompt, this.maxTokens);
      let text = "";
      for await (const chunk of stream) {
        if (chunk.done) break;
        text += chunk.text;
      }
      emit("llm_sentence_ready", text);

      emit("tts_start", "short-prompt");
      const audio = await ctx.tts.synthesize(text, ctx.voiceId);
      emit("tts_ready", `short-prompt: ${audio.durationMs}ms`);
      return audio;
    })();

    // 3. Start SFX playback
    const playPromise = ctx.player.play();

    // 4. Append dynamic audio once ready
    const dynamicAudio = await dynamicPromise;
    ctx.player.enqueue({
      audio: dynamicAudio,
      label: "dynamic-short",
      enqueuedAt: Date.now(),
    });

    await playPromise;
    emit("audio_play_end");
    emit("pipeline_done");

    const now = Date.now();
    return {
      events,
      timeToFirstAudioMs: firstAudioAt - guestEndedAt,
      totalLatencyMs: now - guestEndedAt,
    };
  }
}

// ── TransitionOrchestrator — top-level coordinator ─────────────────────────

export class TransitionOrchestrator {
  private strategies: LatencyStrategy[] = [];

  register(strategy: LatencyStrategy): void {
    this.strategies.push(strategy);
  }

  /** Run a single strategy by name. */
  async run(
    strategyName: string,
    ctx: StrategyContext,
  ): Promise<StrategyResult> {
    const strategy = this.strategies.find((s) => s.name === strategyName);
    if (!strategy) {
      throw new Error(
        `Strategy "${strategyName}" not found. Available: ${this.strategies.map((s) => s.name).join(", ")}`,
      );
    }
    return strategy.execute(ctx);
  }

  /** Benchmark all registered strategies and return comparative results. */
  async benchmarkAll(
    ctx: StrategyContext,
  ): Promise<{ strategy: string; result: StrategyResult }[]> {
    const results: { strategy: string; result: StrategyResult }[] = [];

    for (const strategy of this.strategies) {
      // Reset player state between runs.
      ctx.player.stop();
      const result = await strategy.execute(ctx);
      results.push({ strategy: strategy.name, result });
    }

    return results;
  }

  /** Pretty-print benchmark results to console. */
  static printReport(
    results: { strategy: string; result: StrategyResult }[],
  ): void {
    console.log("\n====== Latency Benchmark Report ======\n");

    for (const { strategy, result } of results) {
      console.log(`--- ${strategy} ---`);
      console.log(`  Time to first audio : ${result.timeToFirstAudioMs} ms`);
      console.log(`  Total latency       : ${result.totalLatencyMs} ms`);
      console.log(`  Events:`);
      const t0 = result.events[0]?.timestampMs ?? 0;
      for (const ev of result.events) {
        const delta = ev.timestampMs - t0;
        console.log(
          `    +${String(delta).padStart(5)}ms  ${ev.kind}${ev.detail ? ` — ${ev.detail}` : ""}`,
        );
      }
      console.log();
    }
  }
}
