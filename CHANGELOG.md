# Changelog

## 0.1.0 – unreleased
- First extraction from WebSlicer: protocol, lead handbook, templates, a Node CLI replacing the former
  bash/Python/Windows-only scripts, configuration through `.ai/project.json`.
- Stack-neutral principles (architecture, testability, maintainability, security baseline, change management,
  enforcement) and the `react-ts-vite` profile (conventions, guidelines, ESLint gates, radar, review checklist,
  CI and Dependabot templates).
- Playbooks and lessons from the evaluation of all WebSlicer reviews/reports/decisions (`lessons/`,
  `review-findings.md`), incl. the behaviour-preserving-refactoring evidence kit and external-review intake.
- Protocol: hand-back as one step, scratch in `.ai/work/T-NNN/` (removed after merge), cheap checks before hand-back,
  flaky tests are bugs, evidence summaries; task-writing rules in LEAD.md.
- `bootstrap.mjs init|upgrade|list`.
