# Playbook: rebuilding a user interface

Source: WebSlicer's "layout 3.0" (tasks T-062 … T-074: test hooks, icon system, app shell, panels, tool strip, visual
pass, navigation clean-up) — 13 tasks, all approved in one or two rounds, followed by a human acceptance test.

## 1. Design first, with the decider
- Write the target down: layout principles, a region map (what lives where), the navigation map (**one home per
  function** — no function is reachable from two competing places), the icon concept, the responsive rules.
- Build an **HTML mockup** of the key states (plate, object selected, tool open, preview, narrow window) and let the
  decider approve it. Keep it in the repo (`docs/design/`); it is the acceptance reference for every later round.
- Decide what stays out (e.g. mobile gets its own track) so the rebuild does not grow.

## 2. Make the tests independent of the markup (before touching the markup)
- Add stable hooks (`data-testid`) for the regions the specs use; add a **guard test** that fails when a spec selects a
  covered region by CSS class. Prove the change is neutral: before/after screenshots pixel-identical (T-062).
- Add structural specs for the rules: navigation entries (`navMap` + spec for no duplicates), icon table coverage,
  "every tool shows a close control".

## 3. Rebuild in layers, each a task that can be merged
1. design tokens + icon system (vendored assets guarded by a test for forbidden names — brand logos, cloud marks);
2. shell: rail, top bar, regions (no content changes yet);
3. left column, then right context panel (modes: nothing selected / object / tool), then tool strip;
4. navigation clean-up (menus, preferences, unified dialogs);
5. visual pass against the mockup, as **one task with two approved rounds** (a: structure, b: contents) judged by
   side-by-side screenshots at the mockup's window size;
6. responsive checks at 1440 / 900 / 390 px (screenshots in the report).
Behaviour-preserving steps use the evidence kit (`behaviour-preserving-refactoring.md`).

## 4. Docs ride along
Every user-visible task regenerates the documentation screenshots and updates the feature docs and the test-case list;
the main README stays short; the group ends with a release candidate and the human acceptance test
(`human-acceptance-test.md`).

## 5. Pitfalls seen
- A tool opened an empty panel because the panel kind was registered but its component was not wired.
- Two controls opened the same view ("redundancy the task removes"): one wins.
- A guard (plate/limit checks) existed in one place; the second entry point (Preview) bypassed it → principles 04.
- A hook-order bug when an early `return` came before a hook; the lint rule would have caught it as an error.
