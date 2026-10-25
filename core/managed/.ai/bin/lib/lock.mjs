// Single-instance locks: two runners would work on the same checkout, two autopilots would race on the same merge
// (both happened in the first project). A lock is `.ai/.<name>.lock` with the owner's pid; a dead owner's lock is ignored.
import fs from 'node:fs';
import path from 'node:path';
import { AI } from './config.mjs';

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

/** @returns {{ok: true} | {ok: false, pid: number, since: number}} */
export function acquireLock(name) {
  const file = path.join(AI, `.${name}.lock`);
  try {
    const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cur.pid !== process.pid && alive(cur.pid)) return { ok: false, pid: cur.pid, since: cur.at };
  } catch {
    /* no lock, or unreadable */
  }
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now() }));
  process.on('exit', () => {
    try {
      if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.rmSync(file, { force: true });
    } catch {
      /* already gone */
    }
  });
  return { ok: true };
}
