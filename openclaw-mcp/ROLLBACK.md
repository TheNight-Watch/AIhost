# 版本管理与回退策略

更新日期：2026-03-19

## 1. 当前策略

为了保证这次迭代可随时回退，采用以下约束：

- 在独立分支上推进：`codex/openclaw-mcp-design`
- 只把 `openclaw-mcp/` 目录下的设计产物纳入本次提交
- 不混入当前仓库已有的未提交实验代码

## 2. 推荐提交节奏

后续开发建议按下面节奏提交：

1. `docs:` 设计文档与架构
2. `feat(mcp):` MCP server 正式骨架
3. `feat(skill):` OpenClaw skill 初版
4. `feat(bridge):` 桥接层收口
5. `feat(integration):` OpenClaw 联调闭环

每一步都形成独立提交点，便于单步回退。

## 3. 回退方式

如果你只想回退这次设计工作，可以回退到创建分支前的提交：

- 基线提交：`c4e5922`

如果后续我们形成新的提交点，则可以：

- 查看提交：`git log --oneline -- openclaw-mcp`
- 回到某个提交：`git switch codex/openclaw-mcp-design` 后按需 checkout 或 revert

## 4. 风险控制

- 不直接在 `main` 上做 OpenClaw 版本开发
- 不直接修改现有主应用核心路径，除非已经有独立提交点
- 遇到需要动现有 `src/`、`mcp-server/`、`openclaw.json` 时，先形成小步提交
