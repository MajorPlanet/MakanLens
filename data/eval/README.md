# MakanLens eval set

`meals.json` holds one entry per weighed meal. The two entries now (m01, m02) are SAMPLES with public photos and no weights. Replace them with real meals.

## Adding a meal
1. Photograph the plate before eating: one top-down shot and one at about 45 degrees, with a card (bank card) next to the plate for scale. Save the one you want tested as `data/eval/photos/mNN.jpg`.
2. Weigh each component separately on a kitchen scale (rice, chicken, gravy, egg and so on). Subtract the plate or bowl weight. Put the grams in `components[].grams_weighed`.
3. Compute `true_kcal` = sum of (grams x kcal per 100 g). Use `per_100g` from `data/hawker.json` for the dish, or USDA FoodData Central for single ingredients. Where `per_100g` is null (chicken-rice-steamed, carrot-cake-white, satay-chicken-10) use USDA for the components.
4. Upload the same photo to Cal AI and write its number in `calai_kcal`.
5. Run `npm run eval`. Results are written to `data/eval-results.json` and shown on `/uncovered`.

Format: `[{"id","photo","dish","components":[{"name","grams_weighed"}],"true_kcal","calai_kcal","notes"}]`. Use null for anything not measured. Photo credits for sample photos are in `PHOTOS.md`.
