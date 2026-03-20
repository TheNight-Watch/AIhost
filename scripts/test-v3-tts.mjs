import fs from "node:fs/promises";
import path from "node:path";

const ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

function getArg(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((arg) => arg.startsWith(prefix));
  if (!entry) return fallback;
  return entry.slice(prefix.length);
}

function decodeAudioPayload(data) {
  if (typeof data !== "string" || !data.length) return null;
  return Buffer.from(data, "base64");
}

async function main() {
  const appId = process.env.DOUBAO_APP_ID || getArg("app-id");
  const accessToken = process.env.DOUBAO_ACCESS_TOKEN || getArg("access-token");
  const resourceId = process.env.DOUBAO_TTS_RESOURCE_ID || getArg("resource-id", "seed-tts-2.0");
  const speaker = getArg("speaker", "zh_female_vv_uranus_bigtts");
  const text = getArg("text", "各位来宾，欢迎来到活动现场。");
  const output = getArg("output", path.resolve(process.cwd(), "tmp/v3-tts-test.mp3"));

  if (!appId || !accessToken) {
    throw new Error("Missing app-id/access-token. Pass via env or --app-id/--access-token.");
  }

  const payload = {
    user: {
      uid: "aihost-test",
    },
    req_params: {
      text,
      speaker,
      audio_params: {
        format: "mp3",
        sample_rate: 24000,
        bit_rate: 128000,
        speech_rate: 30,
      },
      additions: JSON.stringify({
        silence_duration: 125,
        disable_markdown_filter: true,
        context_texts: ["你现在是一位专业活动主持人，语气自信，关键处稍微加强。"],
      }),
    },
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-App-Id": appId,
      "X-Api-Access-Key": accessToken,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": crypto.randomUUID(),
      "X-Control-Require-Usage-Tokens-Return": "*",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  console.log("status:", response.status);
  console.log("content-type:", response.headers.get("content-type"));
  console.log("x-tt-logid:", response.headers.get("x-tt-logid"));

  if (!response.ok) {
    console.error("non-200 response:");
    console.error(rawText);
    process.exitCode = 1;
    return;
  }

  try {
    const parsed = JSON.parse(rawText);
    console.log("parsed response:");
    console.log(JSON.stringify(parsed, null, 2));

    const audio = decodeAudioPayload(parsed.data);
    if (!audio) {
      console.error("response did not contain base64 audio in `data`");
      process.exitCode = 1;
      return;
    }

    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, audio);
    console.log("audio written to:", output);
    console.log("audio bytes:", audio.length);
    return;
  } catch {
    console.log("raw response (non-JSON or chunked):");
    console.log(rawText.slice(0, 2000));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
