# Lessons learned

Each lesson: what happened → the rule it produced → where the rule lives now. Source: the first project
(WebSlicer, 57 tasks, ~330 commits, one lead + one cheaper coder). Status 0.1.0: written from the protocol,
memory notes and a first skim of reviews; **a systematic pass over all reports and reviews is still open**
(see `TODO.md`).

## Process

| # | What happened | Rule | Lives in |
|---|---|---|---|
| L1 | A pass took ~3 h; ~2 h were full local E2E runs (~22 min each, browser crashes under load) and CI polling. The model needed ~30 min. | Verification budget: touched specs locally, full suite in CI, never wait for CI, no repeat runs as proof | PROTOCOL.md |
| L2 | A long interactive coder session hit API 400s, asked questions in the terminal, and hung. | Runner mode: a fresh `claude -p` per task; state in files and git; no questions, ever | `ai run`, PROTOCOL.md |
| L3 | Finished passes stayed alive, held open by a leftover background command (dev server, wait loop). | The prompt demands cleaning up; the health check kills leftover children after a grace period | `ai health` |
| L4 | The lead switched branches in the coder's checkout and broke a running pass. | Lead works in its own worktree; merges and pushes only from there | LEAD.md, `ai doctor` |
| L5 | Every watcher wake-up cost lead tokens; status replies were long. | The lead wakes only on reports, decisions and health issues; routine hand-backs are merged by the autopilot; chat replies are 2–3 lines | `ai lead-auto`, LEAD.md |
| L6 | Per-merge questions to the human were overhead. | Standing permission to merge approved branches and release the next task; ask only for product/design/roadmap/destructive decisions | PROJECT.md |
| L7 | Reviews found the same defect kinds again and again (formatting failures in CI, tests pinning old behaviour, UI specs pinning toolbar counts). | A repeated defect becomes a mechanical rule or a standing line in the task checks (e.g. "a toolbar change always runs the spec that pins it", `format:check` before hand-back) | principles 06, PROTOCOL.md |
| L8 | "Deviations" sections were mixed with remarks, so nothing could be auto-merged. | Deviations holds only real deviations (`None.` otherwise); remarks go to Notes. That makes autopilot merging safe | templates/report.md |
| L9 | Risk is not obvious from CI colour. | Explicit risk markers (high risk / critical / security / CI workflow changes) always wake the lead | `risk.*` in project.json |
| L10 | CI REST API rate limit (60/h unauthenticated) was exhausted by polling. | A read-only token; one poll per minute; the coder never polls | `ci.tokenFile` |
| L11 | Test containers started by passes piled up (22 leftovers). | Name containers `t<NNN>-…`, remove before hand-back; health check removes those of merged tasks | PROTOCOL.md, `coder.cleanupContainers` |
| L12 | Heredocs with TypeScript/Python through Git Bash broke on Windows; docker paths were mangled. | Write scripts as files; `MSYS_NO_PATHCONV=1` for docker paths; `python -X utf8`. The framework scripts are Node so none of this applies | PROJECT.md machine notes |

## Engineering

| # | What happened | Rule | Lives in |
|---|---|---|---|
| E1 | Guidelines said "files ≤ 400 lines" but nothing enforced it; god-files grew and needed a dozen refactoring tasks. | Every MUST rule has a tool (lint/CI) — ratchet on existing code | principles 06, `eslint.base.mjs` |
| E2 | Types and maths were duplicated between web and server; copies drifted into bugs. | Shared package; contract types declared once; the second copy is already one too many | principles 01 |
| E3 | A matrix decompose function passed its examples but lost data for mirrored input. | Roundtrip tests with awkward inputs for every transform | principles 02 |
| E4 | A "slicer option" feature allowed command execution; the fix was then bypassed through another key and another entry point. | Allowlist, not denylist; test bypass variants; check every entry point; security tasks are high risk | principles 04, playbooks/security-review.md |
| E5 | A local service had no Host/Origin check (DNS rebinding). | Local services bind to localhost and verify Host/Origin | principles 04 |
| E6 | A cancel test was "fixed as a test race" and failed again on another branch. | A flaky test is a bug to reproduce, not to re-run | principles 02 |
| E7 | Resource leaks (geometry, listeners, processes) recurred. | Everything opened is closed; add a test for the cancel path; engine resources behind an owning hook | principles 04, CODING-GUIDELINES |
| E8 | Toolbars, shortcut tables and help dialogs were edited by hand in three places. | One registry generates all of them | CODING-GUIDELINES §4 |
| E9 | Upgrades (TS, React, Vite, Express) were done as dedicated tasks with the E2E suite as net; a TS major was held until typescript-eslint caught up. | Upgrade runbook; grouped bot PRs; documented holds | playbooks/upgrade-major-dependency.md, radar.md |
| E10 | External review found maintainability and security issues the in-house loop had not. | Periodic audit + independent review, turned into work packages | playbooks/audit-to-refactoring.md |

## Lead memory seeds

See [lead-memory-seeds.md](lead-memory-seeds.md): standing decisions worth saving into the lead's auto-memory
of a new project.
