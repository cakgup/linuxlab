import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "CTF: Jejak Digital | LinuxLab Cyber",
  description: "Arena investigasi forensik MOFCG: sembilan tahapan, Token Nexus, analisis memori, rekayasa balik, dan forensik workstation.",
};

export default function CtfPage() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return <div className="ctf-shell"><Nav /><iframe className="ctf-frame" title="CTF MOFCG: Jejak Digital" src={`${base}/ctf/lab.html?v=source-narratives-1`} /></div>;
}
