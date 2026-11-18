# Wiki Nâng Cấp Implementation Plan

**Goal:** Add the 20 upgrade menus shown in the supplied screenshots to the existing game administration site, with concrete steps, recipes, source evidence and honest functionality assessments.

**Architecture:** `/wiki/nang-cap` reuses `AdminShell`. Checked-in audit JSON holds Vietnamese content; a small client component provides accent-insensitive search, status filtering and expandable recipes. This is a read-only reference, with no upgrade or game mutation actions.

**Tech Stack:** Existing Next.js 16, React 19 and CSS variables; no new dependencies.

**Scope confirmed:** The user selected integration in the existing administration site. Keep the current checkout and preserve all existing uncommitted work. No game Lua changes, server restarts, account changes or automatic commits.

## Tasks

- [x] Audit every menu and reachable submenu against the actual Lua callbacks, inventory checks, consumption and rewards. Distinguish implemented code, defects and unavailable evidence; compiled Lua is not a missing script.
- [x] Add typed data and accent-insensitive search/status filtering. Keep the original menu order and source file/line references.
- [x] Add the Wiki navigation item and responsive reference page using the existing cream/green design. Show all 20 menus, a summary and clear code-audit versus live-test scope.
- [x] Verify content completeness and cited paths/lines, existing tests, lint, typecheck, production build and browser behavior where available.

## Review focus

- Vietnamese searches without accents, including đ, should find the intended menu and ingredients.
- Filters and empty results must leave search and reset controls accessible.
- Probabilities and per-tier costs must use executed checks/consumption rather than misleading dialog text.
- Repeated Lua methods/classes and compiled files must not be mislabeled as missing or successfully tested.
- Long recipes/source paths and mobile navigation must remain readable without horizontal page overflow.

## Progress

- Source dispatcher matched exactly to all 20 screenshot menus; three independent documentation audits completed: 273 recipes/branches, 18 menus with issues or warnings, 2 with implemented primary flows.
- Decision: implement the page locally with no new packages, using audited documentation as the data source. The existing app already defines its platform and visual design.
- Verification: 40 tests pass, 1 MySQL integration test skipped by configuration. Wiki lint, full-project lint and project typecheck pass. Production build passes after preserving the stale Turbopack cache under `.next/cache/turbopack-wiki-backup-20261108` and rebuilding. The concurrently edited top-up page initially failed lint; its author corrected it, and the final broad lint run passed. No changes made to that feature by this task.
- Browser: page loads on the existing localhost:3000 dev server; no-accent `duc lai` finds Đúc Lại Chỉ Số Vũ Khí, `kinh mach` finds relevant Kinh Mạch and Bảo Châu content; implemented filter finds Pháp Sư and Phù Thủy; unmatched search and reset work. At 390px viewport, all 20 menus and all navigation links fit without document overflow.
- Independent read-only review found no Critical/Important issue. Minor equipment prose spacing corrected. Runtime game success, engine behavior and load precedence remain explicitly unverified. No game modifications, database writes, server restarts or commits.
