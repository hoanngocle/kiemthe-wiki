# Wiki Hoạt Động implementation plan

User request: create the activity Wiki in the existing admin, explaining the mechanisms of all14 screenshot events. Follow the established Wiki navigation, cream/green styles and searchable source-backed reference layout. No event code fixes, runtime event execution, database edits or server restarts are part of this request.

- [x] Trace `script/tranphai/sukien1.lua` to all14 event implementations, shared schedules, actual conditions and reward tables. Decode compiled Lua when needed; label any remaining uncertainty.
- [x] Save three independent read-only audits with exact source paths and physical line anchors. Separate menu introductions, configured schedules and operational warnings.
- [x] Add `/wiki/hoat-dong`, a Wiki submenu item, schedule overview, search/category filters and detailed entry/steps/mechanics/rewards/limits for every event.
- [x] Validate all14 events/schema/source anchors, inspect selected facts, run lint/typecheck/build and existing tests, then verify browser search/filter/layout.

Data: `docs/wiki-events-{instances,competition,daily}.json`. UI: `app/wiki/hoat-dong`. Types/search: `lib/activity-wiki.ts`. Independent event audit workers own only their JSON and optional diagnostic disassembly files. Root owns UI/navigation/integration. Preserve existing uncommitted work.

Verification scope: static source/configuration audit. Schedules use the game server's local clock. Presence of code or a menu does not establish that an event is currently running or that a legacy dated event opens automatically.

Result:14 events,51 mechanism sections,52 reward sections,205 valid source references. All14 have specific source discrepancies/conditions, labeled 'Có điểm cần kiểm tra' rather than asserted broken or live-tested. Independent review corrected one Important Vận Tiêu implementation-selection claim and one minor return-award timing claim. No game logic changed.

Validation: full lint, project typecheck and production build pass.49 existing tests pass;2 integration tests skip by configuration. Browser confirms14 cards/overview rows, active Wiki menu item, no-accent phrase search 'hoa son' finds only Hoa Sơn, category 'che-tao' returns Trồng Cây and Làm Bánh, empty/reset works. At390px, page width375px without overflow and schedule table scrolls within its own region. Screenshot saved in task visualization output.
