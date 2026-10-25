// `ai run` – the coder runner (PROTOCOL.md, "Runner mode"): one fresh, non-interactive `claude -p` per pass, so
// every task starts with an empty context window – the state lives in STATE.md, the task, the report and git.
// Run it in a terminal instead of an interactive `claude`; Ctrl+C stops it.
// Console: one line per step. Full stream: .ai/logs/coder-*.jsonl (newest `coder.keepLogs` kept).
// The pid file .ai/.runner.json tells the health check which processes belong to the runner.
// Extra CLI flags (for example a model) via CODER_ARGS="--model …".
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { AI, ROOT, cfg } from '../lib/config.mjs';
import { acquireLock } from '../lib/lock.mjs';
import { killTree } from '../lib/proc.mjs';
import { actionable } from '../lib/state.mjs';
import { renderLine } from '../lib/view.mjs';
import wait from './wait.mjs';

const LOGS = path.join(AI, 'logs');
const PIDFILE = path.join(AI, '.runner.json');
const cli = 'node .ai/bin/ai.mjs';

const PROMPT =
  `You are the coder (see CLAUDE.local.md). Runner mode: read .ai/PROTOCOL.md and .ai/STATE.md, then run ONE pass of ` +
  `the coder loop (steps 1-5) for the task it picks. Do not start \`${cli} wait\` and never ask questions - the runner ` +
  `restarts you with a fresh context for the next input. Before you end, stop every background command, server, ` +
  `container or wait loop you started (the pass cannot exit while one is still running). Before you take a task, ` +
  `check whether another coder pass (a newer claude process, a fresher .ai/logs file) is already working on it; if ` +
  `so end with "nothing to do". Finish the hand-back with \`${cli} handback T-NNN\` (it checks branch, report and the ` +
  `project's cheap checks and sets in_review; fix what it lists and run it again). End when it printed "Handed back" ` +
  `or when there is nothing to do.`;

const savePid = (pass) => fs.writeFileSync(PIDFILE, JSON.stringify({ pid: process.pid, pass, at: Date.now() }));

function pruneLogs() {
  const logs = fs
    .readdirSync(LOGS)
    .filter((f) => /^coder-.*\.jsonl$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(LOGS, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const l of logs.slice(Math.max(cfg.coder.keepLogs - 1, 0))) fs.rmSync(path.join(LOGS, l.f), { force: true });
}

function pass() {
  pruneLogs();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const log = path.join(LOGS, `coder-${stamp}.jsonl`);
  console.log(`[runner] ${new Date().toLocaleString()} fresh coder pass, log: ${path.relative(ROOT, log)}`);
  const args = [
    ...cfg.coder.args,
    '-p',
    '--settings', cfg.coder.settings,
    '--permission-mode', cfg.coder.permissionMode,
    '--output-format', 'stream-json',
    '--verbose',
    ...(process.env.CODER_ARGS ? process.env.CODER_ARGS.split(/\s+/).filter(Boolean) : []),
  ];
  return new Promise((resolve) => {
    // the prompt goes through stdin: no shell quoting problems on any platform
    const child = spawn(cfg.coder.command, args, { cwd: ROOT, shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'inherit'] });
    savePid({ pid: child.pid, log: path.basename(log), start: Date.now() });
    const out = fs.createWriteStream(log);
    let timedOut = false;
    const timer = setTimeout(() => ((timedOut = true), killTree(child.pid)), cfg.coder.passTimeoutMin * 60e3);
    child.on('error', (e) => console.log(`[runner] cannot start '${cfg.coder.command}': ${e.message}`));
    child.stdin.end(PROMPT);
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      out.write(`${line}\n`);
      for (const l of renderLine(line)) console.log(l);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      out.end();
      savePid(null);
      console.log(`[runner] ${new Date().toLocaleString()} pass finished (exit ${code}${timedOut ? ', timed out' : ''})`);
      if (code !== 0 && !timedOut) console.log('[runner] the pass failed – check the login / API environment of this terminal and the last lines of the log; the runner now waits for new input from the lead.');
      resolve();
    });
  });
}

export default async function run() {
  const lock = acquireLock('runner');
  if (!lock.ok) return (console.log(`[runner] another runner is active (pid ${lock.pid}, since ${new Date(lock.since).toLocaleString()}) – two runners would work on the same checkout. Stop it first.`), 1);
  fs.mkdirSync(LOGS, { recursive: true });
  savePid(null);
  process.on('SIGINT', () => (fs.rmSync(PIDFILE, { force: true }), process.exit(130)));
  for (;;) {
    if (actionable().length) await pass();
    // a pass that stopped half-way is retried only on new lead input (or after the watcher's 8 h timeout),
    // so a failing pass cannot loop and burn tokens
    await wait();
  }
}
