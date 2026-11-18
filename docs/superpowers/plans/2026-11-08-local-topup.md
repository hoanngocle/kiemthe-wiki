# Local top-up implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, as the user requested immediate implementation in the existing admin checkout.

**Goal:** Add a local top-up page with a character dropdown; each top-up credits exactly one character's pending Đồng and existing milestone rewards.

**Architecture / design:** Read character identities from Goddess using raw account/name bytes. Persist local simulated top-ups and publish a cumulative ASCII file per identity under gameserver/local-topup. The existing activity NPC reads the selected character's file, applies only the unconsumed delta to tasks 3060/1 and 3090/1, and tracks consumption in 7049/1 (reserved in server/client task_def). Keep the existing Đồng withdrawal and manual milestone claim menus.

**Tech Stack:** Existing Next.js/React/TypeScript, mysql2, filesystem, game Lua. No new service or payment provider.

**Spec:** User request in this chat: implement now in the existing admin, simple, one character per top-up with a dropdown.

## Global constraints

- Work in the existing checkout; preserve all existing uncommitted work.
- Localhost only. Simulated money. Packages 50/100/300/500/1000 K, 1K = 100,000 Đồng.
- Web receipt means queued, not delivered. Character claims inside the game.
- Preserve game source encoding; no game server restart, process control or real reward grant during checks.
- Durable request IDs prevent retry duplication; cumulative files prevent repeat NPC claims.

## Review focus

- Wrong character / names with non-ASCII bytes: use account+name hex throughout.
- Retry after response or projection write loss: persist request IDs and repair projection on retry.
- Concurrent submissions: serialize the journal update in this single-instance admin.
- Damaged journal or malformed bridge data: reject rather than resetting credits.
- Existing money and task integer limits: cap total local credits and check withdrawal capacity before consuming.

### Task 1: Durable queue and game bridge

**Files:** lib/local-topup.ts, lib/topup-database.ts, lib/accounts.ts, tests/local-topup.test.ts, tests/local-topup-lua.test.py; ../gameserver/script/npc/local_topup.lua and tuiguangyuan.lua.

**Interfaces:** Character {id, name, account}; queueTopup(root, character, {requestId, characterId, amountK}) -> receipt; readTopups(root) -> receipts; LocalTopup:Sync(player) applies the unpublished difference.

- [x] Write failing tests for validation, concurrent writes, retry, changed retry parameters, isolation, disk failure recovery, Lua repeat claims, invalid files, overflow and old-source integration.
- [x] Implement queue, configured Goddess read, and NPC bridge.
- [x] Run TypeScript and Lua tests; inspect raw character identifiers against the configured database when available.

### Task 2: Admin page, API and verification

**Files:** app/topup/page.tsx, app/api/topups/route.ts, app/components/admin-shell.tsx, app/globals.css, README.md, .gitignore.

**Interfaces:** GET /api/topups -> characters + recent queued receipts; POST /api/topups accepts one characterId, amountK and durable requestId.

- [x] Add local-only route, dropdown, package selection, amount preview, retry-safe submission and queued history in existing styling.
- [x] Document entering the activity NPC to receive Đồng and claim milestones; distinguish lifetime accumulation from weekly rewards.
- [x] Run npm test, Lua tests, npm run lint, npm run typecheck, npm run build and HTTP/UI smoke checks without granting live rewards.

## Progress

- Design accepted through the user's request to implement the proposed approach immediately. No extra confirmation needed.
- Pre-flight: Task 2 consumes the queue and character interfaces defined in Task 1.
- Task 1 complete: 7 new TypeScript tests and 4 Lua integration tests pass. Live read finds 11 characters. Reuse Paysys login because the configured Goddess password differs; do not change game configuration.
- Task 2 complete: full suite 40 passed / 1 skipped, lint and typecheck passed, default npm run build passed. API GET 200 with 11 characters / 0 receipts; invalid package400, missing character404, foreign origin403. Browser dropdown/300K preview checked; no live top-up was issued.
- Review: reviewer caught reserved pet task3091; moved marker to7049/1 and reserved its task_def label on both client/server. Reproduced the collision with existing pet progress77, then all Lua tests pass with pet progress preserved.
- Build ruling: persisted Turbopack cache had a canceled source-map task. Preserved it under .next/cache/turbopack-local-topup-backup; a fresh default build succeeds.
