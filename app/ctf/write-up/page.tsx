import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { CtfWriteUp } from "@/components/CtfWriteUp";

export const metadata: Metadata = {
  title: "Write-up CTF MOFCG | LinuxLab Cyber",
  description: "Pembahasan investigasi dan penyelesaian sembilan stage MOFCG CTF.",
  robots: { index: false, follow: false },
};

export default function WriteUpPage() {
  return <><Nav /><CtfWriteUp /></>;
}
