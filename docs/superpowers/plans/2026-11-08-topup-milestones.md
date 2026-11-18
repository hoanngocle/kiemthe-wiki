# Top-up totals and milestones implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline in the current shared admin checkout. The user requests immediate implementation; preserve unrelated edits.

**Goal:** Show the selected character's lifetime web top-up total and all active reward tiers on /topup, and fix the 25-million game threshold.

**Design:** Sum the complete persisted receipt journal per character before limiting visible history to20. Read the active NPC reward menu and its grant statements to return29 tiers with exact quantities from executable code; hide commented-out tiers. The page shows web-qualified status, next target and expandable complete gifts. Web totals explicitly exclude old GM/manual grants and do not imply in-game claim status. No new service, database changes, or live character grants.

**Tech stack:** Existing Next.js, TypeScript/React, local Lua script and receipt files.

## Global constraints

- Existing single-character dropdown controls the totals and reward progress.
- Existing local-only API, top-up behavior and manual reward claiming stay in place.
- Preserve the 25-million claim flag/group and reward contents; only change250000 K to25000 K.
- All receipt history contributes to totals; other characters never contribute.
- Use actual grant quantities, including repeated experience calls, and exclude commented code and SetCurTitle duplicates.

## Review focus

- Totals still correct after more than20 receipts.
- Switching characters resets qualified states and next-target calculation.
- Exactly25000 K grants the 25-million tier once;24999 K does not.
- The UI must never label a qualified tier as already claimed.
- Catalog includes all active gifts and excludes inactive32–50-million options.

### Task1: Data and game regression

- [x] Add failing TypeScript tests for all-history isolated totals and actual-script reward extraction, including25-million and repeated experience sums.
- [x] Add a Lua regression exercising24999/25000 K and repeat-claim behavior.
- [x] Implement lib/topup-milestones.ts, shared types, full-history API totals and catalog; fix game threshold.
- [x] Run TypeScript and Lua checks.

### Task2: Page and verification

- [x] Add total, reached-count, next-tier progress, and29-row expandable reward table following the selected character.
- [x] Document totals' web-only scope and in-game claiming.
- [x] Run full tests, lint, typecheck, build, HTTP/browser checks and targeted review without creating real credits.

## Progress

- Design grounded in the user's request and existing flow. Continue inline, no extra approval needed.
- Task1 complete: 4 new TypeScript tests pass; all 5 Lua tests pass. The new Lua regression failed before the fix at exactly25000K, then passed with the original3087/1 claim flag and unchanged reward contents.
- Task2 complete: full suite44 passed /1 skipped; lint, typecheck and production build passed. The sandbox build hit Windows EPERM while creating a prerender folder; running the same build outside the sandbox passed.
- HTTP GET200 returns11 characters,29 tiers, corrected25000K tier and no250000K tier. Live receipt count remains0: no real credits were created during checks.
- Browser verified selected-character total/name switching, all29 rows, expandable100K/25-million rewards and missing-amount badges. Preview: ../../../../../../.diagnostics/topup-milestones-preview.jpg.
- Targeted independent review: no actionable findings.
