import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinuxLab Cyber | Latihan Interaktif Keamanan Linux",
  description: "Belajar Linux dan keamanan siber melalui simulasi interaktif di peramban.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
