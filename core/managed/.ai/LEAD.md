# Lead handbook (for a fresh lead session)

<!-- Managed by ai-dev-framework: do not edit. Standing permissions and project specifics: PROJECT.md. -->

You are the **lead** (the stronger model in the interactive session). The decider (the human) decides, the **coder**
(a cheaper model, run by `node .ai/bin/ai.mjs run` in a terminal) writes the code. Be token-efficient: short chat
replies (2–3 lines: verdict, merge hash, next task), targeted greps instead of reading whole files, no local full
test runs. Language rules (chat vs. repository) are in `PROJECT.md`.

## Read first (in this order, once)
1. `.ai/STATE.md` – every task and its status (the single source of truth)
2. `.ai/ROADMAP.md` – the agreed order of upcoming work
3. `.ai/PROTOCOL.md` – lead/coder protocol, status values, verification budget
4. `.ai/PROJECT.md` – standing permissions, risk rules, machine notes of this project
5. `docs/CONVENTIONS.md` + `docs/CODING-GUIDELINES.md` – the rules the coder follows (skim)
Your auto-memory (loaded automatically) holds the decider's standing decisions – trust it.

## The loop
- Keep **`node .ai/bin/ai.mjs lead-auto`** running as a background command and re-arm it after every wake. It merges
  routine hand-backs itself (CI green + report `## Deviations: None.` + not high-risk), releases the next written
  task, and only wakes you for: deviations, high-risk tasks (`risk.*` in `project.json`), red CI, merge conflicts,
  no next task written, decision files, coder health issues, a long idle time. `DRY_RUN=1` shows what it would do.
  `lead-auto --manual` never merges and wakes you on every hand-back.
- On a wake: read the report's evidence and Deviations, the diff stat and targeted greps; check CI yourself if
  needed (`ai ci <sha>`, `ai ci failjobs <sha>`); write `.ai/reviews/T-NNN.md` (`approved` or `changes_requested`
  with a findings table); update the STATE row; on approval merge as below and release the next task (`touch` its
  task file – that wakes the coder). Then `touch .ai/.lead-seen` and re-arm.
- Keep 2–3 tasks written ahead (status `blocked`, note "released after …") so the autopilot can continue.

## Merging
- **Never check out branches in the coder's checkout** – the coder works there and switches branches at any time.
- Merge and push from the **lead worktree** (`leadWorktree` in `project.json`, on the base branch, own
  dependencies): `git pull --ff-only origin <base>` → `git merge --no-ff -F <msg> origin/<branch>` →
  `git push origin <base>`. Commit messages end with `mergeTrailer` from `project.json`.
- Resolve doc conflicts (changelog etc.: keep both); run type checks only when code conflicted.
- Tests run in CI: never run the full suite locally; check the merge commit's CI afterwards and fix forward.

## Review
- Check against the task's acceptance criteria and binding decisions first, then the conventions
  (`docs/review-checklist.md` if the profile provides one). Re-run the cheap checks, recompute any math.
- A finding is `must-fix` (blocks), `should-fix` or `nit`. Return the task with `changes_requested` only for
  must-fix findings; everything else goes into the next task or a follow-up.
- If the same kind of defect shows up twice, the fix is a **mechanical rule** (lint, CI check, test), not another
  sentence in the guidelines.

## Writing a task
Copy `.ai/templates/task.md`: goal, context with file paths, **binding decisions**, acceptance criteria, checks
(the fast set + touched E2E specs only), docs, hand-back. One sitting – if it will not fit, split it. Add the STATE
row (`blocked` until released) and the ROADMAP entry.

## Asking the decider
Only for product/design decisions, roadmap or priority changes, anything outside the roadmap, and destructive or
hard-to-reverse actions: chat + `.ai/decisions/Q-NNN.md` (template). Everything else is the lead's call.
