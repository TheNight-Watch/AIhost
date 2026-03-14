import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { textToSpeechBase64 } from "@/lib/doubao/tts";

export async function POST(request: NextRequest) {
  try {
    const { line_id, event_id, content, voice_type } = await request.json();

    if (!line_id || !content) {
      return NextResponse.json({ error: "line_id and content are required" }, { status: 400 });
    }

    // Generate audio
    const audioBase64 = await textToSpeechBase64(content, {
      voice_type: voice_type || "zh_female_vv_uranus_bigtts",
    });

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const durationMs = Math.round((audioBuffer.length / (24000 * 2)) * 1000); // rough estimate

    // Upload to Supabase Storage
    let audioUrl: string | null = null;
    try {
      const supabase = createServiceClient();
      const fileName = `${event_id || "event"}/${line_id}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName);
        audioUrl = publicUrl;

        // Update script line record
        await supabase
          .from("script_lines")
          .update({ audio_url: audioUrl, duration_ms: durationMs })
          .eq("id", line_id);
      }
    } catch (storageErr) {
      console.error("Storage error:", storageErr);
      // Return audio as base64 if storage fails
    }

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      audio_base64: audioUrl ? undefined : audioBase64,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error("Generate audio error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audio generation failed" },
      { status: 500 }
    );
  }
}
