const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;


export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ScriptLine {
  sort_order: number;
  speaker: string;
  content: string;
}

const SPEAKER_LABEL_PATTERN =
  /^([A-Za-z\u4e00-\u9fa5]{1,20})(?:[（(][^)）]{0,20}[)）])?[:：]\s*/;

const NOISE_PATTERNS = [
  /^\s*$/,
  /^[=\-_*~#]{2,}\s*$/,
  /^\s*[0-2]?\d[:：][0-5]\d(\s*[-–—~至到]\s*[0-2]?\d[:：][0-5]\d)?\s*$/,
  /^\s*(part|section|chapter|环节|流程|议程|agenda)\b[\s\d一二三四五六七八九十零:：.-]*/i,
  /^\s*(暖场|开场视频|播放视频|茶歇|抽奖|合影|结束|签到|倒计时)\s*$/,
  /^\s*[（(【\[][^()（）【】\[\]]{0,40}[)）】\]]\s*$/,
];

function normalizeScriptText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractSpeakerAndContent(line: string): { speaker: string; content: string } {
  const trimmed = line.trim();
  const match = trimmed.match(SPEAKER_LABEL_PATTERN);

  if (!match) {
    return { speaker: "host", content: trimmed };
  }

  const speaker = match[1]?.trim() || "host";
  const content = trimmed.slice(match[0].length).trim();
  return {
    speaker: speaker || "host",
    content: content || trimmed,
  };
}

function splitLongParagraph(content: string): string[] {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= 140) return [normalized];

  const chunks: string[] = [];
  let current = "";

  for (const part of normalized.split(/(?<=[。！？!?；;])/u)) {
    const segment = part.trim();
    if (!segment) continue;

    if (!current) {
      current = segment;
      continue;
    }

    if ((current + segment).length <= 120) {
      current += segment;
      continue;
    }

    chunks.push(current.trim());
    current = segment;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [normalized];
}

function extractScriptLocally(rawText: string): ScriptLine[] {
  const normalized = normalizeScriptText(rawText);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .flatMap((block) => block.split("\n"))
    .map((line) => line.trim())
    .filter((line) => !isNoiseLine(line));

  const lines: ScriptLine[] = [];

  for (const paragraph of paragraphs) {
    const { speaker, content } = extractSpeakerAndContent(paragraph);
    for (const piece of splitLongParagraph(content)) {
      if (!piece || isNoiseLine(piece)) continue;
      lines.push({
        sort_order: lines.length + 1,
        speaker,
        content: piece,
      });
    }
  }

  return lines;
}

/**
 * Call Ark LLM API (OpenAI-compatible chat/completions).
 * Returns the assistant's reply text.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const { temperature = 0.7, max_tokens = 2048 } = options;

  const response = await fetch(`${ARK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: ARK_ENDPOINT_ID,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ark LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Call Ark multimodal API for image understanding.
 * Uses /chat/completions with vision-compatible message format.
 * Accepts an image URL (or base64 data URL) + text prompt.
 * Returns the model's text response.
 */
export async function multimodalAnalyze(
  imageUrl: string,
  textPrompt: string
): Promise<string> {
  // Use ARK_ENDPOINT_ID for the deployed vision-capable model
  const modelId = ARK_ENDPOINT_ID;

  const response = await fetch(`${ARK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: textPrompt,
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ark multimodal API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Generate MC host script lines from an agenda/flowchart description.
 * Creates new natural host lines based on the agenda structure.
 */
export async function generateScriptFromAgenda(
  agendaText: string,
  eventTitle: string
): Promise<Array<{ sort_order: number; speaker: string; content: string }>> {
  const systemPrompt = `你是一个专业的活动主持人台词撰写助手。

根据用户提供的活动议程/流程安排，为主持人撰写自然、专业的口播台词。

## 核心规则
1. **创作台词**：根据议程内容撰写适合口播的主持人台词，语言自然流畅，适合现场朗读
2. **覆盖所有环节**：每个议程环节都应有对应的主持人台词（开场、过渡、介绍、结束等）
3. **风格要求**：正式但不死板，专业但有温度，适合活动现场的氛围
4. **分段原则**：每段台词对应一个环节或自然停顿点，每段 1-3 句
5. **speaker 字段**：默认为 "host"

## 输出格式
仅返回一个合法的 JSON 数组，每个元素包含：{sort_order, speaker, content}
不要包含任何解释说明，仅返回 JSON 数组。`;

  const userPrompt = `活动名称: ${eventTitle}\n\n议程/流程:\n${agendaText}\n\n请为主持人撰写口播台词，返回 JSON 数组。`;

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.7 });

  const jsonMatch = reply.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON array");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Extract and split spoken script lines from raw agenda/script text.
 * Preserves original wording — does NOT rewrite or generate new content.
 * Returns JSON array of script lines.
 */
export async function generateScript(
  agendaText: string,
  eventTitle: string
): Promise<Array<{ sort_order: number; speaker: string; content: string }>> {
  const localLines = extractScriptLocally(agendaText);

  // Fast path for full host scripts: avoid sending very long text to the LLM.
  if (localLines.length >= 3) {
    return localLines;
  }

  const systemPrompt = `你是一个专业的活动主持稿件拆分助手。

你的任务是从用户提供的原始活动文稿中，提取出需要口播的台词，并按顺序拆分为独立的播报段落。

## 核心规则
1. **保留原文**：提取出的台词必须保持原文不变，不得改写、润色、缩写或扩写
2. **去除非口播内容**：
   - 时间标记（如"09:45 - 10:00"、"倒计时5分钟"）
   - 流程标题/环节说明（如"Part 0 开场分享"、"｜肃静"）
   - 舞台指示/动作说明（如"（主持人分享环节）"、"（播放视频）"）
   - 纯粹的分隔符号或编号标记
3. **智能分段**：每段台词应是一个完整的口播段落，通常对应一个自然的停顿点
4. **speaker 字段**：默认为 "host"，如果文稿中明确标注了其他发言人，使用对应的发言人名称

## 输出格式
仅返回一个合法的 JSON 数组，每个元素包含：{sort_order, speaker, content}
不要包含任何解释说明，仅返回 JSON 数组。`;

  const userPrompt = `活动名称: ${eventTitle}\n\n原始文稿:\n${agendaText}\n\n请提取并拆分口播台词，返回 JSON 数组。`;

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3 });

  // Parse JSON from reply
  const jsonMatch = reply.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON array");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Analyze an image of an agenda/script using multimodal API,
 * then extract script lines from the recognized text.
 */
export async function generateScriptFromImage(
  imageBase64: string,
  eventTitle: string
): Promise<Array<{ sort_order: number; speaker: string; content: string }>> {
  // Step 1: Use multimodal API to extract text from the image
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const extractedText = await multimodalAnalyze(
    imageUrl,
    "请完整识别并提取这张图片中的所有文字内容，保持原始格式和换行。只输出识别到的文字，不要添加任何解释。"
  );

  if (!extractedText.trim()) {
    throw new Error("Failed to extract text from image");
  }

  // Step 2: Use the extracted text to split into script lines
  return generateScript(extractedText, eventTitle);
}

/**
 * Refine a script line based on user instruction.
 */
export async function refineScriptLine(
  currentText: string,
  instruction: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are helping refine host script lines for an event.
When given a script line and an instruction, return ONLY the refined text.
Keep it natural, suitable for speaking aloud. Respond in the same language as the original text.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: "user", content: `Context: ${context}` });
    messages.push({ role: "assistant", content: "Understood, I'll keep this context in mind." });
  }

  messages.push({
    role: "user",
    content: `Current text: "${currentText}"\n\nInstruction: ${instruction}\n\nProvide only the revised text:`,
  });

  return chatCompletion(messages, { temperature: 0.8 });
}
