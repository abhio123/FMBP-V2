import { dealsToDo, type MyDeal } from "../api";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const deal = (p: Partial<MyDeal>): MyDeal => ({
  id: "d", status: "proposed", post_id: "p", post_title: "Need a salesperson", post_icon: null, i_am_owner: false,
  other_id: "b", other_name: "My Sweet Shop", other_logo: null, created_at: "2026-11-05T10:00:00Z", completed_at: null,
  counted: false, my_rating: null, their_rating: null, ...p,
});

describe("dealsToDo (what My deals asks of me)", () => {
  it("deals I was named in wait for my confirmation; my own proposals do not", () => {
    const r = dealsToDo([deal({ id: "1" }), deal({ id: "2", i_am_owner: true })]);
    expect(r.toConfirm.map((d) => d.id)).toEqual(["1"]);
  });
  it("confirmed deals I have not rated ask for a rating, from both sides", () => {
    const r = dealsToDo([deal({ id: "1", status: "completed" }), deal({ id: "2", status: "completed", i_am_owner: true }), deal({ id: "3", status: "completed", my_rating: 5 })]);
    expect(r.toRate.map((d) => d.id)).toEqual(["1", "2"]);
    expect(r.count).toBe(2);
  });
});
