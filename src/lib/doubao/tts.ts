const TTS_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts";
const APP_ID = process.env.DOUBAO_APP_ID!;
const ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN!;
const CLUSTER = process.env.DOUBAO_TTS_CLUSTER || "volcano_tts";
const DEFAULT_VOICE = "zh_female_vv_uranus_bigtts";

export interface TTSOptions {
  voice_type?: string;
  speed_ratio?: number;
  volume_ratio?: number;
  pitch_ratio?: number;
  encoding?: "mp3" | "pcm" | "ogg_opus" | "wav";
  sample_rate?: number;
}

/**
 * Convert text to speech using Doubao TTS API.
 * Returns raw audio bytes (mp3 by default).
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const {
    voice_type = DEFAULT_VOICE,
    speed_ratio = 1.0,
    volume_ratio = 1.0,
    pitch_ratio = 1.0,
    encoding = "mp3",
    sample_rate = 24000,
  } = options;

  const reqId = crypto.randomUUID();

  const payload = {
    app: {
      appid: APP_ID,
      token: ACCESS_TOKEN,
      cluster: CLUSTER,
    },
    user: {
      uid: "aihost-user",
    },
    audio: {
      voice_type,
      encoding,
      speed_ratio,
      volume_ratio,
      pitch_ratio,
      sample_rate,
    },
    request: {
      reqid: reqId,
      text,
      text_type: "plain",
      operation: "query",
      silence_duration: "125",
      with_frontend: "1",
      frontend_type: "unitTson",
    },
  };

  const response = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer;${ACCESS_TOKEN}`,
      "X-Api-App-Key": APP_ID,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TTS API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (data.code !== 3000) {
    throw new Error(`TTS error code ${data.code}: ${data.message || "Unknown error"}`);
  }

  // data.data is base64-encoded audio
  const audioBase64: string = data.data;
  return Buffer.from(audioBase64, "base64");
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
