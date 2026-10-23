// CI status of a commit. Providers: "github" (Actions API with a read-only token), "command" (any shell
// command that prints success | failure | pending | missing), "none" (always success – smoke tests only).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { cfg } from './config.mjs';

async function gh(path) {
  const token = fs.readFileSync(cfg.ci.tokenFile, 'utf8').trim();
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub API ${r.status} for ${path}`);
  return r.json();
}

async function runFor(sha) {
  // filtering by head_sha in the query is unreliable; list recent runs and match the prefix
  const { workflow_runs: runs = [] } = await gh('/actions/runs?per_page=30');
  return runs.find((r) => r.head_sha.startsWith(sha));
}

/** success | failure | cancelled | pending | missing | error */
export async function ciStatus(sha) {
  if (cfg.ci.provider === 'none') return 'success';
  if (cfg.ci.provider === 'command') {
    return execSync(cfg.ci.command.replaceAll('{sha}', sha), { encoding: 'utf8', timeout: 60000 }).trim() || 'error';
  }
  const r = await runFor(sha);
  if (!r) return 'missing';
  return r.status !== 'completed' ? 'pending' : r.conclusion;
}

/** one line naming the failed jobs and steps */
export async function failedJobs(sha) {
  if (cfg.ci.provider !== 'github') return '(no job details for this CI provider)';
  const r = await runFor(sha);
  if (!r) return 'no run';
  const { jobs = [] } = await gh(`/actions/runs/${r.id}/jobs`);
  const bad = jobs
    .filter((j) => j.conclusion === 'failure')
    .map((j) => `${j.name}: ${j.steps.filter((s) => s.conclusion === 'failure').map((s) => s.name).join(', ')}`);
  return bad.join('; ') || 'unknown';
}
