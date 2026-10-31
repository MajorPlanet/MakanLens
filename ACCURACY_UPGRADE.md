# Accuracy upgrade: Phase 8 brief for the Manager

**Goal:** fix the two biggest errors in photo calorie counting, **portion size** and **hidden fat (cooking method)**. Then prove the gain against Cal AI with our own measured test set.

**Principle:** the vision model never decides calories. It identifies items, estimates grams and names the cooking method. **Code** looks up per-gram nutrition in a real database and does the maths. Every number stays checkable and editable per item.

Do not break anything that passes CLAUDE.md section 6. Run the qa-tester at the end. Commit and `git push` after each part. Never commit `.env.local`.

---

## Part A: Contract changes (Manager does this first, alone)

Update `lib/types.ts`. The changes are additive where possible; update callers.

```ts
export type CookingMethod =
  | "steamed" | "boiled" | "soup" | "grilled" | "roasted"
  | "stir_fried" | "pan_fried" | "deep_fried" | "raw" | "unknown";

export type Source = "hpb" | "usda" | "off" | "ai_estimate";

// Dish gains per-100g values and a typical weight:
//   per_100g: Nutrition            (derive from per_serving ÷ serving.grams × 100 when grams are known)
//   typical_grams: number | null   (the standard hawker serving)
//   method: CookingMethod
//   variant_of?: string            (e.g. roasted chicken rice is a variant of chicken rice)

export interface FollowUp {
  question: string;                       // "Fried or steamed?"
  options: { label: string; dishId?: string; gramsFactor?: number }[];
}

// AnalysedItem gains:
//   grams: number; gramsRange: [number, number];
//   method: CookingMethod;
//   kcalRange: [number, number];          // computed in code from gramsRange
//   followUp?: FollowUp;                  // only when it would change kcal by >15%
//   referenceObject: "card" | "fork" | "spoon" | "chopsticks" | "none";
//   runs: number;                         // how many model runs were combined
// `portion` stays, derived as grams ÷ typical_grams, so the existing slider keeps working.
```

Also add the `USDA_API_KEY=` line to `.env.example` (a free key from api.data.gov; `DEMO_KEY` works for light testing).

Then delegate Parts B, C and D **in parallel**.

---

## Part B: Structured vision output + database maths (`api-builder`)

1. **New model output** (zod-validated, one retry on a parse failure):
   ```json
   {"items":[{"label":"steamed chicken rice","known_dish_id":"chicken-rice-steamed",
     "components":[{"name":"rice","grams":220},{"name":"steamed chicken","grams":90}],
     "grams":330,"grams_low":280,"grams_high":400,
     "method":"steamed","confidence":0.8,"reference_object":"card",
     "ambiguity":null,
     "fallback_kcal_per_100g":null}]}
   ```
   - `ambiguity`, when the method or portion is genuinely unclear, is `{"question":"Fried or steamed?","options":[{"label":"Steamed","known_dish_id":"chicken-rice-steamed"},{"label":"Roasted","known_dish_id":"chicken-rice-roasted"}]}`. Ask at most **one** question per meal.
   - The prompt tells the model: when a card, fork, spoon or chopsticks is visible, use it as a size reference. A standard bank or ID card is 85.6 × 54 mm. Say which reference was used.
   - Prefer `known_dish_id` from our list; choose the variant that matches the cooking method.
2. **Lookup order** (`lib/nutrition.ts`, new, owned by `api-builder`):
   1. `hawker.json` (HPB), using the method-specific variant. **The cooking method picks a database entry; it is never a made-up oil multiplier.**
   2. USDA FoodData Central search (`https://api.nal.usda.gov/fdc/v1/foods/search`, key from `USDA_API_KEY`), choosing an entry whose description matches the method (e.g. "fried"). Cache results in memory.
   3. Open Food Facts (barcode flow only).
   4. The model's `fallback_kcal_per_100g`, tagged `ai_estimate`.
3. **Maths in code:** kcal = per_100g × grams ÷ 100; `kcalRange` uses grams_low and grams_high. Same for the macros.
4. **Median of 3 runs:** call the model **3 times in parallel**. Match items across runs by `known_dish_id` (else by label similarity). Take the median of grams, grams_low and grams_high, and the most common method. Use the run with the median item count when the counts differ. Keep the total time under 10 s; if a run fails or times out, combine the runs that finished. Make the run count an env var `VISION_RUNS` (default 3).
5. **Follow-up threshold:** only return `followUp` when the options' kcal differ by more than 15%. Answering it calls `POST /api/refine` (or happens client-side, since data is local) and recomputes without a new photo.
6. Tests: maths, range, median combining, method → variant selection, follow-up threshold.

## Part C: UI for portions, ranges and the follow-up (`frontend-builder`)

1. **Results card:** show the range big ("520–640 kcal") with the midpoint smaller, plus grams ("≈330 g") and a cooking-method chip. Replace the 0.5×–2× slider with a **grams slider** (25 g steps, 50–800 g) that recomputes instantly; keep a "standard plate" tick mark at `typical_grams`.
2. **Follow-up question:** when an item has `followUp`, show one inline question with tappable options. The answer updates the item and the range narrows visibly (animate it). Never show more than one question per meal.
3. **Scale-reference tip** on the snap screen: "Tip: put a card or fork next to your food for better portions." Show a small "Size reference: card ✓" badge when the model used one.
4. **Learn from corrections** (`lib/storage.ts`): when the user changes grams for a dish, store a per-dish rolling average ratio (user grams ÷ model grams, last 5 edits). Apply it to future estimates for that dish and show "Adjusted to your usual portion (300 g)" with an undo.
5. **Grams input on barcode results** for per-100 g products.

## Part D: Local data + evaluation harness (`data-curator`, then `api-builder` for the script)

1. **data-curator:** add `per_100g`, `typical_grams`, `method` and `variant_of` to every dish in `hawker.json`. Compute per_100g only where the source gives serving grams. Add method variants where HPB lists them (e.g. steamed vs roasted chicken rice, plain vs egg prata, fried vs soup versions). Never invent values; drop a variant you can't source.
2. **Eval set format** (`data/eval/meals.json`, which the team fills in by hand after weighing real meals):
   ```json
   [{"id":"m01","photo":"data/eval/photos/m01.jpg","dish":"Chicken rice (steamed)",
     "components":[{"name":"rice","grams_weighed":230},{"name":"chicken","grams_weighed":95}],
     "true_kcal":null,"calai_kcal":null,"notes":""}]
   ```
   `true_kcal` = the weighed grams × HPB/USDA per-gram values, calculated by the team or by `scripts/truth.ts`.
3. **`scripts/eval.ts`** (api-builder): runs every photo through the real pipeline and writes `data/eval-results.json` with per-meal MakanLens kcal, kcal range, whether the truth fell inside the range, absolute error and % error, plus **mean absolute % error for MakanLens vs Cal AI**. Add `npm run eval`.
4. **`/uncovered` page** (frontend-builder) reads `eval-results.json`: a side-by-side error table, the two headline numbers (MakanLens error % vs Cal AI error %), and the "truth inside our range" hit rate. Show "awaiting test data" until the file exists.

---

## Part E: Optional, only if a Bluetooth kitchen scale is physically in hand

Gate this on the human confirming "we have the scale". Skip it otherwise.

- `/scale` page using **Web Bluetooth**, which works in Chrome on a laptop or Android, **not iPhone Safari**. Say so on the page.
- Step 1: a **BLE explorer** that connects, lists services and characteristics, subscribes to every notify characteristic, and logs raw bytes in hex with timestamps. This is the live reverse-engineering demo: place weights on the scale and watch which bytes change.
- Step 2: try the standard Bluetooth Weight Scale Service (0x181D) first. If the scale uses a custom service, add a decoder in `lib/scale-decoders.ts` once the team has worked out the byte format from the explorer.
- Step 3: "Weigh mode" fills the grams for the selected item from the live reading.

---

## Not doing today (and why)

- **iPhone LiDAR / depth volume:** needs a native ARKit app; a web app can't reach the depth data.
- **Nutrition5k benchmark:** the full dataset is very large and slow to fetch; our own weighed hawker set is more relevant to the claim. Mention Nutrition5k in the pitch as future work.
- **Before/after plate photos:** cut for time; add it only if everything above passes.

## Done when

- [ ] A photo returns grams, method, a kcal range and a source per item; changing grams recomputes instantly.
- [ ] An ambiguous dish (e.g. chicken rice with the chicken hidden) shows one follow-up question, and answering it narrows the range.
- [ ] 3 runs combine by median within 10 s; one failed run doesn't break the result.
- [ ] Portion learning applies after 2+ edits to the same dish and can be undone.
- [ ] `npm run eval` produces `data/eval-results.json` from a 2-meal sample; `/uncovered` shows it.
- [ ] All CLAUDE.md section 6 checks still pass; the qa-tester report is green.

## Cut order if short on time

Part E → before/after → USDA lookup (keep HPB + AI fallback) → learning from corrections → median of 3 (set `VISION_RUNS=1`). **Never cut:** grams + database maths, ranges, the follow-up question, the eval harness.
