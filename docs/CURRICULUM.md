# LinuxLab Cyber — Curriculum Map

## Pedagogy

The progression follows:

```text
Learn → Practice → Apply → Investigate → Respond
```

The curriculum contains **39 rooms, 154 tasks, five paths, and 88 command-reference entries**. Fourteen basic rooms teach Linux without requiring cybersecurity knowledge. Eight administration rooms develop the server investigation skills used in Warm Up, before six security rooms, ten digital-forensics rooms, and one incident-response capstone. Each room includes command explanations, syntax, examples, contextual tasks, and hints. `/materi/perintah/` provides searchable references by command, purpose, and category.

CTF remains a separate menu. No material completion is required to enter any CTF arena.

## Path 1 — Linux Basics

| Room | Core skills | Security relevance later |
|---|---|---|
| Navigation Essentials | `pwd`, `ls -la`, `cd`, `..`, `~` | Navigate evidence paths and hidden artifacts |
| Files & Directories | `mkdir`, `touch`, `cp`, `mv`, `rm` | Working copies, quarantine, evidence handling |
| Reading Text Files | `cat`, `head`, `tail`, `less` | Inspect logs and configuration |
| Search & Filtering | `grep`, `grep -n`, `find -name` | IOC hunting and artifact discovery |
| Linux Permissions | rwx, `chmod +x`, octal modes, `stat` | Hardening and privilege review |
| Processes & PIDs | `ps`, `ps aux`, pipe to `grep` | Malware/process triage |
| Pipes & Redirection | `|`, `>`, `>>`, `tee` | Compose investigations and record findings |
| Users & System Context | `whoami`, `id`, `groups`, `hostname`, `uname`, `history` | Privilege and host-context assessment |
| Help & Program Discovery | `help`, `man`, `type`, `which`, `file` | Recognize tools before executing them |
| Text Processing | `sort`, `uniq -c`, `cut`, `tr`, `sed`, `awk` | Aggregate logs and select relevant fields |
| Links & Discovery | `find -type`, `ln -s`, `readlink`, `file` | Distinguish references from copies |
| Archives & Compression | `tar`, `gzip`, `gunzip`, plus ZIP reference | Inspect contents and restore files |
| Capacity & Resources | `df`, `du`, `free`, `lsblk` | Distinguish filesystem capacity, directory size, and memory |
| Shell Environment & Time | `env`, `printenv`, `export`, `date`, `uptime` | Record case context and interpret host state |

## Path 2 — Linux Administration

All eight modules use the same Debian/Apache/MySQL simulation and evidence as CTF Warm Up. SSH is practiced in the first module with password `admin1234!` (no period). Later modules begin authenticated on the server to avoid repeating a prerequisite. MySQL authentication is still performed explicitly; its password is read from application configuration and differs from SSH.

| Module | Core skills | Warm Up coverage |
|---|---|---|
| SSH Access | `ssh`, hidden password input, `whoami`, `id`, `cd`, `pwd`, `ssh -V` | Login, SSH version, root home |
| System Profile | `/etc/os-release`, `uname`, `hostnamectl`, `getent`, `wc` | OS, version, kernel, architecture, Linux account count |
| Services & Journal | `systemctl`, `journalctl`, `ps`, `grep` | Web and database service identification |
| Network Interfaces & Listeners | `ip`, `ss`, `grep`, `wc` | Ethernet name, unique listener ports, MySQL port |
| Apache & Virtual Hosts | `apache2 -v`, `apache2ctl -V`, config include, available/enabled sites | Apache version, HTTPD_ROOT, include, sites, DocumentRoot |
| Web Access Logs | `head`, `grep`, `awk`, `sort`, `uniq -c`, redirection | Log directory/file, first visitor, exact access count |
| MySQL Access | `mysql -V`, `wp-config.php`, hidden password, `SHOW DATABASES;` | Client version, DB credentials, database count |
| WordPress Queries | `USE`, `SHOW TABLES`, `DESCRIBE`, `SELECT`, `COUNT(*)` | Application database, user table/count, registration time |

Linux commands run at the shell prompt; SQL runs at `mysql>`. Missing database selection, wrong passwords, unfinished SQL, and cancellation provide recovery instructions. Passwords never enter command history. Only successful SQL statements count toward query tasks.

## Path 3 — Linux for Cybersecurity

| Room | Applied scenario |
|---|---|
| Permissions & Hardening | World-readable application secret |
| Log Investigation | SSH brute-force evidence and IOC filtering |
| SUID Hunting | Custom privileged binary exposure |
| Process Response | Suspicious CPU-heavy process containment |
| Network Triage | Unexpected listener on port 4444 |
| Persistence Hunting | Cron persistence and hidden `/tmp` payload |

## Path 4 — Digital Forensics

Ten modules and 40 tasks cover all nine Jejak Digital stages (including the Stage 6 bonus). Topics include source preservation and SHA-256, PGP/email headers, JSON/CSV correlation, offline PCAP, Windows endpoint exports, PDF integrity and steganography, memory triage and UTF-16LE encoded commands, static ELF analysis, SQLite/browser history, encrypted archives/DOCX, and UTC timelines with evidence-based reporting. Each module has substantive concept notes, command reference, four validated tasks, and recovery hints.

The public guide at `/materi/jejak-digital/` maps every stage to its modules and links official documentation. See [detailed coverage and simulation limits](JEJAK_DIGITAL_COVERAGE.md). Advanced binary formats/tools are explicitly modeled on synthetic evidence. `memory` is a browser teaching helper, not a Linux command or Volatility implementation. No actual CTF answer or private evidence is included in the teaching fixtures.

## Path 5 — Incident Response

The capstone requires the learner to combine multiple skills rather than follow one command family:

1. orient to the incident briefing;
2. confirm attacker activity in authentication logs;
3. correlate the suspicious network listener;
4. harden exposed credentials;
5. contain the known malicious process; and
6. record a completion marker.

## Milestones

- **Linux Fundamentals** — complete Linux Basics
- **Linux Defender** — complete Linux for Cybersecurity
- **Linux Incident Responder** — complete the capstone

## Future curriculum candidates

- package management
- SSH configuration and keys
- Linux capabilities
- sudo policy review
- filesystem timeline concepts
- Bash expansion, loops, and scripting
- real sandbox rooms for advanced topics

## Validation and simulation scope

`npm run test:core` executes the full 39-room prerequisite sequence and completes all 154 tasks, with additional output checks for text processing, symbolic links, ZIP/gzip round trips, environment isolation, server log aggregation, password rejection, and SQL context. Existing CTF and terminal suites run separately.

Browser verification on 18 October 2026 also completed all 22 basic/administration modules (89 tasks), including the 14 newly added modules, through actual terminal input. SSH and MySQL hidden password prompts, the Linux-to-SQL prompt transition, stored progress, prerequisite unlocking, log report generation, and final WordPress queries succeeded. Search and category filtering on the command reference page were verified separately.

The shell implements the options taught here, rather than a complete POSIX environment. Capacity/process/service figures are fixtures. Basic lesson archives are modeled in memory, with extraction boundary checks; they are not downloadable binary archives. This differs from the valid downloadable artifacts in CTF Linux. No command executes on the learner's operating system or connects to a real server.

`npm run test:forensics` validates all 40 new tasks, independent SHA-256 vectors against Node crypto, source preservation, incorrect key/password/filter rejection, UTF-16LE decoding, query context, archive recovery, task references, Tab completion, and mapping of all nine stages.
