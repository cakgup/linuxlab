const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'linuxlab-warmup-audit-'));
try {
  const compile=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--ignoreConfig','--outDir',tmp,'--target','ES2020','--module','commonjs','--strict','lib/warm-up.ts','lib/warm-up-guide.ts'],{cwd:root,stdio:'inherit'});
  assert.equal(compile.status,0);
  const {createWarmUpState,executeWarmUp,checkWarmUpAnswer,warmUpQuestions,warmUpGroups}=require(path.join(tmp,'warm-up.js'));
  const {warmUpGuide,warmUpSessionAdvice}=require(path.join(tmp,'warm-up-guide.js'));
  const rows=[];
  const bad=/(command not found|ERROR \d|No such file|Belum terhubung|Ini shell Linux|Ini prompt MySQL|Permission denied)/;
  const sqlRows=text=>text.split('\n').filter(line=>line.startsWith('|')).slice(1).map(line=>line.split('|').slice(1,-1).map(value=>value.trim()));
  const match=(text,re)=>{const found=text.match(re);assert(found,`Evidence missing: ${re}\n${text}`);return found[1];};
  const newSession=()=>({state:createWarmUpState(),trace:[],dbPassword:'',lastSshPassword:'',lastDbPassword:''});
  function run(session,command) {
    const response=executeWarmUp(session.state,command);session.state=response.state;
    session.trace.push({command,output:response.output});
    const password=response.output.match(/define\('DB_PASSWORD',\s*'([^']+)'\)/);
    if(password)session.dbPassword=password[1];
    assert(!bad.test(response.output),`Unexpected command failure: ${command}\n${response.output}`);
    if(response.password) {
      const ssh=session.state.pending === 'ssh';
      // The SSH credential is supplied in the participant briefing; the DB credential must be discovered.
      const secret=ssh ? 'admin1234!' : session.dbPassword;
      assert(secret,'Database login attempted without obtaining DB_PASSWORD evidence');
      const auth=executeWarmUp(session.state,secret);session.state=auth.state;
      assert(!bad.test(auth.output) && (ssh ? auth.state.connected : auth.state.mysql),'Authentication did not succeed');
      if(ssh)session.lastSshPassword=secret;else session.lastDbPassword=secret;
      session.trace.push({command:'[password input hidden]',output:auth.output});
    }
    return response.output;
  }
  function recover(session,index) {
    for(let step=0;step<5;step++) {
      const advice=warmUpSessionAdvice(index,session.state);
      if(!advice.commands.length)return;
      for(const command of advice.commands)run(session,command);
    }
    assert.fail(`Session recovery loop on question ${index+1}`);
  }
  function investigate(session,index) {
    const start=session.trace.length;
    const commands=warmUpGuide(index).commands;
    const outputs=commands.map(command=>run(session,command));
    const last=outputs[outputs.length-1];
    let answer;
    switch(index) {
      case 0:assert(session.state.sshVerified);answer=session.lastSshPassword;break;
      case 1:answer=match(last,/OpenSSH_([^\s]+)/);break;
      case 2:answer=last.trim();break;
      case 3:answer=match(last,/^NAME="([^"]+)"/m);break;
      case 4:answer=match(last,/^VERSION="([^"]+)"/m);break;
      case 5:case 6:answer=last.trim();break;
      case 7:answer=match(last,/\d+: (?!lo:)([^: ]+):/);break;
      case 8: {
        const ports=outputs[0].split('\n').filter(line=>line.startsWith('LISTEN')).map(line=>match(line,/LISTEN\s+\d+\s+\d+\s+\S+:(\d+)\s/));
        answer=String(new Set(ports).size);
        assert.equal(last.trim(),answer,'The teaching pipeline must agree with the unique-port count');break;
      }
      case 9:answer=match(last,/^(\d+)\s/);break;
      case 10:answer=match(last,/^(\S+\.service)\s/);break;
      case 11:answer=match(last,/Apache\/([\d.]+)/);break;
      case 12:answer=match(last,/HTTPD_ROOT="([^"]+)"/);break;
      case 13:answer=match(last,/^(IncludeOptional\s+sites-enabled\/\*\.conf)$/m);break;
      case 14:case 15: {
        const directory=match(commands[0],/^ls\s+(\S+)$/);
        assert(last.includes('wordpress.conf'),'The expected virtual-host file must be discoverable');
        run(session,'cd '+directory);answer=run(session,'pwd').trim();break;
      }
      case 16:answer=match(last,/DocumentRoot\s+(\S+)/);break;
      case 17:answer=match(last,/APACHE_LOG_DIR=(\S+)/);break;
      case 18:answer=match(last,/CustomLog\s+\$\{APACHE_LOG_DIR\}\/([^\s]+)/);break;
      case 19:answer=match(last,/^([\d.]+)\s/);break;
      case 20:answer=match(last,/^(\d+)$/);break;
      case 21:answer=match(last,/\/usr\/sbin\/(mysqld)\s/);break;
      case 22:answer=match(last,/Ver\s+([\d.]+)/);break;
      case 23:answer=match(last,/127\.0\.0\.1:(\d+)/);break;
      case 24:assert(session.state.mysqlVerified);answer=session.lastDbPassword;break;
      case 25:answer=String(sqlRows(last).length);break;
      case 26: {
        const apps=sqlRows(last).map(row=>row[0]).filter(name=>!['information_schema','mysql','performance_schema'].includes(name));
        assert.equal(apps.length,1,'Application database must be distinguishable');answer=apps[0];break;
      }
      case 27: {
        const users=sqlRows(last).map(row=>row[0]).filter(name=>/_users$/.test(name));
        assert.equal(users.length,1);answer=users[0];break;
      }
      case 28:answer=sqlRows(last)[0][0];break;
      case 29:answer=match(last,/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);break;
      default:assert.fail('Question not audited');
    }
    assert(checkWarmUpAnswer(index,answer),`Question ${index+1}: answer derived from actual evidence was rejected: ${answer}`);
    assert(!checkWarmUpAnswer(index,'wrong-answer'),`Question ${index+1}: invalid answer was accepted`);
    return {answer,trace:session.trace.slice(start)};
  }
  const sequential=newSession();
  for(let index=0;index<warmUpQuestions.length;index++) {
    const result=investigate(sequential,index);
    const resumed=newSession();recover(resumed,index);
    const recovered=investigate(resumed,index);
    assert.equal(recovered.answer,result.answer,`Reload changes evidence for question ${index+1}`);
    rows.push({number:index+1,title:warmUpQuestions[index].title,group:warmUpGroups[warmUpQuestions[index].group],sequential:'PASS',freshSession:'PASS',derivedAnswer:result.answer,commands:result.trace});
    console.log(`PASS ${String(index+1).padStart(2,'0')} ${warmUpQuestions[index].title} | sequential + fresh-session evidence`);
  }
  const output={checkedAt:new Date().toISOString(),questions:rows.length,scenarios:rows.length*2,failed:0,scope:'Browser simulator; answers derived from command output, not an answer-key lookup',results:rows};
  fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
  fs.writeFileSync(path.join(root,'tmp/warm-up-validation.json'),JSON.stringify(output,null,2)+'\n');
  if(process.argv.includes('--report')) {
    const date=new Intl.DateTimeFormat('id-ID',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date());
    const report=['# Validasi CTF Warm Up','',`Diperiksa: ${date} WIB.`, '',`**Hasil: ${rows.length}/30 soal lulus; ${rows.length*2}/60 skenario lulus; 0 kegagalan.**`,'',
      'Setiap soal dijalankan secara berurutan dari sesi awal, lalu diulang dari sesi baru untuk meniru kondisi reload. Pemulihan SSH, login MySQL, dan pemilihan database mengikuti arahan yang tampil bagi peserta. Jawaban diturunkan dari keluaran perintah, bukan disalin dari kunci jawaban. Password SSH berasal dari briefing; password database dibaca melalui konfigurasi aplikasi dan dibuktikan dengan login.', '',
      '| No. | Profil | Soal | Berurutan | Sesi baru / reload |','| --- | --- | --- | --- | --- |',
      ...rows.map(row=>`| ${row.number} | ${row.group} | ${row.title} | Lulus | Lulus |`),'',
      '## Batas dan bukti','',
      '- Yang divalidasi adalah lingkungan simulasi LinuxLab, bukan server/VM eksternal.',
      '- Bukti lengkap keluaran perintah dan jawaban hasil ekstraksi disimpan lokal di `tmp/warm-up-validation.json` (diabaikan Git). Laporan ini tidak menampilkan kunci jawaban.',
      '- Skenario negatif, password salah, SQL pada sesi yang keliru, query belum selesai, pembatalan query, dan progres rusak tetap diperiksa oleh `npm run test:warm-up`.',
      '- Jalankan ulang dengan `npm run test:warm-up:audit`; tambahkan `-- --report` untuk memperbarui laporan ini.', ''];
    fs.writeFileSync(path.join(root,'docs/WARM_UP_VALIDATION.md'),report.join('\n'));
  }
  console.log(`TOTAL ${rows.length}/30 questions | ${rows.length*2}/60 evidence-based scenarios | failures=0`);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
