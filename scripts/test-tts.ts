import { config } from "dotenv";
import { randomUUID } from "crypto";
import { writeFileSync } from "fs";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID!;
const DOUBAO_ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN!;
const DOUBAO_TTS_CLUSTER = process.env.DOUBAO_TTS_CLUSTER!;

async function testTTS() {
  console.log("=== Doubao TTS API Test ===\n");
  console.log(`App ID: ${DOUBAO_APP_ID}`);
  console.log(`Cluster: ${DOUBAO_TTS_CLUSTER}`);
  console.log(`Access Token: ${DOUBAO_ACCESS_TOKEN.slice(0, 6)}...`);

  const url = "https://openspeech.bytedance.com/api/v1/tts";
  const reqid = randomUUID();

  const payload = {
    app: {
      appid: DOUBAO_APP_ID,
      token: "access_token",
      cluster: DOUBAO_TTS_CLUSTER,
    },
    user: { uid: "test-user" },
    audio: {
      voice_type: "zh_female_vv_uranus_bigtts",
      encoding: "mp3",
      speed_ratio: 1.0,
    },
    request: {
      reqid,
      text: "大家好，欢迎来到AI主持人测试。",
      operation: "query",
    },
  };

  console.log(`\nRequest ID: ${reqid}`);
  console.log("Sending request...\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer;${DOUBAO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    const body = await response.json();

    if (body.data) {
      const audioBuffer = Buffer.from(body.data, "base64");
      const outputPath = resolve(__dirname, "test-output.mp3");
      writeFileSync(outputPath, audioBuffer);
      console.log(`\nSUCCESS: Audio saved to ${outputPath}`);
      console.log(`Audio file size: ${audioBuffer.length} bytes`);
    } else {
      console.log("\nFAILED: No 'data' field in response.");
      console.log("Response:", JSON.stringify(body, null, 2));
    }
  } catch (err) {
    console.error("\nFAILED: Request error:", err);
  }
}

testTTS();
