# Signal Folio: Test Results

**Date:** 2026-11-09 (build session). Environment: Linux sandbox, Node v22.23.4, no network.

## Executed
| Check | Command | Result |
|---|---|---|
| Unit tests (58) | `npm test` (node:test with TypeScript type stripping) | **58 passed, 0 failed** |
| Test sensitivity (mutation checks) | Temporarily broke 6 safety behaviours and re-ran | 5 of 6 caught. The 6th (blocking "measured" source) was an equivalent change because a second check also rejects it |
| Library type check | `tsc --strict` on `src/lib/*.ts` | No errors |
| Whole-project type check | `tsc` on all `src/**/*.ts(x)` using **stand-in type shims** for React, lucide-react and Next | No errors. This is NOT the real type check, because the real React and Next types were not installed |
| Leftover simulation scan | grep for Math.random, SAMPLE_CONTENT, "Distributed successfully" | Only the ID fallback (not a metric) and one code comment |

| Browser run of the real screens (42 checks) | Bundled the actual React components with esbuild and drove them in headless Chromium (Playwright) against real localStorage. Ran 3 times | **42 passed, 0 failed, all 3 runs**, no console errors or warnings |

## What the 42 browser checks cover
Fresh start has no fake numbers; add content (and validation errors); plan a distribution with a UTM link; invalid and valid published links; missing-source rejection; results totals, currency, coverage and the user-entered disclaimer; delete blocked for published content; archive and restore; JSON export content; persistence after reload; import merge with no duplicates; foreign JSON rejected; demo data hidden from results unless ticked; legacy upgrade (notice, real article kept as draft, sample removed, no fake numbers, original and backup both kept); corrupt data leaves storage untouched and disables saving; storage-full warning appears; page renders at 390px wide.

**Limits of this browser run:** icons were replaced with plain stand-ins, Tailwind CSS was not applied (so layout, spacing and the mobile/desktop breakpoints were NOT visually checked), and it ran through esbuild, not `next build`.

## What the 58 tests cover
Storage envelope round trip; corrupt data not overwritten; unavailable storage; quota errors on save; legacy migration (content kept, simulated metrics dropped, samples dropped, duplicates re-id'd); migration fails closed when the backup or new data cannot be written; export/import round trip; merge never overwrites; replace; import rejection cases; delete vs archive policy; no orphaned records; distribution and outcome rules; demo isolation; UTM building; file import limits (500 KB, .txt/.md only); analytics (zero data, currency separation, coverage, source counts, demo excluded).

## NOT EXECUTED
- `npm install` (no network in the build sandbox)
- `npm run build` (`next build`)
- `npm run lint` (`next lint`), including whether the new ESLint setup works
- Real `npm run typecheck` with the actual React/Next types
- Visual layout and styling (Tailwind CSS was not applied in the browser run)
- Mobile layout on a real phone; the clipboard "Copy" buttons; the file picker on a real device
- Running the built app (`next start` or a Vercel deployment)
- Component or end-to-end tests (none written)
- Accessibility checks
- Any real-user testing

## Known risks until the above is run
- A `next build` or real-type error that neither the shim type check nor the esbuild bundle would show.
- `.ts` extensions in imports between files in `src/lib` depend on `allowImportingTsExtensions` working with Next's bundler.
- localStorage behaviour on real browsers and private modes.
