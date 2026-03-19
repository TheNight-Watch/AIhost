# AIHost x OpenClaw MCP 方案草案

更新日期：2026-03-19

## 1. 目标

把当前 AIHost 从“独立应用”迭代成“由 OpenClaw 作为核心 agent 内核，AIHost 作为 MCP 工具与执行界面”的版本，在最小开发成本前提下实现自主主持。

核心原则：

- OpenClaw 负责：理解用户意图、规划步骤、决定何时调用工具
- AIHost 负责：事件数据、脚本、TTS、广播状态、浏览器端播放/麦克风/实时主持执行
- 不重写现有产品主流程，尽量复用现有 Next.js 页面和 API

## 2. 当前 AIHost 架构理解

现有产品本质上已经具备“可被 agent 调度”的能力：

- 前端：Next.js App Router
- 数据层：Supabase Auth + DB + Storage
- AI 能力：Doubao LLM、Doubao TTS、ASR Proxy/Web Speech API
- 主流程：
  1. 上传议程或文档
  2. 生成 event 和 script lines
  3. 选择 voice
  4. 批量生成音频
  5. 在脚本页进入 broadcast mode
  6. 浏览器端广播引擎负责播放、监听、增强转场、状态推进

当前项目里已经出现了一个未提交的 MCP 实验版，说明方向本身是对的：

- `mcp-server/`：MCP server 原型
- `src/app/api/broadcast/*`：MCP 到浏览器广播引擎的桥接 API
- `src/components/broadcast/BroadcastBridge.tsx`：浏览器 SSE/状态上报桥
- `src/app/[locale]/script/[eventId]/page.tsx`：已接入桥接点

## 3. OpenClaw 调研结论

基于 2026-03-19 检索到的 OpenClaw 官方文档，我判断：

### 3.1 Skills 不是可选增强，而是推荐必备层

OpenClaw 官方文档明确说，Skills 用来“teach the agent how to use tools”，并且 Skills 会从 workspace / `~/.openclaw/skills` / bundled 三层加载。

这意味着：

- 只有 MCP 工具定义，不足以保证 agent 稳定、正确地调用你的 AIHost 工具
- 最小可用方案应该是：
  - 一个 AIHost MCP server
  - 一个 AIHost OpenClaw skill

推荐原因：

- Skill 负责教 agent 什么时候调用 `create_event`、`generate_audio_batch`、`start_broadcast` 这类工具
- Skill 负责定义“主持任务”的标准工作流
- Skill 可以约束 agent 不要把低延迟实时控制拆成很多轮聊天推理

### 3.2 不建议把“实时主持”全部塞进聊天框

OpenClaw 的 WebChat / Control UI 是非常适合对话和工具流可视化的，但它不是浏览器音频播放、麦克风权限、实时字幕、SSE 状态桥接的最佳承载面。

而你的 AIHost 当前广播能力依赖：

- 页面音频播放
- 浏览器麦克风权限
- 浏览器端 ASR / WebSocket
- 实时 UI 状态和日志

所以最小成本方案应是“聊天 + 独立页面”的混合模式：

- OpenClaw 聊天负责“高层指挥”
- AIHost 独立页面负责“实时执行”

### 3.3 延迟不能让 OpenClaw 落在实时主回路里

当前 AIHost PRD 里已经把关键时延路径定义得很清楚：

- 说话结束
- ASR final
- LLM 生成转场
- TTS 合成
- 音频播放

这个链路必须尽量短。若把每一步都交给 OpenClaw 做聊天级推理和工具调用，会带来额外开销。

因此推荐：

- OpenClaw 只负责“阶段级决策”
- 实时主持主回路继续放在 AIHost 浏览器页和 AIHost API 内

也就是：

- OpenClaw 负责：开始活动、切到下一个环节、查看状态、人工介入、重试、补救
- AIHost 负责：播放音频、监听发言、增强转场、判定结束、推进 phase

## 4. 最小开发成本架构

## 4.1 推荐总架构

```text
OpenClaw Agent
  ├─ AIHost Skill
  └─ AIHost MCP Tools
         ├─ Event tools
         ├─ Script tools
         ├─ Audio tools
         └─ Broadcast control tools

AIHost Next.js App
  ├─ Existing pages
  │    ├─ upload
  │    ├─ voice-select
  │    ├─ script/[eventId]
  │    └─ dashboard
  ├─ Existing APIs
  │    ├─ generate-script
  │    ├─ generate-audio
  │    ├─ generate-audio-batch
  │    ├─ enhance-line
  │    └─ ...
  └─ Broadcast bridge APIs
       ├─ /api/broadcast/start
       ├─ /api/broadcast/stop
       ├─ /api/broadcast/skip
       ├─ /api/broadcast/status
       └─ /api/broadcast/commands
```

## 4.2 页面策略

推荐保留并强化独立页面，而不是另起一个纯聊天版产品。

建议分层：

- OpenClaw：任务入口、用户沟通、状态解释、异常处理
- AIHost Script Page：主持执行台
- AIHost Dashboard：观众/大屏可视化

最低成本下，甚至可以直接复用当前脚本页：

- 用户在 OpenClaw 中说“主持 OpenClaw Meetup”
- OpenClaw 调用 AIHost MCP 检查 event、script、audio、broadcast status
- 如果脚本页未打开，OpenClaw 提示用户打开 AIHost 的脚本页
- 页面连接后，OpenClaw 再调用 `start_broadcast`

## 4.3 Skill 与 MCP 的职责边界

### MCP 负责

- 暴露结构化能力
- 返回确定性数据
- 执行可复用操作

建议第一版工具集：

- `list_events`
- `get_event`
- `create_event`
- `get_script`
- `generate_script`
- `update_script_line`
- `refine_script_line`
- `generate_audio`
- `generate_audio_batch`
- `get_broadcast_status`
- `start_broadcast`
- `skip_to_next`
- `stop_broadcast`

### Skill 负责

- 教 OpenClaw 何时调用这些工具
- 定义默认主持 SOP
- 规定错误恢复策略
- 把“主持任务”转化为稳定的工具调用序列

建议 Skill 中明确以下规则：

- 先查 event，再决定创建或复用
- 没有脚本先生成脚本
- 没有音频先批量生成
- 广播前先检查 browser connection
- `connected=false` 时不要盲目 `start_broadcast`
- 实时阶段优先查询状态，不要频繁重复调用写操作

## 5. 第一版产品形态建议

## 5.1 推荐方案：Hybrid Host Mode

不是“纯 Chat 产品”，也不是“纯独立产品”，而是：

- Chat is the orchestration layer
- AIHost page is the execution layer

用户体验：

1. 用户在 OpenClaw 中输入：
   - “为 OpenClaw Meetup 创建主持活动并开始自动主持”
2. OpenClaw：
   - 创建/找到 event
   - 生成脚本
   - 生成音频
   - 提示用户打开 AIHost 脚本页
3. 用户打开 AIHost 脚本页
4. OpenClaw 检查 `get_broadcast_status`
5. `connected=true` 后调用 `start_broadcast`
6. 后续主持主要由 AIHost 页面执行
7. 用户仍然可以在 OpenClaw 聊天中说：
   - “跳到下一个环节”
   - “停止主持”
   - “现在是什么状态”

## 5.2 为什么不推荐纯聊天框版

纯聊天框版的问题：

- 难承接麦克风与音频播放
- 难展示实时字幕、phase、日志、队列
- 用户对“AI 是否真的在主持”缺少可视反馈
- 现场演示不如独立页面直观

所以如果目标是“自主主持”而不是“纯文字代理”，独立页面几乎是必须的。

## 6. 延迟与风险控制

## 6.1 最大风险

- MCP cold start / 连接管理
- OpenClaw 推理轮次过多
- 把实时转场也交给 agent 导致响应慢
- 浏览器页面未连接，agent 无法真正开播
- 聊天界面与执行界面的状态不同步

## 6.2 第一版规避策略

- 保持 MCP server 为常驻本地服务，不要每次冷启动
- 保持实时广播循环在 AIHost 页面内，不让 OpenClaw 逐句驱动
- 只让 OpenClaw 做“高层编排 + 人机沟通”
- 用 `get_broadcast_status` 作为单一状态真相入口
- 在页面端维持 SSE/heartbeat 连接

## 7. 第一版功能规划

## Phase 1：最小可跑通

- 独立目录承载 OpenClaw 版本设计与代码
- 整理并收口现有 MCP 原型
- 固化一套 AIHost MCP tool surface
- 新增 AIHost OpenClaw skill
- 跑通以下主链路：
  - 查找/创建活动
  - 生成脚本
  - 生成音频
  - 打开脚本页后开始主持
  - 查询状态
  - 跳过/停止

## Phase 2：体验增强

- 把 skill 中的主持 SOP 写完整
- 增加异常恢复策略
- 增加“主持准备检查”
- 增加“活动执行摘要”

## Phase 3：更深度 OpenClaw 集成

- 如果需要，再研究 OpenClaw Canvas/A2UI 版宿主控制台
- 视情况把当前 AIHost Dashboard 适配成 OpenClaw 可打开的辅助视图

## 8. 当前推荐决策

基于现状，我建议我们现在就按下面的决策推进：

- 保留 AIHost 作为独立 Web 产品，不改成纯聊天产品
- 复用现有脚本页作为执行台
- 做一个正式的 AIHost MCP server
- 同时做一个 AIHost OpenClaw skill
- 让 OpenClaw 做 orchestrator，不进实时语音主回路

这是当前开发成本最低、成功率最高、最符合你现有资产的路径。

## 9. 参考资料

以下资料于 2026-03-19 检索，用于本方案判断：

- OpenClaw Skills: https://docs.openclaw.ai/tools/skills
- OpenClaw Creating Skills: https://docs.openclaw.ai/tools/creating-skills
- OpenClaw Configuration: https://docs.openclaw.ai/gateway/configuration
- OpenClaw ACP: https://docs.openclaw.ai/cli/acp
- OpenClaw Control UI: https://docs.openclaw.ai/web/control-ui
- OpenClaw WebChat: https://docs.openclaw.ai/web/webchat
- OpenClaw Gateway Architecture: https://docs.openclaw.ai/concepts/architecture
- OpenClaw Default AGENTS: https://docs.openclaw.ai/reference/AGENTS.default

## 10. 下一步建议

下一步应进入实现设计，而不是继续泛泛调研。

建议按这个顺序继续：

1. 选定新版本目录结构
2. 定义 AIHost MCP tool schema
3. 定义 AIHost OpenClaw skill 文案
4. 收口并迁移现有未提交 MCP 原型代码
5. 跑通本地 OpenClaw + AIHost 联调

## 11. 当前目录

- `README.md`：总体方案与决策记录
- `ARCHITECTURE.md`：目标工程结构与运行方式
- `TOOLS.md`：MCP tool surface 草案
- `SKILL.md`：OpenClaw skill 初稿
- `ROLLBACK.md`：版本管理与回退策略
