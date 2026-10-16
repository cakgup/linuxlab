import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "CTF: Jejak Digital | LinuxLab Cyber",
  description: "Arena investigasi forensik MOFCG: sembilan tahapan, Token Nexus, analisis memori, rekayasa balik, dan forensik workstation.",
};

export default function CtfPage() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return <div className="ctf-shell"><Nav /><div className="ctf-tools"><span>Jejak Digital · 9 stage investigasi</span><Link className="btn" href="/ctf/write-up/"><BookOpen size={16} />Write-up Stage 1–9</Link></div><iframe className="ctf-frame" title="CTF MOFCG: Jejak Digital" src={`${base}/ctf/lab.html?v=sequential-locks-1`} /></div>;
}
