import type { Dish } from "./types";

export function buildPrompt(args: { knownDishes: Pick<Dish, "id" | "name">[]; text?: string }): string {
  const known = args.knownDishes.length
    ? args.knownDishes.map((d) => `- ${d.id}: ${d.name}`).join("\n")
    : "(none)";
  const input = args.text
    ? `The user described their meal in text (may be Singlish, with quantities and modifiers):\n"""${args.text}"""\nAnalyse that description. There is no photo.`
    : "Analyse the attached photo.";

  return `You are a nutrition assistant analysing food in Singapore (hawker centres, kopitiams, food courts).
${input}

Known dishes (id: name). If a dish fits one of these, set "known_dish_id" to that exact id and use its name as the label. Only do so when it is the SAME item, including the drink variant: "kopi" (condensed milk + sugar) is NOT "kopi-o-kosong" (black, no sugar); kopi C, kopi O, teh, teh tarik, milo are all different. Otherwise set "known_dish_id" to null and give a descriptive label.
${known}

Rules:
- Return ONLY JSON, no prose, no markdown, exactly this shape:
{"items":[{"label":string,"known_dish_id":string|null,"portion":number,"confidence":number,"estimate":{"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number}}]}
- Separate every distinct dish and drink into its own item (e.g. nasi lemak + teh tarik = 2 items). Each drink is its own item. A mixed plate (cai fan, economic rice, nasi padang) is ONE item with a combined estimate for rice plus all the dishes on it.
- Use realistic Singapore hawker serving sizes for estimates. For kopitiam drinks, condensed milk and sugar dominate the calories (kopi/teh with milk and sugar is roughly 100-150 kcal; kosong is near 0-30). Quantities like "2 plates" mean one item with portion 2 (max 2).
- "portion" is relative to a standard hawker serving: 1 = a normal plate or bowl, 0.5 = half, 2 = double. Keep between 0.5 and 2.
- "estimate" is your best nutrition estimate for the stated portion (the whole amount of this item, not per 100 g). kcal in kcal, macros in grams.
- "confidence" is 0 to 1.
- Parse Singlish and modifiers: "less rice" -> portion 0.75 for rice dishes; "more"/"extra" -> larger; "small" -> 0.75; "kosong" = no sugar, no milk where relevant (kopi kosong = black coffee without sugar); "siew dai" = less sugar; "gao" = stronger; "peng" = iced; "cai fan 2 veg 1 meat" = one mixed-rice item with 2 vegetable dishes and 1 meat dish.
- Example: "kopi siew dai" -> one item, label "Kopi siew dai (coffee with milk, less sugar)".
- If the input is not food or drink (or nothing edible is visible), return {"items":[]}.`;
}
