"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, LockKeyhole, ShieldCheck } from "lucide-react";

type Section = { title: string; paragraphs: string[]; code?: string; language?: string };
type Stage = { number: number; title: string; category: string; flag: string; evidence: string[]; sections: Section[] };
type WriteUp = { introduction: string; stages: Stage[] };
type Envelope = { version: number; iterations: number; salt: string; iv: string; ciphertext: string };

function decode(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

export function CtfWriteUp() {
  const [content, setContent] = useState<WriteUp | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !code) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/ctf/write-up.enc.json`);
      if (!response.ok) throw new Error("load");
      const data: Envelope = await response.json();
      if (data.version !== 1) throw new Error("load");
      const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: decode(data.salt), iterations: data.iterations }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(data.iv) }, key, decode(data.ciphertext));
      const result: WriteUp = JSON.parse(new TextDecoder().decode(plaintext));
      if (!Array.isArray(result.stages) || result.stages.length !== 9) throw new Error("load");
      setContent(result); setCode("");
      requestAnimationFrame(() => title.current?.focus());
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "load" ? "Write-up belum dapat dimuat. Silakan coba kembali." : "Kode akses tidak sesuai. Silakan coba lagi.");
      input.current?.focus();
    } finally { setBusy(false); }
  }

  return <main className="container writeup-main">
    <div className="writeup-toolbar">
      <Link className="btn" href="/ctf/"><ArrowLeft size={16} />Kembali ke CTF</Link>
      {content && <button className="btn" onClick={() => { setContent(null); setError(""); window.scrollTo({ top: 0 }); }}><LockKeyhole size={16} />Kunci kembali</button>}
    </div>
    {!content ? <section className="writeup-gate" aria-labelledby="access-title">
      <div className="locked-room-icon"><LockKeyhole size={27} /></div>
      <span className="eyebrow">LinuxLab Cyber · CTF</span>
      <h1 id="access-title">Write-up Jejak Digital</h1>
      <p>Pembahasan lengkap Stage 1–9, dari analisis email hingga forensik workstation. Masukkan kode akses untuk membuka seluruh pembahasan.</p>
      <form onSubmit={unlock} className="writeup-access">
        <label htmlFor="writeup-code">Kode akses</label>
        <input ref={input} id="writeup-code" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} required value={code} onChange={event => setCode(event.target.value)} aria-describedby={error ? "access-error" : undefined} aria-invalid={!!error} />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Membuka pembahasan…" : <><BookOpen size={17} />Buka write-up</>}</button>
        <p id="access-error" className="writeup-error" role="status" aria-live="polite">{error}</p>
      </form>
    </section> : <>
      <header className="writeup-intro">
        <span className="eyebrow">MOFCG CTF · Jejak Digital</span>
        <h1 ref={title} tabIndex={-1}>Write-up Stage 1–9</h1>
        <p>{content.introduction}</p>
        <div className="writeup-verified"><ShieldCheck size={18} />Seluruh 9 tahap terverifikasi · Skor lomba 8620</div>
      </header>
      <div className="writeup-layout">
        <nav className="writeup-index" aria-label="Daftar stage write-up">
          <strong>Daftar pembahasan</strong>
          {content.stages.map(stage => <a href={`#writeup-stage-${stage.number}`} key={stage.number}><span>{String(stage.number).padStart(2,"0")}</span>{stage.title}</a>)}
        </nav>
        <div className="writeup-stages">{content.stages.map(stage => <article className="writeup-stage" id={`writeup-stage-${stage.number}`} key={stage.number}>
          <span className="eyebrow">Stage {stage.number}</span>
          <h2>{stage.title}</h2>
          <p className="writeup-category">{stage.category}</p>
          <div className="writeup-flag"><span>Token terverifikasi</span><code>{stage.flag}</code></div>
          <h3>Evidence</h3>
          <ul>{stage.evidence.map(file => <li key={file}><code>{file}</code></li>)}</ul>
          {stage.sections.map((section, index) => <section key={index}>
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            {section.code && <div className="writeup-code"><span>{section.language || "Perintah / hasil"}</span><pre><code>{section.code}</code></pre></div>}
          </section>)}
        </article>)}</div>
      </div>
    </>}
    <footer className="writeup-footer">Presented by MOF CG 2026</footer>
  </main>;
}
