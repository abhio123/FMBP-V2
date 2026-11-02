import { highlightSegments, highlightTerms } from "../highlight";

const marked = (text: string, q: string) => highlightSegments(text, highlightTerms(q)).filter((s) => s.match).map((s) => s.text);

describe("search highlight", () => {
  it("marks only the typed letters, not the whole word", () => {
    const segments = highlightSegments("Fresh jalebi and jaledar", highlightTerms("jale"));
    expect(segments).toEqual([
      { text: "Fresh ", match: false },
      { text: "jale", match: true }, { text: "bi and ", match: false },
      { text: "jale", match: true }, { text: "dar", match: false },
    ]);
  });

  it("is case-insensitive and keeps the original casing", () => {
    expect(marked("Jalebi Machine in Greater Noida", "JALE mach")).toEqual(["Jale", "Mach"]);
  });

  it("matches inside words too, like the search does", () => {
    expect(marked("Selling machine", "ell")).toEqual(["ell"]);
  });

  it("prefers the longer term when terms overlap", () => {
    expect(marked("jalebi", "jale jalebi")).toEqual(["jalebi"]);
  });

  it("never changes the text: segments join back to the original", () => {
    const text = "Need ₹5 lakh — to expand (jalebi) shop, Noida!";
    expect(highlightSegments(text, highlightTerms("jale noi")).map((s) => s.text).join("")).toBe(text);
  });

  it("treats regex characters in the query as plain text", () => {
    expect(marked("Price (approx.) 5000", "(approx.)")).toEqual(["approx"]);
    expect(() => highlightSegments("a+b", ["+b", "a["])).not.toThrow();
  });

  it("ignores 1-letter terms and punctuation in the query", () => {
    expect(highlightTerms("a  jale, ma!")).toEqual(["jale", "ma"]);
    expect(marked("a big jalebi", "a")).toEqual([]);
  });

  it("works for Hindi (only the typed letters)", () => {
    expect(marked("जलेबी बनाने की मशीन बेचनी है", "जले")).toEqual(["जले"]);
  });

  it("returns the text unmarked when there is nothing to highlight", () => {
    expect(highlightSegments("Selling machine", [])).toEqual([{ text: "Selling machine", match: false }]);
    expect(marked("Selling machine", "xyz")).toEqual([]);
  });
});
