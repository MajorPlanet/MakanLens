# Data sources

Access date for all sources: 2026-10-31.

## Important caveat on verification
No dish is marked `verified: true`. The HPB Energy & Nutrient Composition database (FOCOS) was discontinued from 17 Nov 2025 (focos.hpb.gov.sg no longer resolves). Its replacement, SG FoodID (https://www.hpb.gov.sg/healthy-living/food-and-beverage/sgfoodid/ , tool at https://pphtpc.hpb.gov.sg/web/sgfoodid/tools/food-search), is a JavaScript app and its data could not be read. HealthHub's lower-calorie hawker page (https://www.healthhub.sg/live-healthy/1024/lower-calorie-hawker-foods) gives only char kway teow: 744 kcal and 38 g fat, with no protein or carbs; those two values match the HealthXchange row below. To verify, look each dish up in SG FoodID by hand and flip `verified` to true.

## 1. HealthXchange (SingHealth), "Best and Worst Singapore Hawker Food" series
Content developed with the Dept of Nutrition and Dietetics, KK Women's and Children's Hospital (page ref "S13"). Reputable, but not HPB or a government page. `verified: false`. Values are per the stated serving weight, as printed on the page. Serving weights are in `serving.grams`.
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-chinese-food-duck-rice-fishball-noodle : char-siew-rice, chicken-rice-roasted, duck-rice-roasted, fishball-noodles-soup, fishball-noodles-dry
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-malay-breakfast-foods-nasi-lemak-mee-siam-soto : nasi-lemak, mee-siam, mee-rebus, mee-soto
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-chinese-food-dim-sum-char-kway-teow : char-kway-teow, ban-mian-soup
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-chinese-food-hokkien-mee-lor-mee : hokkien-mee, fried-rice, kway-chap, laksa, lor-mee, bak-chor-mee-dry
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-chinese-food-wonton-mee : bak-chor-mee-soup, penang-laksa, porridge-pork-century-egg, prawn-noodles-soup, sliced-fish-bee-hoon-soup, wanton-mee-dry, wanton-mee-soup
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-malay-foods-biryani-rendang-lemak-cili-padi : nasi-briyani-chicken, nasi-goreng, mee-goreng-mamak
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-indian-noodles-rice-dishes-mutton-dum-biryani-indian-rojak : mutton-dum-biryani
- https://www.healthxchange.sg/food-nutrition/food-tips/best-worst-singapore-hawker-indian-breads-prata-mutton-murtabak : roti-prata-plain (1 piece, 70 g), roti-john, mutton-murtabak

Caveats: `laksa` is the page's "Laksa Lemak" (540 g). `mee-goreng-mamak` is the page's generic "Mee Goreng" (309 g), not specifically mamak style. `ban-mian-soup` is the page's "Ban Mian" (528 g), which does not state whether it is soup. `nasi-lemak` is the basic 210 g plate and excludes extras such as chicken wing. `bak-chor-mee-dry` is listed as "Minced Pork Noodle (Dry)".

## 2. FWD Singapore blog (figures credited to the Health Promotion Board)
https://www.fwd.com.sg/blog/health-safety/enjoying-hawker-foods-without-compromising-on-health/ . A commercial blog that cites HPB (focos.hpb.gov.sg) in a footnote; I could not check the HPB original. `verified: false`. No serving weights are given.
- chicken-rice-steamed: 557.7 kcal, P 28.05, C 80.19, F 13.86 ("per serving", steamed chicken).
- carrot-cake-white: "Carrot cake with egg, plain, mashed and fried": 402.5 kcal, P 12.25, C 15.4, F 32.55.
- satay-chicken-10: the page gives "Satay" per stick (21.36 kcal, P 2.46, C 1.8, F 0.49). The entry is 10 times that value, which is my arithmetic, not a published figure. The page does not say which meat, so "chicken" is an assumption.
- The page's "economic fried kway teow" (278 kcal) and "nasi lemak with chicken wing" (884 kcal) were not used.

## Dishes dropped (no credible per-serving macros found)
chicken-rice-steamed is included. Dropped: roti-prata-egg, thosai, carrot-cake-black, cai-fan-2veg-1meat (only a kcal range, 795 to 987, from NutriKaki, which gives no macros), yong-tau-foo-soup, popiah, chee-cheong-fun, economic-bee-hoon, kaya-toast-set, half-boiled-eggs-2, teh-tarik, kopi, kopi-o, kopi-o-kosong, teh-peng, milo-dinosaur, bandung, sugarcane-juice, ice-kachang. Blog and crowd-sourced figures (FatSecret, LadyIronChef) for drinks conflict and lack stated sources, so they were not used.

## Other
- Plain-text kcal-only sources seen but not used: NutriKaki (nutrikaki.com), Couz-Nutri (couz-nutri.com).
- The SG FoodID back-end API was not queried.

## Second pass additions (2026-10-31)
Values in hawker.json are now rounded: kcal to whole numbers, macros to 1 dp (chicken-rice-steamed is 558 kcal).
- char-kway-teow: source name now reads "HealthHub (HPB) kcal/fat; HealthXchange protein/carbs". Still `verified: false` because protein and carbs are not from HPB.
- half-boiled-eggs-2: USDA FoodData Central, SR Legacy fdcId 173424 "Egg, whole, cooked, hard-boiled" (via https://api.nal.usda.gov/fdc/v1/foods/search): per 100 g 155 kcal, P 12.6, C 1.12, F 10.6. Scaled to 100 g for 2 large eggs (about 50 g each); no scaling beyond that. USDA has no soft-boiled entry, so this is the closest cooked-whole-egg match. Real soft-boiled eggs differ slightly. `verified: false`.
- kopi-o-kosong: USDA FoodData Central, SR Legacy fdcId 171890 "Beverages, coffee, brewed, prepared with tap water": per 100 g 1 kcal, P 0.12, C 0, F 0.02. Scaled to 237 g (1 US cup): 2 kcal, P 0.3, C 0, F 0. Local kopi is robusta and cup sizes vary; the value is near zero either way. `verified: false`.
- Not added (no values published for the item itself): kopi, teh-tarik, kopi-o, teh-peng, milo-dinosaur, bandung, sugarcane-juice, kaya-toast-set, cai-fan-2veg-1meat, thosai.
- popiah and yong-tau-foo-soup: a SAFRA NSman page (nsman.safra.sg/?p=13904) was quoted in search results with popiah (2 rolls) 568 kcal and YTF (1 bowl) 265.7 kcal, but I could not open the page (redirects away), its data source is not named, and the YTF carbs (3.7 g) look implausible. Left out.
- Sugar only, no macros: NUH nuhsplus.edu.sg "What's in your dabao" gives sugar in teaspoons (kopi 4, kopi siew dai 3.5, kopi C kosong 0.5, sugarcane juice 5.5). Not used.
- HealthXchange dim sum page (https://www.healthxchange.sg/food-nutrition/food-tips/local-breakfast-choices-is-dim-sum-healthy, HPB figures) gives kcal and fat only; no dish added.
