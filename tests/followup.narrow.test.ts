import { describe, expect, test } from "vitest";
import { applyFollowUpOption, attachFollowUp, getDish, itemFromDish } from "@/lib/matcher";
import { withGrams } from "@/lib/nutrition";
import type { FollowUp } from "@/lib/types";

const followUp: FollowUp = {
  question: "Steamed or roasted?",
  options: [
    { label: "Steamed", dishId: "chicken-rice-steamed" },
    { label: "Roasted", dishId: "chicken-rice-roasted" },
  ],
};

describe("follow-up narrows the range", () => {
  const dish = getDish("chicken-rice-roasted")!;
  const base = withGrams({ ...itemFromDish(dish, 1), gramsRange: [300, 460] }, 380, dish.typical_grams);
  const pending = attachFollowUp(base, followUp);
  const width = (r: [number, number]) => r[1] - r[0];

  test("pending range covers every option", () => {
    for (const o of followUp.options) {
      const r = applyFollowUpOption(base, o).kcalRange;
      expect(pending.kcalRange[0]).toBeLessThanOrEqual(r[0]);
      expect(pending.kcalRange[1]).toBeGreaterThanOrEqual(r[1]);
    }
  });

  test("answering narrows (or keeps) the range and drops the question", () => {
    for (const o of followUp.options) {
      const answered = applyFollowUpOption(pending, o);
      expect(answered.followUp).toBeUndefined();
      expect(width(answered.kcalRange)).toBeLessThanOrEqual(width(pending.kcalRange));
    }
    const narrowedSomewhere = followUp.options.some((o) => width(applyFollowUpOption(pending, o).kcalRange) < width(pending.kcalRange));
    expect(narrowedSomewhere).toBe(true);
  });
});
