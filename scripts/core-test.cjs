const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linuxlab-core-'));
const bin = require.resolve('typescript/bin/tsc');
const sourceFiles = ['lib/types.ts', 'lib/fs.ts', 'lib/shell.ts', 'lib/validator.ts', 'lib/tracks.ts', 'lib/lab-session.ts'];

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
const { createRoomState, executeRoomCommand } = require(path.join(tmp, 'lab-session.js'));
const { isTaskComplete } = require(path.join(tmp, 'validator.js'));
const { rooms, isRoomUnlocked } = require(path.join(tmp, 'tracks.js'));

const recipes = {
  ...require('./forensics-recipes.cjs'),
  'basic-help-tools': ['help','man grep','type cd','which grep','file /home/analyst/training/scripts/deploy.sh'],
  'basic-text-processing': ['sort /home/analyst/training/visitors.txt | uniq -c',"awk '{print $1}' /home/analyst/training/logs/access.log", "echo warning | tr 'a-z' 'A-Z'", "sed -n '1,3p' /home/analyst/training/notes.txt", "cut -d ' ' -f1 /home/analyst/training/logs/access.log"],
  'basic-links-discovery': ['find /home/analyst/training -type f','find /home/analyst/training -name deploy.sh','ln -s /home/analyst/training/notes.txt /home/analyst/notes-link','readlink /home/analyst/notes-link','file /home/analyst/notes-link','cat /home/analyst/notes-link'],
  'basic-archives': ['cd /home/analyst/training','tar -cf notes.tar notes.txt','tar -tf notes.tar','mkdir /home/analyst/restore','tar -xf notes.tar -C /home/analyst/restore','gzip /home/analyst/restore/notes.txt','gunzip /home/analyst/restore/notes.txt.gz'],
  'basic-resources': ['df -h','du -sh /home/analyst/training','free -m','lsblk'],
  'basic-environment': ['env','printenv HOME','export CASE_ID=IR-001','printenv CASE_ID','date -u','uptime'],
  'admin-ssh': ['ssh root@192.168.22.7','admin1234!','whoami','id','cd','pwd','ssh -V'],
  'admin-system-profile': ['cat /etc/os-release','uname -r','uname -m','hostnamectl','getent passwd','wc -l /etc/passwd'],
  'admin-services': ['systemctl list-units --type=service --state=running','systemctl status apache2','journalctl -u apache2 -n 5','ps aux | grep mysqld'],
  'admin-network': ['ip a','ss -lntp','ss -lntp | grep mysqld','ss -lntp | grep LISTEN | wc -l'],
  'admin-apache': ['apache2 -v','apache2ctl -V','grep sites-enabled /etc/apache2/apache2.conf','ls /etc/apache2/sites-available','ls /etc/apache2/sites-enabled','cat /etc/apache2/sites-enabled/wordpress.conf'],
  'admin-web-logs': ['grep APACHE_LOG_DIR /etc/apache2/envvars','head -n 1 /var/log/apache2/access-wordpress.log',"grep '192.168.56.101' /var/log/apache2/access-wordpress.log | wc -l", "awk '{print $1}' /var/log/apache2/access-wordpress.log | sort | uniq -c > /root/visitor-summary.txt"],
  'admin-mysql-access': ['mysql -V','grep DB_ /var/www/wordpress/wp-config.php','mysql -u root -p','Admin1234!.','SHOW DATABASES;'],
  'admin-mysql-queries': ['mysql -u root -p','Admin1234!.','USE wordpress;','SHOW TABLES;','DESCRIBE wp_users;','SELECT COUNT(*) FROM wp_users;','SELECT user_login,user_registered FROM wp_users;'],
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
  let state = createRoomState(room);
  const completed = new Set();
  for (const cmd of recipes[room.slug]) {
    const result = executeRoomCommand(room,state,cmd);
    state = result.state;
    if (/not found|belum didukung|berkas teks tidak ditemukan|^ERROR|^bash:|^tar:|^cut:/.test(result.output)) { console.log('FAIL command',room.slug,cmd,result.output); failures++; }
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

// Check actual outputs and round trips, beyond task-history validation.
const assert = (ok,label) => { if(!ok) {failures++;console.log('FAIL behavior',label);} };
state=createInitialState();
const run=(cmd)=>{const result=executeLine(state,cmd);state=result.state;return result.output;};
assert(run("echo warning | tr 'a-z' 'A-Z'")==='WARNING','tr translates stdin');
assert(run('which grep')==='/usr/bin/grep','which executable');
assert(run('type cd').includes('builtin'),'type builtin');
assert(run('sort /home/analyst/training/visitors.txt | uniq -c').includes('3 192.168.1.10'),'sort and uniq frequency');
const original=state.fs['/home/analyst/training/notes.txt'].content;
run('ln -s /home/analyst/training/notes.txt /home/analyst/link');
assert(run('cat /home/analyst/link')===original,'cat follows symlink');
assert(run('readlink /home/analyst/link')==='/home/analyst/training/notes.txt','readlink preserves target');
assert(run("sed -n '1,2p' /home/analyst/training/notes.txt")===original.trimEnd().split('\n').slice(0,2).join('\n'),'sed range');
assert(run("echo alpha:beta | cut -d : -f2")==='beta','cut field');
assert(run("echo alpha beta | awk '{print $2}'")==='beta','awk field');
run('cd /home/analyst/training');
run('zip notes.zip notes.txt');
assert(run('unzip -l notes.zip')==='notes.txt','zip listing');
run('mkdir /home/analyst/unpacked');
run('unzip notes.zip -d /home/analyst/unpacked');
assert(state.fs['/home/analyst/unpacked/notes.txt']?.content===original,'zip round trip');
run('gzip /home/analyst/unpacked/notes.txt');
assert(!state.fs['/home/analyst/unpacked/notes.txt'],'gzip replaces original');
run('gunzip /home/analyst/unpacked/notes.txt.gz');
assert(state.fs['/home/analyst/unpacked/notes.txt']?.content===original,'gzip round trip');
const before=state;
run('export CASE_ID=QA');
assert(before.env.CASE_ID===undefined && run('printenv CASE_ID')==='QA','environment state isolation');
let server=createRoomState(rooms.find(room=>room.slug==='admin-web-logs'));
server=executeRoomCommand(rooms.find(room=>room.slug==='admin-web-logs'),server,"awk '{print $1}' /var/log/apache2/access-wordpress.log | sort | uniq -c > /root/summary.txt").state;
assert(server.fs['/root/summary.txt']?.content.includes('1452 192.168.56.101'),'server pipeline writes actual frequency');
assert(server.fs['/root/summary.txt']?.owner==='root','server output file owner');
const sqlRoom=rooms.find(room=>room.slug==='admin-mysql-queries');
let sqlState=createRoomState(sqlRoom);
for(const cmd of ['mysql -u root -p','wrong']) sqlState=executeRoomCommand(sqlRoom,sqlState,cmd).state;
assert(!sqlState.mysqlVerified,'wrong MySQL password rejected');
for(const cmd of ['mysql -u root -p','Admin1234!.','SELECT COUNT(*) FROM wp_users;']) sqlState=executeRoomCommand(sqlRoom,sqlState,cmd).state;
assert(!isTaskComplete(sqlRoom.tasks[2],sqlState),'failed query without database does not complete task');
assert(!sqlState.history.includes('Admin1234!.'),'password excluded from history');
assert(new Set(rooms.flatMap(room=>room.tasks.map(task=>task.id))).size===rooms.reduce((sum,room)=>sum+room.tasks.length,0),'unique task IDs');

console.log(`TOTAL ${rooms.length} rooms / ${rooms.reduce((n, r) => n + r.tasks.length, 0)} tasks / failures=${failures}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
