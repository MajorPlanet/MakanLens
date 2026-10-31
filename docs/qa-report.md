# MakanLens QA report: Phase 9 feature batch (2026-10-31)

**Status:** FAIL (one must-fix, honesty). Gates are green. `/search` tags every local dish as "HPB", but all 38 dishes are `verified: false`. This is the same issue the Phase 8 report flagged and it is still open on the Search screen. Live-model and phone checks were not run here (see ⚠️).

## Gates
- ✅ `npm run build`: exit 0 (all 16 routes build, including `/manifest.webmanifest`)
- ✅ `npm run lint`: exit 0
- ✅ `npx tsc --noEmit`: exit 0
- ✅ `npm test`: 18 files, 168 tests pass (162 before; 6 added in `tests/phase9.qa.test.ts`)
- ✅ Secret grep `grep -r "AIza\|sk-ant" .next/static`: 0 matches
- ✅ `.gitignore` has `.env*` and `!.env.example`
- ✅ `process.env` reads are server-side, except `NEXT_PUBLIC_USE_MOCK` (mock flag, not a key): `components/LabelApi.ts:31`, `components/SearchApi.ts:69`, `lib/client.ts:40`

## Static checks
- ✅ Server-only modules. A transitive import walk from every `components/**` file and every `app/**/page.tsx` or `layout.tsx` never reaches `lib/usda.ts`, `lib/vision.ts`, `lib/analyse.ts` or `lib/label.ts`. The client path to `lib/search.ts` (via `components/SearchApi.ts`) stops there. `lib/search.ts` reads `process.env.USDA_API_KEY` only inside `searchUsda` (line 78), which is server-only in use.
- ✅ Duplicates gone: `components/FavouriteMeals*`, `ExerciseStore*` and `MacroMath*` do not exist, and nothing imports them. The stale comment at `lib/storage.ts:137` still names `components/ExerciseStore.ts` (see failures).
- ✅ Every add-to-today flow calls `logItems`: `app/page.tsx:101`, `app/label/page.tsx:81`, `app/scan/page.tsx:155`, `app/search/page.tsx:90`. Saved-meal re-logs go through `logSavedMeal` → `logItems`.
- ✅ Micronutrients in `data/hawker.json`: 33 of 38 dishes have `sodium_mg`, `fibre_g` and `satfat_g`. The 5 without are chicken-rice-steamed, carrot-cake-white, satay-chicken-10, half-boiled-eggs-2 and kopi-o-kosong. `per_serving` and `per_100g` list the same fields for every dish. `components/NutritionRow.tsx` renders each micronutrient only when it is a number. `lib/nutrition.ts` `scaleAll` (l.11), `roundNutrition` (l.17) and `withGrams` carry them through.
- ✅ Honesty grep: no "official HPB" claim anywhere. The README (line 93) says no dish is verified HPB, and `components/ItemCard.tsx:12` demotes unverified HPB to the real publisher. The Search screen does not (see failures).

## Failures
1. **`app/search/page.tsx:14`, `:130`, `:150`**: `SOURCE_LABEL.hpb = "HPB"`. Every local dish shows an "HPB" tag, and the "Source:" link is labelled HPB while pointing at the FWD or HealthXchange page. All 38 dishes are `verified: false`. Owner: **frontend-builder** (owns `app/search/**`). Fix: reuse the `ItemCard.tsx` `sourceLabel` logic, which shows `dish.source.name` when `verified` is false.
2. **`app/page.tsx:83`**: loading copy "Matching HPB data…" implies HPB matching. Owner: **frontend-builder**. Fix: "Matching local dish data…".
3. **`app/label/page.tsx:63`** (with `:76`): in grams mode the field is pre-filled with `Math.round(serving grams)`. A printed serving of 33.5 g becomes "34", so tapping "Use grams" without editing logs about 1.5% more than the printed value. Servings mode is exact. Owner: **frontend-builder**. Fix: keep the unrounded grams, or skip rescaling while the typed value equals the printed grams.
4. **`app/api/label/route.ts:13`**: `req.json()` buffers the whole body before the 4 MB check (`lib/label.ts:32`), with no `Content-Length` guard. Owner: **api-builder**. Fix: reject when the `content-length` header exceeds about 5 MB, before parsing.
5. **`lib/storage.ts:197`**: `window.localStorage.getItem` is called directly, not through `read()`. If storage is blocked, `getSavedMeals` throws and `logItems` throws with it. Owner: **frontend-builder** (owns `lib/storage.ts`). Fix: wrap it in try/catch, or use `read()`.
6. **`lib/storage.ts:137`**: stale comment about `components/ExerciseStore.ts`, which no longer exists. Owner: **frontend-builder**. Fix: delete the comment.
7. **`components/ExerciseCard.tsx:42`**: accepts 0.4 kcal (`k > 0`), which `Math.round` (line 46) stores as 0. Owner: **frontend-builder #2** (owns `components/Exercise*`). Fix: require `Math.round(k) >= 1`.

Reviewed with no bug found: `lib/storage.ts` seeding and legacy-key migration (l.155–193), `logItems` (l.241), `clearAll` (l.113, removes all six keys), `components/RecentStrip.tsx`, `app/label/page.tsx` servings scaling (0.5–3×), `app/api/label/route.ts` missing key (500 `missing_api_key`, mapped in `components/LabelApi.ts` and `app/label/page.tsx`).

## Unit-test gaps
- Already covered: kJ→kcal (`tests/label.test.ts:5`), label nulls (`:10`, `:41`), search ranking local above USDA (`tests/search.test.ts:14`), legacy profile normalisation (`tests/phase9.step1.test.ts:15`), add-back on/off and grams vs split (`:22`, `:26`), micronutrient scaling (`:54`).
- Added in `tests/phase9.qa.test.ts`: `rebalance` always totals 100 with every macro ≥5% (exhaustive sweep), and direct `dayTargets` tests (add-back on and off, negative exercise, grams mode with exercise).

## Phase 9 "Done when"
- ⚠️ Label photo returns printed values: mock path ✅ (Manager E2E, 96 kcal exact, `source: "label"`). Real photo not run.
- ✅ "laksa" shows HPB first; 300 g logs 327 kcal with sodium (Manager E2E). Tag issue above applies to the source label.
- ✅ Logged meal in "Log again", one tap re-logs, favourites persist after reload (Manager E2E).
- ✅ Gram-based macros change the Today bars (Manager E2E: 180 g protein / 60 g fat).
- ✅ +300 kcal exercise raises the target by 300 with add-back on (Manager E2E 2,056 → 2,356; unit test).
- ⚠️ Add to Home Screen shows name and icon: manifest and apple-touch-icon return 200 and the link is in the HTML (Manager). Needs a phone.
- ✅ Sodium only for sourced dishes (33 of 38 in data; `NutritionRow` renders only when present).
- ⚠️ All earlier acceptance checks: gates pass, but the live-model checks below were not run.

## CLAUDE.md section 6 checklist
- ✅ build, lint, typecheck, test all pass.
- ✅ Fresh onboarding → target on Today (Manager E2E: 2,056 shown).
- ⚠️ Chicken rice photo → HPB match in under 8 s: needs a live model. Not run (no model calls).
- ⚠️ Portion slider and swap dropdown update instantly: not re-run here.
- ⚠️ Add to today → ring and bars update and survive reload: ring not re-checked here. Saved-meal persistence was verified by the Manager.
- ⚠️ "1 plate char kway teow and kopi" returns 2 items: needs a live model.
- ⚠️ Non-food photo shows a friendly message: needs a live model. The copy exists (`components/ErrorNotice.tsx:8`).
- ✅ Missing API key → clear UI message and server log (label route verified statically; `/api/analyse` not re-checked).
- ⚠️ Barcode lookup and "not found" path: needs network and camera. Not run.
- ✅ 375 px, no horizontal scroll, tap targets ≥44 px on `/`, `/search`, `/label`, `/settings` (Manager E2E).
- ✅ No API key in client bundles (`.next/static` grep, `NEXT_PUBLIC_` only for the mock flag).
- ✅ Disclaimer on every page (`components/Footer.tsx`, used in `app/layout.tsx:44`); `LICENSE` is MIT; README has setup steps.
- ⚠️ Not run here: dev-server curl of `POST /api/analyse` (human's dev server on :3000 left alone, per instructions).
