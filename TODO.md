# TODO (framework)

- [ ] Mine all reports/reviews of WebSlicer (57 tasks) systematically into `lessons/` (only a first skim done).
- [ ] Prove the profile on a second project (the real test of "what still sticks to WebSlicer").
- [x] `eslint.base.mjs` verified on a sample project (max-lines, any, floating promises, layer boundary, suppressions ratchet).
- [ ] Test the CI template and the Dependabot config against a real GitHub project.
- [ ] Run the runner against the real `claude -p` once (the smoke test uses a fake coder).
- [ ] Optional: GitHub `gh`-free PR flow (the autopilot merges locally and pushes; a PR mode may be wanted for teams).
- [ ] Additional profiles: Python/FastAPI backend, static site, library (npm package).
- [ ] Optional: more CI providers behind `ci.provider` (GitLab, Gitea) — `command` provider covers the gap today.
- [ ] Decide whether `.ai/` history (tasks/reviews) should be tracked by default (currently ignored; `--track-ai`).
