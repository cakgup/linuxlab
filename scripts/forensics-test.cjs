const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'linuxlab-forensics-'));
try{
  const build=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--ignoreConfig','--outDir',tmp,'--target','ES2020','--module','commonjs','--strict','lib/forensics-lab.ts','lib/curriculum-forensics.ts','lib/lab-session.ts','lib/validator.ts'],{stdio:'inherit'});
  assert.equal(build.status,0);
  const {createForensicsState,executeForensics,forensicCommands}=require(path.join(tmp,'forensics-lab.js'));
  const {forensicRooms,digitalCoverage}=require(path.join(tmp,'curriculum-forensics.js'));
  const {sha256}=require(path.join(tmp,'sha256.js'));
  const {isTaskComplete}=require(path.join(tmp,'validator.js'));
  const {completeRoomCommand}=require(path.join(tmp,'lab-session.js'));
  const {getCommandReference}=require(path.join(tmp,'command-reference.js'));
  const recipes=require('./forensics-recipes.cjs');
  const base='/home/analyst/forensics/';
  for(const text of ['', 'abc','abc\n','Jejak Digital · Bukti 🔍','a'.repeat(1000)])
    assert.equal(sha256(text),crypto.createHash('sha256').update(text).digest('hex'),'actual SHA-256 bytes');
  let commands=0;
  for(const room of forensicRooms){
    let state=createForensicsState();
    assert(room.notes.length>=2 && room.notes.every(note=>note.body.length>100),'substantive teaching notes');
    assert(room.commands.every(getCommandReference),'reference for each taught command');
    assert(room.tasks.every(task=>!isTaskComplete(task,state)),'no task initially completed');
    const originals=Object.fromEntries(Object.entries(state.fs).filter(([name])=>name.startsWith(base+'evidence/')).map(([name,node])=>[name,node.content]));
    const done=new Set();
    for(const command of recipes[room.slug]){
      const result=executeForensics(state,command);state=result.state;commands++;
      assert(!/not found|tidak ditemukan|FAILED|verifikasi gagal|format manifest salah|invalid input/.test(result.output),room.slug+': '+command+': '+result.output);
      for(const task of room.tasks)if(isTaskComplete(task,state))done.add(task.id);
    }
    assert.equal(done.size,4,room.slug);
    for(const [file,content]of Object.entries(originals))assert.equal(state.fs[file].content,content,'source evidence unchanged');
    console.log('PASS',room.slug,'4/4 tasks; source preserved');
  }
  let state=createForensicsState();
  const run=command=>{const result=executeForensics(state,command);state=result.state;return result.output;};
  assert(run('gpg --output work/mail.mbox --decrypt evidence/mail.enc').includes('No secret key'));
  assert(!state.fs[base+'work/mail.mbox']);
  run('gpg --import evidence/training-key.asc');
  run('gpg --output work/mail.mbox --decrypt evidence/mail.enc');
  assert(state.fs[base+'work/mail.mbox'].content.includes('Reply-To:'));
  run('gpg --output work/mail.mbox --decrypt evidence/mail.enc'); // repeated analysis can overwrite derived output
  assert(!run('cat work/mail.mbox').includes('LAB_PGP_ENCRYPTED_MAIL'));
  assert(run('steghide extract -sf evidence/banner.jpg -p WRONG -xf work/bad.txt').includes('could not extract'));
  assert(!state.fs[base+'work/bad.txt']);
  assert(run('tshark -r evidence/network.pcap -Y banana').includes('filter latihan'));
  assert(!state.history.some(line=>line.includes('-Y banana')),'failed analysis excluded from task history');
  assert.equal(run("tshark -r evidence/network.pcap -Y 'ip.addr == 203.0.113.99' -T fields -e ip.dst"),'','no matching packets');
  assert.equal(run("jq -r '.[] | select(.event == \"NetworkConnect\") | .dst_ip' evidence/events.json"),'192.0.2.44');
  assert.equal(run('jq length evidence/events.json'),'4','JSON count, not pretty-print line count');
  assert.equal(run("echo UkVWSUVX | base64 -d"),'REVIEW');
  assert(run('echo @@@ | base64 -d').includes('invalid input'));
  assert(run('./evidence/agent --disarm wrong:key').includes('verifikasi gagal'));
  run('sha256sum evidence/events.json > work/source.sha256');
  assert(run('sha256sum -c work/source.sha256').endsWith('OK'));
  run('echo tampered > evidence/events.json');
  assert(run('sha256sum -c work/source.sha256').endsWith('FAILED'),'tampered bytes detected');
  state=createForensicsState();
  run('mkdir work/device');run('7z x evidence/workstation.zip -owork/device');
  run('mkdir work/recovered');
  assert(run('7z x work/device/recovery.zip -pWRONG -owork/recovered').includes('arsip terenkripsi'));
  assert(!state.fs[base+'work/recovered/diary.docx']);
  assert(run('unzip work/device/recovery.zip -d work/recovered').includes('arsip terenkripsi'));
  run('7z x work/device/recovery.zip -pLAB-RECOVERY -owork/recovered');
  assert(run('unzip -p work/recovered/diary.docx word/document.xml').includes('pisahkan fakta'));
  assert(run('sqlite3 -readonly work/device/browser/places.sqlite "DELETE FROM moz_places;"').includes('subset'),'mutation not supported');
  assert.equal(completeRoomCommand(forensicRooms[0],state,'sha256s'),'sha256sum ');
  assert.equal(completeRoomCommand(forensicRooms[3],state,'tsha'),'tshark ');
  assert.equal(digitalCoverage.length,9);
  assert.deepEqual(digitalCoverage.map(item=>item.stage),[1,2,3,4,5,6,7,8,9]);
  for(const item of digitalCoverage)assert(item.rooms.length && item.rooms.every(slug=>forensicRooms.some(room=>room.slug===slug)));
  assert(forensicCommands.includes('memory'),'helper explicitly namespaced in forensic environment');
  console.log('PASS 9-stage coverage; actual SHA-256; '+commands+' walkthrough commands; wrong keys/passwords/filters; context; completion; no evidence mutation');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
