import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../api-client.js";
import { supabase } from "../supabase.js";
import { fail, ok, toToolText } from "../types.js";

export function registerScriptTools(server: McpServer) {
  server.tool(
    "get_script",
    "Get ordered script lines for an event.",
    {
      event_id: z.string(),
    },
    async ({ event_id }) => {
      const { data, error } = await supabase
        .from("script_lines")
        .select("*")
        .eq("event_id", event_id)
        .order("sort_order", { ascending: true });

      if (error) {
        return { content: [{ type: "text" as const, text: toToolText(fail("GET_SCRIPT_FAILED", error.message)) }] };
      }

      const lines = data ?? [];
      const audioReady = lines.filter((line) => !!line.audio_url).length;

      return {
        content: [{
          type: "text" as const,
          text: toToolText(ok({
            event_id,
            total_lines: lines.length,
            audio_ready: audioReady,
            lines,
          })),
        }],
      };
    }
  );

  server.tool(
    "generate_script",
    "Regenerate script lines for an event from agenda text.",
    {
      event_id: z.string(),
      agenda_text: z.string(),
      mode: z.enum(["extract", "generate"]).optional(),
    },
    async ({ event_id, agenda_text, mode }) => {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("title")
        .eq("id", event_id)
        .single();

      if (eventError) {
        return { content: [{ type: "text" as const, text: toToolText(fail("EVENT_NOT_FOUND", eventError.message)) }] };
      }

      try {
        const result = await apiPost<{
          success: boolean;
          script_lines: Array<{ id: string; sort_order: number; speaker: string; content: string }>;
        }>("/api/generate-script", {
          event_id,
          agenda_text,
          event_title: event?.title ?? "",
          mode: mode ?? "extract",
        });

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok({
              event_id,
              lines_count: result.script_lines.length,
              lines: result.script_lines,
            }, "Regenerate audio next because script content may have changed.")),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("GENERATE_SCRIPT_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "refine_script_line",
    "Ask AI to rewrite a single script line before saving it.",
    {
      current_content: z.string(),
      instruction: z.string(),
    },
    async ({ current_content, instruction }) => {
      try {
        const result = await apiPost<{ refinedContent: string }>("/api/chat-refine", {
          currentContent: current_content,
          instruction,
        });

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok({
              original: current_content,
              refined: result.refinedContent,
            }, "Call update_script_line to persist the refined content.")),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("REFINE_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "update_script_line",
    "Save new text to a script line and invalidate existing audio for that line.",
    {
      line_id: z.string(),
      content: z.string(),
    },
    async ({ line_id, content }) => {
      const { data, error } = await supabase
        .from("script_lines")
        .update({
          content,
          audio_url: null,
          duration_ms: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line_id)
        .select()
        .single();

      if (error || !data) {
        return { content: [{ type: "text" as const, text: toToolText(fail("UPDATE_SCRIPT_LINE_FAILED", error?.message || "Failed to update line")) }] };
      }

      return {
        content: [{
          type: "text" as const,
          text: toToolText(ok({
            line: data,
            audio_invalidated: true,
          }, `Regenerate audio for line_id="${line_id}" before using it live.`)),
        }],
      };
    }
  );
}
