# Phase 9: feature batch brief for the Manager

**Goal:** add six cheap, demo-visible features in about 45–60 minutes by running **four workers in parallel**. After this phase, **freeze features**; any remaining time goes to fixes, the eval data and the demo.

Rules: don't break anything that passes CLAUDE.md section 6 or ACCURACY_UPGRADE.md. Strict file ownership (below). Commit and `git push` after the merge. Never commit `.env.local`. Never claim a feature in the UI or README that doesn't work.

---

## Step 1: Manager does the shared changes first (alone, about 10 minutes)

1. `lib/types.ts`: add
   ```ts
   // Nutrition gains optional micronutrients (only shown when the source has them)
   //   sodium_mg?: number; fibre_g?: number; satfat_g?: number;
   export interface SavedMeal { id: string; name: string; items: AnalysedItem[]; lastUsed: number; uses: number; favourite: boolean; }
   export interface ExerciseEntry { id: string; date: string; label: string; kcal: number; }
   // Profile gains: macroMode: "split" | "grams"; macroGrams?: { protein_g: number; carbs_g: number; fat_g: number }; addBackExercise: boolean;
   ```
2. `lib/storage.ts`: add typed helpers for SavedMeal[] and ExerciseEntry[] (get, save, delete), plus a function that **records every logged meal as a recent SavedMeal automatically**.
3. Navigation: add entries for **Search** and **Scan label** to the main action area and nav (keep Snap as the biggest button).
4. Add a shared `components/NutritionRow.tsx` that shows kcal and macros, and sodium/fibre/saturated fat only when present.
5. Commit, then start the four workers below **in one message, in parallel**.

---

## Step 2: four workers in parallel

### api-builder (owns `app/api/label/**`, `app/api/search/**`, `lib/label.ts`, `lib/search.ts`)
- **`POST /api/label`**: accepts a photo of a printed nutrition label. Ask the vision model to transcribe **only what is printed**: serving size (g/ml), servings per pack, per-serving and per-100g energy (convert kJ to kcal by ÷ 4.184 when only kJ is shown), protein, carbs, fat, sodium, fibre, saturated fat, and the product name if visible. Zod-validate. Missing fields are null, never guessed. Return as an `AnalysedItem` with `source: "label"`. Add `"label"` to the `Source` type; this is the one type edit the api-builder may make.
- **`GET /api/search?q=`**: fuzzy search over `hawker.json` (names + all aliases) first, then USDA FoodData Central if `USDA_API_KEY` is set. Return up to 15 results with source tags and per-100g values.
- Tests: kJ→kcal conversion, label JSON validation, search ranking (local dishes rank above USDA results).

### frontend-builder #1 (owns `app/label/**`, `app/search/**`, `components/Label*`, `components/Search*`, `components/Recent*`, `components/Favourite*`)
- **Scan label screen:** take or upload a photo; show the read values next to the label photo for checking; let the user pick servings eaten (0.5–3, or grams); add to today.
- **Search screen:** a search box with live results (debounced); tap a result → grams input → add to today. Show source tags.
- **Recent and favourite meals:** on the Today screen, a "Log again" strip with the 5 most recent meals plus a star to favourite; a Favourites list in Search. One tap re-logs a meal to the current slot.

### frontend-builder #2 (owns `app/settings/**`, `components/Macro*`, `components/Exercise*`, `app/manifest.ts`, `public/icons/**`)
- **Custom macro goals:** in Settings, switch between "% split" (sliders that always total 100%) and "grams" (three number inputs, with the resulting kcal shown). Today's bars use whichever mode is chosen.
- **Exercise add-back:** an "Add exercise" button on Today (label + kcal burned, typed by the user). If `addBackExercise` is on (default on), the day's target = base target + exercise kcal. Show it clearly: "Target 1,900 + 300 exercise = 2,200".
- **Install to home screen:** `app/manifest.ts` (name MakanLens, short_name, theme colour, display "standalone", start_url "/"), simple app icons (192 and 512 px, generated as plain SVG→PNG or built-in shapes; no copyrighted artwork), and an Apple touch icon. No service worker needed today.

### data-curator (owns `data/**`)
- Add `sodium_mg`, `fibre_g` and `satfat_g` to `per_serving` and `per_100g` in `hawker.json` **only where the HPB (or other cited official) source lists them**. Leave fields out where they aren't listed; never estimate. Update `data/SOURCES.md`. Report how many dishes gained sodium values.

Each worker runs `npx tsc --noEmit` and `npm run lint` on its own files before reporting, and lists any requests for the Manager.

---

## Step 3: Manager merges and verifies
1. Resolve any requests, wire the new screens into navigation, and check the Today screen with all features together on a 375 px width.
2. Run the qa-tester. Fix failures by sending them back to the owning worker (in parallel where independent).
3. Update the feature list in README.md to match what was actually built.
4. Commit `phase 9: label scan, search, favourites, custom macros, exercise, installable` and `git push`.
5. Report: what works, what to test on the phone, anything cut.

## Done when
- [ ] A photo of a drink's nutrition label returns its printed values, and adding 1 serving logs exactly those values.
- [ ] Searching "laksa" shows the HPB entry first; adding 300 g logs the right numbers.
- [ ] A logged meal appears in "Log again"; one tap logs it again; favourites persist after reload.
- [ ] Switching to gram-based macros changes the Today bars.
- [ ] Adding 300 kcal exercise raises the day's target by 300 when add-back is on.
- [ ] On a phone, "Add to Home Screen" shows the MakanLens name and icon.
- [ ] Sodium shows only for dishes that have a sourced value.
- [ ] All earlier acceptance checks still pass.

## Cut order if short on time
Install-to-home-screen → micronutrients → exercise add-back → custom macro grams. **Never cut:** label scan, search, recent/favourites.
