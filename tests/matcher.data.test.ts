import { describe, expect, it } from "vitest";
import { matchItem } from "@/lib/matcher";

const m = (label: string, known: string | null = null) =>
  matchItem({ label, known_dish_id: known, portion: 1, confidence: 0.8, estimate: { kcal: 123, protein_g: 1, carbs_g: 1, fat_g: 1 } });

describe("matcher on real data", () => {
  const yes: [string, string | null][] = [
    ["Hainanese chicken rice", "chicken-rice-steamed"], ["chicken rice", "chicken-rice-steamed"],
    ["char kway teow", "char-kway-teow"], ["CKT", "char-kway-teow"], ["炒粿条", "char-kway-teow"],
    ["fried kway teow", "char-kway-teow"], ["roti prata", "roti-prata-plain"], ["prata", "roti-prata-plain"],
    ["wonton noodles", "wanton-mee-dry"], ["kopi o kosong", "kopi-o-kosong"], ["black coffee", "kopi-o-kosong"],
    ["nasi lemak", null], ["laksa", null], ["bak chor mee", null], ["Mee goreng", null], ["half boiled eggs", null],
  ];
  it.each(yes)("matches %s", (label, id) => {
    const r = m(label);
    expect(r.dishId).not.toBeNull();
    if (id) expect(r.dishId).toBe(id);
  });

  it.each(["kopi", "kopi c", "kopi o", "kopi siew dai", "teh tarik", "teh", "milo", "pizza", "burger", "economic rice"])(
    "does not match %s", (label) => {
      const r = m(label);
      expect(r.dishId).toBeNull();
      expect(r.source).toBe("ai_estimate");
    });

  it("distrusts a model id contradicting modifiers", () => {
    expect(m("Kopi", "kopi-o-kosong").dishId).toBeNull();
    expect(m("Kopi O Kosong", "kopi-o-kosong").dishId).toBe("kopi-o-kosong");
  });
});
