# CTF — Jejak Digital

Menu **CTF** membuka `/ctf/`. Halaman lab ada di `public/ctf/lab.html`, diisolasi dalam iframe agar stylesheet MOFCG tidak mengubah halaman LinuxLab lainnya. Tata letak, briefing, judul tahapan, narasi hasil, logo, dan gaya berasal dari halaman referensi https://ctf.eranusasiber.my.id/lab pada 15 Oktober 2026. Kredit sumber tetap ditampilkan.

Tema lokal di `public/ctf/local.css` mengikuti LinuxLab Cyber: latar biru tua `#071a33`, panel `#102b52` / `#1a3a6b`, aksen kuning `#ffca1a`, kartu membulat, dan tipografi yang seragam dengan dashboard. Warna hijau dipakai sebagai penanda tahap selesai.

Semua aset disajikan lokal: CSS hasil render, tema asli, Font Awesome 6.4.0 (beserta pemberitahuan lisensinya dalam stylesheet), logo, dan 13 evidence dari folder MOFCG pengguna. Tidak ada koneksi ke API lomba, pelacak, login, atau sesi peserta asal. Banner jadwal dan leaderboard diganti dengan mode latihan serta papan progres lokal.

## Perilaku latihan

- Inisiasi operasi membuka briefing dan tahap pertama.
- Lima stage dibuka berurutan; setiap jawaban benar memberi 1.000 poin.
- Jawaban salah mengurangi 10 poin. Nilai dapat negatif sesuai penalti.
- Bonus terbuka setelah lima stage selesai dan bernilai 500 poin.
- Jawaban dibandingkan secara peka huruf besar-kecil setelah spasi tepi dihapus.
- Progres, skor, dan riwayat tanpa isi jawaban disimpan dalam localStorage `linuxlab-mofcg-ctf-v1`.
- Reset meminta konfirmasi sebelum menghapus progres CTF saja.
- Riwayat ditampilkan dalam WIB.

## Kunci jawaban

`public/ctf/answers.json` berisi SHA-256 UTF-8 untuk jawaban stage `1`–`5` yang diberikan pengguna. Entri `6` merupakan token bonus dan masih `null` sampai token diberikan. Entri kosong atau kegagalan memuat konfigurasi tidak menilai jawaban dan tidak mengenakan penalti. Ganti entri dengan hash token persis untuk mengaktifkan penilaian bonus.

Ini latihan statis mandiri: hash, bukti, dan progres dapat diperiksa atau diubah dari browser. Penilaian untuk kompetisi bersama memerlukan backend dan penyimpanan skor tersendiri.

## Verifikasi

Jalankan `npm run test:ctf`, `npm run build`, dan `npm run test:export`. Build dan pemeriksaan ekspor juga mendukung `NEXT_PUBLIC_BASE_PATH=/linuxlab`.

Pengujian browser mencakup inisiasi, penalti, lima kunci asli, pembukaan bonus, persistensi setelah reload, riwayat, serta reset. Bonus 500 poin diuji dengan kunci sementara yang kemudian dihapus.
