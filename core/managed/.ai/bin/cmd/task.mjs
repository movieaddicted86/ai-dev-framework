// `ai task <sub> …` – the STATE.md helpers the lead (and the autopilot) use; one result line each.
import * as state from '../lib/state.mjs';

export default function task([sub, id, arg]) {
  const out = {
    pending: () => state.pending(),
    deviations: () => state.deviations(id),
    risky: () => (state.risky(id) ? 'yes' : 'no'),
    title: () => state.title(id),
    next: () => state.nextBlocked(),
    'mark-merged': () => (state.markMerged(id, arg), `${id} merged`),
    release: () => (state.release(id, arg), `${id} released`),
  }[sub];
  if (!out) {
    console.error('usage: ai task pending | deviations T-001 | risky T-001 | title T-001 | next | mark-merged T-001 <hash> | release T-001 <hash>');
    return 2;
  }
  console.log(out());
  return 0;
}
