import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/doubao/llm";
import type { ChatMessage } from "@/lib/doubao/llm";

interface RefineRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  current_line?: string;
  event_title?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefineRequest = await request.json();
    const { messages, current_line, event_title } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant helping refine script lines for a professional event host.
${event_title ? `Event: ${event_title}` : ""}
${current_line ? `Currently selected line: "${current_line}"` : ""}

Help the user improve their script lines. Be concise and practical.
When suggesting revised text, wrap it in double quotes.
Respond in the same language as the user's message.`;

    const allMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const reply = await chatCompletion(allMessages, { temperature: 0.8, max_tokens: 800 });

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error("Refine script error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
