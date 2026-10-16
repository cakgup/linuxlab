# CTF — Jejak Digital

Menu **CTF** membuka `/ctf/`, menggunakan `public/ctf/lab.html` dalam iframe dengan tema biru LinuxLab Cyber. Seluruh kartu Stage 1–9 terlihat sejak awal. Form dan unduhan dibuka berurutan setelah inisiasi operasi serta penyelesaian tahap sebelumnya.

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

## Verifikasi

Jalankan `npm run test:ctf`, `npm run build`, dan `npm run test:export`. Pemeriksaan mencakup aset lokal, 16 evidence, dan sembilan kunci. Pengujian browser memeriksa progres berurutan, validasi token akhir nonstandar, skor, dan persistensi.
