# Item acquisition follow-up

User request: remove the highlighted tooltip ID, kind, explanatory +0 paragraph and MagicLevel labels; replace the table's statistics/purpose column with acquisition, NPC/map and reputation requirements.

- [x] Preserve stat values in hover only; hide all highlighted metadata, including MagicLevel in unknown-range fallback text.
- [x] Build per-code acquisition index from shop goods/reputation XML, NPC scripts, NPC map placements, equipment refining and verified weapon chest menus.
- [x] Match the selected variant's element and code; update both sources and tooltip when switching variants, including resetting to the initial profile.
- [x] Keep all six Siêu Thần reputation prerequisites and explicit source facts in template descriptions. Unknown acquisition stays unknown.
- [x] Confirm actual chest membership before advertising weapon outputs; reviewer found two unavailable Hạo Thiên templates, covered by a failing regression then corrected.
- [x] Verify Chrome table and tooltip for 2,1,12084,10 and Siêu Thần 4,3,1800,10. Cách nhận shows Quan Ưng Phi/Quan Phi Phi in Giang Tân Thôn and Phượng Tường Phủ. Highlighted tooltip fields absent; actual stats and wear requirements retained.

Validation: 24 focused Wiki tests passed; production build, TypeScript and focused ESLint passed. Full suite: 150 tests, 145 passed, 3 optional DB tests skipped, same 2 existing data failures: missing skill 1788 icon in faction-wiki.test.ts; MagicLevel16 vs expected18 in weapon-stats.test.ts. No game data changed. Source routes with no confirmed acquisition use an explicit unknown state instead of invented locations.
