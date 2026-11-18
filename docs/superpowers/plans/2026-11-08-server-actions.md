# Server actions implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Remove the server list column heading and add Restart and Tắt alongside each server's Bật button.

**Architecture:** Extend the existing serialized manager with start/stop/restart actions. Resolve the selected configured server by full executable path, stop only matching Windows PIDs, verify exit before restart, and report progress/errors through the existing job/events API.

**Tech Stack:** Existing Next.js, TypeScript, Node built-ins and Windows PowerShell. No dependencies.

**Spec:** User requested removal of THỨ TỰ / SERVER, TRẠNG THÁI, THAO TÁC and per-server restart/stop buttons.

## Global Constraints
- Preserve the existing eight start targets and full startup sequence.
- Stop/restart target one configured server only. Never accept client-provided PID/path or kill by image name.
- Hold one operation lock across stop plus restart; check executable exists before stopping for a restart.
- Prefer closing a main window; otherwise terminate that process. Verify the held process handle/path before acting and verify exit.
- Keep the cream palette and font sizes; make the three row actions fit at narrow widths.
- Do not stop/restart the user's game servers for validation; use fake runtime and a disposable Node child.

## Review Focus
- A same-name process in another installation must not be affected.
- Duplicate aliases within this installation must not survive a restart and cause duplicates.
- A failed stop must prevent relaunch and release the operation lock.
- Missing executable must fail before stopping an existing process.
- User must see operation-specific progress and errors.

## Tasks
- [x] 1. Add failing manager tests for targeted stop/restart, duplicates, lock, failed stop and missing binary; implement manager and Windows stop adapter.
- [x] 2. Extend API action validation, update buttons/status/progress, remove heading and adapt responsive layout.
- [x] 3. Run tests (including a disposable Windows process), lint/build/typecheck, independent review and browser verification; reload the admin without touching game processes.

## Execution notes
- Work directly in existing admin folder; user explicitly requested these changes. No Git repository/worktree is available.
- Full test suite: 25 passing, including verified PID/path termination of a disposable Node process and refusal to stop a mismatched executable path.
- Independent review found no actionable correctness/security defects. README was updated to describe the new controls and termination behavior.
- Lint and typecheck pass. Sandbox build encountered EPERM on the existing .next cache directory; building outside the sandbox succeeded without warnings.
- Live API rejected unknown action and stop-all requests with 400. Browser verified no column-heading row, eight groups of three buttons, correct enabled states and no horizontal overflow.
- Admin reloaded at http://127.0.0.1:3000. Game servers were not stopped or restarted during validation.
