# Validasi CTF Warm Up

Diperiksa: Minggu, 18 Oktober 2026 pukul 03.54 WIB.

**Hasil: 30/30 soal lulus; 60/60 skenario lulus; 0 kegagalan.**

Setiap soal dijalankan secara berurutan dari sesi awal, lalu diulang dari sesi baru untuk meniru kondisi reload. Pemulihan SSH, login MySQL, dan pemilihan database mengikuti arahan yang tampil bagi peserta. Jawaban diturunkan dari keluaran perintah, bukan disalin dari kunci jawaban. Password SSH berasal dari briefing; password database dibaca melalui konfigurasi aplikasi dan dibuktikan dengan login.

| No. | Profil | Soal | Berurutan | Sesi baru / reload |
| --- | --- | --- | --- | --- |
| 1 | Profil server | Masuk melalui SSH | Lulus | Lulus |
| 2 | Profil server | Versi SSH | Lulus | Lulus |
| 3 | Profil server | Direktori pengguna | Lulus | Lulus |
| 4 | Profil server | Sistem operasi | Lulus | Lulus |
| 5 | Profil server | Versi OS | Lulus | Lulus |
| 6 | Profil server | Kernel | Lulus | Lulus |
| 7 | Profil server | Arsitektur | Lulus | Lulus |
| 8 | Profil server | Antarmuka Ethernet | Lulus | Lulus |
| 9 | Profil server | Port layanan | Lulus | Lulus |
| 10 | Profil server | Akun sistem | Lulus | Lulus |
| 11 | Profil webserver | Layanan web | Lulus | Lulus |
| 12 | Profil webserver | Versi Apache | Lulus | Lulus |
| 13 | Profil webserver | Direktori konfigurasi | Lulus | Lulus |
| 14 | Profil webserver | Include virtual host | Lulus | Lulus |
| 15 | Profil webserver | Situs tersedia | Lulus | Lulus |
| 16 | Profil webserver | Situs aktif | Lulus | Lulus |
| 17 | Profil webserver | DocumentRoot | Lulus | Lulus |
| 18 | Profil webserver | Direktori log | Lulus | Lulus |
| 19 | Profil webserver | Berkas akses | Lulus | Lulus |
| 20 | Profil webserver | Pengunjung pertama | Lulus | Lulus |
| 21 | Profil webserver | Jumlah akses | Lulus | Lulus |
| 22 | Profil database | Layanan database | Lulus | Lulus |
| 23 | Profil database | Versi klien MySQL | Lulus | Lulus |
| 24 | Profil database | Port MySQL | Lulus | Lulus |
| 25 | Profil database | Login database | Lulus | Lulus |
| 26 | Profil database | Jumlah database | Lulus | Lulus |
| 27 | Profil database | Database aplikasi | Lulus | Lulus |
| 28 | Profil database | Tabel pengguna | Lulus | Lulus |
| 29 | Profil database | Jumlah pengguna web | Lulus | Lulus |
| 30 | Profil database | Waktu registrasi | Lulus | Lulus |

## Batas dan bukti

- Yang divalidasi adalah lingkungan simulasi LinuxLab, bukan server/VM eksternal.
- Bukti lengkap keluaran perintah dan jawaban hasil ekstraksi disimpan lokal di `tmp/warm-up-validation.json` (diabaikan Git). Laporan ini tidak menampilkan kunci jawaban.
- Skenario negatif, password salah, SQL pada sesi yang keliru, query belum selesai, pembatalan query, dan progres rusak tetap diperiksa oleh `npm run test:warm-up`.
- Jalankan ulang dengan `npm run test:warm-up:audit`; tambahkan `-- --report` untuk memperbarui laporan ini.
