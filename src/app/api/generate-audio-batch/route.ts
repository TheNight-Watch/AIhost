import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { textToSpeechBase64 } from "@/lib/doubao/tts";
import { resolveVoiceForLine } from "@/lib/voice-assignment";

export async function POST(request: NextRequest) {
  try {
    const { event_id, voice_type } = await request.json();

    if (!event_id) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const [{ data: event, error: eventError }, { data: lines, error: linesError }] = await Promise.all([
      supabase
        .from("events")
        .select("voice_id, secondary_voice_id, voice_mode")
        .eq("id", event_id)
        .single(),
      supabase
        .from("script_lines")
        .select("id, content, speaker, sort_order")
        .eq("event_id", event_id)
        .order("sort_order"),
    ]);

    if (eventError || !event) {
      return NextResponse.json({ error: "Failed to fetch event voice configuration" }, { status: 500 });
    }

    if (linesError || !lines) {
      return NextResponse.json({ error: "Failed to fetch script lines" }, { status: 500 });
    }

    const results: Array<{ line_id: string; audio_url: string | null; error?: string }> = [];

    // Process lines sequentially to avoid rate limiting
    for (const line of lines) {
      try {
        const resolvedVoice = resolveVoiceForLine(lines, line.id, {
          voice_id: event.voice_id ?? voice_type ?? "zh_female_vv_uranus_bigtts",
          secondary_voice_id: event.secondary_voice_id ?? null,
          voice_mode: event.voice_mode ?? "single",
        });

        const audioBase64 = await textToSpeechBase64(line.content, {
          voice_type: resolvedVoice,
        });

        const audioBuffer = Buffer.from(audioBase64, "base64");
        const durationMs = Math.round((audioBuffer.length / (24000 * 2)) * 1000);
        const fileName = `${event_id}/${line.id}.mp3`;

        const { error: uploadError } = await supabase.storage
          .from("audio")
          .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName);

          await supabase
            .from("script_lines")
            .update({ audio_url: publicUrl, duration_ms: durationMs, audio_needs_regen: false })
            .eq("id", line.id);

          results.push({ line_id: line.id, audio_url: publicUrl });
        } else {
          results.push({ line_id: line.id, audio_url: null, error: uploadError.message });
        }
      } catch (lineErr) {
        results.push({
          line_id: line.id,
          audio_url: null,
          error: lineErr instanceof Error ? lineErr.message : "Generation failed",
        });
      }
    }

    const successCount = results.filter((r) => r.audio_url).length;

    return NextResponse.json({
      success: true,
      total: lines.length,
      generated: successCount,
      results,
    });
  } catch (err) {
    console.error("Batch generate audio error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Batch generation failed" },
      { status: 500 }
    );
  }
}
