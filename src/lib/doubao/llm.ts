const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;


export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
4. **分段原则**：每段台词对应一个完整的口播段落或流程节点，优先按“主持人在现场会一口气说完的一整段”来分，而不是按句号机械切分
5. **合并原则**：
   - 同一开场中的欢迎语、自我介绍、活动背景、活动总览，通常应合并为同一段
   - 同一流程节点下连续发生的介绍、承接、说明，只要主持人会连着说，就放在同一段
   - 只有在进入下一个明确环节、对象切换、语气明显转折、或现场需要自然停顿时，才拆成下一段
   - 宁可稍长一点，也不要把本应连着说的一段拆成多条零碎短句
6. **长度建议**：每段通常 2-5 句；开场白、嘉宾隆重介绍、活动总说明等场景可以更长，只要它们在现场应连续口播
7. **避免机械拆分**：不要因为句号、感叹号或换行就自动分段；判断标准是主持人口播时是否属于同一气口和同一流程动作
8. **speaker 字段**：默认为 "host"

## 输出格式
仅返回一个合法的 JSON 数组，每个元素包含：{sort_order, speaker, content}
不要包含任何解释说明，仅返回 JSON 数组。`;

  const userPrompt = `活动名称: ${eventTitle}\n\n议程/流程:\n${agendaText}\n\n请为主持人撰写口播台词，返回 JSON 数组。\n\n特别注意：如果几句台词在现场应由主持人连续说完，请合并成同一个 content，不要拆成多条。`;

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
  const systemPrompt = `你是一个专业的活动主持稿件拆分助手。

你的任务是从用户提供的原始活动文稿中，提取出需要口播的台词，并按顺序拆分为独立的播报段落。

## 核心规则
1. **保留原文**：提取出的台词必须保持原文不变，不得改写、润色、缩写或扩写
2. **去除非口播内容**：
   - 时间标记（如"09:45 - 10:00"、"倒计时5分钟"）
   - 流程标题/环节说明（如"Part 0 开场分享"、"｜肃静"）
   - 舞台指示/动作说明（如"（主持人分享环节）"、"（播放视频）"）
   - 纯粹的分隔符号或编号标记
3. **智能分段**：每段台词应是一个完整的口播段落，按主持人在现场会一口气连续说完的一段来切分，而不是按单句切分
4. **合并原则**：
   - 如果几句话属于同一开场白、同一自我介绍、同一活动概述、同一嘉宾介绍或同一承接过渡，应保留在同一段
   - 不要因为句号、感叹号、分号或换行就机械拆段
   - 只有在明显进入新环节、新对象、新动作，或现场应有自然停顿时，才拆成下一段
   - 宁可保留较长的完整段落，也不要把一段开场白拆成多条碎片
5. **speaker 字段**：默认为 "host"，如果文稿中明确标注了其他发言人，使用对应的发言人名称

## 输出格式
仅返回一个合法的 JSON 数组，每个元素包含：{sort_order, speaker, content}
不要包含任何解释说明，仅返回 JSON 数组。`;

  const userPrompt = `活动名称: ${eventTitle}\n\n原始文稿:\n${agendaText}\n\n请提取并拆分口播台词，返回 JSON 数组。\n\n特别注意：像“欢迎大家、活动介绍、自我介绍、活动总览”这类连续口播内容，如果在现场应连着说完，就必须放在同一个 content 中。`;

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
  // Step 1: Use multimodal API to extract agenda/flow text from the image
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const extractedText = await multimodalAnalyze(
    imageUrl,
    "请识别这张活动流程图/议程图中的文字内容，并尽可能整理成清晰的活动流程或议程文本。保留环节顺序、标题、时间、嘉宾、说明等关键信息。只输出整理后的文字结果，不要添加任何解释。"
  );

  if (!extractedText.trim()) {
    throw new Error("Failed to extract text from image");
  }

  // Step 2: Treat the extracted text as an agenda/flow and generate host script
  return generateScriptFromAgenda(extractedText, eventTitle);
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
