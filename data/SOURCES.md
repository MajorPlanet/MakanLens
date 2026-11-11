# Data sources

Access date for all sources: 2026-10-31.

## Important caveat on verification
Updated 2026-11-11: the old statement that SG FoodID "could not be read" is out of date. A full snapshot of SG FoodID is now in `data/sgfoodid.json` (see the "SG FoodID (HPB)" section at the end of this file), and a dish-by-dish comparison is in `data/hawker-sgfoodid.json`. The caveat below describes how `hawker.json` was originally curated (2026-10-31) and is still true of its current values: no dish in `hawker.json` is marked `verified: true` yet.

Original note: The HPB Energy & Nutrient Composition database (FOCOS) was discontinued from 17 Nov 2025 (focos.hpb.gov.sg no longer resolves). Its replacement, SG FoodID (https://www.hpb.gov.sg/healthy-living/food-and-beverage/sgfoodid/ , tool at https://pphtpc.hpb.gov.sg/web/sgfoodid/tools/food-search), is a JavaScript app and its data could not be read at the time. HealthHub's lower-calorie hawker page (https://www.healthhub.sg/live-healthy/1024/lower-calorie-hawker-foods) gives only char kway teow: 744 kcal and 38 g fat, with no protein or carbs; those two values match the HealthXchange row below. To verify, look each dish up in SG FoodID by hand and flip `verified` to true.

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
- The SG FoodID back-end API was not queried during the original curation; it was later snapshotted by `scripts/fetch-sgfoodid.mjs` (see the "SG FoodID (HPB)" section).

## Second pass additions (2026-10-31)
Values in hawker.json are now rounded: kcal to whole numbers, macros to 1 dp (chicken-rice-steamed is 558 kcal).
- char-kway-teow: source name now reads "HealthHub (HPB) kcal/fat; HealthXchange protein/carbs". Still `verified: false` because protein and carbs are not from HPB.
- half-boiled-eggs-2: USDA FoodData Central, SR Legacy fdcId 173424 "Egg, whole, cooked, hard-boiled" (via https://api.nal.usda.gov/fdc/v1/foods/search): per 100 g 155 kcal, P 12.6, C 1.12, F 10.6. Scaled to 100 g for 2 large eggs (about 50 g each); no scaling beyond that. USDA has no soft-boiled entry, so this is the closest cooked-whole-egg match. Real soft-boiled eggs differ slightly. `verified: false`.
- kopi-o-kosong: USDA FoodData Central, SR Legacy fdcId 171890 "Beverages, coffee, brewed, prepared with tap water": per 100 g 1 kcal, P 0.12, C 0, F 0.02. Scaled to 237 g (1 US cup): 2 kcal, P 0.3, C 0, F 0. Local kopi is robusta and cup sizes vary; the value is near zero either way. `verified: false`.
- Not added (no values published for the item itself): kopi, teh-tarik, kopi-o, teh-peng, milo-dinosaur, bandung, sugarcane-juice, kaya-toast-set, cai-fan-2veg-1meat, thosai.
- popiah and yong-tau-foo-soup: a SAFRA NSman page (nsman.safra.sg/?p=13904) was quoted in search results with popiah (2 rolls) 568 kcal and YTF (1 bowl) 265.7 kcal, but I could not open the page (redirects away), its data source is not named, and the YTF carbs (3.7 g) look implausible. Left out.
- Sugar only, no macros: NUH nuhsplus.edu.sg "What's in your dabao" gives sugar in teaspoons (kopi 4, kopi siew dai 3.5, kopi C kosong 0.5, sugarcane juice 5.5). Not used.
- HealthXchange dim sum page (https://www.healthxchange.sg/food-nutrition/food-tips/local-breakfast-choices-is-dim-sum-healthy, HPB figures) gives kcal and fat only; no dish added.

## Phase 8 additions (2026-10-31)
- New fields `per_100g`, `typical_grams`, `method`, `variant_of` added to every dish. `per_100g` = per_serving / serving.grams x 100 (kcal to integers, macros to 1 dp); arithmetic only, null where grams are unknown. `method` and `variant_of` are classifications by the curator, not published values. `penang-laksa` is deliberately not a variant of `laksa` (different recipe).
- New dishes, both HealthXchange (`verified: false`):
  - carrot-cake-black: page row "Fried Carrot Cake" (fried radish with egg and sweet sauce), 295 g, 493 kcal, P 2, C 42, F 35 (hokkien-mee-lor-mee page). The page does not say "black"; I classed it black because of the sweet sauce. It is a variant_of carrot-cake-white.
  - duck-rice-skin-removed: row "Duck Rice - Skin Removed", 350 g, 530 kcal, P 24, C 99, F 11 (duck-rice-fishball-noodle page). variant_of duck-rice-roasted.
- Variants searched for and NOT found with full values (not added): egg roti prata (only a kcal-only 576 kcal for 2 pieces from Daniel Food Diary, no macros or grams), fried fish bee hoon, fried wanton, chicken cutlet rice, fried chicken rice, dry ban mian.
- Serving weights still unknown, left null: chicken-rice-steamed, carrot-cake-white, satay-chicken-10. No HealthXchange page has a steamed chicken rice row (the roasted row is 382 g, but is a different dish and kcal), so the FWD figures were kept without grams. A HealthHub snippet gives white carrot cake 402 kcal and black 556 kcal, which disagrees with the HealthXchange 493 kcal fried carrot cake (different serving/source); not used.
- Eval sample photos: see data/eval/PHOTOS.md.

## Phase 9 additions: sodium, fibre, saturated fat (2026-10-31)
Added `sodium_mg`, `fibre_g` and `satfat_g` to `per_serving` (and to `per_100g` where the serving weight is known; per_100g is arithmetic only: value / serving.grams x 100, sodium to whole mg, others to 1 dp) for 33 dishes. Values are copied as printed from the same HealthXchange (SingHealth, with KKH Dept of Nutrition and Dietetics) pages listed in section 1; each page's table has Saturated Fat, Dietary fibre and Sodium columns. Column order was checked against the raw page HTML for the duck rice, char kway teow and wonton mee pages. `verified` is unchanged (`false`: not HPB).
- Not added (no sourced value): chicken-rice-steamed, carrot-cake-white, satay-chicken-10 (FWD blog gives macros only), half-boiled-eggs-2 and kopi-o-kosong (USDA entries not read for these fields).
- Notes: char-kway-teow saturated fat 29.2 g and wonton-mee-soup saturated fat 0 g are as printed. Two dishes use the nearest page row: laksa is "Laksa Lemak", mee-goreng-mamak is generic "Mee Goreng".
- Sodium is only shown in the app for dishes that have a value.

## SG FoodID (HPB) snapshot (added 2026-11-11)

**What it is.** The Singapore Food Insights Database (SG FoodID), published by the Health Promotion Board; it replaced the FOCOS energy and nutrient composition database. Site: https://pphtpc.hpb.gov.sg/web/sgfoodid . This is an official HPB source, so values taken from it qualify for `verified: true`.

**Snapshot.** `data/sgfoodid.json`, accessed 2026-11-11, 2,692 items. Per item: HPB crId (`id`), name, description, food group, `per100` (kcal, protein, carbs, fat, plus sodium, fibre, saturated fat and sugar where HPB gives them; per 100 g edible portion) and `servings` (first = HPB default serving, in edible grams). Drinks are flagged `drink: true`.

**How to refresh.** `node scripts/fetch-sgfoodid.mjs` (add `--refresh` to re-download everything; otherwise it resumes from `data/cache/sgfoodid`). It reads HPB's public JSON API at about one request a second and identifies itself in the User-Agent.

**Licence.** SG FoodID Terms of Use, sections 10 to 11 (https://file.go.gov.sg/termsofuse-hpbsgfoodid.pdf): the data may be used, copied, distributed and adapted, commercially or not, provided a conspicuous attribution notice is shown and nothing suggests HPB endorses the product. The notice below is written into the snapshot's `attribution` field and must be shown in the app wherever SG FoodID data is used:

> Contains information from Singapore Food Insights Database (SG FoodID) accessed on 2026-11-11 from Health Promotion Board which is made available under the terms found at https://pphtpc.hpb.gov.sg/web/sgfoodid The information contained within this dataset is provided on an "as-is" basis. The data, including but not limited to nutritional information, is subject to inherent limitations. No warranty or representation is made as to the accuracy or completeness of the data contained herein.

(The text was checked against the template in `scripts/fetch-sgfoodid.mjs`; the date matches the snapshot's `accessed` field. If the file is refreshed, copy the new `attribution` string.)

### Comparison of the 38 curated dishes against SG FoodID (`data/hawker-sgfoodid.json`)

Method: each curated dish was matched by meaning to one SG FoodID item. Our per-serving values were compared with HPB's per-serving values two ways: (a) HPB default serving (per100 x HPB default edible grams) and (b) HPB per100 x OUR serving grams (only where we have grams: 35 of 38). The JSON records `kcal_diff_pct` (a) and `kcal_diff_pct_at_our_grams` (b); both are (HPB minus ours) divided by ours. Two dishes' HPB serving is "1 stick" or "1 whole", which I multiplied (satay x10 = 100 g; 2 eggs = 96 g); that arithmetic is mine. All HPB numbers were read from the snapshot; none were estimated. Rounding: kcal to whole numbers, macros to 1 dp.

Match quality: 32 exact, 5 close, 1 partial, 0 none.
- close: nasi-lemak (HPB sells only sets; egg, ikan bilis, peanut set used), mee-goreng-mamak (HPB "Mee goreng" does not say mamak), mutton-dum-biryani (HPB mutton briyani, no "dum"), fried-rice (egg fried rice), sliced-fish-bee-hoon-soup (HPB has no-milk and with-milk versions).
- partial: duck-rice-skin-removed (HPB has no skinless duck rice; roasted duck rice used only as a reference).

Kcal difference, same-grams basis (b; falls back to (a) for the 3 dishes with no grams): median absolute difference 14.9%; 20 of 38 within 15%; largest is kopi-o-kosong (+1450%, because ours is a 2 kcal USDA coffee proxy; HPB gives 13 kcal per 100 g, 31 kcal for 237 g), then wanton-mee-soup (+74.8%), mutton-murtabak (+39.1%), laksa (-36.9%), porridge-pork-century-egg (+34.8%), mutton-dum-biryani (+32.4%), lor-mee (+31.1%). On the as-published-serving basis (a) the median absolute difference is 24.5%, mostly because HPB serving weights are often larger than ours (for example kway chap 928 g vs 611 g, murtabak 345 g vs 211 g).

Dishes differing by more than 15% (same-grams basis): kopi-o-kosong, wanton-mee-soup, mutton-murtabak, laksa, porridge-pork-century-egg, mutton-dum-biryani, lor-mee, wanton-mee-dry (+29.2), prawn-noodles-soup (+26.9), hokkien-mee (+26.2), bak-chor-mee-dry (-23.9), nasi-goreng (-22.2), fishball-noodles-dry (+20.3), bak-chor-mee-soup (+18.5), mee-soto (-17.6), nasi-briyani-chicken (-16.5), prata (+16.3), ban-mian-soup (-15.6). Within 15%: chicken-rice-steamed (-14.9, on HPB's default serving, since we have no grams), carrot-cake-white (+14.9, same reason), nasi-lemak (-14.2) and 17 others, including roti-john (0.1), roasted duck rice (3.0), fishball noodles soup (-7.3), char siew rice (-8.1), mee siam (3.9), char kway teow (4.8), kway chap (3.4).

Cases where our numbers look wrong, not just different (worth checking before the pitch): wanton-mee-soup (290 kcal and 0 g saturated fat vs HPB 507 kcal at the same weight), carrot-cake-white carbs 15.4 g vs HPB 49 g (for 321 g), carrot-cake-black protein 2 g vs HPB 12.6 g, nasi-goreng (our 742 kcal equals HPB's 485 g serving, but we say 377 g), kopi-o-kosong (about 0 kcal vs HPB 13 per 100 g).

### Recommendation (not applied)

Yes: switch the curated dishes to SG FoodID values and mark them `verified: true`, with `source.name` "Health Promotion Board, SG FoodID" and `source.url` https://pphtpc.hpb.gov.sg/web/sgfoodid (plus the crId in the name or an added field if the type allows). Reasons: HPB is the official source the app already promises; 37 of 38 dishes have an exact or close HPB item; several of our existing values (roti john, fishball noodles soup, nasi goreng and others) already coincide with HPB's older figures, so the old HealthXchange numbers were evidently HPB-derived and the switch mostly corrects serving weights; and it removes the weakest sources (FWD blog for chicken rice steamed, carrot cake white and satay, USDA proxies for eggs and kopi). Keep our dish ids, `variant_of`, `method`, aliases and tips, and keep the HPB serving label and grams as the new `serving` so `per_100g` and `typical_grams` come from HPB too. Specific points:
- Use HPB's default serving, not our old grams, for `typical_grams`. HPB's per100 values are the reliable part; some of our grams (nasi goreng, murtabak, ban mian) look unrepresentative.
- Do not mark duck-rice-skin-removed verified; keep it as a variant and leave `verified: false` (or drop it) because HPB has no skinless entry.
- Mark nasi-lemak, mee-goreng-mamak, mutton-dum-biryani, fried-rice and sliced-fish-bee-hoon-soup as verified only if the display name states the HPB item used (for example "Nasi lemak (egg, ikan bilis, peanut set)").
- Tips that quote a kcal saving (for example bak-chor-mee-dry quotes 383 kcal for 597 g soup) must be re-checked after the switch.
- Show the attribution notice above in the app wherever SG FoodID values appear.

### Gaps HPB fills that `hawker.json` lacked (HPB names, crId, per-serving kcal at HPB default serving)
Per-serving kcal is per100 x HPB default grams from the snapshot, rounded.
- Drinks (these were all dropped earlier for lack of a credible value):
  - Teh Tarik (D09020075), 1 small cup 150 g: 72 kcal. Note the HPB serving is a small cup.
  - Kopi (D09010035), 1 regular cup 250 g: 193 kcal. Kopi O (D09010039): 78 kcal. Kopi O kosong (D09010040): 33 kcal. Kopi siu dai (D09010042): 150 kcal. Kopi C (D09010036): 130 kcal. Iced Kopi (D09010032), 400 g: 240 kcal.
  - Teh peng = Iced Teh (D09020053), 400 g: 188 kcal. Also Teh (D09020066), Teh C (D09020067), Teh O (D09020071), siu dai and kosong variants.
  - Milo dinosaur (D04020021), 550 g: 501 kcal. Also Milo, Milo siu dai, Iced Milo, Milo godzilla.
  - Bandung (D05010001), 400 g: 140 kcal.
  - Fresh sugarcane juice (D03040010), 550 g: 303 kcal.
- Yong tau foo (clear soup, 7 pieces, mixed) (F08010063), 771 g: 578 kcal. Boiled 745 g: 82 kcal; fried 928 g: 1,179 kcal; with rice/noodles (F08010064), 971 g: 835 kcal. Laksa-broth versions also exist.
- Popiah (F05020083), 1 whole 191 g: 208 kcal. (The SAFRA figure noted above, 568 kcal for 2 rolls, is about 284 per roll, higher than HPB's 208; the SAFRA page remains unused.)
- Thosai (F05010009), 1 piece 156 g: 393 kcal. Also Masala thosai (F05010005), 271 g: 420 kcal; Paper thosai; Rawa thosai; thosai with egg, cheese or ghee.
- Prata (egg) (F05020090), 1 piece 119 g: 317 kcal. Also egg and onion, cheese and prata bomb variants, and Plain prata (2 pc, with curry) (F05020082), 535 g.
- Economic bee hoon: for example "Economic beehoon with fishcake and egg" (F05060052), 335 g: 482 kcal; several other combinations with chicken wing, cutlet, otah.
- Economic rice, that is cai fan: for example "Economic rice (2 vegetables, 1 meat)" (F05100041), 743 g: 854 kcal; HPB has about 25 combinations (1 to 3 vegetables, 1 to 3 meats, fried or not). This replaces the kcal-only 795 to 987 range from NutriKaki that caused cai-fan to be dropped.
- Kaya toast: HPB has "Kaya and butter toast" (F05020057), 1 piece 94 g: 376 kcal, and kaya toast on white or wholemeal bread by slice, but no "kaya toast set" with eggs and kopi; a set would have to be composed from toast + soft-boiled eggs + kopi.
- Chee cheong fun: Chee cheong fun (plain) (F05100014), 1 roll 262 g: 333 kcal; Char siew (F05100012), 228 g: 308 kcal; Prawn (F05100109), 118 g: 137 kcal.
- Desserts: Ice kacang (F02020007), 1 bowl 425 g: 268 kcal; also Pulut srikaya, Pandan kaya cake and others in the Desserts group.
- Other common hawker items present: Bak kut teh (soup) (F06100003) and (dry), claypot chicken rice (F05100022), soya sauce chicken rice (F05100131), braised duck rice set (F05100007), sliced fish hor fun, satay beehoon, Penang prawn noodles, char siew / prawn / you tiao chee cheong fun, chicken satay with sauce (F11020021), pork, beef and mutton satay, and Yong tau foo laksa versions.

Not checked: fruit juice, other desserts and the long tail of the 2,692 items. This section was produced offline from the snapshot with text searches; the snapshot file itself was not modified.

## Switch to HPB values (2026-11-11)
37 of the 38 curated dishes in `hawker.json` now use HPB SG FoodID values and are marked `verified: true`: `per_100g`, the serving (HPB's default portion, edible grams), `typical_grams` and `per_serving` (= per_100g × grams). Sodium, fibre and saturated fat are HPB's where reported. `source.name` names the HPB item and its crId. Ids, aliases, `method`, `variant_of` and tips are kept. The five "close" matches take HPB's item name as the display name: Nasi lemak (egg, ikan bilis, peanut set), Mee goreng, Nasi briyani (mutton), Egg fried rice, Sliced fish beehoon soup (no milk). The satay and egg servings are HPB per-item weights × 10 sticks and × 2 eggs.
- Not switched: `duck-rice-skin-removed` (HPB has no skinless item), which stays HealthXchange and `verified: false`.
- Tips re-checked against the new values. Only the bak chor mee tip quoted numbers (now HPB's 518 vs 538 kcal). The comparative claims (steamed beats roasted chicken rice, white beats black carrot cake) still hold in HPB's data.
- `hawker-sgfoodid.json` keeps the pre-switch comparison ("ours" = the old HealthXchange values) as a record.
