import { hasLink, splitLinks } from "../links";

describe("splitLinks (tappable links in broadcasts)", () => {
  it("finds https and www links in the middle of a sentence; the full stop is not part of the link", () => {
    expect(splitLinks("Diwali offer: see https://fmbp.app/offer. Happy Diwali")).toEqual([
      { text: "Diwali offer: see " }, { text: "https://fmbp.app/offer", url: "https://fmbp.app/offer" }, { text: ". Happy Diwali" },
    ]);
    expect(splitLinks("Visit www.fmbp.app!")).toEqual([{ text: "Visit " }, { text: "www.fmbp.app", url: "https://www.fmbp.app" }, { text: "!" }]);
  });

  it("keeps query strings and several links; plain text stays one part", () => {
    expect(splitLinks("a https://x.in/p?id=1&lang=hi b http://y.in").filter((p) => p.url).map((p) => p.url))
      .toEqual(["https://x.in/p?id=1&lang=hi", "http://y.in"]);
    expect(splitLinks("No link here")).toEqual([{ text: "No link here" }]);
  });

  it("never makes other kinds of links tappable", () => {
    expect(hasLink("javascript:alert(1)")).toBe(false);
    expect(hasLink("call tel:+919999900000")).toBe(false);
    expect(hasLink("fmbp://post/1")).toBe(false);
    expect(hasLink("just https://")).toBe(false);
  });
});
