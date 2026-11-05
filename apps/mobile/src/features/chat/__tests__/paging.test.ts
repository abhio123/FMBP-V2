import { appendMessage, mergeNewest, prependOlder, type MessageRow } from "../api";

/** message `n` sent at minute n */
const m = (n: number, extra: Partial<MessageRow> = {}): MessageRow => ({
  id: `m${n}`, conversation_id: "c", sender_business_id: "b", body: `#${n}`, attachment_url: null, read_at: null,
  created_at: new Date(Date.UTC(2026, 10, 4, 10, n)).toISOString(), post_id: null, reply_to_id: null, ...extra,
});
const ids = (rows: MessageRow[]) => rows.map((r) => r.id);

describe("chat paging (load a page at a time)", () => {
  it("first load is the newest page as it is", () => {
    const page = { rows: [m(3), m(4)], hasOlder: true };
    expect(mergeNewest(undefined, page)).toBe(page);
  });

  it("a refresh keeps the earlier pages, adds new messages and takes updates (read) from the server", () => {
    const loaded = { rows: [m(1), m(2), m(3), m(4)], hasOlder: true };
    const refreshed = mergeNewest(loaded, { rows: [m(3), m(4, { read_at: "now" }), m(5)], hasOlder: true });
    expect(ids(refreshed.rows)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(refreshed.rows[3].read_at).toBe("now");
    expect(refreshed.hasOlder).toBe(true);
  });

  it("a refresh that does not reach what is loaded replaces it (no hole in the chat)", () => {
    const loaded = { rows: [m(1), m(2)], hasOlder: false };
    const page = { rows: [m(10), m(11)], hasOlder: true };
    expect(mergeNewest(loaded, page)).toBe(page);
  });

  it("knows there is nothing earlier once a page says so", () => {
    expect(mergeNewest({ rows: [m(1)], hasOlder: true }, { rows: [m(1), m(2)], hasOlder: false }).hasOlder).toBe(false);
  });

  it("Load earlier puts the earlier page in front, once", () => {
    const w = prependOlder({ rows: [m(3), m(4)], hasOlder: true }, { rows: [m(1), m(2), m(3)], hasOlder: false });
    expect(ids(w.rows)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(w.hasOlder).toBe(false);
  });

  it("a sent or live message is added at the end once", () => {
    const w = appendMessage({ rows: [m(1)], hasOlder: true }, m(2));
    expect(ids(appendMessage(w, m(2)).rows)).toEqual(["m1", "m2"]);
    expect(appendMessage(undefined, m(1)).rows).toHaveLength(1);
  });
});
