import { topicStarts } from "../api";

const m = (id: string, post_id: string | null = null) => ({ id, post_id });

describe("topicStarts (where a post card goes in a chat)", () => {
  it("marks the first message about a post, and every switch to another post", () => {
    const starts = topicStarts([m("1", "P1"), m("2"), m("3", "P1"), m("4", "P2"), m("5"), m("6", "P1")]);
    expect([...starts.entries()]).toEqual([["1", "P1"], ["4", "P2"], ["6", "P1"]]);
  });

  it("puts no card on untagged chats or on repeats of the same post", () => {
    expect(topicStarts([m("1"), m("2")]).size).toBe(0);
    expect([...topicStarts([m("1", "P1"), m("2", "P1"), m("3", "P1")]).keys()]).toEqual(["1"]);
  });
});
