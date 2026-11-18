# Admin MySQL environment migration

**Goal:** Move the admin's MySQL connection settings to `admin/.env` and delete `Sever/Paysys`, as requested.

**Architecture:** Both account operations and character lookup use a shared, validated server-side environment configuration (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Character lookup continues reading its schema name from Goddess. Next.js loads `.env`; standalone database tests use the same Next.js environment loader. Preserve the current connection values and never print credentials.

**Tech Stack:** Next.js 16, TypeScript, mysql2, Node test runner.

## Task: Migrate configuration and remove the obsolete directory

- [x] Add and run failing tests for environment configuration, including empty passwords, punctuation, missing fields and invalid ports.
- [x] Add the shared reader; update both database consumers, database integration tests, safe error messages, README and `.env.example`.
- [x] Transfer existing credentials directly to ignored `.env` without displaying them; verify the same values are loaded by Next.js.
- [x] Run tests, lint, typecheck, build and real database checks against temporary tables; confirm account and character reads succeed.
- [x] Check the resolved `Sever/Paysys` deletion target, delete it, and verify database reads still succeed and no active source references remain.

Execution: inline in the existing admin checkout, preserving existing unrelated edits. No commits or changes to game services.

Verified: 62/62 tests pass with real MySQL enabled, lint/typecheck/production build pass. After deletion, live GET `/api/accounts` and `/api/topups` both return HTTP 200 (3 accounts, 11 characters). The existing development server reloaded the changes without a restart. `.env` is ignored; `.env.example` is shareable. Sandbox permission errors were resolved by rerunning the checks outside the sandbox.
