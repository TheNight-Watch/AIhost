import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../api-client.js";
import { fail, ok, toToolText } from "../types.js";

interface BroadcastStatus {
  connected: boolean;
  phase: string;
  current_index: number;
  total_lines: number;
  event_id: string | null;
  silence_ms: number;
  has_yes: boolean;
  enhance_status: string;
}

export function registerBroadcastTools(server: McpServer) {
  server.tool(
    "get_broadcast_status",
    "Check whether the browser execution page is connected and what phase the broadcast engine is in.",
    {},
    async () => {
      try {
        const result = await apiGet<BroadcastStatus>("/api/broadcast/status");
        return { content: [{ type: "text" as const, text: toToolText(ok(result)) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("GET_BROADCAST_STATUS_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "start_broadcast",
    "Start the AIHost browser broadcast engine for an event.",
    {
      event_id: z.string(),
      enhance_mode: z.boolean().optional(),
    },
    async ({ event_id, enhance_mode }) => {
      try {
        const status = await apiGet<BroadcastStatus>("/api/broadcast/status");

        if (!status.connected) {
          return {
            content: [{
              type: "text" as const,
              text: toToolText(
                fail(
                  "BROWSER_NOT_CONNECTED",
                  "The AIHost script page is not connected.",
                  `Ask the user to open /zh/script/${event_id} in the AIHost app, then retry start_broadcast.`
                )
              ),
            }],
          };
        }

        if (status.phase !== "idle") {
          return {
            content: [{
              type: "text" as const,
              text: toToolText(
                fail(
                  "BROADCAST_ALREADY_ACTIVE",
                  `Broadcast is already active in phase "${status.phase}".`,
                  "Use get_broadcast_status to inspect state or stop_broadcast before restarting."
                )
              ),
            }],
          };
        }

        const result = await apiPost<{ success: boolean; message: string }>("/api/broadcast/start", {
          event_id,
          enhance_mode: enhance_mode ?? false,
        });

        return {
          content: [{
            type: "text" as const,
            text: toToolText(ok({
              message: result.message,
              event_id,
              enhance_mode: enhance_mode ?? false,
            })),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("START_BROADCAST_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "skip_to_next",
    "Skip the current step and advance to the next script line.",
    {},
    async () => {
      try {
        const result = await apiPost<{ success: boolean; message: string }>("/api/broadcast/skip", {});
        return { content: [{ type: "text" as const, text: toToolText(ok({ message: result.message })) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("SKIP_TO_NEXT_FAILED", message)) }] };
      }
    }
  );

  server.tool(
    "stop_broadcast",
    "Stop the AIHost browser broadcast engine.",
    {},
    async () => {
      try {
        const result = await apiPost<{ success: boolean; message: string }>("/api/broadcast/stop", {});
        return { content: [{ type: "text" as const, text: toToolText(ok({ message: result.message })) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text" as const, text: toToolText(fail("STOP_BROADCAST_FAILED", message)) }] };
      }
    }
  );
}
