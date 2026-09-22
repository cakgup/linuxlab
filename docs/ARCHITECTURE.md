# LinuxLab Cyber — Architecture

## 1. Product model

LinuxLab Cyber separates **curriculum**, **simulated host state**, **shell behavior**, and **validation**. This lets the browser simulator remain safe while preserving a migration path to real isolated Linux environments later.

```text
Curriculum / prerequisites
          │
          ▼
Room UI ─ Terminal renderer
          │
          ▼
Controlled shell engine
          │
    ┌─────┼──────────┐
    ▼     ▼          ▼
Virtual  Fake       Fake
FS       processes  network
    └─────┼──────────┘
          ▼
       Validator
          │
          ▼
 XP / badges / progress
```

## 2. Learning model

`lib/tracks.ts` defines three ordered learning paths:

1. Linux Basics
2. Linux for Cybersecurity
3. Incident Response

Each room can declare `prerequisites`. The dashboard uses these prerequisites to display locked rooms, and `RoomClient` checks them again if a learner navigates directly to a room URL.

Progress is currently stored in browser `localStorage`. That is suitable for a self-paced simulator, but not for high-integrity exams or certification.

## 3. Terminal and shell

`BrowserTerminal.tsx` uses xterm only for terminal rendering and input. xterm is **not Bash**.

Commands are passed to `lib/shell.ts`, which implements a controlled subset including:

- navigation and paths;
- file operations;
- reading/searching text;
- symbolic and numeric permissions;
- process/network inspection;
- simple pipelines;
- output redirection;
- `tee`.

No arbitrary terminal input is forwarded to the application server.

## 4. Virtual host

`lib/fs.ts` creates the deterministic training host. It includes beginner files as well as cyber evidence such as:

```text
/home/analyst/training/
/var/log/auth.log
/srv/app/.env
/usr/local/bin/backup-helper
/etc/cron.d/system-update
/tmp/.cache/.sync-agent
/opt/incident/briefing.txt
```

A lab reset recreates this initial state.

## 5. Validators

`lib/validator.ts` supports state-based and history-based checks:

```text
all / any composite checks
command-ran
cwd
file-exists
file-not-exists
file-mode
file-content-contains
history-contains
process-killed
```

State-based checks are preferred where the security outcome matters. For example, hardening `/srv/app/.env` validates mode `0640`, not one exact command string.

## 6. Trust model

### Browser simulator

Learner-controlled browser state is not authoritative. XP and completion can be modified by the learner through developer tools, so this mode is educational rather than certification-grade.

### Production learning platform

When adding accounts, leaderboards, assessments, certificates, or organization reporting, move authoritative progress and validation to a backend.

## 7. Future real-sandbox architecture

```text
Browser xterm
    │ WebSocket
    ▼
Session Gateway
    │
    ├── authentication / authorization
    ├── rate limiting
    ├── session TTL
    └── audit events
          │
          ▼
Sandbox Orchestrator
          │
          ├── ephemeral environment A
          ├── ephemeral environment B
          └── ephemeral environment C
```

Minimum controls:

- short maximum session lifetime;
- non-root learner by default;
- CPU, memory, process and storage limits;
- disposable writable layer;
- network deny-by-default;
- no host filesystem mounts;
- no Docker socket;
- no cloud metadata access;
- no reusable credentials;
- deterministic resets;
- server-side validators for scored tasks.
