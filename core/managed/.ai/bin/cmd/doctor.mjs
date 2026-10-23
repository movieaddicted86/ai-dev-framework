// `ai doctor` – checks that the workflow can run on this machine and says how to fix what is missing.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AI, ROOT, cfg } from '../lib/config.mjs';

const results = [];
const check = (name, ok, fix = '') => results.push({ name, ok, fix });
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export default function doctor() {
  check('Node >= 22', Number(process.versions.node.split('.')[0]) >= 22, 'install Node 22 or newer');
  check('.ai/project.json present', fs.existsSync(path.join(AI, 'project.json')), 'create it from the project.json template of the framework');
  for (const f of ['STATE.md', 'PROTOCOL.md', 'LEAD.md']) check(`.ai/${f}`, fs.existsSync(path.join(AI, f)), 'run the framework bootstrap/upgrade');

  let remote = '';
  try {
    remote = run('git', ['remote', 'get-url', 'origin']);
  } catch {
    /* no remote */
  }
  check('git remote "origin"', !!remote, 'git remote add origin <url> (the lead merges and pushes through it)');

  let branch = '';
  try {
    branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    /* not a repo */
  }
  check(`coder checkout is not on ${cfg.baseBranch}`, !!branch && branch !== cfg.baseBranch, `the lead worktree owns ${cfg.baseBranch}; run: git switch -c ${cfg.branchPrefix}${cfg.taskPrefix}-000 (or any feature branch) here`);

  check(`lead worktree ${cfg.leadWorktree}`, fs.existsSync(cfg.leadWorktree), `git worktree add "${cfg.leadWorktree}" ${cfg.baseBranch}   (after the coder checkout left ${cfg.baseBranch})`);
  if (fs.existsSync(cfg.leadWorktree)) {
    let wtBranch = '';
    try {
      wtBranch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cfg.leadWorktree);
    } catch {
      /* ignore */
    }
    check(`lead worktree is on ${cfg.baseBranch}`, wtBranch === cfg.baseBranch, `cd "${cfg.leadWorktree}" && git switch ${cfg.baseBranch}`);
  }

  if (cfg.ci.provider === 'github') {
    check('ci.repo set', !!cfg.repo, 'set "repo": "owner/name" in .ai/project.json');
    check('ci.tokenFile readable', !!cfg.ci.tokenFile && fs.existsSync(cfg.ci.tokenFile), 'create a fine-grained GitHub token (read-only: Actions, Contents) and put it in that file');
  }
  if (cfg.ci.provider === 'command') check('ci.command set', !!cfg.ci.command, 'set "ci.command" in .ai/project.json');

  try {
    execSync(`${cfg.coder.command} --version`, { stdio: 'ignore' });
    check(`coder command '${cfg.coder.command}'`, true);
  } catch {
    check(`coder command '${cfg.coder.command}'`, false, 'install Claude Code or set coder.command in .ai/project.json');
  }
  check(`coder settings ${cfg.coder.settings}`, fs.existsSync(path.join(ROOT, cfg.coder.settings)), 'copy coder-settings.json from the framework profile');
  const rootIgnore = fs.existsSync(path.join(ROOT, '.gitignore')) ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
  check(
    '.ai/ is git-ignored (or tracked with .ai/.gitignore for volatile files)',
    /^\/?\.ai\/?$/m.test(rootIgnore) || fs.existsSync(path.join(AI, '.gitignore')),
    'add ".ai/" to .gitignore, or create .ai/.gitignore listing logs/, markers and .runner.json',
  );

  let bad = 0;
  for (const r of results) {
    console.log(`${r.ok ? '  ok ' : ' FAIL'}  ${r.name}${r.ok || !r.fix ? '' : `\n         → ${r.fix}`}`);
    if (!r.ok) bad++;
  }
  console.log(bad ? `\n${bad} problem(s).` : '\nAll good.');
  return bad ? 1 : 0;
}
