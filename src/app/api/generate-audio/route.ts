import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { textToSpeechBase64 } from "@/lib/doubao/tts";
import { resolveVoiceForLine } from "@/lib/voice-assignment";

function withCacheBust(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const { line_id, event_id, content, voice_type, speech_rate } = await request.json();

    if (!line_id || !content) {
      return NextResponse.json({ error: "line_id and content are required" }, { status: 400 });
    }

    let resolvedVoice = voice_type || "zh_female_vv_uranus_bigtts";
    if (event_id) {
      try {
        const supabase = createServiceClient();
        const [{ data: event }, { data: lines }] = await Promise.all([
          supabase
            .from("events")
            .select("voice_id, secondary_voice_id, voice_mode")
            .eq("id", event_id)
            .single(),
          supabase
            .from("script_lines")
            .select("id, speaker, sort_order")
            .eq("event_id", event_id)
            .order("sort_order"),
        ]);

        if (event && lines) {
          resolvedVoice = resolveVoiceForLine(lines, line_id, {
            voice_id: event.voice_id ?? resolvedVoice,
            secondary_voice_id: event.secondary_voice_id ?? null,
            voice_mode: event.voice_mode ?? "single",
          });
        }
      } catch {
        // Fall back to the requested voice type.
      }
    }

    // Generate audio
    const audioBase64 = await textToSpeechBase64(content, {
      voice_type: resolvedVoice,
      speech_rate,
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
        audioUrl = withCacheBust(publicUrl);

        // Update script line record
        await supabase
          .from("script_lines")
          .update({ audio_url: audioUrl, duration_ms: durationMs, audio_needs_regen: false })
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
