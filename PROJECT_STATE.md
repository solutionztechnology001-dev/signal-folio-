# Signal Folio: Project State

**Version:** 0.4.0 (built on the original `signal-folio.zip` baseline; the later Replit version was not recovered)
**Status:** code complete for the scope below. Unit tests (58) and a headless-browser run of the real screens (42 checks) pass. Not yet through `next build`, lint, or a visual/mobile check (see TEST_RESULTS.md).

## What exists (by code inspection and unit tests)
| Area | State |
|---|---|
| Honesty pass | Simulated metrics, fake "Distributed successfully" flow, and auto-seeded sample data removed. Demo data is optional and labelled DEMO |
| Content portfolio | Create, edit, archive, restore, delete (archive-only when published), tags, search, validated .txt/.md import (500 KB) |
| Storage | Versioned envelope (schema v2), validation, quota-error handling, fail-closed behaviour on corrupt data |
| Legacy migration | Backup first, room check, fail closed, simulated metrics never carried over |
| Export / import | JSON backup, validated import, merge or replace |
| Distribution planner (manual) | Plan by platform, UTM link builder, copy post text and link, mark published (live URL required), mark failed, retry |
| Outcome log | Per published post; metric, number, currency, source kind (user-entered / estimated), required source description, accuracy note |
| Results | Sums of entered numbers by currency, per-post rows, outcome coverage, demo excluded by default |

## Not built (by decision)
Backend, accounts, automatic publishing, tracked redirect links, Signal Intelligence (AI recommendations), audience intelligence. See DECISION_LOG.md for the unlock rules.

## Open gates
- `npm install`, `npm run build`, `npm run lint`: NOT EXECUTED
- Visual layout / Tailwind styling and real-phone testing: NOT EXECUTED
- Component tests: none exist
- Pilot with real creators: not started

## Next action
Run install, build, lint and the tests on a real machine or Vercel, then fix whatever fails. Then click through the loop on a phone and a desktop browser.
