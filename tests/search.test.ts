import { describe, expect, it } from "vitest";
import { mergeResults, searchLocal, usdaResults } from "@/lib/search";
import { usdaSearchSchema } from "@/lib/schemas";

describe("search", () => {
  it("finds local dishes by name and alias", () => {
    const r = searchLocal("laksa");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].name.toLowerCase()).toContain("laksa");
    expect(r[0].source).toBe("hpb");
    expect(searchLocal("x")).toEqual([]);
  });

  it("ranks local dishes above USDA results and caps at 15", () => {
    const usda = usdaResults(usdaSearchSchema.parse({
      foods: Array.from({ length: 20 }, (_, i) => ({
        fdcId: i, description: `Laksa-like ${i}`, foodNutrients: [{ nutrientNumber: "208", value: 100 }],
      })),
    }));
    expect(usda[0].source).toBe("usda");
    const local = searchLocal("laksa");
    const merged = mergeResults(local, usda);
    expect(merged.length).toBeLessThanOrEqual(15);
    expect(merged.slice(0, local.length)).toEqual(local);
    expect(merged.slice(local.length).every((m) => m.source === "usda")).toBe(true);
  });

  it("skips USDA foods without energy", () => {
    const r = usdaResults(usdaSearchSchema.parse({ foods: [{ fdcId: 1, description: "x", foodNutrients: [] }] }));
    expect(r).toEqual([]);
  });
});
