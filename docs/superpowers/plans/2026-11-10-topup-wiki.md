# Top-up Wiki implementation plan

User requests adding the applied reward changes to Wiki. Implement inline in
the current admin checkout; preserve unrelated and concurrent game changes.

## Design

- Add Wiki → Mốc Nạp at `/wiki/moc-nap`, matching existing Wiki components/styles.
- Read all active rewards from the existing milestone parser on every request.
- Read title names/descriptions from the current title XML by actual grant IDs;
  current files have 16 titles ending at Chung Mạt Giả, not the earlier preview.
- Document the seven material choices, four equipment stages, bag requirements,
  cumulative one-time claiming, coin queue, and continuing partial redemptions.
- No game reward or title changes. No hardcoded old sponsor/Hoàng Đế table.

## Steps

- [x] Add meaningful failing data tests for actual 29 tiers, 93 credits,
  XML-resolved titles, live source updates and helper-defined redemption choices.
- [x] Implement focused server data reader, Wiki page and navigation entry.
- [x] Run data tests, targeted lint, production build and live read-only page check.

Full admin suite has an independently known unrelated shop-count assertion;
do not change shop data or game scripts as part of this content task.

## Verification

- Four new data tests and three existing Wiki-search tests pass; targeted lint passes.
- Production build passes with `/wiki/moc-nap` as a dynamic server-rendered route.
- Independent read-only review found no actionable issues.
- Live HTTP 200 contains 29 tier rows, current title names, 930,000 materials,
  the seven material choices and the exchange instructions. Old Hoang De wording
  is absent. The Mốc Nạp navigation entry is present and active.
- Existing dev admin process cached its old shared navigation after the build.
  Verified its exact parent/child executable paths and an idle launcher, then
  restarted only the Next.js admin in the same mode on port 3000. Game processes
  were not restarted. Live page verification then passed including navigation.
- Evidence: `.diagnostics/topup-wiki/verification.json` at the game workspace root.
