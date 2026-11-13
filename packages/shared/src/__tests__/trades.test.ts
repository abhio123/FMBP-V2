import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRADES, TRADE_INCLUDES, findTrade, tradeIncludes, tradeLabel, tradeSearchText } from "../trades";

const job = (JSON.parse(readFileSync(new URL("../../../../supabase/forms/post/offer_work.json", import.meta.url), "utf8")) as {
  fields: { key: string; options?: { value: string }[] }[];
}).fields.find((f) => f.key === "job")!;

describe("TRADES (what an individual does)", () => {
  it("has unique values, both languages and a category for each", () => {
    expect(new Set(TRADES.map((t) => t.value)).size).toBe(TRADES.length);
    for (const t of TRADES) {
      expect(t.value).toMatch(/^[a-z_]{2,30}$/); // the database check on businesses.trade
      expect(t.en && t.hi && t.icon && t.category).toBeTruthy();
    }
  });

  it("covers every job of the Looking for work form, so the profile and its posts use the same words", () => {
    for (const o of job.options!) expect(findTrade(o.value)).toBeTruthy();
  });

  it("labels: the trade's name, or their own words for Other", () => {
    expect(tradeLabel("barber", null, "hi")).toBe("नाई");
    expect(tradeLabel("other", " Bhatura maker ", "en")).toBe("Bhatura maker");
    expect(tradeLabel("other", "", "en")).toBe("Other");
    expect(tradeLabel(null, null, "en")).toBeNull();
  });
});

describe("what each trade includes (the ⓘ)", () => {
  it("every trade says what it covers, in both languages, with the same number of items", () => {
    for (const t of TRADES) {
      const inc = TRADE_INCLUDES[t.value];
      expect(inc?.en.length, t.value).toBeGreaterThan(0);
      expect(inc.hi.length, t.value).toBe(inc.en.length);
    }
    expect(Object.keys(TRADE_INCLUDES).sort()).toEqual(TRADES.map((t) => t.value).sort()); // nothing left over
  });

  it("reads in the app's language and feeds search", () => {
    expect(tradeIncludes("tailor", "en")).toContain("Alterations & repairs");
    expect(tradeIncludes("nothing", "en")).toEqual([]);
    expect(tradeSearchText("tailor")).toContain("blouse");
    expect(tradeSearchText("tailor")).toContain("ब्लाउज़");
  });
});
