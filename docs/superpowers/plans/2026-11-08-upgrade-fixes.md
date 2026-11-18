# Upgrade fixes implementation plan

User authorization: fix the 18 upgrade menus identified by the Wiki, then update each status. Preserve valid prices and probabilities; correct inconsistent checks, item outputs, callbacks and tier chains. Use current checkout; no live player/database edits or server restarts.

- [x] Back up modified game files, preserve the original audit and reproduce defects with the actual Lua 5.1 runtime and engine-boundary fixtures.
- [x] Repair weapon/mount/mask flows, inventory validation, preview lifecycle and metadata preservation.
- [x] Repair four equipment progression menus and shared checked spending/output helpers.
- [x] Repair seven skill/Pháp Bảo menus, separate state and resolve class/effect collisions.
- [x] Repair pet/companion/badge flows and synchronize changed client/server definitions.
- [x] Run all Lua behavior suites and syntax/config checks; independently review changes.
- [x] Update all Wiki recipes, source anchors, status and verification scope; run admin tests/lint/build and inspect UI.

Decisions: in-place equipment Regenerate preserves the existing item and its enhancement data where supported by the existing game API. Do not infer two independent skill levels from one ambiguous legacy task. No claim of live-game success from mocked engine boundaries. Legacy inventory API compensation is checked but cannot promise database-level atomicity.

Independent review: fixed two Important findings (AddStackItem numeric-return staging mismatch, temporary preview conversion into permanent rewards) and one Minor expiry-seconds defect. Tests reproduced all three before correction. No deferred review finding. Final Lua suites: root49, equipment27 groups, skills61 groups, companion1135 assertions, syntax61 files; all pass. Final validation and rollout limits recorded in docs/upgrade-fixes.md.

Final admin verification: production build including TypeScript passes, full lint passes,44 tests pass and1 MySQL integration test skips by configuration. Browser confirms20 fixed menus,273 recipes,0 entries in the unresolved-issues filter; search and reset work.217 cited locations validate. Runtime deployment and live-character testing remain explicitly unperformed; no server restart, database write or automatic commit.
