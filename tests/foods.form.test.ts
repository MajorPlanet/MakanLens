import { describe, expect, it } from "vitest";
import { addAliases, diffAgainstOriginal, macroKcal, macroMismatch, parseFoodForm, valuesFromFood } from "@/components/foods/foodFormLogic";
import type { FoodRecord } from "@/lib/types";

const valid = { ...valuesFromFood(undefined, "Kaya toast"), kcal: "300", protein: "8", carbs: "40", fat: "12" };

describe("parseFoodForm", () => {
  it("requires a name and the four macros", () => {
    const r = parseFoodForm(valuesFromFood());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["carbs", "fat", "kcal", "name", "protein"]);
  });
  it("rejects negatives and text, accepts zero", () => {
    expect(parseFoodForm({ ...valid, fat: "-1" }).ok).toBe(false);
    expect(parseFoodForm({ ...valid, protein: "abc" }).ok).toBe(false);
    expect(parseFoodForm({ ...valid, fat: "0" }).ok).toBe(true);
  });
  it("builds a FoodInput with optional fields only when given", () => {
    const r = parseFoodForm({ ...valid, grams: "120", sodium: "450", aliases: ["ya kun"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.serving).toEqual({ label: "1 serving", grams: 120 });
      expect(r.input.per_serving).toEqual({ kcal: 300, protein_g: 8, carbs_g: 40, fat_g: 12, sodium_mg: 450 });
      expect(r.input.notes).toBeUndefined();
    }
  });
  it("treats zero grams as invalid", () => {
    expect(parseFoodForm({ ...valid, grams: "0" }).ok).toBe(false);
  });
});

describe("macro check", () => {
  it("uses 4/4/9", () => expect(macroKcal(8, 40, 12)).toBe(300));
  it("warns only above 15% difference", () => {
    expect(macroMismatch(300, 300)).toBe(false);
    expect(macroMismatch(300, 340)).toBe(false);
    expect(macroMismatch(300, 360)).toBe(true);
    expect(macroMismatch(0, 5)).toBe(false);
  });
});

describe("addAliases", () => {
  it("splits on commas, trims and de-duplicates", () => {
    expect(addAliases(["Kaya"], "kaya, 咖椰吐司 , toast")).toEqual(["Kaya", "咖椰吐司", "toast"]);
  });
});

describe("diffAgainstOriginal", () => {
  const original: FoodRecord = {
    id: "laksa", origin: "builtin", name: "Laksa", aliases: ["叻沙"], serving: { label: "1 bowl", grams: 450 },
    per_serving: { kcal: 589, protein_g: 20, carbs_g: 60, fat_g: 30 }, per_100g: null, source: { name: "HPB" }, createdAt: 0, updatedAt: 0,
  };
  it("is empty when nothing changed", () => {
    const r = parseFoodForm(valuesFromFood(original));
    expect(r.ok && diffAgainstOriginal(r.input, original)).toEqual({});
  });
  it("lists only changed fields", () => {
    const r = parseFoodForm({ ...valuesFromFood(original), kcal: "500" });
    expect(r.ok && Object.keys(diffAgainstOriginal(r.input, original))).toEqual(["per_serving"]);
  });
});
