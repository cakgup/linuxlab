# LinuxLab Cyber — Test Results

## Release 0.2 core validation

The TypeScript-only core was compiled with strict checks and exercised against an end-to-end command recipe for every room.

Result:

```text
PASS basic-navigation 5 tasks
PASS basic-files 5 tasks
PASS basic-reading 4 tasks
PASS basic-search 4 tasks
PASS basic-permissions 4 tasks
PASS basic-processes 3 tasks
PASS basic-streams 4 tasks
PASS basic-identity 4 tasks
PASS permissions-hardening 3 tasks
PASS log-investigation 3 tasks
PASS suid-hunting 3 tasks
PASS process-response 3 tasks
PASS network-triage 3 tasks
PASS persistence-hunting 4 tasks
PASS incident-capstone 6 tasks
TOTAL 15 rooms / 58 tasks / failures=0
```

Additional targeted assertions covered:

- `chmod +x` transforms mode `0644` to `0755`;
- `>` creates/overwrites redirected output;
- `>>` appends redirected output;
- `ps aux | grep 31337` preserves the suspicious process in pipeline output.

## Build note

A full `npm install`/Next.js production build could not be completed in the artifact-generation environment because the npm registry request timed out. The app dependencies are declared in `package.json`; run the following in a network-enabled environment:

```bash
npm install
npm run build
```

The core files (`types.ts`, `fs.ts`, `shell.ts`, `validator.ts`, and `tracks.ts`) passed strict TypeScript compilation independently of the unavailable web dependencies.
