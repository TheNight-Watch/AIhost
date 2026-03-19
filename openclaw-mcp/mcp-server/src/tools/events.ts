import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../api-client.js";
import { supabase } from "../supabase.js";
import { fail, ok, toToolText } from "../types.js";

const USER_ID = process.env.AIHOST_USER_ID || "451190a4-ed87-433e-86e4-7a13447b7ae1";

export function registerEventTools(server: McpServer) {
  server.tool(
    "list_events",
    "List AIHost events so the agent can reuse an existing event before creating a new one.",
    {
      status: z.enum(["draft", "ready", "live", "completed"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ status, limit }) => {
      let query = supabase
        .from("events")
        .select("id, title, description, status, voice_id, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit ?? 20);

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text" as const, text: toToolText(fail("SUPABASE_ERROR", error.message)) }] };
      }

      return { content: [{ type: "text" as const, text: toToolText(ok({ events: data ?? [] })) }] };
    }
  );

  server.tool(
    "get_event",
    "Get one event with script and audio readiness summary.",
    {
      event_id: z.string(),
    },
    async ({ event_id }) => {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", event_id)
        .single();

      if (eventError || !event) {
        return { content: [{ type: "text" as const, text: toToolText(fail("EVENT_NOT_FOUND", eventError?.message || "Event not found")) }] };
      }

      const { data: lines, error: lineError } = await supabase
        .from("script_lines")
        .select("id, audio_url")
        .eq("event_id", event_id);

      if (lineError) {
        return { content: [{ type: "text" as const, text: toToolText(fail("SCRIPT_QUERY_FAILED", lineError.message)) }] };
      }

      const total = lines?.length ?? 0;
      const audioReady = lines?.filter((line) => !!line.audio_url).length ?? 0;

      return {
        content: [{
          type: "text" as const,
          text: toToolText(ok({
            event,
            script_lines_count: total,
            audio_ready_count: audioReady,
          })),
        }],
      };
    }
  );

  server.tool(
    "create_event",
    "Create a new event and generate script lines from agenda text.",
    {
      title: z.string(),
      description: z.string().optional(),
      agenda_text: z.string(),
      mode: z.enum(["extract", "generate"]).optional(),
    },
    async ({ title, description, agenda_text, mode }) => {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          title,
          description: description ?? null,
          status: "draft",
          user_id: USER_ID,
        })
        .select()
        .single();

      if (eventError || !event) {
        return { content: [{ type: "text" as const, text: toToolText(fail("CREATE_EVENT_FAILED", eventError?.message || "Failed to create event")) }] };
      }

      try {
        const result = await apiPost<{
          success: boolean;
          script_lines: Array<{ id: string; sort_order: number; speaker: string; content: string }>;
        }>("/api/generate-script", {
          event_id: event.id,
          agenda_text,
          event_title: title,
          mode: mode ?? "extract",
        });

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok(
              {
                event,
                script_lines: result.script_lines,
              },
              `Generate event audio next with generate_audio_batch for event_id="${event.id}".`
            )),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("GENERATE_SCRIPT_FAILED", message)) }] };
      }
    }
  );
}
