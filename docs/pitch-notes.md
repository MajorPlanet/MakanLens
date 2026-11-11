# MakanLens: pitch notes (3 minutes)

Track: NUS Hackers, Autonomous SG 2026. Brief: reverse engineer an opaque, expensive app and build something better, open source. Target: Cal AI.

## Judging criteria and what to say

**Cost of status quo (20%)**
- Cal AI and MyFitnessPal charge for photo logging.
- Hawker food is hard for generic trackers: one plate can hold several dishes, and portions vary.
- Cal AI price: US$29.99/year (≈US$2.50/month) on the common annual plan; App Store lists "Unlimited" at 5 different prices (US$2.99 to US$29.99). Sources in README "Target: Cal AI".
- MakanLens: US$0 to the user, no account, no subscription.

**Reach (15%)**
- Free, no account, runs in a phone browser. It installs to the home screen from the browser menu, with no app store.
- One ＋ Log sheet with six ways in: camera, photo library, describe (type or speak), search, barcode and label scan.
- Works in English, Singlish, and Chinese, Malay and Tamil aliases for local dish names.
- Cal AI reach: 5M+ downloads in 8 months (founder via TechCrunch, unverified), 373K App Store ratings. Sources in README.

**Data: thousands of HPB items at $0 (supports cost and reach)**
- HPB's Singapore Food Insights Database (SG FoodID) is in the app: about 2,700 Singapore foods and drinks, with lab-analysed per-100 g values. It is a local snapshot, so a lookup makes no API call and costs nothing.
- Lookup order: your own foods, then the 38 curated hawker dishes, then SG FoodID, then USDA FoodData Central, then an AI estimate as a last resort. Every number shows its source.
- Use is under the SG FoodID Terms of Use, with the attribution notice shown in the app and in the README.
- Be exact about the split: SG FoodID items are HPB's own figures. The 38 curated dishes are still from HealthXchange (SingHealth, with KKH dietitians), not HPB.

**What we uncovered (evidence)**
- Show `/uncovered` (Profile → About our data): the same hawker dishes, Cal AI's estimate vs the reference value, with error %.
- Reference values come from published sources (see honesty note below). The weighed test set is not complete, so make no accuracy claim.
- Do not show the page with numbers that have not been measured.

**Coolness of the live demo (25%)**
- Follow the demo steps below. This is the highest-weighted criterion.

**Cost reduction (25%)**
- We run Claude Haiku 5.5 (US$0.10 / US$0.50 per 1M tokens). Gemini is a free-tier alternative.
- No database, no backend accounts. All user data stays on the device (localStorage and IndexedDB). Nutrition lookups run locally, so only the photo analysis calls an API.
- Cost per user per month: Cal AI US$2.50 (cheapest plan) vs MakanLens at most US$0.27 on Claude Haiku 5.5 (what we run, 3 runs per photo), or US$0 on Gemini free tier. Working in README "Before and after".

**Open-source licence (15%)**
- MIT licence (`LICENSE`), public repo, setup in `README.md`.
- Anyone can deploy to Vercel with their own key.
- The data licences are handled too: SG FoodID's attribution notice is in the README and the app; USDA is public domain; Open Food Facts is ODbL.

## Honesty note (say this before someone asks)

- HPB's older FOCOS database was discontinued in November 2025. Its replacement, SG FoodID, is now in the app as a snapshot of about 2,700 items, with HPB named as the source.
- The 38 curated dishes come mainly from SingHealth HealthXchange (written with KK Women's and Children's Hospital dietitians). Char kway teow calories and fat come from HealthHub (HPB). 3 dishes come from an FWD blog citing HPB, and 2 simple items come from USDA FoodData Central.
- Most drinks have no published macros in those sources, so they use SG FoodID where HPB lists them, or an AI estimate.
- No curated dish is marked as verified HPB data. The app shows the real publisher on every number.

## Live demo steps (about 3 minutes)

1. Open the Vercel URL on a phone. Show the disclaimer in the footer ("Estimates only. Not medical advice.").
2. Onboarding: enter a profile. Show the daily target (Mifflin-St Jeor).
3. Tap ＋ Log → Camera, and snap a plate of chicken rice (or upload a photo). Show the loading state.
4. Results card: point at the kcal range, the confidence badge and the source tag (publisher name, linked).
5. Move the grams slider up: the numbers update instantly. Swap the dish from the dropdown.
6. Add to today. Show the calorie ring and macro bars update, and the swap tip.
7. Reload the page: the entry is still there.
8. ＋ Log → Describe, type "1 plate char kway teow and kopi": two items come back.
9. Foods tab: search for a SG FoodID item, or show a new food. Mention that SG FoodID is HPB's own data.
10. Profile → Weight Goal: set "lose 0.5 kg a week for 12 weeks", then try 2 kg a week to show the safety cap and the floor.
11. Optional: ＋ Log → Barcode for a packaged drink, or show a non-food photo ("no food found" message).
12. Show Profile → About our data (`/uncovered`) and Trends.

**Fallbacks**
- Check the Gemini or Anthropic key has credit before the demo. The Anthropic key had no credit in testing.
- If the live vision call fails, use `NEXT_PUBLIC_USE_MOCK=1` (sample results, no API calls) and say so.
- Live barcode camera needs HTTPS. Use the Vercel URL, or fall back to manual barcode entry.

## Questions to expect

- "Is this medically accurate?" No. Estimates only, not medical advice. Values come from published sources, and the app shows which one.
- "Why not use HPB data?" We do, for about 2,700 items: SG FoodID, HPB's own lab-analysed values. The 38 curated dishes are still HealthXchange-sourced, and we say so.
- "Can you use HPB's data?" Yes, under the SG FoodID Terms of Use, with the attribution notice shown in the app. HPB does not endorse MakanLens.
- "What about the AI estimates?" Shown with an "AI estimate" tag, and the user can adjust grams or swap the dish.
- "Is the data private?" Yes. Your log, foods and goals live on your device. Photos are sent to the vision provider for analysis only. Check the provider's policy before relying on this.

## Not built (do not claim)

- Weight log and adaptive calorie target (stretch goal, roadmap only).
- Accuracy figures for `/uncovered` (the weighed test set is not complete).
