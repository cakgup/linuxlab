'use strict';
(() => {
  const key = 'linuxlab-mofcg-ctf-v1';
  const $ = id => document.getElementById(id);
  const show = (id, visible) => { const el = $(id); if (el) { el.hidden = !visible; el.classList.toggle('hidden', !visible); } };
  const fresh = () => ({ started:false, solved:0, bonus:false, advanced:0, penalty:0, history:[] });
  let state = fresh();
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isInteger(saved.solved) && saved.solved >= 0 && saved.solved <= 5 && Array.isArray(saved.history)) {
      state = { started:!!saved.started, solved:saved.solved, bonus:saved.solved === 5 && !!saved.bonus, advanced:saved.solved===5 && saved.bonus && Number.isInteger(saved.advanced) ? Math.max(0,Math.min(3,saved.advanced)) : 0, penalty:Math.max(0, Number(saved.penalty) || 0), history:saved.history.slice(-200) };
    }
  } catch { storageAvailable = false; }
  const points = {6:500,7:1500,8:2500,9:3000};
  const completed = () => state.solved + Number(state.bonus) + state.advanced;
  const isSolved = stage => stage<=5 ? state.solved>=stage : stage===6 ? state.bonus : state.advanced>=stage-6;
  const isUnlocked = stage => state.started && (stage===1 || isSolved(stage-1));
  const score = () => state.solved * 1000 + (state.bonus ? 500 : 0) + [0,1500,4000,7000][state.advanced] - state.penalty;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch { storageAvailable = false; } };
  const downloads = [];
  $('labScheduleBanner').innerHTML = '<div><span class="bg-emerald-500 text-black text-xs font-bold px-2 py-1 rounded">MODE LATIHAN</span><p class="text-sm mt-2">Selesaikan 9 tahapan: investigasi awal, Token Nexus, memori, rekayasa balik, dan forensik workstation.</p></div><div class="bg-black/50 p-3 rounded text-xs font-mono text-emerald-300">OPERASI JEJAK DIGITAL<br>AKSES LATIHAN TANPA BATAS WAKTU</div>';
  document.querySelectorAll('[class*="stage-dl-btn-"]').forEach(button => {
    const stage = Number(button.className.match(/stage-dl-btn-(\d)/)?.[1]);
    const file = button.textContent.match(/EVD-[\w.-]+/)?.[0];
    if (!file || !stage) return;
    const link = document.createElement('a');
    link.className = button.className + ' local-download';
    link.innerHTML = button.innerHTML;
    link.download = file;
    const url = `evidence/Stage${stage}/${file}`;
    button.replaceWith(link);
    downloads.push({link, stage, url});
  });
  document.querySelectorAll('[data-evidence-stage]').forEach(link => downloads.push({link,stage:Number(link.dataset.evidenceStage),url:link.getAttribute('href')}));
  // Reference capture was made after completion. Remove its stale completion styling.
  for (let i=1;i<=5;i++) {
    const card = $(`cardStage${i}`);
    card.className = card.className.split(/\s+/).filter(c => !/^(border-emerald|bg-emerald|shadow-emerald|ring-)/.test(c)).join(' ');
    $(`flagInput${i}`).setAttribute('aria-label', `Flag Stage ${i}`);
    $(`btnStage${i}`).classList.remove('opacity-50', 'cursor-not-allowed');
    $(`formStage${i}`).addEventListener('submit', event => submit(event,i));
  }
  $('flagInputBonus').setAttribute('aria-label','Token rahasia bonus');
  $('formStageBonus').addEventListener('submit', event => submit(event,6));
  for(let i=7;i<=9;i++) {
    $(`flagInput${i}`).setAttribute('aria-label',`Flag Stage ${i}`);
    $(`btnStage${i}`).classList.remove('opacity-50','cursor-not-allowed');
    $(`formStage${i}`).addEventListener('submit',event=>submit(event,i));
  }
  document.querySelectorAll('[id^="fb"]').forEach(el => { el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); });
  function render() {
    $('localScore').textContent = `Skor: ${score()}${storageAvailable ? '' : ' • penyimpanan tidak tersedia'}`;
    $('localStages').textContent = `${completed()} / 9`;
    $('localPoints').textContent = String(score());
    $('pipelineProgressText').textContent = `Progres: ${completed()} / 9 Stage Selesai (${Math.round(completed()/9*100)}%)${completed()===9 ? ' • OPERASI TUNTAS 100%' : ''}`;
    show('operationGate',!state.started);
    show('operationActiveBanner',state.started);
    show('briefingNarrativeSection',state.started);
    for(let i=1;i<=5;i++) {
      const solved = state.solved >= i;
      const unlocked = state.started && state.solved >= i-1;
      show(`lockOverlayStage${i}`, !unlocked);
      show(`formStage${i}`,unlocked && !solved);
      show(`solvedBannerStage${i}`,solved);
      show(`bodyStage${i}`,unlocked);
      $(`bodyStage${i}`).inert = !unlocked;
      $(`cardStage${i}`).classList.toggle('local-locked',!unlocked);
      $(`flagInput${i}`).disabled = !unlocked || solved;
      $(`btnStage${i}`).disabled = !unlocked || solved;
      $(`cardStage${i}`).classList.toggle('local-complete',solved);
      $(`pipeNode${i}`).classList.toggle('local-complete',solved);
      $(`pipeNode${i}`).classList.toggle('local-pending',!unlocked);
      $(`pipeNode${i}`).classList.toggle('local-active',unlocked && !solved);
      $(`pipeBadge${i}`).textContent = solved ? '✓ SELESAI' : unlocked ? 'AKTIF' : 'TERKUNCI';
      $(`badgeStateStage${i}`).textContent = solved ? '✓ SELESAI' : unlocked ? 'AKTIF' : 'TERKUNCI';
    }
    $('lockBadgeStage1').textContent = 'TAHAP 1 TERKUNCI';
    $('lockDescStage1').textContent = 'Inisiasi operasi dan baca briefing untuk memulai investigasi.';
    downloads.forEach(({link,stage,url}) => {
      const unlocked = isUnlocked(stage);
      if(unlocked) link.setAttribute('href',url); else link.removeAttribute('href');
      link.setAttribute('aria-disabled',String(!unlocked));
      link.tabIndex = unlocked ? 0 : -1;
    });
    show('stageCardBonus',true);
    show('lockOverlayStageBonus',!isUnlocked(6));
    show('bodyStageBonus',isUnlocked(6));
    $('bodyStageBonus').inert=!isUnlocked(6);
    $('stageCardBonus').classList.toggle('local-locked',!isUnlocked(6));
    show('formStageBonus',isUnlocked(6)&&!state.bonus);
    $('flagInputBonus').disabled = !isUnlocked(6) || state.bonus;
    $('btnStageBonus').disabled = !isUnlocked(6) || state.bonus;
    show('solvedBannerStageBonus',state.bonus);
    $('badgeStageBonus').textContent = state.bonus ? 'BONUS SOLVED' : isUnlocked(6) ? 'BONUS TERBUKA' : 'TERKUNCI — SELESAIKAN STAGE 5';
    for(let i=6;i<=9;i++) {
      const solved=isSolved(i), unlocked=isUnlocked(i);
      $(`pipeNode${i}`).classList.toggle('local-complete',solved);
      $(`pipeNode${i}`).classList.toggle('local-pending',!unlocked);
      $(`pipeNode${i}`).classList.toggle('local-active',unlocked&&!solved);
      $(`pipeBadge${i}`).textContent=solved?'✓ SELESAI':unlocked?'AKTIF':'TERKUNCI';
      if(i===6) continue;
      show(`lockOverlayStage${i}`,!unlocked);
      show(`bodyStage${i}`,unlocked);
      $(`bodyStage${i}`).inert=!unlocked;
      $(`cardStage${i}`).classList.toggle('local-locked',!unlocked);
      show(`formStage${i}`,unlocked&&!solved);
      show(`solvedBannerStage${i}`,solved);
      $(`flagInput${i}`).disabled=!unlocked||solved;
      $(`btnStage${i}`).disabled=!unlocked||solved;
      $(`cardStage${i}`).classList.toggle('local-complete',solved);
      $(`badgeStateStage${i}`).textContent=solved?'✓ SELESAI':unlocked?'AKTIF':'TERKUNCI';
    }
    $('btnGasken').textContent = 'GASKEN — MULAI ANALISIS BUKTI';
    $('btnGasken').disabled = false;
    show('modalMySubmissions',false);
    document.body.style.visibility = 'visible';
  }
  async function submit(event,stage) {
    event.preventDefault();
    if(!isUnlocked(stage) || isSolved(stage)) return;
    const suffix = stage===6 ? 'Bonus' : String(stage);
    const input = $('flagInput'+suffix);
    const feedback = $('fb'+suffix);
    const button = $('btnStage'+suffix);
    const value = input.value.trim();
    if (!value) return;
    button.disabled = true;
    try {
      const response = await fetch('answers.json',{cache:'no-store'});
      if(!response.ok) throw new Error('configuration');
      const answers = await response.json();
      const expected = answers[stage];
      if(!expected) {
        feedback.textContent = 'Kunci jawaban tahap ini sedang disiapkan. Jawaban belum dinilai dan tidak dikenakan penalti.';
        return;
      }
      const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
      const digest = Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
      const correct = digest===expected;
      state.history.push({time:new Date().toISOString(),stage,correct});
      state.history = state.history.slice(-200);
      if(correct) { if(stage===6) state.bonus=true; else if(stage>=7) state.advanced=stage-6; else state.solved=stage; }
      else state.penalty+=stage===9?100:10;
      save(); render();
      feedback.textContent = correct ? (stage===9?'Operasi tuntas! Seluruh 9 stage terverifikasi.':`Flag terverifikasi. +${points[stage]||1000} poin. Tahap berikutnya terbuka!`) : `Flag belum tepat. Penalti −${stage===9?100:10} poin. Periksa kembali bukti dan token jawaban.`;
      feedback.style.color = correct ? '#6ee7b7' : '#fca5a5';
      input.value = '';
    } catch {
      feedback.textContent = 'Validasi belum tersedia. Coba kembali; tidak ada penalti.';
    } finally { button.disabled = !isUnlocked(stage) || isSolved(stage); }
  }
  const start = () => { state.started=true; save(); render(); $('briefingNarrativeSection').scrollIntoView({behavior:'smooth'}); };
  $('btnStartOperation').disabled = false;
  $('btnStartOperation').addEventListener('click',start);
  $('btnStartText').textContent = 'INISIASI OPERASI';
  $('operationGateDesc').textContent = 'Aktifkan transmisi dossier, baca briefing CISO, lalu mulai investigasi Jejak Digital.';
  $('operationGateBadge').textContent = 'SISTEM SIAP';
  $('gateCountdownLabel').textContent = 'MODE LATIHAN';
  $('gateCountdownClock').textContent = 'TANPA BATAS WAKTU';
  $('btnGasken').addEventListener('click',()=>$('cardStage1').scrollIntoView({behavior:'smooth'}));
  const replay = document.querySelector('#operationActiveBanner button');
  if(replay) replay.addEventListener('click',()=>{state.started=false;save();render();$('operationGate').scrollIntoView({behavior:'smooth'});});
  const narrative = $('briefingTypewriterTarget');
  const narrativeText = [];
  const walker = document.createTreeWalker(narrative, NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) narrativeText.push([walker.currentNode,walker.currentNode.nodeValue]);
  let animation;
  const finishTyping = () => { clearInterval(animation); narrativeText.forEach(([node,text])=>node.nodeValue=text); };
  $('btnReplayTyping').addEventListener('click',()=>{
    finishTyping();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    narrativeText.forEach(([node])=>node.nodeValue='');
    let index=0,offset=0;
    animation=setInterval(()=>{
      const [node,text]=narrativeText[index];
      offset+=12;node.nodeValue=text.slice(0,offset);
      if(offset>=text.length){index++;offset=0;}
      if(index>=narrativeText.length) finishTyping();
    },20);
  });
  $('btnSkipTyping').addEventListener('click',finishTyping);
  document.querySelector('#announcementBanner button')?.addEventListener('click',()=>show('announcementBanner',false));
  $('historyButton').addEventListener('click',()=>{
    const tbody=$('mySubmissionsTableBody');
    tbody.replaceChildren();
    if(!state.history.length) { const row=tbody.insertRow(); const cell=row.insertCell();cell.colSpan=4;cell.textContent='Belum ada pengumpulan flag.'; }
    state.history.slice().reverse().forEach(item=>{
      const row=tbody.insertRow();
      [new Date(item.time).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}),item.stage===6?'Stage 6 (Bonus)':`Stage ${item.stage}`,item.correct?'VALID':'SALAH',item.correct?'0':item.stage===9?'−100':'−10'].forEach(text=>{row.insertCell().textContent=text;});
    });
    show('modalMySubmissions',true); $('modalMySubmissions').setAttribute('aria-modal','true');$('modalMySubmissions').setAttribute('role','dialog');
    document.querySelector('#modalMySubmissions button')?.focus();
  });
  const closeHistory=()=>{show('modalMySubmissions',false);$('historyButton').focus();};
  document.querySelector('#modalMySubmissions button')?.addEventListener('click',closeHistory);
  $('modalMySubmissions').addEventListener('click',e=>{if(e.target===$('modalMySubmissions')) closeHistory();});
  document.addEventListener('keydown',e=>{
    const modal=$('modalMySubmissions');
    if(modal.hidden) return;
    if(e.key==='Escape') closeHistory();
    if(e.key==='Tab') { e.preventDefault(); modal.querySelector('button')?.focus(); }
  });
  // Correct inherited server-only help text.
  const auditNote=$('modalMySubmissions').querySelector('p:last-child');
  if(auditNote?.textContent.includes('Plaintext')) auditNote.textContent='Riwayat disimpan di browser ini. Isi flag tidak disimpan.';
  const resetDialog=document.createElement('dialog');
  resetDialog.className='cyber-card rounded-lg p-6 text-gray-200';
  resetDialog.innerHTML='<form method="dialog" class="space-y-4"><h2 class="font-bold" id="resetTitle">Reset latihan CTF?</h2><p class="text-sm">Seluruh progres CTF, skor, dan riwayat pada browser ini akan dihapus.</p><div class="flex justify-end gap-4"><button value="cancel">Batal</button><button value="reset" class="text-red-300">Hapus progres CTF</button></div></form>';
  resetDialog.setAttribute('aria-labelledby','resetTitle');
  document.body.append(resetDialog);
  $('resetButton').addEventListener('click',()=>resetDialog.showModal());
  resetDialog.addEventListener('close',()=>{
    if(resetDialog.returnValue!=='reset') return;
    state=fresh();save();render();
    document.querySelectorAll('[id^="fb"]').forEach(el=>el.textContent='');
    window.scrollTo({top:0,behavior:'smooth'});
  });
  render();
})();
