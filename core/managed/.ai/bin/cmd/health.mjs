// `ai health [--quiet]` – coder health check for the lead's watcher. Exit 0 = healthy, 1 = issue (diagnosis on stdout).
// Looks at the runner (pid file), the current `claude -p` pass, its child processes and its log.
// The one safe repair is automatic: a pass whose log already holds its final `result` but whose process is
// still alive is held open by a background command it left behind – those children are killed.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AI, cfg } from '../lib/config.mjs';
import { descendants, killTree, processes } from '../lib/proc.mjs';
import { actionable, rows } from '../lib/state.mjs';
import { clip, lastSteps } from '../lib/view.mjs';

const LOGS = path.join(AI, 'logs');
const LAST_FILE = path.join(AI, '.health-last');
const min = (ms) => Math.round(ms / 60000);

const shown = (cmd) => clip(cmd, 160);

function latestLog() {
  try {
    const files = fs
      .readdirSync(LOGS)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ f: path.join(LOGS, f), t: fs.statSync(path.join(LOGS, f)).mtimeMs }));
    return files.sort((a, b) => b.t - a.t)[0];
  } catch {
    return undefined;
  }
}

function tail(file, bytes = 256 * 1024) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const buf = Buffer.alloc(Math.min(bytes, size));
  fs.readSync(fd, buf, 0, buf.length, size - buf.length);
  fs.closeSync(fd);
  return buf.toString('utf8');
}

function resultOf(text) {
  for (const line of text.trim().split('\n').reverse()) {
    if (!line.includes('"type":"result"')) continue;
    try {
      return JSON.parse(line);
    } catch {
      /* partial line at the tail start */
    }
  }
  return undefined;
}

/** leftover containers of merged tasks (`t012-…` for task T-012) are removed – they pile up otherwise */
function cleanContainers(notes) {
  if (!cfg.coder.cleanupContainers) return;
  try {
    const merged = new Set(rows().filter((r) => r.status === 'merged').map((r) => r.id.replace(/\D/g, '')));
    const re = new RegExp(cfg.coder.containerPattern);
    const names = execSync('docker ps -a --format "{{.Names}}"', { encoding: 'utf8', timeout: 20000 }).split(/\r?\n/).filter(Boolean);
    const stale = names.filter((n) => re.test(n) && merged.has(re.exec(n)[1].padStart(cfg.taskDigits, '0')));
    if (stale.length) {
      execSync(`docker rm -f ${stale.join(' ')}`, { timeout: 60000 });
      notes.push(`removed ${stale.length} leftover container(s) of merged tasks: ${stale.join(', ')}`);
    }
  } catch {
    /* docker not reachable – skip */
  }
}

export default function health(argv = []) {
  const now = Date.now();
  const issues = [];
  const notes = [];
  const all = processes();
  let runnerInfo;
  try {
    runnerInfo = JSON.parse(fs.readFileSync(path.join(AI, '.runner.json'), 'utf8'));
  } catch {
    /* never started */
  }
  const log = latestLog();
  const logText = log ? tail(log.f) : '';
  const result = logText ? resultOf(logText) : undefined;
  const work = actionable().map((r) => clip(r.line, 90));

  const runnerAlive = !!runnerInfo && all.some((p) => p.pid === runnerInfo.pid);
  let passProc = runnerInfo?.pass && all.find((p) => p.pid === runnerInfo.pass.pid);
  // on Windows the pass runs behind a shell wrapper; the interesting process is the one below it
  while (passProc && /^(cmd|sh|bash)(\.exe)?$/i.test(passProc.name)) {
    const kids = all.filter((c) => c.ppid === passProc.pid);
    if (kids.length !== 1) break;
    passProc = kids[0];
  }
  if (!runnerAlive) issues.push(['runner_down', 'the runner (`node .ai/bin/ai.mjs run`) is not running – start it in a terminal']);

  if (passProc) {
    const logAge = log ? now - log.t : Infinity;
    const kids = descendants(all, passProc.pid);
    if (result && logAge > cfg.coder.doneGraceMin * 60000) {
      // finished, but held open by a leftover background command → safe to kill those
      const killed = all
        .filter((c) => c.ppid === passProc.pid)
        .map((c) => `${c.pid} ${killTree(c.pid) ? '' : '(kill failed) '}${shown(c.cmd)}`);
      issues.push(['hung_after_result', `pass ${passProc.pid} finished ${min(logAge)} min ago but was still alive – killed its leftover children:\n  ${killed.join('\n  ') || '(none found)'}`]);
    } else if (!result && logAge > cfg.coder.stallMin * 60000) {
      const running = kids.map((c) => `${c.pid} ${c.name} ${min(now - c.start)} min: ${shown(c.cmd)}`);
      issues.push(['stalled', `pass ${passProc.pid}: no log event for ${min(logAge)} min. Running children:\n  ${running.join('\n  ') || '(none – waiting on the API?)'}`]);
    }
    if (now - passProc.start > (cfg.coder.passTimeoutMin / 60 - 1) * 3600000) notes.push(`pass ${passProc.pid} runs for ${min(now - passProc.start)} min (killed at ${cfg.coder.passTimeoutMin} min)`);
  }

  cleanContainers(notes);

  // idleness counts from the later of the last pass and the last lead input (a task is often released only
  // after CI on the previous one, long after that pass ended)
  const leadInput = Math.max(
    0,
    ...['tasks', 'reviews'].flatMap((d) => {
      try {
        return fs.readdirSync(path.join(AI, d)).map((f) => fs.statSync(path.join(AI, d, f)).mtimeMs);
      } catch {
        return [0];
      }
    }),
  );
  if (runnerAlive && !passProc && work.length && log && now - Math.max(log.t, leadInput) > cfg.coder.idleMin * 60000) {
    const why = result?.is_error || /API Error/.test(result?.result || '') ? `last pass ended with: ${clip(result.result, 200)}` : 'last pass ended normally';
    issues.push(['idle_with_work', `no pass for ${min(now - log.t)} min although STATE.md has work (${why}):\n  ${work.join('\n  ')}`]);
  }
  if (result?.is_error || /API Error/.test(result?.result || '')) notes.push(`last result is an error: ${clip(result.result, 200)}`);

  // each distinct issue is reported once per hour, so the lead is not woken in a loop
  const signature = issues.map((i) => i[0]).sort().join(',');
  let last = { signature: '', at: 0 };
  try {
    last = JSON.parse(fs.readFileSync(LAST_FILE, 'utf8'));
  } catch {
    /* first run */
  }
  const repeat = signature && signature === last.signature && now - last.at < 3600000 && !signature.includes('hung_after_result');
  if (!issues.length || repeat) {
    if (!argv.includes('--quiet')) console.log(`OK${repeat ? ` (known: ${signature})` : ''}${notes.length ? ` – ${notes.join('; ')}` : ''}`);
    return 0;
  }
  fs.writeFileSync(LAST_FILE, JSON.stringify({ signature, at: now }));
  console.log(`CODER HEALTH: ${signature}`);
  for (const [, text] of issues) console.log(`- ${text}`);
  for (const n of notes) console.log(`- note: ${n}`);
  if (log) console.log(`Last steps (${path.basename(log.f)}, ${min(now - log.t)} min ago):\n${lastSteps(logText).join('\n')}`);
  return 1;
}
