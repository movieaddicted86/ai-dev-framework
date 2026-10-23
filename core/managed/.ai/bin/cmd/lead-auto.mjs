// `ai lead-auto [--manual]` – the lead's autopilot; run it as a BACKGROUND command and re-arm it after every wake.
// Routine hand-backs are handled without the lead:
//   report in_review + not high-risk + no deviations + CI green on the branch head
//     → merge --no-ff into the base branch in the lead worktree, push, STATE → merged, auto review,
//       release the next written (blocked) task in STATE order
// Everything else exits with "LEAD WAKE: …" so the lead session is woken:
//   deviations, high-risk task, CI red, merge conflict, no written next task, a decision file,
//   a coder health issue (every few minutes), a long idle time.
// --manual: never merge, wake the lead on every new hand-back (the pre-autopilot loop).
// DRY_RUN=1 prints the decisions without merging or editing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AI, ROOT, cfg } from '../lib/config.mjs';
import { ciStatus, failedJobs } from '../lib/ci.mjs';
import { sleep } from '../lib/proc.mjs';
import * as state from '../lib/state.mjs';
import health from './health.mjs';

const MARK = path.join(AI, '.lead-seen');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

class Wake extends Error {}
const wake = (msg) => {
  throw new Wake(msg);
};

function newerFiles(dir, since) {
  const d = path.join(AI, dir);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .map((f) => path.join(d, f))
    .filter((f) => fs.statSync(f).isFile() && fs.statSync(f).mtimeMs > since)
    .sort();
}

/** merge in the lead worktree; returns the merge commit's short hash */
function merge(id, head, title) {
  const wt = cfg.leadWorktree;
  if (!fs.existsSync(wt)) wake(`${id}: lead worktree ${wt} does not exist – run: node .ai/bin/ai.mjs doctor`);
  try {
    git(wt, 'checkout', '-q', cfg.baseBranch);
    git(wt, 'pull', '-q', '--ff-only', 'origin', cfg.baseBranch);
  } catch (e) {
    wake(`${id}: cannot update ${cfg.baseBranch} in ${wt}: ${e.stderr || e.message}`);
  }
  const msgFile = path.join(os.tmpdir(), `ai-merge-${process.pid}.txt`);
  fs.writeFileSync(
    msgFile,
    `Merge ${id}: ${title}\n\nAuto-merged by the lead autopilot: CI green on ${head}, report without\ndeviations. Implemented by the coding agent.\n\n${cfg.mergeTrailer}\n`,
  );
  try {
    git(wt, 'merge', '--no-ff', '-q', '-F', msgFile, `origin/${cfg.branchPrefix}${id}`);
  } catch {
    try {
      git(wt, 'merge', '--abort');
    } catch {
      /* nothing to abort */
    }
    wake(`${id}: merge conflict with ${cfg.baseBranch} – resolve manually in ${wt}`);
  } finally {
    fs.rmSync(msgFile, { force: true });
  }
  try {
    git(wt, 'push', '-q', 'origin', cfg.baseBranch);
  } catch (e) {
    wake(`${id}: push failed in ${wt}: ${e.stderr || e.message}`);
  }
  return git(wt, 'rev-parse', '--short', 'HEAD');
}

async function handle(id, dry) {
  if (state.risky(id)) wake(`${id} needs a lead review (high-risk task)`);
  if (state.deviations(id) !== 'none') wake(`${id} needs a lead review (report lists deviations)`);
  try {
    git(ROOT, 'fetch', '-q', 'origin');
  } catch {
    wake(`${id}: git fetch failed`);
  }
  let head;
  try {
    head = git(ROOT, 'rev-parse', '--short', `origin/${cfg.branchPrefix}${id}`);
  } catch {
    wake(`${id}: branch origin/${cfg.branchPrefix}${id} not found`);
  }
  let ci = 'error';
  for (let i = 0; i < Math.ceil((cfg.ci.waitMin * 60) / cfg.ci.pollSec); i++) {
    ci = await ciStatus(head).catch(() => 'error');
    if (['success', 'failure', 'cancelled', 'error'].includes(ci)) break;
    await sleep(cfg.ci.pollSec * 1000);
  }
  if (ci !== 'success') wake(`${id}: CI on ${head} is '${ci}' – ${await failedJobs(head).catch(() => '')}`);
  const title = state.title(id);
  if (dry) return console.log(`DRY: would merge ${id} (${head}) – ${title}`);
  const hash = merge(id, head, title);
  state.markMerged(id, hash);
  fs.rmSync(path.join(AI, 'work', id), { recursive: true, force: true }); // the task's scratch folder
  const next = state.nextBlocked();
  if (!next) wake(`${id} merged as ${hash}; no written next task – write one`);
  state.release(next, hash);
  fs.utimesSync(MARK, new Date(), new Date());
  console.log(`${new Date().toTimeString().slice(0, 5)} auto: merged ${id} as ${hash}, released ${next}`);
}

export default async function leadAuto(argv = []) {
  const manual = argv.includes('--manual');
  const dry = process.env.DRY_RUN === '1';
  if (!fs.existsSync(MARK)) {
    // a fresh marker is "never seen anything": reports written before the first start are still pending
    fs.writeFileSync(MARK, '');
    fs.utimesSync(MARK, 0, 0);
  }
  const startedAt = Date.now();
  let lastHealth = Date.now(); // the first check comes after healthEveryMin; `doctor` covers the start-up state
  try {
    for (;;) {
      const since = fs.statSync(MARK).mtimeMs;
      const dec = newerFiles('decisions', since);
      if (dec.length) wake(`decision file changed: ${dec.map((f) => path.relative(ROOT, f)).join(', ')}`);
      const id = state.pending();
      if (id) {
        if (manual) wake(`new coder report: .ai/reports/${id}.md`);
        await handle(id, dry);
        if (dry) return 0;
      }
      if (Date.now() - lastHealth >= cfg.lead.healthEveryMin * 60e3) {
        lastHealth = Date.now();
        const lines = [];
        const log = console.log;
        console.log = (...a) => lines.push(a.join(' '));
        const code = health(['--quiet']);
        console.log = log;
        if (code) wake(lines.join('\n'));
      }
      if (Date.now() - startedAt >= cfg.lead.idleWakeHours * 3600e3) wake(`${cfg.lead.idleWakeHours} h without events – re-arm`);
      await sleep(cfg.lead.pollSec * 1000);
    }
  } catch (e) {
    if (!(e instanceof Wake)) throw e;
    console.log(`LEAD WAKE: ${e.message}`);
    return 0;
  }
}
