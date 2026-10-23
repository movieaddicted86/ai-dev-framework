#!/usr/bin/env node
// ai-dev-framework installer.
//   node bootstrap.mjs init <target> --name <name> [--profile react-ts-vite] [--repo owner/name] [--base main]
//                      [--chat-language German] [--repo-language English] [--model <id>] [--track-ai]
//   node bootstrap.mjs upgrade <target>      update the managed files of an installed project
//   node bootstrap.mjs list                  available profiles
//
// Two kinds of files:
//   managed – owned by the framework (.ai/bin, PROTOCOL.md, docs/CONVENTIONS.md, …): written on init, updated by
//             `upgrade` when the project did not change them; a changed file gets a `.framework-new` sibling.
//   owned   – seeds (STATE.md, PROJECT.md, project.json, eslint.config.mjs, …): written once on init, never touched again.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = fs.readFileSync(path.join(HERE, 'VERSION'), 'utf8').trim();
const LOCK = '.ai/framework.lock.json';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const walk = (dir, base = dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).replaceAll('\\', '/')]))
    : [];

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase());
      opts[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else opts._.push(argv[i]);
  }
  return opts;
}

function profileDir(name) {
  const dir = path.join(HERE, 'profiles', name);
  if (!fs.existsSync(path.join(dir, 'profile.json'))) throw new Error(`unknown profile '${name}' (try: node bootstrap.mjs list)`);
  return dir;
}

/** managed file sources in install order: later sources win (profile over core) */
function managedFiles(profile) {
  const map = new Map();
  const add = (srcDir, destPrefix = '') => {
    for (const rel of walk(srcDir)) map.set(destPrefix + rel, path.join(srcDir, rel));
  };
  add(path.join(HERE, 'core', 'managed'));
  add(path.join(HERE, 'conventions', 'principles'), 'docs/principles/');
  add(path.join(profileDir(profile), 'managed'));
  return map;
}

function ownedFiles(profile) {
  const map = new Map();
  for (const dir of [path.join(HERE, 'core', 'owned'), path.join(profileDir(profile), 'owned')])
    for (const rel of walk(dir)) map.set(rel, path.join(dir, rel));
  return map;
}

const fill = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

function write(target, rel, content) {
  const p = path.join(target, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function ensureLines(file, lines) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const missing = lines.filter((l) => !cur.split(/\r?\n/).includes(l));
  if (missing.length) fs.writeFileSync(file, `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
  return missing;
}

function init(opts) {
  const target = path.resolve(opts._[1] ?? '');
  if (!opts._[1] || !fs.existsSync(target)) throw new Error('usage: init <existing target directory> --name <name>');
  const profile = opts.profile ?? 'react-ts-vite';
  const pj = JSON.parse(fs.readFileSync(path.join(profileDir(profile), 'profile.json'), 'utf8'));
  const vars = {
    name: opts.name ?? path.basename(target),
    baseBranch: opts.base ?? 'main',
    repo: opts.repo ?? 'owner/name',
    chatLanguage: opts.chatLanguage ?? 'English',
    repoLanguage: opts.repoLanguage ?? 'English',
    standardChecks: pj.standardChecks,
    frameworkVersion: VERSION,
  };
  const lock = { version: VERSION, profile, files: {} };

  for (const [rel, src] of managedFiles(profile)) {
    const buf = fs.readFileSync(src);
    write(target, rel, buf);
    lock.files[rel] = sha(buf);
  }
  const seeded = [];
  for (const [rel, src] of ownedFiles(profile)) {
    if (fs.existsSync(path.join(target, rel))) continue;
    let text = fill(fs.readFileSync(src, 'utf8'), vars);
    if (rel === '.ai/coder-settings.json') {
      const s = JSON.parse(text);
      s.permissions.allow.push(...(pj.coderAllow ?? []));
      if (opts.model) s.model = opts.model;
      text = `${JSON.stringify(s, null, 2)}\n`;
    }
    write(target, rel, text);
    seeded.push(rel);
  }
  for (const d of ['tasks', 'reports', 'reviews', 'decisions', 'logs']) fs.mkdirSync(path.join(target, '.ai', d), { recursive: true });
  write(target, LOCK, `${JSON.stringify(lock, null, 2)}\n`);

  // volatile workflow files never belong in a commit, whether or not .ai/ itself is tracked
  write(target, '.ai/.gitignore', 'logs/\ntmp/\nwork/\n.coder-seen\n.lead-seen\n.runner.json\n.health-last\n');
  const ignore = ['CLAUDE.local.md', ...(opts.trackAi ? [] : ['.ai/'])];
  ensureLines(path.join(target, '.gitignore'), ignore);

  console.log(`ai-dev-framework ${VERSION}, profile ${profile}: installed into ${target}`);
  console.log(`  managed files: ${Object.keys(lock.files).length}, seeded: ${seeded.length}${opts.trackAi ? ' (.ai/ is tracked in git)' : ' (.ai/ is git-ignored)'}`);
  console.log('\nNext steps:');
  console.log('  1. Edit .ai/project.json (repo, CI token file) and .ai/PROJECT.md; adapt docs/PROJECT-CONVENTIONS.md.');
  console.log('  2. In the target: node .ai/bin/ai.mjs doctor   (tells you what is still missing, e.g. the lead worktree)');
  console.log('  3. Write the first task (.ai/templates/task.md → .ai/tasks/T-001.md), add its row to .ai/STATE.md as `open`.');
  console.log('  4. Coder: node .ai/bin/ai.mjs run      Lead: node .ai/bin/ai.mjs lead-auto (background)');
}

function upgrade(opts) {
  const target = path.resolve(opts._[1] ?? '');
  const lockPath = path.join(target, LOCK);
  if (!opts._[1] || !fs.existsSync(lockPath)) throw new Error(`not an installed project (no ${LOCK}) – use init`);
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const next = { version: VERSION, profile: lock.profile, files: {} };
  const report = { updated: [], added: [], unchanged: 0, conflicts: [], removed: [] };
  for (const [rel, src] of managedFiles(lock.profile)) {
    const buf = fs.readFileSync(src);
    const newHash = sha(buf);
    const p = path.join(target, rel);
    next.files[rel] = newHash;
    if (!fs.existsSync(p)) {
      write(target, rel, buf);
      report.added.push(rel);
      continue;
    }
    const cur = sha(fs.readFileSync(p));
    if (cur === newHash) report.unchanged++;
    else if (cur === lock.files[rel]) (write(target, rel, buf), report.updated.push(rel)); // untouched by the project
    else {
      write(target, `${rel}.framework-new`, buf);
      next.files[rel] = lock.files[rel] ?? cur; // keep the old baseline so the conflict stays visible
      report.conflicts.push(rel);
    }
  }
  for (const rel of Object.keys(lock.files)) {
    if (next.files[rel]) continue;
    const p = path.join(target, rel);
    if (fs.existsSync(p) && sha(fs.readFileSync(p)) === lock.files[rel]) (fs.rmSync(p), report.removed.push(rel));
  }
  write(target, LOCK, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`upgraded ${lock.version} → ${VERSION}: ${report.updated.length} updated, ${report.added.length} added, ${report.removed.length} removed, ${report.unchanged} unchanged`);
  for (const r of report.updated) console.log(`  updated  ${r}`);
  for (const r of report.added) console.log(`  added    ${r}`);
  for (const r of report.removed) console.log(`  removed  ${r}`);
  for (const r of report.conflicts) console.log(`  CONFLICT ${r}  (changed locally – merge ${r}.framework-new by hand, then delete it)`);
  console.log('\nRead CHANGELOG.md of the framework for migration notes between the two versions.');
  return report;
}

const opts = parseArgs(process.argv.slice(2));
try {
  const cmd = opts._[0];
  if (cmd === 'init') init(opts);
  else if (cmd === 'upgrade') upgrade(opts);
  else if (cmd === 'list') for (const d of fs.readdirSync(path.join(HERE, 'profiles'))) console.log(`${d} – ${JSON.parse(fs.readFileSync(path.join(HERE, 'profiles', d, 'profile.json'), 'utf8')).description}`);
  else console.log('usage: node bootstrap.mjs init <dir> --name <n> [--profile p] [--repo o/n] [--base main] [--track-ai]\n       node bootstrap.mjs upgrade <dir>\n       node bootstrap.mjs list');
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}
