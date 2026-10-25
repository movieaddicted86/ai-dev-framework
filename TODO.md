# TODO (framework)

## Done
- [x] Evaluate all reviews, report deviations/notes and decision files of WebSlicer → `lessons/` (README, review-findings),
  playbooks (behaviour-preserving refactoring, external review intake), protocol/lead/checklist updates.
- [x] `eslint.base.mjs` verified on a sample project (max-lines, any, floating promises, layer boundary, suppressions ratchet).

## Next (derived from the lessons)
- [x] `ai handback T-NNN` (L13, L28), `ai merge`, post-merge CI watch, single-instance locks, overlapping-pass and credits diagnosis.
- [ ] `ai task lint T-NNN`: a new task has goal, binding decisions, ACs, checks, out-of-scope, a base branch (L18).
- [ ] `ai report` (lead): summary of a report for the review (Deviations, evidence numbers, diff stat, CI) — token saver.
- [ ] Autopilot: refuse to auto-merge when the report names no CI run / sha, or the diff touches `.github/workflows`.
- [ ] `ai doctor`: warn when `handback.pins` is empty although `PROJECT-CONVENTIONS.md` lists pinning specs.
- [ ] Checklist generator for the human acceptance test (`ai accept-test` → HTML with ids) and a `FINDINGS.md` template.
- [ ] Optional `ai handover` that fills `HANDOVER.md` from STATE/ROADMAP/git (the lead edits the rest).
- [ ] Mine the 50 reports' *Evidence* and the 100+ `.claude/` probe scripts for reusable verification helpers
  (REST smoke diff main vs branch, store snapshot diff, pixel diff) → `tools/` of the framework.

## Needs a second project / real environment
- [ ] Prove the profile on a second project (the real test of "what still sticks to WebSlicer").
- [ ] Run `node test/live.mjs` in the coder terminal (real `claude -p`, needs login/OpenRouter env): the first attempt failed only on "Not logged in"; spawn, stream format, log and health were confirmed.
- [ ] Test the CI template and the Dependabot config against a real GitHub project.

## Later
- [ ] Additional profiles: Python/FastAPI backend, static site, library (npm package).
- [ ] More CI providers behind `ci.provider` (GitLab, Gitea) — `command` provider covers the gap today.
- [ ] Optional PR mode for teams (the autopilot merges locally and pushes).
- [ ] Decide whether `.ai/` history (tasks/reviews) should be tracked by default (currently ignored; `--track-ai`).
