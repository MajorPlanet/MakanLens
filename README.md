# MakanLens

Snap or describe a Singapore hawker meal and get calories and macros in seconds. Free, open source (MIT), and private: your log lives in your browser.

![MakanLens screenshot](docs/screenshot.png)

*Screenshot placeholder: add `docs/screenshot.png` before submission.*

## Why

Cal AI and MyFitnessPal charge for photo logging. Hawker food is hard for generic trackers: a plate of char kway teow or nasi lemak has no single "correct" entry. MakanLens is free and open, does not require an account, and uses published Singapore nutrition figures for local dishes wherever it can. Every number shows where it came from.

## Features

- **Onboarding:** sex, age, height, weight, activity and goal. Daily target from Mifflin-St Jeor BMR × activity factor, adjusted for goal. Editable later.
- **Snap, upload or describe:** take a photo or upload one, or type a meal (Singlish is fine, e.g. "cai fan 2 veg 1 meat, less rice"). Voice input works where the browser supports it. Tip: a card or fork next to the plate helps with portion size.
- **Results card:** each dish shows a **kcal range** (e.g. 446–670 kcal) with a best guess, its estimated weight in grams, the cooking method, a confidence badge and a source tag that links to the publisher. Adjust the weight with a grams slider (50–800 g), swap the matched dish, or remove an item.
- **One follow-up question** when it matters: if the cooking method or variant would change the calories by more than 15% (e.g. "Steamed or roasted?"), one tap answers it and the range narrows.
- **Learns your portions:** after you correct the grams for a dish twice, future estimates for that dish start at your usual portion, with an Undo.
- **Today:** calorie ring against your target, protein/carbs/fat bars, and meals grouped by breakfast, lunch, dinner and snack, with edit and delete.
- **Log again and favourites:** your recent meals appear on Today; one tap logs a meal again, and a star saves it to Favourites (also listed on Search).
- **Search:** `/search` finds dishes in the local dataset by name or alias (English, Chinese, Malay, Tamil), then USDA FoodData Central when a `USDA_API_KEY` is set. Pick grams and add it.
- **Scan a nutrition label:** `/label` reads a photo of a printed nutrition panel and copies only what is printed (kJ is converted to kcal). Check the values next to the photo, choose servings or grams, and add.
- **Barcode:** `/scan` looks up packaged products on Open Food Facts, by camera or manual entry, per serving or per 100 g.
- **Sodium, fibre and saturated fat:** shown only where the source lists them (33 of 38 dishes have sodium). Never estimated.
- **Custom macro goals:** in Settings, use a % split (always totals 100%) or fixed grams per macro.
- **Exercise add-back:** log exercise kcal on Today; with add-back on (the default), the day's target rises by that amount ("Target 1,900 + 300 exercise = 2,200").
- **Install to home screen:** the app has a web manifest and icons, so "Add to Home Screen" gives a MakanLens icon that opens full screen.
- **Swap tips:** a short tip on a lower-calorie way to order some dishes.
- **History:** 7-day chart against your target, and your logging streak.
- **Settings:** edit your profile, set a manual kcal override, export all entries as CSV, or clear all data.
- **Uncovered:** `/uncovered` compares MakanLens and Cal AI against weighed meals (run `npm run eval`). The weighed test set is still being collected, so the error figures read "awaiting test data" until it is.

Not built yet: weight logging and an adaptive calorie target (see Roadmap).

## How it works

1. You take or upload a photo (or type a description). The image is resized in your browser before upload.
2. A vision model (Claude or Google Gemini) names each dish and drink, estimates its **weight in grams** (with a low–high range) and its **cooking method**, and returns JSON that the server checks against a schema. By default the model is run 3 times in parallel and the results are combined by median (`VISION_RUNS`).
3. **The model never decides the calories.** Code looks up nutrition per 100 g: first the local dataset in `data/hawker.json` (the cooking method picks the right variant, e.g. roasted vs steamed chicken rice), then USDA FoodData Central, and only as a last resort the model's own estimate, tagged "AI estimate".
4. Calories and macros = per-100 g values × grams; the kcal range comes from the grams range. Every number is tagged with its source.
5. You check the results, adjust them, and add them to today's log. Everything is stored in `localStorage` on your device; there are no accounts.

## Setup

You need Node.js 20 or later.

```bash
git clone <this-repo-url> makanlens
cd makanlens
npm install
cp .env.example .env.local
```

Open `.env.local` and add a key:

- **Gemini (default, free tier):** get a key from Google AI Studio and set `GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-3.8-flash` if left blank.
- **Claude (optional):** set `VISION_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. `ANTHROPIC_MODEL` defaults to `claude-haiku-5-5`.
- **USDA (optional):** set `USDA_API_KEY` (free from api.data.gov) so search and lookups can use USDA FoodData Central. Without it, search uses the local dataset only.
- **Cost control (optional):** `VISION_RUNS` (default 3) sets how many model runs are combined per photo. Set it to 1 to use a third of the API calls.

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000.

**No API key?** Set `NEXT_PUBLIC_USE_MOCK=1` in `.env.local` to run the interface with sample results. No API calls are made. Without a key and without mock mode, the app shows a "not configured" message instead of failing silently.

**Testing on a phone:** open the Network URL that `npm run dev` prints, on a device on the same Wi-Fi. Photo upload works over plain HTTP. The live barcode camera needs HTTPS, so use `localhost` or the Vercel deployment for it. Manual barcode entry works anywhere.

### Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. In Project Settings → Environment Variables, add `VISION_PROVIDER`, `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`), and optionally `GEMINI_MODEL` or `ANTHROPIC_MODEL`. Set `NEXT_PUBLIC_USE_MOCK` to `0`, or leave it unset.
3. Deploy. No database is needed.

Keys are read only on the server (`app/api/**` and `lib/vision.ts`). Never give a key a `NEXT_PUBLIC_` prefix.

### Other commands

```bash
npm run build      # production build
npm run lint
npx tsc --noEmit   # type check
npm test           # unit tests (vitest)
```

## Data sources and credits

**Important: no dish in the dataset is marked as verified HPB data.** Singapore's HPB Energy & Nutrient Composition database (FOCOS) was discontinued in November 2025, so the values here come from other published sources. Each dish shows its actual publisher in the app.

- **SingHealth HealthXchange**, "Best and Worst Singapore Hawker Food" series, developed with the Dept of Nutrition and Dietetics, KK Women's and Children's Hospital. This covers 30 of the 36 dishes.
- **HealthHub (HPB):** calories and fat for char kway teow. Protein and carbs for that dish come from HealthXchange.
- **FWD Singapore blog**, which cites HPB figures: 3 dishes (steamed chicken rice, plain carrot cake, satay). The HPB original could not be checked.
- **USDA FoodData Central:** 2 simple items (hard-boiled eggs, brewed black coffee as a stand-in for kopi-o-kosong).
- **Most drinks** (kopi, teh tarik, teh peng and others) have no published macros in the sources checked, so they are not in the dataset. They fall back to an AI estimate. Kopi-o-kosong is the only drink with a value, from the USDA item above.

Full details, including serving weights and caveats, are in [`data/SOURCES.md`](data/SOURCES.md). The dataset is meant to be checked: where a dish is confirmed against SG FoodID by hand, its `verified` flag can be set to `true`.

Open Food Facts provides packaged-product data for barcode lookups.

## Disclaimer

Estimates only. Not medical advice.

## Roadmap

- Weight log and an adaptive calorie target (suggested by MacroFactor).
- Verify dishes against SG FoodID and set `verified: true` where confirmed.
- More hawker dishes and drinks with published values.

## Licence

MakanLens is released under the MIT Licence. See [`LICENSE`](LICENSE).
