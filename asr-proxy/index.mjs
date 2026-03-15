/**
 * ASR WebSocket Proxy Server
 *
 * Browser (PCM audio via WS) → this proxy → Doubao ASR 2.0 BigModel (binary protocol)
 * ASR results ← this proxy ← Doubao ASR 2.0 BigModel
 *
 * Environment variables:
 *   ASR_APP_ID      — Doubao ASR App ID
 *   ASR_ACCESS_KEY  — Doubao ASR Access Key
 *   PORT            — Server port (Railway provides this automatically)
 */

import { WebSocketServer, WebSocket } from "ws";
import { gzipSync, gunzipSync } from "zlib";
import { randomUUID } from "crypto";

// ── Config ──────────────────────────────────────────
const PROXY_PORT = parseInt(process.env.PORT || "8765", 10);
const ASR_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async";
const ASR_APP_ID = process.env.ASR_APP_ID;
const ASR_ACCESS_KEY = process.env.ASR_ACCESS_KEY;
const ASR_RESOURCE_ID = "volc.seedasr.sauc.duration";

if (!ASR_APP_ID || !ASR_ACCESS_KEY) {
  console.error("[ASR Proxy] FATAL: ASR_APP_ID and ASR_ACCESS_KEY environment variables are required");
  process.exit(1);
}

// ── Protocol constants ──────────────────────────────
const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE_VAL = 0b0001;
const FULL_CLIENT_REQUEST = 0b0001;
const AUDIO_ONLY_REQUEST = 0b0010;
const FULL_SERVER_RESPONSE = 0b1001;
const SERVER_ERROR_RESPONSE = 0b1111;
const NO_SEQUENCE = 0b0000;
const POS_SEQUENCE = 0b0001;
const NEG_SEQUENCE = 0b0010;
const NEG_WITH_SEQUENCE = 0b0011;
const JSON_SERIAL = 0b0001;
const NO_SERIAL = 0b0000;
const GZIP = 0b0001;
const NO_COMPRESSION = 0b0000;

function buildHeader(messageType, flags = NO_SEQUENCE, serial = JSON_SERIAL, compression = GZIP) {
  const header = Buffer.alloc(4);
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE_VAL;
  header[1] = (messageType << 4) | flags;
  header[2] = (serial << 4) | compression;
  header[3] = 0x00;
  return header;
}

function buildFullClientRequest(requestId) {
  const payload = {
    user: { uid: requestId },
    audio: {
      format: "pcm",
      rate: 16000,
      bits: 16,
      channel: 1,
      codec: "raw",
    },
    request: {
      model_name: "bigmodel",
      enable_itn: true,
      enable_punc: true,
      result_type: "single",
      show_utterances: true,
      end_window_size: 800,
    },
  };

  const jsonBuf = Buffer.from(JSON.stringify(payload), "utf-8");
  const compressed = gzipSync(jsonBuf);
  const header = buildHeader(FULL_CLIENT_REQUEST, NO_SEQUENCE, JSON_SERIAL, GZIP);
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(compressed.length);
  return Buffer.concat([header, sizeBuf, compressed]);
}

function buildAudioPacket(pcmData, isLast = false) {
  const flags = isLast ? NEG_SEQUENCE : NO_SEQUENCE;
  const compressed = gzipSync(pcmData);
  const header = buildHeader(AUDIO_ONLY_REQUEST, flags, NO_SERIAL, GZIP);
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(compressed.length);
  return Buffer.concat([header, sizeBuf, compressed]);
}

function buildLastAudioPacket() {
  const header = buildHeader(AUDIO_ONLY_REQUEST, NEG_SEQUENCE, NO_SERIAL, GZIP);
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(0);
  return Buffer.concat([header, sizeBuf]);
}

function parseServerResponse(data) {
  const buf = Buffer.from(data);
  if (buf.length < 4) return null;

  const messageType = (buf[1] >> 4) & 0x0f;
  const flags = buf[1] & 0x0f;
  const serialMethod = (buf[2] >> 4) & 0x0f;
  const compression = buf[2] & 0x0f;

  if (messageType === SERVER_ERROR_RESPONSE) {
    if (buf.length < 12) return { type: "error", data: { message: "Unknown error" } };
    const errorCode = buf.readUInt32BE(4);
    const errorSize = buf.readUInt32BE(8);
    let errorMsg = "";
    if (errorSize > 0 && buf.length >= 12 + errorSize) {
      errorMsg = buf.subarray(12, 12 + errorSize).toString("utf-8");
    }
    return { type: "error", data: { code: errorCode, message: errorMsg } };
  }

  if (messageType === FULL_SERVER_RESPONSE) {
    const hasSequence = (flags & 0b0001) === 1 || (flags & 0b0011) === 0b0011;
    let offset = 4;

    if (hasSequence) {
      offset += 4;
    }

    if (buf.length < offset + 4) {
      return { type: "ack", data: null };
    }

    const payloadSize = buf.readUInt32BE(offset);
    offset += 4;

    if (payloadSize === 0) {
      return { type: "ack", data: null };
    }

    if (buf.length < offset + payloadSize) {
      console.error(`[Parse] Buffer too short: need ${offset + payloadSize}, got ${buf.length}`);
      return null;
    }

    let payload = buf.subarray(offset, offset + payloadSize);

    if (compression === GZIP) {
      try {
        payload = gunzipSync(payload);
      } catch (e) {
        console.error(`[Parse] Gzip decompress failed:`, e.message);
        return null;
      }
    }

    try {
      const json = JSON.parse(payload.toString("utf-8"));
      const isLast = flags === NEG_SEQUENCE || flags === NEG_WITH_SEQUENCE;
      return { type: "result", data: json, isLast };
    } catch (e) {
      console.error(`[Parse] JSON parse failed:`, e.message);
      return null;
    }
  }

  return { type: "unknown", messageType, data: null };
}

// ── HTTP server + WebSocket upgrade ─────────────────
import { createServer } from "http";

const server = createServer((req, res) => {
  // Health check for Railway
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ASR Proxy OK");
});

const wss = new WebSocketServer({ server });
server.listen(PROXY_PORT, () => {
  console.log(`[ASR Proxy] listening on port ${PROXY_PORT}`);
  console.log(`[ASR Proxy] ASR endpoint: ${ASR_URL}`);
});

wss.on("connection", (clientWs) => {
  const connectId = randomUUID();
  console.log(`[ASR Proxy] browser connected: ${connectId}`);

  const asrWs = new WebSocket(ASR_URL, {
    headers: {
      "X-Api-Resource-Id": ASR_RESOURCE_ID,
      "X-Api-Access-Key": ASR_ACCESS_KEY,
      "X-Api-App-Key": ASR_APP_ID,
      "X-Api-Connect-Id": connectId,
    },
  });

  let asrReady = false;
  let pendingChunks = [];
  let firstResponse = true;

  asrWs.on("open", () => {
    console.log(`[ASR Proxy] connected to ASR service`);
    const initPacket = buildFullClientRequest(connectId);
    asrWs.send(initPacket);
    console.log(`[ASR Proxy] sent full client request`);
  });

  asrWs.on("message", (rawData) => {
    const parsed = parseServerResponse(rawData);
    if (!parsed) return;

    if (firstResponse && (parsed.type === "result" || parsed.type === "ack")) {
      firstResponse = false;
      if (!asrReady) {
        asrReady = true;
        console.log(`[ASR Proxy] ASR session ready, flushing ${pendingChunks.length} pending chunks`);
        for (const chunk of pendingChunks) {
          asrWs.send(buildAudioPacket(chunk));
        }
        pendingChunks = [];
        clientWs.send(JSON.stringify({ type: "ready" }));
      }
    }

    if (parsed.type === "result") {
      const result = parsed.data?.result;
      if (result) {
        const utterances = result.utterances || [];
        const definiteSentences = utterances
          .filter((u) => u.definite === true)
          .map((u) => ({
            text: u.text,
            start_time: u.start_time,
            end_time: u.end_time,
            definite: true,
          }));

        clientWs.send(
          JSON.stringify({
            type: "asr_result",
            data: {
              text: result.text || "",
              utterances,
              definite_sentences: definiteSentences,
              is_last: parsed.isLast || false,
            },
          })
        );

        if (definiteSentences.length > 0) {
          console.log(
            `[ASR Proxy] definite: "${definiteSentences.map((s) => s.text).join(" | ")}"`
          );
        }
      }
    }

    if (parsed.type === "error") {
      console.error(`[ASR Proxy] ASR error:`, JSON.stringify(parsed.data));
      clientWs.send(JSON.stringify({ type: "asr_error", data: parsed.data }));
    }
  });

  asrWs.on("error", (err) => {
    console.error(`[ASR Proxy] ASR WebSocket error:`, err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "asr_error", data: { message: err.message } }));
    }
  });

  asrWs.on("close", (code, reason) => {
    console.log(`[ASR Proxy] ASR connection closed: ${code} ${reason?.toString()}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "asr_closed" }));
    }
  });

  clientWs.on("message", (data) => {
    if (typeof data === "string") {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "stop") {
          console.log(`[ASR Proxy] browser requested stop`);
          if (asrWs.readyState === WebSocket.OPEN) {
            asrWs.send(buildLastAudioPacket());
          }
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      const pcmBuf = Buffer.from(data);
      if (asrReady && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(buildAudioPacket(pcmBuf));
      } else {
        pendingChunks.push(pcmBuf);
      }
    }
  });

  clientWs.on("close", () => {
    console.log(`[ASR Proxy] browser disconnected`);
    if (asrWs.readyState === WebSocket.OPEN) {
      asrWs.send(buildLastAudioPacket());
      setTimeout(() => asrWs.close(), 500);
    }
  });
});
