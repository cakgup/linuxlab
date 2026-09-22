"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Nav({ xp = 0, completed = 0 }: { xp?: number; completed?: number }) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">$_</span>
          <span>LinuxLab <span style={{ color: "var(--green)" }}>Cyber</span></span>
        </Link>
        <div className="nav-meta">
          <span className="pill hide-mobile"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Safe simulation</span>
          <span className="pill">{completed} tasks</span>
          <span className="pill" style={{ color: "var(--green)" }}>{xp} XP</span>
        </div>
      </div>
    </nav>
  );
}
