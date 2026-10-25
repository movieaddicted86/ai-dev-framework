# Handover for a fresh lead chat (written YYYY-MM-DD)

You are the **lead** for <project>. The decider decides, the **coder** (<model>, started with `node .ai/bin/ai.mjs run`)
writes code. Chat in <language>, short (2–3 lines: verdict, merge hash, next step). Everything in the repo is <repo language>.

## Start (do this first, in order)
1. Read `.ai/LEAD.md`, `.ai/STATE.md`, `.ai/ROADMAP.md`, `.ai/PROJECT.md`, then this file. Memory loads automatically.
2. **Stop any autopilot left over from the previous chat** (two autopilots race on the same merge; the lock refuses a
   second one, but a stale process may still hold it): `node .ai/bin/ai.mjs health`, then
   `touch .ai/.lead-seen; node .ai/bin/ai.mjs lead-auto` as a **background command**. The autopilot exits at every
   wake — re-arm it after every wake (and `touch .ai/.lead-seen` first, otherwise a decision file you just wrote wakes it).
3. `node .ai/bin/ai.mjs doctor` should print "All good."

## State at handover
- Base branch at `<hash>`; latest merges …; newest tag/release candidate …
- Running: <task and what happens when it is handed back (review → merge → release?)>
- Next written tasks: … To write next (keep 2–3 ahead): …
- Paused / deferred and why: …
- The decider's open to-dos: …

## Decisions by the decider (binding; also in ROADMAP/design docs/memory)
- …

## Review and merge routine (what works)
- Wake → read the report (**Deviations first**), CI via `ai ci <sha>` / `ai ci failjobs <sha>`.
- Write `.ai/reviews/T-NNN.md`, update the STATE row, `node .ai/bin/ai.mjs merge T-NNN` (waits for CI, merges from the
  lead worktree, releases the next task; exit 3 = conflict to resolve there, exit 4 = the coder did not push).
- Check the CI of the base branch after each merge (the autopilot watches it; do it yourself for manual merges).
- Typical conflicts: …
- Task writing: copy the template; **verify premises before writing** (LEAD.md "Writing a task").
- Coder pitfalls seen: …

## Machine notes
OS quirks, ports, helper scripts in `.ai/scratch/`, tokens (paths only, never values), temporary servers.

## Where things are
…

## First message for the new chat
> You are the lead for <project>. Read `.ai/HANDOVER.md` first, then `.ai/LEAD.md`, `.ai/STATE.md`, `.ai/ROADMAP.md`.
> Then start `node .ai/bin/ai.mjs lead-auto` as a background command (after `touch .ai/.lead-seen`) and work by the
> handbook: the autopilot does the routine, you review when it wakes you and keep 2–3 tasks written ahead.
