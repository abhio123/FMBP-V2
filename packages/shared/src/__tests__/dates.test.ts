import { describe, expect, it } from "vitest";
import { formatDate, daysUntil } from "../dates";

describe("formatDate", () => {
  it("formats day, short month and year in English and Hindi", () => {
    const d = new Date(2026, 11, 1, 10, 0); // 1 Dec 2026, local time
    expect(formatDate(d)).toBe("1 Dec 2026");
    expect(formatDate(d, "hi")).toBe("1 दिस॰ 2026");
  });
  it("accepts ISO strings and ignores invalid input", () => {
    expect(formatDate(new Date(2026, 0, 31).toISOString())).toBe("31 Jan 2026");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("daysUntil", () => {
  const now = new Date(2026, 10, 1, 12, 0).getTime();
  it("counts down whole days, rounding up", () => {
    expect(daysUntil(new Date(now + 30 * 86_400_000), now)).toBe(30);
    expect(daysUntil(new Date(now + 29.2 * 86_400_000), now)).toBe(30);
    expect(daysUntil(new Date(now + 3_600_000), now)).toBe(1);
  });
  it("never goes below zero", () => {
    expect(daysUntil(new Date(now - 86_400_000), now)).toBe(0);
  });
});
