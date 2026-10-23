# Playbook: upgrading a major dependency (or the platform)

Trigger: an update bot opened a major PR, a security advisory, or a scheduled radar review.

1. **Decide the unit.** Which packages move together (React + types; Vite + plugin; ESLint + typescript-eslint;
   TypeScript alone)? One group = one task. A major is never mixed into a minor/patch group.
2. **Check the blockers** before starting: peer-dependency ranges of the neighbours (does typescript-eslint
   support the new TypeScript?), the engines field, the Docker/CI Node version. If blocked, write the hold into
   `dependabot.yml` (what blocks, what unblocks, when to re-check) and stop.
3. **Net first:** make sure the unit, integration and E2E suites are green on the base branch and cover what the
   dependency touches. If not, add the missing characterisation tests as step 0.
4. **Read the migration guide** and list the breaking changes that *apply* to this code base (grep for each). The
   list goes into the task as binding decisions.
5. **Change in the smallest order that keeps the build green:** bump → fix compile errors → fix lint → fix tests →
   remove workarounds the new version makes unnecessary → adopt new defaults only if the guide says they are
   required. One commit per step.
6. **Verify like production:** build, the touched E2E specs locally, full suite in CI, bundle size delta, a manual
   smoke of the main journeys when a rendering/build tool changed.
7. **Record it:** `docs/upgrades/<package>-<from>-<to>.md` (surprises, workarounds, follow-ups), update
   `docs/radar.md`/project holds, changelog "Unreleased".
8. **Rollback plan** in the report: the revert commit is the merge commit (`--no-ff`); data/format migrations
   have their own rollback.

High risk (never auto-merged): build tool, test runner, TypeScript, React, server framework majors.
