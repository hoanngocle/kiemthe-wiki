# Unified item wiki

User request: merge weapon/equipment sections into Items, group them and add filters, then remove the separate sections.

- [x] Classify each template variant by item group, slot, family/set, element, wear level and quality; apply intersecting filters to the same variant before search/pagination.
- [x] Reuse weapon, equipment and special-equipment data in one catalog. Preserve acquisition, refining and upgrade routes without adding duplicate catalog rows.
- [x] Add group navigation and dependent filters to Items; persist filters in URLs, retain tooltip and Cách nhận, fold guides/upgrade instructions into the unified page.
- [x] Remove weapon/equipment sidebar entries and standalone catalog views; redirect old URLs and preserve detailed weapon comparison under Items.
- [x] Verify regressions, full tests, lint/typecheck, build, browser filters and HTTP redirects. Preserve unrelated workspace edits.

## Validation

- New group/filter regressions cover companion weapons, same-variant intersection, random elements, nonmutation, grouped facet counts, source-specific SuiteIDs9/12 on the same GDPL, quality8, weapon/special-equipment enrichment, forward upgrades and old query translation.
- Full suite:156 tests;151 passed,3 optional DB tests skipped, same2 existing failures (`faction-wiki.test.ts`: missing icon1788; `weapon-stats.test.ts`: current MagicLevel16 vs expected18). Build, TypeScript and changed-file ESLint passed.
- Independent review found SuiteID overwrite across sources, lost nonstandard qualities and missing catalog anchor. Exact-row classification/quality regressions reproduced the first two; both corrected. Catalog anchor restored.
- Chrome verified legacy weapon/gear/detail redirects, retained URL filters, group navigation, slot/family/quality filtering, expanded mask upgrade route, moved detailed comparison and return link, no old sidebar entries, no browser warnings/errors.
- Existing readers remain data providers; retired catalog pages are redirect-only. Special-equipment instructions are carried into acquisition/upgrade routes; weapon route guide and cosmetic refining reference remain collapsed on Items.
