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
- **Language.** Chat in the human's language; everything in the repository (code, docs, UI strings, commit
  messages) in one agreed language.
- **Machine notes.** (Windows: Git Bash quirks, docker path conversion, heredoc limits — see lessons L12.)
