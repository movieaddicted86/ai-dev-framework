// Merging a task branch into the base branch from the lead worktree – shared by the autopilot and `ai merge`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, cfg } from './config.mjs';
import { ciStatus } from './ci.mjs';
import { sleep } from './proc.mjs';

export const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** codes: no_branch | worktree | update | conflict | push | fetch */
export class MergeFailure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** short sha of origin/<branch>; fetches first */
export function branchHead(id) {
  try {
    git(ROOT, 'fetch', '-q', 'origin');
  } catch {
    throw new MergeFailure('fetch', `${id}: git fetch failed`);
  }
  try {
    return git(ROOT, 'rev-parse', '--short', `origin/${cfg.branchPrefix}${id}`);
  } catch {
    throw new MergeFailure('no_branch', `${id}: branch origin/${cfg.branchPrefix}${id} not found – the coder must push it (git push origin ${cfg.branchPrefix}${id})`);
  }
}

/** polls until the commit's CI is final; returns success | failure | cancelled | error | pending (timeout) */
export async function waitForCi(sha, { onPoll } = {}) {
  let ci = 'error';
  for (let i = 0; i < Math.ceil((cfg.ci.waitMin * 60) / cfg.ci.pollSec); i++) {
    ci = await ciStatus(sha).catch(() => 'error');
    onPoll?.(ci);
    if (['success', 'failure', 'cancelled', 'error'].includes(ci)) return ci;
    await sleep(cfg.ci.pollSec * 1000);
  }
  return 'pending';
}

/** merge --no-ff origin/<branch> into the base branch in the lead worktree and push; returns the short merge hash */
export function mergeBranch(id, head, title, { note = 'Auto-merged by the lead autopilot' } = {}) {
  const wt = cfg.leadWorktree;
  if (!fs.existsSync(wt)) throw new MergeFailure('worktree', `${id}: lead worktree ${wt} does not exist – run: node .ai/bin/ai.mjs doctor`);
  try {
    git(wt, 'checkout', '-q', cfg.baseBranch);
    git(wt, 'pull', '-q', '--ff-only', 'origin', cfg.baseBranch);
  } catch (e) {
    throw new MergeFailure('update', `${id}: cannot update ${cfg.baseBranch} in ${wt}: ${e.stderr || e.message}`);
  }
  const msgFile = path.join(os.tmpdir(), `ai-merge-${process.pid}.txt`);
  fs.writeFileSync(msgFile, `Merge ${id}: ${title}\n\n${note}: CI green on ${head}.\n\n${cfg.mergeTrailer}\n`);
  try {
    git(wt, 'merge', '--no-ff', '-q', '-F', msgFile, `origin/${cfg.branchPrefix}${id}`);
  } catch {
    const files = (() => {
      try {
        return git(wt, 'diff', '--name-only', '--diff-filter=U').split('\n').join(' ');
      } catch {
        return '';
      }
    })();
    // the merge stays open in the lead worktree for `ai merge` (manual resolution); the autopilot aborts it
    if (process.env.AI_KEEP_CONFLICT !== '1') {
      try {
        git(wt, 'merge', '--abort');
      } catch {
        /* nothing to abort */
      }
    }
    throw new MergeFailure('conflict', `${id}: merge conflict with ${cfg.baseBranch} in: ${files} – resolve in ${wt} (typical: changelog – keep both; run the formatter on tables afterwards)`);
  } finally {
    fs.rmSync(msgFile, { force: true });
  }
  try {
    git(wt, 'push', '-q', 'origin', cfg.baseBranch);
  } catch (e) {
    throw new MergeFailure('push', `${id}: push failed in ${wt}: ${e.stderr || e.message}`);
  }
  return git(wt, 'rev-parse', '--short', 'HEAD');
}
