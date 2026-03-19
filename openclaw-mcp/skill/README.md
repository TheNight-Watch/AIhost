# AIHost OpenClaw Skill

这里承载 AIHost 对应的 OpenClaw skill 正式版本。

## 当前状态

当前目录已包含一个可作为 workspace skill 起点的 `SKILL.md` 草稿。

## 安装方式

按 OpenClaw 官方 skills 规范，workspace skill 可放在：

- `<workspace>/skills/aihost-hosting/SKILL.md`

当前我们先在仓库中维护该 skill，后续再复制到 OpenClaw workspace。

## 第一阶段目标

- 把“主持任务”变成稳定 SOP
- 让 agent 优先复用 event
- 避免在未连接执行页时盲目开播
- 把复杂实时控制留给 AIHost 页面
