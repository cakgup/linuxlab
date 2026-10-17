import type { Metadata } from "next";
import { LaserCtf } from "@/components/LaserCtf";

export const metadata: Metadata = {
  title: "CTF Linux: Laser | LinuxLab Cyber",
  description: "Latihan Linux pemula dengan 31 level CTF sesuai panduan Linux Game, dari navigasi hingga akses root dan Golden Tiket dalam terminal simulasi interaktif.",
};

export default function LinuxCtfPage() { return <LaserCtf />; }
