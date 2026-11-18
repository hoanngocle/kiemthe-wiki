# Activity Wiki refresh

**Goal:** Update `/wiki/hoat-dong` to match current game code and shorten player guidance.

**Scope:** The 13 activities exposed by `Server/gameserver/script/tranphai/sukien1.lua`. Preserve search, category filtering, schedule overview and navigation. Do not change game logic or start events.

**Approach:** Audit the three existing event JSON files independently. Keep schedules, entry requirements, main steps, rewards and actionable limits visible. Remove audit disclaimers, implementation status banners and the redundant footer; collapse detailed timings/mechanics and source references. Keep uncertainties only where they affect participation or rewards.

- [x] Verify and rewrite competition, instance and daily event data against current Lua/configuration, with valid source anchors.
- [x] Simplify the page and its headings; preserve mobile layout and empty/search/reset behavior.
- [x] Review the combined data and source anchors; run lint, typecheck and existing tests. Verify browser search/category/navigation, disclosures and mobile layout.

Validation note: Source verification establishes configured behavior, not a live playtest. Existing unrelated test failures must be reported separately.

Result: 13 activities and 148 valid nonblank source anchors. Manual Loạn Chiến and Hoa Sơn, current solo instance entry, rewards, title bonuses, fees and limits were checked against current code. Independent UI/source spot review found no important issues. Browser verified no-accent search, category filtering, empty/reset behavior, anchors, details and all 13 cards; mobile page width equals viewport width (375px).

Checks: focused ESLint and project TypeScript passed. Existing suite: 105 passed, 3 skipped, 4 failed outside this change: two log-root junction tests lack symlink permission; shop catalog expects 870 instead of current 878; legacy Windows launch probe timed out. No game code was modified or events started.
