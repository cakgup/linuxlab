import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "CTF: Jejak Digital | LinuxLab Cyber",
  description: "Arena investigasi forensik MOFCG: lima tahapan, evidence digital, dan misi rahasia Token Nexus.",
};

export default function CtfPage() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return <div className="ctf-shell"><Nav /><iframe className="ctf-frame" title="CTF MOFCG: Jejak Digital" src={`${base}/ctf/lab.html`} /></div>;
}
