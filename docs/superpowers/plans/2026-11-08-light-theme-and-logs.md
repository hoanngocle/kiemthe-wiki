# Light theme and logs implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline in the existing admin folder.

**Goal:** Apply the user's exact copy removals, switch the admin to a light theme, and add a Log menu displaying both launcher activity and real server log files.

**Architecture:** Share the sidebar/topbar between the existing launcher and a new /logs page. A local read-only /api/logs endpoint lists configured log folders and reads a bounded tail of the selected file. Launcher history comes from the existing singleton, without requiring a Windows CIM query.

**Tech Stack:** Existing Next.js, TypeScript, CSS, Node filesystem, node:test. No new dependencies.

**Spec:** User confirmed light background and both log types in this chat. Remove the old page heading/subtitle, launcher description and LOCAL badge; replace the launcher slogan with “Máy chủ Kiếm Thế.”.

## Global Constraints
- Keep the eight-server startup behavior unchanged.
- Read logs only from goddess/logs, logserver/Logs, bishop/logs, gamecenter/log, gameserver/log and ErrLog under Sever.
- Reject traversal, unsupported extensions and symlinks leading outside permitted log directories.
- Limit file discovery and tail reads; display empty/missing-file states without inventing logs.
- Do not modify/delete log files or start game servers during validation.

## Review Focus
- Log requests cannot read game configuration or other files outside allowed directories.
- Empty folders, file rotation/deletion, very large files and legacy encodings are handled.
- Switching files cannot display a stale response under the new filename.
- Both menu pages have consistent light styling at desktop/mobile sizes.
- Only the admin process belonging to this task may be restarted for the rebuilt preview.

## Tasks
- [x] 1. Add failing file-reader tests for allowlisted discovery, traversal, symlink escape, bounded tail, UTF-16 and missing files; implement lib/log-files.ts.
- [x] 2. Share local-request validation, expose launcher activity, add GET /api/logs, shared navigation and /logs UI.
- [x] 3. Apply copy changes and light theme across both pages, update README.
- [x] 4. Run full tests, lint, build/typecheck, HTTP checks, browser desktop checks and inspect responsive CSS; rebuild and refresh the local admin.

## Execution notes
- The directory is not a Git repository. The user requested direct implementation; no worktree or additional approval is needed.
- Independent review identified two issues, both fixed: reject redirected source roots (including junctions within Sever), and preserve admin events when game-log reads fail. Regression tests reproduced both before fixes.
- Full suite: 17 passing tests outside sandbox. The junction cases require normal Windows filesystem permissions; inside the sandbox junction creation returns EPERM.
- Production build succeeds without warnings. Runtime log directories are excluded from Turbopack asset tracing.
- Live API found 8 log files; traversal rejected with 400; cross-origin rejected with 403; missing file returns a recoverable message and preserves admin events.
- Browser verified light home page, exact text removals, Log menu, server file selection/reselection, real log contents and admin log tab. Responsive CSS was inspected; browser viewport was left unchanged.
- Rebuilt admin is running at http://127.0.0.1:3000. No game server was started, stopped, or reconfigured during this change.
