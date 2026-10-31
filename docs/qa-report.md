# MakanLens QA report: Phase 3 gate (2026-10-31)

**Status:** FAIL (automated gates pass; acceptance items open)

**Gates PASS:** build, lint, tsc, tests (43 pass; added `tests/targets.test.ts` and `tests/schemas.test.ts`). Secret grep on `.next/static` is empty. `.env*` is ignored and `.env.example` is not. Keys are read only in `lib/vision.ts`. No `any`. Dev server: missing key gives 500 `missing_api_key` plus a log line; barcode 200/404/400 as expected; all 6 pages 200 with the disclaimer.

**Not run:** real analyse call (no `.env.local` key).

## Failures
1. `LICENSE` missing. Owner: docs-writer (Phase 6). Add MIT.
2. `README.md` missing. Owner: docs-writer (Phase 6). Add setup steps.
3. `components/ItemCard.tsx:100-108`: source link is about 22 px tall. Owner: frontend-builder. Add `inline-flex min-h-11 items-center`.
4. `app/scan/page.tsx:3`, `app/history/page.tsx:3`, `app/settings/page.tsx:3`, `app/uncovered/page.tsx:3`: "coming soon" stubs. Owner: frontend-builder (Phase 4).

## Warnings (375 px)
- `components/ResultsCard.tsx:66-80`: the "Add to today" button may squeeze.
- `components/ResultsCard.tsx:48`: four slot buttons are tight.
- `app/onboarding/page.tsx:61-70`: three-column inputs; verify on device.
- `app/layout.tsx:36`: `overflow-x-hidden` masks overflow (Manager).

## Acceptance
- ✅ build, lint, tsc, test; missing-key handling; valid barcode (API); no key in bundle; disclaimer on all pages
- ⚠️ Needs key or manual check: chicken rice under 8 s, 2-item text parse, non-food message, onboarding to Today, slider/swap, reload persistence, 375 px layout
- ❌ `LICENSE`; README setup steps; unknown-barcode UI (`/scan` stub); tap targets (failure 3)
