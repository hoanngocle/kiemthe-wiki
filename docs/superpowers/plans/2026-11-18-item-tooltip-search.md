# Item tooltip and search implementation plan

> Execute inline using the current checkout, preserving the existing uncommitted project.

**Goal:** Wiki shows template attributes and MagicLevel ranges, exposes full hover data per variant, groups duplicate names, and finds names and codes reliably.

**Architecture:** Read template stats with the existing weapon stat parser and one magic lookup per table. Preserve variant profiles while grouping names. Return selected profile plus variant choices; show the same profile in the row and hover card.

**Tech stack:** Existing Next.js, React, TypeScript, Node test runner; no dependencies.

**Spec:** User request in this chat: show meaningful item stats as tooltips, ranges when no concrete roll exists, remove repetition, search names and codes.

- [x] Add regressions for canonical grouping, original variant names, wrapped/full/partial numeric codes and ranking; observe failures, fix parser/group/search, run item tests.
- [x] Add real-catalog regressions for fixed and MagicLevel attributes, missing ranges, medicine and exact variant selection; observe failures, preserve tooltip profiles and serialize them.
- [x] Add hover/focus/click card and variant selector, with readable responsive styles and full descriptions; verify production build and Chrome desktop behavior.
- [x] Run full test suite, typecheck and focused lint. Review changed files and report results without committing unrelated user work.

Review focus: do not conflate same-name variant stats; retain every ID/source; distinguish missing roll data from zero; preserve Vietnamese aliases; prevent numeric description matches from polluting code searches. Conditional strengthening bonuses must retain unlock levels.

## Verification

- Item tests: 21 passed. Production build, TypeScript and lint on changed TS/TSX files passed.
- Full suite outside Windows sandbox: 147 tests, 142 passed, 3 optional DB tests skipped, 2 existing data failures: `faction-wiki.test.ts` missing icon for skill 1788 Hàn Băng Kiếm Quyết; `weapon-stats.test.ts` expects MagicLevel 18 while current template 2,1,12084,10 declares 16. No game data changed to satisfy stale expectations.
- Catalog: 21,280 source rows retained in 6,802 groups, 19,360 distinct GDPL codes, zero codes repeated across groups. Default 50-row payload reduced from 2.4 MB of full profiles to about 294 KB through lazy variant details.
- Chrome: copied Lua code search, accent-free original female name, duplicate horse code, riding attributes, switching elemental/build variants, refresh resetting to searched template, full tooltip with requirements and enhancement milestones verified.
- Independent review found missing riding attributes and stale refresh state; both reproduced and corrected. Horse regression RED→GREEN; refresh reproduced in Chrome before correction and verified after.
- Final direct browser console check showed no warnings/errors.
