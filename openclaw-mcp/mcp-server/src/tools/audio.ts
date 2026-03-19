import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../api-client.js";
import { fail, ok, toToolText } from "../types.js";

export function registerAudioTools(server: McpServer) {
  server.tool(
    "generate_audio",
    "Generate TTS audio for one script line.",
    {
      line_id: z.string(),
      event_id: z.string(),
      content: z.string(),
      voice_type: z.string().optional(),
    },
    async ({ line_id, event_id, content, voice_type }) => {
      try {
        const result = await apiPost<{
          success: boolean;
          audio_url: string | null;
          duration_ms: number;
        }>("/api/generate-audio", { line_id, event_id, content, voice_type });

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok({
              audio_url: result.audio_url,
              duration_ms: result.duration_ms,
            })),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("GENERATE_AUDIO_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "generate_audio_batch",
    "Generate TTS audio for all script lines in an event.",
    {
      event_id: z.string(),
      voice_type: z.string().optional(),
    },
    async ({ event_id, voice_type }) => {
      try {
        const result = await apiPost<{
          success: boolean;
          total: number;
          generated: number;
          results: Array<{ line_id: string; audio_url: string | null; error?: string }>;
        }>("/api/generate-audio-batch", { event_id, voice_type });

        const failedLines = result.results
          .filter((item) => item.error)
          .map((item) => ({ line_id: item.line_id, error: item.error }));

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok({
              generated: result.generated,
              total: result.total,
              failed_lines: failedLines,
            }, failedLines.length === 0
              ? "Open the script page and start broadcast when the browser is connected."
              : "Retry failed lines individually before going live.")),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("GENERATE_AUDIO_BATCH_FAILED", message)) }] };
      }
    }
  );
}
