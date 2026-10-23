# Playbook: making CI (especially E2E) fast

Source: WebSlicer T-057 (24 → 12.7 min, same 117 tests and 793 assertions, three review rounds) and T-030
(sharding). Use it when the full CI run is the bottleneck of the loop — the lead and the autopilot wait for it.

## 1. Measure before you set a target

1. Per job and step timings of the last green `main` runs (API: `/actions/runs/<id>/jobs`, steps have timestamps).
2. Per test file times (Playwright JSON reporter) → total test time **T**, longest file **L**.
3. Fixed cost per shard **F** (checkout + install + image load + app start, ~3 min in the case study) and the
   serial chain before the shards (`changes` → `build` → shard).
4. Capacity bound: wall ≥ F + chain + max(L, T / (shards × effective speedup)). With two workers the effective
   speedup was only ~1.3–1.9×, not 2×.
5. Write the target as a range with a fallback ("≤ 10 min; if the ceiling is 12, take it and list the levers").
   The coder reports the ceiling and the levers when the target is out of reach; the decider decides.

## 2. Levers, in the order that paid off

| Lever | Effect in the case study | Notes |
|---|---|---|
| Official Playwright container (`mcr.microsoft.com/playwright:vX.Y.Z`) | removed a browser install that took 11 s warm and **12 min cold** | run with `--ipc=host` (64 MB `/dev/shm` crashes several Chromium instances); tag derived from `package.json` *after* `npm ci`, or checked against it; Dependabot `playwright` group bumps package and tag together |
| Build the app image once; shards `--load` from the cache | 76–141 s per shard saved | one job owns the cache scope (`cache-to`), shards only `cache-from`; a `docker save` artifact was ~430 MB per shard, worse |
| One expensive setup per spec file, memoised per worker | the heaviest files from ~5 min toward ~3 | a fast profile where the assertion does not depend on quality; **never remove or weaken an assertion** — report test and assertion counts before/after |
| Two workers per shard | ~1.3–1.9× per shard | only after isolating tests: fresh browser context per test, per-context session/autosave id, a `server-state` lock for tests that mutate shared server state |
| Weighted shards | 3 shards equal (10.9 / 21.5 / 7.7 min of tests) → four weighted (10.9 / 12.0 / 9.6 / 7.7) | see 3. |
| Cancel stale runs | frees runners | `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: ${{ github.ref != 'refs/heads/main' }} }` — never cancel the base branch; cancelled runs do not count as green |
| Skip E2E for docs-only pushes | whole job | `changes` job diff on `*.md`, `docs/`, `LICENSE`; unknown base → run all |

Not done yet (levers left): five shards (~10.4 min), a larger runner, running only changed specs on feature
branches, splitting stateful files into read-only and stateful parts.

## 3. Sharding rules for Playwright

- Shards are **contiguous file groups**; `PWTEST_SHARD_WEIGHTS` (undocumented) only moves the boundaries. Quote it
  in YAML (`'33:23:32:29'`; unquoted it is a sexagesimal integer to YAML 1.1). If the variable is ever dropped the
  split falls back to equal test counts — still correct, less balanced.
- A `lock` attaches to the whole file group: **two locked files in one shard run one after the other**. Keep one
  expensive locked file per shard (a locked 3-second file does not matter).
- After every Playwright bump re-check the assignment: `for i in 1 2 3 4; do npx playwright test --list --shard=$i/4; done`
  with the same env as CI (otherwise skipped tests shift the counts).
- Upload one report per shard (`playwright-report-shard-<index>`); a failure artifact is shown once on a throwaway
  branch when the pipeline is first built.

## 4. Task-writing rules for a CI-speed task

- The task is the one case where the coder may wait for CI — say so by name (the verification budget otherwise
  forbids it).
- ACs must not contradict the measures (cancelling stale runs makes "three consecutive green runs" unreachable
  when pushes follow each other).
- The coder must not call write endpoints of the CI API (re-run, cancel) to "test" something; use the lead's
  read-only token for reading and push commits for everything else.
