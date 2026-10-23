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

## Risk
Tasks whose title or text matches `risk.*` in `project.json` are never auto-merged. Add project-specific
risk areas here (for example: authentication, payments, data migrations, CI configuration).

## Machine notes
(Operating system quirks, tool paths, known flaky tests – whatever a fresh session needs to know.)
