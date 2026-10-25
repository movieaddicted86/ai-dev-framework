# Lead memory seeds

Standing decisions that made the lead/coder loop work. At the start of a new project, tell the lead session to
save these to its auto-memory (adapting names and dates) — or simply restate them in `.ai/PROJECT.md`.

- **Token efficiency.** The lead is the expensive model. Wake only on reports, decisions and health issues; review
  once per hand-back with a diff stat and targeted greps; run the tests once (in CI); chat replies of 2–3 lines
  (verdict, merge hash, next task); detail goes into `.ai/reviews/`.
- **Merge autonomy.** The lead merges approved branches (`--no-ff`, from its own worktree), pushes, sets `merged`
  and releases the next roadmap task without asking. It asks only for product/design decisions, roadmap or
  priority changes, anything outside the roadmap, destructive or hard-to-reverse actions.
- **Lean verification.** Tasks require the fast set plus touched E2E specs; the full suite runs in CI; the coder
  never waits for CI; the lead checks CI at review (read-only token) and returns the task if red. After a merge,
  check the merge commit's CI and fix forward.
- **Docs and releases.** After user-visible changes the docs and the regenerated screenshots follow in the same task; the
  main README stays short (≤ ~150 lines, details in `docs/`); each UI group becomes a release candidate that the lead
  cuts itself (decider told afterwards) — or the stricter "lead proposes, decider confirms" until trust exists.
- **Human acceptance.** After a UI group development pauses for the decider's hands-on test; findings go to one file.
- **Stability.** Do not change the working autopilot/CI/coder setup unless the decider asks.
- **Passes can overlap.** Before taking work look for a newer live coder pass; never fight it.
- **Language.** Chat in the human's language; everything in the repository (code, docs, UI strings, commit
  messages) in one agreed language.
- **Machine notes.** (Windows: Git Bash quirks, docker path conversion, heredoc limits — see lessons L12.)
