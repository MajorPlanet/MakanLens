import { describe, expect, it } from "vitest";
import {
  analyseRequestSchema,
  MAX_IMAGE_B64,
  modelOutputSchema,
} from "@/lib/schemas";

const goodItem = {
  label: "Hainanese chicken rice",
  known_dish_id: "chicken-rice-steamed",
  portion: 1,
  confidence: 0.9,
  estimate: { kcal: 607, protein_g: 30, carbs_g: 70, fat_g: 20 },
};

describe("modelOutputSchema (AI JSON)", () => {
  it("accepts valid model JSON", () => {
    const r = modelOutputSchema.safeParse({ items: [goodItem] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items[0].known_dish_id).toBe("chicken-rice-steamed");
  });

  it("accepts a null known_dish_id for an unmatched dish", () => {
    const r = modelOutputSchema.safeParse({ items: [{ ...goodItem, known_dish_id: null }] });
    expect(r.success).toBe(true);
  });

  it("accepts an empty items list (non-food photo)", () => {
    const r = modelOutputSchema.safeParse({ items: [] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items).toHaveLength(0);
  });

  it("rejects a missing items key", () => {
    const r = modelOutputSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects an item with no estimate", () => {
    const noEstimate: Partial<typeof goodItem> = { ...goodItem };
    delete noEstimate.estimate;
    const r = modelOutputSchema.safeParse({ items: [noEstimate] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes("estimate"))).toBe(true);
  });

  it("rejects an estimate with a numeric string (wrong type)", () => {
    const r = modelOutputSchema.safeParse({
      items: [{ ...goodItem, estimate: { ...goodItem.estimate, kcal: "607" } }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty label", () => {
    const r = modelOutputSchema.safeParse({ items: [{ ...goodItem, label: "" }] });
    expect(r.success).toBe(false);
  });

  it("rejects items that are not an array", () => {
    const r = modelOutputSchema.safeParse({ items: goodItem });
    expect(r.success).toBe(false);
  });

  it("falls back to portion 1 when portion is not a number (lenient field)", () => {
    const r = modelOutputSchema.safeParse({ items: [{ ...goodItem, portion: "big" }] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items[0].portion).toBe(1);
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
