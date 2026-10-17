"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { commandReferences } from "@/lib/command-reference";
import { readProgress } from "@/lib/progress";
import { rooms } from "@/lib/tracks";
import { Nav } from "./Nav";

export function CommandReferencePage(){
  const [query,setQuery]=useState("");
  const [completed,setCompleted]=useState<string[]>([]);
  useEffect(()=>setCompleted(readProgress().completedTaskIds),[]);
  const xp=rooms.flatMap(room=>room.tasks).filter(task=>completed.includes(task.id)).reduce((sum,task)=>sum+task.xp,0);
  const [category,setCategory]=useState("");
  const categories=[...new Set(commandReferences.map(command=>command.category))];
  const found=commandReferences.filter(command=>(!category || command.category===category) && `${command.name} ${command.summary} ${command.example}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="shell"><Nav xp={xp} completed={completed.length} /><main className="container reference-page" id="main-content"><div className="eyebrow">Materi Linux · Panduan praktik</div><h1>Referensi perintah</h1><p>Pelajari fungsi, sintaks, dan contoh dari {commandReferences.length} perintah. Gunakan modul terpandu untuk mencoba perintah dan memeriksa hasilnya.</p><div className="hero-actions"><Link href="/#rute-belajar" className="btn">Buka rute materi</Link><Link href="/ctf/arena/" className="btn">Buka arena CTF</Link></div><aside className="reference-note">Perintah administrasi server dipraktikkan pada jalur Administrasi Server Linux. Query SQL dijalankan setelah login MySQL, pada prompt <code>mysql&gt;</code>. Terminal mendukung opsi yang diajarkan; arsip dan informasi sistem dasar menggunakan data simulasi.</aside><div className="reference-filters"><label>Cari perintah atau kegunaan<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Contoh: grep, log, database" /></label><label>Kategori<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map(name=><option key={name}>{name}</option>)}</select></label></div><p role="status">{found.length} perintah ditampilkan</p><div className="reference-grid">{found.map(command=><article key={command.name} className="lesson-card command-guide"><div className="eyebrow">{command.category}</div><h2><code>{command.name}</code></h2><p>{command.summary}</p><strong>Sintaks</strong><pre>{command.syntax}</pre><strong>Contoh latihan</strong><pre>{command.example}</pre></article>)}</div>{!found.length && <p>Tidak ada hasil. Coba nama perintah atau kegunaan lain.</p>}</main></div>;
}
