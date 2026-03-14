import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;

async function testArk() {
  console.log("=== Ark LLM API Test ===\n");
  console.log(`Endpoint ID: ${ARK_ENDPOINT_ID}`);
  console.log(`API Key: ${ARK_API_KEY.slice(0, 8)}...`);

  const url = "https://ark.cn-beijing.volces.com/api/v3/responses";

  const payload = {
    model: ARK_ENDPOINT_ID,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "你是一个AI主持人助手。请为一个科技大会生成一句开场白，要求热情、专业，不超过50个字。",
          },
        ],
      },
    ],
  };

  console.log("\nSending request...\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    const body = await response.json();

    if (response.ok) {
      // Extract text from the response - output is an array of items
      let text = "";
      if (Array.isArray(body.output)) {
        for (const item of body.output) {
          if (item.type === "message" && Array.isArray(item.content)) {
            text = item.content
              .filter((c: any) => c.type === "output_text")
              .map((c: any) => c.text)
              .join("");
          }
        }
      } else if (body.output && body.output.content) {
        text = typeof body.output.content === "string"
          ? body.output.content
          : JSON.stringify(body.output.content);
      }

      if (text) {
        console.log(`\nSUCCESS: Generated text:\n"${text}"`);
      } else {
        console.log("\nSUCCESS (but could not extract text). Full response:");
        console.log(JSON.stringify(body, null, 2));
      }

      // Print usage stats
      if (body.usage) {
        console.log(`\nToken usage: input=${body.usage.input_tokens}, output=${body.usage.output_tokens}, total=${body.usage.total_tokens}`);
      }
    } else {
      console.log("\nFAILED: API returned error.");
      console.log("Response:", JSON.stringify(body, null, 2));
    }
  } catch (err) {
    console.error("\nFAILED: Request error:", err);
  }
}

testArk();
