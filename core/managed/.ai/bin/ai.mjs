#!/usr/bin/env node
// The single entry point of the lead/coder workflow: `node .ai/bin/ai.mjs <command>`.
// Managed by ai-dev-framework – do not edit; project settings go into .ai/project.json.
const commands = {
  wait: ['cmd/wait.mjs', 'coder: block until the lead wrote new input (run in the background, then stop working)'],
  run: ['cmd/run.mjs', 'coder runner: a fresh `claude -p` pass per task'],
  'lead-auto': ['cmd/lead-auto.mjs', 'lead autopilot: merge routine hand-backs, wake the lead for the rest (--manual: never merge)'],
  health: ['cmd/health.mjs', 'coder health check (--quiet)'],
  handback: ['cmd/handback.mjs', 'handback T-NNN: coder, last step – validate branch, report, checks; sets in_review'],
  merge: ['cmd/merge.mjs', 'merge T-NNN: lead, after approval – wait for CI, merge --no-ff, push, release the next task'],
  doctor: ['cmd/doctor.mjs', 'check this machine/project for the workflow'],
  ci: ['cmd/ci.mjs', 'ci <sha> | failjobs <sha>: CI status of a commit'],
  task: ['cmd/task.mjs', 'task <pending|deviations|risky|title|next|release|mark-merged> …: STATE.md helpers'],
};

const [name, ...rest] = process.argv.slice(2);
if (!commands[name]) {
  console.log('Usage: node .ai/bin/ai.mjs <command>\n');
  for (const [k, [, d]] of Object.entries(commands)) console.log(`  ${k.padEnd(10)} ${d}`);
  process.exit(name ? 2 : 0);
}
const mod = await import(`./${commands[name][0]}`);
process.exit((await mod.default(rest)) ?? 0);
