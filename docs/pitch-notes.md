# MakanLens: pitch notes (3 minutes)

Track: NUS Hackers, Autonomous SG 2026. Brief: reverse engineer an opaque, expensive app and build something better, open source. Target: Cal AI.

## Judging criteria and what to say

**Cost of status quo (20%)**
- Cal AI and MyFitnessPal charge for photo logging.
- Hawker food is hard for generic trackers: one plate can hold several dishes, and portions vary.
- Cost per user before vs after: [TEAM TO FILL]
- Cal AI price: [TEAM TO FILL]

**Reach (15%)**
- Free, no account, runs in a phone browser. Nothing to install.
- Works in English, Singlish, and by typing or speaking the meal.
- Local dish names in Chinese, Malay and Tamil aliases.
- User numbers: [TEAM TO FILL] (only state numbers that exist)

**What we uncovered (evidence)**
- Show `/uncovered`: the same hawker dishes, Cal AI's estimate vs the reference value, with error %.
- Reference values come from published sources (see honesty note below). The Cal AI and MakanLens columns are still being filled in: [TEAM TO FILL]
- Do not show the page with numbers that have not been measured.

**Coolness of the live demo (25%)**
- Follow the demo steps below. This is the highest-weighted criterion.

**Cost reduction (25%)**
- The default vision provider (Gemini) has a free tier. Check current limits in Google AI Studio before quoting a per-user cost.
- No database, no backend accounts. All user data stays in the browser.
- Cost per user before vs after: [TEAM TO FILL]

**Open-source licence (15%)**
- MIT licence (`LICENSE`), public repo, setup in `README.md`.
- Anyone can deploy to Vercel with their own key.

## Honesty note (say this before someone asks)

- HPB's FOCOS food composition database was discontinued in November 2025. We could not use "official HPB data".
- The 36 dishes come mainly from SingHealth HealthXchange (written with KK Women's and Children's Hospital dietitians). Char kway teow calories and fat come from HealthHub (HPB). 3 dishes come from an FWD blog citing HPB, and 2 simple items come from USDA FoodData Central.
- Most drinks have no published macros, so they use an AI estimate.
- The app shows the real publisher on every number. No dish is marked as verified HPB data.
- Replacing these with SG FoodID values is on the roadmap.

## Live demo steps (about 90 seconds)

1. Open the Vercel URL on a phone. Show the disclaimer in the footer ("Estimates only. Not medical advice.").
2. Onboarding: enter a profile. Show the daily target (Mifflin-St Jeor).
3. Snap a plate of chicken rice (or upload a photo). Show the loading state.
4. Results card: point at the confidence badge and the source tag (publisher name, linked).
5. Move the portion slider to 2×: the numbers update instantly. Swap the dish from the dropdown.
6. Add to today. Show the calorie ring and macro bars update, and the swap tip.
7. Reload the page: the entry is still there.
8. Type "1 plate char kway teow and kopi": two items come back.
9. Optional: scan a packaged drink barcode (`/scan`), or show a non-food photo ("no food found" message).
10. Show `/uncovered` and the History page.

**Fallbacks**
- If the live vision call fails, use `NEXT_PUBLIC_USE_MOCK=1` (sample results, no API calls) and say so.
- Live barcode camera needs HTTPS. Use the Vercel URL, or fall back to manual barcode entry.

## Questions to expect

- "Is this medically accurate?" No. Estimates only, not medical advice. Values come from published sources, and the app shows which one.
- "Why not HPB data?" FOCOS was discontinued in November 2025. The replacement, SG FoodID, is a JavaScript app, and we could not read its data in time.
- "What about the AI estimates?" Shown with an "AI estimate" tag, and the user can adjust portions or swap the dish.
- "Is the data private?" Yes. Entries live in `localStorage`. Photos are sent to the vision provider for analysis only. Check the provider's policy before relying on this.

## Not built (do not claim)

- Weight log and adaptive calorie target (stretch goal, roadmap only).
