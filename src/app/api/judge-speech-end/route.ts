import { NextResponse } from "next/server";

const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;

/**
 * POST /api/judge-speech-end
 *
 * Takes a sliding window of recent sentences from a speaker,
 * calls Doubao-Seed-2.0-Mini to judge whether the speaker has finished.
 *
 * Request: { sentences: string[] }
 * Response: { judgment: "YES" | "NO", raw: string }
 */
export async function POST(request: Request) {
  try {
    const { sentences } = await request.json();

    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json(
        { error: "sentences array is required" },
        { status: 400 }
      );
    }

    const windowText = sentences
      .map((s: string, i: number) => `[${i + 1}] ${s}`)
      .join("\n");

    const systemPrompt = `你是一个活动现场的语音分析助手。你的唯一任务是判断演讲者是否已经结束发言。

判断依据：
- 演讲者说了结束语（如"谢谢大家"、"我的分享就到这里"、"以上就是我的内容"等）→ YES
- 演讲者的语气和内容表明已经总结完毕 → YES
- 演讲者仍在阐述观点、举例、展开讨论 → NO
- 内容太少无法判断 → NO

你只能回答 YES 或 NO，不要有任何其他输出。`;

    const userPrompt = `以下是演讲者最近说的内容（按时间顺序）：

${windowText}

演讲者是否已经结束发言？`;

    const response = await fetch(`${ARK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: ARK_ENDPOINT_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `LLM API error ${response.status}: ${errText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const judgment = raw.toUpperCase().includes("YES") ? "YES" : "NO";

    return NextResponse.json({
      judgment,
      raw,
      token_usage: data.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
