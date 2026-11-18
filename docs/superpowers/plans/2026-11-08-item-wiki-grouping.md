# Group Item Variants

**Request:** Group otherwise identical item variants that differ in gender or element, ignore gender and add one Hệ column showing the number of possible elements.

**Implementation:** Parse Series and semantic identity from item templates. Group equipment using canonical name, slot, genre, level, rarity, category, neutral Kind (retaining function/build qualifiers), ClassName, descriptions, binding, requirements except sex/element and ExtParams. Retain all source records and IDs. Known faction/element parenthetical labels describe elemental variants; unrelated parenthetical functionality stays distinct. Consumables with different IDs remain distinct. Count distinct Series1–5; Series-1 permits all five; Series0 does not add an element. Grouping precedes searching and pagination; search checks every variant ID. UI adds only Hệ column and marks representative IDs, with all variant IDs/sources expandable.

- [x] Add grouping/search/identity/conservation regression tests; observe failures before implementation.
- [x] Add grouping metadata and API integration; count categories and pagination after grouping.
- [x] Add Hệ column, responsive layout and grouped totals; retain full ID search.
- [x] Independent review: caught build suffix2 incorrectly merging with original; preserve full neutral Kind and verify regression.
- [x] Final full tests, production build and HTTP verification.

**Verified:** 10,979 groups retain all20,516 source records and18,691 distinct IDs;50 tables. Full npm test57 pass/3 optional MySQL tests skipped. Production build passes. HTTP checks pass: grouped totals/category counts, final page220 with29 rows, exact and secondary-variant ID lookup, distinct system count, empty search,200-row cap, PNG response and cross-site rejection. Independent focused review found no remaining actionable issue.

**Browser limitation:** In-app navigation currently reports localhost connection refused despite successful direct HTTP requests. Chrome UI fallback is not approved; no permissions/settings are changed. Validate via full tests, HTTP and production compilation; do not claim fresh visual verification.
