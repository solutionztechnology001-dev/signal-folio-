# Signal Folio: Decision Log

## Carried over from the council process (Phases 0 to 5)
- Original zip is the working baseline. Replit version unrecovered.
- Honesty first: no fabricated metrics, no false publish messages.
- Local-first (localStorage) now. Backend, auth, automatic publishing and tracked redirects are LATER with numeric unlock rules:
  - Supabase DB: 3 or more users report multi-device data loss and the build gate is closed (review 2026-11-20)
  - Tracked redirects: manual outcome completeness under 40% and a real conversion source exists (review 2026-12-04)
  - Dev.to / Hashnode publishing: 5 or more manual publishes and 3 or more users name copy-paste as the top friction (review 2026-11-20)
- Content with a published distribution is archive-only. Unpublished content can be deleted after confirmation.
- No auto-seeded sample content. Optional demo data, permanently labelled DEMO.
- Legacy migration: backup first, fail closed, never promote simulated metrics to outcomes.
- UTM helper is part of the manual planner and never claims to measure anything.

## Decisions made while building v0.4
| # | Decision | Reason |
|---|---|---|
| 1 | Founder chose the affiliate/creator measurement product as the first to build to deployable | Better business case than the parked AI-publishing concept |
| 2 | Scope widened from EP-1 (honesty + portfolio) to the full manual loop: planner, UTM, outcome log, results | A pilot needs the whole loop to produce evidence. Everything else from the exclusion list stays out |
| 3 | Unit tests use Node's built-in test runner instead of Vitest | No new dependencies, and they could be executed in the build environment. Component tests are not written |
| 4 | Distribution statuses are planned / published / failed ("prepared" dropped) | Nobody tracks "prepared"; extra states add confusion |
| 5 | Source kind "measured" exists in the schema but cannot be created | Reserved for a verified integration. The app measures nothing today |
| 6 | Every outcome requires a source description | Keeps each number traceable |
| 7 | Legacy `sample-*` items are dropped on migration (counted and reported), not converted to DEMO | They were seeded fakes, not user content. The original is kept in the old-data backup |
| 8 | Legacy statuses ("Distributed", "High Performing") become draft | They proved nothing about publication |
| 9 | ESLint pinned to ^8.57.1 with `.eslintrc.json` | The zip had no ESLint config, and `next lint` would prompt interactively. UNVERIFIED until lint is run |
| 10 | Security headers added in next.config.ts (nosniff, frame deny, referrer, permissions policy) | Cheap hardening. No CSP yet |
| 11 | Published distributions can be changed back to planned only when no results are recorded | Prevents orphaned or contradictory data |
| 12 | Multiple currencies are never summed together | Avoids a meaningless total |

## Open decisions
- Primary commercial metric (wait for the pilot).
- Whether to add a Content-Security-Policy (needs testing against Next.js inline scripts).
- Lockfile: none exists yet. Run `npm install` and commit `package-lock.json`.
