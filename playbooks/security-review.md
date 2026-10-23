# Playbook: security review of a web application

Do it once before the first public exposure, after every new input channel (file import, RPC/MCP, plugin),
and after an incident. Output: `docs/audits/SECURITY-<date>.md` and one hardening task per finding class.

1. **Map the entry points:** every route, RPC/MCP tool, CLI flag, file import, environment variable, WebSocket,
   and every place a user-controlled value reaches a process, a path, a query or a template.
2. **Walk `docs/principles/04-security-baseline.md`** against each entry point. For each finding record: impact,
   exploit sketch (one paragraph), fix, and the **bypass variants** the test must contain.
3. **Check the second door:** a fix at the REST layer must also hold at the RPC/MCP layer, in the CLI, and in
   configuration import paths.
4. **Rank:** critical (remote code execution, auth bypass, data exfiltration) → own task, **before** anything
   else in the queue; high → next task; medium/low → batched hardening task.
5. **Fix with tests first**, reproduce the exploit as a failing test, then close it, then test the bypass variants.
6. **Re-review the fix** with a fresh pair of eyes (a different model): the best bug found in the early projects was a
   bypass of the previous fix.
7. **Document operational assumptions** (bind address, trusted network, who may reach it) in the README and
   SECURITY.md, including what is deliberately *not* protected yet and which later task will.
