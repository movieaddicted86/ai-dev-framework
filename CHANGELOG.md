# Changelog

## 0.1.0 – unreleased
- First extraction from WebSlicer: protocol, lead handbook, templates, a Node CLI replacing the former
  bash/Python/Windows-only scripts, configuration through `.ai/project.json`.
- Stack-neutral principles (architecture, testability, maintainability, security baseline, change management,
  enforcement) and the `react-ts-vite` profile (conventions, guidelines, ESLint gates, radar, review checklist,
  CI and Dependabot templates).
- Playbooks and lessons from the evaluation of all WebSlicer reviews/reports/decisions (`lessons/`,
  `review-findings.md`), incl. the behaviour-preserving-refactoring evidence kit and external-review intake.
- Synchronised with WebSlicer at `1aeb557` (T-057): playbook `ci-speed.md`, lessons L21–L25 and P11–P13, CI template
  with Playwright container, cancel-stale (not on the base branch) and a tag-matches-package check, E2E isolation
  rules, "CI is read-only for the coder", per-name budget overrides, performance targets from measurements,
  a "Releases" section in the PROJECT.md seed.
- Fix: the Windows process listing no longer breaks the health check when a command line contains a control
  character (found because a WebSlicer sed command with an arrow was running); UTF-8 console output.
- Protocol: hand-back as one step, scratch in `.ai/work/T-NNN/` (removed after merge), cheap checks before hand-back,
  flaky tests are bugs, evidence summaries; task-writing rules in LEAD.md.
- `bootstrap.mjs init|upgrade|list`.
