# {{name}} – project specifics for the lead/coder workflow

Owned by the project (the framework never overwrites this file). Generic rules: PROTOCOL.md, LEAD.md.

## Language
- Chat with the decider: {{chatLanguage}}.
- Everything in the repository (code, docs, UI strings, commit messages): {{repoLanguage}}.

## Standing permissions of the decider
- The lead merges an approved branch into `{{baseBranch}}` and pushes **without asking**, then releases the next task.
- The lead writes and releases new tasks in ROADMAP order without asking.
- The lead asks the decider (chat + `decisions/Q-NNN.md`) only for product/design decisions, roadmap or priority
  changes, anything outside the roadmap, destructive or hard-to-reverse actions.

## Standard checks (the fast set every task runs before hand-back)
{{standardChecks}}

## Releases
(Choose one and delete the other.)
- **Lead releases on its own** (the rule the first project ended up with): after each group of user-visible tasks, when
  the group is merged, CI on `{{baseBranch}}` is green and the docs and screenshots are current, the lead cuts the next
  release candidate (`v1.0.0-rc.N`) and tells the decider afterwards. From the lead worktree: bump all manifests with
  the version script, fix the lock file versions, run the version check, move the changelog "Unreleased" block under
  the new version, commit, annotated tag, push both.
- **Lead proposes, decider confirms** (the stricter start): the lead proposes the release in chat when the group is
  merged and CI is green; the decider says yes; then the same steps.
Next planned release: (fill in).

## Documentation rule
After every user-visible change the documentation follows **in the same task**: README (kept short — at most ~150
lines, details in `docs/`), feature docs, the acceptance/test-case list, regenerated screenshots, changelog. UI tasks
carry this as an acceptance criterion; stale screenshots or a grown README = `changes_requested`.

## Risk
Tasks whose title or text matches `risk.*` in `project.json` are never auto-merged. Add project-specific
risk areas here (for example: authentication, payments, data migrations, CI configuration).

## Machine notes
(Operating system quirks, tool paths, known flaky tests – whatever a fresh session needs to know.)
