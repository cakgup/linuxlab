# CTF — Jejak Digital

Menu **CTF** membuka `/ctf/`, menggunakan `public/ctf/lab.html` dalam iframe dengan tema biru LinuxLab Cyber. Penanda Stage 1–9 tetap terlihat sejak awal. Kartu tahap berikutnya hanya menampilkan status terkunci: narasi, artefak, form, dan hasil tahap disembunyikan sampai tahap sebelumnya selesai. Aturan ini berlaku juga untuk Stage 6 (bonus) dan tahap lanjutan. Progres latihan yang sudah tersimpan tetap dipertahankan.

Semua aset dan 16 berkas evidence disajikan lokal. Stage 7 menambahkan citra memori terkompresi (sekitar 38 MB), Stage 8 biner agen brankas, dan Stage 9 arsip 64 artefak workstation. Tidak ada koneksi ke API lomba, login, atau sesi peserta asal.

## Perilaku latihan

- Stage 1–5: masing-masing 1000 poin.
- Stage 6: bonus Token Nexus, 500 poin.
- Stage 7: forensik memori, 1500 poin.
- Stage 8: rekayasa balik agen brankas, 2500 poin.
- Stage 9: forensik workstation, 3000 poin.
- Maksimum latihan 12500 poin. Skor tetap untuk latihan mandiri; tidak memakai decay berdasarkan jumlah solver pada lomba.
- Salah pada Stage 1–8: penalti 10 poin. Salah pada Stage 9: penalti 100 poin.
- Token dibandingkan persis, peka huruf besar-kecil, setelah spasi tepi dihapus. Stage 6 dan 9 menerima token hasil temuan tanpa memaksakan format MOFCG{...}.
- Seluruh kunci SHA-256 telah dikonfigurasi di `public/ctf/answers.json` berdasarkan hasil yang diterima server asal. Konfigurasi tidak tersedia tidak mengenakan penalti.
- Progres tetap memakai localStorage `linuxlab-mofcg-ctf-v1`; progres versi lima tahap dipertahankan. Field `advanced` menyimpan jumlah tahap lanjutan 7–9 yang selesai.
- Riwayat tidak menyimpan isi jawaban, memakai WIB. Reset meminta konfirmasi dan hanya menghapus progres CTF lokal.

Penilaian ini latihan statis: hash, bukti, dan progres dapat diperiksa dari browser. Kompetisi bersama memerlukan backend tersendiri.

Narasi diperiksa terhadap halaman sumber pada 16 Oktober 2026. Briefing dan narasi Stage 1–5 sudah cocok. Narasi awal, tugas penyelidikan, subjudul, kesimpulan setelah selesai, serta penghubung Stage 6–9 telah dilengkapi dengan teks sumber, termasuk epilog Stage 9. Layout kartu dan mekanisme skor tetap mengikuti mode latihan LinuxLab.

## Write-up

Tombol **Write-up Stage 1–9** pada halaman CTF membuka `/ctf/write-up/`. Kode akses yang ditetapkan pengguna membuka konten untuk halaman yang sedang aktif; reload atau **Kunci kembali** menutup akses. Kode tidak disimpan di localStorage. Konten berada dalam `public/ctf/write-up.enc.json`, terenkripsi AES-256-GCM dengan kunci PBKDF2-SHA256 (210.000 iterasi, salt acak). Halaman tidak merender pembahasan sebelum dekripsi berhasil. Ini gerbang pembahasan latihan statis, bukan sistem akun dengan pembatasan percobaan server.

Write-up merangkum evidence, langkah ekstraksi, perintah, korelasi, batasan, dan token tiap stage. Kesimpulan lama tentang validator dan steganografi telah diperbarui berdasarkan hasil akhir 16 Oktober 2026.

## Pemeriksaan build

Jalankan `npm run test:ctf`, `npm run build`, dan `npm run test:export`. Pemeriksaan mencakup aset lokal, 16 evidence, dan sembilan kunci. Pengujian browser memeriksa progres berurutan, validasi token akhir nonstandar, skor, dan persistensi.
