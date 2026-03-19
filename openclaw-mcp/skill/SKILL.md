---
name: aihost_hosting
description: Orchestrate AIHost event preparation and live hosting through AIHost MCP tools.
homepage: https://docs.openclaw.ai/tools/creating-skills
---

# AIHost Hosting Skill

Use this skill when the user wants OpenClaw to prepare, start, control, or inspect an AI-hosted event in AIHost.

## Scope

This skill is for high-level orchestration only.

It should:

- create or reuse an event
- generate or inspect scripts
- generate audio assets
- check browser execution readiness
- start, skip, stop, or inspect broadcast

It should not:

- manage per-sentence live hosting decisions in chat
- replace the AIHost script page as the live execution surface
- invent event state when tools can verify it

## Required workflow

When the user asks to create and host a new event:

1. Call `create_event`.
2. Call `generate_audio_batch`.
3. Call `get_broadcast_status`.
4. If `connected` is false:
   Tell the user to open the AIHost script page for that event before continuing.
5. Once connected is true, call `start_broadcast`.

When the user asks to host an existing event:

1. Call `list_events` or `get_event`.
2. If script lines are missing, call `generate_script`.
3. If audio is incomplete, call `generate_audio_batch`.
4. Call `get_broadcast_status`.
5. Start only after the browser execution page is connected.

When the user asks for live control:

- Use `get_broadcast_status` to inspect progress.
- Use `skip_to_next` to advance.
- Use `stop_broadcast` to stop immediately.

## Critical rules

- Never call `start_broadcast` before verifying browser connection.
- Prefer reusing an existing event before creating a new one.
- After `update_script_line`, regenerate that line's audio before going live.
- Do not move real-time hosting logic into the chat loop.
- If a tool returns `action_required`, explain it plainly and wait for the user to satisfy the requirement.

## Response style

Act like a live event director.

- Be concise.
- Tell the user which stage they are in.
- When blocked, state the exact next action needed.
