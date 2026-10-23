# Playbook: intake of an external review (or audit)

An independent review is the best source of blind spots (the second WebSlicer review found a bypass of our own
security fix and rated the project 6/10) — and it is a **static read by someone without the full context**, so it
contains false and half-true claims. Never turn it into tasks 1:1.

1. **Store it** verbatim in `docs/audits/` (date, author/model, commit it refers to).
2. **Verify every finding against the code** at the current base commit, ideally in parallel read-only passes.
   Record a table in `.ai/decisions/Q-NNN.md`:

   | ID | Verdict | Note with file:line evidence |
   |---|---|---|
   | S1 … | confirmed / partly / not reproducible / already fixed | exploit or defect in one sentence |

3. **Look for the worse sibling.** Re-check the review's neighbours: the lead found a critical bypass (key
   injection) next to a reported hardening issue. Ask "what else has the same shape?".
4. **Rank:** critical (RCE, auth bypass, data loss) → immediately, own task, ahead of the roadmap; high → next
   slot; medium/low → batch by theme.
5. **Group into work packages** (`docs/work-packages/WP-<id>.md`: goal, binding decisions, phases, acceptance
   criteria, files, risks) in an order that makes later packages cheaper: toolchain unblock → seams around
   external tools → splits of the largest files → bugs by class → docs diet. No new features in files that are about
   to be split.
6. **Ask the decider** only for what changes the product or the roadmap (e.g. "authentication later: the service is
   home-lab only") and record the answer and its expiry condition.
7. **Convert recurring finding classes into gates** (principles 06) so the next audit starts higher.
8. **Re-measure** against the audit baseline when the last package is merged.
