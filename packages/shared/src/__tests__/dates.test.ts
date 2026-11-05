import { describe, expect, it } from "vitest";
import { formatDate, daysUntil, formatTime, dayLabel, isNewDay } from "../dates";

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

describe("chat dates", () => {
  const now = new Date(2026, 10, 4, 15, 0); // 4 Nov 2026, 3 pm local
  it("formatTime: 12-hour clock, same on every phone", () => {
    expect(formatTime(new Date(2026, 10, 4, 9, 5))).toBe("9:05 am");
    expect(formatTime(new Date(2026, 10, 4, 0, 30))).toBe("12:30 am");
    expect(formatTime(new Date(2026, 10, 4, 12, 0))).toBe("12:00 pm");
    expect(formatTime(new Date(2026, 10, 4, 16, 30))).toBe("4:30 pm");
    expect(formatTime("nope")).toBe("");
  });
  it("dayLabel: Today, Yesterday, then the date", () => {
    expect(dayLabel(new Date(2026, 10, 4, 0, 1), "en", now)).toBe("Today");
    expect(dayLabel(new Date(2026, 10, 3, 23, 59), "en", now)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 10, 3, 8, 0), "hi", now)).toBe("कल");
    expect(dayLabel(new Date(2026, 10, 2, 8, 0), "en", now)).toBe("2 Nov 2026");
    expect(dayLabel(new Date(2026, 10, 4), "hi", now)).toBe("आज");
  });
  it("dayLabel: yesterday across a month boundary", () => {
    expect(dayLabel(new Date(2026, 9, 31, 22, 0), "en", new Date(2026, 10, 1, 9, 0))).toBe("Yesterday");
  });
  it("isNewDay: a heading before the first message and wherever the day changes", () => {
    expect(isNewDay(null, now)).toBe(true);
    expect(isNewDay(new Date(2026, 10, 4, 9, 0), now)).toBe(false);
    expect(isNewDay(new Date(2026, 10, 3, 23, 59), new Date(2026, 10, 4, 0, 1))).toBe(true);
  });
});
