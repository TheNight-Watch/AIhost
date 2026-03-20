import { NextResponse } from "next/server";
import { textToSpeechBase64 } from "@/lib/doubao/tts";

/**
 * POST /api/tts-realtime
 *
 * Lightweight TTS endpoint for real-time use during broadcast.
 * Returns base64 audio directly (no Supabase upload).
 *
 * Request: { text: string, voice_type?: string, speech_rate?: number, silence_duration?: number }
 * Response: { audio_base64: string }
 */
export async function POST(request: Request) {
  try {
    const { text, voice_type, speech_rate, silence_duration } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const audioBase64 = await textToSpeechBase64(text, {
      voice_type: voice_type || undefined,
      speech_rate: typeof speech_rate === "number" ? speech_rate : 0,
      silence_duration: typeof silence_duration === "number" ? silence_duration : 0,
    });

    return NextResponse.json({ audio_base64: audioBase64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
