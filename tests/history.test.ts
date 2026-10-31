import { describe, expect, it } from "vitest";
import { currentStreak, entriesToCsv, lastDays } from "@/lib/history";
import type { AnalysedItem, LogEntry } from "@/lib/types";

// Local-time "today" at noon, so DST and timezone shifts cannot move the date.
const TODAY = new Date(2026, 9, 31, 12); // 31 Oct 2026 (Saturday)

function localDay(daysAgo: number): string {
  const d = new Date(2026, 9, 31 - daysAgo, 12);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function item(overrides: Partial<AnalysedItem> & { kcal?: number } = {}): AnalysedItem {
  const { kcal = 500, ...rest } = overrides;
  return {
    label: "Chicken rice",
    dishId: "chicken-rice-steamed",
    portion: 1,
    confidence: 0.9,
    nutrition: { kcal, protein_g: 20, carbs_g: 60, fat_g: 10 },
    source: "hpb",
    sourceUrl: "https://www.hpb.gov.sg/",
    candidates: [],
    ...rest,
  };
}

function entry(daysAgo: number, overrides: Partial<LogEntry> = {}, itemOverrides: Partial<AnalysedItem> & { kcal?: number } = {}): LogEntry {
  return {
    id: `e-${daysAgo}-${Math.random()}`,
    date: localDay(daysAgo),
    slot: "lunch",
    createdAt: 1_000 + daysAgo,
    item: item(itemOverrides),
    ...overrides,
  };
}

describe("lastDays", () => {
  it("returns 7 days, oldest first, with today last", () => {
    const days = lastDays([], 7, TODAY);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe(localDay(6));
    expect(days[6].date).toBe(localDay(0));
    expect(days[6].date).toBe("2026-10-31");
    expect(days[6].label).toBe("Sat");
  });

  it("sums kcal per day and rounds the total", () => {
    const entries = [entry(0, {}, { kcal: 500 }), entry(0, {}, { kcal: 300.4 }), entry(2, {}, { kcal: 650 })];
    const days = lastDays(entries, 7, TODAY);
    expect(days[6].kcal).toBe(800);
    expect(days[4].kcal).toBe(650);
    expect(days[5].kcal).toBe(0);
  });

  it("ignores entries older than the window", () => {
    const entries = [entry(7, {}, { kcal: 999 }), entry(10, {}, { kcal: 999 })];
    const days = lastDays(entries, 7, TODAY);
    expect(days.every((d) => d.kcal === 0)).toBe(true);
  });

  it("includes the day exactly 6 days ago (edge of the 7-day window)", () => {
    const days = lastDays([entry(6, {}, { kcal: 400 })], 7, TODAY);
    expect(days[0].kcal).toBe(400);
  });

  it("works across a month boundary", () => {
    const nov1 = new Date(2026, 10, 1, 12);
    const days = lastDays([{ ...entry(0), date: "2026-10-30", item: item({ kcal: 250 }) }], 7, nov1);
    // Window is 25 Oct .. 1 Nov; 30 Oct is 2 days before today (index 4).
    expect(days[4].date).toBe("2026-10-30");
    expect(days[4].kcal).toBe(250);
    expect(days[5].date).toBe("2026-10-31");
    expect(days[6].date).toBe("2026-11-01");
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const entries = [entry(0), entry(1), entry(2)];
    expect(currentStreak(entries, TODAY)).toBe(3);
  });

  it("stays alive when only yesterday is logged (today not logged yet)", () => {
    const entries = [entry(1), entry(2)];
    expect(currentStreak(entries, TODAY)).toBe(2);
  });

  it("breaks at a gap", () => {
    // Today and two days ago, but not yesterday: streak is just today.
    const entries = [entry(0), entry(2), entry(3)];
    expect(currentStreak(entries, TODAY)).toBe(1);
  });

  it("is 0 when neither today nor yesterday is logged", () => {
    const entries = [entry(2), entry(3)];
    expect(currentStreak(entries, TODAY)).toBe(0);
  });

  it("is 0 with no entries", () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it("counts a day once even with several entries", () => {
    const entries = [entry(0), entry(0), entry(0), entry(1)];
    expect(currentStreak(entries, TODAY)).toBe(2);
  });

  it("carries across a month boundary", () => {
    const nov1 = new Date(2026, 10, 1, 12);
    const entries = [
      { ...entry(0), date: "2026-11-01" },
      { ...entry(0), date: "2026-10-31" },
      { ...entry(0), date: "2026-10-30" },
    ];
    expect(currentStreak(entries, nov1)).toBe(3);
  });
});

describe("entriesToCsv", () => {
  const HEADER = "date,slot,dish,label,portion,kcal,protein_g,carbs_g,fat_g,source,source_url";

  function rows(csv: string): string[] {
    return csv.slice(1).split("\r\n").filter((l) => l.length > 0);
  }

  it("starts with a UTF-8 BOM, uses CRLF and ends with a newline", () => {
    const csv = entriesToCsv([entry(0)]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.slice(1).split("\r\n")[0]).toBe(HEADER);
  });

  it("writes only the header for no entries", () => {
    expect(rows(entriesToCsv([]))).toEqual([HEADER]);
  });

  it("quotes a field containing a comma", () => {
    const csv = entriesToCsv([entry(0, {}, { label: "Chicken rice, steamed" })]);
    expect(csv).toContain('"Chicken rice, steamed"');
  });

  it("doubles quotes inside a quoted field", () => {
    const csv = entriesToCsv([entry(0, {}, { label: 'Teh "C" kosong' })]);
    expect(csv).toContain('"Teh ""C"" kosong"');
  });

  it("quotes a field containing a newline without splitting the row", () => {
    const csv = entriesToCsv([entry(0, {}, { label: "line one\nline two" })]);
    expect(csv).toContain('"line one\nline two"');
    // Header plus one logical row: the embedded LF is inside quotes.
    expect(rows(csv)).toHaveLength(2);
  });

  it("quotes a field containing a carriage return", () => {
    const csv = entriesToCsv([entry(0, {}, { label: "a\rb" })]);
    expect(csv).toContain('"a\rb"');
  });

  it("sorts by date, then by createdAt", () => {
    const csv = entriesToCsv([
      entry(0, { createdAt: 300, id: "late" }, { label: "later" }),
      entry(1, { createdAt: 50, id: "old" }, { label: "older day" }),
      entry(0, { createdAt: 100, id: "early" }, { label: "earlier" }),
    ]);
    const body = rows(csv).slice(1);
    expect(body[0]).toContain("older day");
    expect(body[1]).toContain("earlier");
    expect(body[2]).toContain("later");
  });

  it("rounds kcal to whole numbers and macros to 1 dp", () => {
    const csv = entriesToCsv([entry(0, {}, { kcal: 123.6 })]);
    const cols = rows(csv)[1].split(",");
    expect(cols[5]).toBe("124");
    expect(cols[6]).toBe("20");
  });

  it("leaves dish and source_url empty when absent", () => {
    const csv = entriesToCsv([entry(0, {}, { dishId: null, sourceUrl: undefined })]);
    const cols = rows(csv)[1].split(",");
    expect(cols[2]).toBe("");
    expect(cols[10]).toBe("");
  });
});
