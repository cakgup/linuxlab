export const arenas = [
  { id: "linux", title: "CTF Linux", href: "/ctf/linux/", description: "31 level untuk menerapkan perintah Linux, menemukan flag, dan berganti akun dengan su.", topics: "Navigasi · permission · arsip · kriptografi", level: "Pemula" },
  { id: "warm-up", title: "CTF Warm Up", href: "/ctf/warm-up/", description: "30 tantangan investigasi profil server, konfigurasi Apache, log akses, dan database WordPress.", topics: "SSH · Apache · log · MySQL", level: "Menengah" },
  { id: "digital", title: "CTF Jejak Digital", href: "/ctf/", description: "9 stage investigasi forensik untuk menghubungkan bukti, menganalisis artefak, dan menangani insiden.", topics: "Forensik · memori · rekayasa balik", level: "Lanjutan" },
] as const;
