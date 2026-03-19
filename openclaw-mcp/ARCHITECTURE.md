# AIHost x OpenClaw 目标架构

更新日期：2026-03-19

## 1. 目标目录结构

```text
openclaw-mcp/
  README.md
  ARCHITECTURE.md
  TOOLS.md
  SKILL.md
  ROLLBACK.md
  app/
    README.md
  mcp-server/
    README.md
  skill/
    README.md
```

这个目录先作为“新版本工作区”，不直接改动现有主应用结构。等方案稳定后，再决定是否把代码回迁到根目录正式位置。

## 2. 运行时架构

```text
User
  |
  v
OpenClaw Chat / Control UI
  |
  | uses skill
  v
AIHost MCP Server
  |
  | calls existing APIs
  v
AIHost Next.js App
  |
  | browser execution
  v
Script Page / Dashboard / Broadcast Engine
```

## 3. 职责分层

### OpenClaw

- 接收自然语言任务
- 根据 skill 判断主持意图
- 按 SOP 调用 MCP tools
- 给用户解释状态、下一步和异常

### MCP Server

- 为 AIHost 暴露结构化能力
- 屏蔽前端 API 细节
- 做参数校验、错误归一化、返回结构统一

### AIHost App

- 继续作为真实主持执行界面
- 处理音频播放、麦克风、ASR、phase 推进
- 展示主持状态、日志、字幕和人工介入控件

## 4. 页面策略

推荐保留两类界面：

- OpenClaw 聊天界面：任务入口、运行解释、用户指令
- AIHost 脚本页：实时主持执行台

第一版不建议新做整套 UI。优先复用：

- `src/app/[locale]/script/[eventId]/page.tsx`
- `src/app/[locale]/dashboard/page.tsx`

如需命名更清晰，可后续仅增加一个路由别名，例如：

- `/[locale]/host/[eventId]`

其本质仍复用现有 script page 的广播执行能力。

## 5. 数据与控制流

### 准备阶段

1. OpenClaw 接收到“创建并主持活动”
2. MCP 查询是否已有 event
3. 若无，则创建 event 并生成 script
4. 生成全部 TTS 音频
5. 返回页面链接，要求用户打开执行页

### 执行阶段

1. 浏览器页面建立桥接连接
2. OpenClaw 调 `get_broadcast_status`
3. `connected=true` 后调用 `start_broadcast`
4. 实时 phase 推进由 AIHost 浏览器引擎负责
5. OpenClaw 仅在需要时发 `skip_to_next` / `stop_broadcast`

## 6. 最小实现原则

- 不重写现有数据模型
- 不重写现有生成脚本与 TTS API
- 不重写现有 broadcast engine
- 只补齐 OpenClaw 所需的 MCP server 和 skill
- 实时逻辑尽量留在浏览器端

## 7. 第二阶段可扩展点

- 添加 `prepare_hosting_session` 聚合工具
- 添加 `get_execution_summary`
- 为 dashboard 增加更明确的 agent 状态标识
- 视情况接入 OpenClaw Canvas 作为辅助可视化，而不是主执行界面
