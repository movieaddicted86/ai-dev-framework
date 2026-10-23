// Turns one line of `claude -p --output-format stream-json` into a short console line (or nothing).
const clip = (s, n = 160) => {
  const one = String(s ?? '').replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
};
const time = () => new Date().toTimeString().slice(0, 8);
const resultText = (c) => (Array.isArray(c.content) ? c.content.map((x) => x.text ?? '').join(' ') : c.content);

function describeTool(name, input = {}) {
  if (name === 'Bash') return `$ ${clip(input.description || input.command, 140)}`;
  if (input.file_path) return `${name} ${input.file_path}`;
  if (input.pattern) return `${name} ${clip(input.pattern, 100)}`;
  return `${name} ${clip(JSON.stringify(input), 100)}`;
}

/** @returns {string[]} lines to print for one stream-json line; non-JSON lines pass through */
export function renderLine(line) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    return line.trim() ? [line] : [];
  }
  const out = [];
  if (ev.type === 'assistant') {
    for (const c of ev.message?.content ?? []) {
      if (c.type === 'text' && c.text.trim()) out.push(`${time()}  ${clip(c.text, 300)}`);
      if (c.type === 'tool_use') out.push(`${time()}  → ${describeTool(c.name, c.input)}`);
    }
  } else if (ev.type === 'user') {
    for (const c of ev.message?.content ?? []) if (c.type === 'tool_result' && c.is_error) out.push(`${time()}  ✗ ${clip(resultText(c), 200)}`);
  } else if (ev.type === 'result') {
    const min = ev.duration_ms ? ` · ${Math.round(ev.duration_ms / 60000)} min` : '';
    // the CLI reports subtype "success" even when the run failed (not logged in, API error): is_error tells
    out.push(`${time()}  ■ ${ev.is_error ? 'ERROR' : (ev.subtype ?? 'done')}${min} · ${ev.num_turns ?? '?'} turns`);
    if (ev.result) out.push(clip(ev.result, 600));
  }
  return out;
}

/** last steps of a log tail in the same form (for the health diagnosis) */
export function lastSteps(text, n = 8) {
  const steps = [];
  for (const line of text.split('\n')) {
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === 'assistant')
      for (const c of ev.message?.content ?? []) {
        if (c.type === 'text' && c.text.trim()) steps.push(`  ${clip(c.text)}`);
        if (c.type === 'tool_use') steps.push(`  → ${c.name} ${clip(c.input?.description || c.input?.command || c.input?.file_path || '', 120)}`);
      }
    if (ev.type === 'user')
      for (const c of ev.message?.content ?? []) if (c.type === 'tool_result' && c.is_error) steps.push(`  ✗ ${clip(resultText(c))}`);
    if (ev.type === 'result') steps.push(`  ■ ${ev.subtype} ${ev.is_error ? '(error) ' : ''}${clip(ev.result, 160)}`);
  }
  return steps.slice(-n);
}

export { clip };
