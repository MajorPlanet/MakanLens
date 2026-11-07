# Features v2 brief: custom foods, goal planner, food library

Three features for daily personal use. Don't break anything that currently passes; keep the existing tests green. Commit and `git push` after each part. Never commit `.env.local`. British spelling in UI copy.

---

## Part A: Shared contract and storage (Manager does this first, alone)

### Types (`lib/types.ts`)
```ts
export interface FoodRecord {
  id: string;                         // built-in dish id, or "custom-<newId()>"
  origin: "builtin" | "custom";
  name: string;
  aliases: string[];                  // any language, free text
  serving: { label: string; grams: number | null };   // "1 plate", 350
  per_serving: Nutrition;             // kcal, protein_g, carbs_g, fat_g (+ optional sodium_mg, fibre_g, satfat_g)
  per_100g: Nutrition | null;         // auto-derived when serving.grams is set
  notes?: string;
  source: { name: string; url?: string };             // custom → "Your food"
  createdAt: number; updatedAt: number;
}

// An edit to a built-in dish is stored as an override; hawker.json is never modified.
export interface FoodOverride { dishId: string; changes: Partial<Pick<FoodRecord,
  "name" | "aliases" | "serving" | "per_serving" | "notes">>; updatedAt: number; }

export interface GoalPlan {
  direction: "lose" | "gain" | "maintain";
  kgPerWeek: number;                  // 0 for maintain
  weeks: number;
  startDate: string;                  // YYYY-MM-DD
  startWeightKg: number;
  maintenanceKcal: number;            // TDEE from the profile at plan start
  dailyKcal: number;                  // computed
  weeklyKcal: number;                 // dailyKcal × 7
  capped: boolean;                    // true if safety limits changed the request
}
// Source gains "custom" and "user_edit".
```

### Storage
- Move food storage to **IndexedDB** (a small wrapper in `lib/db.ts`, no heavy library; `idb-keyval` is acceptable) so there's **no practical limit** on custom foods. localStorage caps at about 5 MB. Keep existing localStorage keys working; migrate on first load.
- Stores: `customFoods`, `foodOverrides`, `goalPlan`.
- Export/backup: extend the Settings export to include custom foods, overrides and the goal plan, and **add Import** (JSON) that restores them, with a confirmation step and a merge-or-replace choice.

### One food lookup for the whole app (`lib/foods.ts`)
`getAllFoods()` returns built-in dishes (with overrides applied) plus custom foods, as `FoodRecord[]`. Every place that shows or matches foods (search, swap dropdown, results matching, favourites) must use this, so edits and custom foods appear everywhere.

Then delegate Parts B, C and D **in parallel**, with strict file ownership.

---

## Part B: Custom foods (`frontend-builder`)

- A **"New food"** form, reachable from the Food Library (Part D) and from search ("Can't find it? Create it"):
  - name (required), aliases (chips), serving label + grams (optional), and **kcal, protein, carbs, fat** (required, number inputs with units); sodium, fibre and saturated fat optional; notes.
  - Live check: show "macros add up to ≈ X kcal" (4/4/9 kcal per gram) next to the entered kcal, and warn gently if they differ by more than 15%, without blocking.
  - per_100g auto-computed when grams are given.
- **No limit** on the number of foods. The list must stay fast with 1,000+ foods (virtualise, or paginate the list).
- Custom foods show in search, the swap dropdown and favourites with a **"Your food"** chip, and can be logged with a grams or servings input.
- **Photo matching:** after `/api/analyse` returns, fuzzy-match each item's label against custom food names and aliases on the client. If there's a good match, put the custom food first in the swap candidates and show "Use your food: <name>?" as a one-tap suggestion. Don't auto-replace.
- **Duplicate and delete:** duplicate an existing food (built-in or custom) as a new custom food; delete with confirmation. Past logs keep their stored values.

## Part C: Goal planner (`frontend-builder` #2, plus `lib/goals.ts`)

- A **Goal** screen in Settings and a card on Today. The user picks:
  - direction: lose / gain / maintain
  - **kg per week**: slider in 0.1 kg steps
  - **number of weeks**: 1–52
- Maths in `lib/goals.ts` (pure functions, unit-tested):
  - maintenance = the existing Mifflin-St Jeor × activity calculation (current profile weight).
  - daily change = kgPerWeek × 7,700 ÷ 7 kcal (label this in the UI as an approximation: "about 7,700 kcal per kg of body weight").
  - dailyKcal = maintenance − change (lose) or + change (gain); weeklyKcal = dailyKcal × 7.
  - Show: target date, projected end weight, daily and weekly calorie targets, and protein/carbs/fat in grams from the user's macro settings.
- **Safety limits**, applied automatically, with `capped: true` and a plain explanation when they bite:
  - Loss rate capped at the lower of 1 kg/week or 1% of current body weight per week. Gain capped at 0.5 kg/week.
  - Daily target never below 1,200 kcal (female) or 1,500 kcal (male). If the request would go lower, cap it and say: "That pace would need a very low intake. We've set a safer target; a doctor or dietitian can help with faster plans."
  - Never show messaging about "earning" food through exercise.
- **Weekly budget view** on Today/History: "This week: 9,200 of 12,600 kcal", with remaining kcal and days left; days over or under the daily target shift what's shown as remaining for the week, but the **daily target itself does not change** (no compensation pressure).
- When the plan's weeks end: show a card offering "Switch to maintenance" or "Start a new plan".
- The existing exercise add-back still works on top of the daily target.
- If a weight log exists later (adaptive target), leave a clear hook: `recomputePlan(plan, currentWeightKg)`. Don't build the weight log now.

## Part D: Food Library with a side button (`frontend-builder`, same worker as Part B)

- A **side button** (a slim tab fixed to the right edge on mobile, a sidebar entry on wide screens) labelled **"Foods"** that opens a **slide-over panel** (full-screen sheet on mobile).
- The panel lists **every food in the app** (`getAllFoods()`): search box, filters (All · Built-in · Your foods · Edited), sorted A–Z, with kcal per serving shown.
- Tap a food to open its detail and edit form (same fields as Part B):
  - Built-in dishes: saving creates a `FoodOverride` and shows an **"Edited by you"** chip, the original values for comparison, and **"Reset to original"**. The source tag becomes "user_edit" with the original source still visible.
  - Custom foods: edit in place.
- Edits apply to **future** logs. Past logged meals keep the values they were logged with (they're stored per entry). Say this once, in small text, in the edit form.
- Keyboard and screen-reader accessible; the panel closes with Esc, swipe or the ✕.

## Part E: Search and API alignment (`api-builder`)

- `/api/search` and the client search must include custom foods and overrides. Since those live on the device, merge them **client-side**: query the server for built-in and USDA results, then merge local `getAllFoods()` results ranked first.
- `/api/analyse`: accept an optional `userFoods: {id, name, aliases}[]` (names only, max 200, no nutrition values) and add them to the known-dish list in the prompt, so the model can name a custom food directly. Nutrition is still applied on the client from local data.
- Tests for both.

---

## Done when
- [ ] I can create 3 custom foods with my own macros, find them in search, log them, and see them in the swap list after a photo scan.
- [ ] Creating 1,000 test foods (dev-only seed button) keeps the Food Library scrolling smoothly.
- [ ] Setting "lose 0.5 kg/week for 12 weeks" shows the daily and weekly targets, target date and projected weight, and Today uses the new daily target.
- [ ] Asking for an unsafe pace (e.g. lose 2 kg/week) is capped with the explanation, and the target never drops below the floor.
- [ ] The "Foods" side button opens the library; editing a built-in dish changes future logs, shows "Edited by you", and "Reset to original" restores it.
- [ ] Export, then clear data, then import restores custom foods, edits and the goal plan.
- [ ] All existing tests, typecheck, lint and build pass; works at 375 px in light and dark mode.
