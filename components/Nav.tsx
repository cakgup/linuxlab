"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Nav({ xp = 0, completed = 0 }: { xp?: number; completed?: number }) {
  return (
    <nav className="nav" aria-label="Navigasi utama">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">LL</span>
          <span>LinuxLab Cyber</span>
        </Link>
        <div className="nav-meta">
          <span className="pill hide-mobile"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Simulasi browser</span>
          <span className="pill">{completed} tugas</span>
          <span className="pill" style={{ color: "var(--accent)" }}>{xp} XP</span>
        </div>
      </div>
    </nav>
  );
}
