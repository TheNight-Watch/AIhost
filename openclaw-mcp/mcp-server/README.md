# AIHost MCP Server

这里承载 OpenClaw 版本正式收口后的 AIHost MCP server。

## 当前状态

当前目录已经具备第一版正式骨架：

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/env.ts`
- `src/api-client.ts`
- `src/types.ts`
- `src/supabase.ts`
- `src/tools/*`

## 设计目标

- 延续现有仓库中未提交的 `mcp-server/` 原型方向
- 统一 tool 返回结构
- 为 OpenClaw skill 提供稳定工具面
- 不把实时广播主循环迁移进 MCP

## 运行方式

在该目录下：

```bash
npm install
npm run build
npm run dev
```

默认通过 `stdio` 运行，供 OpenClaw 或其他 MCP 客户端加载。

## 依赖环境变量

- `AIHOST_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AIHOST_USER_ID` 可选

`env.ts` 默认尝试读取项目根目录 `.env.local`。
