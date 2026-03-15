import { NextResponse } from "next/server";

const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;

/**
 * POST /api/enhance-line
 *
 * Takes the guest's full transcript + the original host script line,
 * returns an enhanced version that prepends 1-2 sentences referencing
 * the guest's key points, WITHOUT modifying the original line content.
 *
 * Request: { transcript: string, originalLine: string }
 * Response: { enhancedLine: string, referenceSentences: string }
 */
export async function POST(request: Request) {
  try {
    const { transcript, originalLine } = await request.json();

    if (!transcript || !originalLine) {
      return NextResponse.json(
        { error: "transcript and originalLine are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一个活动现场的AI主持人助手。你的任务是根据嘉宾刚才的演讲内容，生成1-2句简短的过渡衔接语，用于引出下一段主持人口播。

要求：
1. 仔细阅读嘉宾的演讲转录，提取1-2个最核心的观点或亮点
2. 生成1-2句自然的过渡语，引用嘉宾的观点（如"刚才XX提到的...非常精彩"、"正如我们刚才听到的..."）
3. 过渡语要简短精炼，每句不超过30字
4. 语气要自然、热情、适合现场主持
5. 只输出过渡语本身，不要有任何标记、引号或额外说明`;

    const userPrompt = `嘉宾演讲转录：
${transcript}

请生成1-2句过渡衔接语。`;

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
        temperature: 0.7,
        max_tokens: 150,
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
    const referenceSentences = (data.choices?.[0]?.message?.content ?? "").trim();

    // Combine: reference sentences + original line
    const enhancedLine = referenceSentences
      ? `${referenceSentences} ${originalLine}`
      : originalLine;

    return NextResponse.json({
      enhancedLine,
      referenceSentences,
      token_usage: data.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
