# MakanLens

Snap or describe a Singapore hawker meal and get calories and macros in seconds. Free, open source (MIT), and private: your log lives in your browser.

![MakanLens screenshot](docs/screenshot.png)

## Why

Cal AI and MyFitnessPal charge for photo logging. Hawker food is hard for generic trackers: a plate of char kway teow or nasi lemak has no single "correct" entry. MakanLens is free and open, does not require an account, and uses published Singapore nutrition figures for local dishes wherever it can. Every number shows where it came from.

## Target: Cal AI

**What it is.** Cal AI is a photo calorie-tracking app: snap a meal, get calories and macros. It is free to download, but photo logging needs a paid "Unlimited" subscription.

**How many people use it.**
- Over 5 million downloads in its first eight months, and over US$2 million revenue in one month (founder's figures; TechCrunch notes it could not verify them). Source: [TechCrunch, 16 Mar 2025](https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/).
- 373K ratings (4.8 average) on the US App Store. Source: [App Store listing](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616), checked 31 Oct 2026.

**What it costs today.** The App Store listing shows 10 in-app purchases, with the same "Unlimited" product listed at US$2.99, $5.99, $9.99, $19.99 and $29.99 ([App Store listing](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616), checked 31 Oct 2026). The commonly reported annual plan is **US$29.99/year ≈ US$2.50 per user per month** ([eesel.ai pricing summary](https://www.eesel.ai/blog/cal-ai-pricing)); weekly plans reported at US$3.99/week come to about US$207/year ([Nutrola](https://nutrola.app/en/blog/why-is-cal-ai-so-expensive)). We use the cheapest figure, US$2.50/month, so the comparison below does not overstate the saving.

## What we uncovered

- **Prices are not fixed.** The public listing shows one product ("Unlimited") at five different prices, which matches reports that the paywall price is tested per user. You cannot know in advance what you will be charged.
- **The expensive part is cheap.** A photo estimate is one vision-model call. With the setup below, one photo costs about one US cent in API tokens at paid rates, and nothing on Gemini's free tier. The subscription price is not driven by running costs.
- **Generic models guess local food.** A vision model alone invents a calorie figure. MakanLens has the model identify the dish, grams and cooking method only, then takes calories from published Singapore nutrition data (38 hawker dishes, sources in [`data/SOURCES.md`](data/SOURCES.md)), and shows the source on every number.
- **Still to measure:** `/uncovered` compares MakanLens and Cal AI against weighed meals. The weighed test set is not complete yet, so we make no accuracy claim.

## Before and after: cost per user per month

| | Cal AI | MakanLens |
|---|---|---|
| Price to the user | US$2.50 (annual plan) to ~US$17 (weekly plan) | **US$0** (MIT, no account, no subscription) |
| Running cost, Gemini free tier | n/a | **US$0** |
| Running cost, Gemini paid tier, `VISION_RUNS=3` | n/a | ~US$0.97 |
| Running cost, Gemini paid tier, `VISION_RUNS=1` | n/a | ~US$0.32 |
| Hosting | n/a | US$0 (static + serverless on Vercel Hobby; no database) |

How the running cost is worked out (estimate, stated assumptions):
- Model `gemini-3.8-flash`, Standard paid tier: US$0.75 per 1M input tokens, US$3.75 per 1M output tokens (through 31 Dec 2026). Source: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), checked 31 Oct 2026. The same page lists a free tier for this model.
- Per call: about 2,300 input tokens (a photo resized to 1024 px, about 1,300 tokens assumed, plus the prompt) and about 500 output tokens (JSON). That is about US$0.0036 per call.
- 3 photos a day × 30 days = 90 photos a month. With 3 runs per photo: 90 × 3 × 0.0036 ≈ US$0.97.
- Prices on that page double from 1 Jan 2027 (about US$1.94 a month at 3 runs). Even then it stays below Cal AI's cheapest plan, and on the free tier it is US$0.

**Saving:** US$2.50 to US$0 per user per month for anyone running MakanLens on the free tier (100%), and at least 61% when paying for API calls.

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
git clone https://github.com/MajorPlanet/MakanLens.git makanlens
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

- **SingHealth HealthXchange**, "Best and Worst Singapore Hawker Food" series, developed with the Dept of Nutrition and Dietetics, KK Women's and Children's Hospital. This covers 33 of the 38 dishes.
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
