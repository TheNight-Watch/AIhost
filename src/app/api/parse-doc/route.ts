import { NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const { fileBase64, fileName } = await request.json();

    if (!fileBase64) {
      return NextResponse.json({ error: "fileBase64 is required" }, { status: 400 });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileBase64, "base64");

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text.trim()) {
      return NextResponse.json({ error: "No text content found in document" }, { status: 400 });
    }

    return NextResponse.json({ text, messages: result.messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to parse document: ${message}` }, { status: 500 });
  }
}
