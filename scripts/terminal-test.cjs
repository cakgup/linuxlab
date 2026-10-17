const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linuxlab-terminal-'));
try {
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig', '--outDir', tmp, '--target', 'ES2020', '--module', 'commonjs', '--strict', 'lib/terminal-input.ts', 'lib/terminal-completion.ts'], { stdio: 'inherit' });
  assert.equal(result.status, 0);
  const { editTerminalInput: edit, terminalTextWidth: width } = require(path.join(tmp, 'terminal-input.js'));
  const { completeTerminal: complete, labCommands } = require(path.join(tmp, 'terminal-completion.js'));
  const { createInitialState } = require(path.join(tmp, 'fs.js'));
  let input = { text: 'echo ac', cursor: 6 };
  input = edit(input, { insert: 'b' });
  assert.deepEqual(input, { text: 'echo abc', cursor: 7 });
  input = edit(input, 'left'); input = edit(input, 'delete');
  assert.deepEqual(input, { text: 'echo ac', cursor: 6 });
  assert.deepEqual(edit(input, 'backspace'), { text: 'echo c', cursor: 5 });
  assert.equal(edit(edit(input, 'home'), 'left').cursor, 0);
  assert.equal(edit(edit(input, 'end'), 'right').cursor, 7);
  assert.deepEqual(edit({ text: 'a😀b', cursor: 2 }, 'backspace'), { text: 'ab', cursor: 1 });
  assert.equal(width('\x1b[32mabc\x1b[0m'), 3);
  assert.equal(width('a界'), 3);
  const s = createInitialState();
  const tab = line => complete(line, s.fs, s.cwd, s.cwd, labCommands);
  assert.equal(tab('ca'), 'cat ');
  assert.equal(tab('cat README'), 'cat README.txt ');
  assert.equal(tab('cd tra'), 'cd training/');
  assert.equal(tab('cat ~/training/no'), 'cat ~/training/notes.txt ');
  assert.equal(tab('cat training/logs/access.log | gre'), 'cat training/logs/access.log | grep ');
  assert.equal(tab('not-a-command'), 'not-a-command');
  assert.equal(tab('cat /srv/app/.e'), 'cat /srv/app/.env ');
  s.fs['/home/analyst/file name.txt'] = { type: 'file', path: '/home/analyst/file name.txt', name: 'file name.txt', mode: 420, owner: 'analyst', group: 'analyst' };
  assert.equal(tab('cat file\\ n'), 'cat file\\ name.txt ');
  assert.equal(tab('cat "file n'), 'cat "file name.txt" ');
  console.log('PASS terminal editing, command/path completion, quoting, pipelines, Unicode and boundaries');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

