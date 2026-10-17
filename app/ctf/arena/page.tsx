import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ArenaCards } from "@/components/ArenaCards";

export const metadata: Metadata = { title: "Arena CTF | LinuxLab Cyber", description: "Pilih CTF Linux, Warm Up, atau Jejak Digital. Semua arena dapat langsung dimainkan tanpa prasyarat materi." };

export default function ArenaPage() {
  return <div className="shell"><Nav /><main className="container dashboard-main"><header className="arena-heading"><div className="eyebrow">Capture the flag</div><h1>Arena CTF</h1><p>Pilih tantangan dan mulai berlatih. Semua CTF terbuka tanpa harus menyelesaikan materi Linux.</p><p>Urutan yang disarankan: CTF Linux → Warm Up → Jejak Digital. Kamu bebas memilih sesuai kemampuan.</p><Link className="btn" href="/#rute-belajar">Buka materi Linux</Link></header><ArenaCards /></main></div>;
}
