// Live test (costs tokens, needs a logged-in `claude`): node test/live.mjs
// Installs the framework into a throwaway project, writes one tiny task and lets the REAL coder (`claude -p`, via
// `ai run`) do it; then the autopilot merges it. Run it in a terminal where `claude` works (logged in, or your
// OpenRouter/proxy environment variables set – the same terminal you start the real runner in).
// Env: LIVE_MODEL (default claude-haiku-5-5; "default" = no --model flag; or your coder model id), LIVE_KEEP=1 keeps the sandbox.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FW = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MODEL = process.env.LIVE_MODEL || 'claude-haiku-5-5';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aidev-live-'));
const origin = path.join(tmp, 'origin.git');
const proj = path.join(tmp, 'proj');
const lead = path.join(tmp, 'proj-lead');
const CLI = path.join(proj, '.ai', 'bin', 'ai.mjs');
let failed = 0;
const ok = (c, n, d = '') => (console.log(`${c ? '  ok  ' : ' FAIL '} ${n}${c ? '' : `  ${d}`}`), c || failed++);
const sh = (cmd, args, cwd) => {
  try {
    return { code: 0, out: execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
  }
};
const git = (cwd, ...a) => sh('git', a, cwd);

function until(args, re, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI, ...args], { cwd: proj, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const finish = (matched) => {
      clearTimeout(timer);
      child.kill();
      if (process.platform === 'win32' && child.pid) sh('taskkill', ['/PID', String(child.pid), '/T', '/F']);
      resolve({ matched, out });
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    for (const s of [child.stdout, child.stderr]) s.on('data', (d) => ((out += d), re.test(out) && finish(true)));
    child.on('exit', () => finish(re.test(out)));
  });
}

try {
  console.log(`live test in ${tmp} (model ${MODEL})`);
  sh('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  fs.mkdirSync(proj);
  git(proj, 'init', '-q', '-b', 'main');
  git(proj, 'config', 'user.email', 'live@example.com');
  git(proj, 'config', 'user.name', 'Live Test');
  fs.writeFileSync(path.join(proj, 'package.json'), JSON.stringify({ name: 'sandbox', private: true, type: 'module', scripts: { test: 'node --test' } }, null, 2));
  fs.writeFileSync(path.join(proj, 'README.md'), '# sandbox\n');
  git(proj, 'add', '.');
  git(proj, 'commit', '-q', '-m', 'Initial commit');
  git(proj, 'remote', 'add', 'origin', origin);
  git(proj, 'push', '-q', 'origin', 'main');

  ok(sh('node', [path.join(FW, 'bootstrap.mjs'), 'init', proj, '--name', 'sandbox', '--repo', 'o/sandbox']).code === 0, 'bootstrap init');
  git(proj, 'add', '-A'); // the installed files belong to the project: hand-back needs a clean tree
  git(proj, 'commit', '-q', '-m', 'Install ai-dev-framework');
  git(proj, 'push', '-q', 'origin', 'main');
  const pjPath = path.join(proj, '.ai', 'project.json');
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  Object.assign(pj, { leadWorktree: lead, ci: { provider: 'none' }, coder: { args: MODEL === 'default' ? [] : ['--model', MODEL], passTimeoutMin: 15 }, lead: { pollSec: 2, healthEveryMin: 999 }, handback: { checks: ['npm test'], pins: [] } });
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));
  const projectMd = path.join(proj, '.ai', 'PROJECT.md');
  fs.writeFileSync(projectMd, fs.readFileSync(projectMd, 'utf8').replace(/## Standard checks[\s\S]*?(?=\n## )/, '## Standard checks\n- `npm test`\n'));

  git(proj, 'switch', '-q', '-c', 'feature/T-000');
  git(proj, 'worktree', 'add', '-q', lead, 'main');
  git(lead, 'config', 'user.email', 'lead@example.com');
  git(lead, 'config', 'user.name', 'Lead');
  const doc = sh('node', [CLI, 'doctor'], proj);
  ok(doc.code === 0, 'doctor is green', doc.out);

  fs.writeFileSync(
    path.join(proj, '.ai', 'tasks', 'T-001.md'),
    `# T-001 – greet function

| | |
|---|---|
| Base branch | \`main\` |
| Work branch | \`feature/T-001\` |
| Size | one sitting |

## Goal
A tiny module that greets people.

## Binding decisions
- Plain ES modules, no dependencies, tests with \`node:test\`.

## Acceptance criteria
- AC-1: \`greet.mjs\` exports \`greet(name)\` returning \`Hello, <name>!\`.
- AC-2: \`greet()\` with an empty or missing name returns \`Hello, world!\`.
- AC-3: \`greet.test.mjs\` covers AC-1 and AC-2 and \`npm test\` passes.

## Checks (all required before hand-back)
- [ ] \`npm test\`

## Out of scope
Everything else.

## Hand-back
Report in \`.ai/reports/T-001.md\`, status \`in_review\` in \`.ai/STATE.md\`.
`,
  );
  fs.appendFileSync(path.join(proj, '.ai', 'STATE.md'), '| T-001 | greet function | open | `feature/T-001` | released |\n');
  process.env.POLL_SEC = '2';

  const started = Date.now();
  const pass = await until(['run'], /pass finished/, 16 * 60e3);
  console.log(`\n--- runner output (${Math.round((Date.now() - started) / 1000)} s) ---\n${pass.out}\n--- end ---\n`);
  ok(pass.matched, 'real coder pass finished');

  const state = fs.readFileSync(path.join(proj, '.ai', 'STATE.md'), 'utf8');
  ok(/\| T-001 \| greet function \| in_review \|/.test(state), 'STATE is in_review', state);
  const rep = path.join(proj, '.ai', 'reports', 'T-001.md');
  ok(fs.existsSync(rep), 'report written');
  if (fs.existsSync(rep)) console.log(`--- report ---\n${fs.readFileSync(rep, 'utf8')}\n--- end ---`);
  ok(git(origin, 'branch', '--list', 'feature/T-001').out.includes('feature/T-001'), 'branch pushed to origin');
  ok(sh('node', [CLI, 'task', 'deviations', 'T-001'], proj).out === 'none', 'deviations: none');
  console.log(`--- coder branch ---\n${git(origin, 'log', '--oneline', 'feature/T-001').out}\n${git(origin, 'ls-tree', '-r', '--name-only', 'feature/T-001').out}`);
  console.log(`--- health ---\n${sh('node', [CLI, 'health'], proj).out}`);

  const merged = await until(['lead-auto'], /auto: merged T-001|LEAD WAKE/, 120e3);
  console.log(merged.out);
  ok(/auto: merged T-001/.test(merged.out) || /no written next task/.test(merged.out), 'autopilot merged T-001', merged.out);
  ok(fs.existsSync(path.join(lead, 'greet.mjs')), 'greet.mjs is on main in the lead worktree');
  const t = sh('npm', ['test'], lead);
  ok(t.code === 0, 'npm test passes on main after the merge', t.out.slice(-400));
} catch (e) {
  console.error(e);
  failed++;
} finally {
  if (process.env.LIVE_KEEP || failed) console.log(`sandbox kept: ${tmp}`);
  else fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nlive test passed');
process.exit(failed ? 1 : 0);
