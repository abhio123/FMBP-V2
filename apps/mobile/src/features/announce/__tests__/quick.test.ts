import { isAnnouncement } from "../api";
import { quickAnnouncement, quickTitle, STARTERS } from "../quick";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("quick announcement", () => {
  it("turns each starter into an existing announcement type with its answers filled", () => {
    expect(quickAnnouncement("new_stock", " Fresh mangoes ")).toEqual({ typeSlug: "announce_new_stock", basic: { items: "Fresh mangoes" } });
    expect(quickAnnouncement("offer_today", "10% off")).toEqual({ typeSlug: "announce_offer", basic: { offer: "10% off", valid_till: "today" } });
    expect(quickAnnouncement("festival", "Diwali boxes")).toEqual({ typeSlug: "announce_offer", basic: { offer: "Diwali boxes", valid_till: "week" } });
    expect(quickAnnouncement("price", "Cement ₹380")).toEqual({ typeSlug: "announce_price_list", basic: { items: "Cement ₹380", change: "new_list", effective: "today" } });
    expect(quickAnnouncement("news", "Open on Sundays")).toEqual({ typeSlug: "announce_news", basic: { kind: "other", headline: "Open on Sundays" } });
    for (const s of STARTERS) expect(quickAnnouncement(s, "x").typeSlug.startsWith("announce_")).toBe(true);
  });

  it("keeps the line and the title within the limits", () => {
    expect((quickAnnouncement("new_stock", "a".repeat(500)).basic.items as string).length).toBe(100);
    expect(quickTitle("New stock", "a".repeat(500)).length).toBe(150);
    expect(quickTitle("New stock", " Fresh mangoes ")).toBe("New stock: Fresh mangoes");
  });

  it("knows an announcement by its post type", () => {
    expect(isAnnouncement({ post_type: { slug: "announce_offer" } })).toBe(true);
    expect(isAnnouncement({ post_type: { slug: "need_supplier" } })).toBe(false);
    expect(isAnnouncement({ post_type: null })).toBe(false);
  });
});
