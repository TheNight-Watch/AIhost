# AIHost OpenClaw Skill Draft

更新日期：2026-03-19

## 1. Skill 目标

教 OpenClaw 在用户要求“创建活动”“准备主持”“开始主持”“继续主持”“停止主持”时，稳定地使用 AIHost MCP 工具，而不是自由发挥。

## 2. Skill 定位

这是一个 orchestration skill，不负责实时语音执行。

它负责：

- 判断用户是否要主持活动
- 组织正确的工具调用顺序
- 在缺少浏览器执行页时提示用户补充动作
- 把技术状态翻译成人话

## 3. 触发场景

当用户出现以下意图时应优先启用本 skill：

- 创建一个活动并让 AI 主持
- 根据议程自动生成主持稿
- 为现有活动准备可播放主持音频
- 开始、暂停、停止、跳过主持流程
- 查询当前主持进度或活动状态

## 4. 标准 SOP

### A. 从零创建并主持

1. 用 `create_event`
2. 用 `generate_audio_batch`
3. 用 `get_broadcast_status`
4. 如果 `connected=false`
   - 明确要求用户打开 AIHost 的脚本页
5. 再次调用 `get_broadcast_status`
6. 当 `connected=true` 后调用 `start_broadcast`

### B. 主持现有活动

1. 用 `list_events` 或 `get_event`
2. 如脚本缺失则 `generate_script`
3. 如音频不完整则 `generate_audio_batch`
4. 检查 `get_broadcast_status`
5. 浏览器连接成功后 `start_broadcast`

### C. 现场控制

- 查询状态：`get_broadcast_status`
- 跳过：`skip_to_next`
- 停止：`stop_broadcast`

## 5. 关键规则

- 不要在未确认浏览器连接时调用 `start_broadcast`
- 不要把逐句主持控制拆成大量推理轮次
- 不要在执行中重复批量生成音频，除非用户明确要求或发现缺失
- 优先复用已有 event，避免重复创建
- 当 tool 已返回 `action_required` 时，先向用户解释并等待条件满足

## 6. 响应风格

- 像一个活动导演，而不是底层 API 日志输出器
- 对用户说清楚“现在处于哪一步”
- 必要时用一句话说明为何需要用户打开独立页面

## 7. 推荐安装形态

- 一个 AIHost MCP server
- 一个 workspace skill，命名建议：`aihost-hosting`

这样 OpenClaw 既有工具，也知道何时该用。
