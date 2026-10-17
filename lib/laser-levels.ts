export type LaserLevel = {
  title: string; topic: string; mission: string; hint: string; solution: string[]; flag: string; points: number;
};

const level = (title: string, topic: string, mission: string, hint: string, solution: string[], answer: string): Omit<LaserLevel, "points"> =>
  ({ title, topic, mission, hint, solution, flag: `Cakgup{${answer}}` });

const definitions = [
  level("Langkah pertama", "ls", "Tampilkan daftar berkas pada direktori awal. Flag pertama merupakan nama sebuah berkas; kamu tidak perlu membaca isi berkasnya.", "Gunakan ls untuk melihat nama berkas dan direktori.", ["ls"], "sangatmudah"),
  level("Tak terlihat", "File tersembunyi", "Ada berkas tersembunyi. Temukan flag pada namanya; tanda titik di awal bukan bagian flag.", "Opsi -a menampilkan nama yang diawali titik.", ["ls -la"], "hiddenfile"),
  level("Baca pesannya", "cat", "Baca isi flag.txt untuk mendapatkan flag berikutnya.", "cat menerima nama berkas sebagai argumen.", ["cat flag.txt"], "semangatmencari"),
  level("Jarak di antara kita", "Quoting", "Baca berkas bernama file flag.txt. Spasi adalah bagian dari namanya.", "Apit nama berkas dengan tanda kutip atau gunakan backslash sebelum spasi.", ['cat "file flag.txt"'], "janganadaspasidiantarakita"),
  level("Nama yang rumit", "Tab completion", "Baca berkas dengan nama panjang tanpa mengetik seluruh namanya.", "Ketik cat naM4 lalu tekan Tab untuk melengkapi nama.", ["cat naM4_Fil3_iNi_s4ngat_PaNjanG_dAn_rUm1T_t4p1_aD4_car4_c3PaT.txt"], "cintakurumit"),
  level("Di balik folder", "cd · pwd", "Masuk ke direktori flag. Flag tersimpan sebagai nama berkas di dalamnya.", "Gunakan cd flag, lalu ls. pwd menunjukkan lokasi saat ini.", ["cd flag", "ls"], "bukafolder"),
  level("Direktori berjarak", "Escaping", "Telusuri direktori bernama direktori flag dan baca pesannya.", "Gunakan cd \"direktori flag\" atau cd direktori\\ flag.", ['cd "direktori flag"', "cat flag.txt"], "akukesaldenganjarak"),
  level("Waktu yang tepat", "stat", "Ada tujuh berkas. Flag yang benar berada di berkas yang dimodifikasi pada 2019-11-10 23:22:41.", "Bandingkan waktu Modify dengan stat flag*.txt.", ["stat flag*.txt", "cat flag5.txt"], "akuhanyainginwaktumu"),
  level("Siapa pemiliknya?", "Owner · group", "Temukan berkas yang dimiliki pengguna level8, bukan sekadar grup level8.", "ls -l menampilkan pemilik pada kolom sebelum grup.", ["ls -l", "cat flag8.txt"], "diamilikku"),
  level("Awal sebuah jejak", "head", "Flag tersembunyi pada sepuluh baris pertama sebuah log panjang.", "Gunakan head -n 10 flag.txt.", ["head -n 10 flag.txt"], "kaudatangdanpergi"),
  level("Pesan terakhir", "tail", "Cari flag pada sepuluh baris terakhir flag.txt. Abaikan salinan cadangannya.", "tail membaca bagian akhir berkas.", ["tail -n 10 flag.txt"], "bukaniniyangkumau"),
  level("Hingga pelosok", "find · locate", "Cari flag_level11.txt di luar direktori home, kemudian baca isinya.", "Gunakan find / -name flag_level11.txt atau locate flag_level11.", ["find / -name flag_level11.txt", "cat /var/log/flag_level11.txt"], "carifilehinggapelosok"),
  level("Perbaiki izin baca", "chmod", "flag.txt belum memiliki izin baca untuk pemiliknya. Permission awalnya 000. Periksa permission, tambahkan izin baca untuk user, lalu baca isinya.", "ls -l menampilkan izin. chmod u+r flag.txt menambahkan izin baca pemilik tanpa mengubah izin grup dan lainnya.", ["ls -l", "chmod u+r flag.txt", "cat flag.txt"], "kinikaudengannya"),
  level("Saring kebisingan", "grep · pipe", "Temukan baris yang mengandung Cakgup di antara ratusan baris log.", "grep Cakgup flag.txt dapat mencari langsung tanpa cat.", ["cat flag.txt | grep Cakgup"], "cariterusbor"),
  level("Bukan sebuah opsi", "Path relatif", "Baca berkas -flag tanpa membuat namanya dianggap sebagai opsi.", "Awali nama dengan ./ atau gunakan cat -- -flag.", ["cat ./-flag"], "dotslash"),
  level("Pesan Python", "Python bytecode", "Jalankan flag.pyc menggunakan interpreter Python simulasi yang sesuai.", "Gunakan python flag.pyc. Di Linux nyata, versi bytecode harus cocok dengan interpreter.", ["python flag.pyc"], "wearepython"),
  level("Jalankan berkasnya", "Executable", "Program flag memiliki izin executable. Jalankan dari direktori saat ini.", "Awalan ./ meminta shell menjalankan program dari direktori saat ini.", ["./flag"], "vitaminc"),
  level("Gulir dan rangkai", "more · less", "Baca flag.txt dengan pager. Flag dipecah menjadi tiga baris; gabungkan tanpa spasi dan baris baru.", "Gunakan more flag.txt atau less flag.txt; gulir terminal untuk membaca.", ["more flag.txt"], "scrollup"),
  level("Teks di antara byte", "strings", "Berkas flag.txt berisi byte nonteks. Ambil rangkaian teks yang bisa dibaca.", "strings mengekstrak karakter yang dapat dicetak.", ["strings flag.txt"], "adasedikitbintangmalamini"),
  level("Buka ZIP", "unzip", "Ekstrak flag.zip dan baca berkas hasil ekstraksinya.", "Gunakan unzip flag.zip, lalu periksa hasil dengan ls.", ["unzip flag.zip", "cat flag.txt"], "kulitmanggis"),
  level("Lapisan TAR XZ", "tar", "Ekstrak flag.tar.xz untuk menemukan flag.txt.", "tar -xvf flag.tar.xz mengekstrak arsip; -J dapat dipakai untuk XZ.", ["tar -xvf flag.tar.xz", "cat flag.txt"], "mastinhadir"),
  level("Arsip RAR", "unrar", "Buka flag.rar, lalu baca berkas teks yang dihasilkan.", "Gunakan unrar x flag.rar.", ["unrar x flag.rar", "cat flag.txt"], "nexusian"),
  level("Satukan petunjuk", "Wildcard · redirection", "Gabungkan flag*.txt ke test.txt dan cari flag lengkap yang memiliki isi. Abaikan potongan dan flag kosong.", "Gunakan cat flag*.txt > test.txt, lalu grep Cakgup test.txt.", ["cat flag*.txt > test.txt", "grep Cakgup test.txt"], "rgb15"),
  level("Pesan Base64", "base64", "flag.txt berisi teks Base64. Dekode langsung di terminal.", "Gunakan base64 -d flag.txt; Base64 merupakan encoding, bukan enkripsi.", ["base64 -d flag.txt"], "reperto"),
  level("Sidik jari MD5", "md5sum", "Temukan berkas dengan MD5 bfa6beb7bea6ebabe77dac450efcdf20, lalu baca flag-nya.", "Bentuk yang benar adalah md5sum flag*.txt, tanpa kata cat.", ["md5sum flag*.txt", "cat flag9.txt"], "melihatmutersenyum"),
  level("Sidik jari SHA-1", "sha1sum", "Cari berkas dengan SHA-1 e60546abbdaabfdc2d9e17ccc02dd9192dc51339.", "Jalankan sha1sum flag*.txt dan cocokkan nilai checksum.", ["sha1sum flag*.txt", "cat flag6.txt"], "youarethequeen"),
  level("Sidik jari SHA-256", "sha256sum", "Cari berkas dengan SHA-256 d740c8e86db31ff1a3d7ead09313cb610ea9aa0bf8109b83dfff29d16bae18a2.", "Jalankan sha256sum flag*.txt. Nilai hash bukan teks yang didekode.", ["sha256sum flag*.txt", "cat flag1.txt"], "cobalahmengerti"),
  level("Sidik jari SHA-512", "sha512sum", "Cari berkas dengan SHA-512 d41780135c8a51c9f022839c34a1377865fc2734dc8e98f8ee2d247dd3ff6424b5ca6f7156e653607037d9e45f4fdf1e2bc830386b4f60c55c47f3651ba5f729.", "Gunakan sha512sum flag*.txt. Cocokkan keseluruhan hash, lalu baca berkasnya.", ["sha512sum flag*.txt", "cat flag8.txt"], "kaurinduku"),
  level("Pesan dari localhost", "curl", "Baca petunjuk dalam flag.txt dan ambil pesan dari layanan HTTP lokal simulasi.", "Gunakan curl http://localhost/flag.txt. Tidak ada permintaan jaringan sungguhan.", ["cat flag.txt", "curl http://localhost/flag.txt"], "planetpluto"),
  level("Pesan terenkripsi", "gpg", "Dekripsi flag.txt.gpg dengan passphrase latihan 12345678, lalu baca hasilnya.", "Gunakan gpg --batch --passphrase 12345678 --output flag.txt --decrypt flag.txt.gpg. Passphrase 12345678 tercantum pada panduan Linux Game.", ["gpg --batch --passphrase 12345678 --output flag.txt --decrypt flag.txt.gpg", "cat flag.txt"], "kauyangterakhir"),
  level("Root dan Golden Tiket", "sudo · root", "Dapatkan akses root, baca flag.txt sebagai petunjuk, lalu cari GoldenTiket.txt. Isi flag.txt bukan password akun berikutnya. Kredensial pengguna Laser dan flag akhir berada dalam GoldenTiket.txt.", "Periksa sudo -l, masukkan password akun level30 (isi flag level29) saat diminta, lalu jalankan sudo su. Setelah menjadi root, baca flag.txt, cari GoldenTiket.txt dengan locate atau find, dan baca hasilnya. Kirim flag Golden Tiket melalui formulir untuk menyelesaikan permainan.", ["sudo -l", "sudo su", "cat flag.txt", "locate GoldenTiket", "cat /root/GoldenTiket.txt"], "selamat_ini_adalah_golden_tiket"),
];

// Poin sesuai kolom Points dalam Linux Game.pdf.
const points = [100,100,100,100,100,100,5,50,50,20,30,60,30,20,40,40,50,50,60,50,50,50,40,40,40,40,5,5,5,5,5];
export const laserLevels: LaserLevel[] = definitions.map((entry, index) => ({ ...entry, points: points[index] }));
export const LASER_PROGRESS_KEY = "linuxlab-laser-progress-v2";
export const LASER_ACTIVE_KEY = "linuxlab-laser-active-v2";
export function readLaserProgress(raw: string | null): number {
  try {
    const data: unknown = JSON.parse(raw || "null");
    return typeof data === "number" && Number.isInteger(data) && data >= 0 && data <= laserLevels.length ? data : 0;
  } catch { return 0; }
}

// The former extra level31 is now part of the final level30.
export function migrateLaserProgress(raw: string | null): number {
  try {
    const value: unknown = JSON.parse(raw || "null");
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 32 ? (value > 30 ? value - 1 : value) : 0;
  } catch { return 0; }
}
