# Belajar CTF MOFCG: Memahami Perintah dan Menemukan Flag

**Tingkat:** Pemula–menengah | **Cakupan:** Stage 1–9 | **Lingkungan:** Bash di Kali Linux/WSL dan Python 3  
**Bidang:** Digital forensics, analisis log, jaringan, steganografi, memori, rekayasa balik, dan artefak browser

> **Catatan untuk mahasiswa:** Dokumen ini merupakan versi pembelajaran dari *CTF-WRITEUP-PEMBELAJAR.md*. Nama file, petunjuk, alur, dan jawaban Stage 1–9 dipertahankan dari dokumen sumber. Keluaran yang disebutkan adalah **keluaran rujukan dalam write-up**, bukan hasil eksekusi ulang pada seluruh evidence dalam penyusunan modul ini. Jika keluaran praktik berbeda, periksa versi evidence, folder aktif, dan pengetikan perintah terlebih dahulu.
>
> **Etika dan ruang lingkup:** Jalankan seluruh teknik hanya terhadap *evidence* latihan yang memang boleh dianalisis. Jangan menjalankan biner atau makro yang belum dipercaya, menggunakan kredensial latihan pada layanan sungguhan, atau menghubungi endpoint yang ditemukan dalam evidence.

---

## 1. Peta pembelajaran

Setiap stage menjelaskan **tujuan, alasan memilih alat, arti perintah, keluaran, dan kesimpulan**.

| Stage | Pertanyaan utama | Kompetensi yang dipelajari | Alat utama |
|---|---|---|---|
| 1 | Bagaimana membuka arsip email dan mencari petunjuk pada header? | Dekripsi GPG, struktur MBOX, pencarian teks | `gpg`, `grep` |
| 2 | Apa pesan tersembunyi dalam log WAF? | Membaca JSON, memilih event, Base64 | `jq`, `base64` |
| 3 | Bagaimana menghubungkan catatan keuangan dengan paket jaringan? | Korelasi bukti, PCAP, hex, ROT13 | Wireshark, `xxd`, `tr` |
| 4 | Apakah gambar memiliki informasi selain piksel? | Metadata EXIF dan hex | `exiftool`, `xxd` |
| 5 | Apakah teks PDF yang tidak terlihat masih bisa dibaca? | Ekstraksi teks, instruksi PDF | `pdftotext`, `grep` |
| 6 | Bagaimana mengambil pesan yang disisipkan dalam JPEG? | Steganografi, passphrase, token mentah | `steghide`, `cat` |
| 7 | Bagaimana memulihkan teks yang disamarkan dengan XOR? | Memory strings, byte, XOR, Python | `unzip`, `strings`, Python |
| 8 | Bagaimana memahami pemeriksaan kunci dalam program? | Analisis statis, bytecode, constraint, hash | `file`, `objdump`, Python |
| 9 | Bagaimana menelusuri browser → ZIP → dokumen Office? | Firefox NSS, checksum, ekstraksi makro | `unzip`, `sha256sum`, `olevba`, Python |

**Urutan belajar:** baca konsep → jalankan perintah → cocokkan hasil → jawab latihan.

### 1.1. Bedakan fakta, hasil pengolahan, dan interpretasi

Misalnya suatu log memuat teks `TU9G...`:

- **Fakta dari bukti:** string tersebut terlihat pada field pesan log.
- **Hasil pengolahan:** perintah `base64 -d` mengubahnya menjadi suatu teks.
- **Interpretasi:** teks tersebut tampak memenuhi pola flag yang dicari.

Pembedaan ini penting. Hasil dekripsi tidak otomatis membuktikan siapa pelakunya; nama di dalam file tidak otomatis membuktikan identitas penulisnya.

## 2. Persiapan sebelum praktik

### 2.1. Kenali terminal dan folder kerja

Contoh memakai **terminal Bash**, misalnya Terminal Kali Linux atau Ubuntu melalui WSL di Windows. Perintah di bawah **tidak dimaksudkan untuk dijalankan langsung pada PowerShell**, karena beberapa simbol dan aturan penanganan path berbeda.

```bash
pwd
ls -lah
```

| Bagian perintah | Makna | Untuk apa digunakan? |
|---|---|---|
| `pwd` | *Print Working Directory* | Menampilkan folder tempat terminal sedang berada. |
| `ls` | *List* | Menampilkan nama file dan subfolder. |
| `-l` | Tampilan daftar terperinci | Memperlihatkan ukuran, waktu, dan izin akses. |
| `-a` | Tampilkan file tersembunyi | Menampilkan nama file yang diawali titik (`.`). |
| `-h` | Ukuran ramah manusia | Contoh: `4.0K`, `12M`, bukan hanya jumlah byte. |

**Mengapa penting?** Banyak pesan *“No such file or directory”* bukan berarti file rusak, melainkan terminal sedang berada di folder yang salah.

### 2.2. Lokasi evidence untuk seluruh stage

Dalam modul ini, **semua file evidence diasumsikan sudah tersedia** dalam folder stage masing-masing pada sistem Linux. Mahasiswa **tidak perlu mencari folder sumber di Windows atau menyalin seluruh evidence** sebelum memulai praktikum.

Struktur direktori yang digunakan:

```text
/
├── Stage1/    # Arsip email dan kunci GPG
├── Stage2/    # Intelijen dan log WAF
├── Stage3/    # Catatan keuangan dan paket jaringan
├── Stage4/    # Gambar JPEG dan petunjuk pendukung
├── Stage5/    # Dokumen PDF
├── Stage7/    # Citra memori dalam ZIP
├── Stage8/    # Program biner untuk reverse engineering
└── Stage9/    # Arsip workstation
```

**Catatan:** Tidak ada folder evidence `Stage6` yang wajib disiapkan karena Stage 6 menggunakan kembali JPEG dari `/Stage4` dan passphrase yang diperoleh dari PDF `/Stage5`.

Untuk memastikan direktori Stage 1 tersedia, jalankan:

```bash
ls -lah /Stage1
cd /Stage1
pwd
```

| Perintah | Makna | Yang diperiksa |
|---|---|---|
| `ls -lah /Stage1` | Tampilkan isi folder `/Stage1` beserta rincian file. | Pastikan evidence Stage 1 sudah ada. |
| `cd /Stage1` | Pindah ke folder Stage 1. | Perintah berikutnya dapat memakai nama file tanpa menuliskan path lengkap. |
| `pwd` | Tampilkan direktori kerja saat ini. | Hasilnya seharusnya `/Stage1`. |

Awalan `/` berarti **path absolut**, yakni dihitung dari akar sistem berkas Linux, bukan dari folder pengguna (`~`) atau folder terminal sebelumnya. Karena itu, `cd /Stage2` akan masuk ke Stage 2 dari mana pun terminal dijalankan. Untuk stage lainnya, cukup ganti angka pada path sesuai stage yang dikerjakan.

> **Praktik forensik yang baik:** Jangan menimpa file evidence asli. Perintah yang membuat file hasil, seperti `--output`, `-xf`, `unzip`, dan `>`, perlu dijalankan hanya jika folder latihan memang mengizinkan penyimpanan hasil. Dalam investigasi sesungguhnya, gunakan salinan kerja terpisah dan simpan hash sumber. Pada modul ini lokasi `/Stage1`–`/Stage9` dipakai sebagai acuan untuk memudahkan pembelajaran.

### 2.3. Alat siap digunakan

**Asumsi praktikum:** seluruh evidence sudah ada di `/Stage*` dan semua alat beserta pustaka Python sudah tersedia. Langsung jalankan langkah pada stage; tidak ada proses instalasi atau aktivasi lingkungan tambahan. Perintah `python` sudah menunjuk Python 3 yang siap dipakai.

| Alat | Dipakai untuk |
|---|---|
| `gpg` | Membuka arsip email terenkripsi |
| `grep`, `jq` | Memilih teks atau event yang relevan |
| `printf`, `xxd`, `base64`, `tr` | Menyiapkan teks dan mengubah bentuk penulisan data |
| `exiftool`, `pdftotext` | Membaca metadata dan teks PDF |
| `steghide` | Mengambil pesan tersembunyi dari JPEG |
| `unzip`, `cat` | Membuka arsip dan menampilkan isi file teks |
| `strings`, `file`, `objdump` | Memeriksa isi dan struktur file biner |
| `python`, `olevba`, NSS | Mengolah byte serta membaca artefak browser dan makro |

**Cara mengikuti perintah:** masuk ke folder stage, jalankan perintah analisis, lalu cocokkan keluaran. Tabel di dekat perintah menjelaskan opsi yang perlu diketahui. Opsi yang sama dapat berarti berbeda pada alat lain; misalnya `-p` pada `xxd` bukan berarti password.

### 2.4. Verifikasi integritas dengan SHA-256

```bash
sha256sum nama_file
```

- `sha256sum` menghitung ringkasan SHA-256 atas **byte file**, bukan atas nama file.
- `nama_file` adalah contoh placeholder; ganti dengan file yang ingin diperiksa.
- Hasil umumnya berisi **64 karakter hex**, diikuti nama file.
- Jika hash dua file cocok, hal itu merupakan bukti kuat bahwa isi bytenya sama. Hash **tidak** membuktikan siapa pembuatnya atau apakah isi informasinya benar.

---

# PRAKTIKUM STAGE 1 — Membuka arsip email dengan GPG

## A. Tujuan dan gambaran masalah

Anda menerima arsip email terenkripsi. Untuk menemukan flag, Anda harus membuka arsip dengan private key latihan, lalu memeriksa **header** serta isi email. Mahasiswa perlu memahami perbedaan **kunci**, **arsip terenkripsi**, dan **file hasil dekripsi**.

Evidence menurut write-up:

- `EVD-KEY-001.asc`: private key GPG latihan.
- `EVD-MAIL-001.mbox.enc`: arsip email yang terenkripsi.
- `EVD-DOC-002.txt`: catatan pendukung.

**Konsep:** GPG adalah alat kriptografi; MBOX adalah format satu file yang menampung beberapa email. *Header* berisi misalnya `From`, `To`, `Subject`, dan header khusus; *body* adalah isi pesan. Flag kali ini berada **di header**, bukan pada kalimat isi email.

## B. Langkah praktik dan arti setiap perintah

**1 — Masuk ke folder stage.**

```bash
cd /Stage1
ls -lah
```

`cd` (*change directory*) mengubah folder aktif. Argumen di sebelah kanan menunjukkan folder tujuan. `ls -lah` memeriksa keberadaan evidence. Jangan lanjut jika `EVD-KEY-001.asc` atau `EVD-MAIL-001.mbox.enc` tidak ada.

**2 — Impor kunci, lalu buka arsip.**

```bash
gpg --import EVD-KEY-001.asc
gpg --output EVD-MAIL-001.mbox --decrypt EVD-MAIL-001.mbox.enc
```

| Potongan | Arti | Mengapa digunakan? |
|---|---|---|
| `gpg` | Program pengelola kunci dan dekripsi | Arsip diberikan dalam bentuk terenkripsi. |
| `--import` | Masukkan kunci dari file berikutnya | GPG perlu mengenal kunci sebelum membuka arsip. |
| `EVD-KEY-001.asc` | File kunci yang diberikan | Ini input perintah pertama, bukan hasilnya. |
| `--output EVD-MAIL-001.mbox` | Simpan hasil ke file MBOX ini | Agar isi email dapat diperiksa dengan alat teks. |
| `--decrypt` | Buka data terenkripsi | Menggunakan kunci yang sudah diimpor. |
| `EVD-MAIL-001.mbox.enc` | Arsip yang ingin dibuka | Ini input perintah kedua. |

**Baca sebagai:** “Kenalkan kunci kepada GPG. Setelah itu, buka arsip `.enc` dan simpan hasilnya sebagai `.mbox`.” Perintah ini menggunakan tempat penyimpanan kunci GPG bawaan akun Linux latihan.

**Urutan:** impor dahulu, baru dekripsi. File `.mbox` adalah hasil baru; file `.enc` tetap menjadi evidence sumber.

**3 — Cari pola flag di dalam arsip.**

```bash
grep -nE 'MOFCG\{[^}]+\}' EVD-MAIL-001.mbox
```

| Bagian | Makna |
|---|---|
| `grep` | Mencari baris yang sesuai pola teks. |
| `-n` | Tampilkan **nomor baris** hasil pencarian. |
| `-E` | Pakai *extended regular expression* (pola pencarian yang lebih fleksibel). |
| `'...'` | Tanda petik agar Bash tidak menafsirkan karakter khusus pola. |
| `MOFCG` | Awalan flag yang dicari. |
| `\{` dan `\}` | Karakter kurung kurawal literal `{` dan `}` pada regular expression. |
| `[^}]+` | Cocokkan satu atau lebih karakter apa pun **selain** `}`. |
| `EVD-MAIL-001.mbox` | File tempat pencarian dilakukan. |

**Cara membacanya:** “Cari di file MBOX setiap baris yang berisi teks `MOFCG{...}` lalu tampilkan nomor barisnya.”

## C. Hasil rujukan dan cara menafsirkannya

```text
156:X-Campaign-Tag: MOFCG{J4ngan}
```

- `156:` = **nomor baris** dari `grep -n`, tidak termasuk flag.
- `X-Campaign-Tag:` = nama field header tambahan pada email.
- `MOFCG{J4ngan}` = nilai yang dicari.

**Jawaban Stage 1: `MOFCG{J4ngan}`.**

**Alur bukti:** private key tersedia → GPG mendekripsi MBOX → pencarian pola menemukan header tertentu → isi header dipakai sebagai flag.

## D. Jika terjadi kesalahan

- **`gpg: decryption failed: No secret key`** → kunci belum berhasil diimpor atau tidak sesuai dengan arsip. Ulangi perintah impor, lalu lakukan dekripsi dengan akun Linux yang sama.
- **`No such file or directory`** → jalankan `pwd` serta `ls`; periksa folder dan nama file.
- **Tidak ada hasil `grep`** → pastikan dekripsi menghasilkan MBOX yang benar dan tidak salah ketik pola pencarian.

**Latihan:** Apa yang mungkin terlewat jika kita hanya membuka body email? **Kunci jawaban:** metadata header, termasuk `X-Campaign-Tag`.

**Catatan analisis:** Write-up menyebut timestamp email 10.30 WIB berbeda dari alert klik 10.10 WIB. Selisih waktu harus dicatat apa adanya, tidak “diperbaiki” hanya supaya kronologi tampak cocok.

---

# PRAKTIKUM STAGE 2 — Membaca log JSON dan Base64

## A. Tujuan dan konsep

Temukan event WAF yang memuat pesan tidak biasa, ambil stringnya, lalu dekode Base64. Evidence adalah `EVD-INTEL-001.txt` dan `EVD-SRVLOG-001.json`.

- **Log**: catatan kejadian; misalnya waktu, IP, tindakan, dan pesan.
- **WAF** (*Web Application Firewall*): komponen yang memeriksa lalu lintas HTTP/web untuk menemukan pola serangan.
- **JSON**: format data dengan pasangan nama field dan nilai, misalnya `"action": "WAF_ALERT"`.
- **Base64**: cara merepresentasikan byte dalam karakter teks. Ia dapat dibalik tanpa password; **bukan algoritma enkripsi**.

Contoh: huruf `M` dapat ditulis `TQ==` di Base64. Dua tanda sama dengan (`==`) lazim muncul sebagai *padding* (pengisi), tetapi bukan bukti mutlak bahwa sebuah string adalah Base64.

## B. Langkah praktik

**1 — Pilih hanya event WAF.**

```bash
cd /Stage2
jq '.[] | select(.action == "WAF_ALERT")' EVD-SRVLOG-001.json
```

| Bagian | Arti |
|---|---|
| `jq` | Alat untuk membaca dan memfilter JSON dari terminal. |
| `'.[] ...'` | Program filter jq yang dibungkus petik tunggal. |
| `.[]` | Ambil **setiap elemen** pada array JSON terluar. Bentuk ini cocok bila akar file memang sebuah array. |
| `\|` | Pipe **di dalam program jq**: kirim setiap elemen ke filter selanjutnya. |
| `select(...)` | Hanya teruskan elemen yang memenuhi kondisi. |
| `.action` | Ambil nilai field bernama `action`. |
| `== "WAF_ALERT"` | Cek apakah nilainya sama persis dengan teks `WAF_ALERT`. |
| `EVD-SRVLOG-001.json` | File log yang dianalisis. |

**Mengapa memfilter?** Log bisa berisi banyak event. Daripada membaca semuanya, kita menyaring jenis kejadian yang relevan dengan pertanyaan.

Pada event ID `9999` write-up menunjukkan string:

```text
TU9GQ0d7UzRtUDQhfQ==
```

**2 — Dekode string.**

```bash
printf '%s' 'TU9GQ0d7UzRtUDQhfQ==' | base64 -d
```

| Bagian | Arti |
|---|---|
| `printf` | Menampilkan teks sesuai format yang diminta. |
| `'%s'` | Placeholder teks (*string*); tidak otomatis menambahkan baris baru. |
| `'TU9G...'` | Data Base64 yang ditemukan, bukan password. |
| `\|` | Pipe Bash: hasil `printf` diberikan ke `base64`. |
| `base64` | Utilitas pengolah Base64. |
| `-d` | *Decode*: mengembalikan representasi Base64 menjadi byte asli. |

**Bacaan sederhana:** “Ambil teks yang ditemukan → kirimkan ke dekoder Base64 → tampilkan hasilnya.”

## C. Hasil rujukan

```text
MOFCG{S4mP4!}
```

**Jawaban Stage 2: `MOFCG{S4mP4!}`.**

**Apa yang sebenarnya kita lakukan?** Kita **tidak** meretas WAF atau memecahkan password; kita memfilter catatan yang sudah tersedia lalu mengubah encoding data.

## D. Troubleshooting dan latihan

- **`jq: error ... Cannot index ...`** → struktur JSON bisa berbeda dari yang diasumsikan (`.[]` membutuhkan koleksi yang cocok). Periksa `head -n 10 EVD-SRVLOG-001.json` untuk memahami bentuk file, bukan mengubah evidence agar sesuai asumsi.
- **`base64: invalid input`** → pastikan string lengkap, tidak ada spasi atau karakter yang salah, dan bentuk datanya valid.
- **Hasil `printf` menempel pada prompt terminal** → normal karena `%s` tidak menambahkan baris baru; Anda dapat mengetik `echo` untuk pindah baris.

**Latihan:** Mengapa `base64 -d` tidak memerlukan password? Karena Base64 merupakan **encoding terbuka**, bukan enkripsi.

**Catatan analisis:** Write-up menyebut token API berstatus **Allowed**, sedangkan alert WAF lima detik kemudian berstatus **Blocked**. Itu adalah dua event yang berbeda; jangan menyimpulkan bahwa semua aktivitas diblokir.

---

# PRAKTIKUM STAGE 3 — Korelasi transaksi, PCAP, hex, dan ROT13

## A. Tujuan dan konsep

Hubungkan bukti keuangan dengan paket jaringan, lalu baca pesan yang disamarkan dalam paket. Evidence: `EVD-FIN-001.csv`, `EVD-FIN-005.json`, dan `EVD-NET-001.pcap`.

**PCAP** adalah file rekaman paket jaringan. Wireshark membaca paket itu dan dapat menunjukkan alamat IP asal/tujuan, port, protokol, serta data yang ditransmisikan. **Frame number** adalah nomor urut paket di dalam file capture, bukan nomor akun atau nomor transaksi.

**Korelasi bukti** berarti menghubungkan dua informasi dari sumber berbeda melalui penanda yang cocok, misalnya nomor rekening. Kecocokan tersebut menjadi titik awal analisis, tetapi belum otomatis membuktikan hubungan sebab-akibat.

## B. Ikuti rantai transaksi

Write-up memuat aliran berikut:

```text
MOFCG-MAIN-ACC → 9988-7766-5544 → 1122-3344-5566
               → 5566-7788-9900 → CRYPTO-EX-999
```

Setiap perpindahan mencatat Rp8 miliar. **Jangan menjumlahkan Rp8 miliar sebanyak empat kali lalu menyimpulkan terjadi Rp32 miliar uang berbeda**: bisa jadi dana yang sama melewati beberapa rekening perantara.

## C. Cari paket yang menyebut rekening yang sama

Buka `/Stage3/EVD-NET-001.pcap` pada **Wireshark**, lalu isi kotak *Display Filter* dengan:

```text
frame.number == 328
```

**Ini filter Wireshark, bukan perintah Bash.** `frame.number` adalah field nomor frame, `==` berarti “sama dengan”, dan `328` adalah nomor frame yang dituju. Pilih paket yang tampil, lalu lihat detail protokol/isi payload.

Isi HTTP yang dikutip write-up:

```json
{"wallet_id": "9988-7766-5544", "status": "initiated"}
```

- `wallet_id` adalah nama field identitas wallet/rekening.
- `9988-7766-5544` sama dengan penerima pertama dalam catatan keuangan.
- `initiated` berarti “diinisiasi/dimulai”, **bukan otomatis “berhasil diselesaikan”**.

## D. Periksa paket lain berdasarkan alamat dan port

Masih di *Display Filter* Wireshark, gunakan:

```text
ip.src == 10.0.0.50 && udp.dstport == 53
```

| Bagian filter | Arti |
|---|---|
| `ip.src` | Alamat IP sumber paket. |
| `== 10.0.0.50` | Hanya paket yang asalnya IP tersebut. |
| `&&` | **AND** logika: kondisi kiri **dan** kanan harus benar. |
| `udp.dstport` | Nomor port tujuan UDP. |
| `== 53` | Hanya paket UDP yang tujuannya port 53. |

Port 53 umum dipakai DNS, **tetapi nomor port saja tidak menjamin isinya adalah protokol DNS yang sah**.

Pada frame `350` terdapat hex:

```text
5a425350547b47726567216368687d
```

**Ubah hex menjadi karakter:**

```bash
printf '%s' '5a425350547b47726567216368687d' | xxd -r -p
```

| Bagian | Arti |
|---|---|
| `printf '%s'` | Mengeluarkan string hex persis sebagaimana ditulis. |
| `\|` | Mengalirkan output ke perintah berikutnya. |
| `xxd` | Alat untuk memformat atau membalik hexdump. |
| `-r` | *Reverse*: ubah representasi hex menjadi byte. |
| `-p` | *Plain hex*: anggap input hanya deretan angka hex, tanpa nomor offset. |

Hasil tahap pertama:

```text
ZBSPT{Greg!chh}
```

Teks sudah menjadi huruf tetapi belum terbaca sebagai flag `MOFCG`. Ini menjadi **alasan berbasis petunjuk** untuk mencoba ROT13; bukan sekadar menebak teknik secara acak.

## E. Baca ROT13

**ROT13** mengganti setiap huruf alfabet dengan huruf 13 posisi sesudahnya. Misalnya `A → N`, `B → O`, `N → A`; angka dan tanda baca tetap.

```bash
printf '%s' 'ZBSPT{Greg!chh}' | tr 'A-Za-z' 'N-ZA-Mn-za-m'
```

| Bagian | Arti |
|---|---|
| `tr` | *Translate characters*: mengganti karakter satu demi satu. |
| `'A-Za-z'` | Kelompok karakter asal: `A` s.d. `Z` dan `a` s.d. `z`. |
| `'N-ZA-Mn-za-m'` | Kelompok karakter tujuan setelah digeser 13 tempat. |
| `\|` | Memberikan teks yang akan ditransformasi ke `tr`. |

Hasil rujukan:

```text
MOFCG{Tert!puu}
```

**Jawaban Stage 3: `MOFCG{Tert!puu}`.**

**Urutan penalaran:** rekening pada bukti keuangan → nomor yang sama dalam frame 328 → telusuri lalu lintas terkait → temukan hex pada frame 350 → dekode byte → kenali pola ROT13 → temukan flag.

## F. Kesalahan umum dan refleksi

- Jangan mengetik filter Wireshark seperti `frame.number == 328` langsung pada shell Bash.
- Jangan menyamakan panjang pesan hex **15 byte** dengan ukuran seluruh paket jaringan (yang masih memiliki header protokol).
- Perintah diasumsikan tersedia. Jika alat tidak dikenali, laporkan kepada pengelola lingkungan praktikum; lanjutkan setelah lingkungan siap.
- ROT13 yang dilakukan **dua kali** mengembalikan teks semula, karena 13 + 13 = 26 huruf.

**Latihan:** Apa bukti yang mengaitkan file keuangan dan PCAP? **Jawaban:** identifier `9988-7766-5544` yang muncul pada kedua artefak.

---

# PRAKTIKUM STAGE 4 — Membaca metadata gambar

## A. Tujuan dan konsep

Flag mungkin tersimpan di **metadata JPEG**, bukan digambar pada piksel sehingga terlihat oleh mata. Evidence utama: `EVD-IMG-001.jpg`; log host dan riwayat PowerShell memberikan petunjuk tambahan.

**EXIF** merupakan kelompok metadata pada file gambar. Contohnya informasi kamera, waktu, lokasi (jika ada), atau aplikasi pembuat. **Tag `Software`** bisa berisi keterangan yang sengaja ditanamkan.

## B. Langkah praktik

```bash
cd /Stage4
exiftool -Software EVD-IMG-001.jpg
```

| Bagian | Arti |
|---|---|
| `cd /Stage4` | Pindah ke folder tempat file JPEG evidence berada. |
| `exiftool` | Alat untuk membaca berbagai metadata file. |
| `-Software` | Pilih dan tampilkan nilai tag metadata bernama `Software`. |
| `EVD-IMG-001.jpg` | Nama file yang diperiksa; gambar tidak diedit oleh perintah pembacaan ini. |

Nilai yang ditunjukkan write-up:

```text
Hex: 4d4f4643477b4f7234616e677d
```

**Penafsiran:** awalan `Hex:` adalah petunjuk format representasi teks. Sekarang kita ubah byte hex tersebut menjadi karakter.

```bash
printf '%s' '4d4f4643477b4f7234616e677d' | xxd -r -p
```

#### Arti setiap bagian perintah

| Bagian | Artinya |
|---|---|
| `printf` | Keluarkan teks sesuai format. |
| `'%s'` | Perlakukan argumen berikut sebagai string dan cetak tanpa tambahan baris baru. |
| `'4d4f...677d'` | Data hex dari metadata. Pada perintah, gunakan string lengkap. |
| Petik tunggal `'...'` | Pertahankan isi sebagai teks literal; petiknya tidak ikut dicetak. |
| `\|` | Kirim output `printf` sebagai input `xxd`, tanpa file perantara. |
| `xxd` | Alat konversi antara byte dan representasi hex. |
| `-r` | *Reverse*: baca hex menjadi byte, kebalikan arah konversi biasa. |
| `-p` | Bersama `-r`, baca hex polos tanpa kolom posisi atau offset. |

**Mengapa kedua opsi diperlukan?** Data kita berupa pasangan digit hex polos. `-r` menentukan arah konversi, sedangkan `-p` menentukan format hex yang dibaca. Opsi ini dijelaskan dalam [manual xxd](https://github.com/vim/vim/blob/master/runtime/doc/xxd.man).

Coba satu byte agar alurnya jelas:

```bash
printf '%s' '4d' | xxd -r -p
```

Hasilnya `M`: `printf` mengirim teks `4d`, lalu `xxd` membacanya sebagai byte bernilai 77, yang ditampilkan sebagai huruf ASCII `M`. Pada string lengkap, proses diulang untuk setiap pasangan digit:

```text
4d 4f 46 43 47 7b 4f 72 34 61 6e 67 7d
 M  O  F  C  G  {  O  r  4  a  n  g  }
```

Perintah hanya mengolah string, sehingga tidak mengubah JPEG. Jika hasil menempel pada prompt, itu karena `%s` tidak menambahkan baris baru; prompt bukan bagian flag.

**Perhatikan nama alat:** `-p` pada `xxd` berkaitan dengan format hex, sedangkan `-p` pada `steghide` berarti passphrase.

Hasil akhir:

```text
MOFCG{Or4ang}
```

**Jawaban Stage 4: `MOFCG{Or4ang}`.**

## C. Kesalahan konsep yang perlu dihindari

- Metadata bukan bagian yang otomatis terlihat pada tampilan foto. Jangan menyimpulkan *“gambar tidak mengandung pesan”* hanya karena foto terlihat biasa.
- Pesan pada tag `Software` **berbeda** dengan payload yang disembunyikan memakai steganografi.
- Riwayat `EVD-NOTE-001.txt` dalam write-up menyebut ekstraksi steganografi sebagai petunjuk Stage 6. Passphrase `MOFCG2026` yang muncul di history **tidak berhasil** untuk JPEG evidence tersebut; petunjuk yang benar justru datang dari PDF Stage 5.

**Latihan:** Apakah flag Stage 4 ditemukan dari pengolahan piksel gambar? **Tidak**; ia diperoleh dari metadata dan konversi hex.

---

# PRAKTIKUM STAGE 5 — Menemukan teks tersembunyi dalam PDF

## A. Tujuan dan konsep

Baca teks dalam `EVD-DOC-001.pdf` walaupun mungkin tidak terlihat ketika dokumen dibuka di penampil PDF. Bayangkan **tinta putih pada kertas putih**: teks ada di struktur dokumen, tetapi sulit dilihat secara visual.

**Perbedaan penting:** PDF berbasis teks menyimpan objek huruf yang sering bisa diekstrak. PDF hasil scan dapat hanya berisi gambar halaman sehingga perlu metode lain, misalnya OCR. Stage ini menggunakan PDF yang teksnya masih tersimpan.

## B. Ekstrak teks dari dokumen

```bash
cd /Stage5
pdftotext -layout EVD-DOC-001.pdf -
```

| Bagian | Arti |
|---|---|
| `pdftotext` | Menyalin teks yang tersimpan dalam struktur PDF. |
| `-layout` | Berusaha mempertahankan susunan spasial teks/kolom saat ekstraksi. |
| `EVD-DOC-001.pdf` | File sumber. |
| `-` di akhir | Tempatkan hasil di **standard output/terminal**, bukan file teks baru. |

Bila hanya ingin bagian flag:

```bash
pdftotext EVD-DOC-001.pdf - | grep -oE 'MOFCG\{[^}]+\}'
```

| Bagian | Makna |
|---|---|
| `pdftotext ... -` | Mengirim hasil ekstraksi ke terminal. |
| `\|` | Menyambungkan hasil ekstraksi ke `grep`. |
| `grep` | Mencari teks berdasarkan pola. |
| `-o` | Hanya cetak **bagian yang cocok**, bukan seluruh baris. |
| `-E` | Memakai *extended regular expression*. |
| `'MOFCG\{[^}]+\}'` | Pola flag `MOFCG{...}` seperti pada Stage 1. |

Hasil rujukan:

```text
MOFCG{D4l4m}
```

## C. Apa hubungan warna putih dengan isi PDF?

Contoh instruksi PDF yang disebutkan write-up:

```text
1 1 1 rg
BT 1 0 0 1 50 10 Tm (FLAG: MOFCG{D4l4m}) Tj T* ET
```

**Potongan ini bukan perintah Bash yang harus dijalankan.** Ini adalah contoh instruksi internal PDF.

| Bagian internal PDF | Makna sederhana |
|---|---|
| `1 1 1 rg` | Mengatur warna isi (fill) RGB menjadi putih. |
| `BT` | Awal bagian objek teks (*begin text*). |
| `1 0 0 1 50 10 Tm` | Mengatur matriks posisi teks, termasuk koordinat `(50,10)` dalam sistem koordinat halaman. |
| `(FLAG: ...) Tj` | Menampilkan karakter di dalam tanda kurung sebagai teks. |
| `T*` | Menggeser ke baris teks berikutnya menurut keadaan teks PDF. |
| `ET` | Mengakhiri objek teks (*end text*). |

**Kesimpulan yang benar:** flag berhasil diambil karena masih ada sebagai objek teks PDF, meskipun warna putih membuatnya sulit terlihat.

## D. Temukan metadata untuk stage berikutnya

```bash
exiftool EVD-DOC-001.pdf
```

Perintah ini menampilkan metadata PDF; tanpa opsi `-Software` ia menampilkan beragam tag yang didukung. Write-up menunjukkan:

```text
Custom-Tag: Proyek-Nexus
```

**Catat persis** bentuk `Proyek-Nexus`, termasuk kapitalisasi dan tanda hubung: ini menjadi *passphrase* Stage 6.

**Jawaban Stage 5: `MOFCG{D4l4m}`.**

**Latihan:** Mengapa alat ekstraksi bisa membaca teks yang tidak tampak? Karena keberadaan objek teks dan keterlihatan visual adalah dua hal berbeda.

---

# PRAKTIKUM STAGE 6 — Menemukan pesan dengan steganografi JPEG

## A. Tujuan dan konsep

Kali ini pesan bukan berada di metadata yang langsung terbaca, melainkan disisipkan dalam `EVD-IMG-001.jpg`. Kita memakai passphrase `Proyek-Nexus` yang ditemukan pada metadata PDF Stage 5.

| Istilah | Artinya dalam latihan |
|---|---|
| *Cover file* | JPEG `EVD-IMG-001.jpg` yang menjadi tempat penyimpanan pesan. |
| *Payload* | Data/pesan yang disembunyikan di dalam file pembawa. |
| *Steganography* | Teknik menyisipkan data agar keberadaannya tidak langsung tampak. |
| *Passphrase* | Teks yang dibutuhkan alat untuk mengekstraksi data pada skenario ini. |
| *Extraction* | Proses mengambil payload tersembunyi. |

**Mengapa memakai file dari Stage 4?** Karena stage ini merupakan kelanjutan: gambar yang sama bisa mempunyai **metadata yang menarik** dan **payload steganografi** secara bersamaan.

## B. Ekstrak payload

```bash
cd /Stage4
steghide extract -sf EVD-IMG-001.jpg -p 'Proyek-Nexus' -xf payload.txt
cat payload.txt
```

| Bagian perintah | Artinya | Mengapa ada? |
|---|---|---|
| `cd /Stage4` | Pindah ke direktori Stage 4. | Karena JPEG yang dipakai adalah evidence Stage 4. |
| `steghide` | Alat penyisipan/ekstraksi data tersembunyi. | Membaca payload steganografi, bukan sekadar metadata EXIF. |
| `extract` | Mode operasi ekstraksi. | Kita ingin mengambil pesan, **bukan** menyisipkan pesan baru. |
| `-sf` | *Stego file*. | Menentukan file media pembawa: `EVD-IMG-001.jpg`. |
| `-p` | *Passphrase*. | Memberikan `Proyek-Nexus` agar alat dapat membuka data yang disisipkan. |
| `'Proyek-Nexus'` | Nilai passphrase dari evidence Stage 5. | Huruf, tanda hubung, dan ejaannya harus sama. |
| `-xf` | *Extracted file*. | Menamai file hasil ekstraksi `payload.txt`. |
| `cat payload.txt` | Menampilkan isi file teks hasil ekstraksi. | Membantu memeriksa apa yang benar-benar didapat. |

**Cara membaca perintah utamanya:** “Gunakan `steghide` dalam mode ekstrak; ambil data dari JPEG ini; pakai passphrase yang ditemukan; simpan hasilnya sebagai `payload.txt`.”

**Perhatian:** Perintah ekstraksi dapat membuat/menimpa `payload.txt` di folder kerja. Jika sudah pernah latihan, periksa dulu file hasil lama agar tidak mencampur output percobaan.

## C. Hasil rujukan

```text
Instruction: Change amount to 8M. TU9GQ0d7RDRsNG19
```

Dua informasi muncul:

1. `Instruction: Change amount to 8M.` merupakan **isi pesan di dalam evidence**. Ini bukan instruksi untuk mahasiswa menjalankan transaksi atau mengubah catatan keuangan.
2. `TU9GQ0d7RDRsNG19` merupakan string token bonus yang diminta validator Stage 6.

Jika string tersebut di-decode Base64, hasilnya adalah `MOFCG{D4l4m}`. Namun **jawaban Stage 6 harus tetap string Base64 mentah**, bukan teks hasil decoding, karena itulah format yang diminta validator menurut write-up.

**Jawaban Stage 6: `TU9GQ0d7RDRsNG19`.**

**Pelajaran penting:** Sebuah data dapat berupa jawaban yang tepat meskipun masih encoded. Selalu periksa **format output yang diminta** soal.

## D. Jika ekstraksi gagal

- Periksa apakah file pembawa benar: `ls -l EVD-IMG-001.jpg`.
- Periksa kapitalisasi dan tanda hubung passphrase `Proyek-Nexus`.
- Jangan berasumsi passphrase `MOFCG2026` dalam history pasti benar; write-up menjelaskan bahwa passphrase itu tidak berhasil.
- Bila `steghide: command not found`, periksa instalasi paket `steghide`.

**Latihan:** Mengapa Stage 4 tidak cukup untuk mendapatkan jawaban Stage 6? Karena Stage 4 membaca **metadata**, sedangkan Stage 6 mengambil **payload tersembunyi dengan passphrase**.

---

# PRAKTIKUM STAGE 7 — Membaca image memori dan membalik XOR

## A. Tujuan dan konsep

Evidence `EVD-MEM-002.raw.zip` memuat file salinan data memori. Di dalamnya terdapat telemetri dengan payload yang disamarkan memakai XOR.

**Citra memori** (memory image) adalah salinan byte dari suatu area memori. **`strings`** mencari rangkaian karakter yang tampak seperti teks di antara byte-byte tersebut. Hasil `strings` berguna untuk petunjuk awal, tetapi bukan analisis lengkap seluruh RAM.

## B. Buka arsip dan cari petunjuk

```bash
cd /Stage7
unzip EVD-MEM-002.raw.zip
strings -a EVD-MEM-002.raw | grep -A4 NEXUS_PERSISTENCE
```

| Bagian | Arti |
|---|---|
| `unzip` | Mengekstraksi file dari arsip ZIP. |
| `EVD-MEM-002.raw.zip` | Nama arsip input. |
| `strings` | Mencari urutan byte yang dapat ditampilkan sebagai karakter. |
| `-a` | Memindai seluruh data file, tidak hanya bagian yang dianggap data valid pada format tertentu. |
| `EVD-MEM-002.raw` | File raw yang diperoleh dari proses `unzip`. |
| `\|` | Output `strings` diteruskan ke `grep`. |
| `grep` | Mencari teks penanda yang ditentukan. |
| `-A4` | *After context 4*: tampilkan **empat baris setelah** baris yang cocok. |
| `NEXUS_PERSISTENCE` | Potongan nama penanda/marker yang dicari. |

**Cara memahaminya:** “Buka ZIP → cari teks yang masih terbaca pada dump memori → ambil baris marker dan empat baris setelahnya agar konteksnya terlihat.”

Keluaran penting menurut write-up:

```text
[NEXUS_PERSISTENCE_TELEMETRY]
ENDPOINT: http://192.0.2.205:443/api/v2/telemetry
AUTH_SCHEME: XOR_0x5A
PAYLOAD_HEX: 17151c191d211769376a28231c35286934296b31050969282f27
```

### Memaknai tiap baris hasil

| Isi baris | Informasi yang dapat diambil |
|---|---|
| `[NEXUS_PERSISTENCE_TELEMETRY]` | Penanda kelompok data yang sedang kita lihat. |
| `ENDPOINT: ...` | Alamat komunikasi yang **dicantumkan dalam bukti**, bukan alamat yang harus kita akses. |
| `AUTH_SCHEME: XOR_0x5A` | Petunjuk bahwa data disamarkan dengan XOR memakai byte kunci `0x5A`. Nama field `AUTH_SCHEME` adalah label dari evidence; XOR sederhana **bukan** mekanisme autentikasi yang kuat. |
| `PAYLOAD_HEX: ...` | Isi pesan yang disamarkan dan ditulis dalam hex. |

> Alamat `192.0.2.205` berada dalam blok yang biasa digunakan untuk dokumentasi. Tidak perlu dan tidak dianjurkan mencoba menghubunginya selama mengerjakan stage ini.

## C. Pahami XOR sebelum menulis kode

Setiap byte terdiri dari 8 bit. XOR bekerja pada pasangan bit:

| Data | Kunci | Data XOR kunci |
|---:|---:|---:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

**Aturan sederhana:** jika dua bitnya sama, hasilnya `0`; jika berbeda, hasilnya `1`. Operasi XOR dalam Python ditulis dengan simbol `^`.

Mengapa data bisa dipulihkan menggunakan kunci yang sama? Karena:

```text
(data XOR kunci) XOR kunci = data
```

Kunci yang sama membalik bit yang sama untuk kedua kalinya, sehingga byte kembali seperti semula. XOR dengan **satu byte kunci yang diulang** tidak kuat sebagai enkripsi modern.

**Contoh memakai byte pertama evidence:**

```text
Byte tersamar: 0x17 = 00010111
Kunci         : 0x5A = 01011010
                        -------- XOR
Byte asli     : 0x4D = 01001101 = M
```

Byte kedua `0x15 XOR 0x5A = 0x4F = O`. Jadi pesan mulai berbunyi `MO...`, cocok dengan awalan flag `MOFCG`.

## D. Dekode semua byte dengan Python

**Cara menjalankan:** jalankan `python` untuk masuk ke interpreter, salin kode, kemudian gunakan `exit()` untuk keluar. Cara lain: simpan sebagai `decode_xor.py` dan jalankan `python decode_xor.py` dari folder `/Stage7`.

```python
# 1) Tulisan hex ditemukan dalam field PAYLOAD_HEX.
pesan_hex = '17151c191d211769376a28231c35286934296b31050969282f27'

# 2) Konversi setiap pasangan digit hex menjadi byte.
pesan_tersamar = bytes.fromhex(pesan_hex)

# 3) Kunci satu byte yang disebut pada AUTH_SCHEME.
kunci = 0x5A

# 4) Tempat untuk mengumpulkan setiap byte yang sudah dipulihkan.
hasil = []

# 5) Baca byte satu per satu, lakukan XOR, lalu simpan kembali.
for angka in pesan_tersamar:
    angka_asli = angka ^ kunci
    hasil.append(angka_asli)

# 6) Ubah kumpulan integer menjadi bytes, lalu baca sebagai teks ASCII.
pesan_asli = bytes(hasil).decode('ascii')

# 7) Tampilkan hasil akhir.
print(pesan_asli)
```

| Kode Python | Artinya |
|---|---|
| `pesan_hex = '...'` | Menyimpan string input dalam variabel bernama `pesan_hex`. |
| `bytes.fromhex(...)` | Membaca `17` sebagai byte `0x17`, `15` sebagai `0x15`, dan seterusnya. |
| `kunci = 0x5A` | Menyimpan nilai integer hex `5A` (desimal 90). |
| `hasil = []` | Membuat list kosong untuk hasil konversi. |
| `for angka in pesan_tersamar:` | Mengulangi isi blok untuk setiap byte; titik dua `:` memulai blok berindentasi. |
| `angka ^ kunci` | Melakukan XOR antara satu byte payload dan byte kunci. |
| `hasil.append(angka_asli)` | Menambahkan satu byte hasil operasi ke list. |
| `bytes(hasil)` | Mengubah list integer 0–255 menjadi kumpulan byte. |
| `.decode('ascii')` | Membaca nilai byte ASCII menjadi huruf/karakter. |
| `print(...)` | Menampilkan hasil di terminal. |

Keluaran rujukan:

```text
MOFCG{M3m0ryFor3ns1k_S3ru}
```

**Jawaban Stage 7: `MOFCG{M3m0ryFor3ns1k_S3ru}`.**

## E. Mencoba sendiri dengan data satu byte

```python
print(hex(0x17 ^ 0x5A))   # 0x4d
print(chr(0x4D))          # M
print(hex(0x4D ^ 0x5A))   # 0x17, kembali ke byte semula
```

- `hex(...)` menampilkan integer dalam bentuk angka hex.
- `chr(...)` membaca kode integer Unicode yang juga mencakup ASCII, sehingga `0x4D` ditampilkan sebagai `M`.
- Tanda `#` memulai komentar Python yang menjelaskan hasil yang diharapkan.

**Latihan:** Apakah semua data pada dump memori pasti ditemukan oleh `strings`? **Tidak.** Data biner/terkompresi/terenkripsi dan sejumlah teks dengan encoding lain bisa terlewat.

---

# PRAKTIKUM STAGE 8 — Membaca program pemeriksa recovery key

## A. Tujuan dan tingkat kesulitan

**Tahap lanjutan.** Anda harus memahami mekanisme program `EVD-VAULT-001` yang memeriksa suatu recovery key dan menghasilkan token pembatalan transaksi. Pendekatan dalam write-up adalah **analisis statis**: membaca struktur dan instruksi tanpa menjalankan biner.

**Bedakan dua hal berikut:**

- **Recovery key:** input yang program harapkan.
- **Flag:** token yang dipulihkan setelah persyaratan recovery key dan pemeriksaan keseluruhan terpenuhi.

Bayangkan sebuah alat pemeriksa memiliki banyak aturan atas posisi karakter. Alih-alih mencoba password acak dalam jumlah sangat besar, kita mempelajari **setiap aturan posisi** dan mencari karakter yang memenuhi aturan tersebut.

## B. Kenali jenis file dan petunjuk tekstual

```bash
cd /Stage8
file EVD-VAULT-001
strings -n 5 EVD-VAULT-001
objdump -d -M intel EVD-VAULT-001 > disassembly.txt
```

| Perintah/bagian | Artinya |
|---|---|
| `file EVD-VAULT-001` | Menilai format file dari ciri/struktur file. Evidence ini dikenali sebagai executable Linux **ELF 64-bit**. |
| `strings` | Mengambil kumpulan karakter terbaca yang ada di dalam biner. |
| `-n 5` | Hanya tampilkan urutan karakter minimal panjang **5**; membantu mengurangi derau string terlalu pendek. |
| `objdump` | Membaca informasi atau instruksi mesin dalam sebuah file biner. |
| `-d` | *Disassemble*: menampilkan instruksi mesin sebagai kode assembly. |
| `-M intel` | Menampilkan assembly dengan gaya sintaks Intel (lebih familier bagi sebagian pembelajar). |
| `>` | **Redirection** Bash: simpan output ke file di sebelah kanan. |
| `disassembly.txt` | File teks keluaran. Jika sudah ada, isinya akan **ditimpa**. |

**Mengapa tidak langsung dijalankan?** Program tidak dikenal bisa berbahaya. Membaca teks, format, dan disassembly adalah langkah awal yang lebih terkontrol. Hasil analisis statis belum menjamin suatu program aman dijalankan.

Menurut write-up, petunjuk cara memakai program adalah:

```text
--disarm "<DOMAIN_C2>:<RECOVERY_KEY>"
```

**Ini pola/format argumen, bukan perintah yang harus Anda eksekusi.** Tanda `<...>` merupakan placeholder. Tanda titik dua (`:`) memisahkan domain dan recovery key.

## C. Konsep bytecode, constraint, dan substitusi

Di dalam program ada bytecode, yaitu daftar instruksi sederhana yang diinterpretasikan oleh pemeriksa kunci. Untuk tiap karakter input, pemeriksa menerapkan beberapa transformasi lalu membandingkannya dengan nilai yang diharapkan.

| Istilah | Penjelasan pemula |
|---|---|
| *Opcode* (`op`) | Nomor yang mewakili tindakan/instruksi. |
| *Operand* (`arg`) | Angka pelengkap dari suatu opcode. |
| *Program counter* (`pc`) | Penunjuk posisi bytecode yang sedang dibaca. |
| *Constraint* | Syarat yang harus dipenuhi karakter. |
| XOR | Membalik bit menurut kunci sebagaimana Stage 7. |
| ROL/rotasi kiri | Memindah bit ke kiri dan memasukkan bit yang keluar dari kiri ke sisi kanan. |
| ROR/rotasi kanan | Kebalikan arah rotasi kiri. |
| S-box/substitution box | Tabel padanan byte; angka input dipakai sebagai indeks untuk menemukan angka penggantinya. |
| Rolling hash | Perhitungan ringkas yang diperbarui setiap kali karakter baru diproses. |

**Analogi:** Ada gembok dengan banyak roda. Setiap roda diperiksa memakai aturan berbeda. Jika setiap roda dapat dicari sendiri-sendiri, kita dapat menguji 0–255 kemungkinan per posisi; tidak perlu mencoba seluruh kombinasi panjang kunci sekaligus.

Pada skrip Stage 8, opcode yang disebut meliputi:

| Opcode hex | Perlakuan skrip terhadap instruksi | Gambaran |
|---|---|---|
| `0x01` | Simpan panjang input | Berapa banyak karakter yang diharapkan? |
| `0x10` | Pilih posisi karakter | Sekarang memeriksa huruf ke berapa? |
| `0x20` | XOR dengan operand | Balik bit memakai angka operand. |
| `0x21` | Rotasi bit kiri | Putar susunan 8 bit ke kiri. |
| `0x22` | Rotasi bit kanan | Putar susunan 8 bit ke kanan. |
| `0x25` | Substitusi memakai S-box | Ambil nilai pengganti dari tabel. |
| `0x30` | Uji hasil transformasi | Nilai akhir harus sama dengan target. |
| `0x26` | Dilewati oleh solver versi evidence ini | Tidak perlu melakukan tindakan lain pada cabang ini dalam skrip rujukan. |
| `0xFF` | Penanda akhir pembacaan bytecode | Hentikan pemrosesan instruksi. |

**Penting:** Angka opcode dan offset di atas merupakan temuan **khusus file evidence ini**, bukan standar untuk semua executable ELF.

## D. Jalankan solver khusus evidence

Simpan seluruh kode **Lampiran A** sebagai `/Stage8/solve_vault.py` menggunakan editor teks. Salin hanya kode Python; jangan sertakan tiga backtick pembatas kotak Markdown.

Jalankan:

```bash
python solve_vault.py
```

- `python` adalah interpreter Python yang sudah tersedia pada lingkungan praktikum.
- `solve_vault.py` adalah berkas kode yang akan dieksekusi Python.
- Tidak ada argumen tambahan karena skrip mencari biner `EVD-VAULT-001` di **folder kerja aktif**.

**Gambaran empat pekerjaan solver:**

1. Membaca seluruh byte program, kemudian mengambil potongan **bytecode** dan **S-box** dari posisi file tertentu.
2. Untuk setiap karakter, menguji semua kemungkinan byte 0–255 dan memilih byte yang lolos perbandingan.
3. Menghitung *rolling hash* atas recovery key utuh, lalu memeriksa bahwa hasilnya sama dengan nilai target.
4. Memakai hash dan tabel untuk memulihkan token/flag.

Output rujukan tahap pemulihan kunci:

```text
mitra-komunitas-global.abc:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

Nilai rolling hash yang harus cocok:

```text
0x681A640B
```

Token hasil pemulihan:

```text
MOFCG{R3_M3nyen4ngkan_Sek4l!}
```

**Jawaban Stage 8: `MOFCG{R3_M3nyen4ngkan_Sek4l!}`.**

> Domain dan recovery key merupakan bagian skenario latihan. Jangan mencoba menggunakan nilai tersebut pada sistem nyata. Flag **bukan** string domain plus recovery key.

## E. Memahami komponen Python yang paling penting

Detail semua baris skrip dibahas pada Lampiran A. Tabel berikut merupakan jembatan untuk pembaca pemula:

| Bentuk kode | Maknanya dalam konteks ini |
|---|---|
| `Path(...).read_bytes()` | Membaca seluruh isi file menjadi bytes, bukan membuka program untuk dijalankan. |
| `binary[0x2500:0x2876]` | Mengambil byte mulai offset `0x2500` sampai **sebelum** `0x2876`. |
| `pc += width` | Geser penunjuk instruksi sejumlah byte panjang instruksi saat ini. |
| `for value in range(256)` | Uji 256 kandidat angka (`0` sampai `255`). |
| `result ^= operand` | Cara singkat menulis `result = result ^ operand` (XOR). |
| `& 0xff` | Ambil delapan bit terendah saja, seperti nilai satu byte. |
| `& 0xffffffff` | Pertahankan 32 bit terendah, sesuai lebar hash 32 bit. |
| `assert ...` | Pastikan kondisi benar; jika salah, hentikan skrip dengan kesalahan. |
| `struct.pack('<I', h)` | Ubah integer 32 bit menjadi 4 byte **little-endian** (byte paling rendah lebih dahulu). |

**Little-endian contoh:** angka `0x681A640B` disimpan dalam empat byte dengan urutan `0B 64 1A 68`.

**Catatan penting tentang offset:** Angka seperti `0x2500`, `0x2880`, dan `0x24e0` mengacu ke **offset file pada biner latihan ini**, bukan rumus universal. Alamat yang tampak pada disassembly ELF bisa merupakan *virtual address*; jangan menyamakan alamat memori dengan offset berkas sebelum memastikan pemetaannya.

## F. Jika solver tidak berhasil

- **`FileNotFoundError`** → terminal belum berada di `/Stage8` atau nama biner berbeda; periksa `pwd` dan `ls`.
- **`AssertionError` pada panjang/constraint** → bytecode evidence tidak cocok dengan asumsi skrip, atau file telah berubah.
- **`AssertionError` pada rolling hash** → hasil karakter salah, S-box/offset berbeda, atau ada masalah pembacaan biner.
- **`UnicodeDecodeError`** → hasil perhitungan tidak bisa ditafsirkan sebagai ASCII; periksa input dan jangan memaksa mengganti output tanpa dasar.

**Latihan:** Mengapa solver memilih kandidat **per karakter**? Karena pemeriksaan posisi dalam evidence memungkinkan constraint lokal dipakai untuk menyaring satu byte sebelum pemeriksaan hash atas seluruh kunci.

---

# PRAKTIKUM STAGE 9 — Menelusuri artefak Firefox, ZIP, DOCX, dan makro

## A. Tujuan dan gambaran

Stage terakhir merupakan rangkaian korelasi bukti. Tidak ada satu perintah ajaib yang langsung menampilkan jawaban. Evidence utama adalah `EVD-DEV-001.zip`.

```text
ZIP evidence workstation
        |
        v
Riwayat PowerShell → petunjuk arsip pemulihan berpassword
        |
        v
Profil Firefox (logins.json + key4.db)
        |
        v
Dekripsi login offline menggunakan pustaka NSS pada salinan evidence
        |
        v
Password ZIP ditemukan → DOCX diekstrak → checksum dibandingkan
        |
        v
Komponen VBA dibaca tanpa menjalankan makro → array hex → token
```

**Kebiasaan analis:** Ikuti satu pertanyaan kecil pada satu waktu: “Arsip ini dibuat dari apa?” → “Password dari mana?” → “File hasil ekstraksi masih utuh?” → “Di mana token disimpan?”

## B. Buka arsip workstation dan periksa command history

```bash
cd /Stage9
unzip EVD-DEV-001.zip -d workstation
cat workstation/AppData/Roaming/Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt
```

| Bagian | Arti |
|---|---|
| `unzip EVD-DEV-001.zip` | Ekstraksi kumpulan file yang ada dalam arsip evidence. |
| `-d workstation` | Letakkan hasil ekstraksi di direktori `workstation`. |
| `cat` | Tampilkan isi sebuah file teks secara berurutan. |
| `.../ConsoleHost_history.txt` | Riwayat perintah PowerShell yang menjadi evidence. |

**Mengapa membaca history?** Perintah yang pernah diketik pengguna dapat memperlihatkan tindakan yang tidak terlihat dari nama file saja—misalnya membuat arsip lalu menghapus file sumber. Tetapi history bukan jaminan seluruh tindakan pengguna tercatat.

Menurut write-up, history menunjukkan pembuatan `arsip_pemulihan_darurat.zip`, penyimpanan catatan harian di dalamnya, lalu penghapusan catatan asli. **Pertanyaan selanjutnya:** dapatkah catatan dalam ZIP ditemukan kembali?

## C. Memahami penyimpanan login Firefox

Profil Firefox dalam dataset memiliki dua komponen:

| File | Fungsi sederhananya |
|---|---|
| `logins.json` | Mencatat situs/login yang disimpan; nilai username/password sensitif tidak disimpan sebagai teks biasa. |
| `key4.db` | Penyimpanan material kunci yang digunakan mekanisme perlindungan login Firefox. |

Bagian bernama `encryptedPassword` pada `logins.json` dapat direpresentasikan dalam Base64, tetapi **hasil mengubah Base64 menjadi byte masih dapat berupa data terenkripsi**. Berarti Base64 dan kriptografi bekerja pada lapisan yang berbeda.

**NSS** (*Network Security Services*) adalah pustaka keamanan yang digunakan oleh perangkat lunak Mozilla. Untuk dataset ini, skrip meminta NSS melakukan dekripsi pada **salinan profil evidence**, bukan login ke situs online.

## D. Jalankan skrip pembaca profil secara offline

Simpan kode **Lampiran B** sebagai `decrypt_firefox_ctf.py` dalam folder Stage 9. Jangan gunakan terhadap profil orang lain atau profil aktif yang tidak punya izin untuk dianalisis.

```bash
python decrypt_firefox_ctf.py \
  workstation/AppData/Roaming/Mozilla/Firefox/Profiles/dadan.default-release
```

| Bagian | Artinya |
|---|---|
| `python` | Jalankan program Python. |
| `decrypt_firefox_ctf.py` | Nama file skrip yang akan dieksekusi. |
| `\` pada akhir baris | Menggabungkan baris pertama dan kedua menjadi **satu perintah** Bash. |
| `workstation/.../dadan.default-release` | Argumen pertama yang menunjukkan lokasi profil Firefox **hasil ekstraksi evidence**. |

Skrip secara ringkas akan:

1. Memeriksa argumen path profil.
2. Membuat salinan terpisah `firefox-working` agar tidak bekerja langsung pada profil sumber.
3. Memuat `libnss3.so` dan menginisialisasi NSS terhadap folder salinan.
4. Membaca record `logins.json`, mengubah bungkus Base64 menjadi byte, lalu meminta NSS mendekripsi field login.
5. Menampilkan nilai yang didapat dan membersihkan buffer hasil.

Output rujukan pada **dataset fiktif**:

```text
Username: dadan.suherman@mofcg.or.id
Password: D4danIst!mewa2026$
```

> **Perlindungan data:** Ini merupakan password **latihan** yang sudah disediakan dalam write-up. Dalam pekerjaan forensik sesungguhnya, simpan dan bagikan kredensial sensitif secara terbatas; jangan menyalinnya ke laporan terbuka atau mencoba memakainya pada layanan eksternal.

**Catatan kondisi:** Keberhasilan pada satu profil dalam evidence ini tidak berarti skrip dapat otomatis membuka semua profil Firefox. Profil lain bisa memakai Primary Password atau mekanisme/perlindungan yang berbeda.

## E. Buka ZIP yang dilindungi password

```bash
cd workstation/Documents/Sistem_Kliring_MOFCG/Failover_Recovery
unzip arsip_pemulihan_darurat.zip
```

- `cd` pindah ke direktori tempat arsip pemulihan ditemukan.
- `unzip` membuka arsip ZIP dan mungkin meminta password interaktif.
- **Ketik password hanya ketika program meminta**, bukan sebagai baris perintah baru.
- Dengan input interaktif, karakter khusus seperti `!` dan `$` tidak diproses sebagai sintaks shell.

Hasil ekstraksi menurut write-up:

```text
Catatan_Harian_14_Juli_2026.docx
```

Jangan jalankan skrip atau makro dari hasil ekstraksi hanya untuk memeriksa isinya.

## F. Verifikasi checksum file hasil ekstraksi

```bash
sha256sum Catatan_Harian_14_Juli_2026.docx
cat Checksum_Verifikasi_Failover.sha256
```

| Bagian | Arti |
|---|---|
| `sha256sum` | Menghitung nilai SHA-256 berdasarkan byte file DOCX. |
| `Catatan_Harian_14_Juli_2026.docx` | File yang integritasnya akan diperiksa. |
| `cat` | Menampilkan catatan checksum pembanding. |
| `Checksum_Verifikasi_Failover.sha256` | File yang dalam latihan memuat nilai hash rujukan. |

Nilai yang cocok menurut write-up:

```text
72038973f0c2b0139672212bf9b83a8f63a10b9162c78bf73302a912c28f0d3f
```

**Mengapa membandingkan checksum?** Untuk memeriksa apakah file yang dipulihkan mempunyai byte yang sama dengan file yang dicatat pada checksum tersebut. Jangan menyamakan checksum cocok dengan “dokumen pasti aman”.

## G. Pahami format DOCX dan makro

**DOCX** adalah paket ZIP berisi bagian-bagian dokumen, umumnya XML dan file pendukung lain. Isi yang terlihat dalam Microsoft Word bukan satu-satunya informasi yang dapat ada di paket dokumen.

**VBA** (*Visual Basic for Applications*) merupakan bahasa makro Office. Makro adalah program yang dapat menjalankan tugas otomatis; karena berisiko, analisis awal sebaiknya **membaca sumber makro secara statis tanpa mengeksekusinya**.

**Catatan format:** Pada Office modern, file yang makro-enabled umumnya menggunakan ekstensi seperti `.docm`. Namun nama ekstensi saja bukan cara pemeriksaan forensik yang memadai; pada evidence ini write-up mengidentifikasi komponen `word/vbaProject.bin` di dalam paket bernama `.docx`.

## H. Periksa struktur paket dan baca kode makro

```bash
unzip -l Catatan_Harian_14_Juli_2026.docx
unzip -p Catatan_Harian_14_Juli_2026.docx word/vbaProject.bin > vbaProject.bin
olevba vbaProject.bin
```

| Potongan perintah | Arti |
|---|---|
| `unzip -l` | *List*: tampilkan daftar file di dalam ZIP/DOCX tanpa mengekstrak semuanya. |
| `unzip -p` | *Pipe to stdout*: ambil satu file dari dalam arsip, kirim byte-nya ke output standar. |
| `word/vbaProject.bin` | Path komponen makro di dalam paket berdasarkan evidence. |
| `>` | Simpan byte hasil ekstraksi ke file `vbaProject.bin` di folder aktif. File lama dengan nama sama akan ditimpa. |
| `olevba` | Utilitas dari `oletools` untuk membaca dan menganalisis VBA secara statis. |
| `vbaProject.bin` | File biner hasil ekstraksi yang dibaca oleh `olevba`. |

**Mengapa `strings` saja belum tentu cukup?** Sumber makro VBA dapat tersimpan dalam representasi terkompresi atau struktur kompleks. `olevba` dirancang untuk membacanya secara lebih tepat daripada hanya mencari teks biasa.

Dalam modul `ThisDocument` write-up menemukan:

```vb
rawBytes = Array(&H4D, &H4F, &H46, &H7B, &H43, &H47, &H32, &H30, &H7D, &H32, &H36)
```

**Interpretasinya:**

- `rawBytes` adalah nama variabel array.
- `Array(...)` menyimpan beberapa nilai secara berurutan.
- `&H` pada VBA menandakan angka hex. Misalnya `&H4D` sama nilainya dengan `0x4D` di Python, yaitu karakter `M` pada ASCII.
- Berdasarkan write-up, fungsi makro memanggil `Chr` untuk mengubah setiap angka menjadi karakter, kemudian menyatukannya.

## I. Validasi konversi angka tanpa menjalankan makro

```python
angka = [0x4d, 0x4f, 0x46, 0x7b, 0x43, 0x47, 0x32, 0x30, 0x7d, 0x32, 0x36]
print(bytes(angka).decode('ascii'))
```

| Potongan | Makna |
|---|---|
| `angka = [...]` | Buat list angka byte dari isi array VBA. |
| `0x4d` | Penulisan angka hex; byte `4D` menjadi karakter `M`. |
| `bytes(angka)` | Ubah daftar integer menjadi urutan byte sesuai urutannya. |
| `.decode('ascii')` | Tafsirkan byte sebagai karakter ASCII. |
| `print(...)` | Cetak teks final ke terminal. |

Konversi secara manual:

```text
4D 4F 46 7B 43 47 32 30 7D 32 36
 M  O  F  {  C  G  2  0  }  2  6
```

Keluaran rujukan:

```text
MOF{CG20}26
```

**Jawaban Stage 9: `MOF{CG20}26`.**

> **Jangan memperbaiki isi evidence demi mengikuti pola yang biasa.** Meski berbeda dari format `MOFCG{...}` stage sebelumnya, urutan `MOF{CG20}26` adalah hasil konversi yang ditampilkan write-up dan disebut sebagai token yang diterima validator pada latihan tersebut.

## J. Jika terjadi kesalahan

- **ZIP meminta password** → normal. Gunakan nilai yang ditemukan pada profil Firefox sesuai skenario.
- **`firefox-working sudah ada`** → skrip sengaja berhenti agar tidak mencampur hasil lama. Jalankan di direktori kerja baru yang bersih, bukan menghapus bukti sumber.
- **`NSS tidak dapat membuka salinan profil`** → periksa `libnss3`, path profil, `key4.db`, dan hak akses file.
- **`Dekripsi gagal`** → profil bisa berbeda, rusak, atau memakai Primary Password; jangan mengasumsikan semua profil dapat dibuka.
- **`olevba` tidak dikenali** → laporkan kepada pengelola praktikum karena modul ini mengasumsikan semua alat sudah siap.
- **Tidak ada `word/vbaProject.bin`** → periksa output `unzip -l`; jangan mengarang nama file komponen yang tidak ada dalam evidence Anda.

**Latihan:** Mengapa ada dua pemeriksaan (password dan SHA-256)? **Jawaban:** password dipakai agar file ZIP bisa dibuka; hash dipakai untuk membandingkan integritas file DOCX yang diperoleh.

---

# LAMPIRAN A — Kode lengkap dan cara membaca `solve_vault.py` (Stage 8)

## A.1. Peta berpikir sebelum membaca kode

Skrip ini tidak dirancang untuk semua program. Ia memakai format bytecode, S-box, dan offset dari biner evidence `EVD-VAULT-001` dalam write-up.

| Kelompok | Pertanyaan yang dijawab | Variabel kunci |
|---|---|---|
| 1. Baca biner | Dari mana bytecode dan tabel transformasi diperoleh? | `binary`, `code`, `sbox` |
| 2. Dekode instruksi | Instruksi apa yang dipakai untuk memeriksa setiap posisi karakter? | `pc`, `op`, `arg`, `width`, `index` |
| 3. Cari kandidat | Byte apa yang dapat lolos setiap pemeriksaan? | `transforms`, `candidates`, `constraints` |
| 4. Periksa kunci | Apakah seluruh karakter cocok dengan hash keseluruhan? | `key`, `h` |
| 5. Ambil flag | Bagaimana token tersamar dipulihkan menjadi teks? | `hash_bytes`, `flag` |

**Istilah Python tambahan:**

- `None` berarti nilai belum diisi (belum diketahui), bukan angka nol.
- `{}` adalah dictionary (pasangan kunci dan nilai); `[]` adalah list (urutan item).
- `enumerate(key)` menghasilkan pasangan `(indeks, karakter)`.
- `range(256)` menghasilkan 0 sampai 255, **tidak termasuk** 256.
- `assert` adalah pemeriksaan asumsi. Jika salah, program berhenti dengan `AssertionError`. Ini membantu mendeteksi evidence yang berbeda.
- `raise ValueError(...)` sengaja menghentikan pemrosesan jika opcode tidak dikenali.
- Angka dengan awalan `0x` dibaca sebagai hex. `0xff` = 255, `0xffffffff` = batas masker 32 bit.

## A.2. Simpan kode berikut menjadi file `solve_vault.py`

Komentar `# ...` ditambahkan agar mahasiswa paham tujuannya. Pernyataan komputasi utama tetap mengikuti solver write-up.

```python
# pathlib menyediakan Path untuk membaca file secara lebih jelas.
from pathlib import Path
# struct membantu mengubah angka menjadi urutan byte sesuai endianness.
import struct

# Ambil SELURUH byte biner. Ini membaca data, bukan menjalankan program ELF.
binary = Path('EVD-VAULT-001').read_bytes()

# Ambil potongan berdasarkan offset dalam file evidence khusus ini.
# Format slice: [awal:akhir]; posisi akhir tidak ikut diambil.
code = binary[0x2500:0x2876]
sbox = binary[0x2880:0x2980]

# pc = posisi instruksi yang sedang dibaca, dimulai dari byte pertama.
pc = 0
# length belum diketahui sebelum opcode panjang input ditemukan.
length = None
# index adalah posisi karakter yang saat ini diuji.
index = None
# transformations menyimpan langkah pemrosesan untuk satu karakter.
transforms = []
# constraints memetakan posisi karakter ke nilai byte yang lolos tes.
constraints = {}

# Baca satu instruksi demi instruksi selama masih dalam rentang bytecode.
while pc < len(code):
    # Byte pertama instruksi adalah kode operasi (opcode).
    op = code[pc]
    # Dalam evidence ini 0xFF menandai bagian akhir bytecode.
    if op == 0xff:
        break

    # Dua opcode ini memiliki panjang 2 byte; yang lain 3 byte.
    width = 2 if op in (0x01, 0x25) else 3
    # Byte terakhir instruksi berisi operand/argumen.
    arg = code[pc + width - 1]

    if op == 0x01:
        # Simpan banyaknya karakter yang seharusnya ada pada input.
        length = arg
    elif op == 0x10:
        # Mulai syarat untuk posisi karakter yang baru.
        index = arg
        transforms = []
    elif op in (0x20, 0x21, 0x22, 0x25):
        # Catat langkah transformasi: XOR, rotasi, atau substitusi.
        transforms.append((op, arg))
    elif op == 0x30:
        # Opcode perbandingan: cari kandidat byte input yang benar.
        candidates = []
        # Nilai satu byte hanya berkisar 0 sampai 255.
        for value in range(256):
            result = value
            # Terapkan langkah transformasi sesuai urutan bytecode.
            for transform, operand in transforms:
                if transform == 0x20:
                    # XOR dengan nilai operand.
                    result ^= operand
                elif transform == 0x21:
                    # Rotasi 8-bit ke kiri. Mask 0xFF menahan hanya 8 bit.
                    result = ((result << operand) |
                              (result >> (8 - operand))) & 0xff
                elif transform == 0x22:
                    # Rotasi 8-bit ke kanan.
                    result = ((result >> operand) |
                              (result << (8 - operand))) & 0xff
                elif transform == 0x25:
                    # Ambil pengganti dari substitution table.
                    result = sbox[result]
            # Jika hasil cocok dengan target, catat byte kandidat.
            if result == arg:
                candidates.append(value)
        # Untuk evidence ini, harus ada satu kandidat di tiap posisi.
        assert len(candidates) == 1, (index, candidates)
        constraints[index] = candidates[0]
    elif op != 0x26:
        # Jika opcode tak dikenali, jangan lanjut berdasarkan tebakan.
        raise ValueError(f'Opcode tidak dikenal: {op:#x}')

    # Lompat maju sesuai panjang instruksi yang baru diproses.
    pc += width

# Pastikan panjang input ditemukan dan semua posisi berhasil dipulihkan.
assert length is not None
assert len(constraints) == length

# Urutkan byte kandidat berdasarkan posisi: 0, 1, 2, dan seterusnya.
key = bytes(constraints[i] for i in range(length))
print('Recovery key:', key.decode('ascii'))

# Mulai perhitungan rolling hash dari nilai awal (seed) khusus evidence.
h = 0x1337beef
# Untuk tiap byte dalam key, i = posisi, character = nilai byte.
for i, character in enumerate(key):
    # Kombinasi hash sebelumnya, konstanta 31, dan nilai dari S-box.
    # & 0xffffffff mempertahankan 32 bit terakhir.
    h = (h * 31 + sbox[(character + i) & 0xff]) & 0xffffffff
    # Putar bit hash 7 langkah ke kiri pada bidang 32 bit.
    h = ((h << 7) | (h >> 25)) & 0xffffffff
    # XOR dengan konstanta 32 bit yang ditentukan pemeriksa.
    h ^= 0x5a5a5a5a

# Hash hasil harus sama dengan nilai target.
assert h == 0x681a640b
print('Rolling hash:', hex(h))

# '<I' = integer 32 bit unsigned, little-endian.
# Misalnya 0x681A640B menjadi bytes 0B 64 1A 68.
hash_bytes = struct.pack('<I', h)

# Buka 29 byte token tersamar: byte biner XOR S-box XOR byte hash.
# i % 4 membuat indeks hash_bytes berputar 0,1,2,3,0,1,...
flag = bytes(binary[0x24e0 + i] ^ sbox[i] ^ hash_bytes[i % 4]
             for i in range(29))
print('Flag:', flag.decode('ascii'))
```

## A.3. Contoh mengapa `& 0xff` digunakan

```python
nilai = 0x1FF
print(hex(nilai))          # 0x1ff (lebih besar dari 1 byte)
print(hex(nilai & 0xFF))   # 0xff (hanya delapan bit bawah)
```

Ketika program asli menggunakan tipe satu byte, hasil perhitungan yang lebih besar harus dibatasi menjadi 8 bit. Pada Python, integer tidak otomatis berhenti pada delapan bit; karena itu skrip perlu masker `& 0xff`.

## A.4. Contoh operasi pergeseran, rotasi, dan XOR

```python
x = 0b10000001
print(bin(x << 1))            # Geser satu bit kiri, belum dibatasi satu byte.
print(bin((x << 1) & 0xff))   # Bit yang keluar terbuang; hasil 00000010.
print(bin(((x << 1) | (x >> 7)) & 0xff))  # Rotasi: bit kiri kembali ke kanan.
```

- `<<` adalah operasi geser kiri.
- `>>` adalah operasi geser kanan.
- `|` **di Python** adalah operasi bitwise OR; berbeda dari **pipe `|` di Bash**.
- `&` **di Python** adalah bitwise AND; berbeda dari simbol `&&` pada filter Wireshark.

**Peringatan asumsi:** Rumus rotasi dalam solver mengasumsikan operand rotasi sesuai rentang yang digunakan bytecode evidence. Jika menganalisis biner berbeda, validasi terlebih dahulu rentang operand, panjang instruksi, serta hasil ekstraksi.

---

# LAMPIRAN B — Kode lengkap dan cara membaca `decrypt_firefox_ctf.py` (Stage 9)

## B.1. Tujuan, batas, dan risiko

Skrip ini membaca **salinan profil Firefox latihan** secara lokal menggunakan NSS, bukan mengakses akun di internet. Ia memperlihatkan konsep pengolahan artefak browser untuk forensik. Jangan gunakan terhadap profil yang tidak diberikan izin eksplisit untuk dianalisis.

**Lima fase yang perlu dipahami:**

1. Baca parameter lokasi profil dan buat salinan kerja.
2. Jelaskan format data yang dipakai NSS dengan `SECItem`.
3. Muat pustaka NSS dan beri tahu bentuk argumen tiap fungsi C.
4. Baca record JSON, ubah Base64 menjadi byte, minta NSS mendekripsi field tertentu.
5. Bebaskan memori hasil dan tutup NSS.

**Konsep yang perlu diperhatikan:**

| Istilah | Penjelasan mahasiswa |
|---|---|
| `sys.argv` | List argumen yang diberikan dari terminal kepada skrip. `sys.argv[0]` nama skrip; `[1]` path profil. |
| `Path(...).resolve()` | Mengubah path menjadi path absolut untuk mengurangi ambiguitas direktori. |
| `shutil.copytree()` | Menyalin folder beserta isi subfoldernya. |
| `ctypes` | Cara Python memanggil fungsi yang dibuat dalam pustaka C. |
| `C.Structure` | Mendefinisikan struktur data yang kompatibel dengan struktur milik fungsi C. |
| `CDLL('libnss3.so')` | Memuat pustaka NSS dari sistem Linux. |
| `argtypes` dan `restype` | Memberi tahu `ctypes` jenis input dan output fungsi C. |
| `base64.b64decode()` | Mengubah representasi Base64 menjadi byte terenkripsi yang dapat diproses NSS. |
| `PK11SDR_Decrypt` | Fungsi NSS yang diminta untuk mendekripsi data login tersimpan. |
| `try/finally` | Memastikan langkah pembersihan dijalankan, termasuk saat terjadi kegagalan. |

## B.2. Kode dengan anotasi

Simpan sebagai `decrypt_firefox_ctf.py` di folder `/Stage9`.

```python
# Path untuk mengelola lokasi file/folder.
from pathlib import Path
# Modul Base64 untuk mengubah representasi teks menjadi byte.
import base64
# ctypes digunakan untuk berkomunikasi dengan pustaka C (NSS).
import ctypes as C
# json membaca struktur logins.json.
import json
# shutil menyediakan fungsi penyalinan folder.
import shutil
# sys menyediakan daftar argumen dari terminal.
import sys

# Harus ada tepat satu argumen setelah nama script: PATH_PROFIL_EVIDENCE.
if len(sys.argv) != 2:
    raise SystemExit('Pemakaian: python decrypt_firefox_ctf.py PATH_PROFIL_EVIDENCE')

# Ubah path profil sumber menjadi path absolut.
source = Path(sys.argv[1]).resolve()
# Tentukan nama dan lokasi folder salinan kerja.
working = Path('firefox-working').resolve()

# Hindari menimpa salinan dari percobaan sebelumnya.
if working.exists():
    raise SystemExit('firefox-working sudah ada; gunakan direktori kerja baru.')
# Salin profil evidence untuk dianalisis terpisah dari sumber.
shutil.copytree(source, working)

# SECItem adalah struktur data yang diharapkan fungsi NSS.
# type = tipe item; data = alamat buffer; len = panjang buffer.
class SECItem(C.Structure):
    _fields_ = [('type', C.c_uint), ('data', C.c_void_p), ('len', C.c_uint)]

# Muat pustaka keamanan Mozilla NSS.
nss = C.CDLL('libnss3.so')

# Set jenis argumen dan hasil untuk menghindari salah penafsiran pointer.
nss.NSS_Init.argtypes = [C.c_char_p]
nss.NSS_Init.restype = C.c_int
nss.NSS_Shutdown.argtypes = []
nss.NSS_Shutdown.restype = C.c_int
nss.PK11SDR_Decrypt.argtypes = [C.POINTER(SECItem), C.POINTER(SECItem), C.c_void_p]
nss.PK11SDR_Decrypt.restype = C.c_int
nss.SECITEM_FreeItem.argtypes = [C.POINTER(SECItem), C.c_int]
nss.SECITEM_FreeItem.restype = None

# Inisialisasi NSS terhadap database profil salinan.
# Awalan 'sql:' mengacu pada backend database SQL milik NSS.
status = nss.NSS_Init(('sql:' + str(working)).encode())
if status != 0:
    raise SystemExit('NSS tidak dapat membuka salinan profil.')

try:
    # Baca logins.json sebagai teks JSON lalu pilih array 'logins'.
    records = json.loads((working / 'logins.json').read_text())['logins']

    # Telusuri setiap entri login satu per satu.
    for record in records:
        print('Host:', record['hostname'])

        # Baca kedua nilai tersandi: username dan password.
        for field in ('encryptedUsername', 'encryptedPassword'):
            # Base64 hanyalah lapisan representasi; byte-nya belum plaintext.
            raw = base64.b64decode(record[field])
            # Siapkan buffer byte yang bisa dipakai fungsi C.
            buffer = C.create_string_buffer(raw)
            # Buat SECItem yang menunjuk ke buffer dan panjangnya.
            source_item = SECItem(0, C.cast(buffer, C.c_void_p), len(raw))
            # Siapkan SECItem kosong sebagai wadah hasil dekripsi.
            result = SECItem()

            # NSS mendekripsi byte tersandi menggunakan database profil.
            status = nss.PK11SDR_Decrypt(C.byref(source_item), C.byref(result), None)
            if status != 0:
                raise RuntimeError('Dekripsi gagal; periksa profil dan Primary Password.')

            try:
                # Ambil byte hasil dari alamat memori dan decode UTF-8.
                print(field, C.string_at(result.data, result.len).decode('utf-8'))
            finally:
                # Bebaskan memori hasil yang dialokasikan NSS.
                nss.SECITEM_FreeItem(C.byref(result), 0)
finally:
    # Tutup NSS walaupun terjadi kesalahan di tengah proses.
    nss.NSS_Shutdown()
```

## B.3. Cara membaca output skrip secara tepat

Skrip tersebut akan mencetak nama `Host:` dan nama field aslinya, yaitu `encryptedUsername` serta `encryptedPassword` **diikuti nilai yang berhasil didekripsi**. Pada narasi Stage 9, isi nilainya disederhanakan dalam bentuk `Username:` dan `Password:` agar mudah dipahami; nama label sebenarnya pada output kode tetap sesuai `print(field, ...)`.

**Mengapa perlu salinan `firefox-working`?** Praktik forensik mengutamakan preservasi sumber, pengurangan perubahan tak sengaja, dan kemampuan mengulang prosedur. Catatan: membuat salinan tidak otomatis membuat analisis forensik menjadi sempurna; prosedur resmi juga perlu pencatatan hash, chain of custody, kontrol akses, dan dokumentasi.

**Mengapa ada `try/finally`?** Pustaka C dapat mengalokasikan memori yang tidak otomatis dibebaskan oleh garbage collector Python. Blok `finally` menjaga agar `SECITEM_FreeItem` dan `NSS_Shutdown` tetap dipanggil pada jalur eksekusi yang terkait.

**Bagaimana jika Primary Password dipakai?** Skrip ini tidak menjamin dapat mengakses profil dengan Primary Password atau konfigurasi keamanan yang berbeda. Kegagalan adalah hasil yang perlu dicatat, bukan alasan untuk menebak-nebak password pengguna nyata.

---

# 3. Ringkasan hasil Stage 1–9

> Tabel ini **mengandung jawaban**. Gunakan setelah menyelesaikan latihan atau saat mengevaluasi hasil praktik.

| Stage | Bukti yang menentukan | Teknik kunci | Token/flag menurut write-up |
|---|---|---|---|
| 1 | Header `X-Campaign-Tag` pada MBOX | GPG + `grep` | `MOFCG{J4ngan}` |
| 2 | Pesan Base64 pada event `WAF_ALERT` | JSON + Base64 | `MOFCG{S4mP4!}` |
| 3 | Payload hex pada frame PCAP 350 | Hex + ROT13 | `MOFCG{Tert!puu}` |
| 4 | Tag EXIF `Software` pada JPEG | Metadata + hex | `MOFCG{Or4ang}` |
| 5 | Objek teks putih pada PDF | `pdftotext` | `MOFCG{D4l4m}` |
| 6 | Payload `steghide` dari JPEG dan passphrase PDF | Steganografi | `TU9GQ0d7RDRsNG19` |
| 7 | `AUTH_SCHEME: XOR_0x5A` pada dump memori | `strings` + XOR | `MOFCG{M3m0ryFor3ns1k_S3ru}` |
| 8 | Bytecode dan rolling hash program vault | Reverse engineering statis | `MOFCG{R3_M3nyen4ngkan_Sek4l!}` |
| 9 | Array `rawBytes` pada modul VBA | Firefox → ZIP → SHA-256 → VBA | `MOF{CG20}26` |

## 4. Lembar kerja praktik untuk mahasiswa

Salin templat berikut dan isi **untuk setiap stage**, bukan hanya jawaban akhirnya:

```markdown
### Laporan Stage: [nomor dan judul]
1. Pertanyaan investigasi:
2. Nama evidence dan path:
3. Perintah / filter yang digunakan:
4. Fungsi dan arti opsi perintah:
5. Potongan output yang relevan:
6. Mengapa output tersebut relevan?
7. Proses decoding / dekripsi / korelasi:
8. Flag / token yang diperoleh:
9. Hal yang belum dapat dipastikan dari evidence:
10. Kesalahan atau kendala yang ditemui dan cara mengatasinya:
```

**Kriteria penilaian yang disarankan bagi dosen:**

| Aspek | Bobot | Yang dinilai |
|---|---:|---|
| Proses teknis | 35% | Perintah sesuai konteks dan bisa dijelaskan tiap opsi/argumennya. |
| Penalaran berbasis bukti | 30% | Setiap perubahan metode memiliki alasan yang dapat ditelusuri pada evidence. |
| Ketepatan output | 20% | Nilai hasil ditranskrip persis; encoding dan plaintext tidak tertukar. |
| Keselamatan dan etika | 15% | Menjaga evidence asli, tidak menjalankan program/makro tak tepercaya, tidak menggunakan kredensial di luar latihan. |

## 5. Kuis akhir (tanpa perlu mencari flag lagi)

1. Apa perbedaan `--decrypt` dan `base64 -d`, padahal sama-sama membuat isi lebih terbaca?
2. Mengapa `grep -nE` menghasilkan nomor baris, sedangkan `grep -oE` hanya menghasilkan bagian teks yang cocok?
3. Pada Stage 3, mengapa port `53` saja tidak membuktikan bahwa isi paket valid sebagai DNS?
4. Mengapa Stage 4 dan Stage 6 dapat memakai JPEG yang sama tetapi tekniknya berbeda?
5. Apa perbedaan objek teks PDF dengan teks yang sudah menjadi gambar hasil scan?
6. Apa arti `0x5A` dan mengapa XOR yang sama bisa membalik payload pada Stage 7?
7. Mengapa `& 0xff` diperlukan pada sebagian operasi byte dalam Python?
8. Mengapa pemeriksaan hash seluruh recovery key masih diperlukan setelah karakter per posisi ditemukan?
9. Mengapa hasil Base64 pada Stage 6 tidak boleh otomatis diganti dengan plaintext-nya ketika menyerahkan jawaban?
10. Mengapa password ZIP dan pemeriksaan hash DOCX punya fungsi yang berbeda?
11. Mengapa `word/vbaProject.bin` dianalisis secara statis dengan `olevba`, bukan menekan tombol *Enable Content* di Word?
12. Mengapa `MOF{CG20}26` harus dipertahankan persis walaupun formatnya tidak seragam?

<details>
<summary><strong>Klik untuk melihat pembahasan kuis</strong></summary>

1. `--decrypt` membuka **enkripsi memakai kunci**, sedangkan `base64 -d` hanya membalik representasi Base64 tanpa kunci rahasia.
2. `-n` meminta nomor baris; `-o` meminta hanya substring yang cocok dengan pola.
3. Port adalah penanda transportasi, tidak memvalidasi isi protokol.
4. Metadata EXIF dan payload steganografi adalah lokasi/metode penyimpanan yang berbeda.
5. Objek teks dapat diekstrak sebagai karakter; gambar scan biasanya perlu OCR untuk mengenali bentuk huruf.
6. `0x5A` adalah satu byte kunci bernilai 90 desimal. XOR dengan kunci yang sama dua kali mengembalikan data asli.
7. Agar hasil tetap mengikuti rentang 8 bit (0–255) seperti byte di program asli.
8. Syarat per karakter tidak selalu memastikan keseluruhan kunci cocok dengan pemeriksaan global.
9. Validator Stage 6 menurut write-up meminta **string encoded mentah**, bukan hasil decoded.
10. Password memberi akses membuka arsip; hash membandingkan integritas isi file yang diperoleh.
11. Menjalankan makro tak tepercaya bisa menjalankan perilaku berbahaya. Pembacaan statis meminimalkan risiko tersebut.
12. Bukti digital harus ditranskrip apa adanya; memperbaiki format demi tampak seragam adalah perubahan tanpa dasar.

</details>

## 6. Referensi konsep untuk pendalaman

Referensi berikut berasal dari rujukan yang dicantumkan dalam write-up awal. Modul tidak bergantung pada akses situs-situs ini untuk menyelesaikan evidence latihan.

- [GnuPG Manual](https://www.gnupg.org/gph/en/manual.html) — pengelolaan kunci dan dekripsi.
- [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html) — penjelasan resmi encoding Base64.
- [ExifTool: Tag Names](https://exiftool.org/TagNames/) — struktur metadata file.
- [pypdf: Extract Text](https://pypdf.readthedocs.io/en/5.4.0/user/extract-text.html) — ekstraksi teks PDF.
- [steghide Manual](https://steghide.sourceforge.net/documentation/manual.pdf) — mekanisme penyisipan/ekstraksi steganografi.
- [Python: Bitwise Operations](https://docs.python.org/3/reference/expressions.html#binary-bitwise-operations) — penjelasan `^`, `&`, `|`, dan shift.
- [Mozilla NSS Documentation](https://firefox-source-docs.mozilla.org/security/nss/) — pustaka keamanan Mozilla.
- [Microsoft MS-OVBA](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-ovba/492124cc-5afc-48c8-b439-b42ad7087a7b) — struktur dan kompresi kode sumber VBA.

---

**Penutup untuk mahasiswa:** Pada analisis keamanan siber, yang dinilai bukan hanya kecepatan menemukan flag, melainkan kemampuan menerangkan **petunjuk → alasan memilih metode → perintah yang dijalankan → output → kesimpulan yang didukung evidence**. Seluruh identitas, domain, akun, dan kejadian di dalam latihan MOFCG digunakan dalam skenario pembelajaran. Jangan menjadikan output CTF sebagai dasar kesimpulan tentang pihak nyata tanpa bukti tambahan.
