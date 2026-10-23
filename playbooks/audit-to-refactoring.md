# Playbook: audit → work packages → ordered refactoring

Use at project start (baseline), before a big feature wave, and every few months. It replaces the large
"refactoring waves" that happen when nobody looks.

1. **Measure** (a task for the coder, report only, no code changes): file sizes (top 20), function length and
   complexity (ESLint report), import cycles (`madge`), duplicate code (`jscpd`), dependencies out of date
   (`npm outdated`), test coverage of the pure core, sync I/O in request paths, `any`/`!` counts. Output:
   `docs/audits/AUDIT-<date>.md` with numbers, not opinions.
2. **Independent review** (a different model or a human) of architecture and risks. Findings get ids
   (F-nn quality, S-nn security, B-nn bugs, W-nn maintenance).
3. **Group into work packages** `docs/work-packages/WP-<id>.md`: one theme, 1–3 tasks of "one sitting" each,
   acceptance criteria, risks. Typical themes: toolchain unblock, one seam for each external integration,
   split the god-router / god-store, bugs by class (data loss, resources), security hardening, docs diet.
4. **Order by risk and dependency:** toolchain and pure moves first (they make everything else cheaper);
   store/viewer/router splits last and marked high-risk (never auto-merged); no new features in files that
   are about to be split.
5. **Pin before moving:** each package starts with characterisation tests (or a task of its own).
6. **Turn findings into rules:** for every finding class, add the mechanical check (principles 06) so the audit
   does not need to find it again. Record the new gate in the changelog of the project.
7. **Re-measure** at the end; compare with the baseline in the audit file.
