# AIHost MCP Tool Surface 草案

更新日期：2026-03-19

## 1. 设计原则

- 保持工具少而稳，不追求大而全
- 每个 tool 做单一、可预测的事
- tool 返回面向 agent 的结构化状态，不返回大段自由文本
- 实时广播不做细粒度 token 级控制

## 2. 第一版必需工具

## Event

### `list_events`

用途：
- 查找已有活动

输入：
- `status?`
- `limit?`

输出：
- `events[]`

### `get_event`

用途：
- 获取单个活动详情和脚本准备情况

输入：
- `event_id`

输出：
- `event`
- `script_lines_count`
- `audio_ready_count`

### `create_event`

用途：
- 创建活动并基于议程生成脚本

输入：
- `title`
- `description?`
- `agenda_text`
- `mode?`

输出：
- `event`
- `script_lines[]`
- `next_step`

## Script

### `get_script`

用途：
- 查看当前脚本和音频覆盖率

输入：
- `event_id`

输出：
- `lines[]`
- `total_lines`
- `audio_ready`

### `generate_script`

用途：
- 重生成脚本

输入：
- `event_id`
- `agenda_text`
- `mode?`

输出：
- `lines[]`
- `lines_count`

### `refine_script_line`

用途：
- 让 LLM 给出某条主持词的改写建议

输入：
- `current_content`
- `instruction`

输出：
- `original`
- `refined`

### `update_script_line`

用途：
- 保存主持词修改，并清空旧音频

输入：
- `line_id`
- `content`

输出：
- `line`
- `audio_invalidated`

## Audio

### `generate_audio`

用途：
- 生成单条音频

输入：
- `line_id`
- `event_id`
- `content`
- `voice_type?`

输出：
- `success`
- `audio_url`
- `duration_ms`

### `generate_audio_batch`

用途：
- 批量生成整场活动音频

输入：
- `event_id`
- `voice_type?`

输出：
- `success`
- `generated`
- `total`
- `failed_lines[]`

## Broadcast

### `get_broadcast_status`

用途：
- 查询当前主持状态

输入：
- 无

输出：
- `connected`
- `phase`
- `event_id`
- `current_index`
- `total_lines`
- `silence_ms`
- `has_yes`
- `enhance_status`

### `start_broadcast`

用途：
- 开始主持

输入：
- `event_id`
- `enhance_mode?`

输出：
- `success`
- `message`
- `action_required?`

### `skip_to_next`

用途：
- 跳到下一个环节

输入：
- 无

输出：
- `success`
- `message`

### `stop_broadcast`

用途：
- 停止主持

输入：
- 无

输出：
- `success`
- `message`

## 3. 第一版不建议加入的工具

- 逐 token 或逐句转场控制
- 实时 ASR transcript 流式拉取
- 观众互动全套工具
- 复杂多步骤组合 tool

这些都容易提高复杂度和延迟，不适合第一版。

## 4. 推荐新增的聚合工具

第一版跑通后，优先增加一个高价值聚合工具：

### `prepare_hosting_session`

用途：
- 一次性完成主持前检查

输入：
- `event_id`
- `voice_type?`
- `regenerate_audio_if_missing?`

输出：
- `event_ready`
- `script_ready`
- `audio_ready`
- `browser_connected`
- `next_action`

它能明显减少 agent 的推理轮次，是降低延迟和失败率的关键优化点。

## 5. Tool 返回风格约束

所有 tool 推荐统一返回：

```json
{
  "success": true,
  "data": {},
  "next_step": "..."
}
```

或错误：

```json
{
  "success": false,
  "error": {
    "code": "BROWSER_NOT_CONNECTED",
    "message": "..."
  },
  "action_required": "..."
}
```

这样更适合 OpenClaw 做后续决策。
