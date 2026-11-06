import { routeForNotification } from "../api";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("routeForNotification", () => {
  it("opens the right screen for each kind of push", () => {
    expect(routeForNotification({ kind: "message", conversation_id: "c1" })).toEqual({ pathname: "/chat/[id]", params: { id: "c1" } });
    expect(routeForNotification({ kind: "deal_proposed", deal_id: "d1" })).toEqual({ pathname: "/business/deals" });
    // from admins
    expect(routeForNotification({ kind: "verification_result", approved: true })).toEqual({ pathname: "/business/verify" });
    expect(routeForNotification({ kind: "post_removed", post_id: "p1" })).toEqual({ pathname: "/business/my-posts" });
    expect(routeForNotification({ kind: "broadcast" })).toEqual({ pathname: "/(tabs)/feed" });
    // suspension: the app shows the right screen by itself
    expect(routeForNotification({ kind: "account_suspended" })).toBeNull();
    expect(routeForNotification(null)).toBeNull();
  });
});

describe("inboxIcon (one line icon per kind of notification)", () => {
  it("has an icon for every kind the server sends, and a bell for anything new", () => {
    const { inboxIcon } = jest.requireActual("../api") as typeof import("../api");
    for (const k of ["broadcast", "response", "followed_post", "deal_proposed", "deal_confirmed", "verification_result", "post_removed", "account_suspended", "account_restored"]) {
      expect(inboxIcon(k)).not.toBe("notifications-outline");
    }
    expect(inboxIcon("something_new")).toBe("notifications-outline");
  });
});
