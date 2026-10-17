const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linuxlab-laser-'));
try {
  const compile = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig', '--outDir', tmp, '--target', 'ES2020', '--module', 'commonjs', '--strict', '--skipLibCheck', 'lib/laser-shell.ts', 'lib/laser-levels.ts'], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
  assert.equal(compile.status, 0, 'Laser TypeScript compilation');
  const { cancelLaserAuthentication, createLaserState, executeLaser: executeBase, completeLaser } = require(path.join(tmp, 'laser-shell.js'));
  const zlib = require('node:zlib');
  const { laserVmNodes } = require(path.join(tmp, 'laser-vm-fixtures.js'));
  function executeLaser(input, line) {
    while (true) {
      const result = executeBase(input, line);
      if (!result.needsFile) return result;
      const node = input.fs[result.needsFile];
      const bytes = zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname, '../public/ctf/linux-vm', node.blob)));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), node.digests.sha256sum);
      input = { ...input, fs: { ...input.fs, [node.path]: { ...node, content: bytes.toString(node.binary ? 'latin1' : 'utf8') } } };
    }
  }
  const { laserLevels, readLaserProgress, migrateLaserProgress } = require(path.join(tmp, 'laser-levels.js'));
  const { laserChecksums } = require(path.join(tmp, 'laser-checksums.js'));
  assert.equal(laserLevels.length, 31);
  assert.deepEqual(laserLevels.map(v => v.points), [100,100,100,100,100,100,5,50,50,20,30,60,30,20,40,40,50,50,60,50,50,50,40,40,40,40,5,5,5,5,5]);
  for (let index = 0; index < laserLevels.length - 1; index++) {
    const state = createLaserState(index);
    const command = `su level${index + 1}`;
    const challenge = executeLaser(state, command);
    assert.equal(challenge.switchLevel, undefined, `Level ${index} must request a password first`);
    assert.equal(challenge.state.level, index);
    assert.equal(challenge.password, true);
    assert.equal(challenge.state.pendingSu, index + 1);
    const password = laserLevels[index].flag.slice("Cakgup{".length, -1);
    for (const wrong of ['', 'salah', laserLevels[index].flag, password + ' ', `su level${index + 2}`]) {
      const denied = executeLaser(challenge.state, wrong);
      assert.equal(denied.switchLevel, undefined);
      assert.equal(denied.state.level, index);
      assert.equal(denied.state.pendingSu, undefined);
      assert.equal(denied.output, 'su: Authentication failure');
      assert.deepEqual(denied.state.history, [command], 'Password must not be recorded in command history');
    }
    const cancelled = cancelLaserAuthentication(challenge.state);
    assert.equal(cancelled.pendingSu, undefined);
    assert.equal(executeLaser(cancelled, 'whoami').output, `level${index}`);
    const allowed = executeLaser(challenge.state, password);
    assert.equal(allowed.switchLevel, index + 1);
    assert.equal(allowed.state.level, index + 1);
    assert.equal(allowed.state.cwd, `/home/level${index}`, 'Plain su retains the original working directory');
    assert(executeLaser(allowed.state, 'ls').output.includes('Permission denied'));
    assert.equal(executeLaser(allowed.state, 'cd').state.cwd, `/home/level${index + 1}`);
    assert.equal(executeLaser(allowed.state, 'whoami').output, `level${index + 1}`);
    assert.equal(state.level, index, 'su must not mutate the previous state');
  }
  for (const command of ['su', 'su root', 'su level1 extra', 'su level1 | cat', 'su level1 > result.txt']) {
    const rejected = executeLaser(createLaserState(0), command);
    assert.equal(rejected.switchLevel, undefined, `Reject invalid or nonsequential switch: ${command}`);
    assert.equal(rejected.password, undefined);
  }
  assert.equal(executeLaser(createLaserState(0), 'su - level1').password, true);
  assert.equal(executeLaser(executeLaser(createLaserState(0), 'su - level1').state, 'sangatmudah').state.cwd, '/home/level1');
  assert.equal(executeLaser(executeLaser(createLaserState(0), 'su level30').state, 'kauyangterakhir').state.level, 30);
  assert.equal(executeLaser(createLaserState(30), 'su level31').switchLevel, undefined);
  assert.equal(executeLaser(createLaserState(30), 'su level31').password, undefined);
  for (const [index, level] of laserLevels.entries()) {
    let state = createLaserState(index), output = '';
    for (const command of level.solution) {
      let result = executeLaser(state, command);
      if (result.state.pendingSudo) result = executeLaser(result.state, 'kauyangterakhir');
      state = result.state; output += result.output + '\n';
    }
    assert(output.replace(/\s/g, '').includes(level.flag), `Level ${index} not solvable: ${output}`);
    assert.equal(state.history.length, level.solution.length, `Level ${index} history`);
  }
  for (const [content, sums] of Object.entries(laserChecksums)) {
    for (const [command, digest] of Object.entries(sums)) {
      const algorithm = { md5sum:'md5', sha1sum:'sha1', sha256sum:'sha256', sha512sum:'sha512' }[command];
      assert.equal(digest, crypto.createHash(algorithm).update(content).digest('hex'));
    }
  }
  for (let i = 24; i <= 27; i++) {
    const s = createLaserState(i), algorithm = ['md5sum','sha1sum','sha256sum','sha512sum'][i-24];
    const digest = laserChecksums[laserLevels[i].flag+'\n'][algorithm];
    assert(laserLevels[i].mission.includes(digest), `Level ${i} target hash mismatch`);
  }
  assert(executeLaser(createLaserState(30), 'cat flag.txt').output.includes('Permission denied'));
  assert(executeLaser(createLaserState(30), 'grep Cakgup /root/GoldenTiket.txt').output.includes('Permission denied'));
  const permissionStart = createLaserState(12);
  assert(executeLaser(permissionStart, 'cat flag.txt').output.includes('Permission denied'));
  const readable = executeLaser(permissionStart, 'chmod u+r flag.txt').state;
  assert.equal(executeLaser(readable, 'cat flag.txt').output.trim(), laserLevels[12].flag);
  assert.equal(permissionStart.fs['/home/level12/flag.txt'].mode, 0o000);
  const sudoChallenge = executeLaser(createLaserState(30), 'sudo su');
  assert.equal(sudoChallenge.password, true);
  assert.equal(sudoChallenge.state.root, false);
  assert.equal(executeLaser(sudoChallenge.state, 'salah').state.root, false);
  let rootState = executeLaser(sudoChallenge.state, 'kauyangterakhir').state;
  assert.equal(rootState.root, true);
  assert.equal(executeLaser(rootState, 'whoami').output, 'root');
  assert(!executeLaser(rootState, 'cat flag.txt').output.includes(laserLevels[30].flag));
  const ticket = executeLaser(rootState, 'cat /root/GoldenTiket.txt').output;
  assert(ticket.includes(laserLevels[30].flag));
  assert(ticket.includes('User: Laser') && ticket.includes('Pass: #KuinginTauSiapaNamamu'));
  const decrypted = executeLaser(createLaserState(29), 'gpg --batch --passphrase 12345678 --output flag.txt --decrypt flag.txt.gpg');
  assert.equal(executeLaser(decrypted.state, 'cat flag.txt').output.trim(), laserLevels[29].flag);
  assert(executeLaser(createLaserState(2), 'sudo cat flag.txt').output.includes('tidak memiliki'));
  assert(executeLaser(createLaserState(29), 'gpg --passphrase salah --output flag.txt --decrypt flag.txt.gpg').output.includes('failed'));
  assert(!executeLaser(createLaserState(29), 'cat flag.txt').output.includes(laserLevels[29].flag));
  assert(!executeLaser(createLaserState(19), 'cat flag.txt').output.includes(laserLevels[19].flag));
  assert.equal(executeLaser(createLaserState(3), 'cat file\\ flag.txt').output.trim(), laserLevels[3].flag);
  assert.equal(executeLaser(createLaserState(3), "cat 'file flag.txt'").output.trim(), laserLevels[3].flag);
  assert.equal(executeLaser(createLaserState(14), 'cat -- -flag').output.trim(), laserLevels[14].flag);
  assert(executeLaser(createLaserState(14), 'cat -flag').output.includes('invalid option'));
  assert(executeLaser(createLaserState(9), 'head flag.txt').output.includes(laserLevels[9].flag));
  assert(executeLaser(createLaserState(9), 'head -n10 flag.txt').output.includes(laserLevels[9].flag));
  assert(executeLaser(createLaserState(10), 'tail flag.txt').output.includes(laserLevels[10].flag));
  assert(executeLaser(createLaserState(22), 'grep Cakgup flag*.txt').output.includes(laserLevels[22].flag));
  assert.equal(executeLaser(createLaserState(13), 'cat flag.txt | grep Cakgup | wc -l').output, '1');
  assert.equal(completeLaser(createLaserState(4), 'cat naM4'), 'cat naM4_Fil3_iNi_s4ngat_PaNjanG_dAn_rUm1T_t4p1_aD4_car4_c3PaT.txt ');
  assert.equal(completeLaser(createLaserState(0), 'ca'), 'cat ');
  assert.equal(completeLaser(createLaserState(0), 'cat /home/level1/'), 'cat /home/level1/');
  assert.equal(completeLaser(createLaserState(3), 'cat fi'), 'cat file\\ flag.txt ');
  assert(executeLaser(createLaserState(3), 'cat "file flag.txt').output.includes('kutip'));
  assert.equal(executeLaser(createLaserState(5), 'cd ~').state.cwd, '/home/level5');
  const initial = createLaserState(22);
  const changed = executeLaser(initial, 'cat flag*.txt > test.txt');
  assert(!initial.fs['/home/level22/test.txt'], 'Input state must be immutable');
  assert(changed.state.fs['/home/level22/test.txt'].content.includes(laserLevels[22].flag));
  for (const invalid of [null, 'bad', 'null', '{}', '-1', '33', '1.5', '"8"']) assert.equal(readLaserProgress(invalid), 0);
  assert.equal(readLaserProgress('31'), 31);
  assert.equal(readLaserProgress('32'), 0);
  assert.equal(executeLaser(createLaserState(0), 'id').output, 'uid=1001(level0) gid=1001(level0) groups=1001(level0)');
  assert(executeLaser(createLaserState(0), 'echo test > /etc/test.txt').output.includes('Permission denied'));
  assert(executeLaser(createLaserState(0), 'echo test > /home/level1/test.txt').output.includes('Permission denied'));
  assert.equal(executeLaser(createLaserState(0), 'cat Cakgup{sangatmudah}').output, '/dev/null\n');
  assert.equal(executeLaser(createLaserState(0), 'cat /home/level2/flag.txt').output.includes('Permission denied'), true);
  for (const node of laserVmNodes.filter(n => n.type === 'file')) {
    const bytes = node.blob ? zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname, '../public/ctf/linux-vm', node.blob))) : Buffer.from(node.content, node.binary ? 'latin1' : 'utf8');
    assert.equal(bytes.length, node.size, node.path);
    assert(!node.path.includes('Laser' + '{'), node.path);
    assert(!bytes.includes(Buffer.from('Laser' + '{')), node.path);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), node.digests.sha256sum, node.path);
  }
  assert.equal(migrateLaserProgress('32'), 31);
  assert.equal(migrateLaserProgress('31'), 30);
  assert.equal(migrateLaserProgress('12'), 12);
  assert.equal(migrateLaserProgress('invalid'), 0);
  console.log('PASS: 31 PDF-aligned Laser walkthroughs, scores, su authentication, chmod, GPG, root finale, checksums and progress migration.');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
