// STATE.md and the task / report / review files: everything the scripts need to know about tasks.
// STATE.md rows look like:  | T-007 | Title | status | `feature/T-007` | last step |
import fs from 'node:fs';
import path from 'node:path';
import { AI, cfg } from './config.mjs';

export const STATE = path.join(AI, 'STATE.md');
const rowRe = new RegExp(`^\\| (${cfg.idPattern}) \\| (.*?) \\| (\\w+) \\|`);
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s.replace(/\r\n/g, '\n'));
const exists = (p) => fs.existsSync(p);
const taskFile = (id) => path.join(AI, 'tasks', `${id}.md`);
const reportFile = (id) => path.join(AI, 'reports', `${id}.md`);

/** {id, title, status, line} for every task row, in table order */
export function rows() {
  const out = [];
  for (const line of read(STATE).split(/\r?\n/)) {
    const m = rowRe.exec(line);
    if (m) out.push({ id: m[1], title: m[2], status: m[3], line });
  }
  return out;
}

export const row = (id) => rows().find((r) => r.id === id);
export const title = (id) => row(id)?.title ?? id;

/** rows the coder may pick: open, changes requested, or left in progress by an interrupted pass */
export const actionable = () => rows().filter((r) => ['open', 'changes_requested', 'in_progress'].includes(r.status));

export function setRow(id, status, note) {
  const re = new RegExp(`^\\| ${id} \\| (.*?) \\| \\w+ \\|.*$`, 'm');
  const s = read(STATE);
  if (!re.test(s)) throw new Error(`row ${id} not found in STATE.md`);
  write(STATE, s.replace(re, (_, t) => `| ${id} | ${t} | ${status} | \`${cfg.branchPrefix}${id}\` | ${note} |`));
}

/** first in_review task whose report is newer than the `.lead-seen` marker, or '' */
export function pending() {
  const mark = path.join(AI, '.lead-seen');
  const seen = exists(mark) ? fs.statSync(mark).mtimeMs : 0;
  for (const r of rows()) {
    const rep = reportFile(r.id);
    if (r.status === 'in_review' && exists(rep) && fs.statSync(rep).mtimeMs > seen) return r.id;
  }
  return '';
}

/** 'none' when the report's "## Deviations" section is empty or says none, else 'present' */
export function deviations(id) {
  const m = /^## Deviations[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(read(reportFile(id)));
  const clean = (m?.[1] ?? '').toLowerCase().replace(/[-*\s.]/g, '');
  return ['', 'none', 'nodeviations', 'nodeviationsoropenpoints'].includes(clean) ? 'none' : 'present';
}

/** explicit risk markers only: generic words such as "security" appear in every task's checks */
export function risky(id) {
  const t = exists(taskFile(id)) ? read(taskFile(id)) : '';
  return new RegExp(cfg.risk.titlePattern, 'i').test(title(id)) || new RegExp(cfg.risk.taskPattern, 'i').test(t);
}

/** first blocked row (table order) that already has a written task file */
export function nextBlocked() {
  return rows().find((r) => r.status === 'blocked' && exists(taskFile(r.id)))?.id ?? '';
}

export function markMerged(id, hash) {
  setRow(id, 'merged', `auto-merged by the lead autopilot as \`${hash}\` (CI green, no deviations)`);
  write(
    path.join(AI, 'reviews', `${id}.md`),
    `# Review ${id} – auto\n\nVerdict: **approved** (autopilot: CI green, report without deviations, not high-risk); merged as \`${hash}\`.\n`,
  );
}

/** open the task for the coder: STATE row, base hash in the task file, touch the file (wakes the coder) */
export function release(id, hash) {
  setRow(id, 'open', `released by the autopilot; base \`${cfg.baseBranch}\` at \`${hash}\``);
  const tp = taskFile(id);
  write(tp, read(tp).replace(/^\| Base branch \|.*$/m, `| Base branch | \`${cfg.baseBranch}\` (at \`${hash}\` or later) |`));
  const now = new Date();
  fs.utimesSync(tp, now, now);
}
