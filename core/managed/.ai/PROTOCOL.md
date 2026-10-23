# Lead ↔ coder protocol

<!-- Managed by ai-dev-framework: do not edit. Project specifics go into PROJECT.md and project.json. -->

Two AI agents work on one repository, and a human decides:

| Role | Who | Writes |
|---|---|---|
| **Decider** | the human | answers in `decisions/`, approvals in chat |
| **Lead** | the stronger model in an interactive session | `tasks/`, `reviews/`, `decisions/`, `STATE.md` (task rows) – never product code |
| **Coder** | the cheaper model, started by the runner | code on its feature branch, `reports/`, `STATE.md` (status column) |

`.ai/` is git-ignored by default: it survives branch switches and never lands in a commit.
Engineering rules for the code itself: `docs/CONVENTIONS.md` and `docs/CODING-GUIDELINES.md` (binding).
Project specifics (commands, risk, machine notes): `.ai/PROJECT.md`. Machine-readable settings: `.ai/project.json`.
All commands below are `node .ai/bin/ai.mjs <command>` (short: `ai <command>`).

## Files

```
.ai/STATE.md              one row per task: id · title · status · branch · last step
.ai/tasks/T-NNN.md        task from the lead (template: templates/task.md)
.ai/reports/T-NNN.md      coder's report, rewritten on every hand-back (templates/report.md)
.ai/reviews/T-NNN.md      lead's review (templates/review.md)
.ai/decisions/Q-NNN.md    question for the decider (templates/decision.md)
.ai/ROADMAP.md            agreed order of upcoming work
.ai/.coder-seen           marker: the coder has seen everything older than this file
.ai/.lead-seen            marker: the lead has seen everything older than this file
.ai/logs/                 runner logs (stream-json), newest few kept
```

## Status values (column "Status" in STATE.md)

`open` → `in_progress` → `in_review` → `changes_requested` → `in_progress` → … → `approved` → `merged`

- Only the coder sets `in_progress` and `in_review`.
- Only the lead (or the autopilot) sets `open`, `changes_requested`, `approved`, `merged`, `blocked`.
- `blocked` = written but not released yet, or waiting for a decision of the decider (see `decisions/`).

## Coder loop

1. `touch .ai/.coder-seen`, then read `STATE.md`.
2. Pick work in this order: a task in `changes_requested` (read its review first), then the oldest
   `open` task. Nothing to do → go to step 6.
3. Set the task to `in_progress` in `STATE.md`. Work on branch `<branchPrefix>T-NNN` (create it from the base
   branch unless the task names another base). Follow the task and the conventions. Never touch the base
   branch, never merge, never edit files in `.ai/` other than `STATE.md` and your report.
4. Verify exactly as the task's "Checks" section says. Commit (one commit per logical step, `Co-Authored-By:`
   names your model) and push the branch.
5. Write `reports/T-NNN.md` (template), set the task to `in_review` in `STATE.md`. `## Deviations` holds only
   real deviations from binding decisions/ACs (`None.` otherwise); remarks go to `## Notes`.
6. Start the watcher **as a background command** and stop: `node .ai/bin/ai.mjs wait`. When it exits you are
   woken up automatically → go to step 1. Always re-arm the watcher before you stop.

**Runner mode (the default):** the human starts `node .ai/bin/ai.mjs run` instead of an interactive session. It
starts one fresh `claude -p` per pass (empty context per task), waits with `wait` in between and logs to
`.ai/logs/`. In a runner pass do steps 1–5 only: **no** `wait`, no questions, and stop every background process
you started – end the pass after the hand-back.

### Verification budget

Most of a pass used to be waiting for test runs (a task took ~3 h, ~2 h of it waiting for local full E2E runs and
CI polling; the model itself needed ~30 min). So:

- **Local checks: the fast set** (typecheck, lint, unit tests, build) **plus only the E2E specs the change touches.**
  The **full E2E suite runs in CI** – do not run it locally unless the task says "full suite locally".
- **Do not wait for CI.** Push, then hand back; write the run's URL/sha into the report, not its result. The lead
  checks CI during the review and returns the task if it is red. No `sleep`/`until` loops polling the CI API.
- **No repeat runs as proof** (3× local, 2× CI, main-vs-branch captures) unless the task asks for them by name.
  One green run of each required check is enough.
- If a local run fails for an environmental reason (a browser crash under load), re-run only the failed spec
  once and note it – do not restart the whole suite.
- Containers/servers you start yourself are named `t<NNN>-<purpose>` (task number) and removed before the
  hand-back; the health check deletes leftovers of merged tasks when `coder.cleanupContainers` is on.

### Rules of conduct

- **After a context reset:** read this file and `STATE.md` first and continue from there. Do not repeat
  verification that the report or `git log` already shows as done.
- **Unclear task, or a binding decision that cannot work:** write the problem into the report, set the task to
  `in_review`, and stop. Do not guess.
- **Never ask questions in the terminal** (no selection prompts, no `AskUserQuestion`, no "shall I…?" – nobody
  watches the coder's terminal). Small choices: take the option closest to the task and the conventions, carry
  on, and list it under "Deviations" in the report. Real blockers: report + `in_review` as above; the lead
  answers in `reviews/` or asks the decider via `decisions/`.
- **Scope:** change only what the task needs. Unrelated findings go into the report's Notes.
- The watcher wakes you only for new or changed files in `tasks/` and `reviews/` (the lead always hands over
  input that way); your own edits of `STATE.md` and `reports/` do not wake you.

## Lead loop

1. Run the autopilot as a background command: `node .ai/bin/ai.mjs lead-auto` (see `LEAD.md`). It watches
   `reports/`, `decisions/` and the coder's health (runner down, pass stalled, pass finished but held open by
   a leftover background command – those children are killed automatically –, idle with work, API errors).
2. Routine hand-backs (CI green + `## Deviations: None.` + not high-risk) are merged by the autopilot, which then
   releases the next written task. Everything else wakes the lead with the reason.
3. On a wake: review the commits (read the code, re-run checks, recompute the math), write `reviews/T-NNN.md`,
   set `changes_requested` or `approved`, tell the decider in chat. After `approved` the lead merges and pushes
   (standing approval of the decider), sets `merged` and releases the next roadmap task.
4. Decisions that belong to the decider go into `decisions/Q-NNN.md`; the task stays `blocked` meanwhile.
