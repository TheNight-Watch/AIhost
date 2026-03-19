import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateScript, generateScriptFromAgenda, generateScriptFromImage } from "@/lib/doubao/llm";
import type { AdvanceMode } from "@/types";

interface GenerateScriptRequest {
  event_id: string;
  agenda_text?: string;
  agenda_image_base64?: string;
  event_title?: string;
  mode?: "extract" | "generate"; // extract = split existing script, generate = create from agenda
}

function generateFallbackScript() {
  return [
    { sort_order: 1, speaker: "host", content: "各位嘉宾、各位朋友，大家上午好！欢迎来到本次活动。我是今天的 AI 主持人，非常荣幸能与大家共度这段精彩的时光。", advance_mode: "continue" as AdvanceMode, duration_ms: 12000 },
    { sort_order: 2, speaker: "host", content: "今天的活动汇聚了来自各界的嘉宾，我们将共同探讨重要议题，期待大家积极参与互动。", advance_mode: "continue" as AdvanceMode, duration_ms: 10000 },
    { sort_order: 3, speaker: "host", content: "首先，让我们按照议程，开始今天的第一个环节。请大家保持手机静音，专心聆听。", advance_mode: "listen" as AdvanceMode, duration_ms: 9000 },
    { sort_order: 4, speaker: "host", content: "感谢各位嘉宾的精彩分享。接下来是茶歇时间，请各位前往休息区，我们将在 15 分钟后继续。", advance_mode: "manual" as AdvanceMode, duration_ms: 9000 },
    { sort_order: 5, speaker: "host", content: "欢迎回来！现在进入互动交流环节，欢迎大家踊跃提问，共同探讨。", advance_mode: "listen" as AdvanceMode, duration_ms: 8000 },
    { sort_order: 6, speaker: "host", content: "今天的活动到此圆满结束。感谢所有嘉宾的精彩分享，感谢每一位到场的朋友。期待下次再见！", advance_mode: "manual" as AdvanceMode, duration_ms: 10000 },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateScriptRequest;
    const { event_id, agenda_text, agenda_image_base64, event_title, mode = "extract" } = body;

    if (!event_id) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    if (!agenda_text && !agenda_image_base64) {
      return NextResponse.json({ error: "Either agenda_text or agenda_image_base64 is required" }, { status: 400 });
    }

    // Get event title from DB if not provided
    let title = event_title || "Event";
    let supabase;
    try {
      supabase = createServiceClient();
      const { data: event } = await supabase.from("events").select("title").eq("id", event_id).single();
      if (event?.title) title = event.title;
    } catch {
      // Supabase not configured
    }

    // Process script lines using Ark LLM
    let scriptLines;

    try {
      let generated;
      if (agenda_image_base64) {
        // Multimodal: analyze image → always generate mode (images are typically agendas/flowcharts)
        generated = await generateScriptFromImage(agenda_image_base64, title);
      } else if (mode === "generate") {
        // Generate mode: create MC script from agenda description
        generated = await generateScriptFromAgenda(agenda_text!, title);
      } else {
        // Extract mode: split existing script into spoken lines
        generated = await generateScript(agenda_text!, title);
      }
      scriptLines = generated.map((line, i) => ({
        sort_order: line.sort_order || i + 1,
        speaker: line.speaker || "host",
        content: line.content,
        advance_mode: line.advance_mode || "listen",
        duration_ms: Math.round(line.content.length * 150), // rough estimate
      }));
    } catch (llmErr) {
      console.error("LLM extraction failed, using fallback:", llmErr);
      scriptLines = generateFallbackScript();
    }

    // Save to Supabase
    let savedLines = scriptLines.map((line) => ({
      id: crypto.randomUUID(),
      event_id,
      ...line,
      audio_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Skip DB operations for preview mode (event_id === "preview")
    const isPreview = event_id === "preview";

    if (supabase && !isPreview) {
      try {
        // Verify event exists
        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("id")
          .eq("id", event_id)
          .single();

        if (eventError || !event) {
          return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Delete existing lines
        await supabase.from("script_lines").delete().eq("event_id", event_id);

        // Insert new lines
        const { data: insertedLines, error: insertError } = await supabase
          .from("script_lines")
          .insert(
            scriptLines.map((line) => ({
              event_id,
              sort_order: line.sort_order,
              speaker: line.speaker,
              content: line.content,
              advance_mode: line.advance_mode,
              duration_ms: line.duration_ms,
            }))
          )
          .select();

        if (!insertError && insertedLines) {
          savedLines = insertedLines.map((line) => ({
            ...line,
            audio_url: line.audio_url ?? null,
          }));
        }

        // Update event status to ready
        await supabase.from("events").update({ status: "ready" }).eq("id", event_id);
      } catch (dbErr) {
        console.error("DB error:", dbErr);
      }
    }

    return NextResponse.json({ success: true, script_lines: savedLines });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
