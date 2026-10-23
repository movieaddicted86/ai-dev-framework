# Manifest

A way of building software with AI agents that stays fast, cheap, reviewable and safe. These are the
commitments; the rest of the repository implements them.

## 1. People decide, agents execute
A human (the **decider**) owns product, priorities and anything irreversible. A strong model (the **lead**)
plans, writes tasks, reviews and merges. A cheaper model (the **coder**) implements one task at a time.
Standing permissions are explicit and written down (`PROJECT.md`), never assumed.

## 2. Files are the interface
Agents communicate only through files and git: task, report, review, decision, `STATE.md`. Nothing important
lives in a chat window or a model's context. Any agent can be restarted at any time and continue from the files.

## 3. One task, one fresh context
A task fits one sitting. Each coder pass starts with an empty context window, reads the protocol, the state and
its task, does the work and hands back. Long sessions rot; small tasks do not.

## 4. Honest hand-backs
A report states evidence, not claims. *Deviations* holds only real deviations from binding decisions —
`None.` means none. The autopilot trusts that sentence, so it is never decorated.

## 5. Gates over promises
A rule that is not checked by a tool is a wish. Quality rules are CI gates (types, lint, size and complexity
limits, boundaries, cycles, tests, audit); the review spends its time on design and risk. A repeated defect
becomes a mechanical rule, not a longer document.

## 6. Autonomy proportional to risk
Routine, green, deviation-free tasks are merged automatically. High-risk work — security, authentication, data
migrations, build and CI configuration, large structural refactors — always gets the lead's eyes, whatever CI says.

## 7. Cheap verification, early
Fast checks run locally; the expensive suite runs in CI; nobody waits for CI; nobody repeats a green run as proof.
Time is spent on thinking, not on waiting.

## 8. Boring technology, deliberate novelty
Established tools by default. New ones enter through the radar (Assess → Trial → Adopt), in one task, with a
decision record and a way back. Dependencies are updated in small grouped steps; majors are tasks of their own.

## 9. Small, replaceable parts
Pure core, thin shell. One source of truth. Layers that only point downwards. Third-party libraries behind
adapters. A newcomer — human or model — finds things by folder name.

## 10. Learn in the open
Every incident, review finding and wasted hour is turned into a rule, a check or a playbook entry
(`lessons/`). The framework is versioned, projects can upgrade, and improvements flow back.
