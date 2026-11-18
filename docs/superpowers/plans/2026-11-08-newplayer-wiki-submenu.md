# New Player Wiki Submenu Implementation Plan

**Goal:** Add the updated Tân Thủ guide as a native admin page under Wiki, alongside Nâng Cấp.

**Architecture:** Keep the existing Next.js admin and its shared server-rendered shell. Use a native expandable Wiki navigation group with two child links and a static, accessible guide at `/wiki/tan-thu`. Preserve the upgrade page route and content.

**Tech Stack:** Next.js App Router, React, existing CSS. No new dependencies or hosting changes.

## Tasks

- [x] Add `/wiki/tan-thu` from the updated guide, with all eight remaining game menu options, contents, tables, startup steps and FAQ.
- [x] Convert the sidebar Wiki entry into a parent with Tân Thủ and Nâng Cấp children. Show the correct active child and breadcrumb.
- [x] Add responsive submenu and guide table styles and update the README.
- [x] Run the existing test suite, typecheck and production build. Check the page, navigation and narrow layout in the browser when available.

## Validation constraints

Do not change game logic, money values, other admin workflows or the existing upgrade guide. The guide must describe the corrected equipment guard and 10-vạn tooltip and must not offer the removed horse-skill function. Do not operate live game controls during browser verification.

## Verification results

- Typecheck and production build passed; both `/wiki/tan-thu` and `/wiki/nang-cap` are generated successfully.
- Existing suite: 44 passed, 1 MySQL integration test skipped by existing configuration. Initial sandbox junction failures passed when rerun outside the sandbox; no test changes were needed.
- Browser: verified native Wiki collapse/expand, navigation to both child pages, the active child and breadcrumb, all 11 contents targets and the 390px layout with no horizontal document overflow. No browser console errors observed.
- Reused the already running localhost:3000 admin. No live game controls operated; no server process restarted.
- Independent read-only review reported no critical or important findings.
- Screenshot saved under `.diagnostics/wiki-tan-thu/page.jpg` at the game workspace root. Existing upgrade guide content and game files were preserved during this task.
