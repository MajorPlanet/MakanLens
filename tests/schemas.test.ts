import { describe, expect, it } from "vitest";
import {
  analyseRequestSchema,
  MAX_IMAGE_B64,
  modelOutputSchema,
} from "@/lib/schemas";

const goodItem = {
  label: "steamed chicken rice",
  known_dish_id: "chicken-rice-steamed",
  components: [{ name: "rice", grams: 220 }, { name: "steamed chicken", grams: 90 }],
  grams: 330, grams_low: 280, grams_high: 400,
  method: "steamed", confidence: 0.8, reference_object: "card",
  ambiguity: null, fallback_kcal_per_100g: null,
};

describe("modelOutputSchema (AI JSON, Phase 8)", () => {
  it("accepts valid model JSON", () => {
    const r = modelOutputSchema.safeParse({ items: [goodItem] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items[0].known_dish_id).toBe("chicken-rice-steamed");
      expect(r.data.items[0].grams_high).toBe(400);
      expect(r.data.items[0].method).toBe("steamed");
    }
  });

  it("accepts an ambiguity with options", () => {
    const amb = { question: "Fried or steamed?", options: [{ label: "Steamed", known_dish_id: "a" }, { label: "Roasted", known_dish_id: null }] };
    const r = modelOutputSchema.safeParse({ items: [{ ...goodItem, ambiguity: amb }] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items[0].ambiguity?.options).toHaveLength(2);
  });

  it("accepts an empty items list (non-food photo)", () => {
    const r = modelOutputSchema.safeParse({ items: [] });
    expect(r.success).toBe(true);
  });

  it("rejects a missing items key and non-array items", () => {
    expect(modelOutputSchema.safeParse({}).success).toBe(false);
    expect(modelOutputSchema.safeParse({ items: goodItem }).success).toBe(false);
  });

  it("rejects an empty or missing label", () => {
    expect(modelOutputSchema.safeParse({ items: [{ ...goodItem, label: "" }] }).success).toBe(false);
    const { label: _l, ...noLabel } = goodItem;
    void _l;
    expect(modelOutputSchema.safeParse({ items: [noLabel] }).success).toBe(false);
  });

  it("is lenient: bad optional fields fall back to safe defaults", () => {
    const r = modelOutputSchema.safeParse({
      items: [{ label: "x", method: "baked", reference_object: "ruler", grams: "big", confidence: "high", grams_low: -5, ambiguity: "?", fallback_kcal_per_100g: "n/a" }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const i = r.data.items[0];
      expect(i.method).toBe("unknown");
      expect(i.reference_object).toBe("none");
      expect(i.grams).toBe(0);
      expect(i.confidence).toBe(0.5);
      expect(i.grams_low).toBeNull();
      expect(i.ambiguity).toBeNull();
      expect(i.fallback_kcal_per_100g).toBeNull();
      expect(i.components).toEqual([]);
      expect(i.known_dish_id).toBeNull();
    }
  });
});

describe("analyseRequestSchema (request bodies)", () => {
  it("accepts text only", () => {
    const r = analyseRequestSchema.safeParse({ text: "1 plate char kway teow and kopi" });
    expect(r.success).toBe(true);
  });

  it("accepts image only", () => {
    const r = analyseRequestSchema.safeParse({ image: "aGVsbG8=" });
    expect(r.success).toBe(true);
  });

  it("rejects neither image nor text", () => {
    const r = analyseRequestSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects whitespace-only text (trimmed to empty)", () => {
    const r = analyseRequestSchema.safeParse({ text: "   " });
    expect(r.success).toBe(false);
  });

  it("accepts text of exactly 500 chars", () => {
    const r = analyseRequestSchema.safeParse({ text: "a".repeat(500) });
    expect(r.success).toBe(true);
  });

  it("rejects text over 500 chars", () => {
    const r = analyseRequestSchema.safeParse({ text: "a".repeat(501) });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("500");
  });

  it("rejects an image over the 4 MB base64 limit", () => {
    const r = analyseRequestSchema.safeParse({ image: "a".repeat(MAX_IMAGE_B64 + 1) });
    expect(r.success).toBe(false);
  });
});
