# Playbook: starting a new project

1. **Create the repository** (private is fine), clone it, and create the project skeleton for the stack (for the
   `react-ts-vite` profile: npm workspaces `shared/ server/ web/`, root scripts `typecheck lint format format:check
   test build e2e`).
2. **Install the framework:** `node <framework>/bootstrap.mjs init <project> --name <name> --repo <owner/name>
   [--profile react-ts-vite] [--chat-language German] [--repo-language English] [--model <coder model>]`.
   Use `--track-ai` if `.ai/` should be versioned (audit trail, second machine); default is git-ignored.
3. **Commit the installed files** (everything outside the git-ignored `.ai/`: `docs/`, `eslint.*`, CI, …) — `ai handback` requires a clean tree.
   **Fill the owned files:** `.ai/project.json`, `.ai/PROJECT.md` (standing permissions, risk areas, machine notes),
   `docs/PROJECT-CONVENTIONS.md` (the project in one paragraph, domain rules).
4. **Make the gates real:** add the scripts, run `npx eslint . --suppress-all` if the code base already has
   violations (ratchet), commit the CI workflow, create the read-only CI token file named in `project.json`.
5. **Set up the two checkouts:** the coder's checkout must not have the base branch checked out
   (`git switch -c feature/T-000`); then `git worktree add ../<name>-lead main` for the lead. Run
   `node .ai/bin/ai.mjs doctor` until it is green.
6. **Write the roadmap and the first 3 tasks** (`templates/task.md`): task 1 is small and proves the whole loop
   (branch → checks → report → CI → autopilot merge). Keep 2–3 tasks written ahead (status `blocked`).
7. **Start the loop:** coder `node .ai/bin/ai.mjs run` in a terminal; lead `node .ai/bin/ai.mjs lead-auto` as a
   background command in the lead session. Watch the first two tasks closely; tune `project.json` (risk patterns,
   timeouts) and the coder settings (allowed commands) from what you see.
8. **Seed the lead's memory** with the standing decisions (merge autonomy, token efficiency, lean verification,
   language rules) — see `lessons/lead-memory-seeds.md`.
