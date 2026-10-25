// `ai merge T-NNN ["title"] [--no-release]` – the lead's manual merge after a review ("approved"): waits for the CI of
// the branch head, merges --no-ff in the lead worktree, pushes, sets the STATE row to merged (the lead's review file
// stays), removes the task's scratch folder and releases the next written task.
// Exit codes: 0 merged · 1 CI red/cancelled · 2 CI timeout · 3 merge conflict (the merge stays open in the lead
// worktree: resolve, `git add -A`, `git commit`, `git push origin <base>`) · 4 branch not on origin.
import fs from 'node:fs';
import path from 'node:path';
import { AI, cfg } from '../lib/config.mjs';
import { failedJobs } from '../lib/ci.mjs';
import { MergeFailure, branchHead, mergeBranch, waitForCi } from '../lib/merge.mjs';
import * as state from '../lib/state.mjs';

export default async function merge(argv) {
  const [id, ...rest] = argv.filter((a) => !a.startsWith('--'));
  if (!id || !state.row(id)) {
    console.error('usage: ai merge T-NNN ["title"] [--no-release]   (the task needs a row in STATE.md)');
    return 2;
  }
  const title = rest.join(' ') || state.title(id);
  process.env.AI_KEEP_CONFLICT = '1';
  try {
    const head = branchHead(id);
    const ci = await waitForCi(head, { onPoll: (s) => console.log(`${new Date().toTimeString().slice(0, 5)} CI on ${head}: ${s}`) });
    if (ci === 'pending') return (console.log(`CI on ${head} did not finish within ${cfg.ci.waitMin} min`), 2);
    if (ci !== 'success') return (console.log(`CI ${ci} on ${head}: ${await failedJobs(head).catch(() => '')}`), 1);
    const hash = mergeBranch(id, head, title, { note: 'Merged by the lead' });
    state.setMerged(id, hash);
    fs.rmSync(path.join(AI, 'work', id), { recursive: true, force: true });
    console.log(`MERGED ${id} as ${hash} – check the CI of ${cfg.baseBranch} (the autopilot does it when it runs)`);
    if (!argv.includes('--no-release')) {
      const next = state.nextBlocked();
      if (next) (state.release(next, hash), console.log(`released ${next}`));
      else console.log('no written next task – write one');
    }
    return 0;
  } catch (e) {
    if (!(e instanceof MergeFailure)) throw e;
    console.log(e.message);
    return e.code === 'conflict' ? 3 : e.code === 'no_branch' ? 4 : 1;
  }
}
