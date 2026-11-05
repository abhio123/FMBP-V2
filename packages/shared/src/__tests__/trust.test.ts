import { describe, expect, it } from "vitest";
import { isTrusted } from "../trust";

describe("isTrusted (badge)", () => {
  it("needs 3 confirmed deals", () => {
    expect(isTrusted({ completed_deals: 2, rating_count: 0 })).toBe(false);
    expect(isTrusted({ completed_deals: 3, rating_count: 0 })).toBe(true);
  });
  it("is lost with an average below 4 stars", () => {
    expect(isTrusted({ completed_deals: 5, rating_avg: 3.9, rating_count: 4 })).toBe(false);
    expect(isTrusted({ completed_deals: 5, rating_avg: 4, rating_count: 4 })).toBe(true);
  });
  it("handles missing numbers", () => expect(isTrusted({})).toBe(false));
});
