import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/doubao/tts";

export async function POST(request: NextRequest) {
  try {
    const { voice_type, text } = await request.json();

    if (!voice_type || !text) {
      return NextResponse.json({ error: "voice_type and text are required" }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(text, { voice_type, speech_rate: 0 });

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Preview voice error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}
