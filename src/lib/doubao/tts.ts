const TTS_ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const APP_ID = process.env.DOUBAO_APP_ID!;
const ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN!;
const RESOURCE_ID = process.env.DOUBAO_TTS_RESOURCE_ID || "seed-tts-2.0";
const DEFAULT_VOICE = "zh_female_vv_uranus_bigtts";
const DEFAULT_MODEL = "seed-tts-2.0-standard";
const DEFAULT_CONTEXT_TEXT = "你现在是一位专业活动主持人，语气自信，关键处稍微加强。";

export interface TTSOptions {
  voice_type?: string;
  speech_rate?: number;
  loudness_rate?: number;
  emotion?: string;
  emotion_scale?: number;
  encoding?: "mp3" | "pcm" | "ogg_opus";
  sample_rate?: number;
  bit_rate?: number;
  context_texts?: string[];
}

interface V3Chunk {
  code?: number;
  message?: string;
  data?: string;
  usage?: Record<string, unknown>;
}

function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isTts20Voice(voiceType: string): boolean {
  return voiceType.includes("_uranus_") || voiceType.startsWith("saturn_");
}

function supportsStableModelSelection(voiceType: string): boolean {
  return voiceType.startsWith("saturn_");
}

function parseChunkedJson(raw: string): V3Chunk[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as V3Chunk];
      } catch {
        return [];
      }
    });
}

function buildAdditions(contextTexts?: string[]): string {
  const normalizedContextTexts = contextTexts?.length
    ? [contextTexts[0]]
    : [DEFAULT_CONTEXT_TEXT];

  return JSON.stringify({
    silence_duration: 125,
    disable_markdown_filter: true,
    context_texts: normalizedContextTexts,
  });
}

export function buildTtsPayload(text: string, options: TTSOptions = {}) {
  const voice_type = options.voice_type || DEFAULT_VOICE;
  const speech_rate = clampRange(options.speech_rate ?? 0, -50, 100);
  const loudness_rate = clampRange(options.loudness_rate ?? 0, -50, 100);
  const sample_rate = options.sample_rate ?? 24000;
  const bit_rate = options.bit_rate ?? 128000;

  const audio_params: Record<string, unknown> = {
    format: options.encoding ?? "mp3",
    sample_rate,
    bit_rate,
    speech_rate,
    loudness_rate,
  };

  if (options.emotion) {
    audio_params.emotion = options.emotion;
    audio_params.emotion_scale = options.emotion_scale ?? 4;
  }

  const req_params: Record<string, unknown> = {
    text,
    speaker: voice_type,
    audio_params,
    additions: buildAdditions(isTts20Voice(voice_type) ? options.context_texts : undefined),
  };

  if (supportsStableModelSelection(voice_type)) {
    req_params.model = DEFAULT_MODEL;
  }

  return {
    user: {
      uid: "aihost-user",
    },
    req_params,
  };
}

/**
 * Convert text to speech using ByteDance V3 unidirectional TTS API.
 * The service returns chunked newline-delimited JSON. Each JSON line may contain
 * a base64-encoded audio fragment in `data`, which must be concatenated.
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const payload = buildTtsPayload(text, options);

  const response = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-App-Id": APP_ID,
      "X-Api-Access-Key": ACCESS_TOKEN,
      "X-Api-Resource-Id": RESOURCE_ID,
      "X-Api-Request-Id": crypto.randomUUID(),
      "X-Control-Require-Usage-Tokens-Return": "*",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`TTS API error ${response.status}: ${rawText}`);
  }

  const chunks = parseChunkedJson(rawText);
  if (chunks.length === 0) {
    throw new Error(`TTS API returned an unreadable chunked response: ${rawText.slice(0, 500)}`);
  }

  const audioParts: Buffer[] = [];
  for (const chunk of chunks) {
    if (chunk.code && chunk.code !== 0 && chunk.code !== 20000000) {
      throw new Error(`TTS V3 error code ${chunk.code}: ${chunk.message || "Unknown error"}`);
    }

    if (typeof chunk.data === "string" && chunk.data.length > 0) {
      audioParts.push(Buffer.from(chunk.data, "base64"));
    }
  }

  if (audioParts.length === 0) {
    throw new Error(`TTS API returned no audio payload: ${rawText.slice(0, 500)}`);
  }

  return Buffer.concat(audioParts);
}

/**
 * Helper to call TTS and return as base64 string for easy storage/transport.
 */
export async function textToSpeechBase64(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  const buffer = await textToSpeech(text, options);
  return buffer.toString("base64");
}
