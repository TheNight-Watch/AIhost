/**
 * Strategy 1 — Streaming LLM → TTS Pipeline
 *
 * Flow:
 *   1. LLM streams tokens.
 *   2. A sentence splitter accumulates tokens and emits complete sentences
 *      (split on 。！？.!? and newlines).
 *   3. Each sentence is immediately sent to TTS.
 *   4. TTS audio is enqueued for playback as soon as it is ready.
 *
 * Result: first audio begins ~2-3 s after guest ends (instead of 5-8 s when
 * waiting for the full LLM response before calling TTS).
 */

import type {
  LatencyStrategy,
  StrategyContext,
  StrategyResult,
  PipelineEvent,
  LLMStream,
  TTSAudioChunk,
} from "./types";

// ── Sentence splitter ──────────────────────────────────────────────────────

const SENTENCE_TERMINATORS = /([。！？.!?\n])/;

/**
 * Consumes an LLM stream and yields complete sentences as soon as a
 * terminator character is encountered.
 */
export async function* splitSentences(stream: LLMStream): AsyncGenerator<string, void, unknown> {
  let buffer = "";

  for await (const chunk of stream) {
    if (chunk.done) {
      // Flush remaining buffer as the last sentence.
      const trimmed = buffer.trim();
      if (trimmed) yield trimmed;
      return;
    }

    buffer += chunk.text;

    // Emit every complete sentence found in the buffer.
    let parts = buffer.split(SENTENCE_TERMINATORS);
    // `parts` alternates between content and matched delimiter, e.g.:
    //   ["你好", "。", "接下来", "！", "剩余"]
    // We re-join each content+delimiter pair.
    while (parts.length >= 3) {
      const sentence = (parts[0] + parts[1]).trim();
      if (sentence) yield sentence;
      parts = parts.slice(2);
    }
    buffer = parts.join("");
  }

  // Final flush
  const trimmed = buffer.trim();
  if (trimmed) yield trimmed;
}

// ── Strategy implementation ────────────────────────────────────────────────

export class StreamingPipeline implements LatencyStrategy {
  readonly name = "Streaming LLM→TTS Pipeline";

  async execute(ctx: StrategyContext): Promise<StrategyResult> {
    const events: PipelineEvent[] = [];
    const emit = (kind: PipelineEvent["kind"], detail?: string) => {
      events.push({ kind, timestampMs: Date.now(), detail });
    };

    const guestEndedAt = Date.now();
    emit("guest_ended");

    // 1. Start LLM stream
    emit("llm_stream_start");
    const stream = ctx.llm.streamChat(ctx.prompt);

    // 2. Split into sentences and process each concurrently with TTS
    let firstAudioAt: number | undefined;
    const sentences = splitSentences(stream);
    let sentenceIndex = 0;

    // We process sentences sequentially to maintain ordering, but TTS for
    // the *next* sentence can overlap with *playback* of the current one.
    const ttsQueue: Promise<{ audio: TTSAudioChunk; label: string }>[] = [];

    for await (const sentence of sentences) {
      const idx = sentenceIndex++;
      emit("llm_sentence_ready", `[${idx}] ${sentence}`);

      // Fire TTS immediately (don't await — let it run while we keep reading).
      emit("tts_start", `[${idx}]`);
      const ttsPromise = ctx.tts
        .synthesize(sentence, ctx.voiceId)
        .then((audio) => {
          emit("tts_ready", `[${idx}] ${audio.durationMs}ms audio`);
          return { audio, label: `sentence-${idx}` };
        });
      ttsQueue.push(ttsPromise);
    }

    // 3. Enqueue and play audio segments in order
    for (const promise of ttsQueue) {
      const { audio, label } = await promise;
      ctx.player.enqueue({ audio, label, enqueuedAt: Date.now() });

      if (firstAudioAt === undefined) {
        emit("audio_play_start", label);
        firstAudioAt = Date.now();
      }
    }

    await ctx.player.play();
    emit("audio_play_end");
    emit("pipeline_done");

    const now = Date.now();
    return {
      events,
      timeToFirstAudioMs: (firstAudioAt ?? now) - guestEndedAt,
      totalLatencyMs: now - guestEndedAt,
    };
  }
}
