import type { AdvanceMode } from "@/types";

const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY!;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID!;


export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GeneratedScriptLine {
  sort_order?: number;
  speaker?: string;
  content?: string;
  advance_mode?: string;
}

function normalizeAdvanceMode(mode?: string): AdvanceMode {
  if (mode === "continue" || mode === "manual" || mode === "listen") {
    return mode;
  }
  return "listen";
}

function normalizeScriptLines(lines: GeneratedScriptLine[]) {
  return lines
    .filter((line) => typeof line?.content === "string" && line.content.trim())
    .map((line, index) => ({
      sort_order: line.sort_order || index + 1,
      speaker: line.speaker || "host",
      content: line.content!.trim(),
      advance_mode: normalizeAdvanceMode(line.advance_mode),
    }));
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
): Promise<Array<{ sort_order: number; speaker: string; content: string; advance_mode: AdvanceMode }>> {
  const systemPrompt = `你是一个专业的活动主持人台词撰写助手。

根据用户提供的活动议程/流程安排，为主持人撰写自然、专业的口播台词，并为每一段台词判断播完后的推进方式。

## 核心规则
1. **创作台词**：根据议程内容撰写适合口播的主持人台词，语言自然流畅，适合现场朗读
2. **覆盖所有环节**：每个议程环节都应有对应的主持人台词（开场、过渡、介绍、结束等）
3. **风格要求**：正式但不死板，专业但有温度，适合活动现场的氛围
4. **分段原则**：每段台词对应一个环节或自然停顿点，每段 1-3 句
5. **speaker 字段**：默认为 "host"
6. **advance_mode 字段**：必须为 "listen"、"continue" 或 "manual"
   - "continue": 当前段播完后，主持人应立刻连续播报下一段，不需要等待外部发言
   - "listen": 当前段播完后，需要等待嘉宾、观众或其他外部发言/互动结束，再播下一段
   - "manual": 当前段播完后，应等待工作人员或主持人手动确认，再继续
   - 如果无法确定，默认使用 "listen"

## 输出格式
仅返回一个合法的 JSON 数组，每个元素包含：{sort_order, speaker, content, advance_mode}
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

  return normalizeScriptLines(JSON.parse(jsonMatch[0]));
}

/**
 * Extract and split spoken script lines from raw agenda/script text.
 * Preserves original wording — does NOT rewrite or generate new content.
 * Returns JSON array of script lines.
 */
export async function generateScript(
  agendaText: string,
  eventTitle: string
): Promise<Array<{ sort_order: number; speaker: string; content: string; advance_mode: AdvanceMode }>> {
  const systemPrompt = `你是一个专业的活动主持稿拆分助手。

你的任务是：从用户提供的原始活动文稿中，提取出需要口播的主持人台词，并按“现场实际会如何一段一段说出来”的方式，拆分为结构化 script lines。

你的输出必须帮助主持人现场播报，而不是做逐句切分。

## 核心目标
请把文稿拆成“自然口播段落”，每一段都应该是一口气可以连续说完的一段话。
不要为了句号、感叹号、换行而机械拆分。

## 必须遵守的规则

### 1. 保留原文
提取出的台词必须保持原文不变，不得改写、润色、扩写、缩写、总结或重排。
你只能决定“哪些句子应该归为同一段”，不能改动内容本身。

### 2. 去除非口播内容
以下内容不要输出到最终台词中：
- 时间标记，如“18:50-19:00”“倒计时5分钟”
- 流程标题、章节标题、环节名，如“Part 1 开场”“嘉宾分享”
- 舞台提示、动作提示、执行提示，如“（播放视频）”“（主持人上场）”“PPT切下一页”
- 纯编号、分隔符、装饰性符号
- 明显不是现场要读出来的备注、说明、批注

### 3. 按“口播段落”分组，而不是按句子分组
同一段中如果这些内容在现场应该连着说，就必须合并为一个 content：
- 欢迎语 + 问候语
- 欢迎语 + 自我介绍
- 自我介绍 + 活动背景/活动价值说明
- 活动概述 + 流程预告
- 同一流程节点下连续的说明、提醒、引导
- 同一轮口播中的连续过渡语

不要因为中间有句号、感叹号、换行，就拆成多段。

### 4. 什么时候应该拆成新的一段
只有在出现明显的“播报动作切换”时，才拆成新的 line，例如：
- 从签到提醒切换到正式开场
- 从开场切换到介绍主办方
- 从介绍主办方切换到介绍嘉宾
- 从一个明确流程节点切换到下一个流程节点
- 从主持人口播切换到另一位明确发言人
- 中间存在明显等待、停顿、执行动作或环节切换

判断标准是：
“主持人在现场会不会停一下，等一个新节点开始，再说下一段？”
如果会，就拆开；如果不会，就放在一起。

### 5. 特别注意：不要机械切分开场段
开场中常见的这一整类内容，通常应合并成同一个 line：
- 各位来宾问候
- 欢迎来到活动现场
- 主持人自我介绍
- 对活动主题/意义的简要铺垫
- 对接下来内容的总体介绍

例如下面这些内容，如果原文是连续的，就应合并成一段，而不是拆成 4-5 段：
“各位来宾、各位开发者朋友、各位同学，大家晚上好！欢迎大家来到《OpenClaw 碰撞场》活动现场。我是今天的主持人 HostClaw。很高兴在这里与各位热爱 AI、深耕 Agent 领域的伙伴们相聚……今天，我们将围绕 OpenClaw 的实践经验、协作方法与应用场景展开分享……”

### 6. 区分“同一段连续口播”与“不同时间点播报”
如果两段内容虽然主题相关，但属于不同时间点、不同流程节点、不同播报时机，就必须拆开。
例如：
- “签到已经开始，请大家有序入场并入座……”
- “各位来宾、各位开发者朋友、各位同学，大家晚上好！欢迎大家来到……”
这两段虽然都属于活动开始前后，但如果实际播报时机不同，就必须分成两个 line。

### 7. speaker 规则
- 默认 speaker 为 "host"
- 只有当原文中明确出现了其他发言人，并且能确定该段属于该发言人时，才使用对应 speaker
- 不要随意猜测 speaker

### 8. advance_mode 规则
你必须为每一段 content 额外输出一个 advance_mode 字段，用来表示“这一段播完后，系统应如何推进到下一段”：
- "continue"：当前段播完后，应立刻连续播报下一段；适用于同一轮主持人口播中的连续说明、连续开场、连续介绍
- "listen"：当前段播完后，应等待嘉宾、观众或其他外部发言/互动结束，再播下一段
- "manual"：当前段播完后，应暂停，等待工作人员或主持人手动确认再继续；适用于明确需要现场确认、执行动作或不适合自动判断的节点
- 如果无法确定，默认使用 "listen"

判断 advance_mode 时，要基于整份文稿的上下文，而不是只看当前段内容。

## 输出格式
只返回一个合法的 JSON 数组。
数组每个元素格式如下：

{
  "sort_order": 1,
  "speaker": "host",
  "content": "这里是一整段连续口播内容",
  "advance_mode": "listen"
}

## 输出要求
- 只返回 JSON 数组
- 不要输出解释、说明、markdown、代码块
- content 必须是适合现场“一次连续说完”的完整口播段
- 宁可略少拆分，也不要过度切碎`;

  const userPrompt = `活动名称: ${eventTitle}

原始文稿:
${agendaText}

请严格按照“自然口播段落”提取并拆分主持人口播台词。
只返回 JSON 数组，不要添加任何解释。`;

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3 });

  // Parse JSON from reply
  const jsonMatch = reply.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON array");
  }

  return normalizeScriptLines(JSON.parse(jsonMatch[0]));
}

/**
 * Analyze an image of an agenda/script using multimodal API,
 * then extract script lines from the recognized text.
 */
export async function generateScriptFromImage(
  imageBase64: string,
  eventTitle: string
): Promise<Array<{ sort_order: number; speaker: string; content: string; advance_mode: AdvanceMode }>> {
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
