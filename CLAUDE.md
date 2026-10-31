# MakanLens — project brief for Claude Code

MakanLens is a free, open-source (MIT) mobile-first web app. You snap or describe a Singapore hawker meal and get calories and macros in seconds. Numbers come from official Health Promotion Board (HPB) data wherever possible, and every number shows its source and confidence.

It is being built in one afternoon for the NUS Hackers track at Autonomous SG 2026. The brief is "reverse engineer an opaque, expensive app and build something better, open source". Our target is **Cal AI**, plus the best paid features of MyFitnessPal, MacroFactor, Cronometer, Noom and CalBot, rebuilt free.

Judging weights: cost of status quo 20%, reach 15%, **coolness of the live demo 25%**, cost reduction 25%, open-source licence 15%. A working end-to-end demo on a phone beats extra half-built features. Always protect the core loop: **snap → result → fix → today view**.

---

## 1. How to work in this repo: manager and workers

The **main session is the Manager**. Run it on Opus (`/model opus`). The Manager plans, writes the shared contract, delegates, integrates, and owns quality. It does not write feature code that a worker owns, except for small integration fixes.

### Team

| Agent | File | Model | Owns | Why this model |
|---|---|---|---|---|
| Manager (main session) | — | Opus | Plan, `lib/types.ts`, `app/layout.tsx`, integration, `PROGRESS.md` | Best judgement for planning, integration and review |
| `frontend-builder` | `.claude/agents/frontend-builder.md` | Sonnet | `app/**` pages (not `app/api`), `components/**`, `lib/storage.ts`, `lib/targets.ts`, `lib/image.ts` | Strong, fast UI coding |
| `api-builder` | `.claude/agents/api-builder.md` | Sonnet | `app/api/**`, `lib/vision.ts`, `lib/prompt.ts`, `lib/matcher.ts`, `lib/off.ts` | Careful server and AI integration |
| `data-curator` | `.claude/agents/data-curator.md` | Sonnet | `data/**` | Web research where accuracy matters |
| `qa-tester` | `.claude/agents/qa-tester.md` | Haiku | `tests/**`, QA reports (no app code edits) | Cheap, fast checks and test runs |
| `docs-writer` | `.claude/agents/docs-writer.md` | Haiku | `README.md`, `docs/**`, `LICENSE` check | Cheap, simple writing |

### Rules for the Manager

1. **Contract first.** Before spawning anyone, write `lib/types.ts` (section 4) and stub every shared file, so workers code against the same shapes.
2. **Parallelise independent work.** Phase 1 runs `frontend-builder`, `api-builder` and `data-curator` **at the same time** (one message, three Agent calls).
3. **Strict file ownership.** Each worker edits only the files it owns. A worker that needs a change elsewhere reports it back instead of editing. The Manager makes cross-cutting edits.
4. **Brief every worker fully.** Workers start with no memory of this chat. Each prompt includes: the phase goal, its exact files, the acceptance criteria from section 6, and "report back: files changed, how to test, open issues".
5. **Verify, don't trust.** After each phase, run `npm run build` (or have `qa-tester` do it) before starting the next phase.
6. **Log progress.** After every phase, update `PROGRESS.md`: phase, done, broken, next. Commit with `git commit -m "phase N: …"`.
7. **Keep the core loop alive.** If a phase is late, use the cut list in section 8, never the core loop.
8. **Ask the human** only for secrets (API keys), irreversible actions, or a choice between two real product directions.

### Phases

| Phase | Who | Parallel? | Output |
|---|---|---|---|
| 0. Setup and contract | Manager | — | Next.js scaffold, deps, `lib/types.ts`, stubs, `.env.example`, `PROGRESS.md` |
| 1. Core build | `frontend-builder` + `api-builder` + `data-curator` | **Yes, all 3** | UI on mock data · `/api/analyse` + matcher · `hawker.json` (40 dishes) |
| 2. Integration | Manager | — | UI calls real API; end-to-end snap works with `npm run dev` |
| 3. Gate check | `qa-tester` | — | Build, lint, typecheck, tests pass; acceptance checklist report |
| 4. Should-haves | `frontend-builder` + `api-builder` | **Yes** | Barcode, describe-by-voice, history chart, tips, settings, export, Uncovered page |
| 5. QA + fixes | `qa-tester` → workers | Fixes in parallel | All acceptance criteria green |
| 6. Docs | `docs-writer` | Can run alongside 5 | README, pitch notes, licence check |
| 7. Stretch (only if time) | `api-builder` / `frontend-builder` | Yes | Weight log + adaptive target |

---

## 2. Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**, mobile-first, deployable to Vercel unchanged.
- **No database and no login.** User data lives in `localStorage` (private by design; this is a selling point).
- **Vision AI behind one interface** (`lib/vision.ts`), switchable with `VISION_PROVIDER`:
  - `gemini` (default; free tier = $0 per user): Google Generative Language REST API via `fetch`, no SDK. Model from `GEMINI_MODEL`; use the current Flash model listed in Google AI Studio.
  - `anthropic`: Claude API Messages endpoint via `fetch`, model from `ANTHROPIC_MODEL` (e.g. `claude-haiku-5-5`).
- Libraries (keep it this short): `fuse.js` (fuzzy matching), `zod` (validate AI JSON and request bodies), `html5-qrcode` (barcode), `vitest` (tests). Charts are hand-written SVG; don't add a chart library.
- Barcode data: **Open Food Facts** API (free, no key): `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`. Send a descriptive `User-Agent`.

### Environment (`.env.local`, never committed)

```
VISION_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-5-5
```

API keys are **server-only**: read them only in `app/api/**` and `lib/vision.ts`. Never prefix them with `NEXT_PUBLIC_`. Check that `.gitignore` contains `.env*` (but not `.env.example`).

---

## 3. Features

### Must-have (the demo; Phases 1–2)

1. **Onboarding** (`/onboarding`, first visit only): sex, age, height, weight, activity level (sedentary/light/moderate/active), goal (lose/maintain/gain). Daily target = Mifflin-St Jeor BMR × activity factor (1.2/1.375/1.55/1.725), then −500 (lose), 0, or +300 (gain). Macro split 30% protein / 40% carbs / 30% fat. Editable later.
2. **Snap** (`/` main action): camera or upload (`<input type="file" accept="image/*" capture="environment">`). Resize client-side to max 1024 px JPEG before upload (`lib/image.ts`). Show a loading state with a progress message.
3. **Analyse API** (`POST /api/analyse`): accepts `{ image?: base64, text?: string }`. Sends the vision prompt (section 5) with the list of known dish names. Validates the JSON with zod. Runs each item through the matcher. Returns `AnalyseResponse`.
4. **Matcher** (`lib/matcher.ts`): Fuse.js over dish `name` + all `aliases` (English, Chinese, Malay, Tamil). On a confident match, nutrition = HPB per-serving values × portion, `source = "hpb"`. No match → the model's estimate with `source = "ai_estimate"`. Also return the top 5 candidates for the swap dropdown.
5. **Results card**: per item, show the dish name (local name underneath), kcal, protein, carbs, fat, a confidence badge (high ≥0.75 / medium ≥0.5 / low), a **source tag** (HPB / Open Food Facts / AI estimate, linking to the source URL), a **portion slider** (0.5×–2× in 0.25 steps, labelled with the serving label, e.g. "1 plate"), a **swap-dish dropdown** (top candidates + search), and a remove button. Pick the meal slot (breakfast/lunch/dinner/snack, defaulting by time of day), then **Add to today**.
6. **Today view** (`/`): calorie ring (eaten vs target), protein/carbs/fat bars, and meals grouped by slot with edit/delete.
7. **Footer disclaimer on every page**: "Estimates only. Not medical advice."

### Should-have (Phase 4)

8. **Describe it**: text box plus a mic button using the Web Speech API where supported (hide it otherwise). It sends `text` to `/api/analyse` and must handle Singlish such as "cai fan 2 veg 1 meat, less rice" or "kopi siew dai".
9. **Barcode**: `/scan` page with `html5-qrcode` and a manual entry fallback. `GET /api/barcode?code=…` → Open Food Facts → per-serving values (or per 100 g with a gram input), `source = "off"`.
10. **Swap tips**: after adding a dish with a `tip` in `hawker.json`, show one tip card (e.g. a lower-calorie way to order it).
11. **History** (`/history`): 7-day bar chart vs target (SVG) and the current logging streak.
12. **Settings** (`/settings`): edit profile and target, export all entries as CSV, clear all data.
13. **Uncovered page** (`/uncovered`): table from `data/experiment.json` comparing Cal AI's estimate, MakanLens's estimate and the HPB value per dish, with error %. This is the pitch's "what we uncovered" evidence; the team fills in the real numbers.

### Stretch (Phase 7, only if everything above works)

14. **Weight log + adaptive target** (the MacroFactor idea): log weight daily; after 7+ days, estimate actual expenditure = average intake − (trend weight change kg × 7,700 kcal ÷ days), smooth it, and suggest a new target. Seed sample data for the demo.

### Out of scope

Accounts, a backend database, social features, payments, native apps, a Telegram bot.

---

## 4. Shared contract — `lib/types.ts` (Manager writes this in Phase 0)

```ts
export type Source = "hpb" | "off" | "ai_estimate";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface Nutrition { kcal: number; protein_g: number; carbs_g: number; fat_g: number; }

export interface Dish {
  id: string;                          // "chicken-rice-steamed"
  name: string;                        // "Chicken rice (steamed)"
  aliases: { en: string[]; zh: string[]; ms: string[]; ta: string[] };
  serving: { label: string; grams: number | null };   // "1 plate"
  per_serving: Nutrition;
  source: { name: string; url: string; verified: boolean };
  tip?: string;
}

export interface Candidate { dishId: string; name: string; score: number; }

export interface AnalysedItem {
  label: string;                       // what the model saw, e.g. "Hainanese chicken rice"
  dishId: string | null;               // matched Dish id, or null
  portion: number;                     // multiplier, 0.5–2
  confidence: number;                  // 0–1, from the model
  nutrition: Nutrition;                // already scaled by portion
  source: Source;
  sourceUrl?: string;
  candidates: Candidate[];             // for the swap dropdown
}

export interface AnalyseResponse { items: AnalysedItem[]; provider: string; ms: number; }

export interface LogEntry {
  id: string; date: string;            // "2026-10-31" (local date)
  slot: MealSlot; createdAt: number;
  item: AnalysedItem;
}

export interface Profile {
  sex: "male" | "female"; age: number; heightCm: number; weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "active";
  goal: "lose" | "maintain" | "gain";
  targetKcal: number; macroTargets: { protein_g: number; carbs_g: number; fat_g: number };
}
```

Changing this file is the Manager's job only. A worker that needs a change asks for it in its report.

---

## 5. Vision prompt (`lib/prompt.ts`, owned by `api-builder`)

The prompt must:

- Say it's analysing food in Singapore (hawker centres, kopitiams, food courts).
- Include the list of known dish names and ids from `hawker.json`, and ask the model to use the closest known name when one fits.
- Return **only** JSON matching:
  `{"items":[{"label":string,"known_dish_id":string|null,"portion":number,"confidence":number,"estimate":{"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number}}]}`
- Separate every distinct dish and drink in the photo (e.g. nasi lemak + teh tarik = 2 items).
- Set `portion` relative to a standard hawker serving (1 = normal plate or bowl).
- For text input, parse Singlish, quantities and modifiers ("less rice" → portion 0.75 for rice dishes, "kosong" = no sugar).
- If it isn't food, return `{"items":[]}`.

Use the provider's JSON mode where it exists (Gemini `responseMimeType: "application/json"`). Always zod-validate, and retry once on a parse failure.

---

## 6. Acceptance criteria (Definition of Done)

- [ ] `npm run build`, `npm run lint`, `npx tsc --noEmit` and `npm test` all pass.
- [ ] Fresh browser → onboarding → target shown on Today.
- [ ] A photo of chicken rice returns ≥1 item matched to an HPB dish with `source = "hpb"` in under 8 s.
- [ ] The portion slider and the swap dropdown update the numbers instantly.
- [ ] Add to today → the ring and macro bars update, and the entry survives a page reload.
- [ ] Typing "1 plate char kway teow and kopi" returns 2 items.
- [ ] A non-food photo shows a friendly "no food found" message, not an error.
- [ ] A missing API key gives a clear error message in the UI and a server log, not a crash.
- [ ] Barcode lookup works for a valid EAN, and an unknown code shows "not found" plus manual entry.
- [ ] Usable at 375 px width with no horizontal scroll; tap targets ≥44 px.
- [ ] No API key appears in client bundles (`grep` the `.next/static` output for the key prefix).
- [ ] The disclaimer is visible on every page; `LICENSE` (MIT) exists; the README has setup steps.

---

## 7. Conventions

- British spelling in UI copy ("colour", "favourite"). Food names keep their local spelling.
- Small, typed, pure functions in `lib/`; React components in `components/` (one per file).
- No `any`. Validate all external data (AI output, Open Food Facts, request bodies) with zod.
- Client components only where needed (`"use client"`).
- Unit tests for `lib/targets.ts`, `lib/matcher.ts`, and the zod schemas (in `tests/`).
- Clean commits per phase. Never commit `.env.local`.

---

## 8. Cut list (if behind, cut from the top)

1. Stretch: adaptive target
2. Uncovered page styling (keep a plain table)
3. History chart
4. Barcode
5. Voice input (keep text)

**Never cut:** onboarding, snap, analyse API, matcher + `hawker.json`, results card with portion and swap, Today view, disclaimer.

---

## 9. Commands

```
npm run dev        # local dev at http://localhost:3000 (use your phone on the same Wi-Fi via the Network URL)
npm run build      # production build
npm run lint
npx tsc --noEmit
npm test           # vitest
```

---

## 10. Phase 8: accuracy upgrade (design summary; full brief in `ACCURACY_UPGRADE.md`)

**Principle:** the vision model never decides calories. It identifies items, estimates **grams** (with a low/high range) and names the **cooking method**. Code looks up per-100 g values and does the maths: kcal = per_100g × grams ÷ 100, and `kcalRange` comes from the grams range.

- **Contract** (`lib/types.ts`):
  - `Source` gains `"usda"`.
  - New types: `CookingMethod`, `ReferenceObject` and `FollowUp`.
  - `Dish` gains `per_100g` (null when the source gives no serving weight; never invented), `typical_grams`, `method` and `variant_of?`.
  - `AnalysedItem` gains `grams`, `gramsRange`, `method`, `kcalRange`, `per_100g`, `followUp?`, `referenceObject` and `runs`.
  - `portion` stays, derived as grams ÷ typical_grams.
- **Lookup order:**
  1. `hawker.json`. The cooking method picks the variant entry; there are no oil multipliers.
  2. USDA FoodData Central (`USDA_API_KEY`, server only, cached).
  3. Open Food Facts (barcode only).
  4. The model's `fallback_kcal_per_100g`, tagged `ai_estimate`.
- **Median of `VISION_RUNS` (default 3) parallel model runs,** combined per item. Partial failure is tolerated, with a budget under 10 s.
- **Follow-up:** at most ONE question per meal, and only when the options' kcal differ by more than 15%. It is answered client-side from local data (no new photo).
- **Files:**
  - `lib/nutrition.ts`: client-safe maths, `withGrams` and `applyFollowUpOption`; the UI imports it.
  - `lib/usda.ts`: server only.
  - `scripts/eval.ts` (run by `npm run eval`) writes `data/eval-results.json` from the hand-weighed set in `data/eval/meals.json`; `/uncovered` shows MakanLens vs Cal AI mean absolute % error and the "truth inside our range" hit rate.
- **Ownership additions:**
  - api-builder: `lib/nutrition.ts`, `lib/usda.ts`, `scripts/**`.
  - data-curator: `data/eval/**`.
  - frontend-builder: portion learning in `lib/storage.ts` (per-dish rolling ratio of user grams ÷ model grams over the last 5 edits, applied after 2+ edits, with undo).
- **Part E** (Web Bluetooth scale) is skipped unless the team confirms it has a scale.
