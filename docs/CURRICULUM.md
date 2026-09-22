# LinuxLab Cyber — Curriculum Map

## Pedagogy

The progression follows:

```text
Learn → Practice → Apply → Investigate → Respond
```

The first eight rooms teach Linux without requiring cybersecurity knowledge. Defender rooms then reuse those exact command skills in security contexts rather than introducing an unrelated toolset.

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

## Path 2 — Linux for Cybersecurity

| Room | Applied scenario |
|---|---|
| Permissions & Hardening | World-readable application secret |
| Log Investigation | SSH brute-force evidence and IOC filtering |
| SUID Hunting | Custom privileged binary exposure |
| Process Response | Suspicious CPU-heavy process containment |
| Network Triage | Unexpected listener on port 4444 |
| Persistence Hunting | Cron persistence and hidden `/tmp` payload |

## Path 3 — Incident Response

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
- systemd and service analysis
- journald
- SSH configuration and keys
- Linux capabilities
- sudo policy review
- archive/hash/evidence-preservation commands
- filesystem timeline concepts
- Bash variables and scripting
- real sandbox rooms for advanced topics
