// Project configuration: `.ai/project.json` merged over the defaults below. Every project-specific value
// the scripts need (repo, branch names, risk patterns, timeouts) lives there – never in the scripts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** the `.ai/` directory of the project (this file is `.ai/bin/lib/config.mjs`) */
export const AI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** the project checkout (parent of `.ai/`) */
export const ROOT = path.dirname(AI);

const DEFAULTS = {
  name: 'project',
  baseBranch: 'main',
  branchPrefix: 'feature/',
  taskPrefix: 'T',
  taskDigits: 3,
  // `owner/name` on GitHub; only needed for ci.provider "github"
  repo: null,
  // where the lead merges; must be a second worktree of this repository, checked out on baseBranch
  leadWorktree: null,
  mergeTrailer: 'Co-Authored-By: Claude <noreply@anthropic.com>',
  ci: {
    // "github" (Actions API, read-only token) | "command" (see `command`) | "none" (always green – tests only)
    provider: 'github',
    tokenFile: null,
    // for "command": a shell command printing success | failure | pending | missing; {sha} is substituted
    command: null,
    // the lead waits at most this long for CI of a hand-back
    waitMin: 90,
    pollSec: 60,
  },
  coder: {
    command: 'claude',
    args: [],
    settings: '.ai/coder-settings.json',
    permissionMode: 'auto',
    passTimeoutMin: 240,
    keepLogs: 5,
    // health check thresholds (minutes)
    stallMin: 30,
    doneGraceMin: 2,
    idleMin: 15,
    // remove containers named `<letter><digits>-…` of merged tasks (set when tasks start their own containers)
    cleanupContainers: false,
    containerPattern: '^t(\\d+)-',
  },
  // a task is "high risk" (needs the lead's eyes even with green CI) when one of these matches (case-insensitive)
  risk: {
    titlePattern: 'high risk|critical|\\bsec-\\d|security hardening|\\bci\\b',
    taskPattern: 'high risk|\\.github/workflows',
  },
  lead: { idleWakeHours: 8, healthEveryMin: 5, pollSec: 30 },
};

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' && base[k] ? merge(base[k], v) : v;
  }
  return out;
}

export function expandHome(p) {
  return p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

export function loadConfig() {
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(path.join(AI, 'project.json'), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`.ai/project.json is not valid JSON: ${e.message}`);
  }
  const cfg = merge(DEFAULTS, user);
  cfg.leadWorktree = path.resolve(ROOT, expandHome(cfg.leadWorktree ?? `../${path.basename(ROOT)}-lead`));
  cfg.ci.tokenFile = expandHome(cfg.ci.tokenFile);
  // task ids: T-001, P-012, …
  cfg.idPattern = `${cfg.taskPrefix}-\\d{${cfg.taskDigits}}`;
  return cfg;
}

export const cfg = loadConfig();
