# Lessons learned

Each lesson: what happened → the rule it produced → where the rule lives now.
Source: the first project (WebSlicer: 48 reviewed tasks up to T-057, ~340 commits, one lead model + one cheaper coder
model, 6 decision files, 2 independent code reviews). Evaluated from all review files, the *Deviations* and *Notes* of
all reports, the decision files and the protocol history; last synchronised with WebSlicer at `1aeb557` (T-057 merged). Statistics and the review-finding taxonomy:
[review-findings.md](review-findings.md). Standing decisions for the lead's memory: [lead-memory-seeds.md](lead-memory-seeds.md).

## At a glance

- **37 of 48 tasks were approved in the first round**, 11 needed a second (two a third) — most of those returns
  were CI failures the coder could have caught locally with a cheap check (see P-series), not design problems.
- The expensive failures were never about code volume: they were **waiting** (E2E and CI polling), **context rot**
  (long sessions), **unverified facts in task descriptions**, and **rules that nothing enforced**.
- The strongest quality evidence was *behaviour-preservation proof* (golden captures of `main` vs. branch), not
  more review prose.

## Process (L-series)

| # | What happened | Rule | Lives in |
|---|---|---|---|
| L1 | A pass took ~3 h; ~2 h were full local E2E runs (~22 min each, browser crashes under load) and CI polling. The model needed ~30 min. After the budget: a round turned around in 9 min (T-031 r3). | Verification budget: fast set + touched specs locally, full suite in CI, never wait for CI, no repeat runs as proof | PROTOCOL.md |
| L2 | A long interactive coder session hit API 400s, asked questions in the terminal, and hung. | Runner mode: a fresh `claude -p` per task; state in files and git; no questions, ever | `ai run`, PROTOCOL.md |
| L3 | Finished passes stayed alive, held open by a leftover background command (dev server, wait loop). | The prompt demands cleaning up; the health check kills leftover children after a grace period | `ai health` |
| L4 | The lead switched branches in the coder's checkout and broke a running pass. | Lead works in its own worktree; merges and pushes only from there | LEAD.md, `ai doctor` |
| L5 | Every watcher wake-up cost lead tokens; status replies were long. | The lead wakes only on reports, decisions and health issues; routine hand-backs are merged by the autopilot; chat replies are 2–3 lines | `ai lead-auto`, LEAD.md |
| L6 | Per-merge questions to the human were overhead. | Standing permission to merge approved branches and release the next task; ask only for product/design/roadmap/destructive decisions | PROJECT.md |
| L7 | The same CI failures came back: Prettier failing (T-038), specs pinning old behaviour (T-038), the toolbar-count spec failing **twice** (T-042, T-044), a flaky race test twice (T-040, T-042). | A repeated defect becomes a mechanical rule or a standing check line: `lint` + `format:check` before every hand-back; a change to a structure that a spec pins always runs that spec; a failing flaky test is reproduced (loop 50×), not re-run | PROTOCOL.md, review-checklist, principles 02/06 |
| L8 | "Deviations" were mixed with remarks, so nothing could be auto-merged. | Deviations holds only real deviations (`None.` otherwise); remarks go to Notes. That makes autopilot merging safe | templates/report.md |
| L9 | CI colour does not tell risk. | Explicit risk markers (high risk / critical / security / CI workflow changes) always wake the lead | `risk.*` in project.json |
| L10 | CI REST API rate limit (60/h unauthenticated) was exhausted by polling; a scrape of the run page was the workaround. | A read-only token; one poll per minute; the coder never polls | `ci.tokenFile` |
| L11 | Test containers started by passes piled up (22 leftovers); comparison trees and servers were left outside the repo (`ws-t13-main`, dev servers on 5175/5177, detached worktrees). | Name containers `t<NNN>-…`; scratch lives in `.ai/work/T-NNN/` and is removed by the autopilot after the merge; everything started is stopped before hand-back | PROTOCOL.md, `ai lead-auto`, `coder.cleanupContainers` |
| L12 | Heredocs with TypeScript/Python through Git Bash broke on Windows; docker paths were mangled. | Scripts are files; `MSYS_NO_PATHCONV=1` for docker paths; the framework's own scripts are Node | PROJECT.md machine notes |
| L13 | The coder forgot the STATE row (left `in_progress`/`open` after a hand-back: T-007, T-030). The runner then treats the task as still actionable. | Hand-back is one atomic step (planned: `ai handback T-NNN` validates report sections, pushed branch, then sets `in_review`) | TODO.md, PROTOCOL.md |
| L14 | The coder wrote scratch into `.ai/` (T-030, T-032) and 400+ probe files piled up in `.claude/`. | One scratch location per task (`.ai/work/T-NNN/`), cleaned after merge; the coder writes nothing else into `.ai/` | PROTOCOL.md |
| L15 | A checkout's `node_modules` was damaged between tasks (T-016 review). | Step 0 of every task: `npm ci` if the install is suspect; `doctor` checks the toolchain | task template |
| L16 | Reports grew to 6–19 KB each (443 KB for 50 reports); the lead reads evidence numbers only. | Report evidence ≤ ~40 lines of summary; raw logs go to `.ai/work/T-NNN/` and are referenced | templates/report.md |
| L17 | Shared append-only docs (CHANGELOG, UAT list) conflicted on every parallel merge; UAT numbers had to be renumbered twice (T-034→UAT-30, T-036→UAT-31); two tasks merged together needed manual doc resolution (T-033+T-034). | Number test cases by task id, not by running number; the lead resolves doc conflicts "keep both"; avoid two open branches that both touch the same doc hotspot | principles 05, LEAD.md |
| L18 | The lead's task text contained wrong facts and self-contradicting ACs: M906/M907 "block" vs. "0 blocks on real slicer output" (T-031); an AC example that could not discriminate (T-043); a wrong file name (T-045); the layer count (T-004). The *Deviations* mechanism caught all of them. | Writing a task includes verifying facts against the source (vendor files, the real CLI) and checking that every AC can fail; the coder's duty to stop and report a contradiction stays | LEAD.md "Writing a task" |
| L19 | An external review came as a list of 40 findings; taken 1:1 it would have produced wrong work. The lead verified each claim against the code (confirmed / partly / false) and found a worse issue (RCE bypass of our own security fix). | Intake of external reviews: verify every claim with file:line evidence, assign a verdict, fold into ordered packages | playbooks/external-review-intake.md |
| L20 | The baseline capture for a refactoring was taken *after* the moves (T-018); all services moved in one 19-file commit (T-021). Both were accepted only because other pins existed. | Order is part of the task: capture → pin → move; one concern per commit unless the compiler forbids a split (then say so) | playbooks/behaviour-preserving-refactoring.md |
| L21 | T-057 set "≤ 8 min CI wall time" from a guess. Three rounds later: 24 → 12.7 min, same 117 tests; the target was not reachable with this runner and suite (42 min of test time, ~1.3–1.9× effective speedup per shard, ~3 min fixed cost per shard). The decider accepted "12 instead of 24 is fine". | A performance target is derived from measurements (total work ÷ parallelism + fixed cost) before it becomes an AC, and the task names the acceptable fallback; the coder reports the ceiling and the levers instead of grinding | LEAD.md "Writing a task", playbooks/ci-speed.md |
| L22 | The coder probed whether a CI run could be re-run by sending the write request — it triggered and cancelled a real run. | CI is read-only for the coder: no write call to an external service is ever used as a probe; the read-only token enforces it | PROTOCOL.md |
| L23 | AC "three consecutive green runs" collided with the new "cancel stale runs" measure: two pushes were cancelled by the next push and did not count. | Check that ACs do not contradict the measures of the same task | LEAD.md "Writing a task" |
| L24 | A task whose deliverable *is* CI speed legitimately needs the coder to wait for CI; the general budget forbids it. | A task may override the verification budget explicitly and by name; otherwise the budget stands | task template, PROTOCOL.md |
| L25 | Release candidates were cut per group of packages, never on the lead's initiative: the lead proposes when a group is merged and CI on the base branch is green; the human confirms; then version bump script + `version:check`, changelog block moved, tag, push. | Release policy is an explicit standing rule per project | PROJECT.md "Releases" |

## Verification and quality (P-series)

| # | What happened | Rule | Lives in |
|---|---|---|---|
| P1 | Behaviour-preserving refactorings (R-1…R-12, 12 tasks) were all approved in round 1 — because each proved sameness mechanically: REST smoke vs `main` 0 diff over 154 exchanges (T-021…23), store keys/values identical (T-016), 2055 captures / 46 pixel-identical shots (T-017/18), `tools/list` 0 diff, normalised-diff of moved code (T-028), lockfile diff package by package (T-027). | An "evidence kit" for refactorings: golden captures from `main` taken *before*, compared after | playbooks/behaviour-preserving-refactoring.md |
| P2 | Pins written *before* moving code (T-013, T-028) found real bugs in the old code and showed they can bite. | Pin first; show that the pin fails when the code is wrong | principles 05 |
| P3 | A guard validated against real data (1763 print / 6948 filament / 1066 printer vendor presets, 0 false blocks — T-032) instead of against the author's examples. | New validation/safety rules are swept against a real corpus before they block anything | principles 02 |
| P4 | A "protection" turned out to be an accident (the server closed stdin, so PrusaSlicer's own prompt blocked execution — T-024). | Verify the actual mechanism of every control; an accident is not a control | principles 04 |
| P5 | A security fix was bypassed through another key and another entry point (SEC-2 after SEC-1); the coder's extra "same rule, second place" commits in T-024 found real gaps. | Test bypass variants and every entry point; accept such extra commits when they close the same rule | principles 04, playbooks/security-review.md |
| P6 | A job was marked `done` before its info existed; a sync file scan blocked the event loop for ~3.6 s (T-031 r1/r2). | Async I/O in request paths; set derived data before the state that promises it; pin both | principles 03, CODING-GUIDELINES §5 |
| P7 | A timing-based test (event-loop stall) was flaky under load. | Prefer relative checks (ticks during the scan vs. a calibration run) to absolute timings | principles 02 |
| P8 | The E2E suite, run by `npm run e2e`, would have deleted the human's real jobs and presets on `localhost:8080` (T-030 r1). | A destructive test suite refuses to run without an explicit target and a positive fixture marker, checked before the first write | profile CONVENTIONS §5 |
| P9 | CI wall time was 26–29 min per push → 3 weighted shards (6–11 min warm). The browser install (11 s to 12 min), not the suite, was the unstable part; a containerised runner, one shared build and cancel-stale are planned (T-057, not yet merged). | Shard by measured time; cache browsers; cancel stale runs; docs-only pushes skip E2E | profile CI template |
| P10 | A TypeScript major was held until typescript-eslint caught up; React 19 / Vite 7 / Express 5 / TS 6 each went in as their own task with the net green first. | Upgrade runbook; grouped bot PRs; documented holds | playbooks/upgrade-major-dependency.md |
| P11 | Making E2E fast (T-057): official Playwright container (no 12-min cold browser install), `--ipc=host`, image tag derived from `package.json`; one build job owns the cache scope and shards only `--load` it (a `docker save` artifact would be ~430 MB per shard); cancel stale runs except on the base branch. | CI template and playbook | profile ci.yml, playbooks/ci-speed.md |
| P12 | Parallel workers need isolation, not serialisation: fresh browser context per test, per-context autosave/session id, a `server-state` test lock for tests that mutate shared server state; one expensive setup (a slice) per spec file, memoised per worker, with a fast profile where quality does not matter — and **no assertion removed** (list test/assertion counts before/after). | E2E conventions | profile CONVENTIONS §5 |
| P13 | Playwright shards are **contiguous file groups**: weights only move the boundaries; a `lock` attaches to the whole group, so two locked files in one shard run strictly one after the other (cost 10.6 min once). Keep one expensive locked file per shard; re-check the assignment after every Playwright bump (`--list --shard=i/n`). `PWTEST_SHARD_WEIGHTS` is undocumented → quote it in YAML (`33:23:32:29` is a sexagesimal integer to YAML 1.1) and keep the fallback in mind. | playbook | playbooks/ci-speed.md |

## Engineering (E-series)

| # | What happened | Rule | Lives in |
|---|---|---|---|
| E1 | Guidelines said "files ≤ 400 lines" but nothing enforced it; a 1384-line `Viewer.tsx`, a god-router and a god-store grew and needed a dozen refactoring tasks (R-1…R-12, Q3, Q4). | Every MUST rule has a tool (lint/CI) — ratchet on existing code | principles 06, `eslint.base.mjs` |
| E2 | Types and maths were duplicated between web and server; the copies drifted into bugs (P1.3, T-001). | Shared package; contract types declared once; the second copy is already one too many | principles 01 |
| E3 | A matrix decompose "fix" passed its examples but gave a different matrix for non-uniform mirrors (T-001 r1) — only the lead's recomputation caught it. | Roundtrip tests with awkward inputs for every transform; the lead recomputes math independently | principles 02, review-checklist |
| E4 | A "slicer option" feature allowed command execution (`post_process`); the fix was bypassed by key injection; `output_filename_format` with `..` wrote outside the job dir. | Allowlist, not denylist; strip at the single funnel; security tasks are high risk | principles 04 |
| E5 | A local service had no Host/Origin check (DNS rebinding). | Local services bind to localhost and verify Host/Origin | principles 04 |
| E6 | Resource leaks (geometry never disposed, listeners, processes) recurred in several areas (B1, plater leak, B9). | Everything opened is closed; cancel-path tests; engine resources behind one owning hook | principles 04, CODING-GUIDELINES |
| E7 | Toolbars, shortcut tables and help dialogs were edited by hand in three places; a toolbar change broke a spec twice. | One registry generates all of them (T-046); specs that pin structure are named in the project conventions | CODING-GUIDELINES §4, PROJECT-CONVENTIONS |
| E8 | One error type for everything meant `validateSliceRequest` typed as `ValidationError` would silently change 500 → 400. Contract pins caught it. | Pin status codes/messages before typing errors; behaviour changes are listed explicitly | principles 05 |
| E9 | A11y attributes were missing on 171 icon-only buttons; React Compiler lint rules were deferred. | A11y basics are part of the definition of done; compiler-readiness lint is a planned gate | profile CONVENTIONS §3 |
| E10 | The in-house loop had good unit coverage and still missed maintainability and security issues that two independent reviews found (6/10 overall in the second). | Periodic audit + independent review turned into ordered work packages; mechanical gates for what repeated | playbooks/audit-to-refactoring.md |
| E11 | Documentation drifted (line numbers age quickly; READMEs grew to 32 KB). | Findings cite the symbol next to the line; README short and grouped; generated docs are generated | principles 03 |

## What worked best (keep)

1. Files as the only interface between agents; any agent restartable at any time.
2. The *Deviations* contract plus the autopilot (routine merges without the lead).
3. Fresh context per task; state in git.
4. Pins before refactorings and golden captures after.
5. Independent verification by the lead of anything numerical or security-relevant.
6. Small, ordered review packages (Q1…Q8) instead of one big cleanup.
