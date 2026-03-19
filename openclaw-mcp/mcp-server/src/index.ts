import "./env.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAudioTools } from "./tools/audio.js";
import { registerBroadcastTools } from "./tools/broadcast.js";
import { registerEventTools } from "./tools/events.js";
import { registerScriptTools } from "./tools/script.js";

const server = new McpServer({
  name: "aihost-openclaw",
  version: "0.1.0",
});

registerEventTools(server);
registerScriptTools(server);
registerAudioTools(server);
registerBroadcastTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("AIHost OpenClaw MCP server running on stdio");
console.error(`API target: ${process.env.AIHOST_API_URL || "http://localhost:3000"}`);
