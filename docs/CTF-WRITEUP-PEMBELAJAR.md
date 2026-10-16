# MOFCG CTF — Panduan Pembelajar Stage 1–9

Panduan ini menjelaskan **mengapa suatu teknik dipakai, bagaimana teknik itu bekerja, dan bagaimana hasilnya mengarah ke flag**. Pembaca tidak perlu menguasai forensik terlebih dahulu, tetapi sebaiknya mengenal terminal dan cara menjalankan Python.

Dokumen ini berdiri sendiri. Tidak ditambahkan ke halaman atau tautan write-up LinuxLab. Seluruh nama orang, rekening, domain, dan konteks insiden dibaca sebagai bagian dataset latihan MOFCG.

> **Spoiler:** panduan berisi jawaban dan langkah penyelesaian. Cobalah evidence terlebih dahulu, kemudian gunakan penjelasan untuk memeriksa penalaran.

## Daftar isi

1. [Persiapan dan konsep dasar](#persiapan-dan-konsep-dasar)
2. [Stage 1 — Email, MBOX, dan GPG](#stage-1--email-mbox-dan-gpg)
3. [Stage 2 — Log JSON dan Base64](#stage-2--log-json-dan-base64)
4. [Stage 3 — Korelasi jaringan dan ROT13](#stage-3--korelasi-jaringan-dan-rot13)
5. [Stage 4 — Metadata JPEG dan jejak host](#stage-4--metadata-jpeg-dan-jejak-host)
6. [Stage 5 — PDF dan teks putih](#stage-5--pdf-dan-teks-putih)
7. [Stage 6 — Steganografi dan token bonus](#stage-6--steganografi-dan-token-bonus)
8. [Stage 7 — Memori dan XOR](#stage-7--memori-dan-xor)
9. [Stage 8 — Rekayasa balik biner dan VM](#stage-8--rekayasa-balik-biner-dan-vm)
10. [Stage 9 — Firefox, arsip, dan VBA](#stage-9--firefox-arsip-dan-vba)
11. [Ringkasan dan latihan mandiri](#ringkasan-dan-latihan-mandiri)

## Persiapan dan konsep dasar

### Lingkungan kerja

Contoh shell menggunakan Bash pada Kali Linux atau WSL. Evidence lokal pada proyek LinuxLab berada di `public/ctf/evidence/`. Pada sumber pengguna, Stage 1–5 juga tersedia di `C:\Users\gufroni\Desktop\MOFCG`.

Salin evidence ke direktori kerja agar hasil ekstraksi tidak bercampur dengan sumber. Contoh dari WSL:

```bash
mkdir -p ~/mofcg-belajar
cp -a /mnt/c/Users/gufroni/Documents/GitHub/linuxlab/public/ctf/evidence/. ~/mofcg-belajar/
cd ~/mofcg-belajar
find . -type f -exec sha256sum '{}' + > manifest-awal.sha256
```

Paket yang digunakan dalam panduan:

```bash
sudo apt update
sudo apt install gnupg jq exiftool steghide poppler-utils tshark binutils unzip python3-venv libnss3
python3 -m venv ~/venvs/mofcg
source ~/venvs/mofcg/bin/activate
python -m pip install pypdf oletools
```

`olevba` disediakan paket Python `oletools`. NSS digunakan melalui pustaka Linux `libnss3.so`. Jika sebagian alat sudah tersedia, tidak perlu menginstalnya kembali. Contoh Python dijalankan dengan `python` dari virtual environment tersebut.

### Empat istilah yang sering tertukar

| Istilah | Tujuan | Cara mengembalikan data | Contoh pada CTF |
|---|---|---|---|
| Encoding | Mengubah representasi data | Aturan dekode, biasanya tanpa rahasia | Hex, Base64 |
| Enkripsi | Membatasi siapa yang dapat membaca | Kunci atau passphrase yang sesuai | Arsip GPG, kredensial Firefox |
| Hash | Membuat sidik jari data | Tidak dirancang untuk dibalik | SHA-256 evidence |
| Steganografi | Menyembunyikan keberadaan pesan dalam media lain | Ekstraksi dengan metode dan parameter yang sesuai | Payload dalam JPEG |

ROT13 adalah substitusi sederhana untuk penyamaran. XOR adalah operasi matematika yang dapat menjadi bagian algoritma kriptografi; XOR satu byte berulang pada Stage 7 hanya penyamaran yang mudah dibalik.

### Byte, hex, dan ASCII

Bit bernilai 0 atau 1. Satu byte terdiri dari 8 bit, sehingga dapat mewakili nilai 0–255. Hexadecimal atau basis 16 menggunakan `0–9` dan `A–F`; dua digit hex mewakili satu byte.

```text
Hex 4D = desimal 77 = biner 01001101 = karakter ASCII M
Hex 4F = desimal 79 = biner 01001111 = karakter ASCII O
```

Dalam Python:

```python
print(bytes.fromhex('4d4f').decode('ascii'))  # MO
print(ord('M'))                            # 77
print(hex(ord('M')))                       # 0x4d
```

Menemukan hex belum berarti menemukan enkripsi. Kita baru melihat representasi byte.

### Hash dan integritas

`sha256sum` menghasilkan sidik jari 256 bit, biasanya ditampilkan sebagai 64 digit hex. Bandingkan hash sebelum dan sesudah analisis untuk mengetahui apakah byte berubah.

Hash yang cocok mendukung bahwa dua salinan identik secara praktis; hash **tidak** membuktikan siapa pembuatnya, apakah narasinya benar, atau apakah file itu aman. Nilai pembanding juga harus berasal dari sumber yang dapat dipertanggungjawabkan.

### Cara berpikir analis

Pisahkan tiga hal saat mencatat temuan:

- **Observasi:** byte atau field apa yang benar-benar ada?
- **Interpretasi:** apa arti teknisnya?
- **Batasan:** kesimpulan apa yang belum didukung?

Contoh: “log mencatat PasswordReset” adalah observasi. “Ada percobaan reset password” adalah interpretasi. “Seluruh reset berhasil” belum dapat disimpulkan tanpa field status atau bukti tambahan.

Gunakan alur: **inventaris → petunjuk → hipotesis → pemeriksaan → hasil → verifikasi**. Jangan langsung menebak flag dari judul stage.

## Stage 1 — Email, MBOX, dan GPG

### Target dan evidence

Tujuannya membuka arsip korespondensi dan memeriksa kontak awal yang mencurigakan.

| File | Kegunaan |
|---|---|
| `EVD-KEY-001.asc` | Private key GPG untuk membuka arsip |
| `EVD-MAIL-001.mbox.enc` | Arsip email terenkripsi |
| `EVD-DOC-002.txt` | Panduan komunikasi eksternal sebagai konteks |

### Materi: apa itu GPG?

GnuPG atau GPG mengimplementasikan mekanisme OpenPGP. Dalam penggunaan kunci publik, penerima memiliki pasangan public key dan private key. Public key dapat dibagikan; private key digunakan untuk membuka pesan yang ditujukan kepada pemilik kunci. Implementasi menggunakan pendekatan hibrida: data dienkripsi dengan kunci sesi, lalu kunci sesi dilindungi menggunakan kriptografi kunci publik. Penjelasan resmi tersedia pada [GNU Privacy Handbook](https://www.gnupg.org/gph/en/manual.html).

Ekstensi `.asc` sering menandakan data ASCII-armored: data biner dibungkus menjadi teks yang dapat dipindahkan dengan mudah. **Ekstensi bukan bukti final jenis isi.** Periksa berkas dan keluaran alat.

Private key bisa memiliki passphrase tambahan. Memiliki file kunci belum selalu cukup jika kunci itu masih terkunci.

### Materi: struktur email dan MBOX

MBOX menampung banyak email dalam satu file. Di dalam setiap pesan terdapat:

1. Header, seperti `From`, `To`, `Date`, `Subject`, dan field tambahan.
2. Baris kosong pemisah.
3. Body atau isi pesan.

Header berawalan `X-` sering digunakan untuk field tambahan. Dalam latihan ini, field seperti itu menjadi tempat penyimpanan flag. Nilai `From` sendiri tidak membuktikan identitas pengirim karena field email dapat direkayasa.

### Langkah 1: buka arsip dengan keyring khusus analisis

```bash
cd ~/mofcg-belajar/Stage1
ctf_keyring=$(mktemp -d /tmp/mofcg-gpg.XXXXXX)
chmod 700 "$ctf_keyring"
gpg --homedir "$ctf_keyring" --import EVD-KEY-001.asc
gpg --homedir "$ctf_keyring" --list-secret-keys
gpg --homedir "$ctf_keyring" --output EVD-MAIL-001.mbox --decrypt EVD-MAIL-001.mbox.enc
sha256sum EVD-MAIL-001.mbox
```

`--homedir` mengisolasi keyring latihan dari keyring pribadi. `--import` memasukkan kunci. `--decrypt` membuka pesan; `--output` menentukan file hasil.

Hasil yang diperiksa berukuran 7.206 byte dan memiliki hash:

```text
ad87d2b607179948ee362713341da961feb17039ce2de48619329bd2ff74338b
```

### Langkah 2: baca header, lalu cari pola

```bash
grep -nE '^(From:|To:|Subject:|Date:|X-)' EVD-MAIL-001.mbox
grep -nE 'MOFCG\{[^}]+\}' EVD-MAIL-001.mbox
```

Penjelasan regex kedua:

- `MOFCG\{`: awalan literal `MOFCG{`.
- `[^}]+`: satu atau lebih karakter selain kurung penutup.
- `\}`: kurung penutup.
- `-n`: tampilkan nomor baris.
- `-E`: gunakan extended regular expression.

Hasil penting:

```text
156:X-Campaign-Tag: MOFCG{J4ngan}
```

Flag terdapat pada **header**, sehingga hanya membaca body email akan melewatkannya.

### Langkah 3: pahami konteksnya

Email dari `bima.sanjaya@mitra-komunitas-global.abc` menuju `rina.melati@mofcg.co.id` menawarkan `Detail_Teknis.zip`. Timestamp email tercatat 2 Maret 2026 pukul 10.30 WIB, sedangkan alert SOC mencatat klik pukul 10.10 WIB.

Jangan mengubah timestamp agar tampak cocok. Catat selisih 20 menit sebagai anomali. Kemungkinannya perlu diuji dengan sumber tambahan, misalnya perbedaan jam sistem atau rekonstruksi log, bukan dipastikan dari satu arsip.

**Flag:** `MOFCG{J4ngan}`.

**Latihan pemahaman:** mengapa pencarian pada semua header lebih baik daripada hanya mencari kata “phishing” pada body?

## Stage 2 — Log JSON dan Base64

### Target dan evidence

`EVD-INTEL-001.txt` memberi petunjuk waktu. `EVD-SRVLOG-001.json` berisi event yang perlu disaring, bukan sekadar dibaca dari atas sampai bawah.

### Materi: JSON dan korelasi event

JSON adalah format data dengan objek, array, string, angka, dan nilai lainnya. Pada evidence ini, root berupa array objek event. `jq` membantu memilih objek berdasarkan kondisi.

```bash
cd ~/mofcg-belajar/Stage2
jq 'length' EVD-SRVLOG-001.json
jq '.[0]' EVD-SRVLOG-001.json
```

`.` menunjuk data saat ini, `.[0]` mengambil elemen pertama, dan `.[]` mengiterasi elemen array. `select(kondisi)` hanya meneruskan elemen yang memenuhi kondisi.

### Langkah 1: gunakan petunjuk, bukan mencari acak

Catatan handover menyebut koneksi token API sekitar 5–10 menit setelah dugaan infeksi. Ini mengarahkan pencarian pada jenis event dan waktu yang relevan.

```bash
jq '.[] | select(.action == "WAF_ALERT")' EVD-SRVLOG-001.json
```

Event penting memiliki:

```json
{
  "timestamp": "2026-03-02T10:15:35+07:00",
  "host": "WS-RINA",
  "action": "WAF_ALERT",
  "event_id": 9999,
  "status": "Blocked",
  "alert": "Suspicious payload detected in User-Agent header: TU9GQ0d7UzRtUDQhfQ=="
}
```

`User-Agent` adalah salah satu header HTTP. Normalnya dapat mengidentifikasi perangkat lunak klien, tetapi isinya dikirim klien dan tidak boleh dianggap selalu tepercaya.

### Materi: bagaimana Base64 bekerja?

Base64 mengubah byte menjadi karakter teks menggunakan alfabet berukuran 64. Setiap karakter mewakili 6 bit karena `2^6 = 64`. Pada kelompok penuh, tiga byte atau 24 bit dipecah menjadi empat kelompok 6 bit. Padding `=` digunakan ketika byte terakhir tidak membentuk kelompok penuh. Detail format dijelaskan dalam [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html).

Contoh dasar:

```text
Teks M → byte 01001101
Bagi menjadi 010011 dan 010000 setelah penambahan bit pengisi
Indeks 19 = T, indeks 16 = Q
Hasil: TQ==
```

Dua `=` menunjukkan satu byte data pada kelompok terakhir. Padding hanya petunjuk format: sebuah string berakhiran `==` belum tentu payload Base64 yang bermakna.

Encoding ini **tidak merahasiakan isi**, karena siapa pun yang mengetahui aturan dapat membaliknya tanpa password.

### Langkah 2: ekstraksi dan dekode

```bash
jq -r '
  .[]
  | select(.action == "WAF_ALERT" and .event_id == 9999)
  | .alert
  | split("User-Agent header: ")[1]
' EVD-SRVLOG-001.json | base64 -d
```

`-r` mengeluarkan string mentah tanpa tanda kutip JSON. `split(...)[1]` mengambil bagian setelah label header. `base64 -d` mengubah representasi teks kembali menjadi byte.

```text
MOFCG{S4mP4!}
```

### Langkah 3: jangan menyamakan status antar-event

| Waktu WIB | Event | Makna dalam dataset |
|---|---|---|
| 10.10.34 | NetworkConnection | Aktivitas workstation menuju portal |
| 10.15.30 | API_TOKEN_ISSUE | Penerbitan token tercatat Allowed |
| 10.15.35 | WAF_ALERT | Permintaan lain diblokir; Base64 dicatat |

Pemblokiran pada event kedua tidak menghapus fakta penerbitan token sebelumnya. Kita harus menyebut aksi mana yang Allowed dan mana yang Blocked.

**Flag:** `MOFCG{S4mP4!}`.

**Latihan pemahaman:** dekode `TQ==`, kemudian jelaskan mengapa pengetahuan password tidak diperlukan.

## Stage 3 — Korelasi jaringan dan ROT13

### Materi: PCAP, paket, port, dan payload

PCAP adalah wadah rekaman paket jaringan. Satu frame dapat memuat beberapa lapisan: Ethernet, IP, TCP/UDP, kemudian data aplikasi. **Payload** berarti isi data pada lapisan yang sedang dianalisis; pengertian tepatnya bergantung konteks.

Port menunjukkan titik komunikasi, tetapi tidak menjamin jenis protokol. UDP ke port 53 lazim berkaitan dengan DNS, namun aplikasi dapat mengirim byte apa pun ke port tersebut. Karena itu, periksa isi paket.

**Filter tampilan** Wireshark menentukan paket yang ditampilkan setelah rekaman dibuka. Filter itu berbeda dari capture filter yang menentukan paket apa yang ditangkap sejak awal.

### Langkah 1: bangun hipotesis dari transaksi

Evidence: `EVD-FIN-001.csv`, `EVD-FIN-005.json`, dan `EVD-NET-001.pcap`.

| Waktu WIB | Sumber | Tujuan | Nominal |
|---|---|---|---|
| 14 Juli 14.15 | MOFCG-MAIN-ACC | 9988-7766-5544 | Rp8 miliar |
| 15 Juli 08.00 | 9988-7766-5544 | 1122-3344-5566 | Rp8 miliar |
| 15 Juli 08.05 | 1122-3344-5566 | 5566-7788-9900 | Rp8 miliar |
| 15 Juli 08.10 | 5566-7788-9900 | CRYPTO-EX-999 | Rp8 miliar |

Ini satu rantai dana. Menjumlahkan semuanya menjadi kerugian Rp32 miliar akan menghitung dana yang sama berulang kali. JSON mencatat deposit pada akun exchange itu pukul 08.20, dikonversi ke BTC dan berstatus CONFIRMED.

### Langkah 2: cari hubungan rekening pada jaringan

Di Wireshark:

```text
frame.number == 328
```

Frame 328 memuat HTTP POST dari `10.0.0.50` menuju `192.0.2.205:80`:

```http
POST /api/v1/notify HTTP/1.1

{"wallet_id": "9988-7766-5544", "status": "initiated"}
```

Timestamp 14 Juli 14:14:59.594893 WIB mendahului pencatatan transaksi 14:15:00 sekitar 0,405 detik. Kecocokan rekening adalah penghubung data yang lebih kuat daripada sekadar dua event terjadi pada hari yang sama.

### Langkah 3: telusuri komunikasi berdekatan

```text
ip.src == 10.0.0.50 && udp.dstport == 53
```

Frame 350, sekitar 14:15:02.125 WIB, memuat string yang dapat dibaca dari hex:

```text
5a425350547b47726567216368687d
↓ hex ke ASCII
ZBSPT{Greg!chh}
```

Dengan TShark:

```bash
cd ~/mofcg-belajar/Stage3
tshark -r EVD-NET-001.pcap -Y 'frame.number == 350' -T fields -e udp.payload
```

Jika versi alat menampilkan pemisah `:`, hapus pemisah sebelum memasukkannya ke decoder hex. Periksa `udp.length` jika ingin menghitung panjang: nilai tersebut mencakup header UDP 8 byte. String hex di atas sendiri panjangnya 15 byte.

### Materi: bagaimana ROT13 bekerja?

ROT13 memutar huruf alfabet 13 posisi. Untuk huruf kapital yang dipetakan menjadi indeks 0–25:

```text
enkode(x) = (x + 13) mod 26
```

`A → N`, `B → O`, dan `Z → M`. Huruf kecil diperlakukan serupa; angka dan tanda baca tidak berubah. Karena dua putaran 13 sama dengan satu putaran 26, proses yang sama membalik hasilnya:

```text
ROT13(ROT13(teks)) = teks
```

Awalan `ZBSPT` menjadi `MOFCG`. Ini alasan teknis untuk mencoba ROT13, bukan percobaan semua algoritma tanpa petunjuk.

```bash
printf '%s' 'ZBSPT{Greg!chh}' | tr 'A-Za-z' 'N-ZA-Mn-za-m'
```

Hasil:

```text
MOFCG{Tert!puu}
```

**Latihan pemahaman:** mengapa port 53 tidak cukup untuk menyebut paket ini kueri DNS yang valid? Mengapa ROT13 tidak cocok untuk melindungi rahasia?

## Stage 4 — Metadata JPEG dan jejak host

### Materi: metadata bukan piksel

JPEG memuat data gambar terkompresi dan dapat memiliki segmen metadata. EXIF menyimpan tag seperti waktu, perangkat, dan software. Sebuah teks dapat berada di metadata tanpa terlihat sebagai tulisan pada gambar.

ExifTool membaca banyak format metadata. Nama dan nilai tag dapat ditelusuri pada [dokumentasi tag ExifTool](https://exiftool.org/TagNames/). Metadata dapat diubah; nilai waktu EXIF merupakan klaim di dalam file, bukan jaminan independen waktu kejadian.

### Langkah 1: identifikasi dan baca metadata

```bash
cd ~/mofcg-belajar/Stage4
file EVD-IMG-001.jpg
exiftool -Software -DateTimeOriginal -ModifyDate EVD-IMG-001.jpg
```

Nilai penting:

```text
Software: Hex: 4d4f4643477b4f7234616e677d
```

Awalan `Hex:` merupakan petunjuk representasi. Dua digit dibaca sebagai satu byte:

```text
4d 4f 46 43 47 7b 4f 72 34 61 6e 67 7d
 M  O  F  C  G  {  O  r  4  a  n  g  }
```

```bash
printf '%s' '4d4f4643477b4f7234616e677d' | xxd -r -p
```

`-r` membalik tampilan hex menjadi byte; `-p` menandakan input hex polos.

**Flag utama:** `MOFCG{Or4ang}`.

### Langkah 2: gunakan log untuk konteks, bukan mengganti bukti byte

File lain adalah `EVD-HOSTLOG-001.json`, `EVD-LOG-002.csv`, dan `EVD-NOTE-001.txt`. JSON berisi 1.004 catatan, sebagian besar aktivitas registry. CSV memuat 50 event PasswordReset. History menunjukkan identitas `mofcg\d.suherman`, unduhan banner, ekstraksi stego, append ke PDF, lalu penghapusan file.

```powershell
.\stg.exe extract -sf banner.jpg -p "MOFCG2026"
type payload.txt >> ..\EVD-DOC-001.pdf
```

`-sf` dan `-p` menyerupai opsi steghide. Ini mendukung hipotesis ekstraksi, tetapi nama executable saja belum membuktikan format payload atau keberhasilan perintah.

### Materi: path relatif dan operator append

`..` berarti direktori induk. Dari `C:\Users\Public\Downloads`, path `..\EVD-DOC-001.pdf` menunjuk `C:\Users\Public\EVD-DOC-001.pdf`. Itu berbeda dari path di direktori Documents milik Dadan yang tercatat pada JSON.

Operator `>>` mengarahkan output ke akhir file. Ia tidak otomatis membuat objek PDF baru yang valid. Byte yang benar-benar tertulis juga bergantung pada perintah, shell, dan encoding. Karena itu, periksa salinan hasil; jangan menganggap file sumber pasti berubah persis seperti cerita history.

### Mengapa password pada history tidak langsung menyelesaikan bonus?

Pada JPEG yang diperiksa, `MOFCG2026` tidak berhasil membuka payload. Hipotesis yang gagal harus dicatat dan diuji dengan petunjuk lain. Stage 5 menyediakan metadata `Proyek-Nexus`, yang terbukti berhasil pada Stage 6.

Jangan menyimpulkan “gambar rusak” hanya karena satu passphrase tidak berhasil. Jangan pula menganggap flag metadata dan token steganografi merupakan jawaban yang sama.

**Latihan pemahaman:** apa bedanya “ada perintah ekstraksi dalam history” dengan “payload berhasil diekstrak dari file evidence”?

## Stage 5 — PDF dan teks putih

### Materi: PDF bukan sekadar foto halaman

PDF dapat berisi perintah menggambar teks, garis, gambar, font, dan objek lain. **Content stream** menyimpan instruksi untuk membentuk tampilan halaman. Karena itu, teks yang tidak terlihat oleh mata masih dapat ada sebagai objek teks yang dibaca alat ekstraksi.

Sebaliknya, PDF hasil scan bisa berisi gambar tanpa text layer. Pada kasus itu, OCR mungkin dibutuhkan. Pada evidence ini, flag memang ada sebagai teks; OCR bukan langkah utama. [Dokumentasi pypdf](https://pypdf.readthedocs.io/en/5.4.0/user/extract-text.html) menjelaskan ekstraksi teks dari struktur PDF.

### Langkah 1: inventaris dan metadata

```bash
cd ~/mofcg-belajar/Stage5
file EVD-DOC-001.pdf
pdfinfo EVD-DOC-001.pdf
exiftool EVD-DOC-001.pdf
sha256sum EVD-DOC-001.pdf
```

Evidence berukuran 4.242 byte, memiliki dua halaman, dan SHA-256 berikut:

```text
e7b37f57ed1aef1e2951facb4b9d8ef5690a75d5ed852ea34234637ca516cb1c
```

Metadata penting:

| Properti | Nilai |
|---|---|
| Title | Memorandum Anggaran MOFCG - Proyek Nexus |
| Author | Dadan Suherman (IT Div) |
| Producer | pypdf |
| CreationDate | 1 Juli 2026, 09.00 WIB |
| ModDate | 14 Juli 2026, 09.30 WIB |
| Custom-Tag | Proyek-Nexus |

Nama Author yang berbeda dengan nama penanda tangan visual memunculkan pertanyaan provenance atau asal-usul dokumen. Itu belum membuktikan pemalsuan secara mandiri. Nama dan garis tanda tangan dalam tampilan juga bukan otomatis digital signature.

### Langkah 2: ambil text layer

```bash
pdftotext -layout EVD-DOC-001.pdf -
pdftotext EVD-DOC-001.pdf - | grep -oE 'MOFCG\{[^}]+\}'
```

Argumen `-` sebagai tujuan mengirim keluaran ke terminal. `-layout` berupaya mempertahankan tata letak. `grep -o` menampilkan bagian yang cocok dengan pola.

Hasil:

```text
MOFCG{D4l4m}
```

### Langkah 3: buktikan mengapa teks tidak terlihat

```python
from pypdf import PdfReader

reader = PdfReader('EVD-DOC-001.pdf')
stream = reader.pages[0].get_contents().get_data().decode('latin-1')
for line in stream.splitlines():
    if 'MOFCG' in line or '1 1 1 rg' in line:
        print(line)
```

Instruksi relevan:

```text
1 1 1 rg
BT 1 0 0 1 50 10 Tm (FLAG: MOFCG{D4l4m}) Tj T* ET
```

| Instruksi | Makna pada contoh |
|---|---|
| `1 1 1 rg` | Atur warna pengisian RGB menjadi putih |
| `BT` / `ET` | Awal / akhir objek teks |
| `1 0 0 1 50 10 Tm` | Atur matriks teks dengan translasi ke posisi (50,10) |
| `(FLAG: ...) Tj` | Tampilkan string teks |
| `T*` | Pindah ke baris teks berikutnya berdasarkan pengaturan leading |

Putih di atas latar putih membuat tulisan tersamarkan. Tidak ada password yang diperlukan untuk membacanya melalui text layer.

### Langkah 4: periksa klaim append dari Stage 4

```python
from pathlib import Path

data = Path('EVD-DOC-001.pdf').read_bytes()
marker = data.rfind(b'%%EOF')
if marker == -1:
    print('Penanda EOF tidak ditemukan; perlu pemeriksaan struktur lebih lanjut.')
else:
    print(repr(data[marker + len(b'%%EOF'):]))
```

Pada file ini, setelah penanda akhir hanya ada newline. Jadi tidak ada payload tambahan setelah EOF pada salinan yang diperiksa. Pemeriksaan ini bukan parser PDF lengkap; beberapa PDF memiliki beberapa revisi dan lebih dari satu penanda EOF. Gunakan penanda terakhir dan korelasikan dengan struktur dokumen.

**Flag:** `MOFCG{D4l4m}`.

**Petunjuk lanjutan:** simpan `Custom-Tag: Proyek-Nexus` untuk pengujian steganografi berikutnya.

**Latihan pemahaman:** mengapa hasil pencarian teks kosong pada sebuah PDF scan tidak membuktikan bahwa tulisan dalam tampilan tidak ada?

## Stage 6 — Steganografi dan token bonus

### Materi: cover, payload, dan passphrase

Pada steganografi, **cover** adalah media pembawa, misalnya JPEG. **Payload** adalah pesan yang disembunyikan. **Stego file** adalah media setelah pesan ditanamkan. Passphrase dapat berperan dalam perlindungan serta pengaturan proses penyisipan/ekstraksi sesuai alatnya.

Steganografi tidak sama dengan metadata. Pada Stage 4 kita membaca tag Software secara langsung; pada Stage 6 kita mengekstrak pesan tersembunyi melalui steghide. Jangan menganggap semua steganografi JPEG menggunakan modifikasi bit piksel paling rendah seperti contoh LSB pada bitmap. Metode dan format bergantung alat serta jenis cover.

Sintaks `extract`, `-sf`, `-p`, dan `-xf` dijelaskan pada [manual steghide](https://steghide.sourceforge.net/documentation/manual.pdf).

### Langkah 1: susun alasan pemilihan passphrase

Hubungan evidence:

```text
History Stage 4 menyebut ekstraksi stego
                  ↓
JPEG memiliki flag metadata, tetapi misi bonus meminta token lain
                  ↓
PDF Stage 5 memiliki Custom-Tag: Proyek-Nexus
                  ↓
Uji nilai itu sebagai passphrase pada JPEG yang sama
```

Ini pencarian berdasarkan konteks, bukan brute-force daftar password acak.

### Langkah 2: ekstrak salinan JPEG

```bash
cd ~/mofcg-belajar/Stage4
steghide extract -sf EVD-IMG-001.jpg -p 'Proyek-Nexus' -xf payload.txt
file payload.txt
cat payload.txt
```

Arti opsi:

- `extract`: ambil pesan dari stego file.
- `-sf`: file pembawa pesan.
- `-p`: passphrase yang digunakan.
- `-xf`: nama file tujuan hasil ekstraksi.

Isi hasil:

```text
Instruction: Change amount to 8M. TU9GQ0d7RDRsNG19
```

File hasil cukup dibaca sebagai data. Tidak perlu menjalankan instruksi yang diceritakan dalam payload.

### Langkah 3: pisahkan pesan, representasi, dan jawaban

```bash
printf '%s' 'TU9GQ0d7RDRsNG19' | base64 -d
```

Hasil dekode adalah `MOFCG{D4l4m}`, sama dengan flag Stage 5. Namun **jawaban bonus yang diterima adalah string Base64 mentah**:

```text
TU9GQ0d7RDRsNG19
```

Pelajaran penting: memahami suatu representasi tidak berarti validator selalu meminta representasi yang sudah didekode. Ikuti jenis token yang diminta dan bukti validasi yang tersedia.

**Latihan pemahaman:** ada dua langkah reversibel di sini. Mana yang membutuhkan passphrase, dan mana yang hanya membutuhkan aturan encoding?

## Stage 7 — Memori dan XOR

### Materi: apa isi citra memori?

RAM menyimpan data yang sedang dipakai sistem: bagian proses, konfigurasi, buffer komunikasi, string, dan area lain. Citra memori adalah salinan byte dari ruang memori yang diperoleh alat akuisisi. Tidak semua string dapat langsung dikaitkan ke proses tertentu tanpa rekonstruksi struktur sistem operasi.

`strings` membantu mencari rangkaian karakter terbaca, tetapi tidak menampilkan semua jenis data. Teks UTF-16, data terkompresi, dan data terenkripsi bisa terlewat. Jangan menyimpulkan “tidak ada” hanya dari satu pencarian ASCII.

### Langkah 1: ekstrak dan cari petunjuk

```bash
cd ~/mofcg-belajar/Stage7
unzip EVD-MEM-002.raw.zip
strings -a -t x EVD-MEM-002.raw | grep -A4 NEXUS_PERSISTENCE
```

- `-a`: pindai seluruh file sebagai data.
- `-t x`: tampilkan offset dengan basis hex.
- `grep -A4`: tampilkan empat baris setelah kecocokan.

ZIP berisi dump 230.686.720 byte. Pada area sekitar offset `0xD779382` ditemukan:

```text
[NEXUS_PERSISTENCE_TELEMETRY]
ENDPOINT: http://192.0.2.205:443/api/v2/telemetry
AUTH_SCHEME: XOR_0x5A
PAYLOAD_HEX: 17151c191d211769376a28231c35286934296b31050969282f27
```

Blok ini memberikan **metode** dan **kunci** secara eksplisit: XOR dengan `0x5A`. Kita tidak perlu menghubungi endpoint.

### Materi inti: apa itu XOR?

XOR, singkatan dari **exclusive OR**, adalah operasi logika yang menghasilkan 1 jika dua bit berbeda, dan 0 jika sama.

| A | B | A XOR B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

Operasi diterapkan untuk setiap posisi bit secara independen. Pada Python, operator XOR bilangan bulat adalah `^`, sebagaimana dijelaskan dalam [referensi ekspresi Python](https://docs.python.org/3/reference/expressions.html#binary-bitwise-operations).

### Mengapa XOR dapat dibalik dengan kunci yang sama?

Untuk setiap bit:

```text
A XOR 0 = A
A XOR A = 0
(A XOR K) XOR K = A
```

Intuisinya: bit kunci bernilai 0 mempertahankan bit data, sedangkan bit kunci bernilai 1 membaliknya. Membalik posisi yang sama dua kali akan mengembalikannya.

Jika pembuat menyamarkan plaintext `P` menjadi ciphertext `C`:

```text
C = P XOR K
P = C XOR K
```

Tidak diperlukan operasi pembalik yang berbeda.

### Contoh satu byte dari evidence

Byte pertama payload adalah hex `17`, sedangkan kunci adalah hex `5A`.

```text
  0x17 = 00010111
  0x5A = 01011010
         -------- XOR
  0x4D = 01001101 = ASCII M
```

Byte kedua:

```text
0x15 XOR 0x5A = 0x4F = ASCII O
```

Awalan `MO` muncul dari perhitungan, bukan karena kita menuliskannya terlebih dahulu. Ini pemeriksaan awal bahwa interpretasi metode dan kunci masuk akal.

### Langkah 2: dekode seluruh payload

```python
payload_hex = '17151c191d211769376a28231c35286934296b31050969282f27'
ciphertext = bytes.fromhex(payload_hex)
key = 0x5a
plaintext = bytes(value ^ key for value in ciphertext)
print(plaintext.decode('ascii'))

# Bukti bahwa transformasinya dapat dibalik:
assert bytes(value ^ key for value in plaintext) == ciphertext
```

Penjelasan baris:

1. `bytes.fromhex` mengubah pasangan digit menjadi byte; ia belum menjalankan XOR.
2. Iterasi atas `bytes` menghasilkan bilangan 0–255.
3. `value ^ key` melakukan XOR untuk satu byte.
4. `bytes(...)` menyusun kembali hasilnya.
5. `.decode('ascii')` menafsirkan byte sebagai karakter.

Hasil:

```text
MOFCG{M3m0ryFor3ns1k_S3ru}
```

### Langkah 3: hubungkan temuan dengan klaim yang tepat

Kita membuktikan adanya blok telemetry dan token yang disamarkan dengan XOR dalam dump. Itu belum otomatis membuktikan proses mana yang menyimpan blok tersebut atau teknik injeksi apa yang digunakan. Klaim proses memerlukan pemeriksaan struktur memori tambahan.

XOR satu byte berulang memiliki hanya 256 kemungkinan kunci. Bila bagian plaintext diketahui, kunci juga mudah dihitung: `K = C XOR P`. Karena itu, skema ini tidak cukup untuk melindungi rahasia dari analis.

**Latihan pemahaman:** hitung `0x17 XOR 0x4D`. Jelaskan hubungannya dengan kunci `0x5A`. Kemudian coba XOR seluruh plaintext dengan `0x5A` dan bandingkan dengan payload awal.

## Stage 8 — Rekayasa balik biner dan VM

### Materi: biner, disassembly, dan analisis statis

Biner executable menyimpan instruksi mesin dan data. **ELF** adalah salah satu format executable pada Linux. **Stripped** berarti informasi simbol tertentu, misalnya banyak nama fungsi internal, telah dihapus; instruksi program masih dapat dianalisis.

**Disassembly** mengubah byte instruksi mesin menjadi mnemonik assembly. Hasilnya bukan kode sumber asli. Analis menyimpulkan struktur program dari aliran instruksi, penggunaan data, dan pemanggilan fungsi.

**Analisis statis** membaca file tanpa menjalankannya. Pada tahap ini, flag dapat dipulihkan secara statis sehingga biner tidak perlu dieksekusi.

### Langkah 1: lihat format, string, dan instruksi

```bash
cd ~/mofcg-belajar/Stage8
file EVD-VAULT-001
strings -n 5 EVD-VAULT-001
objdump -d -M intel EVD-VAULT-001 > disassembly.txt
objdump -s -j .rodata EVD-VAULT-001 > rodata.txt
readelf -l EVD-VAULT-001
```

Petunjuk string menyebut penggunaan `--disarm "<DOMAIN_C2>:<RECOVERY_KEY>"`. Ini menunjukkan bentuk input, bukan langsung membocorkan seluruh isinya.

Beberapa instruksi yang membantu membaca disassembly:

| Instruksi | Cara membacanya |
|---|---|
| `mov` / `movzx` | Pindahkan nilai; `movzx` memperluas nilai dengan bit nol |
| `cmp` | Bandingkan operand dan perbarui flag CPU |
| `je` / `jne` | Lompat jika hasil perbandingan sama / tidak sama |
| `xor` | XOR pada operand |
| `rol` / `ror` | Rotasi bit kiri / kanan |
| `call` | Panggil fungsi |

### Materi: alamat virtual tidak sama dengan offset file

Alamat virtual dipakai program saat dimuat ke memori. Offset file adalah posisi byte di disk. Hubungannya ditentukan pemetaan segmen ELF, yang dapat dibaca melalui `readelf -l`.

Untuk alamat yang berada dalam suatu segmen file-backed:

```text
offset_file = alamat_virtual - p_vaddr + p_offset
```

Pada area read-only biner **ini**, pemetaannya membuat `0x402500` berada pada offset file `0x2500`. Jangan menerapkan pengurangan `0x400000` ke semua ELF secara umum.

### Materi: VM bytecode sebagai penyamaran

VM pada konteks ini adalah interpreter kecil di dalam program, bukan mesin virtual seperti VirtualBox. Program membaca **opcode** atau kode operasi dari tabel byte, lalu memilih aksi yang sesuai.

Di biner ini:

- Bytecode mulai pada alamat virtual `0x402500`.
- Tabel substitusi 256 byte mulai pada `0x402880`.
- Tabel berisi token tersamarkan mulai pada `0x4024E0`.

Operasi VM yang relevan:

| Opcode | Aksi yang direkonstruksi |
|---|---|
| `0x01` | Cocokkan panjang input |
| `0x10` | Ambil karakter pada indeks tertentu |
| `0x20` | XOR karakter dengan konstanta |
| `0x21` | Rotasi kiri 8 bit |
| `0x22` | Rotasi kanan 8 bit |
| `0x25` | Ganti karakter melalui tabel substitusi |
| `0x26` | Perbarui rolling hash dari karakter input |
| `0x30` | Bandingkan nilai hasil dengan konstanta |
| `0xFF` | Akhiri rangkaian pemeriksaan |

### Materi: rotasi, substitusi, dan mask

Rotasi memindahkan bit yang keluar dari satu sisi kembali ke sisi lain. Contoh 8 bit:

```text
10000001 dirotasi kiri satu posisi → 00000011
```

Ini berbeda dari shift kiri biasa: bit teratas tidak dibuang, melainkan kembali sebagai bit terbawah.

Tabel substitusi atau S-box memetakan nilai input ke nilai output, misalnya `output = sbox[input]`. Pemetaan dapat dibaca langsung jika tabelnya tersedia.

`& 0xff` mempertahankan 8 bit terbawah; `& 0xffffffff` mempertahankan 32 bit. Python memiliki integer dengan presisi dinamis, sehingga mask diperlukan untuk meniru overflow register biner berukuran tetap.

### Langkah 2: selesaikan constraint tiap karakter

Program memberi beberapa pemeriksaan independen pada karakter tertentu. Alih-alih mencoba semua kombinasi password, enumerasi nilai 0–255 untuk **satu karakter**, jalankan rangkaian transformasinya, dan simpan nilai yang cocok.

Ini perbedaan besar dalam ruang pencarian. Untuk input 61 karakter, mencoba semua kombinasi jauh lebih mahal daripada menguji paling banyak 256 nilai pada setiap constraint karakter yang independen.

Simpan kode berikut sebagai `solve_vault.py` di folder Stage 8:

```python
from pathlib import Path
import struct

binary = Path('EVD-VAULT-001').read_bytes()
code = binary[0x2500:0x2876]
sbox = binary[0x2880:0x2980]

pc = 0
length = None
index = None
transforms = []
constraints = {}

while pc < len(code):
    op = code[pc]
    if op == 0xff:
        break
    width = 2 if op in (0x01, 0x25) else 3
    arg = code[pc + width - 1]

    if op == 0x01:
        length = arg
    elif op == 0x10:
        index = arg
        transforms = []
    elif op in (0x20, 0x21, 0x22, 0x25):
        transforms.append((op, arg))
    elif op == 0x30:
        candidates = []
        for value in range(256):
            result = value
            for transform, operand in transforms:
                if transform == 0x20:
                    result ^= operand
                elif transform == 0x21:
                    result = ((result << operand) |
                              (result >> (8 - operand))) & 0xff
                elif transform == 0x22:
                    result = ((result >> operand) |
                              (result << (8 - operand))) & 0xff
                elif transform == 0x25:
                    result = sbox[result]
            if result == arg:
                candidates.append(value)
        assert len(candidates) == 1, (index, candidates)
        constraints[index] = candidates[0]
    elif op != 0x26:
        raise ValueError(f'Opcode tidak dikenal: {op:#x}')

    pc += width

assert length is not None
assert len(constraints) == length
key = bytes(constraints[i] for i in range(length))
print('Recovery key:', key.decode('ascii'))

h = 0x1337beef
for i, character in enumerate(key):
    h = (h * 31 + sbox[(character + i) & 0xff]) & 0xffffffff
    h = ((h << 7) | (h >> 25)) & 0xffffffff
    h ^= 0x5a5a5a5a

assert h == 0x681a640b
print('Rolling hash:', hex(h))

hash_bytes = struct.pack('<I', h)
flag = bytes(binary[0x24e0 + i] ^ sbox[i] ^ hash_bytes[i % 4]
             for i in range(29))
print('Flag:', flag.decode('ascii'))
```

Kode ini khusus layout biner evidence yang diperiksa, bukan decompiler VM generik.

### Langkah 3: verifikasi sebelum mengambil flag

```bash
python solve_vault.py
```

Kunci yang direkonstruksi:

```text
mitra-komunitas-global.abc:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

Rolling hash menghasilkan `0x681A640B`. **Rolling hash** adalah nilai akumulatif yang diperbarui ketika setiap karakter diproses. Pada program ini, nilai tersebut dipakai sebagai pemeriksaan tambahan dan bahan pemulihan token; jangan menyamakannya dengan SHA-256.

### Materi: little-endian dan pemulihan token

Little-endian menyimpan byte paling rendah lebih dahulu. Nilai 32 bit `0x681A640B` menjadi:

```text
0B 64 1A 68
```

`struct.pack('<I', h)` berarti unsigned integer 32 bit dalam urutan little-endian. `i % 4` mengulang pemilihan empat byte hash.

Setiap byte token dipulihkan dengan:

```text
flag[i] = encrypted_token[i] XOR sbox[i] XOR hash_bytes[i mod 4]
```

Hasil:

```text
MOFCG{R3_M3nyen4ngkan_Sek4l!}
```

**Latihan pemahaman:** apa bedanya kunci pemulihan dan flag tanda terima? Mengapa memeriksa hash memberi keyakinan lebih kuat daripada hanya memperoleh teks yang terlihat masuk akal?

## Stage 9 — Firefox, arsip, dan VBA

### Target: menelusuri rantai artefak, bukan satu file ajaib

`EVD-DEV-001.zip` memuat 64 artefak workstation. Rantai penyelesaiannya:

```text
Riwayat PowerShell
      ↓ menunjukkan arsip berpassword dan file sumber yang dihapus
Profil Firefox: logins.json + key4.db
      ↓ pemulihan kredensial secara offline
Password membuka arsip failover
      ↓ DOCX dipulihkan dan checksum cocok
word/vbaProject.bin
      ↓ sumber VBA didekompresi, array byte dibaca
MOF{CG20}26
```

### Langkah 1: inventaris dan telusuri aktivitas

```bash
cd ~/mofcg-belajar/Stage9
unzip -l EVD-DEV-001.zip
unzip EVD-DEV-001.zip -d workstation
cat workstation/AppData/Roaming/Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt
```

Pada history terdapat pembuatan `arsip_pemulihan_darurat.zip` dengan password interaktif dan penghapusan `Catatan_Harian_14_Juli_2026.docx`.

History menunjukkan bahwa arsip perlu ditelusuri, tetapi tidak menampilkan password. Jadi langkah berikutnya adalah memeriksa tempat yang mungkin menyimpan kredensial, bukan langsung menebak nama anak atau tanggal lahir pelaku.

### Materi: profil browser dan NSS

Profil Firefox menyimpan berbagai data yang saling melengkapi:

| Artefak | Informasi yang dicari |
|---|---|
| `places.sqlite` | Riwayat dan bookmark |
| `logins.json` | Record login, termasuk field terenkripsi |
| `key4.db` | Database material kunci NSS yang berhubungan dengan perlindungan kredensial |
| `prefs.js` | Preferensi profil dan konteks konfigurasi |

SQLite adalah format database berbasis file; ia dapat dibaca tanpa menjalankan Firefox. NSS atau **Network Security Services** adalah kumpulan pustaka keamanan yang digunakan perangkat lunak Mozilla. Gambaran resminya tersedia pada [Mozilla NSS](https://firefox-source-docs.mozilla.org/security/nss/).

Field `encryptedPassword` pada `logins.json` dikodekan Base64, tetapi setelah Base64 dibuka kita memperoleh struktur data kriptografis, bukan langsung password. Base64 hanyalah lapisan representasinya. Material kunci pada profil dan proses dekripsi yang sesuai masih diperlukan.

Jika profil menggunakan Primary Password yang tidak diketahui, memiliki dua file tersebut tidak otomatis cukup. Pada evidence latihan ini, dekripsi profil berhasil tanpa memberikan Primary Password tambahan.

### Langkah 2: baca riwayat browser secara offline

```python
from pathlib import Path
import sqlite3

profile = Path('workstation/AppData/Roaming/Mozilla/Firefox/Profiles/dadan.default-release')
uri = (profile / 'places.sqlite').resolve().as_uri() + '?mode=ro'
with sqlite3.connect(uri, uri=True) as db:
    for url, title in db.execute('SELECT url, title FROM moz_places'):
        print(url, '|', title)
```

`mode=ro` membuka database read-only. Pada dataset, riwayat berkaitan dengan portal escrow, perawatan di Zurich, aturan dana cadangan, dan perjalanan. Membaca URL dari database tidak mengharuskan mengunjungi URL tersebut.

### Langkah 3: pulihkan login pada salinan profil

Berikut contoh Linux menggunakan NSS melalui `ctypes`. `ctypes` memungkinkan Python memanggil fungsi dalam shared library. Ini bukan implementasi algoritma kriptografi sendiri; NSS mengerjakan dekripsinya.

Simpan sebagai `decrypt_firefox_ctf.py`, lalu jalankan dari folder Stage 9. Program membuat salinan `firefox-working` dan hanya memanggil NSS terhadap salinan itu.

```python
from pathlib import Path
import base64
import ctypes as C
import json
import shutil
import sys

if len(sys.argv) != 2:
    raise SystemExit('Pemakaian: python decrypt_firefox_ctf.py PATH_PROFIL_EVIDENCE')

source = Path(sys.argv[1]).resolve()
working = Path('firefox-working').resolve()
if working.exists():
    raise SystemExit('firefox-working sudah ada; gunakan direktori kerja baru.')
shutil.copytree(source, working)

class SECItem(C.Structure):
    _fields_ = [('type', C.c_uint), ('data', C.c_void_p), ('len', C.c_uint)]

nss = C.CDLL('libnss3.so')
nss.NSS_Init.argtypes = [C.c_char_p]
nss.NSS_Init.restype = C.c_int
nss.NSS_Shutdown.argtypes = []
nss.NSS_Shutdown.restype = C.c_int
nss.PK11SDR_Decrypt.argtypes = [C.POINTER(SECItem), C.POINTER(SECItem), C.c_void_p]
nss.PK11SDR_Decrypt.restype = C.c_int
nss.SECITEM_FreeItem.argtypes = [C.POINTER(SECItem), C.c_int]
nss.SECITEM_FreeItem.restype = None

status = nss.NSS_Init(('sql:' + str(working)).encode())
if status != 0:
    raise SystemExit('NSS tidak dapat membuka salinan profil.')

try:
    records = json.loads((working / 'logins.json').read_text())['logins']
    for record in records:
        print('Host:', record['hostname'])
        for field in ('encryptedUsername', 'encryptedPassword'):
            raw = base64.b64decode(record[field])
            buffer = C.create_string_buffer(raw)
            source_item = SECItem(0, C.cast(buffer, C.c_void_p), len(raw))
            result = SECItem()
            status = nss.PK11SDR_Decrypt(C.byref(source_item), C.byref(result), None)
            if status != 0:
                raise RuntimeError('Dekripsi gagal; periksa profil dan Primary Password.')
            try:
                print(field, C.string_at(result.data, result.len).decode('utf-8'))
            finally:
                nss.SECITEM_FreeItem(C.byref(result), 0)
finally:
    nss.NSS_Shutdown()
```

Jalankan:

```bash
python decrypt_firefox_ctf.py \
  workstation/AppData/Roaming/Mozilla/Firefox/Profiles/dadan.default-release
```

Mengapa komponennya diperlukan?

1. Base64 decode mengubah field JSON menjadi byte input NSS.
2. `SECItem` memberikan alamat buffer dan panjang data kepada NSS.
3. `NSS_Init` memilih database kunci pada salinan profil.
4. `PK11SDR_Decrypt` mengembalikan plaintext jika kondisi kunci terpenuhi.
5. Hasil dibaca sebagai UTF-8, lalu buffer milik NSS dibebaskan.

Hasil pada **profil fiktif CTF**:

```text
Host: https://swiss-escrow.ch
Username: dadan.suherman@mofcg.or.id
Password: D4danIst!mewa2026$
```

Tidak perlu mencoba login ke layanan di luar dataset. Password ini digunakan untuk menguji arsip lokal yang ditunjuk history.

### Langkah 4: buka arsip dan verifikasi file hasil

```bash
cd workstation/Documents/Sistem_Kliring_MOFCG/Failover_Recovery
unzip arsip_pemulihan_darurat.zip
```

Masukkan password hasil pemulihan secara interaktif. Penggunaan input interaktif menghindari masalah interpretasi karakter `!` atau `$` oleh shell dan tidak menaruh password sebagai argumen perintah.

```bash
sha256sum Catatan_Harian_14_Juli_2026.docx
cat Checksum_Verifikasi_Failover.sha256
```

Hash DOCX yang dipulihkan:

```text
72038973f0c2b0139672212bf9b83a8f63a10b9162c78bf73302a912c28f0d3f
```

Hash itu cocok dengan checksum dalam evidence. Kecocokan memperkuat bahwa dokumen hasil ekstraksi adalah file yang disebut manifest, tetapi manifest sendiri tetap bagian dataset, bukan bukti autentikasi independen dari pihak luar.

### Materi: DOCX, ZIP, OLE, dan VBA

Banyak format Office modern merupakan paket ZIP berisi XML dan komponen lain. Nama `.docx` tidak cukup untuk mengetahui seluruh isi paket.

`vbaProject.bin` merupakan komponen proyek VBA. **VBA** adalah bahasa pemrograman untuk otomasi Office. Proyek ini menggunakan struktur OLE Compound File, yang dapat berisi beberapa stream seperti modul dokumen dan metadata proyek. Sumber VBA dapat dikompresi, sehingga `strings` saja mungkin menghasilkan potongan yang tidak lengkap.

Microsoft mendokumentasikan proses membuka kompresi sumber pada [spesifikasi MS-OVBA](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-ovba/492124cc-5afc-48c8-b439-b42ad7087a7b). Kita dapat menggunakan parser seperti `olevba` untuk membaca sumber secara statis.

### Langkah 5: inspeksi makro tanpa menjalankannya

```bash
unzip -l Catatan_Harian_14_Juli_2026.docx
unzip -p Catatan_Harian_14_Juli_2026.docx word/vbaProject.bin > vbaProject.bin
olevba vbaProject.bin
```

`unzip -p` menulis isi satu entry ke stdout. Redirect `>` menyimpannya sebagai `vbaProject.bin`. `olevba` membaca proyek, bukan membuka dokumen pada Word.

Modul `ThisDocument` memuat `Document_Open` yang memanggil fungsi `ExtractEmergencyRecoveryToken`. Nama `Document_Open` berkaitan dengan event pembukaan dokumen; untuk analisis ini, **cukup baca sumber**, tidak perlu memicunya.

Bagian penting:

```vb
rawBytes = Array(&H4D, &H4F, &H46, &H7B, &H43, &H47, &H32, &H30, &H7D, &H32, &H36)

For i = LBound(rawBytes) To UBound(rawBytes)
    tokenBuffer = tokenBuffer & Chr(rawBytes(i))
Next i
```

Penjelasan:

- `&H` menandakan literal hex dalam VBA.
- `Array(...)` menyimpan urutan nilai.
- `LBound` dan `UBound` mengambil batas indeks array.
- `Chr` mengubah kode karakter menjadi karakter.
- `&` pada operasi string VBA melakukan penggabungan, berbeda dari `&` bitwise pada contoh Python.

### Langkah 6: rekonstruksi karakter secara manual

| Hex | Karakter |
|---|---|
| 4D | M |
| 4F | O |
| 46 | F |
| 7B | { |
| 43 | C |
| 47 | G |
| 32 | 2 |
| 30 | 0 |
| 7D | } |
| 32 | 2 |
| 36 | 6 |

Gabungkan **dalam urutan aslinya**:

```python
values = [0x4d, 0x4f, 0x46, 0x7b, 0x43, 0x47, 0x32, 0x30, 0x7d, 0x32, 0x36]
print(bytes(values).decode('ascii'))
# MOF{CG20}26
```

Jangan “merapikan” hasil menjadi `MOFCG{2026}` hanya agar menyerupai stage lain. Dalam forensik, transformasi tambahan harus punya dasar pada artefak.

**Token akhir:** `MOF{CG20}26`.

Token ini telah diterima server sumber. UI sumber sempat menolaknya di pemeriksaan format sebelum submission; itu tidak sama dengan server menyatakan token salah. Pada latihan LinuxLab, form Stage 9 menerima token persis tersebut.

### Apa yang dibuktikan catatan pribadi?

Teks dokumen mengakui pemalsuan persetujuan, rekayasa jejak phishing, dan pemasangan agen kliring dalam skenario. Dokumen keuangan keluarga, perawatan, serta perjalanan memberi konteks motif. Bedakan temuan isi dokumen dengan kesimpulan hukum terhadap orang nyata; yang dianalisis di sini adalah paket evidence fiktif.

**Latihan pemahaman:** mengapa Base64 decode terhadap `encryptedPassword` belum cukup? Mengapa hash DOCX diperiksa sebelum isi catatan dipakai dalam rekonstruksi?

## Ringkasan dan latihan mandiri

### Peta teknik menuju flag

| Stage | Petunjuk | Transformasi / pemeriksaan | Token |
|---|---|---|---|
| 1 | Private key dan arsip MBOX | Dekripsi GPG → header X-Campaign-Tag | `MOFCG{J4ngan}` |
| 2 | Payload User-Agent pada WAF alert | Ekstraksi JSON → Base64 decode | `MOFCG{S4mP4!}` |
| 3 | UDP/53 dengan pola karakter flag | Hex → ASCII → ROT13 | `MOFCG{Tert!puu}` |
| 4 | EXIF Software berawalan Hex | Metadata → hex decode | `MOFCG{Or4ang}` |
| 5 | PDF dengan text layer | Ekstraksi teks → pemeriksaan warna putih | `MOFCG{D4l4m}` |
| 6 | Custom-Tag PDF dan history stego | Steghide dengan Proyek-Nexus | `TU9GQ0d7RDRsNG19` |
| 7 | AUTH_SCHEME XOR_0x5A | Hex decode → XOR tiap byte | `MOFCG{M3m0ryFor3ns1k_S3ru}` |
| 8 | Interpreter bytecode dalam ELF | Constraint karakter → hash → token | `MOFCG{R3_M3nyen4ngkan_Sek4l!}` |
| 9 | Arsip, profil browser, dan dokumen | NSS → ZIP → VBA → ASCII | `MOF{CG20}26` |

### Pertanyaan untuk menguji pemahaman

1. Mengapa Base64 dan hex tidak memberikan kerahasiaan?
2. Mengapa pencarian flag pada gambar tidak cukup dilakukan dengan mata?
3. Jika WAF memblokir sebuah request, apakah token API sebelumnya pasti tidak terbit?
4. Mengapa Rp8 miliar yang lewat empat rekening tidak otomatis menjadi Rp32 miliar kerugian?
5. Bagaimana membuktikan bahwa XOR `0x5A` benar-benar membalik data?
6. Apa perbedaan alamat virtual dan offset file?
7. Mengapa brute-force satu karakter berbeda dari brute-force seluruh string?
8. Mengapa metadata Author tidak cukup untuk menuduh seseorang memalsukan dokumen?
9. Mengapa token dari array VBA harus dipertahankan persis, walaupun bentuknya tidak lazim?

### Petunjuk jawaban

1. Aturan dekodenya terbuka dan tidak membutuhkan rahasia.
2. Flag bisa berada di metadata, text layer, atau payload tersembunyi.
3. Tidak; lihat event dan timestamp masing-masing.
4. Bisa merupakan dana yang sama yang dipindahkan berulang.
5. XOR hasil plaintext dengan kunci yang sama dan cocokkan dengan byte awal.
6. Yang pertama koordinat memori program; yang kedua posisi di file. Gunakan pemetaan segmen.
7. Constraint independen memungkinkan pencarian lokal, bukan seluruh kombinasi sekaligus.
8. Metadata dapat diubah dan perlu dikorelasikan dengan bukti lain.
9. Hasil observasi tidak boleh diubah agar cocok dengan asumsi format.

### Catatan koreksi terhadap write-up awal

- Passphrase JPEG yang berhasil adalah **Proyek-Nexus**, bukan MOFCG2026.
- Flag EXIF Stage 4 dan token bonus merupakan dua artefak berbeda pada media yang sama.
- Token bonus yang diminta adalah **Base64 mentah**, bukan hasil dekodenya.
- Token Stage 9 adalah **MOF{CG20}26**, persis seperti array VBA.
- Panjang string hex UDP yang dicantumkan adalah **15 byte**; bedakan dengan panjang header atau frame.
- Tidak adanya payload setelah EOF PDF pada salinan evidence harus dicatat, meskipun history menyebut append.
- Seluruh sembilan tahap akhirnya dinyatakan selesai pada akun CTF yang digunakan. Ketidakpastian pada catatan analisis awal tidak boleh disalin sebagai status terkini.

### Referensi primer untuk belajar lebih lanjut

- [GNU Privacy Handbook](https://www.gnupg.org/gph/en/manual.html) — konsep pasangan kunci dan penggunaan GPG.
- [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html) — representasi Base16 dan Base64.
- [Referensi Python: operasi bitwise](https://docs.python.org/3/reference/expressions.html#binary-bitwise-operations) — operator XOR dan operasi bilangan bulat.
- [ExifTool Tag Names](https://exiftool.org/TagNames/) — struktur dan penamaan metadata.
- [Manual steghide](https://steghide.sourceforge.net/documentation/manual.pdf) — opsi ekstraksi dan passphrase.
- [pypdf: Extract Text from a PDF](https://pypdf.readthedocs.io/en/5.4.0/user/extract-text.html) — pembacaan text layer.
- [Mozilla NSS](https://firefox-source-docs.mozilla.org/security/nss/) — pustaka keamanan yang dipakai untuk profil Firefox.
- [Microsoft MS-OVBA: Decompression Algorithm](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-ovba/492124cc-5afc-48c8-b439-b42ad7087a7b) — format kompresi sumber VBA.

---

Disusun untuk pembelajaran dari artefak MOFCG dan hasil analisis 16 Oktober 2026. Semua offset, nilai kunci, dan hash khusus evidence harus diperiksa kembali jika file yang digunakan berbeda.
