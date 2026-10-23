// `ai wait` – the coder's wake-up watcher. Run it as a BACKGROUND command and stop working; it exits as soon
// as the lead writes a new or changed file in tasks/ or reviews/. STATE.md is not watched (the coder edits it).
import fs from 'node:fs';
import path from 'node:path';
import { AI } from '../lib/config.mjs';
import { sleep } from '../lib/proc.mjs';

const MARK = path.join(AI, '.coder-seen');
const maxHours = Number(process.env.MAX_HOURS || 8);

function newer(dir, since) {
  const d = path.join(AI, dir);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .map((f) => path.join(d, f))
    .filter((f) => fs.statSync(f).isFile() && fs.statSync(f).mtimeMs > since)
    .map((f) => `  .ai/${dir}/${path.basename(f)}`);
}

export default async function wait() {
  if (!fs.existsSync(MARK)) fs.writeFileSync(MARK, '');
  const start = Date.now();
  for (;;) {
    const since = fs.statSync(MARK).mtimeMs;
    const found = [...newer('tasks', since), ...newer('reviews', since)].sort();
    if (found.length) {
      console.log('WAKE: new input from the lead – run the coder loop from step 1 (.ai/PROTOCOL.md).');
      console.log(found.join('\n'));
      return;
    }
    if (Date.now() - start >= maxHours * 3600e3) {
      console.log(`WAKE: no new input for ${maxHours} h – re-arm the watcher (node .ai/bin/ai.mjs wait, in the background).`);
      return;
    }
    await sleep(Number(process.env.POLL_SEC || 30) * 1000);
  }
}
