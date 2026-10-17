# Laser VM parity audit

Verified on 2026-10-17 against the user-authorized original VM at
`192.168.56.104`, using SSH and explicitly approved read-only `su`/`sudo`
inspection. Copying challenge files, flags, and the training credentials in
GoldenTiket.txt was separately authorized. No challenge files or VM
configuration were changed. Interactive audit shells had history saving disabled
before closing; normal SSH/sudo authentication logging remains an OS behavior.

## Verified environment

| Item | Original VM |
| --- | --- |
| OS | Ubuntu 16.04.4 LTS (Xenial Xerus) |
| Kernel / architecture | 4.4.0-116-generic, i686 |
| Hostname | Laser |
| Python | `python`: 2.7.12; `python3`: 3.5.2 |
| GnuPG | 1.4.20 |
| Accounts | level0–level30, UID/GID 1001–1031; laser UID/GID 1000 |
| Home directories | `/home/levelN`, permission 0700 |
| `su levelN` | Requests target account password and retains current directory |
| `su - levelN` | Opens target account's home directory |
| level30 sudo | Requests current account password; `(ALL : ALL) ALL` |
| level12 flag | Owner/group level12, mode 0000 |
| level30 flag | Owner/group root, mode 0400 |

## Captured source and Cakgup adaptation

The source capture contains **160 nodes: 122 files and 38 directories**. A later user request rebrands every flag from the source prefix to **Cakgup{...}**, including encoded and binary artifacts. Shipped files are now deliberate derivatives, not byte-identical copies of the original VM. Original and adapted SHA-256 values are recorded in `docs/LASER_FLAG_ADAPTATIONS.json`. Contents,
byte lengths, owner/group, permissions, modification timestamps, and SHA-256
were captured directly. Each of the 122 shipped files is checked against its
adapted SHA-256 in `npm run test:laser`. MD5, SHA-1, SHA-256, and SHA-512 for
unchanged file instances are computed from the adapted bytes. Levels24–27 use updated target hashes that match the rebranded content. The owner/group distractors and timestamps in levels 7 and 8 are original.

Large files are retained losslessly as nine gzip assets (about 6 MB compressed),
including the 39,794,311-byte level10 log and its distinct backups. The browser
loads each asset only when a command needs its contents, decompresses it, and
verifies SHA-256 before use. Small files are included directly in the fixture.

The original ZIP and TAR/XZ contents were inspected locally without extracting
on the VM. RAR contents were checked using `unrar p` (stdout only). The HTTP flag
was verified with `curl http://localhost/flag.txt` on the VM. The copied GPG
challenge was decrypted locally with passphrase `12345678`. Python bytecode and
ELF originals are retained as data; the app models their training outputs.

## Scope and deliberate limits

This remains a **static browser simulator**, not Ubuntu, Bash, an SSH bridge, or
a bit-for-bit VM clone. Challenge file data is derived from the verified capture and rebranded as requested; arbitrary Linux
commands, packages, processes, networking, execution of native binaries, full
paging behavior, and PAM/sudo internals are not reproduced. Ordinary shell
startup files, histories, SSH/GPG keys, caches, and unrelated system logs were
excluded from the capture. The filesystem view therefore contains the training
files rather than every file installed in the VM.

Plain `su` now preserves the filesystem session and current directory. The next
account may initially see `Permission denied` in the previous account's 0700
home; `cd`, `cd /home/levelN`, or login-style `su - levelN` fixes that exactly as
in the original account flow. Root and level30 sudo are modeled explicitly;
sudo authentication is cached for five minutes in memory. Password input is
neither echoed nor saved to command history or localStorage.

Very large terminal output is shortened for browser responsiveness; use `head`,
`tail`, or `grep` to inspect it. This affects rendering only: the command engine
uses the complete original file. Archives, GPG, interpreter execution, and HTTP
are modeled; the browser never executes VM binaries or contacts its private IP.

## Reproduction and checks

`scripts/audit-laser-vm.py` is a read-only remote exporter for the explicitly
authorized challenge scope. It emits a compressed JSON envelope to stdout and
does not write files on the VM. Local capture tooling, host keys and temporary
dependencies stay under ignored `tmp/`; credentials are not included in tracked
audit scripts. `scripts/import-laser-vm.py` generates the committed fixture and
assets from that local capture and checks source SHA-256 values again.

Run `npm run test:laser`, `npm run test:core`, `npm run build`, and
`npm run test:export`. Laser tests also cover permission denial, all walkthroughs,
password authentication, retained working directories, `su -`, sudo, root,
checksums and byte-for-byte integrity of every captured challenge file.

## Artifact rebuilding checks

`scripts/laser_artifacts.py` transforms plain flags, flag-bearing filenames, Base64 and Python 2 bytecode constants, rebuilds ZIP and TAR/XZ entries, creates a stored RAR5 archive with valid header/data CRCs, rebuilds an equivalent Linux i386 ELF flag printer, and re-encrypts the GPG payload with the existing passphrase. The old source capture remains only in ignored local audit inputs. Unreferenced original gzip assets are removed from the shipped directory.

`python3 scripts/check-laser-artifacts.py` scans every shipped payload for the old prefix, inspects encoded bytecode and ELF structure, extracts ZIP/TAR entries, validates RAR5 checksums, and actually decrypts GPG to verify Cakgup output. If 7-Zip is installed, it independently extracts the rebuilt RAR too. The GPG tool must be installed locally; the artifact builder supports a `GPG_BINARY` override.
