# Windows server launcher implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the existing admin folder.

**Goal:** Replace OpenGame.exe with a local Next.js page that launches Goddess, LogServer, Bishop, GameCenter and GS1–GS4 on this Windows machine.

**Architecture:** A local Node.js Route Handler starts only the eight configured executables. A server-side manager serializes startup and reads Windows process paths for status and duplicate prevention. The Vietnamese UI polls status while a startup job runs.

**Tech Stack:** Existing Next.js/React/TypeScript; Node built-ins; PowerShell CIM; node:test. No new dependencies.

**Spec:** The user's approved approach in this chat: work directly in Sever/admin, run on the current Windows machine, launch eight servers instead of OpenGame.exe.

## Global Constraints
- Exactly eight launch targets, in start.bat order; wait 10 seconds between new launches.
- Resolve paths relative to Sever/admin, with each executable's containing folder as cwd.
- Detect alternate executable names already running in the same server folder.
- A running process is not a guarantee of game/database readiness.
- Bind the app to 127.0.0.1. Accept only same-origin requests and configured server IDs.
- Do not edit game settings, install dependencies or add stop/restart features.

## Review Focus
- Two simultaneous start requests must not create duplicate processes.
- Missing executable or unreadable Windows process inventory must fail before launching.
- A different installation with the same process name must not count as this server.
- A process that exits during startup must report failure and stop the sequence.
- Closing/reopening the page must retain job progress while Node stays running.

## Tasks
- [x] 1. Write and run failing manager tests: ordered launches, aliases, path isolation, lock, missing file, inventory failure, early process exit and invalid ID.
- [x] 2. Implement typed manager in lib/server-manager.ts and Windows adapter in lib/windows-runtime.ts; run tests.
- [x] 3. Implement GET/POST app/api/servers/route.ts with local/same-origin validation and background startup status.
- [x] 4. Replace app/page.tsx, app/layout.tsx and app/globals.css with a responsive Vietnamese launcher; simplify next.config.ts and use local fonts.
- [x] 5. Add README and a Windows start-admin.cmd; verify tests, lint, typecheck, production build, live GET and rejected POST requests, and rendered UI.

## Execution notes
- Existing directory is not a Git repository, so use it directly without worktree or commits.
- User explicitly requested implementation now; proceed inline without further design/plan approval.
- Integration checks must avoid launching game servers merely to validate the web app. Real game readiness depends on existing databases and Paysys.
- Removed unused Tailwind CSS loader/import after reproducing a Turbopack subprocess failure. Native CSS compiles successfully without this pipeline.
- Read-only independent review completed. Fixed skipped-server monitoring with a failing regression test followed by a passing 9-test suite.
- Production HTTP checks: page 200, Windows inventory 200 (8 existing files, all stopped), arbitrary target 400, cross-origin POST 403. Browser screenshot verified hydrated server list and enabled start buttons.
- Temporary test web servers were stopped after verification. Verified the final start-admin.cmd entrypoint and left the production admin available at http://127.0.0.1:3000. No game executables were launched.
- Final checks: npm test 9/9; npm run lint exit 0; npm run typecheck exit 0; npm run build exit 0. Local GET confirmed all eight executable files exist.
