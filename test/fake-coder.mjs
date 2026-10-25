// Stand-in for `claude -p` in the smoke test: reads the prompt from stdin, does a minimal hand-back of the first
// open task (branch, commit, push, report, STATE → in_review) and prints stream-json lines like the real CLI.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const say = (o) => console.log(JSON.stringify(o));

process.stdin.resume();
process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  const state = fs.readFileSync('.ai/STATE.md', 'utf8');
  const m = /^\| (T-\d{3}) \| .*? \| open \|/m.exec(state);
  if (!m) {
    say({ type: 'result', subtype: 'success', result: 'nothing to do', num_turns: 1 });
    return;
  }
  const id = m[1];
  say({ type: 'assistant', message: { content: [{ type: 'text', text: `working on ${id}` }, { type: 'tool_use', name: 'Bash', input: { command: 'git switch -c' } }] } });
  git('switch', '-c', `feature/${id}`);
  fs.writeFileSync(`${id}.txt`, `work of ${id}\n`);
  git('add', `${id}.txt`);
  git('commit', '-q', '-m', `Add ${id}`);
  git('push', '-q', 'origin', `feature/${id}`);
  const deviations = process.env.FAKE_DEVIATIONS === '1' ? 'Used a different library.' : 'None.';
  fs.writeFileSync(`.ai/reports/${id}.md`, `# Report ${id}\n\n## Done\nok\n\n## Evidence\nfake coder\n\n## Deviations\n${deviations}\n\n## Notes\n-\n`);
  // the real hand-back step: validates branch, report and checks, then sets in_review
  try {
    console.log(execFileSync('node', ['.ai/bin/ai.mjs', 'handback', id], { encoding: 'utf8' }));
  } catch (e) {
    say({ type: 'result', subtype: 'success', is_error: true, result: `handback refused: ${e.stdout}`, num_turns: 3 });
    git('switch', '-q', 'feature/T-000');
    return;
  }
  git('switch', '-q', 'feature/T-000'); // leave the base branch free for the lead worktree
  say({ type: 'result', subtype: 'success', result: `${id} handed back`, num_turns: 3, duration_ms: 1000 });
});
