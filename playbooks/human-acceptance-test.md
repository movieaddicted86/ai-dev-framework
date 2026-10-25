# Playbook: human acceptance test after a UI group

Why: coder and lead test a UI the way language models do — through the DOM, selectors and scripted state. After the
layout rebuild of the first project (rc.5) the decider clicked through the deployed build for one afternoon and found
what 70 reviewed tasks had not: an empty context panel with a tool open, a Preview that bypassed the plate checks, a
close button nobody recognised, settings nobody could find, a vendor list that read like a downgrade. Plan this test;
do not wait for the decider to stumble over it.

## 1. When
After every group of user-visible tasks, once its release candidate is tagged and the build is deployable. Development
of new features pauses (set the remaining feature tasks `paused` in STATE.md); bug-fix tasks for findings continue.
Tell the decider when the candidate is ready (push notification / chat).

## 2. Prepare (lead, while the last task of the group is merged)
- A **checklist** with stable ids per area (`A-01 …` first start, `B-…` plate/objects, `C-…` slicing/preview, `D-…`
  presets/printers, `E-…` library/send, `F-…` keyboard/responsive, `Z-…` free exploration). Generate it as a single HTML
  page (checkboxes, one line per check, expected result) in `.ai/scratch/`; every check is something a human sees.
- The deployable build (image tag / URL) and the data to use (fixture projects, sample files).
- `.ai/FINDINGS.md`: the one list, empty table with columns ID · Severity · Finding · Lead's reading · Status.

## 3. Run (decider)
Findings arrive in chat as `<test-id>: <what happened>`; "OK" lines are collected too. The lead records each in
`FINDINGS.md` immediately, adds **its own reading** (cause in the code, by-design or defect, the proposal) and marks
questions that are product decisions.

## 4. Triage (together, after the decider says the test is done)
- Severity: *störend/annoying* (fix next), *Idee/idea* (backlog, may become a task), *bug* (fix first).
- Group small findings into tasks of one sitting; give each finding the task id that will handle it (`new → triaged →
  done`). A finding that raises a product question is answered by the decider before the task is written.
- Findings that reveal a **missing mechanical check** also produce a gate/spec (a spec that opens every tool and asserts
  a visible close control, a spec that tries to slice from the Preview with a blocked plate).
- Un-pause on the decider's word.

## 5. After
Update the checklist with the checks that found something, so the next group starts with them. Mine the findings for
rules (principles 06, rule 4): an empty-state check, a "every guard also covers the second entry point" check.
