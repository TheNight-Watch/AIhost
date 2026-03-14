/**
 * Core types for the ASR → LLM → TTS latency optimization pipeline.
 *
 * Three strategies target the 5-8s end-to-end delay:
 *   1. Streaming Pipeline — sentence-level LLM→TTS overlap
 *   2. Fallback + Dynamic Append — pre-generated filler, then real content
 *   3. Transition SFX + Short Prompt — audio mask over generation time
 */

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

/** A single token/chunk emitted by the LLM stream. */
export interface LLMChunk {
  text: string;
  /** true when the stream is finished */
  done: boolean;
}

/** Async generator that yields LLM chunks (streaming). */
export type LLMStream = AsyncGenerator<LLMChunk, void, unknown>;

/** Abstraction over any LLM provider (Doubao Ark, OpenAI, mock, etc.). */
export interface LLMProvider {
  /** Start a streaming completion. */
  streamChat(prompt: string, maxTokens?: number): LLMStream;
}

// ---------------------------------------------------------------------------
// TTS
// ---------------------------------------------------------------------------

/** A chunk of synthesised audio. */
export interface TTSAudioChunk {
  /** Raw audio bytes (PCM / MP3 / WAV — codec is provider-dependent). */
  data: Uint8Array;
  /** Duration in milliseconds represented by this chunk. */
  durationMs: number;
}

/** Abstraction over any TTS provider (Doubao TTS, etc.). */
export interface TTSProvider {
  /** Synthesise a complete sentence and return audio. */
  synthesize(text: string, voiceId: string): Promise<TTSAudioChunk>;
}

// ---------------------------------------------------------------------------
// Audio Playback
// ---------------------------------------------------------------------------

export interface AudioSegment {
  audio: TTSAudioChunk;
  /** Label for logging / debugging. */
  label: string;
  /** Timestamp (ms since epoch) when this segment was enqueued. */
  enqueuedAt: number;
}

export interface AudioPlayer {
  /** Enqueue audio to be played in order. */
  enqueue(segment: AudioSegment): void;
  /** Start playback (resolves when queue is drained). */
  play(): Promise<void>;
  /** Stop playback and clear queue. */
  stop(): void;
}

// ---------------------------------------------------------------------------
// Pipeline events (for latency measurement)
// ---------------------------------------------------------------------------

export type PipelineEventKind =
  | "guest_ended"
  | "llm_stream_start"
  | "llm_sentence_ready"
  | "tts_start"
  | "tts_ready"
  | "audio_play_start"
  | "audio_play_end"
  | "fallback_play_start"
  | "sfx_play_start"
  | "pipeline_done";

export interface PipelineEvent {
  kind: PipelineEventKind;
  timestampMs: number;
  detail?: string;
}

export type EventLogger = (event: PipelineEvent) => void;

// ---------------------------------------------------------------------------
// Strategy result
// ---------------------------------------------------------------------------

export interface StrategyResult {
  /** All events that occurred during execution. */
  events: PipelineEvent[];
  /** Time from guest_ended to first audible output (ms). */
  timeToFirstAudioMs: number;
  /** Total time from guest_ended to pipeline_done (ms). */
  totalLatencyMs: number;
}

// ---------------------------------------------------------------------------
// Strategy interface — each optimisation strategy implements this.
// ---------------------------------------------------------------------------

export interface LatencyStrategy {
  readonly name: string;
  execute(context: StrategyContext): Promise<StrategyResult>;
}

export interface StrategyContext {
  /** The prompt to send to the LLM (derived from guest's last speech, etc.). */
  prompt: string;
  /** Voice to use for TTS. */
  voiceId: string;
  /** Injected providers. */
  llm: LLMProvider;
  tts: TTSProvider;
  player: AudioPlayer;
}
