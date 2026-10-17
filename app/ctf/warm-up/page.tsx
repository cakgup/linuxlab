import type { Metadata } from "next";
import { WarmUpCtf } from "@/components/WarmUpCtf";

export const metadata: Metadata = { title: "CTF Warm Up | LinuxLab Cyber", description: "30 tantangan investigasi server Debian, Apache, log akses, dan MySQL dari materi Warm Up. Terminal simulasi interaktif tanpa prasyarat." };
export default function WarmUpPage() { return <WarmUpCtf />; }
