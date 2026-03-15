import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/doubao/llm";
import type { ChatMessage } from "@/lib/doubao/llm";

interface ChatRefineRequest {
  currentContent: string;
  instruction: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRefineRequest = await request.json();
    const { currentContent, instruction, chatHistory } = body;

    if (!currentContent || !instruction) {
      return NextResponse.json(
        { error: "currentContent and instruction are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional event host script refinement assistant.
Your job is to modify the given script line based on the user's instruction.
IMPORTANT: Return ONLY the revised script line text. No explanations, no quotes, no extra commentary.
Keep the language the same as the original text.
The revised text should be natural and suitable for reading aloud on stage.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    // Include chat history for multi-turn context
    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({
      role: "user",
      content: `Original script line:\n"${currentContent}"\n\nModification instruction: ${instruction}\n\nReturn only the revised script line:`,
    });

    const refinedContent = await chatCompletion(messages, {
      temperature: 0.8,
      max_tokens: 1024,
    });

    // Clean up: remove surrounding quotes if present
    const cleaned = refinedContent
      .replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, "")
      .trim();

    return NextResponse.json({ refinedContent: cleaned });
  } catch (err) {
    console.error("Chat refine error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
