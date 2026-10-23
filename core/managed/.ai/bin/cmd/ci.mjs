// `ai ci <sha>` prints success | failure | pending | missing; `ai ci failjobs <sha>` names the failed jobs.
import { ciStatus, failedJobs } from '../lib/ci.mjs';

export default async function ci([a, b]) {
  if (a === 'failjobs') console.log(await failedJobs(b));
  else console.log(await ciStatus(a));
  return 0;
}
