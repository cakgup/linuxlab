# LinuxLab Cyber — Roadmap

## Phase 1 — Browser simulator foundation (implemented)

- xterm browser terminal
- virtual Linux filesystem
- controlled shell interpreter
- beginner Linux command curriculum
- pipes and output redirection
- permissions and SUID simulation
- process and network simulation
- state/history validators
- XP, progress, prerequisites, locked rooms
- milestone badges
- responsive learning dashboard

## Phase 2 — Expand Linux fundamentals

Candidate rooms:

- archives: `tar`, `gzip`, `zip`
- hashes and evidence integrity: `sha256sum`
- environment variables
- Bash variables and quoting
- loops and simple shell scripts
- package-management concepts
- filesystem layout (`/etc`, `/var`, `/proc`, `/tmp`, `/opt`)
- service-management concepts

## Phase 3 — Deeper defender curriculum

### Linux Defender

- SSH configuration and key review
- journald/systemd service triage
- web-server log analysis
- account and group audit
- sudo policy review
- Linux capabilities
- suspicious startup/service persistence
- evidence preservation
- incident timeline building

### SOC Analyst

- authentication log correlation
- IOC search across multiple logs
- suspicious process triage
- network listener correlation
- persistence hunt
- case-note generation

### Privilege and hardening labs

Use only in isolated training environments:

- SUID/SGID review
- unsafe sudo policy
- writable service files
- cron misconfiguration
- PATH issues
- capabilities and namespaces concepts

## Phase 4 — Platform services

- authentication
- learner profiles
- PostgreSQL/Supabase progress
- resume-last-room
- streaks and achievements
- admin content authoring
- content versioning
- cohort/class dashboards
- attempt/hint analytics

## Phase 5 — Real ephemeral Linux sandbox

Introduce real containers or microVMs behind a session gateway only after isolation controls are in place:

- session TTL and cleanup
- strong resource quotas
- egress controls
- abuse monitoring
- golden-image versioning
- deterministic environment reset
- no privileged containers
- no host socket exposure
- server-side objective validation

## Phase 6 — Academy / organization edition

- teams and classes
- instructor dashboard
- assignments and deadlines
- SSO
- private organizational rooms
- progress export
- certification exams
- auditable assessment records
