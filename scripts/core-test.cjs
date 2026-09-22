const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linuxlab-core-'));
const bin = require.resolve('typescript/bin/tsc');
const sourceFiles = ['lib/types.ts', 'lib/fs.ts', 'lib/shell.ts', 'lib/validator.ts', 'lib/tracks.ts'];

const compile = spawnSync(process.execPath, [
  bin,
  '--ignoreConfig',
  '--outDir', tmp,
  '--target', 'ES2020',
  '--module', 'commonjs',
  '--strict',
  ...sourceFiles,
], { cwd: root, stdio: 'inherit' });

if (compile.error || compile.status !== 0) {
  console.error('Core TypeScript compilation failed.');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

const { createInitialState } = require(path.join(tmp, 'fs.js'));
const { executeLine } = require(path.join(tmp, 'shell.js'));
const { isTaskComplete } = require(path.join(tmp, 'validator.js'));
const { rooms, isRoomUnlocked } = require(path.join(tmp, 'tracks.js'));

const recipes = {
  'basic-navigation': ['pwd', 'ls -la /home/analyst', 'cd /home/analyst/training/logs', 'cd ..', 'cd ~'],
  'basic-files': ['mkdir /home/analyst/lab', 'touch /home/analyst/lab/incident.txt', 'cp /home/analyst/training/notes.txt /home/analyst/lab/notes-copy.txt', 'mv /home/analyst/lab/incident.txt /home/analyst/lab/case-notes.txt', 'rm /home/analyst/lab/notes-copy.txt'],
  'basic-reading': ['cat /home/analyst/training/notes.txt', 'head /home/analyst/training/logs/access.log', 'tail /home/analyst/training/logs/access.log', 'less /home/analyst/training/notes.txt'],
  'basic-search': ['grep ERROR /home/analyst/training/logs/access.log', 'grep -n ERROR /home/analyst/training/logs/access.log', 'find /home/analyst/training -name deploy.sh', "find /home/analyst/training -name '*.log'"],
  'basic-permissions': ['ls -l /home/analyst/training/scripts/deploy.sh', 'chmod +x /home/analyst/training/scripts/deploy.sh', 'chmod 600 /home/analyst/training/secret.key', 'stat /home/analyst/training/secret.key'],
  'basic-processes': ['ps', 'ps aux', 'ps aux | grep sshd'],
  'basic-streams': ['cat /home/analyst/training/logs/access.log | grep ERROR', 'echo CASE-OPENED > /home/analyst/report.txt', 'echo IOC-REVIEWED >> /home/analyst/report.txt', 'echo VERIFIED | tee /home/analyst/verified.txt'],
  'basic-identity': ['whoami', 'id', 'groups', 'hostname', 'uname -a', 'history'],
  'permissions-hardening': ['stat /srv/app/.env', 'chmod 640 /srv/app/.env', 'stat /srv/app/.env'],
  'log-investigation': ['cat /var/log/auth.log', "grep 'Failed password' /var/log/auth.log", 'grep 10.10.14.23 /var/log/auth.log'],
  'suid-hunting': ['find /usr -perm -4000', 'ls -l /usr/local/bin/backup-helper', 'chmod 755 /usr/local/bin/backup-helper'],
  'process-response': ['ps aux', 'ps aux | grep 31337', 'kill 31337'],
  'network-triage': ['ip addr', 'ss -lntp', 'ss -lntp | grep 4444'],
  'persistence-hunting': ['ls -la /etc/cron.d', 'cat /etc/cron.d/system-update', 'stat /tmp/.cache/.sync-agent', 'mv /etc/cron.d/system-update /opt/incident/quarantine.cron'],
  'incident-capstone': ['cd /opt/incident', 'cat briefing.txt', 'grep 10.10.14.23 /var/log/auth.log', 'ss -lntp | grep 4444', 'chmod 640 /srv/app/.env', 'kill 31337', 'echo INCIDENT-CONTAINED > /opt/incident/status.txt'],
};

let failures = 0;
const globallyCompleted = [];
for (const room of rooms) {
  if (!isRoomUnlocked(room, globallyCompleted)) {
    console.log('FAIL unlock', room.slug);
    failures++;
    break;
  }
  let state = createInitialState();
  const completed = new Set();
  for (const cmd of recipes[room.slug]) {
    state = executeLine(state, cmd).state;
    for (const task of room.tasks) {
      if (!completed.has(task.id) && isTaskComplete(task, state)) completed.add(task.id);
    }
  }
  const failed = room.tasks.filter((task) => !completed.has(task.id));
  if (failed.length) {
    console.log('FAIL', room.slug, failed.map((task) => task.id));
    failures += failed.length;
  } else {
    console.log('PASS', room.slug, `${room.tasks.length} tasks`);
    globallyCompleted.push(...room.tasks.map((task) => task.id));
  }
}

let state = createInitialState();
state = executeLine(state, 'chmod +x /home/analyst/training/scripts/deploy.sh').state;
if (state.fs['/home/analyst/training/scripts/deploy.sh'].mode !== 0o755) failures++;
state = executeLine(state, 'echo first > /home/analyst/test.txt').state;
state = executeLine(state, 'echo second >> /home/analyst/test.txt').state;
if (!state.fs['/home/analyst/test.txt'].content.includes('first') || !state.fs['/home/analyst/test.txt'].content.includes('second')) failures++;
if (!executeLine(createInitialState(), 'ps aux | grep 31337').output.includes('31337')) failures++;

console.log(`TOTAL ${rooms.length} rooms / ${rooms.reduce((n, r) => n + r.tasks.length, 0)} tasks / failures=${failures}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
