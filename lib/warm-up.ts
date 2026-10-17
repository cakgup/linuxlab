import { extractRedirection,runStage,splitPipeline,writeFile } from "./shell";
import { completeTerminal, labCommands } from "./terminal-completion";
import type { LabState, VNode } from "./types";

export const WARM_UP_PROGRESS_KEY = "linuxlab-warm-up-progress-v1";
export const warmUpGroups = ["Profil server", "Profil webserver", "Profil database"];
export interface WarmUpQuestion { group: number; title: string; question: string; answers: string[]; hint: string; command: string; exact?: boolean }
const q = (group: number, title: string, question: string, answers: string[], hint: string, command: string, exact = false): WarmUpQuestion => ({ group, title, question, answers, hint, command, exact });
export const warmUpQuestions: WarmUpQuestion[] = [
  q(0,"Masuk melalui SSH","Login ke server latihan melalui SSH. Apa password akun root?",["admin1234!"],"Kredensial awal tersedia pada briefing. Login dahulu sebelum melanjutkan investigasi.","ssh root@192.168.22.7",true),
  q(0,"Versi SSH","Apa versi OpenSSH pada server?",["6.7p1","OpenSSH_6.7p1"],"Gunakan ssh -V setelah login.","ssh -V"),
  q(0,"Direktori pengguna","Apa path direktori pribadi akun root?",["/root"],"Periksa posisi awal dengan pwd atau entri root pada /etc/passwd.","pwd"),
  q(0,"Sistem operasi","Apa nama sistem operasi server?",["Debian GNU/Linux","Debian"],"Baca /etc/os-release; perhatikan NAME.","cat /etc/os-release"),
  q(0,"Versi OS","Apa versi dan nama kode sistem operasi?",["8 (jessie)","8","jessie","Debian 8 (jessie)"],"Cari VERSION dalam /etc/os-release.","cat /etc/os-release"),
  q(0,"Kernel","Apa versi kernel yang digunakan?",["3.16.0-4-amd64"],"uname -r menampilkan rilis kernel.","uname -r"),
  q(0,"Arsitektur","Apa arsitektur server?",["x86_64"],"Gunakan uname -m.","uname -m"),
  q(0,"Antarmuka Ethernet","Apa nama interface Ethernet server?",["eth0"],"Periksa ip a; lo adalah loopback.","ip a"),
  q(0,"Port layanan","Berapa jumlah nomor port TCP LISTEN yang berbeda?",["10"],"Gunakan ss -lntp. Hitung port yang berbeda, bukan baris duplikat IPv4/IPv6.","ss -lntp"),
  q(0,"Akun sistem","Berapa jumlah seluruh akun pada server?",["29"],"Setiap baris /etc/passwd mewakili satu akun.","wc -l /etc/passwd"),
  q(1,"Layanan web","Apa nama layanan webserver yang berjalan?",["apache2.service","apache2","apache"],"Periksa systemctl status apache2 atau daftar proses.","systemctl status apache2"),
  q(1,"Versi Apache","Apa versi aplikasi Apache?",["2.4.10","Apache/2.4.10"],"Gunakan apache2 -v.","apache2 -v"),
  q(1,"Direktori konfigurasi","Apa path direktori konfigurasi Apache?",["/etc/apache2"],"apache2ctl -V menampilkan HTTPD_ROOT.","apache2ctl -V"),
  q(1,"Include virtual host","Apa baris konfigurasi yang memuat virtual host aktif?",["IncludeOptional sites-enabled/*.conf"],"Baca apache2.conf dan cari kata sites-enabled.","grep sites-enabled /etc/apache2/apache2.conf"),
  q(1,"Situs tersedia","Apa path direktori konfigurasi situs yang tersedia?",["/etc/apache2/sites-available"],"Periksa isi /etc/apache2.","ls /etc/apache2"),
  q(1,"Situs aktif","Apa path direktori konfigurasi situs yang aktif?",["/etc/apache2/sites-enabled"],"Bedakan direktori available dan enabled.","ls /etc/apache2/sites-enabled"),
  q(1,"DocumentRoot","Apa DocumentRoot web WordPress?",["/var/www/wordpress"],"Baca konfigurasi virtual host wordpress.conf.","cat /etc/apache2/sites-enabled/wordpress.conf"),
  q(1,"Direktori log","Apa direktori log Apache?",["/var/log/apache2"],"Periksa APACHE_LOG_DIR di /etc/apache2/envvars.","grep APACHE_LOG_DIR /etc/apache2/envvars"),
  q(1,"Berkas akses","Apa nama berkas access log WordPress?",["access-wordpress.log"],"CustomLog pada virtual host menentukan nama berkasnya.","cat /etc/apache2/sites-enabled/wordpress.conf"),
  q(1,"Pengunjung pertama","Apa alamat IP pada entri pertama access log WordPress?",["192.168.56.101"],"Baca satu baris pertama dengan head -n 1.","head -n 1 /var/log/apache2/access-wordpress.log"),
  q(1,"Jumlah akses","Berapa kali IP pengunjung pertama mengakses web?",["1452"],"Saring IP itu dengan grep, kemudian hitung barisnya menggunakan wc -l.","grep '192.168.56.101' /var/log/apache2/access-wordpress.log | wc -l"),
  q(2,"Layanan database","Apa nama aplikasi database yang berjalan?",["mysql","mysqld","mysql.service"],"Periksa daftar proses dan layanan mysql.","ps aux | grep mysql"),
  q(2,"Versi klien MySQL","Apa versi klien mysql (angka setelah Ver)?",["14.14"],"mysql -V menampilkan Ver klien dan Distrib server secara terpisah.","mysql -V"),
  q(2,"Port MySQL","Pada port berapa layanan database menerima koneksi?",["3306"],"Saring keluaran ss berdasarkan proses mysqld.","ss -lntp | grep mysqld"),
  q(2,"Login database","Apa password root MySQL? Login untuk memverifikasinya.",["Admin1234!."],"Baca wp-config.php untuk kredensial lokal latihan, lalu gunakan mysql -u root -p.","mysql -u root -p",true),
  q(2,"Jumlah database","Berapa jumlah database di server MySQL?",["4"],"Sesudah login MySQL, jalankan SHOW DATABASES;.","SHOW DATABASES;"),
  q(2,"Database aplikasi","Apa nama database yang berisi konten web?",["wordpress"],"Periksa DB_NAME pada wp-config.php atau hasil SHOW DATABASES;.","SHOW DATABASES;"),
  q(2,"Tabel pengguna","Apa nama tabel pengguna web WordPress?",["wp_users"],"Pilih database dengan USE wordpress; lalu jalankan SHOW TABLES;.","SHOW TABLES;"),
  q(2,"Jumlah pengguna web","Berapa jumlah pengguna dalam tabel tersebut?",["1"],"Gunakan SELECT COUNT(*) FROM wp_users;.","SELECT COUNT(*) FROM wp_users;"),
  q(2,"Waktu registrasi","Kapan pengguna web itu didaftarkan?",["2017-04-25 06:26:03"],"SELECT user_registered FROM wp_users; menampilkan waktu registrasi.","SELECT user_registered FROM wp_users;"),
];

export function readWarmUpProgress(raw: string | null): number[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id >= 0 && id < warmUpQuestions.length))] : [];
  } catch { return []; }
}
export function checkWarmUpAnswer(index: number, answer: string) {
  const question = warmUpQuestions[index];
  if (!question) return false;
  const clean = (s: string) => s.trim().replace(/\/$/, "").replace(/\s+/g, " ");
  return question.answers.some(expected => question.exact ? answer.trim() === expected : clean(answer).toLowerCase() === clean(expected).toLowerCase());
}

export interface WarmUpState extends LabState { connected: boolean; pending?: "ssh" | "mysql"; mysql: boolean; database: string; sql: string; sshVerified: boolean; mysqlVerified: boolean }
export interface WarmUpResult { state: WarmUpState; output: string; clear?: boolean; password?: boolean; passwordPrompt?: string; prompt?: string }
export function createWarmUpState(): WarmUpState {
  const fs: Record<string, VNode> = {};
  const put = (path: string, content?: string) => {
    const chunks = path.split("/").filter(Boolean);
    for (let i = 0; i < chunks.length; i++) {
      const directory = "/" + chunks.slice(0,i).join("/");
      fs[directory] ||= { type:"dir",path:directory,name:directory.split("/").pop() || "/",mode:0o755,owner:"root",group:"root" };
    }
    fs[path] = { type:content === undefined ? "dir" : "file",path,name:chunks[chunks.length - 1],mode:content === undefined ? 0o755 : 0o644,owner:"root",group:"root",content };
  };
  put("/root"); put("/home/analyst"); put("/tmp");
  put("/etc/hostname","Cakgup\n");
  put("/etc/os-release",'PRETTY_NAME="Debian GNU/Linux 8 (jessie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="8"\nVERSION="8 (jessie)"\nID=debian\n');
  put("/etc/debian_version","8.7\n");
  const users = "root daemon bin sys sync games man lp mail news uucp proxy www-data backup list irc gnats nobody libuuid syslog messagebus sshd statd ntp mysql shellinabox stunnel4 postfix admin".split(" ");
  put("/etc/passwd",users.map((user,i)=>`${user}:x:${i}:${i}:${user}:${user === "root" ? "/root" : "/var/lib/"+user}:/bin/${user === "root" ? "bash" : "false"}`).join("\n")+"\n");
  put("/etc/apache2/apache2.conf","# Apache HTTP Server configuration\nServerRoot /etc/apache2\nIncludeOptional mods-enabled/*.load\nIncludeOptional mods-enabled/*.conf\nInclude ports.conf\nIncludeOptional conf-enabled/*.conf\n# Include the virtual host configurations:\nIncludeOptional sites-enabled/*.conf\n");
  put("/etc/apache2/envvars","export APACHE_RUN_USER=www-data\nexport APACHE_RUN_GROUP=www-data\nexport APACHE_LOG_DIR=/var/log/apache2\n");
  put("/etc/apache2/ports.conf","Listen 80\nListen 443\n");
  const virtualHost = "ServerName localhost\n<VirtualHost *:80>\n    UseCanonicalName Off\n    ServerAdmin webmaster@localhost\n    DocumentRoot /var/www/wordpress\n</VirtualHost>\n<VirtualHost *:443>\n    SSLEngine on\n    ServerAdmin webmaster@localhost\n    DocumentRoot /var/www/wordpress\n    ErrorLog ${APACHE_LOG_DIR}/error-wordpress.log\n    CustomLog ${APACHE_LOG_DIR}/access-wordpress.log combined\n</VirtualHost>\n";
  put("/etc/apache2/sites-available/wordpress.conf",virtualHost);
  put("/etc/apache2/sites-enabled/wordpress.conf",virtualHost);
  put("/etc/apache2/sites-available/000-default.conf","<VirtualHost *:80>\n    DocumentRoot /var/www/html\n</VirtualHost>\n");
  put("/etc/apache2/mods-enabled"); put("/etc/apache2/conf-enabled");
  put("/var/www/wordpress/wp-config.php","<?php\n// Kredensial lokal untuk simulasi latihan Warm Up.\ndefine('DB_NAME', 'wordpress');\ndefine('DB_USER', 'root');\ndefine('DB_PASSWORD', 'Admin1234!.');\ndefine('DB_HOST', 'localhost');\n$table_prefix = 'wp_';\n");
  put("/var/www/wordpress/index.php","<?php require('./wp-blog-header.php');\n");
  // Reconstructed rows preserve the first IP and its exact 1452-request count from the PDF.
  put("/var/log/apache2/access-wordpress.log",Array.from({length:1455},(_,i)=>`${i < 1452 ? "192.168.56.101" : "192.168.56.102"} - - [05/Jul/2025:13:${String(Math.floor(i/60)%60).padStart(2,"0")}:${String(i%60).padStart(2,"0")} +0000] "GET ${i%3 === 0 ? "/" : "/wp-content/themes/default/style.css"} HTTP/1.1" 200 512 "-" "Mozilla/5.0"`).join("\n")+"\n");
  put("/var/log/apache2/error-wordpress.log","[Sun Jul 05 13:16:18 2025] [notice] Apache/2.4.10 configured -- resuming normal operations\n");
  return { cwd:"/home/analyst",fs,history:[],killedPids:[],processes:[
    {pid:451,user:"root",cpu:0,mem:0.1,command:"/usr/sbin/sshd -D",alive:true},
    {pid:802,user:"www-data",cpu:0,mem:1.2,command:"/usr/sbin/apache2 -k start",alive:true},
    {pid:1123,user:"mysql",cpu:0,mem:4.2,command:"/usr/sbin/mysqld --basedir=/usr --datadir=/var/lib/mysql",alive:true},
  ],connected:false,mysql:false,database:"",sql:"",sshVerified:false,mysqlVerified:false,env:{HOME:"/home/analyst",USER:"analyst",SHELL:"/bin/bash",PATH:"/usr/bin:/bin"} };
}

const table = (columns: string[], rows: string[][]) => {
  const widths = columns.map((c,i)=>Math.max(c.length,...rows.map(row=>row[i].length)));
  const border = "+"+widths.map(w=>"-".repeat(w+2)).join("+")+"+";
  const row = (values: string[]) => "| "+values.map((v,i)=>v.padEnd(widths[i])).join(" | ")+" |";
  return [border,row(columns),border,...rows.map(row),border,`${rows.length} row${rows.length === 1 ? "" : "s"} in set (0.00 sec)`].join("\n");
};
function runSql(state: WarmUpState, raw: string): string {
  const sql = raw.trim().replace(/;$/, "").replace(/`/g, "").replace(/\s+/g," ");
  if (/^show databases$/i.test(sql)) return table(["Database"],["information_schema","mysql","performance_schema","wordpress"].map(v=>[v]));
  const use = sql.match(/^use (\w+)$/i);
  if (use) { if (!["wordpress","mysql","information_schema","performance_schema"].includes(use[1].toLowerCase())) return `ERROR 1049 (42000): Unknown database '${use[1]}'`; state.database=use[1].toLowerCase(); return "Database changed"; }
  if (/^select version\(\)$/i.test(sql)) return table(["VERSION()"],[["5.5.54-0+deb8u1"]]);
  if (/^select database\(\)$/i.test(sql)) return table(["DATABASE()"],[[state.database || "NULL"]]);
  if (!state.database && !/from wordpress\./i.test(sql)) return "ERROR 1046 (3D000): No database selected. Jalankan USE wordpress;";
  if (/^show tables$/i.test(sql) && state.database === "wordpress") return table(["Tables_in_wordpress"],"wp_commentmeta wp_comments wp_links wp_options wp_postmeta wp_posts wp_term_relationships wp_term_taxonomy wp_termmeta wp_terms wp_usermeta wp_users".split(" ").map(t=>[t]));
  if (/^(describe|desc) (wordpress\.)?wp_users$/i.test(sql) && (state.database === "wordpress" || /wordpress\./i.test(sql))) return table(["Field","Type"],[["ID","bigint(20) unsigned"],["user_login","varchar(60)"],["user_pass","varchar(255)"],["user_nicename","varchar(50)"],["user_email","varchar(100)"],["user_url","varchar(100)"],["user_registered","datetime"],["user_activation_key","varchar(255)"],["user_status","int(11)"],["display_name","varchar(250)"]]);
  const select = sql.match(/^select (.+) from (?:wordpress\.)?wp_users(?: limit 1)?$/i);
  if (select && (state.database === "wordpress" || /wordpress\./i.test(sql))) {
    if (/^count\(\*\)(?: as \w+)?$/i.test(select[1])) return table(["COUNT(*)"],[["1"]]);
    const user: Record<string,string> = { ID:"1",user_login:"admin",user_pass:"[hash latihan]",user_nicename:"admin",user_email:"admin@cakgup.local",user_url:"",user_registered:"2017-04-25 06:26:03",user_activation_key:"",user_status:"0",display_name:"admin" };
    const names = select[1] === "*" ? Object.keys(user) : select[1].split(",").map(n=>n.trim().toLowerCase()).map(n=>n === "id" ? "ID" : n);
    if (names.some(n=>!(n in user))) return "ERROR 1054 (42S22): Unknown column";
    return table(names,[names.map(n=>user[n])]);
  }
  return "ERROR 1064 (42000): Query latihan belum didukung. Gunakan SHOW DATABASES; USE wordpress; SHOW TABLES; atau SELECT ... FROM wp_users;";
}

export function cancelWarmUpAuthentication(input: WarmUpState): WarmUpState { return { ...input,pending:undefined,sql:"" }; }
export function executeWarmUp(input: WarmUpState, line: string): WarmUpResult {
  let state = { ...input,fs:Object.fromEntries(Object.entries(input.fs).map(([path,node])=>[path,{...node}])),history:[...input.history] };
  const result = (output: string, extra: Partial<Omit<WarmUpResult,"state"|"output">> = {}): WarmUpResult => ({ state,output,prompt:state.mysql ? state.sql ? "    -> " : "mysql> " : undefined,...extra });
  if (state.pending) {
    const pending = state.pending; state.pending=undefined;
    if (line !== (pending === "ssh" ? "admin1234!" : "Admin1234!.")) return result(pending === "ssh" ? "Permission denied (password). Jalankan ssh lagi untuk mencoba." : "ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)");
    if (pending === "ssh") { state.connected=true; state.sshVerified=true; state.cwd="/root"; state.env={...state.env,HOME:"/root",USER:"root"}; return result("Welcome to TurnKey GNU/Linux 14.2 / Debian 8.7 Jessie (simulasi Warm Up).\nKetik help untuk daftar perintah investigasi."); }
    state.mysql=true; state.mysqlVerified=true; state.database=""; state.sql="";
    return result("Welcome to the MySQL monitor. Commands end with ;.\nServer version: 5.5.54-0+deb8u1 (Debian)\nGunakan SHOW DATABASES; dan USE wordpress;\nKetik exit untuk kembali ke shell.");
  }
  if (state.mysql) {
    if (/^(exit|quit|\\q);?$/i.test(line.trim())) { state.mysql=false; state.sql=""; return result("Bye"); }
    if (line.trim() === "\\c") { state.sql=""; return result(""); }
    if (/^(help|\\h)$/i.test(line.trim())) return result("SHOW DATABASES; USE wordpress; SHOW TABLES; SELECT * FROM wp_users; SELECT COUNT(*) FROM wp_users; SELECT user_registered FROM wp_users; exit");
    if (/^\s*(ssh|cat|ls|pwd|cd|uname|ip|ss|netstat|grep|head|tail|wc|ps|systemctl|apache2|apache2ctl|mysql|clear|history)(?:\s|$)/i.test(line)) return result("Ini prompt MySQL, bukan shell Linux. Ketik exit untuk kembali ke Linux, lalu jalankan perintah tersebut. Query yang belum selesai tetap dapat dibatalkan dengan \\c.");
    state.sql += (state.sql ? " " : "")+line;
    if (!state.sql.trim().endsWith(";")) return result("Query belum selesai. Akhiri dengan ; lalu Enter, atau ketik \\c untuk membatalkan.");
    const statements = state.sql.split(";").filter(v=>v.trim()); state.sql="";
    return result(statements.map(sql=>{const output=runSql(state,sql);if(!output.startsWith("ERROR"))state.history.push(sql.trim()+";");return output;}).join("\n"));
  }
  if (!line.trim()) return result("");
  state.history.push(line);
  if (/^ssh\s+(?:-\w+\s+)*root@192\.168\.22\.7\s*$/.test(line.trim())) { state.pending="ssh"; return result("",{password:true,passwordPrompt:"root@192.168.22.7's password: "}); }
  if (/^(help|man)(\s|$)/.test(line)) return result("Warm Up · lingkungan investigasi simulasi\nLogin: ssh root@192.168.22.7 (password briefing)\nServer: ssh -V, pwd, cat /etc/os-release, uname -r, uname -m, ip a, ss -lntp, wc -l /etc/passwd\nWeb: systemctl status apache2, apache2 -v, apache2ctl -V, ls, cat, head, grep, wc\nDatabase: ps aux, mysql -V, mysql -u root -p\nSQL: SHOW DATABASES; USE wordpress; SHOW TABLES; SELECT * FROM wp_users;\nTab melengkapi perintah dan berkas; panah kiri/kanan mengedit. Password tidak ditampilkan.\nData direkonstruksi dari Warm Up.pdf; tidak ada koneksi jaringan nyata.");
  if (!state.connected) return result("Belum terhubung ke server latihan. Jalankan ssh root@192.168.22.7 dan gunakan password dari briefing.");
  if (/^\s*(SHOW|USE|SELECT|DESCRIBE|DESC)\b/i.test(line)) return result("Ini shell Linux. Untuk menjalankan SQL, masuk dahulu dengan mysql -u root -p, lalu masukkan password DB_PASSWORD dari /var/www/wordpress/wp-config.php. Query dijalankan setelah prompt mysql> muncul.");
  if (/^mysql(?:\s|$)/.test(line) && !/^mysql\s+(-V|--version)\s*$/.test(line)) {
    if (!/^mysql\s+-u\s*root\s+-p\s*$/.test(line.trim())) return result("Gunakan mysql -u root -p. Password diminta secara tersembunyi.");
    state.pending="mysql"; return result("",{password:true,passwordPrompt:"Enter password: "});
  }
  if (/^exit\s*$/.test(line)) { state.connected=false; state.cwd="/home/analyst"; state.env={...state.env,HOME:"/home/analyst",USER:"analyst"}; return result("Connection to 192.168.22.7 closed."); }
  const kernel="3.16.0-4-amd64";
  const listeners = [
    ["0.0.0.0:22","451/sshd"],["127.0.0.1:25","1383/master"],["127.0.0.1:12319","571/shellinaboxd"],["0.0.0.0:12320","572/stunnel4"],["0.0.0.0:12321","572/stunnel4"],["127.0.0.1:3306","1123/mysqld"],["127.0.0.1:10000","1192/perl"],["0.0.0.0:443","802/apache2"],["0.0.0.0:12322","802/apache2"],["0.0.0.0:80","802/apache2"],
  ];
  let output="",clear=false;
  const redirection=extractRedirection(line);
  for (const stage of splitPipeline(redirection?.command || line)) {
    const cmd=stage.trim();
    if (/^ssh\s+(-V|--version)$/.test(cmd)) output="OpenSSH_6.7p1 Debian-5+deb8u3, OpenSSL 1.0.1t 3 May 2016";
    else if (/^(ss|netstat)(\s|$)/.test(cmd)) output="State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\n"+listeners.map(([address,process])=>`LISTEN 0      128    ${address.padEnd(19)} *:*              ${process}`).join("\n");
    else if (/^(ip|ifconfig)(\s|$)/.test(cmd)) output="1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 192.168.22.7/24 brd 192.168.22.255 scope global eth0";
    else if (/^uname(\s|$)/.test(cmd)) output=cmd.includes("-r") ? kernel : cmd.includes("-m") ? "x86_64" : cmd.includes("-a") ? `Linux Cakgup ${kernel} #1 SMP Debian x86_64 GNU/Linux` : "Linux";
    else if (cmd === "whoami") output="root";
    else if (cmd === "id") output="uid=0(root) gid=0(root) groups=0(root)";
    else if (cmd === "hostname") output="Cakgup";
    else if (cmd === "hostnamectl") output=`Static hostname: Cakgup\nOperating System: Debian GNU/Linux 8 (jessie)\nKernel: Linux ${kernel}\nArchitecture: x86-64`;
    else if (cmd === "getent passwd") output=state.fs["/etc/passwd"].content || "";
    else if (/^journalctl\s+-u\s+(apache2|mysql)(?:\.service)?(?:\s+-n\s+\d+)?$/.test(cmd)) {const service=cmd.includes("apache2") ? "apache2" : "mysql";output=`Oct 18 08:00:00 Cakgup systemd[1]: Starting ${service}.service...\nOct 18 08:00:01 Cakgup systemd[1]: Started ${service}.service.\nOct 18 08:00:02 Cakgup ${service}[${service === "apache2" ? 802 : 1123}]: ready to serve requests (simulasi)`;}
    else if (/^(apache2|apache2ctl|apachectl)\s+-v$/.test(cmd)) output="Server version: Apache/2.4.10 (Debian)\nServer built: Feb 24 2017 18:40:28";
    else if (/^(apache2|apache2ctl|apachectl)\s+-V$/.test(cmd)) output='Server version: Apache/2.4.10 (Debian)\nServer MPM: prefork\n -D HTTPD_ROOT="/etc/apache2"\n -D SERVER_CONFIG_FILE="apache2.conf"';
    else if (/^systemctl\s+list-units\b/.test(cmd)) output="UNIT             LOAD   ACTIVE SUB     DESCRIPTION\nssh.service      loaded active running OpenBSD Secure Shell server\napache2.service  loaded active running Apache HTTP Server\nmysql.service    loaded active running MySQL Community Server\n3 loaded units listed.";
    else if (/^(systemctl\s+status|service)\s+(apache2|mysql)(?:\.service)?(?:\s+status)?$/.test(cmd)) { const name=cmd.includes("apache") ? "apache2" : "mysql"; output=`${name}.service - ${name === "apache2" ? "LSB: Apache2 web server" : "MySQL Community Server"}\n   Loaded: loaded (/etc/init.d/${name})\n   Active: active (running)`; }
    else if (/^mysql\s+(-V|--version)$/.test(cmd)) output="mysql  Ver 14.14 Distrib 5.5.54, for debian-linux-gnu (x86_64) using readline 6.3";
    else if (/^cd(?:\s+~)?$/.test(cmd)) { state.cwd="/root"; output=""; }
    else if (cmd.startsWith("cd ~/")) { const r=runStage(state,"cd /root/"+cmd.slice(5)); state={...state,...r.state};output=r.output; }
    else { const r=runStage(state,cmd,output);state={...state,...r.state};output=r.output;clear ||= !!r.clear; }
  }
  if(redirection)output=writeFile(state,redirection.file,output+(output && !output.endsWith("\n") ? "\n" : ""),redirection.append);
  return result(output,{clear});
}
export function completeWarmUp(state: WarmUpState, line: string) {
  if (state.mysql) {
    const words=["SHOW DATABASES;","SHOW TABLES;","USE wordpress;","SELECT * FROM wp_users;","SELECT COUNT(*) FROM wp_users;","SELECT user_registered FROM wp_users;","exit"];
    const matches=words.filter(word=>word.toLowerCase().startsWith(line.toLowerCase()));
    return matches.length === 1 ? matches[0] : line;
  }
  return completeTerminal(line,state.fs,state.cwd,state.connected ? "/root" : "/home/analyst",[...labCommands,"ssh","apache2","apache2ctl","systemctl","service","mysql","netstat","ifconfig","exit","journalctl","hostnamectl","getent"]);
}
