# Pro Bash Baseline Coverage

This document records the Linux-fundamentals baseline used when expanding LinuxLab Cyber. The goal is not to clone Pro Bash's UI or content verbatim; it is to ensure the same foundational command skills are explicitly practiced before cybersecurity scenarios begin.

## 12 baseline exercises mapped into LinuxLab

| # | Baseline area | Skill | LinuxLab room | LinuxLab task / treatment | Status |
|---:|---|---|---|---|---|
| 1 | Navigation | `pwd` | Navigation Essentials | Find your bearings | Covered |
| 2 | Navigation | `ls -la` | Navigation Essentials | List everything | Covered |
| 3 | Navigation | `cd ..` | Navigation Essentials | Move to the parent | Covered |
| 4 | Files | `mkdir` | Files & Directories | Create a workspace | Covered |
| 5 | Files | `touch` | Files & Directories | Create case notes | Covered |
| 6 | Files | `cp` | Files & Directories | Copy reference material | Covered |
| 7 | Files | `mv` | Files & Directories | Rename the notes file | Covered |
| 8 | Files | `rm` | Files & Directories | Remove the disposable copy | Covered |
| 9 | Search | `grep` / line-oriented search | Search & Filtering | Find errors + grep with line numbers | Covered |
| 10 | Search | `find -name` | Search & Filtering | Find a script + wildcard log search | Covered |
| 11 | Permissions | `chmod +x` | Linux Permissions | Make deploy.sh executable | Covered |
| 12 | Processes | `ps aux` | Processes & PIDs | Expand the view | Covered |

## LinuxLab extensions beyond that baseline

LinuxLab adds fundamentals that are especially useful before cybersecurity work:

- `cd ~` and absolute vs relative paths;
- `cat`, `head`, `tail`, and `less`;
- wildcard file searches;
- numeric permission modes and `stat`;
- pipelines with `|`;
- output redirection with `>` and `>>`;
- `tee`;
- `whoami`, `id`, `groups`, `hostname`, `uname -a`, and `history`.

These skills are then reused in applied rooms rather than taught again from scratch.

## Progression

```text
12-command baseline
        +
LinuxLab foundation extensions
        ↓
Linux Fundamentals badge
        ↓
Permissions hardening
Log investigation
SUID hunting
Process response
Network triage
Persistence hunting
        ↓
Linux Defender badge
        ↓
Incident Response Capstone
```
