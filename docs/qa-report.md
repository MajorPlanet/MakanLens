# MakanLens QA report: Phase 8 accuracy upgrade (2026-10-31)

**Status:** FAIL. Gates, real calls and the maths are green. Two Phase 8 "Done when" items are not met (follow-up does not narrow the range; `source` is "hpb" for 0 of 38 unverified dishes, carried over from Phase 5).

## Gates
- ✅ `npm run build`, `npm run lint`, `npx tsc --noEmit`: exit 0
- ✅ `npm test`: 13 files, 145 tests (137 before; 8 added in `tests/phase8.qa.test.ts`)
- ✅ Secret grep on `.next/static` (`AIza|sk-ant`): 0 matches. Not checked against the key value itself (that would mean reading `.env.local`).
- ✅ `.gitignore` has `.env*` and `!.env.example`
- ✅ `.env.example` has `USDA_API_KEY` and `VISION_RUNS`
- ✅ `process.env` reads: `app/api/health/route.ts`, `lib/analyse.ts:19` (VISION_RUNS), `lib/usda.ts:53`, `lib/vision.ts`, `scripts/eval.ts:54`. No `NEXT_PUBLIC_` key variable.
- ⚠️ `lib/client.ts:40` reads `NEXT_PUBLIC_USE_MOCK`. It is a mock flag, not a key, but it is outside the audit list. Owner: frontend-builder. Fix: none needed; note it in the audit.
- ✅ Client bundle trace: no client file imports `lib/vision`, `lib/usda`, `lib/analyse`, `lib/off` or `lib/combine`, directly or transitively. `lib/matcher.ts:5` and `lib/matcher.ts`'s `schemas` import are `import type` (erased). `lib/client.ts` → `lib/mock.ts` → `lib/matcher.ts` and `lib/nutrition.ts` only.

## Real calls (dev server on :3200, no mock flag; stopped afterwards)
- ✅ `GET /api/health` → 200, `{"provider":"anthropic","model":"claude-haiku-5-5","configured":true,"dishes":38}`
- ✅ Text "1 plate char kway teow and kopi" → 200 in **7.07 s** (server `ms` 6991). 2 items:
  - Char kway teow: `hpb`, 300 g [240–370], `stir_fried`, kcal 582 in [466–718], runs 3.
  - Kopi (`ai_estimate`, dishId null, not kopi-o-kosong): 250 g [200–280], kcal 120 in [96–134].
  - All fields present, and low ≤ kcal ≤ high.
- ✅ Photo `m01.jpg` → 200 in **5.17 s**. Matched `chicken-rice-steamed` (`hpb`), 400 g [320–450], `steamed`, `referenceObject: fork`, kcal 558 in [446–628], runs 3.
- ✅ Non-food solid-colour PNG → 200, `items: []` in 0.93 s.
- ✅ `POST /api/analyse` `{}` → 400 `provide image or text`. Empty body → 400 `Body must be JSON.`
- ✅ Barcode 5449000000996 → 200. `item` has `grams`, `gramsRange`, `method`, `kcalRange`, `per_100g`, `referenceObject`, `runs`.
- ✅ No key pattern in the dev log.
- Budget note: 3 billable analyse requests, plus 2 free 400s (5 POSTs in total). The eval below also makes 2 model calls, as the brief requires.

## Eval
- ✅ `VISION_RUNS=1 EVAL_OUT=/tmp/ml-eval-check.json npm run eval` exits 0. m01 558 kcal [465–651], 4.9 s. m02 1058 kcal [893–1175], 5.0 s.
- ✅ `scripts/eval.ts:54` honours `EVAL_OUT`. The output matches `EvalResults` in `lib/types.ts`. The committed `data/eval-results.json` was not touched.
- ⚠️ MAPE and hit rate are null because the sample meals have `true_kcal: null`. They can't be measured until real weighed meals are added.

## Failures
1. **`lib/matcher.ts:156` and `:202`** (`source: "hpb"`). Every curated dish is tagged `hpb`, but `data/hawker.json` has 0 of 38 `verified`. Carried over from the Phase 5 report, still open. The UI relabels it (`components/ItemCard.tsx:11-17`), but the API contract is wrong. Owner: api-builder (with Manager for `lib/types.ts`). Fix: derive the source from `dish.source.verified`, or add a source value for unverified publisher data.
2. **`lib/matcher.ts:241-263`** (`swapDish` / `applyFollowUpOption`). Answering a follow-up keeps `item.gramsRange`, so the kcal range moves but its width does not narrow. The Done-when item "answering it narrows the range" is not met. Owner: api-builder. Fix: on an answer, recompute `gramsRange` from the chosen variant's typical grams (for example ±10%) instead of keeping the old range.

## Warnings
- `lib/analyse.ts:14` and `:51`: when the model gives no grams and no database match, the item is set to 200 g and presented at normal confidence (`:63-66`). That is an invented weight. Owner: api-builder. Fix: use `[0,0]` and cap confidence at 0.3, as for the kcal fallback.
- `lib/analyse.ts:42`: when `fallback_kcal_per_100g` is missing, kcal is forced to 150 even if the model gave macros, so kcal may not equal 4P + 4C + 9F. Owner: api-builder. Fix: derive kcal from the macros when they are present.
- `lib/combine.ts:37-41`: items that appear only in a non-reference run are dropped. This is intended, and the new test documents it. Mismatched counts are handled.
- `lib/analyse.ts:76-78` plus `:11`: the vision budget is 8.5 s, and USDA can add up to 1.5 s, so the worst case is about 10 s with no headroom for the "within 10 s" item. Owner: api-builder. Fix: lower `VISION_BUDGET_MS` to about 7.5 s.
- `lib/storage.ts:57`: `normaliseEntries` only checks that `item.nutrition` exists, not that `kcal` is a number, so a malformed legacy entry can give NaN. Minor. Owner: frontend-builder.
- `lib/nutrition.ts:38-59` (`withGrams`): grams 0, `per_100g` null and NaN are handled (`:39`, `:44`). No bug found.
- `components/ItemCard.tsx:9-17` and `components/ResultsCard.tsx:51, 82`: at most one follow-up per meal is enforced. No bug found.
- `lib/storage.ts:33-51` (`normaliseItem`): legacy entries get defaults. No bug found.
- `app/scan/page.tsx`: the Phase 5 SSR slot issue appears fixed (`defaultSlot()` is now set in an effect at `:87`). Not fully re-audited.

## "Done when" (Phase 8)
- ✅ Photo returns grams, method, kcal range and source per item. Changing grams recomputes instantly (Manager E2E, `withGrams` tests).
- ❌ "Answering it narrows the range": the range moves but does not narrow (Failure 2). The single-question rule and the 15% threshold are ✅.
- ⚠️ 3 runs median within 10 s, with one failure tolerated. Median and failed-run tests ✅, real call 7.07 s ✅, but the worst case is about 10 s (Warning).
- ✅ Portion learning after 2+ edits, with undo (new tests in `tests/phase8.qa.test.ts`, Manager E2E 450 g → undo 330 g).
- ✅ `npm run eval` writes the results file (verified with `EVAL_OUT`). `/uncovered` shows the table (Manager E2E). Metrics pending weighed meals.
- ❌ All §6 checks green: blocked by the failures above.

## CLAUDE.md §6 checklist
- ✅ build, lint, tsc, test all pass
- ⚠️ Fresh browser onboarding → target on Today: not re-run here (needs a browser)
- ✅ Chicken rice photo → ≥1 item, `source` "hpb", 5.17 s (the dish data is unverified, see Failure 1)
- ⚠️ Portion slider and swap dropdown update instantly: grams slider ✅ (Manager E2E); swap not browser-tested here (`swapDish` unit-tested)
- ⚠️ Add to today → ring and bars update, survives reload: not re-run here
- ✅ "1 plate char kway teow and kopi" → 2 items, 7.07 s
- ⚠️ Non-food → "No food spotted" (API returns `items: []` ✅; UI copy at `components/ErrorNotice.tsx:8`, not browser-tested)
- ✅ Missing API key → clear error and log (`app/api/analyse/route.ts:48-50`, verified in the Phase 5 run, not re-run)
- ⚠️ Barcode valid EAN ✅ (200). Unknown code shows "not found" and manual entry: not browser-tested
- ✅ 375 px, no horizontal scroll, ≥44 px tap targets (Manager E2E)
- ✅ No key in client bundles (pattern grep)
- ✅ Disclaimer in `app/layout.tsx:38` (`<Footer />`) on every page; `LICENSE` is MIT; README has setup steps (`README.md:35-59`)

## Files changed by QA
- `tests/phase8.qa.test.ts` (new, 8 tests)
- `docs/qa-report.md` (this file)
- Outputs in `/tmp`: `ml-eval-check.json`, `ml-*.log`. The dev server was stopped.
