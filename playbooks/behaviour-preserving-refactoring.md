# Playbook: behaviour-preserving refactoring (the evidence kit)

Twelve refactoring tasks in the first project — shared package, store slices, a 1384-line viewer split into 13
modules, a services layer, Express 5 — were approved in round 1 because each came with **mechanical proof** that
nothing changed. Use the kit that fits the change; the task lists which ones are required.

## 0. Order (part of the task, not a suggestion)

1. **Baseline first.** Capture the evidence from the base branch *before the first move* (T-018 captured it after
   the moves and was only accepted because `main` had not changed).
2. **Pin.** Write characterisation tests for what will move; show that a pin bites (break the code, see it fail).
3. **Move in small commits**, one concern each. If the compiler forbids a split (a type moved across three
   packages), one commit is fine — say why in the report.
4. **Delete the old copy in the commit that creates the new one**; grep for the old name afterwards: 0 hits.
5. **Compare** with the baseline; report numbers (file sizes before/after, counts of diffs).

## 1. Kit

| Change | Evidence | Example |
|---|---|---|
| Moved code | normalised diff: strip comments/blank/import lines and `export`, sort lines, diff old vs. new → 0 added/removed except wrapped imports | T-028: layout 0/0, schema 0/0, threemf 0+4 (all import continuations) |
| Server routes / services | HTTP smoke against `main` and the branch with identical data dirs: status, body, headers per exchange → 0 diff | T-021…T-023: 154 exchanges |
| RPC/MCP tools | `tools/list` and per-tool schemas dumped before/after → 0 diff (or an explained list) | T-022, T-023 |
| Store / state | all keys and values of the state object before/after (order of keys may differ) | T-016: 112 keys, 1051 values identical |
| UI | scripted browser run: console checks (hundreds) + screenshots per state; pixel diff against `main` (known timing differences listed) | T-017: 2055 captures identical; T-018: 46/46 pixel-identical |
| Rendering resources | counts of geometries/materials/textures after each scripted scenario → same pattern | T-017 |
| Dependencies | lockfile diff reviewed package by package: hoisting, removed leftovers, added transitive packages, nothing unrelated | T-027 |
| Types moved | `grep` for each moved declaration: exactly one; tsc green on all packages | T-012, T-014 |
| Dependency graph | cycle check script/`madge` before/after: no new cycle; the old one gone | T-021, T-029 |
| Performance claims | timings before/after on a stated input (size, count) | T-004: 314 k segments in 574 ms |

## 2. Report numbers (every refactoring hand-back)

File sizes (bytes/lines) of every file the package splits, before and after; the largest resulting module; number
of tests before/after (union of the deleted suites must be covered by the new ones — T-015 round 1 failed this).

## 3. Review (lead)

- Recompute one number independently (the move check, a count).
- Look at the diff of the *consumers* (components, routes): should be imports only.
- Accept explained deviations (e.g. a factory instead of a hook for handler-order reasons), reject unexplained ones.
- High-risk refactors (stores, viewers, routers, build tools) are never auto-merged.
