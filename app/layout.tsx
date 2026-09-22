import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinuxLab Cyber | Interactive Linux Security Training",
  description: "TryHackMe-style Linux cybersecurity learning in a safe browser simulator.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
