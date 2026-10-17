"use client";

import Link from "next/link";
import { Flag, ShieldCheck, Waypoints } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect,useState } from "react";
import { readProgress } from "@/lib/progress";
import { rooms } from "@/lib/tracks";

export function Nav({ xp, completed }: { xp?: number; completed?: number }) {
  const pathname = usePathname();
  const [stored,setStored]=useState<string[]>([]);
  useEffect(()=>{if(xp===undefined || completed===undefined)setStored(readProgress().completedTaskIds);},[xp,completed]);
  const shownXp=xp ?? rooms.flatMap(room=>room.tasks).filter(task=>stored.includes(task.id)).reduce((sum,task)=>sum+task.xp,0);
  const shownCompleted=completed ?? stored.length;
  return (
    <nav className="nav" aria-label="Navigasi utama">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">LL</span>
          <span>LinuxLab Cyber</span>
        </Link>
        <div className="nav-meta">
          <Link href="/#rute-belajar" className="pill" aria-current={pathname === "/" || pathname.startsWith("/room/") || pathname.startsWith("/materi/") ? "page" : undefined}><Waypoints size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Materi Linux</Link>
          <Link href="/ctf/arena/" className="pill" aria-current={pathname.startsWith("/ctf") ? "page" : undefined}><Flag size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />CTF</Link>
          <span className="pill hide-mobile"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Simulasi peramban</span>
          {!pathname.startsWith("/ctf") && <><span className="pill">{shownCompleted} tugas materi</span><span className="pill" style={{ color: "var(--accent)" }}>{shownXp} XP</span></>}
        </div>
      </div>
    </nav>
  );
}
