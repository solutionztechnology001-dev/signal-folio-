# Signal Folio: Architecture (v0.4)

Client-only Next.js 15 (App Router), React 19, TypeScript, Tailwind. No server code. All state lives in `localStorage` under `signal-folio:v2`.

## Layers
- `src/lib/types.ts`: data model (ContentItem, Distribution, OutcomeLog, StoreData).
- `src/lib/store-core.ts`: validation, legacy migration, load/save with quota handling, export/import. Takes a storage object, so it is tested without a browser.
- `src/lib/ops.ts`: every data change as a pure function returning `{ok, data}` or `{ok:false, error}`. All business rules live here (archive-not-delete, source required, no orphans).
- `src/lib/analytics.ts`: sums of entered numbers. No estimation.
- `src/lib/utm.ts`, `validation.ts`, `platforms.ts`, `demo.ts`, `id.ts`: small pure helpers.
- `src/lib/useFolio.ts`: the only React hook that touches storage; blocks writes when data is corrupt or storage is unavailable.
- `src/components/`: screens and modals. They call `folio.run(fn)` and show any error.

## Data model
ContentItem 1..n Distribution 1..n OutcomeLog. Outcomes only exist for published distributions. Missing outcomes are missing rows, never zeros. Every outcome has a source kind and a source description.

## Moving to a backend later
IDs are stable strings and relationships are explicit foreign keys, so the three lists map to three tables. Replace the storage object in `useFolio` with an adapter, add a user id and row-level security, and upload an exported JSON file as the one-time import. Not built.
