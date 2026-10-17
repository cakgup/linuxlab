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

- 29 room interaktif dengan 114 tugas praktik dan 71 entri referensi perintah yang dapat dicari.
- Empat learning path dengan prasyarat untuk membuka room berikutnya.
- Terminal berbasis xterm.js dengan simulasi filesystem, proses, dan jaringan.
- Validasi tugas berdasarkan hasil perubahan host virtual dan riwayat perintah.
- XP, badge, petunjuk, dan indikator progres pembelajaran.
- Progres tersimpan di browser melalui `localStorage`.
- Ekspor statis untuk deployment melalui GitHub Pages.
- Tema biru tua dan kuning yang seragam dengan Simple Toolkit Pentest, navigasi cepat antarjalur, dan tombol lanjut belajar.

## Alur Pembelajaran

Navigasi dibagi menjadi **Materi Linux** dan **CTF**. Halaman materi menampilkan empat tahap berurutan: Dasar Linux, Administrasi Server Linux, Linux untuk Keamanan Siber, dan Penanganan Insiden, beserta tombol untuk melanjutkan materi berikutnya. CTF terpisah di `/ctf/arena/` dan seluruh arenanya dapat dibuka langsung tanpa menyelesaikan materi atau CTF lain.

Arena CTF berisi:

1. **CTF Linux** (`/ctf/linux/`): 31 level latihan terminal.
2. **CTF Warm Up** (`/ctf/warm-up/`): 30 pertanyaan dalam profil server, webserver, dan database, berdasarkan Warm Up.pdf. SSH, konfigurasi Apache, 1452 entri akses dari IP pertama, dan sesi MySQL berjalan dalam simulasi. Lihat [cakupan dan rekonstruksi Warm Up](docs/WARM_UP.md). Progres terpisah dari materi dan CTF lainnya.
3. **CTF Jejak Digital** (`/ctf/`): sembilan stage investigasi forensik.


Menu **CTF Linux** membuka arena **Laser** di `/ctf/linux/`: 31 level (0–30), dengan Golden Tiket sebagai tujuan akhir level30, diadaptasi dari bahan VM Laser karya Gara yang terinspirasi OverTheWire. Latihan mencakup navigasi, file tersembunyi, quoting, metadata, pencarian teks, arsip, Base64, checksum, HTTP, GPG, serta hak akses. Setiap level menyediakan terminal simulasi, petunjuk, dan validasi flag untuk membuka level berikutnya. Peserta berpindah melalui `su levelN`, misalnya `su level1` dari level0, lalu memasukkan isi flag level saat ini sebagai password tanpa `Cakgup{}`. Contoh: `Cakgup{sangatmudah}` menjadi `sangatmudah`. Password disembunyikan dan tidak disimpan dalam riwayat. Login su yang berhasil memverifikasi penyelesaian level. Formulir flag hanya tersedia di level30 untuk menyelesaikan Golden Tiket. Password salah ditolak. Seperti VM, password adalah milik akun tujuan: levelN menggunakan isi flag levelN-1; akun level0 menggunakan password awalnya. Ctrl+C membatalkan permintaan password. Level30 mengikuti panduan Linux Game: dapatkan root dengan `sudo su`, baca `flag.txt` sebagai petunjuk (bukan password), lalu temukan `GoldenTiket.txt` yang berisi kredensial pengguna Laser dan flag akhir. Tidak ada akun level31. Peta tantangan hanya membuka kembali level yang sudah selesai. Progres dan posisi level disimpan secara terpisah di browser; semua CTF tersedia pada menu CTF. Tombol Reset ke level0 menghapus progres CTF Linux dan memulai ulang arena tersebut.

Tampilan terminal dimulai ulang saat pindah akun. Plain `su levelN` mempertahankan direktori kerja dan perubahan filesystem sesi; jalankan `cd` untuk masuk home akun baru, atau gunakan `su - levelN`. Memuat ulang halaman atau mengulang latihan memulihkan fixture awal. Arsip, Python, executable, GPG, dan layanan HTTP dimodelkan dalam browser. Checksum berasal dari isi fixture latihan, termasuk newline; simulator mendukung checksum fixture tersebut. Sesuai Linux Game.pdf, level12 melatih `chmod`, level29 menggunakan passphrase GPG `12345678`, dan poin masing-masing level mengikuti kolom Points pada PDF. Audit langsung VM telah mengganti fixture buatan dengan 122 berkas tantangan dari VM beserta permission, pemilik, waktu, dan checksum. Sesuai penyesuaian Cakgup, semua flag kini berawalan `Cakgup{...}`—termasuk isi Base64, bytecode, ELF, arsip ZIP/TAR/RAR, dan GPG. Artefak dibangun ulang dengan format valid dan checksum baru; metadata permission/pemilik/waktu dipertahankan. Level12 memiliki mode awal 000; level30 sudo meminta password akun saat ini, sesuai VM. Rincian bukti dan batas simulator tersedia di [Laser VM parity audit](docs/LASER_VM_PARITY.md). Progres versi sebelumnya dimigrasikan; tahap Golden Tiket yang sebelumnya terpisah digabung ke level30.

| Learning Path | Jumlah Room | Materi |
| --- | --- | --- |
| Linux Basics | 14 | Navigasi, berkas, teks, permission, proses, pipe, bantuan, pengolahan teks, symbolic link, arsip, kapasitas, dan environment. |
| Linux Administration | 8 | SSH, OS/kernel/akun, systemd/journal, jaringan, Apache/virtual host, access log, autentikasi dan query MySQL. |
| Linux for Cybersecurity | 6 | Hardening, investigasi log, SUID, proses mencurigakan, jaringan, dan persistence. |
| Incident Response | 1 | Skenario gabungan untuk investigasi, containment, dan pencatatan hasil. |

Setiap modul menyertakan fungsi, sintaks, dan contoh perintah. Referensi lengkap tersedia di `/materi/perintah/`. Jalur administrasi memakai engine dan fixture yang sama dengan CTF Warm Up; setelah modul SSH, peserta mulai di shell server, sedangkan login MySQL tetap dilakukan sendiri. Password SSH adalah `admin1234!` tanpa titik; password MySQL dibaca dari konfigurasi aplikasi.

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

Workflow di [`.github/workflows/pages.yml`](.github/workflows/pages.yml) menginstal dependensi, menjalankan tes simulator, membangun aplikasi, memeriksa tautan dan aset hasil ekspor, lalu menerbitkan folder `out` ke GitHub Pages. Gunakan Source **GitHub Actions**, agar deployment tidak bersamaan dengan publikasi langsung dari branch.

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
npm run test:laser
npm run build
npm run test:export
```

`test:core` memeriksa skenario perintah dan penyelesaian tugas. `build` memeriksa kompilasi aplikasi serta pembuatan halaman statis. `test:export` memeriksa keberadaan halaman, tujuan tautan, dan aset. Jalankan dengan nilai `NEXT_PUBLIC_BASE_PATH` yang sama dengan saat build.

## Troubleshooting Singkat

| Kendala | Pemeriksaan |
| --- | --- |
| Situs Pages belum tampil | Pastikan Source adalah **GitHub Actions** dan workflow deployment berhasil. |
| CSS atau JavaScript tidak dimuat | Periksa base path saat build; URL repository ini membutuhkan `/linuxlab`. |
| URL room menghasilkan 404 | Pastikan artifact yang diterbitkan berasal dari folder `out` hasil build terbaru. |
| Room masih terkunci | Selesaikan tugas pada room prasyarat terlebih dahulu. |
| Progres berbeda di perangkat lain | Progres tersimpan pada browser dan origin yang digunakan, tanpa sinkronisasi akun. |

---

## Catatan Penggunaan

Shell simulator mendukung sebagian perintah Linux dan tidak menggantikan lingkungan Bash lengkap. Progres di `localStorage` ditujukan untuk latihan mandiri. Menghapus data situs atau menggunakan **Reset learning progress** akan menghapus progres tersimpan.

## Lisensi

Proyek ini menggunakan [MIT License](LICENSE).

---

<p align="center">
  developed with love by cakgup
</p>
