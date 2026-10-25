// `ai handback T-NNN [--skip-checks]` – the coder's last step: validates everything a hand-back needs, then sets
// the STATE row to in_review. One step instead of a list the coder can forget (the first project's returned tasks
// failed on exactly these items: unformatted files, specs pinning the old behaviour, an unpushed branch, a stale
// STATE row).
//   1. the task exists and the current branch is its branch, the work tree is clean, HEAD is pushed
//   2. the report exists, has Done / Evidence / Deviations / Notes, no template placeholders, Deviations not empty
//   3. the project's cheap checks pass (`handback.checks` in project.json)
//   4. for every `handback.pins` entry whose `when` pattern matches a changed file, the report's Evidence names the
//      spec (the coder must have run it)
// Exit 0 = handed back, 1 = something to fix (listed).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AI, ROOT, cfg } from '../lib/config.mjs';
import { git } from '../lib/merge.mjs';
import * as state from '../lib/state.mjs';

const tail = (s, n = 12) => String(s).trim().split('\n').slice(-n).join('\n');

export default function handback(argv) {
  const id = argv.find((a) => !a.startsWith('--'));
  const row = id && state.row(id);
  if (!row) {
    console.error('usage: ai handback T-NNN [--skip-checks]   (the task needs a row in STATE.md)');
    return 2;
  }
  const problems = [];
  const branch = `${cfg.branchPrefix}${id}`;

  // 1. git
  let current = '';
  try {
    current = git(ROOT, 'rev-parse', '--abbrev-ref', 'HEAD');
  } catch {
    problems.push('not a git repository');
  }
  if (current && current !== branch) problems.push(`you are on branch '${current}', the task's branch is '${branch}'`);
  else if (current) {
    // .ai/ may be tracked (--track-ai): STATE.md and the report are expected to be modified at hand-back
    const dirty = git(ROOT, 'status', '--porcelain').split('\n').filter((l) => l && !/ \.ai\//.test(l));
    if (dirty.length) problems.push(`uncommitted changes (${dirty.length}): ${dirty.slice(0, 5).join(' | ')} – commit them`);
    try {
      const head = git(ROOT, 'rev-parse', 'HEAD');
      const remote = git(ROOT, 'rev-parse', `origin/${branch}`);
      if (head !== remote) problems.push(`HEAD is not pushed – run: git push origin ${branch}`);
    } catch {
      problems.push(`branch not on origin – run: git push -u origin ${branch}`);
    }
  }

  // 2. report
  const reportPath = path.join(AI, 'reports', `${id}.md`);
  let report = '';
  if (!fs.existsSync(reportPath)) problems.push(`report missing: .ai/reports/${id}.md (template: .ai/templates/report.md)`);
  else {
    report = fs.readFileSync(reportPath, 'utf8');
    for (const s of ['Done', 'Evidence', 'Deviations', 'Notes']) if (!new RegExp(`^## ${s}\\b`, 'm').test(report)) problems.push(`report: section '## ${s}' missing`);
    if (/<title>|abc1234|T-NNN/.test(report)) problems.push('report: template placeholders left (<title>, abc1234, T-NNN)');
    // an empty or differently worded section counts as "none" for the autopilot, but the protocol wants the literal sentence
    if (/^## Deviations/m.test(report) && state.deviations(id) === 'none' && !/^## Deviations[^\n]*\n\s*None\./m.test(report)) {
      problems.push("report: write exactly 'None.' under '## Deviations' when there are none");
    }
    const evidence = /^## Evidence[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(report)?.[1] ?? '';
    if (evidence.split('\n').length > 80) problems.push(`report: Evidence has ${evidence.split('\n').length} lines – keep a ~40-line summary, raw logs go to .ai/work/${id}/`);
  }

  // 3. cheap checks
  if (!problems.length && !argv.includes('--skip-checks')) {
    for (const cmd of cfg.handback.checks) {
      const t0 = Date.now();
      try {
        execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20, timeout: 20 * 60e3 });
        console.log(`  ok    ${cmd} (${Math.round((Date.now() - t0) / 1000)} s)`);
      } catch (e) {
        problems.push(`check failed: ${cmd}\n${tail(`${e.stdout ?? ''}${e.stderr ?? ''}`)}`);
        break; // the first failure is enough to act on
      }
    }
  }

  // 4. pinning specs named in the evidence
  if (!problems.length && cfg.handback.pins.length) {
    let changed = [];
    try {
      changed = git(ROOT, 'diff', '--name-only', `origin/${cfg.baseBranch}...HEAD`).split('\n').filter(Boolean);
    } catch {
      /* no remote base: skip */
    }
    for (const pin of cfg.handback.pins) {
      const hit = changed.find((f) => new RegExp(pin.when).test(f));
      if (hit && !report.includes(pin.spec)) problems.push(`${hit} is pinned by ${pin.spec}: run it (${pin.run ?? pin.spec}) and name it in the report's Evidence`);
    }
  }

  if (problems.length) {
    console.log(`Hand-back of ${id} refused – fix and run it again:`);
    for (const p of problems) console.log(` - ${p}`);
    return 1;
  }
  const commits = (() => {
    try {
      return git(ROOT, 'rev-list', '--count', `origin/${cfg.baseBranch}..HEAD`);
    } catch {
      return '?';
    }
  })();
  state.setStatus(id, 'in_review', `handed back at \`${git(ROOT, 'rev-parse', '--short', 'HEAD')}\` (${commits} commits)`);
  console.log(`Handed back ${id}: status in_review, branch ${branch} at ${git(ROOT, 'rev-parse', '--short', 'HEAD')}. Now stop (runner mode) or start the watcher.`);
  return 0;
}
