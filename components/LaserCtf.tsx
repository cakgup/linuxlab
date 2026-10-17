"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Flag, Lightbulb, Lock, RotateCcw, Terminal, Trophy } from "lucide-react";
import { laserLevels, LASER_ACTIVE_KEY, LASER_PROGRESS_KEY, migrateLaserProgress, readLaserProgress } from "@/lib/laser-levels";
import { cancelLaserAuthentication, completeLaser, createLaserState, laserHome } from "@/lib/laser-shell";
import type { LaserState } from "@/lib/laser-shell";
import { executeLaserWithOriginalFiles } from "@/lib/laser-vm-loader";
import { BrowserTerminal } from "./BrowserTerminal";
import { Nav } from "./Nav";

export function LaserCtf() {
  const [completed, setCompleted] = useState(0);
  const [active, setActive] = useState(0);
  const [root, setRoot] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState(false);
  const [reset, setReset] = useState(0);
  const state = useRef(createLaserState(0));
  const [cwd, setCwd] = useState(state.current.cwd);
  const flagInput = useRef<HTMLInputElement>(null);
  const missionTitle = useRef<HTMLHeadingElement>(null);
  const level = laserLevels[active];
  const solved = active < completed;
  const earnedPoints = laserLevels.slice(0, completed).reduce((sum, entry) => sum + entry.points, 0);
  const identity = { user: root ? "root" : `level${active}`, host: "Laser", home: root ? "/root" : laserHome(active) };

  useEffect(() => {
    let progress = 0;
    let current = 0;
    try {
      const stored = localStorage.getItem(LASER_PROGRESS_KEY);
      progress = stored === null ? migrateLaserProgress(localStorage.getItem("linuxlab-laser-progress-v1")) : readLaserProgress(stored);
      const savedActive = localStorage.getItem(LASER_ACTIVE_KEY) ?? localStorage.getItem("linuxlab-laser-active-v1");
      current = Math.min(savedActive === null ? progress : readLaserProgress(savedActive), progress, laserLevels.length - 1);
    }
    catch { setStorageError("Penyimpanan browser tidak tersedia. Progres hanya berlaku selama halaman ini terbuka."); }
    setCompleted(progress);
    state.current = createLaserState(current); setCwd(state.current.cwd); setActive(current); setLoaded(true);
  }, []);

  function openLevel(index: number, environment?: LaserState) {
    setRoot(false);
    state.current = environment || createLaserState(index); setCwd(state.current.cwd); setActive(index);
    setAnswer(""); setFeedback(""); setHint(false); setReset(v => v + 1);
    try { localStorage.setItem(LASER_ACTIVE_KEY, JSON.stringify(index)); }
    catch { setStorageError("Posisi level tidak dapat disimpan di browser."); }
  }

  function select(index: number) {
    if ((index >= completed && index !== active) || index >= laserLevels.length) return;
    openLevel(index);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (active !== laserLevels.length - 1) return;
    if (answer.trim() !== level.flag) { setFeedback("Flag belum tepat. Periksa huruf besar, kurung kurawal, dan isi flag."); flagInput.current?.focus(); return; }
    const next = Math.max(completed, active + 1);
    setCompleted(next); setAnswer("");
    setFeedback("Golden Tiket ditemukan! Seluruh latihan Laser selesai.");
    try {
      localStorage.setItem(LASER_PROGRESS_KEY, JSON.stringify(next));
      localStorage.setItem(LASER_ACTIVE_KEY, JSON.stringify(active));
    }
    catch { setStorageError("Progres tidak dapat disimpan. Jangan tutup halaman jika ingin melanjutkan sesi ini."); }
  }

  return <div className="shell"><Nav /><main className="container laser-main">
    <header className="laser-heading">
      <div><span className="eyebrow">Capture the flag · Linux pemula</span><h1>CTF Linux: <span>Laser</span></h1>
        <p>Temukan flag, pahami perintahnya, dan naik level. Dari langkah pertama di terminal hingga Golden Tiket.</p></div>
      <Link className="btn" href="/ctf/"><Flag size={16} />CTF Jejak Digital</Link>
    </header>
    <div className="laser-overview"><span><Terminal size={16} />31 level · 0–30</span><span><CheckCircle2 size={16} />{completed}/{laserLevels.length} selesai</span><span><Trophy size={16} />{earnedPoints} poin</span><span>Ubuntu 16.04.4 · i686 · simulasi VM Laser</span></div>
    <div className="progress-line" role="progressbar" aria-label="Progres CTF Linux" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={laserLevels.length}><div style={{ width: `${completed / laserLevels.length * 100}%` }} /></div>
    {storageError && <p className="laser-notice" role="status">{storageError}</p>}
    <section className="laser-howto" aria-labelledby="laser-howto-title"><h2 id="laser-howto-title">Cara bermain</h2><ol><li><strong>1. Temukan flag</strong><p>Baca tujuan level, jelajahi terminal, lalu cari <code>Cakgup&#123;isi_flag&#125;</code>. Buka petunjuk bila diperlukan.</p></li><li><strong>2. Ganti akun dengan su</strong><p>Dari level0, ketik <code>su level1</code>. Sesudah login, jalankan <code>cd</code> untuk masuk home level1. Lanjutkan pola yang sama hingga level30.</p></li><li><strong>3. Masukkan password</strong><p>Saat <code>Password:</code> muncul, ketik hanya <code>isi_flag</code>, lalu Enter. Karakter password tidak tampil; ini normal.</p></li></ol><div className="laser-example"><strong>Contoh</strong><span>Flag <code>Cakgup&#123;sangatmudah&#125;</code> → <code>su level1</code> → password <code>sangatmudah</code>.</span></div><p className="laser-final-rule"><strong>Aturan level30:</strong> dapatkan akses root dan cari <code>GoldenTiket.txt</code>. Isi <code>flag.txt</code> bukan password akun berikutnya. Akhiri permainan dengan flag Golden Tiket.</p></section>
    {!loaded ? <p role="status">Menyiapkan arena…</p> : <div className="laser-layout">
      <nav className="laser-levels" aria-label="Daftar level CTF Linux"><strong>Peta tantangan</strong>
        {laserLevels.map((item, i) => <button key={i} className={i === active ? "is-active" : ""} disabled={i >= completed && i !== active} aria-current={i === active ? "step" : undefined} onClick={() => select(i)}>
          <span className="laser-number">{String(i).padStart(2, "0")}</span><span>{item.title}<small>{item.topic}</small></span>{i < completed ? <CheckCircle2 size={15} /> : i > completed ? <Lock size={14} /> : null}
        </button>)}
      </nav>
      <div className="laser-workspace">
        {completed === laserLevels.length && <div className="laser-victory" role="status"><Trophy size={24} /><div><strong>Golden Tiket berhasil diraih!</strong><p>Kamu telah menuntaskan semua tantangan. Pilih level untuk berlatih kembali.</p></div></div>}
        <section className="laser-mission" aria-labelledby="laser-title">
          <div className="laser-mission-top"><span className="eyebrow">{`Level ${active} / 30`}</span><span className="tag">{level.topic} · {level.points} poin</span></div>
          <h2 ref={missionTitle} tabIndex={-1} id="laser-title">{level.title}</h2><h3 className="laser-objective-label">Tujuan level</h3><p>{level.mission}</p>
          {active < laserLevels.length - 1 && <p className="laser-notice">{solved ? "Flag terverifikasi. " : ""}Lanjutkan dengan <code>su level{active + 1}</code>, lalu masukkan isi flag tanpa <code>Cakgup&#123;&#125;</code> sebagai password.</p>}
          <div className="laser-hint-actions"><button className="btn" aria-expanded={hint} onClick={() => setHint(!hint)}><Lightbulb size={15} />{hint ? "Tutup petunjuk" : "Petunjuk"}</button><button className="btn" onClick={() => select(active)}><RotateCcw size={14} />Ulangi terminal</button></div>
          {hint && <div className="laser-notice">{level.hint}</div>}
        </section>
        <section className="laser-terminal" aria-label="Terminal CTF Laser"><div className="laser-terminal-bar"><span><i /><i /><i /></span><code>{identity.user}@Laser — {cwd}</code><span>terminal</span></div>
          <BrowserTerminal key={`${active}-${reset}`} cwd={cwd} resetToken={0} identity={identity} onComplete={line => completeLaser(state.current, line)} onCommand={async line => {
            const result = await executeLaserWithOriginalFiles(state.current, line);
            if (result.switchLevel !== undefined) {
              const next = Math.max(completed, result.switchLevel);
              setCompleted(next);
              try { localStorage.setItem(LASER_PROGRESS_KEY, JSON.stringify(next)); }
              catch { setStorageError("Progres tidak dapat disimpan di browser."); }
              openLevel(result.switchLevel, result.state);
              setFeedback(`Berhasil masuk ke level${result.switchLevel}${result.switchLevel === 30 ? " · tantangan akhir" : ""}. Direktori sekarang: ${result.state.cwd}. Ketik cd untuk masuk home akun ini.`);
              requestAnimationFrame(() => missionTitle.current?.focus());
            } else { state.current = result.state; setCwd(result.state.cwd); setRoot(result.state.root); }
            return { output: result.output, cwd: result.state.cwd, clear: result.clear, password: result.password, passwordPrompt: result.passwordPrompt, identity: { user: result.state.root ? "root" : `level${result.state.level}`, host: "Laser", home: result.state.root ? "/root" : laserHome(result.state.level) } };
          }} onCancel={() => { state.current = cancelLaserAuthentication(state.current); }} />
        </section>
        {active !== laserLevels.length - 1 && feedback && <p className="laser-success" role="status" aria-live="polite">{feedback}</p>}
        {active === laserLevels.length - 1 && <section className="laser-submit"><form onSubmit={submit}><label htmlFor="laser-flag">Selesaikan level30: kirim flag dari GoldenTiket.txt</label><div><input ref={flagInput} id="laser-flag" placeholder="Cakgup{...}" value={answer} onChange={e => setAnswer(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} required /><button className="btn btn-primary" type="submit"><Flag size={16} />Selesaikan permainan</button></div></form>
          {(feedback || active === laserLevels.length - 1) && <p className={solved ? "laser-success" : "laser-feedback"} role="status" aria-live="polite">{feedback || (solved ? "Golden Tiket sudah terverifikasi." : "Flag dari flag.txt hanya petunjuk. Gunakan flag Golden Tiket untuk menyelesaikan permainan.")}</p>}
        </section>}
      </div>
    </div>}
    <footer className="laser-footer">Diadaptasi dari VM Laser karya Gara, terinspirasi OverTheWire. Skenario latihan disesuaikan untuk simulasi LinuxLab.</footer>
  </main></div>;
}
