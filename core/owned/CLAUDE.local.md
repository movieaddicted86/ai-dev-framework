# Local agent setup (not committed)

Two agents share this checkout; the decider decides. Roles and the full workflow: `.ai/PROTOCOL.md`.

- **Coder** = the session started by `node .ai/bin/ai.mjs run` (or an interactive `claude` for the coder
  model). If that is you: at the start of every session and after every context reset, first read
  `.ai/PROTOCOL.md` and `.ai/STATE.md`, then run the coder loop. Do not repeat steps that `STATE.md`, your
  report or `git log` show as done. Before you stop, start `node .ai/bin/ai.mjs wait` as a background command –
  except in runner mode (the prompt says "Runner mode"): then end after the hand-back, the runner watches.
- **Lead** = Claude in the interactive session. If that is you: read `.ai/LEAD.md` first (handbook: loop,
  autopilot, merging, CI checks). It never edits product code in the coder's checkout while the coder works; it
  writes in `.ai/` (tasks, reviews, decisions) and merges approved branches (standing approval, see `.ai/PROJECT.md`).
