# ai-dev-framework

A lead/coder workflow for AI-assisted software projects, plus the engineering conventions that go with it.
Extracted from the first project that used it (WebSlicer: 57 tasks merged with a strong "lead" model reviewing a
cheap "coder" model, CI as the test authority, an autopilot for routine merges).

Read [MANIFEST.md](MANIFEST.md) first (ten commitments), then [lessons/](lessons/README.md) (why the rules exist).

## What is in here

| Path | Content |
|---|---|
| `core/managed/.ai/` | protocol, lead handbook, templates, and the Node CLI (`bin/ai.mjs`: `run`, `handback`, `lead-auto`, `merge`, `wait`, `health`, `doctor`, `ci`, `task`) — **cross-platform, dependency-free** |
| `core/owned/` | seeds written once: `STATE.md`, `ROADMAP.md`, `PROJECT.md`, `project.json`, coder permissions, `CLAUDE.local.md` |
| `conventions/principles/` | stack-neutral principles: architecture, testability, maintainability, security baseline, change management, enforcement |
| `profiles/react-ts-vite/` | the first stack profile: conventions, coding guidelines, ESLint base config with size/complexity/boundary gates, technology radar, review checklist, CI and Dependabot templates |
| `playbooks/` | project start, audit → refactoring, behaviour-preserving refactoring, external review intake, UI rebuild, human acceptance test, CI speed, major upgrades, security review, coder hang diagnosis |
| `lessons/` | what went wrong or right, and the rule it produced |
| `bootstrap.mjs` | `init` a project, `upgrade` it later |

## Use it

```bash
node bootstrap.mjs init ../my-project --name my-project --repo owner/my-project --profile react-ts-vite
cd ../my-project && node .ai/bin/ai.mjs doctor     # tells you what is still missing
```

Then follow [playbooks/project-start.md](playbooks/project-start.md).

## Managed vs. owned files

- **Managed** (framework-owned): `.ai/bin/**`, `.ai/PROTOCOL.md`, `.ai/LEAD.md`, `.ai/templates/**`,
  `docs/principles/**`, `docs/CONVENTIONS.md`, `docs/CODING-GUIDELINES.md`, `docs/radar.md`,
  `docs/review-checklist.md`, `eslint.base.mjs`. `node bootstrap.mjs upgrade <project>` updates them when the
  project did not change them; a locally changed file gets a `.framework-new` sibling to merge by hand.
- **Owned** (project-owned): `STATE.md`, `ROADMAP.md`, `PROJECT.md`, `project.json`, coder settings,
  `eslint.config.mjs`, `docs/PROJECT-CONVENTIONS.md`, CI workflow, Dependabot config. Written once, never touched.

Project specifics go into the owned files; the managed ones stay upgradeable.

## Requirements

Node ≥ 22, git, the Claude Code CLI (`claude`) for the runner, a second git worktree for the lead, and — for
automatic merging — a CI that can be queried (GitHub Actions with a read-only token, or any command that prints
`success | failure | pending | missing`).

## Versioning

[SemVer](https://semver.org/): a change of the protocol or of a gate that projects must react to is a minor
(0.x) / major bump with a migration note in [CHANGELOG.md](CHANGELOG.md).

## Tests

`node test/smoke.mjs` installs the framework into a temporary project with a bare remote and exercises the
state helpers, the autopilot (dry run and a real merge), the health check, upgrade conflict handling and the runner
with a fake coder.
