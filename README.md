# LinuxLab Cyber

<p align="center">
  <strong>Belajar Linux dan keamanan siber melalui terminal interaktif di browser</strong><br>
  Mulai dari perintah dasar Linux, lanjutkan ke investigasi keamanan, dan selesaikan skenario incident response.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js-000000" alt="Next.js">
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Hosting-GitHub%20Pages-222222" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

<p align="center">
  <a href="https://cakgup.github.io/linuxlab/">Buka LinuxLab Cyber</a>
</p>

---

## Overview

LinuxLab Cyber adalah aplikasi latihan Linux dengan alur pembelajaran bertahap. Setiap room menyediakan materi, tugas, petunjuk, dan terminal untuk mempraktikkan perintah secara langsung.

Seluruh latihan berjalan sebagai simulasi di browser. Perintah diproses oleh mesin shell aplikasi dan mengubah keadaan host virtual, tanpa menjalankan perintah pada sistem operasi perangkat atau server.

---

## Cocok Untuk Siapa

- Pemula yang ingin memahami perintah dasar Linux.
- Pelajar keamanan siber yang ingin berlatih membaca log dan memeriksa host.
- Pengajar yang membutuhkan latihan bertahap tanpa menyiapkan VM untuk setiap peserta.

---

## Fitur Utama

- 15 room interaktif dengan 58 tugas praktik.
- Tiga learning path dengan prasyarat untuk membuka room berikutnya.
- Terminal berbasis xterm.js dengan simulasi filesystem, proses, dan jaringan.
- Validasi tugas berdasarkan hasil perubahan host virtual dan riwayat perintah.
- XP, badge, petunjuk, dan indikator progres pembelajaran.
- Progres tersimpan di browser melalui `localStorage`.
- Ekspor statis untuk deployment melalui GitHub Pages.

## Alur Pembelajaran

| Learning Path | Jumlah Room | Materi |
| --- | --- | --- |
| Linux Basics | 8 | Navigasi, operasi file, membaca teks, pencarian, permission, proses, pipes, dan identitas sistem. |
| Linux for Cybersecurity | 6 | Hardening, investigasi log, SUID, proses mencurigakan, jaringan, dan persistence. |
| Incident Response | 1 | Skenario gabungan untuk investigasi, containment, dan pencatatan hasil. |

Rincian materi tersedia di [Curriculum Map](docs/CURRICULUM.md).

---

## Kebutuhan Lingkungan

Untuk mengakses situs, gunakan browser modern. Untuk menjalankan dan membangun aplikasi secara lokal, siapkan:

- Node.js 22 atau lebih baru dan npm.
- Git untuk mengambil source repository.

## Menjalankan Secara Lokal

```bash
git clone https://github.com/cakgup/linuxlab.git
cd linuxlab
npm ci
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), lalu pilih **Start Linux Basics**. Hentikan server dengan `Ctrl+C` pada terminal.

Tidak diperlukan konfigurasi environment untuk penggunaan lokal. Contoh variabel deployment tersedia di [`.env.example`](.env.example).

---

## Deployment ke GitHub Pages

1. Pada repository GitHub, buka **Settings → Pages → Build and deployment**.
2. Pilih **GitHub Actions** sebagai **Source**.
3. Push perubahan ke branch `main`, atau jalankan workflow **Deploy to GitHub Pages** dari tab **Actions**.
4. Setelah workflow berhasil, buka [LinuxLab Cyber](https://cakgup.github.io/linuxlab/).

Workflow di [`.github/workflows/pages.yml`](.github/workflows/pages.yml) menginstal dependensi, menjalankan tes simulator, membangun aplikasi, lalu menerbitkan folder `out` ke GitHub Pages.

Base path diambil otomatis dari konfigurasi Pages. Pada URL repository ini, tautan dan aset menggunakan awalan `/linuxlab/`. Semua halaman room dibuat saat build agar dapat dibuka langsung dan di-refresh.

### Build Lokal

Untuk membangun aplikasi pada jalur root:

```bash
npm run build
```

Untuk membangun aplikasi dengan jalur GitHub Pages di PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH = "/linuxlab"
npm run build
Remove-Item Env:NEXT_PUBLIC_BASE_PATH
```

Hasil build tersedia sebagai file statis di folder `out`. Sajikan folder tersebut dengan server statis; `npm start` menggunakan `next start`, yang tidak mendukung mode ekspor statis ini. Untuk pratinjau build dengan base path `/linuxlab`, sajikan folder `out` pada jalur `/linuxlab/`.

---

## Struktur Repository

```text
linuxlab/
|-- .github/workflows/pages.yml   # Build dan deployment GitHub Pages
|-- app/                         # Halaman, layout, dan gaya aplikasi
|-- components/                  # Dashboard, room, navigasi, dan terminal
|-- lib/                         # Kurikulum, shell, host virtual, dan validator
|-- docs/                        # Dokumentasi arsitektur dan pembelajaran
|-- scripts/core-test.cjs        # Pengujian simulator dan tugas
|-- next.config.ts               # Konfigurasi ekspor statis dan base path
|-- package.json                 # Dependensi dan perintah proyek
`-- README.md
```

## Pemeriksaan

```bash
npm run test:core
npm run build
```

`test:core` memeriksa skenario perintah dan penyelesaian tugas. `build` memeriksa kompilasi aplikasi serta pembuatan halaman statis.

## Troubleshooting Singkat

| Kendala | Pemeriksaan |
| --- | --- |
| Situs Pages belum tampil | Pastikan Source adalah **GitHub Actions** dan workflow deployment berhasil. |
| CSS atau JavaScript tidak dimuat | Periksa base path saat build; URL repository ini membutuhkan `/linuxlab`. |
| URL room menghasilkan 404 | Pastikan artifact yang diterbitkan berasal dari folder `out` hasil build terbaru. |
| Room masih terkunci | Selesaikan tugas pada room prasyarat terlebih dahulu. |
| Progres berbeda di perangkat lain | Progres tersimpan pada browser dan origin yang digunakan, tanpa sinkronisasi akun. |

---

## Dokumentasi

- [Architecture](docs/ARCHITECTURE.md) — struktur aplikasi dan mekanisme simulasi.
- [Curriculum Map](docs/CURRICULUM.md) — materi dan urutan pembelajaran.
- [Pro Bash Coverage](docs/PRO_BASH_COVERAGE.md) — cakupan perintah dan batasan shell.
- [Test Results](docs/TEST_RESULTS.md) — catatan hasil pengujian.
- [Roadmap](docs/ROADMAP.md) — rencana pengembangan.

## Catatan Penggunaan

Shell simulator mendukung sebagian perintah Linux dan tidak menggantikan lingkungan Bash lengkap. Progres di `localStorage` ditujukan untuk latihan mandiri. Menghapus data situs atau menggunakan **Reset learning progress** akan menghapus progres tersimpan.

## Lisensi

Proyek ini menggunakan [MIT License](LICENSE).

---

<p align="center">
  developed with love by cakgup
</p>
