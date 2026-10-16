# AGENTS.md

## Copy-ready prompts and commands

- Any user-facing command, shell snippet, coding-agent prompt, Forge/Codex/Claude prompt, or other text intended to be copied and pasted must be presented as one complete fenced code/text block so the chat UI offers one-click copy.
- Do not make the user assemble a copyable prompt or command from surrounding prose, inline code, or multiple fragments.
- When multiple commands are intended to be run together, keep them in one fenced block. Split them only when they must be executed as separate observation/safety steps; in that case, use one complete fenced block per step.
- This rule applies across all coding work, agents, tools, operating systems, and project phases.
