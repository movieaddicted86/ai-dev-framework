// `ai lead-auto [--manual]` – the lead's autopilot; run it as a BACKGROUND command and re-arm it after every wake.
// Routine hand-backs are handled without the lead:
//   report in_review + not high-risk + no deviations + CI green on the branch head
//     → merge --no-ff into the base branch in the lead worktree, push, STATE → merged, auto review,
//       release the next written (blocked) task in STATE order
//   after every merge the CI of the merge commit on the base branch is watched: a green branch can still give a red
//   base (two branches that interact) – that wakes the lead too
// Everything else exits with "LEAD WAKE: …" so the lead session is woken:
//   deviations, high-risk task, CI red, merge conflict, no written next task, a decision file,
//   a coder health issue (every few minutes), a long idle time, a second autopilot running.
// --manual: never merge, wake the lead on every new hand-back (the pre-autopilot loop).
// DRY_RUN=1 prints the decisions without merging or editing.
import fs from 'node:fs';
import path from 'node:path';
import { AI, ROOT, cfg } from '../lib/config.mjs';
import { ciStatus, failedJobs } from '../lib/ci.mjs';
import { acquireLock } from '../lib/lock.mjs';
import { MergeFailure, branchHead, mergeBranch, waitForCi } from '../lib/merge.mjs';
import { sleep } from '../lib/proc.mjs';
import * as state from '../lib/state.mjs';
import health from './health.mjs';

const MARK = path.join(AI, '.lead-seen');

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

/** merge commits whose CI on the base branch has not been confirmed yet (kept across the autopilot's exits) */
const MC_FILE = path.join(AI, '.main-checks.json');
const mainChecks = (() => {
  try {
    return JSON.parse(fs.readFileSync(MC_FILE, 'utf8'));
  } catch {
    return [];
  }
})();
const saveChecks = () => fs.writeFileSync(MC_FILE, JSON.stringify(mainChecks));

async function handle(id, dry) {
  if (state.risky(id)) wake(`${id} needs a lead review (high-risk task)`);
  if (state.deviations(id) !== 'none') wake(`${id} needs a lead review (report lists deviations)`);
  let head;
  try {
    head = branchHead(id);
  } catch (e) {
    if (e instanceof MergeFailure) wake(e.message);
    throw e;
  }
  const ci = await waitForCi(head);
  if (ci !== 'success') wake(`${id}: CI on ${head} is '${ci}' – ${await failedJobs(head).catch(() => '')}`);
  const title = state.title(id);
  if (dry) return console.log(`DRY: would merge ${id} (${head}) – ${title}`);
  let hash;
  try {
    hash = mergeBranch(id, head, title);
  } catch (e) {
    if (e instanceof MergeFailure) wake(e.message);
    throw e;
  }
  state.markMerged(id, hash);
  fs.rmSync(path.join(AI, 'work', id), { recursive: true, force: true }); // the task's scratch folder
  mainChecks.push({ id, hash, since: Date.now() });
  saveChecks();
  const next = state.nextBlocked();
  if (!next) wake(`${id} merged as ${hash}; no written next task – write one`);
  state.release(next, hash);
  fs.utimesSync(MARK, new Date(), new Date());
  console.log(`${new Date().toTimeString().slice(0, 5)} auto: merged ${id} as ${hash}, released ${next}`);
}

async function checkMain() {
  for (const m of [...mainChecks]) {
    const s = await ciStatus(m.hash).catch(() => 'error');
    if (s === 'success') (mainChecks.splice(mainChecks.indexOf(m), 1), saveChecks());
    else if (s === 'failure' || s === 'cancelled') wake(`CI on ${cfg.baseBranch} is '${s}' after merging ${m.id} (${m.hash}) – ${await failedJobs(m.hash).catch(() => '')}`);
    else if (Date.now() - m.since > cfg.ci.waitMin * 60e3) wake(`no CI result on ${cfg.baseBranch} for the merge of ${m.id} (${m.hash}) after ${cfg.ci.waitMin} min`);
  }
}

export default async function leadAuto(argv = []) {
  const manual = argv.includes('--manual');
  const dry = process.env.DRY_RUN === '1';
  if (!dry) {
    const lock = acquireLock('lead-auto');
    if (!lock.ok) {
      console.log(`LEAD WAKE: another autopilot is running (pid ${lock.pid}, since ${new Date(lock.since).toLocaleString()}) – stop it first; two autopilots race on the same merge`);
      return 0;
    }
  }
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
      await checkMain();
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
