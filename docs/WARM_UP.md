# CTF Warm Up

Route: `/ctf/warm-up/`. Catalog: `/ctf/arena/`.

The source is the four-page **Warm Up.pdf** supplied by the user. No service mentioned in that document is contacted. The server, SSH authentication, Apache files, logs, and MySQL monitor are reconstructed training fixtures, not a copy of a live VM.

## Coverage

- Server profile: 10 questions covering SSH login, OpenSSH 6.7p1, root home, Debian GNU/Linux 8 (jessie), kernel 3.16.0-4-amd64, x86_64, eth0, listening TCP ports, and 29 system accounts.
- Webserver profile: 11 questions covering Apache 2.4.10, configuration paths, virtual host includes, available/enabled sites, WordPress DocumentRoot, log paths, the first visitor IP, and its 1452 requests.
- Database profile: 9 questions covering MySQL, client version, port, authentication, four databases, WordPress user table, one application user, and registration timestamp.

SSH uses the user-corrected training credentials: root / `admin1234!`. MySQL uses root / `Admin1234!.`. The SSH password ends with ! and has no final period. The MySQL password retains its final period. Both passwords are case-sensitive, hidden in terminal input, and not added to shell history. MySQL credentials are discoverable in the simulated WordPress configuration. The SSH and database password questions require a successful respective login.

## Clarifications from the source

- The PDF calls 14.14 the MySQL version. Its screenshot shows **client Ver 14.14** and **Distrib/server 5.5.54**. The challenge explicitly asks for the client version; the SQL monitor reports the server version.
- The answer gives ten listening ports while a screenshot includes an IPv4/IPv6 duplicate socket. The challenge asks for distinct TCP port numbers. Its fixture has one listener row for each of the ten distinct ports.
- Access log bodies were not supplied as separate evidence. The reconstructed log contains 1452 rows for the first IP, 192.168.56.101, and three rows for another IP so filtering is necessary. Individual URLs, timestamps, and user agents are synthetic.
- The `/etc/passwd` fixture has 29 reconstructed accounts. It is not represented as a byte-for-byte original account database.
- Other Apache configuration details are kept only where needed to support the PDF's questions. No original host secrets, web content, or application database were collected.

## Interaction and progress

Thirty questions in three groups unlock sequentially within Warm Up. Each question includes a learning objective, answer format, two levels of hints, copyable command steps, and an explanation after success. Correct answers stay visible for reflection; the participant explicitly selects the next question. Wrong attempts do not reduce points. Each answer earns 50 points once, for a maximum of 1500. Completion displays `Cakgup{warm_up_tuntas}`. Answers and passwords are not persisted; only validated question indices are stored under `linuxlab-warm-up-progress-v1`. The shell starts fresh on reload. A live session banner explains whether the participant is at the workstation, entering a password, in a Linux shell, in the MySQL monitor, or completing a multiline query. It offers the necessary login or USE wordpress command when resuming. Reset clears Warm Up only.

The MySQL monitor supports the investigative read queries shown in the source, multiline statements, `USE`, `SHOW DATABASES`, `SHOW TABLES`, `SELECT`, `exit`, and `\c`. SQL runs inside the browser simulation. Linux commands typed in the MySQL monitor are rejected with recovery instructions without contaminating the SQL buffer. SQL typed in a Linux shell explains how to enter MySQL. Missing semicolons, missing database selection, and query cancellation receive explicit guidance. DESCRIBE wp_users and SELECT DATABASE() are also supported. Other LinuxLab terminals share the same cursor editor and completion UI.

CTF access has **no material prerequisites**. The separate Materi Linux menu retains the original guided lesson sequence. No CTF progress is required to access another CTF.

## Verification

`npm run test:warm-up` checks all 30 source answers against expected values, evidence commands, both authentication flows, exact log/account/port counts, SQL queries and multiline sessions, completion, immutable input state, and malformed progress. The test also executes every teaching command across all 30 questions in order and verifies recovery guidance and cancellation. Core, terminal, Laser, build, and export checks remain applicable.
