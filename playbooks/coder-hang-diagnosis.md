# Playbook: the coder is stuck, slow or idle

`node .ai/bin/ai.mjs health` (the autopilot runs it every few minutes) reports:

| Signal | Meaning | Action |
|---|---|---|
| `runner_down` | `ai run` is not running | tell the human to start it; check `.ai/logs/` for the last error |
| `stalled` | no log event for `coder.stallMin` minutes while a pass runs | look at the listed child processes: a dev server or watch command that never ends → kill it; the pass continues. Waiting on the API → wait or restart the runner |
| `hung_after_result` | the pass already wrote its final result but the process lives on, held open by a background command | automatic: the children are killed. If it repeats, find which command the coder starts in the background and forbid it in PROTOCOL/the task |
| `idle_with_work` | STATE.md has work, no pass for `coder.idleMin` | usually the last pass ended in an API error (shown) → touch the task file to trigger a new pass; if repeated, the task is unclear → rewrite it smaller |
| container leftovers | test containers of merged tasks pile up | `coder.cleanupContainers: true` removes them |

Root causes seen in practice and their rules:
- **Waiting is the cost, not thinking:** ~2 of 3 hours of a pass were full local E2E runs and CI polling → the
  verification budget in PROTOCOL.md.
- **Questions in a terminal nobody watches** blocked passes → `AskUserQuestion` is on the deny list; ambiguity is
  resolved by choosing the closest option and recording it under Deviations.
- **Long interactive sessions** degraded (API 400s, forgotten rules) → fresh context per task (`ai run`).
- **Shared checkout:** the lead must never switch branches in the coder's checkout → lead worktree.
