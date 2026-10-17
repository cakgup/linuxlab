"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Copy, Flag, Lightbulb, Lock, RotateCcw, Trophy } from "lucide-react";
import { cancelWarmUpAuthentication, checkWarmUpAnswer, completeWarmUp, createWarmUpState, executeWarmUp, readWarmUpProgress, warmUpGroups, warmUpQuestions, WARM_UP_PROGRESS_KEY } from "@/lib/warm-up";
import { BrowserTerminal } from "./BrowserTerminal";
import { Nav } from "./Nav";
import { warmUpGuide, warmUpSessionAdvice } from "@/lib/warm-up-guide";

function CommandSteps({ commands }: { commands: string[] }) {
  const [copied,setCopied] = useState("");
  const [error,setError] = useState("");
  async function copy(command:string) {
    try { await navigator.clipboard.writeText(command);setCopied(command);setError(""); }
    catch { setError("Blok teks perintah lalu salin secara manual."); }
  }
  return <><ol className="warm-up-commands">{commands.map((command,i)=><li key={`${i}-${command}`}><code>{command}</code><button type="button" className="btn" onClick={()=>copy(command)} aria-label={`Salin perintah ${command}`}><Copy size={13} />{copied === command ? "Tersalin" : "Salin"}</button></li>)}</ol>{error && <p className="small" role="status">{error}</p>}</>;
}

export function WarmUpCtf() {
  const [completed,setCompleted] = useState<number[]>([]);
  const [active,setActive] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const [answer,setAnswer] = useState("");
  const [hint,setHint] = useState(0);
  const [feedback,setFeedback] = useState("");
  const [error,setError] = useState("");
  const [reset,setReset] = useState(0);
  const state = useRef(createWarmUpState());
  const [sessionState,setSessionState] = useState(state.current);
  const {cwd,connected,mysql} = sessionState;
  const answerRef=useRef<HTMLInputElement>(null);
  const missionRef=useRef<HTMLElement>(null);
  const mapRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    let done:number[]=[];
    try { done=readWarmUpProgress(localStorage.getItem(WARM_UP_PROGRESS_KEY)); }
    catch { setError("Penyimpanan browser tidak tersedia. Progres berlaku selama sesi ini."); }
    setCompleted(done);setActive(Math.max(0,warmUpQuestions.findIndex((_,i)=>!done.includes(i))));setLoaded(true);
  },[]);
  useEffect(()=>{
    const map=mapRef.current;
    const current=map?.querySelector<HTMLButtonElement>('[aria-current="step"]');
    if (!map || !current) return;
    const bounds=map.getBoundingClientRect(), item=current.getBoundingClientRect();
    if (item.top < bounds.top || item.bottom > bounds.bottom) map.scrollTop += item.top-bounds.top-20;
  },[active,loaded]);
  const question=warmUpQuestions[active];
  const firstPending=warmUpQuestions.findIndex((_,i)=>!completed.includes(i));
  const finished=completed.length === warmUpQuestions.length;
  const solved=completed.includes(active);
  const guide=warmUpGuide(active);
  const sessionAdvice=warmUpSessionAdvice(active,sessionState);
  function persist(done:number[]) {
    try { localStorage.setItem(WARM_UP_PROGRESS_KEY,JSON.stringify(done));setError(""); }
    catch { setError("Progres tidak dapat disimpan di browser. Jangan tutup halaman untuk mempertahankan sesi."); }
  }
  function resetGame() {
    setCompleted([]);setActive(0);setAnswer("");setHint(0);setFeedback("");persist([]);
    state.current=createWarmUpState();setSessionState(state.current);setReset(v=>v+1);
  }
  function select(index:number) { setActive(index);setAnswer("");setHint(0);setFeedback("");requestAnimationFrame(()=>missionRef.current?.focus()); }
  function submit(event:FormEvent) {
    event.preventDefault();
    if ((active === 0 && !state.current.sshVerified) || (active === 24 && !state.current.mysqlVerified)) { setFeedback(active === 0 ? "Login SSH di terminal terlebih dahulu untuk memverifikasi akses." : "Login MySQL di terminal terlebih dahulu untuk memverifikasi password.");answerRef.current?.focus();return; }
    if (!checkWarmUpAnswer(active,answer)) {
      const detail=active === 22 && answer.includes("5.5") ? "Angka setelah Distrib adalah versi distribusi/server. Ambil versi klien setelah Ver." : question.exact ? active === 0 ? "Password SSH diawali a kecil dan diakhiri tanda seru (!), tanpa titik." : "Password MySQL diawali A besar dan memiliki tanda titik terakhir. Password SSH dan MySQL berbeda." : guide.format;
      setFeedback(`Jawaban belum tepat. ${detail} Buka petunjuk jika perlu; percobaan salah tidak mengurangi poin.`);answerRef.current?.focus();return;
    }
    const done=[...new Set([...completed,active])];setCompleted(done);persist(done);setAnswer("");setHint(0);
    setFeedback(`Temuan ${active+1} terverifikasi. +${solved ? 0 : 50} poin. Baca penjelasan, lalu lanjutkan ke temuan berikutnya.`);
  }
  return <div className="shell"><Nav /><main className="container laser-main warm-up-main">
    <header className="laser-heading"><div><span className="eyebrow">CTF 2 · investigasi server</span><h1>CTF <span>Warm Up</span></h1><p>Kenali server, telusuri konfigurasi web, lalu buktikan temuan melalui log dan database.</p></div><div className="laser-hint-actions"><Link className="btn" href="/ctf/arena/">Semua CTF</Link><button className="btn" disabled={!loaded} onClick={resetGame} title="Hapus progres Warm Up dan mulai dari temuan pertama"><RotateCcw size={14} />Reset Warm Up</button></div></header>
    <div className="laser-overview"><span><Flag size={16} />30 tantangan · 3 profil</span><span><CheckCircle2 size={16} />{completed.length}/30 temuan</span><span><Trophy size={16} />{completed.length*50} poin</span><span>Debian 8 · Apache · MySQL</span></div>
    <div className="progress-line" role="progressbar" aria-label="Progres CTF Warm Up" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={30}><div style={{width:`${completed.length/30*100}%`}} /></div>
    <section className="warm-up-brief"><h2>Praktikum: inventarisasi server WordPress</h2><p>Kamu bertugas menyusun profil sebuah server: sistem operasinya, layanan web, dan database aplikasi. Setiap jawaban harus berasal dari bukti yang kamu baca di terminal.</p><ol className="warm-up-flow"><li><strong>1. Pahami soal</strong><span>Baca tujuan dan format jawaban. Mulai dari temuan pertama.</span></li><li><strong>2. Periksa bukti</strong><span>Ketik perintah di terminal. Petunjuk bertahap menyediakan contoh perintah yang dapat disalin.</span></li><li><strong>3. Catat dan pahami</strong><span>Kirim jawaban singkat. Setelah benar, baca penjelasannya dan pilih temuan berikutnya.</span></li></ol><p><strong>Akses awal:</strong> jalankan <code>ssh root@192.168.22.7</code>. Saat password diminta, ketik <code>admin1234!</code> lalu Enter. Password tidak terlihat saat diketik. Password SSH diakhiri tanda seru (!), tanpa titik.</p><p className="small">Tidak perlu terminal komputer, VPN, atau VM. Semua perintah dijalankan di terminal simulasi di bawah. Tidak perlu menulis Cakgup&#123;&#125; pada jawaban temuan. Tidak ada pengurangan poin untuk percobaan salah. Temuan tersimpan saat reload; sesi SSH/MySQL perlu login ulang.</p><details><summary>Kenali tiga sesi terminal</summary><ul><li><code>analyst@workstation</code>: belum masuk server; jalankan SSH.</li><li><code>root@Cakgup:~#</code>: shell Linux pada server; gunakan perintah seperti <code>ls</code>, <code>cat</code>, dan <code>ps</code>.</li><li><code>mysql&gt;</code>: monitor database; gunakan query SQL yang diakhiri <code>;</code>. Ketik <code>exit</code> untuk kembali ke Linux.</li></ul><p className="small">Lingkungan direkonstruksi dari Warm Up.pdf. Fokusnya membaca bukti dan memahami temuan. Versi klien MySQL dibedakan dari versi server; nomor port dihitung tanpa duplikasi IPv4/IPv6.</p></details><a className="btn btn-primary" href="#warm-up-investigation">{completed.length ? "Lanjutkan investigasi" : "Mulai temuan pertama"}<ArrowRight size={16} /></a></section>
    {error && <p className="laser-notice" role="status">{error}</p>}
    {!loaded ? <p role="status">Menyiapkan tantangan…</p> : <div className="laser-layout" id="warm-up-investigation">
      <nav ref={mapRef} className="laser-levels" aria-label="Daftar tantangan Warm Up"><strong>Peta investigasi</strong>{warmUpGroups.map((group,groupIndex)=><div key={group}><h3 className="warm-up-group">{group}<small>{completed.filter(i=>warmUpQuestions[i].group === groupIndex).length}/{warmUpQuestions.filter(item=>item.group === groupIndex).length} selesai</small></h3>{warmUpQuestions.map((item,i)=>item.group !== groupIndex ? null : <button key={i} className={i === active ? "is-active" : ""} disabled={!completed.includes(i) && i !== firstPending} aria-current={i === active ? "step" : undefined} onClick={()=>select(i)}><span className="laser-number">{String(i+1).padStart(2,"0")}</span><span>{item.title}</span>{completed.includes(i) ? <CheckCircle2 size={15} /> : i !== firstPending ? <Lock size={14} /> : null}</button>)}</div>)}</nav>
      <div className="laser-workspace warm-up-workspace">
        {finished && <section className="laser-victory" role="status"><Trophy size={28} /><div><strong>Investigasi Warm Up selesai!</strong><p>30 temuan terverifikasi · flag akhir <code>Cakgup&#123;warm_up_tuntas&#125;</code></p><Link className="btn" href="/ctf/">Lanjut ke CTF Jejak Digital</Link></div></section>}
        <section className="laser-mission" ref={missionRef} tabIndex={-1} aria-labelledby="warm-up-mission-title"><div className="laser-mission-top"><span className="eyebrow">Temuan {active+1} / 30</span><span className="tag">{warmUpGroups[question.group]} · 50 poin</span></div><h2 id="warm-up-mission-title">{question.title}</h2><p className="warm-up-goal"><strong>Tujuan belajar</strong><br/>{guide.goal}</p><h3 className="laser-objective-label">Pertanyaan</h3><p>{question.question}</p><div className="warm-up-answer-format"><strong>Format jawaban</strong><p>{guide.format}</p></div><div className="laser-hint-actions">{hint < 2 && <button className="btn" aria-expanded={hint > 0} onClick={()=>setHint(h=>h+1)}><Lightbulb size={15} />{hint === 0 ? "Petunjuk 1 · cara membaca bukti" : "Petunjuk 2 · langkah perintah"}</button>}{hint > 0 && <button className="btn" onClick={()=>setHint(0)}>Tutup petunjuk</button>}</div>{hint > 0 && <div className="laser-notice"><p>{question.hint}</p>{hint === 2 && <><strong>Jalankan berurutan di sesi yang sesuai:</strong><CommandSteps commands={guide.commands} /><p className="small">Salin perintah, tempel di terminal, lalu Enter. Masukkan hasil temuan pada kolom jawaban; jangan masukkan perintahnya.</p></>}</div>}</section>
        <section className="warm-up-terminal-column"><div className="warm-up-session" role="status" aria-live="polite"><strong>{sessionAdvice.label}</strong><p>{sessionAdvice.message}</p>{sessionAdvice.commands.length > 0 && <CommandSteps commands={sessionAdvice.commands} />}</div><section className="laser-terminal" aria-label="Terminal CTF Warm Up"><div className="laser-terminal-bar"><span><i/><i/><i/></span><code>{mysql ? "MySQL monitor" : connected ? "root@Cakgup" : "analyst@workstation"} — {cwd}</code><span>terminal</span></div><BrowserTerminal key={reset} cwd={cwd} resetToken={0} identity={{user:connected ? "root" : "analyst",host:connected ? "Cakgup" : "workstation",home:connected ? "/root" : "/home/analyst"}} onComplete={line=>completeWarmUp(state.current,line)} onCancel={()=>{state.current=cancelWarmUpAuthentication(state.current);setSessionState(state.current);return {prompt:state.current.mysql ? "mysql> " : undefined};}} onCommand={line=>{
          const result=executeWarmUp(state.current,line);state.current=result.state;setSessionState(result.state);
          return {...result,cwd:result.state.cwd,identity:{user:result.state.connected ? "root" : "analyst",host:result.state.connected ? "Cakgup" : "workstation",home:result.state.connected ? "/root" : "/home/analyst"}};
        }} /></section><p className="small warm-up-terminal-tip">Klik terminal untuk mengetik. Tab melengkapi; ↑/↓ membuka riwayat; ←/→ mengedit. Ctrl+C membatalkan input. Jika prompt menjadi →, query SQL belum selesai.</p></section>
        <section className="laser-submit">{solved ? <><h3 className="laser-success"><CheckCircle2 size={17} />Temuan {active+1} terverifikasi</h3><p className="warm-up-explanation">{guide.explanation}</p>{firstPending >= 0 && <button className="btn btn-primary" onClick={()=>select(firstPending)}>Lanjut ke temuan {firstPending+1}<ArrowRight size={16} /></button>}</> : <form onSubmit={submit}><label htmlFor="warm-up-answer">Catat jawaban temuan {active+1}</label><p className="small">{question.question}</p><div><input ref={answerRef} id="warm-up-answer" aria-describedby="warm-up-answer-help" placeholder="Jawaban temuan, bukan perintah…" autoComplete="off" autoCapitalize="off" spellCheck={false} value={answer} onChange={event=>setAnswer(event.target.value)} required /><button className="btn btn-primary" type="submit">Periksa jawaban</button></div><p className="small" id="warm-up-answer-help">{guide.format}</p></form>}{feedback && <p className={solved ? "laser-success" : "laser-feedback"} role="status" aria-live="polite">{feedback}</p>}</section>
      </div>
    </div>}
    <footer className="laser-footer">Praktikum Warm Up · 3 profil investigasi · jawaban benar disertai penjelasan. Data latihan direkonstruksi untuk LinuxLab Cyber.</footer>
  </main></div>;
}
