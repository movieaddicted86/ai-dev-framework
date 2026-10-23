// Cross-platform process helpers (Windows via PowerShell/CIM, everything else via `ps`).
import { execSync } from 'node:child_process';

const win = process.platform === 'win32';

/** [{pid, ppid, name, cmd, start}] – start in ms since the epoch */
export function processes() {
  if (win) {
    const ps =
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,' +
      "@{n='Start';e={[int64](($_.CreationDate.ToUniversalTime()) - [datetime]'1970-01-01').TotalMilliseconds}} | ConvertTo-Json -Compress";
    const out = execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { encoding: 'utf8', maxBuffer: 64 << 20 });
    return JSON.parse(out).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, name: p.Name, cmd: p.CommandLine || '', start: p.Start }));
  }
  const out = execSync('ps -eo pid=,ppid=,etime=,comm=,args=', { encoding: 'utf8', maxBuffer: 64 << 20 });
  const now = Date.now();
  return out
    .split('\n')
    .map((l) => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ pid: +m[1], ppid: +m[2], name: m[4], cmd: m[5], start: now - etimeMs(m[3]) }));
}

/** ps `etime`: [[dd-]hh:]mm:ss */
function etimeMs(s) {
  const [d, rest] = s.includes('-') ? s.split('-') : ['0', s];
  const parts = rest.split(':').map(Number).reverse();
  const [sec = 0, min = 0, hour = 0] = parts;
  return (((+d * 24 + hour) * 60 + min) * 60 + sec) * 1000;
}

export function descendants(all, root) {
  const out = [];
  const queue = [root];
  while (queue.length) {
    const pid = queue.shift();
    for (const p of all) if (p.ppid === pid) (out.push(p), queue.push(p.pid));
  }
  return out;
}

export function killTree(pid) {
  try {
    if (win) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    else {
      for (const c of descendants(processes(), pid).reverse()) process.kill(c.pid, 'SIGKILL');
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
