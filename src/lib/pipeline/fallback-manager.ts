/**
 * Strategy 2 — Pre-generated Fallback + Dynamic Append
 *
 * Flow:
 *   1. Before the show / at setup time, pre-generate a set of generic
 *      transition lines with TTS (e.g. "Thank you Professor Zhang for
 *      that wonderful insight!").
 *   2. When the guest finishes speaking, **immediately** play the best
 *      matching fallback audio (0 ms perceived latency).
 *   3. In parallel, kick off LLM to generate a context-aware follow-up.
 *   4. Once the dynamic TTS audio is ready, append it to the playback
 *      queue so it plays right after the fallback finishes.
 *
 * Result: 0 ms perceived latency; dynamic content follows within 3-4 s.
 */

import type {
  LatencyStrategy,
  StrategyContext,
  StrategyResult,
  PipelineEvent,
  TTSAudioChunk,
  TTSProvider,
} from "./types";

// ── Fallback catalogue ─────────────────────────────────────────────────────

export interface FallbackEntry {
  id: string;
  /** The text of the fallback line. */
  text: string;
  /** Tags for matching (e.g. ["thank", "transition", "applause"]). */
  tags: string[];
  /** Pre-synthesised audio — populated after warm-up. */
  audio?: TTSAudioChunk;
}

/** Default Chinese fallback lines. Extend / localise as needed. */
export const DEFAULT_FALLBACKS: Omit<FallbackEntry, "audio">[] = [
  {
    id: "thank-general",
    text: "非常感谢您的精彩分享！",
    tags: ["thank", "general"],
  },
  {
    id: "thank-professor",
    text: "感谢教授的深入解读，让我们受益匪浅！",
    tags: ["thank", "professor", "academic"],
  },
  {
    id: "transition-next",
    text: "好的，让我们继续今天的话题。",
    tags: ["transition", "next"],
  },
  {
    id: "transition-audience",
    text: "相信大家也有很多想法，让我们来看看接下来的内容。",
    tags: ["transition", "audience"],
  },
];

// ── Fallback Manager ───────────────────────────────────────────────────────

export class FallbackManager {
  private entries: FallbackEntry[];
  private warmedUp = false;

  constructor(entries?: Omit<FallbackEntry, "audio">[]) {
    this.entries = (entries ?? DEFAULT_FALLBACKS).map((e) => ({ ...e }));
  }

  /** Pre-synthesise all fallback audio so it is ready instantly. */
  async warmUp(tts: TTSProvider, voiceId: string): Promise<void> {
    const tasks = this.entries.map(async (entry) => {
      entry.audio = await tts.synthesize(entry.text, voiceId);
    });
    await Promise.all(tasks);
    this.warmedUp = true;
  }

  /** Pick the best fallback for the given tags (simple tag-overlap score). */
  pick(tags: string[]): FallbackEntry | undefined {
    if (!this.warmedUp) {
      throw new Error("FallbackManager.warmUp() must be called first");
    }

    const tagSet = new Set(tags);
    let best: FallbackEntry | undefined;
    let bestScore = -1;

    for (const entry of this.entries) {
      const score = entry.tags.filter((t) => tagSet.has(t)).length;
      if (score > bestScore && entry.audio) {
        bestScore = score;
        best = entry;
      }
    }

    // If no tags match, return the first entry with audio.
    return best ?? this.entries.find((e) => e.audio);
  }
}

// ── Strategy implementation ────────────────────────────────────────────────

export class FallbackPlusDynamicStrategy implements LatencyStrategy {
  readonly name = "Fallback + Dynamic Append";

  private fallbackManager: FallbackManager;
  private matchTags: string[];

  constructor(
    fallbackManager: FallbackManager,
    matchTags: string[] = ["thank", "general"],
  ) {
    this.fallbackManager = fallbackManager;
    this.matchTags = matchTags;
  }

  async execute(ctx: StrategyContext): Promise<StrategyResult> {
    const events: PipelineEvent[] = [];
    const emit = (kind: PipelineEvent["kind"], detail?: string) => {
      events.push({ kind, timestampMs: Date.now(), detail });
    };

    const guestEndedAt = Date.now();
    emit("guest_ended");

    // 1. Immediately play fallback (0-latency)
    const fallback = this.fallbackManager.pick(this.matchTags);
    if (!fallback?.audio) {
      throw new Error("No fallback audio available");
    }

    emit("fallback_play_start", fallback.text);
    ctx.player.enqueue({
      audio: fallback.audio,
      label: `fallback:${fallback.id}`,
      enqueuedAt: Date.now(),
    });
    const firstAudioAt = Date.now();
    emit("audio_play_start", `fallback:${fallback.id}`);

    // 2. In parallel: generate dynamic content via LLM → TTS
    const dynamicPromise = (async () => {
      emit("llm_stream_start");
      const stream = ctx.llm.streamChat(ctx.prompt);
      let fullText = "";
      for await (const chunk of stream) {
        if (chunk.done) break;
        fullText += chunk.text;
      }
      emit("llm_sentence_ready", fullText);

      emit("tts_start", "dynamic");
      const audio = await ctx.tts.synthesize(fullText, ctx.voiceId);
      emit("tts_ready", `dynamic: ${audio.durationMs}ms`);
      return audio;
    })();

    // 3. Start playback of fallback immediately
    const playPromise = ctx.player.play();

    // 4. Once dynamic audio is ready, append it
    const dynamicAudio = await dynamicPromise;
    ctx.player.enqueue({
      audio: dynamicAudio,
      label: "dynamic-followup",
      enqueuedAt: Date.now(),
    });

    // Wait for all playback to finish
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
