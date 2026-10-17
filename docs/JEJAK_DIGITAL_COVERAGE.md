# Bekal Jejak Digital dalam Materi Linux

Pemetaan diperiksa terhadap briefing sembilan stage dan inventaris 16 berkas bukti lokal pada 18 Oktober 2026. Jalur **Forensik Digital** menambahkan **10 modul, 40 tugas**. Total kurikulum: **39 modul, 154 tugas, lima jalur, 88 entri referensi**.

Panduan publik: `/materi/jejak-digital/`. Materi terpandu: bagian Forensik Digital pada dashboard. Menu CTF tetap mandiri tanpa syarat penyelesaian materi.

| Stage | Bukti dan keterampilan | Modul persiapan |
|---|---|---|
| 1 | PGP, kunci privat, mbox, header, domain dan waktu | Menjaga Integritas Bukti; PGP dan Header Email |
| 2 | Intel sebagai hipotesis, JSON server, filter event, indikator koneksi | Log JSON dan Transaksi CSV; Timeline |
| 3 | CSV transaksi, unit/status, ID/rekening, PCAP, HTTP Host/URI, endpoint | Log JSON dan Transaksi CSV; Membaca PCAP Secara Offline |
| 4 | Windows/Sysmon, CSV event, PowerShell history, PID/parent/user, metadata gambar | Korelasi Endpoint dan Persistensi; Dokumen, Metadata, dan Steganografi |
| 5 | Struktur/teks/metadata PDF, signature vs gambar, data setelah EOF | Dokumen, Metadata, dan Steganografi; Timeline |
| 6 | Bonus Token Nexus, passphrase berbasis konteks, ekstraksi dan provenance | Dokumen, Metadata, dan Steganografi |
| 7 | Arsip dump, proses/parent, command line, socket, Base64/UTF-16LE, batas strings | Triage Memori dan Perintah Terenkode |
| 8 | ELF, arsitektur, strings, disassembly, parsing domain:kunci, verifikasi, receipt | Analisis Statis ELF dan Validasi Model |
| 9 | Inventaris ZIP, PSReadLine/browser, places.sqlite, timestamp, password profile, arsip terenkripsi, DOCX | Arsip Workstation dan Artefak Pengguna; Timeline |

Setiap modul memiliki konsep, interpretasi hasil, fungsi/sintaks/contoh alat, empat tugas, dan petunjuk. Timeline menjelaskan UTC/WIB, provenance, chain of custody, fakta vs inferensi, batas atribusi, serta laporan yang dapat diaudit.

## Batas praktik browser

- Bukti merupakan miniatur sintetis yang berbeda dari artefak dan kunci jawaban CTF.
- SHA-256 dihitung dari byte UTF-8 fixture dan diuji terhadap Node crypto; perubahan isi terdeteksi saat verifikasi manifest.
- PGP, PCAP, metadata, PDF, steganografi, ELF, SQLite, dan arsip terenkripsi merupakan model alur, bukan implementasi alat/format lengkap. File model tidak ditawarkan sebagai artefak biner nyata.
- JSON diseleksi dari record, PCAP difilter dari dua paket model, dan arsip diekstrak dari entri fixture. Password/passphrase salah ditolak.
- `memory pslist/cmdline/netscan` **bukan perintah Linux atau Volatility**. Materi menyertakan padanan Volatility 3 dan kebutuhan validasi dump/simbol. Tidak semua .raw kompatibel dengan Volatility.
- Model reversing menyederhanakan expected key. Konsep membahas cross-reference, parsing, XOR/konstanta byte, little-endian, cabang, dan sandbox untuk diterapkan pada binary CTF.
- SQLite hanya mendukung query baca yang diajarkan. Password Firefox tidak diperlakukan sebagai plaintext/Base64; kebutuhan profil/key4.db dijelaskan, bukan pemulihan password sungguhan.
- Materi tidak menyimpulkan pemalsuan hanya dari metadata, EOF, atau ketiadaan signature. Gambar tanda tangan, signature kriptografis, dan audit trail dibedakan.

## Validasi

`npm run test:core`: seluruh urutan prasyarat 39 modul / 154 tugas. `npm run test:forensics`: 40/40 tugas melalui 59 perintah, bukti sumber tidak berubah, hash independen, penolakan kunci/password/filter salah, UTF-16LE, query baca, pemulihan arsip, completion, dan cakupan stage 1–9. Test ini juga dijalankan di CI.

## Rujukan resmi untuk alat nyata

- [GnuPG operational commands](https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html) — impor, dekripsi, verifikasi.
- [Wireshark TShark manual](https://www.wireshark.org/docs/man-pages/tshark.html) — pembacaan offline, display filter, field.
- [Volatility 3 Windows tutorial](https://github.com/volatilityfoundation/volatility3/blob/develop/doc/source/getting-started-windows-tutorial.rst) — proses, command line, simbol.
- [SQLite CLI](https://www.sqlite.org/cli.html) — query dan membuka database read-only.
