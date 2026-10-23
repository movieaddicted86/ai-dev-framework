// Smoke test: node test/smoke.mjs
// Installs the framework into a temporary project (bare "origin", coder checkout, lead worktree), then runs the
// runner with a fake coder, the autopilot (dry run, real merge, deviation wake), the health check and an upgrade.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FW = path.dirname(HERE);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aidev-'));
const origin = path.join(tmp, 'origin.git');
const proj = path.join(tmp, 'proj');
const lead = path.join(tmp, 'proj-lead');
const CLI = path.join(proj, '.ai', 'bin', 'ai.mjs');

let failed = 0;
const ok = (cond, name, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) failed++;
};
const run = (cmd, args, opts = {}) => {
  try {
    return { code: 0, out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim() };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
  }
};
const git = (cwd, ...a) => run('git', a, { cwd });
const ai = (...a) => run('node', [CLI, ...a], { cwd: proj, env: { ...process.env, DRY_RUN: '' } });
const state = () => fs.readFileSync(path.join(proj, '.ai', 'STATE.md'), 'utf8');

/** run a long-lived CLI command until its output matches, then kill it */
function until(args, re, { timeoutMs = 60000, env = {} } = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI, ...args], { cwd: proj, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const finish = (matched) => {
      clearTimeout(timer);
      child.kill();
      if (process.platform === 'win32' && child.pid) run('taskkill', ['/PID', String(child.pid), '/T', '/F']);
      resolve({ matched, out });
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    for (const s of [child.stdout, child.stderr]) s.on('data', (d) => ((out += d), re.test(out) && finish(true)));
    child.on('exit', () => finish(re.test(out)));
  });
}

const task = (id, title, status, note = '') => {
  fs.appendFileSync(path.join(proj, '.ai', 'STATE.md'), `| ${id} | ${title} | ${status} | \`feature/${id}\` | ${note} |\n`);
  fs.writeFileSync(path.join(proj, '.ai', 'tasks', `${id}.md`), `# ${id} – ${title}\n\n| | |\n|---|---|\n| Base branch | \`main\` |\n`);
};

try {
  console.log(`smoke test in ${tmp}`);
  // --- project with a bare origin
  run('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  fs.mkdirSync(proj);
  git(proj, 'init', '-q', '-b', 'main');
  git(proj, 'config', 'user.email', 'test@example.com');
  git(proj, 'config', 'user.name', 'Test');
  fs.writeFileSync(path.join(proj, 'README.md'), '# demo\n');
  git(proj, 'add', '.');
  git(proj, 'commit', '-q', '-m', 'Initial commit');
  git(proj, 'remote', 'add', 'origin', origin);
  git(proj, 'push', '-q', 'origin', 'main');

  // --- init
  const init = run('node', [path.join(FW, 'bootstrap.mjs'), 'init', proj, '--name', 'demo', '--repo', 'o/demo']);
  ok(init.code === 0, 'bootstrap init', init.out);
  for (const f of ['.ai/PROTOCOL.md', '.ai/bin/ai.mjs', '.ai/STATE.md', '.ai/project.json', 'docs/CONVENTIONS.md', 'docs/principles/01-architecture.md', 'eslint.base.mjs', 'eslint.config.mjs', '.github/workflows/ci.yml'])
    ok(fs.existsSync(path.join(proj, f)), `installed ${f}`);
  ok(!/\{\{name\}\}/.test(fs.readFileSync(path.join(proj, '.ai', 'project.json'), 'utf8')), 'placeholders filled');
  ok(/\$\{\{ github\.ref \}\}/.test(fs.readFileSync(path.join(proj, '.github', 'workflows', 'ci.yml'), 'utf8')), 'GitHub expressions untouched');
  const settings = JSON.parse(fs.readFileSync(path.join(proj, '.ai', 'coder-settings.json'), 'utf8'));
  ok(settings.permissions.allow.includes('Bash(npm run:*)') && settings.permissions.deny.includes('AskUserQuestion'), 'coder settings merged with the profile');

  // --- project overrides for the test: no real CI, fake coder, fast polling
  const pj = JSON.parse(fs.readFileSync(path.join(proj, '.ai', 'project.json'), 'utf8'));
  Object.assign(pj, { leadWorktree: lead, ci: { provider: 'none' }, coder: { command: 'node', args: [path.join(HERE, 'fake-coder.mjs')] }, lead: { pollSec: 1, healthEveryMin: 999 } });
  fs.writeFileSync(path.join(proj, '.ai', 'project.json'), JSON.stringify(pj, null, 2));
  process.env.POLL_SEC = '1';

  // --- doctor (the coder checkout must leave main for the lead worktree)
  git(proj, 'switch', '-q', '-c', 'feature/T-000');
  git(proj, 'worktree', 'add', '-q', lead, 'main');
  git(lead, 'config', 'user.email', 'lead@example.com');
  git(lead, 'config', 'user.name', 'Lead');
  const doc = ai('doctor');
  ok(doc.code === 0, 'doctor is green', doc.out);

  // --- tasks and state helpers
  task('T-001', 'First task', 'open');
  task('T-002', 'Second task', 'blocked', 'written ahead');
  task('T-003', 'SEC-9 harden the thing', 'blocked');
  ok(ai('task', 'title', 'T-001').out === 'First task', 'task title');
  ok(ai('task', 'risky', 'T-003').out === 'yes' && ai('task', 'risky', 'T-001').out === 'no', 'risk detection by title');
  ok(ai('task', 'next').out === 'T-002', 'next blocked task');

  // --- runner with the fake coder
  const pass = await until(['run'], /pass finished/, { env: { POLL_SEC: '1' } });
  ok(pass.matched, 'runner completes a pass', pass.out);
  ok(/\| T-001 \| First task \| in_review \|/.test(state()), 'coder handed back (in_review)');
  ok(fs.existsSync(path.join(proj, '.ai', 'logs')) && fs.readdirSync(path.join(proj, '.ai', 'logs')).some((f) => f.endsWith('.jsonl')), 'runner wrote a log');
  ok(ai('task', 'deviations', 'T-001').out === 'none', 'deviations: none');
  ok(ai('task', 'pending').out === 'T-001', 'report is pending for the lead');

  // --- autopilot: dry run, then a real merge
  const dry = run('node', [CLI, 'lead-auto'], { cwd: proj, env: { ...process.env, DRY_RUN: '1' } });
  ok(/DRY: would merge T-001/.test(dry.out), 'autopilot dry run', dry.out);
  const merged = await until(['lead-auto'], /auto: merged T-001 as \w+, released T-002/);
  ok(merged.matched, 'autopilot merges T-001 and releases T-002', merged.out);
  ok(/\| T-001 \| First task \| merged \|/.test(state()) && /\| T-002 \| Second task \| open \|/.test(state()), 'STATE updated by the autopilot');
  ok(git(origin, 'log', '--oneline', 'main').out.includes('Merge T-001: First task'), 'merge commit pushed to origin/main');
  ok(fs.existsSync(path.join(lead, 'T-001.txt')), 'lead worktree contains the merged work');

  // --- a report with deviations wakes the lead instead of merging
  const dev = await until(['run'], /pass finished/, { env: { POLL_SEC: '1', FAKE_DEVIATIONS: '1' } });
  ok(dev.matched && /\| T-002 \| Second task \| in_review \|/.test(state()), 'second pass hands back with deviations', dev.out);
  const wake = await until(['lead-auto'], /LEAD WAKE: .*deviations/);
  ok(wake.matched, 'autopilot wakes the lead on deviations', wake.out);
  ok(/\| T-002 \| Second task \| in_review \|/.test(state()), 'T-002 was not merged');

  // --- health: no runner is running any more
  const h = ai('health');
  ok(h.code === 1 && /runner_down/.test(h.out), 'health reports a dead runner', h.out);

  // --- upgrade: untouched file updates silently, locally changed file conflicts
  // PROTOCOL.md: "installed by an older framework version" (local == lock, framework differs) → silent update
  const lockPath = path.join(proj, '.ai', 'framework.lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const protocol = path.join(proj, '.ai', 'PROTOCOL.md');
  fs.appendFileSync(protocol, '\nold framework text\n');
  lock.files['.ai/PROTOCOL.md'] = createHash('sha256').update(fs.readFileSync(protocol)).digest('hex');
  fs.writeFileSync(lockPath, JSON.stringify(lock));
  // radar.md: changed locally, lock still has the installed hash → conflict
  fs.appendFileSync(path.join(proj, 'docs', 'radar.md'), '\nproject edit\n');
  const up = run('node', [path.join(FW, 'bootstrap.mjs'), 'upgrade', proj]);
  ok(up.code === 0 && /updated\s+\.ai\/PROTOCOL\.md/.test(up.out) && !fs.readFileSync(protocol, 'utf8').includes('old framework text'), 'upgrade silently updates an untouched managed file', up.out);
  ok(/CONFLICT\s+docs\/radar\.md/.test(up.out) && fs.existsSync(path.join(proj, 'docs', 'radar.md.framework-new')), 'upgrade keeps a locally changed file and writes .framework-new', up.out);
} catch (e) {
  console.error(e);
  failed++;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
