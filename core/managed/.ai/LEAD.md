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
- After a review with `approved`: **`node .ai/bin/ai.mjs merge T-NNN`** (run it as a background command) — it waits
  for the CI of the branch head, merges `--no-ff` from the lead worktree, pushes, sets `merged` (your review file stays),
  releases the next written task. Exit 3 = conflict (the merge stays open in the lead worktree: resolve, `git add -A`,
  `git commit`, `git push origin <base>`), exit 4 = the coder did not push the branch (`git push origin <branch>` from
  the coder's checkout is safe), exit 1 = CI red, exit 2 = CI timeout.
- **Check the CI of the base branch after every merge** — a green branch can give a red base (two branches that
  interact; an unformatted table after a conflict). The autopilot watches the merge commits it makes; for manual
  merges look yourself (`ai ci <hash>`) and fix forward.
- Typical conflicts: the changelog (the task's entries stay **above** the newest release block); Markdown tables
  (run the formatter after resolving, otherwise `format:check` fails on the base branch).
- **Never check out branches in the coder's checkout** – the coder works there and switches branches at any time.
- Merge and push from the **lead worktree** (`leadWorktree` in `project.json`, on the base branch, own
  dependencies): `git pull --ff-only origin <base>` → `git merge --no-ff -F <msg> origin/<branch>` →
  `git push origin <base>`. Commit messages end with `mergeTrailer` from `project.json`.
- Resolve doc conflicts (changelog etc.: keep both); run type checks only when code conflicted.
- Tests run in CI: never run the full suite locally; check the merge commit's CI afterwards and fix forward.

## Long sessions and handover
The lead's context rots like the coder's. Keep `.ai/HANDOVER.md` (template: `templates/handover.md`) current — start
steps, state, binding decisions, the review/merge routine that works, pitfalls, machine notes, the first message for
a fresh chat — and refresh it before ending a long session. A fresh lead starts from it. Never run two autopilots (the
lock refuses the second one); stop a stale one first.

## Stability
Once the loop runs reliably, changes to the autopilot, CI or the coder setup are made only when the decider asks.
Propose improvements in chat or `decisions/`; do not tinker with a working pipeline.

## Human acceptance
After each group of user-visible tasks plan a human acceptance test (`playbooks/human-acceptance-test.md`): the
decider tests the deployed build by hand; findings go into `.ai/FINDINGS.md`; feature work pauses meanwhile.

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
row (`blocked` until released) and the ROADMAP entry. From the first project's 47 reviews:

- **Probe external premises** (an online endpoint, a vendor feed, an API) with the real thing and put the result in
  the task. A feature built on "the channel carries updates" that carries none is wasted work; if a premise fails, the
  decider decides what happens to the task.
- **Verify facts before you write them** (vendor files, the real CLI, the current code). Wrong facts in a task were
  the most common source of deviations: a "forbidden" command that the stock profile itself emits, a wrong file
  name, a layer count.
- **Every acceptance criterion must be able to fail.** Check that the example in the AC discriminates (five bars
  that fit without the option prove nothing about the option).
- **Name what pins the area** (specs, snapshots, docs that assert counts/labels/status codes) and require the
  coder to run them. A toolbar change broke the same spec twice.
- **Performance targets come from measurements** (total work ÷ parallelism + fixed cost), with an acceptable
  fallback named in the task. A guessed target ("≤ 8 min") cost three rounds and was accepted at 12.7 min.
- **ACs must not contradict the task's own measures** ("three consecutive green runs" vs. "cancel stale runs").
- **Refactoring tasks** state the order — baseline capture → pin → move → compare — and name the evidence kit
  (`playbooks/behaviour-preserving-refactoring.md`) and the before/after numbers to report.
- **Base branch:** "`main` at `<hash>` or later"; the autopilot fills the hash on release.
- **Shared append-only docs** (changelog, test-case lists): no running numbers in tasks (use the task id), so
  parallel branches do not collide.
- **High risk?** Say so in the title ("HIGH RISK", "SEC-n", "CRITICAL") — it keeps the task out of the autopilot.
- **Scratch work** goes to `.ai/work/T-NNN/`; raw logs are referenced from the report, not pasted into it.

## Asking the decider
Only for product/design decisions, roadmap or priority changes, anything outside the roadmap, and destructive or
hard-to-reverse actions: chat + `.ai/decisions/Q-NNN.md` (template). Everything else is the lead's call.
