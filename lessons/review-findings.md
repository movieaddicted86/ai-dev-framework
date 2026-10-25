# Review findings: statistics and taxonomy (WebSlicer, T-001…T-047)

Base: 72 tasks reviewed (up to T-074). **57 approved in round 1** (79 %); 15 returned (T-001, T-015, T-026, T-030, T-031 ×2,
T-033, T-038, T-040, T-042, T-044, T-049, T-057 ×2, T-059, T-069, T-073). 7 routine tasks were merged by the autopilot. 12 refactoring tasks (R-1…R-12) were all approved in round 1.

## Why tasks came back

| Cause | Tasks | Could a cheap check have caught it? | Resulting rule |
|---|---|---|---|
| **CI red for something a local fast check shows**: Prettier (`format:check`) failed | T-038 | yes, `npm run format:check` | fast set always includes lint + format |
| **A spec/test pinned old or structural behaviour** (`POST /export/3mf {}` → 500; toolbar count + label list ×2) | T-038, T-042, T-044 | yes, run the one pinning spec | "change a pinned structure → run its spec" + a table of pinning specs in the project conventions |
| **Flaky/racy test red in CI** (`jobs.cancel.test.ts` B6 twice; event-loop timing) | T-040, T-042 | partly: loop the file 50× | reproduce, do not re-run; prefer relative timing checks |
| **Incomplete move**: duplicate suites left, server test importing web source | T-015 | yes, grep for the old copies | refactoring evidence kit (grep for old names, 0 hits) |
| **Wrong maths**: a "fix" gave a different matrix for non-uniform mirrors | T-001 | yes, roundtrip test | roundtrip tests with awkward input; lead recomputes |
| **Domain rule too loose**: sibling presets treated as the same machine | T-026 | only with the right test cases | pins for same / derived / sibling / unrelated |
| **Event-loop blocking sync I/O in a request path**, then a `done`-before-`info` race | T-031 ×2 | review (design), then a pin | async-fs rule, derived-data-before-state rule |
| **Safety of the test suite itself** (would run against a real instance) + CI too slow (26–29 min) + no failure-artifact proof | T-030 | review | destructive-suite guard, sharding by measured time |
| **Round 2 of an interlocking change** (merged with T-034) | T-033 | n/a | — |
| **The same cheap failure again after the rule existed**: format check, a spec still pinning the old preflight version, tests expecting removed UI | T-049, T-059, T-069 | yes — which is why the rule became a command (`ai handback`) | L28 |
| **Closing a bypass broke the specs that used it**, and exposed a product question | T-073 | partly: grep for users of the bypass | L29 |
| **Unreachable target / self-contradicting ACs** (≤ 8 min CI; "three green runs" vs. cancel-stale), plus a write call used as a probe that cancelled a run | T-057 (3 rounds; accepted at 12.7 min) | yes, a capacity estimate before writing the AC | targets from measurements, ACs consistent, CI read-only for the coder (L21–L23) |

**Takeaway:** 5 of the 10 returns were avoidable by running one more *cheap* local check. The remaining 5 were
genuine design/correctness findings that only a reviewer's independent thinking found — which is what the lead is for.

## Severity and categories of the findings that were written down

Rough counts, read from the review texts (not a database export):

| Category | Count (rough) | Typical content |
|---|---|---|
| Behaviour pinned elsewhere (specs, docs) | 4 | forgot to update the spec that pins the changed structure |
| Correctness / maths | 3 | decompose, lineage compare, race |
| Performance / event loop | 2 | sync I/O, O(n²) sort comparator |
| Process hygiene | 6 | STATE not updated, scratch in `.ai/`, order of capture, commit granularity, leftover servers/worktrees |
| Safety of tooling | 1 | E2E suite default target = real instance |
| Nits (naming, later task) | 4 | seams per block, comparator precompute |

## Deviations: what coders legitimately reported (patterns)

1. **The task text was wrong or contradictory** (T-031, T-043, T-045, T-004, T-044) → the coder's duty to stop and
   record it works; the fix is on the lead's side: verify facts, make ACs discriminating.
2. **A compile-unit that cannot be split** (T-012, T-023) → one commit, with the reason.
3. **A scope extension that is "same rule, second place"** (T-024, T-025) → accepted, as its own commit.
4. **A tooling gap** (no madge, no DOM test runner) → a small local substitute (`scripts/cycles.ts`), documented;
   later replaced by the real tool (`.madgerc`, T-029) when a dependency decision was made.
5. **A purposeful deviation from the task for a better product** (T-003 in-dialog name field, T-008 text buttons)
   → accepted by the lead when justified; this is why the lead reads every deviation.

## Signals that predicted a good pass

- The task named binding decisions, ACs that can fail, the exact checks, and what is out of scope.
- The coder pinned the old behaviour first and showed the pin bites.
- The report numbers were reproducible (counts, byte sizes, diff counts), not adjectives.
- The change was mechanically verifiable (normalised diff, golden capture).

## Signals that predicted a return

- "Evidence plausible and consistent" but no independent check of the maths.
- A hand-back with CI still running or red, or without having run the one pinning spec.
- A new shared structure (toolbar, store key list, status list) with no search for what pins its old shape.
- A fix to a race described as "a test race" without a reproduction loop.
