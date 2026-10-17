import { warmUpQuestions, type WarmUpState } from "./warm-up";

// Teaching notes are separate from answer validation so guidance cannot award points.
const notes: [goal: string, format: string, explanation: string][] = [
  ["Membedakan perintah koneksi SSH dan password autentikasi.", "Password SSH persis; diakhiri tanda seru (!), tanpa titik.", "SSH menghubungkan workstation ke shell server. Password SSH latihan adalah admin1234! (tanpa titik). Password ini berbeda dari password MySQL. Prompt root@Cakgup menandakan login berhasil."],
  ["Membaca versi aplikasi tanpa tertukar dengan versi library pendukungnya.", "Nomor versi OpenSSH, tanpa versi OpenSSL.", "OpenSSH_6.7p1 menunjukkan versi OpenSSH 6.7p1. Angka OpenSSL pada baris yang sama adalah versi library kriptografi, bukan jawaban soal ini."],
  ["Mengenali direktori pribadi dan direktori kerja saat ini.", "Path absolut yang diawali /.", "Direktori pribadi root adalah /root. pwd hanya menunjukkan posisi saat ini; karena itu jalankan cd ~ dahulu bila sebelumnya sudah berpindah direktori."],
  ["Mengidentifikasi keluarga sistem operasi dari berkas identitas sistem.", "Isi NAME, tanpa NAME= dan tanpa tanda kutip.", "NAME pada /etc/os-release berisi Debian GNU/Linux. Sistem operasi berbeda dari kernel yang dibaca dengan uname."],
  ["Membedakan nama OS, nomor rilis, dan nama kode.", "Nomor rilis dan nama kode, seperti nomor (nama_kode).", "VERSION menunjukkan 8 (jessie). Debian adalah nama distribusi, sedangkan Jessie merupakan nama kode rilis tersebut."],
  ["Menentukan rilis kernel yang menjadi dasar analisis kompatibilitas sistem.", "Seluruh teks rilis kernel; pertahankan titik dan tanda hubung.", "uname -r menghasilkan 3.16.0-4-amd64. Ini versi kernel, bukan versi Debian atau aplikasi SSH."],
  ["Mengenali arsitektur mesin untuk memilih aplikasi dan alat analisis yang sesuai.", "Nama arsitektur persis dari keluaran perintah.", "x86_64 menunjukkan arsitektur x86 64-bit. uname -m membaca arsitektur mesin."],
  ["Membedakan antarmuka jaringan Ethernet dan loopback.", "Nama interface saja, tanpa nomor urut atau alamat IP.", "eth0 adalah interface Ethernet pada skenario ini. lo merupakan loopback untuk komunikasi di dalam host."],
  ["Menginventarisasi layanan yang menerima koneksi TCP.", "Angka bulat; hitung nomor port yang berbeda.", "Ada 10 nomor port TCP LISTEN. Fixture ini menampilkan satu baris per port. Pada sistem nyata, baris IPv4 dan IPv6 bisa merujuk port yang sama sehingga jumlah baris belum tentu sama dengan jumlah port unik."],
  ["Membedakan akun sistem Linux dari pengguna aplikasi web.", "Angka bulat, bukan seluruh keluaran wc.", "29 baris /etc/passwd berarti 29 akun Linux, termasuk akun layanan. Jumlah ini bukan jumlah pengguna WordPress."],
  ["Mengidentifikasi layanan web dari status service, bukan menebak dari nama aplikasi web.", "Nama service, misalnya nama.service.", "apache2.service adalah layanan Apache yang menjalankan webserver. WordPress adalah aplikasinya; keduanya mempunyai peran berbeda."],
  ["Membaca versi webserver sebagai bagian dari inventaris aset.", "Nomor versi setelah Apache/.", "Server version: Apache/2.4.10 menunjukkan Apache versi 2.4.10. Tanggal build bukan nomor versi."],
  ["Menemukan akar direktori konfigurasi webserver dari parameter build.", "Path absolut direktori HTTPD_ROOT, tanpa tanda kutip.", "HTTPD_ROOT menunjuk /etc/apache2. Direktori ini berisi konfigurasi server, bukan konten situs."],
  ["Memahami bagaimana konfigurasi utama memuat virtual host aktif.", "Satu baris directive lengkap, termasuk pola *.conf.", "IncludeOptional sites-enabled/*.conf memuat berkas .conf di sites-enabled. Pola * berarti berkas yang cocok; ini bukan nama satu berkas tertentu."],
  ["Membedakan konfigurasi situs yang tersedia dan yang sedang diaktifkan.", "Path absolut direktori, bukan nama berkas .conf.", "/etc/apache2/sites-available menyimpan konfigurasi situs yang tersedia. Keberadaan berkas di sini saja belum berarti situsnya aktif."],
  ["Menemukan konfigurasi virtual host yang digunakan layanan.", "Path absolut direktori, bukan nama berkas .conf.", "/etc/apache2/sites-enabled berisi konfigurasi situs yang diaktifkan. Pada instalasi Apache biasa, isinya dapat berupa symlink ke sites-available."],
  ["Menghubungkan konfigurasi virtual host dengan lokasi konten web.", "Nilai path setelah DocumentRoot, tanpa kata DocumentRoot.", "DocumentRoot /var/www/wordpress menunjuk akar konten WordPress. Direktori konfigurasi Apache tetap /etc/apache2."],
  ["Menelusuri variabel konfigurasi untuk menemukan lokasi log.", "Nilai path APACHE_LOG_DIR, bukan nama variabelnya.", "APACHE_LOG_DIR bernilai /var/log/apache2. Virtual host menggunakan variabel ini untuk menentukan lokasi access log dan error log."],
  ["Membedakan access log dan error log serta menemukan log situs yang tepat.", "Nama berkas saja, tanpa path direktori.", "CustomLog menunjuk access-wordpress.log untuk mencatat permintaan HTTP. ErrorLog menunjuk error-wordpress.log untuk pesan kesalahan server."],
  ["Membaca struktur access log dan mengenali sumber permintaan.", "Satu alamat IPv4, tanpa tanda kutip.", "Kolom pertama entri pertama berisi 192.168.56.101. Di sini yang diminta adalah IP pada urutan entri log, bukan IP server atau kesimpulan bahwa pengunjung itu penyerang."],
  ["Menyaring dan menghitung aktivitas satu alamat IP.", "Angka bulat, tanpa kata akses atau nama berkas.", "IP 192.168.56.101 muncul pada 1452 entri. Menghitung semua baris log menghasilkan 1455 karena ada tiga permintaan dari IP lain. Banyaknya akses saja tidak cukup untuk menyimpulkan serangan."],
  ["Mengidentifikasi layanan database dari proses yang berjalan.", "Nama aplikasi database, bukan PID atau path executable.", "Proses mysqld adalah server MySQL. Perintah mysql merupakan klien untuk berinteraksi dengan layanan tersebut."],
  ["Membedakan versi program klien dan versi distribusi/server database.", "Angka setelah Ver; jangan ambil angka setelah Distrib.", "mysql -V menampilkan klien Ver 14.14 dan Distrib 5.5.54. Soal meminta versi klien, jadi jawabannya 14.14. Monitor SQL melaporkan server 5.5.54."],
  ["Menghubungkan proses database dengan port yang digunakannya.", "Nomor port saja, tanpa IP dan tanda titik dua.", "mysqld menerima koneksi pada 127.0.0.1:3306. Nomor portnya 3306; alamat loopback berarti listener ini diikat ke host lokal."],
  ["Menemukan kredensial latihan di konfigurasi aplikasi dan membuktikan login database.", "Password persis; huruf A besar dan tanda titik terakhir harus dipertahankan.", "DB_PASSWORD pada wp-config.php berisi Admin1234!. (termasuk satu titik terakhir). Login berhasil ditandai prompt mysql>. Password ini berbeda dari SSH yang diawali a kecil."],
  ["Menginventarisasi database setelah autentikasi berhasil.", "Jumlah database sebagai angka bulat.", "SHOW DATABASES; menampilkan empat database: information_schema, mysql, performance_schema, dan wordpress. Angka 4 rows in set menghitung hasil tersebut."],
  ["Membedakan database aplikasi dan database sistem MySQL.", "Nama database saja, tanpa USE atau titik koma.", "wordpress menyimpan data aplikasi web. information_schema, mysql, dan performance_schema merupakan database sistem."],
  ["Memilih database dan mengenali tabel akun aplikasi.", "Nama tabel saja, termasuk prefix wp_.", "Setelah USE wordpress;, SHOW TABLES; menampilkan wp_users. Prefix wp_ membedakan nama tabel WordPress dari tabel aplikasi lain."],
  ["Menghitung baris tabel pengguna dengan agregasi SQL.", "Nilai COUNT(*) sebagai angka bulat.", "SELECT COUNT(*) FROM wp_users; menghasilkan 1 pengguna WordPress. Ini berbeda dari 29 akun Linux di /etc/passwd."],
  ["Mengambil satu kolom yang relevan untuk menyusun konteks waktu investigasi.", "YYYY-MM-DD HH:MM:SS, tanpa tanda kutip.", "Kolom user_registered berisi 2017-04-25 06:26:03. Nilai ini merupakan waktu registrasi yang tersimpan di aplikasi, bukan bukti waktu login terakhir."],
];

export function warmUpGuide(index: number) {
  const [goal, format, explanation] = notes[index];
  const overrides: Record<number,string[]> = {
    2:["cd ~","pwd"],
    8:["ss -lntp","ss -lntp | grep LISTEN | wc -l"],
    10:["systemctl list-units --type=service --state=running","systemctl status apache2"],
    14:["ls /etc/apache2/sites-available"],
    24:["cat /var/www/wordpress/wp-config.php","mysql -u root -p"],
    27:["USE wordpress;","SHOW TABLES;"],
    28:["USE wordpress;","SELECT COUNT(*) FROM wp_users;"],
    29:["USE wordpress;","SELECT user_registered FROM wp_users;"],
  };
  return { goal,format,explanation,commands:overrides[index] || [warmUpQuestions[index].command] };
}

export function warmUpSessionAdvice(index: number, state: WarmUpState) {
  if (state.pending) return { label:"Menunggu password",message:state.pending === "ssh" ? "Terminal sedang meminta password SSH. Ketik admin1234! lalu Enter. Karakter tidak terlihat dan itu normal. Ctrl+C membatalkan." : "Terminal sedang meminta password MySQL. Gunakan nilai DB_PASSWORD dari wp-config.php, lalu Enter. Password tidak ditampilkan.",commands:[] };
  if (!state.connected) return { label:"Workstation · belum login SSH",message:"Masuk ke server sebelum menjalankan investigasi. Jika halaman baru dimuat ulang, temuan tetap tersimpan tetapi kamu perlu login SSH lagi. Password SSH: admin1234! (tanpa titik).",commands:["ssh root@192.168.22.7"] };
  if (index >= 25 && !state.mysql) return { label:"Shell Linux · perlu masuk MySQL",message:"Soal ini menggunakan SQL. Login ke MySQL dengan password dari DB_PASSWORD pada konfigurasi WordPress. Setelah muncul mysql>, jalankan query pada petunjuk.",commands:["cat /var/www/wordpress/wp-config.php","mysql -u root -p"] };
  if (index <= 23 && state.mysql) return { label:"MySQL · perlu kembali ke Linux",message:"Soal ini membutuhkan perintah Linux. Ketik exit untuk keluar dari MySQL. Kamu tetap berada di server SSH; tidak perlu login ulang.",commands:["exit"] };
  if (index >= 27 && state.mysql && !state.sql && state.database !== "wordpress") return { label:"MySQL · pilih database WordPress",message:"Pertanyaan ini membaca tabel aplikasi. Pilih database wordpress terlebih dahulu, lalu jalankan query pada petunjuk. Jika tidak memilih database, MySQL akan menampilkan No database selected.",commands:["USE wordpress;"] };
  if (state.mysql) return { label:state.sql ? "SQL belum selesai · prompt ->" : "MySQL · siap menjalankan SQL",message:state.sql ? "Query belum diakhiri titik koma. Lengkapi query dan tambahkan ;, atau ketik \\c untuk membatalkan query yang belum selesai." : "Jalankan query setelah prompt mysql>. Akhiri setiap query dengan ;. USE wordpress; memilih database untuk soal tabel dan pengguna. Ketik exit untuk kembali ke Linux.",commands:[] };
  return { label:"Shell Linux · root@Cakgup",message:"Kamu sudah berada di server. Ketik perintah tanpa menyalin prompt root@Cakgup atau tanda #. Baca keluarannya, lalu isi jawaban singkat pada kolom temuan.",commands:[] };
}
