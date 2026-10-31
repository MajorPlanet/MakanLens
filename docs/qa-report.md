# MakanLens QA report: Phase 5 full QA (2026-10-31)

**Status:** FAIL (gates green; 2 defects to fix; real vision path untested, no `.env.local` key)

## Gates
- ✅ `npm run build`, `npm run lint` (0 warnings after fixing `tests/schemas.test.ts`), `npx tsc --noEmit`
- ✅ `npm test`: 6 files, 91 tests (new `tests/history.test.ts`: 21 tests, passes in SGT, UTC, LA and Kiritimati)
- ✅ Secret grep on `.next/static` (`AIza|sk-ant`): no matches
- ✅ `.gitignore` has `.env*` and `!.env.example`
- ✅ `process.env` reads: only `app/api/**`, `lib/vision.ts`, and `lib/client.ts` (`NEXT_PUBLIC_USE_MOCK`, not a key). No `NEXT_PUBLIC_` key variable.

## Dev server (no key, no mock flag, port 3200, stopped afterwards)
- ✅ `GET /api/health` → `{"provider":"gemini","model":"gemini-3.8-flash","configured":false,"dishes":36}`, no key material
- ✅ `POST /api/analyse` text → 500 `missing_api_key` plus a server log line
- ✅ 501-char text → 400
- ✅ Burst of 25 POSTs: requests 1–20 → 500 (not 429); 21–25 → 429. The limiter (`app/api/analyse/route.ts:13-22`) runs before body parse and key check, so failed calls use up the quota.
- ✅ Barcode: 5449000000996 → 200 (Coca-Cola), 0000000000000 → 404, abc → 400

## Failures
1. **`lib/matcher.ts:129`**: every matched dish is returned as `source: "hpb"`, including the 35 unverified ones (0 of 36 are `verified`). The UI corrects the label (`components/ItemCard.tsx:9-11`), but the API contract is wrong and acceptance item 3 is met only in name. Owner: api-builder (with Manager for `lib/types.ts`). Fix: return the publisher-based source, or add a curated source value to `Source`.
2. **`app/scan/page.tsx:41`**: `useState(defaultSlot())` runs during SSR. On Vercel (UTC) the server can highlight a different meal slot from the client, so the wrong slot can show after hydration. Owner: frontend-builder. Fix: start at a fixed slot and set `defaultSlot()` in a mount effect (same as `app/page.tsx:40-45`).

## Warnings
- `app/scan/page.tsx:111-120`: unmounting while `await s.start()` is pending can leave the camera running, because cleanup (`:56-62`) runs before `scanner.current` is stable. Owner: frontend-builder. Fix: an `unmounted` ref checked after start resolves.
- `app/history/page.tsx:18`, `app/settings/page.tsx:18`: `react-hooks/set-state-in-effect` disables are justified (SSR-safe read after mount), but `app/page.tsx` avoids them with `queueMicrotask`. Make them consistent (optional).
- `data/hawker.json`: 36 dishes; CLAUDE.md §1 Phase 1 says 40. Owner: data-curator.
- `lib/vision.ts:19`: `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` is not verified. Owner: api-builder. Confirm the current Flash model name in AI Studio before the demo.
- `app/layout.tsx:36`: `overflow-x-hidden` still masks overflow. Owner: Manager.
- Tap targets: static scan found no `h-[1-9]`/`h-10` buttons or links. The `ItemCard` source link is now `min-h-11`, so Phase 3 failure 3 is fixed.
- Stale: Phase 3 failures 1–4 are now resolved (`LICENSE`, `README.md`, `ItemCard` tap target, and all four stub pages are implemented).

## Code review
- ✅ No `toISOString`/`getTimezoneOffset` in `app`, `lib`, `components`. `localDateString` (`lib/storage.ts:59-63`) uses local getters. `lastDays`/`currentStreak` use local-midnight `Date` math.
- ✅ `lib/storage.ts`, `lib/history.ts`: all `window`/`localStorage` access is guarded or inside effects. Scan imports `html5-qrcode` dynamically.
- ✅ `lib/history.ts` CSV: quotes fields with `, " \r \n`, doubles quotes, BOM and CRLF are present.
- ✅ Scan unmount cleanup stops the scanner (warning above covers the race).

## Acceptance (CLAUDE.md §6)
- ✅ build, lint, tsc, test
- ✅ Onboarding → target on Today (Manager E2E, 375 px)
- ⚠️ Chicken rice → HPB match in < 8 s: needs key. Also see failure 1.
- ✅ Slider updates numbers; swap list opens (Manager E2E). ⚠️ Swapping to a different dish updating numbers: not verified.
- ✅ Add to today → ring and bars update; survives reload (Manager E2E)
- ⚠️ "1 plate char kway teow and kopi" → 2 items: needs key (500 path verified)
- ⚠️ Non-food photo → friendly message: needs key
- ✅ Missing key → 500 with a clear server log; UI copy per Manager E2E
- ✅ Valid EAN lookup; unknown code → "couldn't find" plus manual entry (Manager E2E for UI, API 404 here)
- ✅ 375 px, no horizontal scroll on `/`, `/history`, `/settings`, `/uncovered`, `/scan` (Manager E2E). ⚠️ Tap targets on a real phone.
- ✅ No key in client bundle
- ✅ Disclaimer in `app/layout.tsx` via `components/Footer.tsx` on every page
- ✅ `LICENSE` is MIT (2026, MakanLens contributors)
- ✅ `README.md` has setup steps (`cp .env.example .env.local`, keys, mock mode, Vercel). Also check `data/SOURCES.md`, linked from the README, exists: it does.

## Test changes this run
- Added `tests/history.test.ts` (last-7-days, streak, CSV escaping).
- `tests/schemas.test.ts`: removed the unused `_omit` binding (lint warning).
