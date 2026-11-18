# Database Backup Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Database export/import for all five schemas in one compressed package.

**Architecture:** A tested package/job module coordinates capture, safety backup and restoration. A server adapter runs installed MySQL tools without shell interpolation. Local-only route handlers expose polled jobs and downloads; a client page presents two actions.

**Tech Stack:** Next.js 16, TypeScript, mysql2, Node zlib/child_process/fs.

**Spec:** ../specs/2026-11-09-database-backup-design.md

## Global Constraints

Exactly the five schemas in the spec. No new dependencies. No live restore during development. Preserve existing working-tree changes. Reuse current checkout.

## Review Focus

Malformed/missing/duplicate schemas must fail before writes. Interrupted capture must not restore anything. Mid-import failure must retain a complete safety backup and report completed schemas. Concurrent jobs/server startup must be blocked. MySQL credentials must never appear in command arguments or client errors.

### Task 1: Package and job orchestration

Files: lib/database-backup.ts, tests/database-backup.test.ts.

Interfaces: DATABASES, encodeBackup/decodeBackup, DatabaseBackupManager with startExport/startImport/snapshot/download; runtime callbacks for capture, restore, save, maintenance.

- [x] Write and run failing tests for binary-safe package round-trip, malformed/corrupt packages, complete capture before restore, partial failure and concurrency.
- [x] Implement gzip manifest validation and polled job state. Run focused tests.

### Task 2: MySQL adapter and maintenance lock

Files: lib/database-service.ts, lib/server-manager.ts, tests/server-manager.test.ts.

Interfaces: singleton databaseManager; ServerManager.withMaintenance(callback).

- [x] Test stopped-server requirement, mutual exclusion and release after failure.
- [x] Implement client discovery, read-locked dumps, bounded child IO, safety backup persistence and sequential restore with raw SQL piped to mysql.
- [x] Run focused tests and typecheck.

### Task 3: API, menu and page

Files: app/api/database/route.ts, app/database/page.tsx, app/database/database.css, app/components/admin-shell.tsx, README.md, .env.example, .gitignore.

- [x] Add localhost-only job/status/download APIs, bounded uploads, explicit import confirmation.
- [x] Add Database menu with export/import cards, file selection, confirmation, progress, per-schema results and safety backup location.
- [x] Run full npm tests, lint, typecheck and production build; review changes and document limitations.

## Execution ledger

Ruling: Execute inline in the existing checkout, as the user has approved the concrete proposal and the worktree has existing uncommitted application work. Avoid extra approval rounds and preserve that work.

Validation: 29 focused tests pass. Actual localhost export succeeded in 1.2 seconds: all 5 schemas, 122 CREATE TABLE definitions, checksum/package validated. Modern mysql8 read-only SELECT VERSION() succeeds against server5.5.41. Browser confirms Database navigation and both controls. No live import attempted. Production build passed. Full suite outside sandbox:88 passed,3 skipped,1 unrelated shop-wiki assertion fails (878 current products vs870 expected); no shop code changed. Independent review found3 issues, all fixed and re-reviewed: client packet limits plus preflight, saved-login isolation, bounded global read-lock acquisition. Final lint/build rerun follows final changes.
