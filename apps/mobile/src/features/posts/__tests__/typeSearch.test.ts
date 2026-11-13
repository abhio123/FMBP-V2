import { findTypes, otherAnswers } from "../typeSearch";

const type = (slug: string, label: string, extra: { examples_en?: string[]; examples_hi?: string[]; keywords?: string } = {}) => ({
  slug, name_en: label, name_hi: label, plain_label_en: label, plain_label_hi: label, advanced_label_en: null, advanced_label_hi: null, ...extra,
});
const types = [
  type("need_machine", "Need Machine?"),
  type("need_employee", "Need Staff?", { keywords: "barber nai cook" }),
  type("need_skilled_person", "Need a Cook, Tailor…?", { examples_hi: ["नाई और ब्यूटीशियन"], keywords: "barber tandoor roti maker child care" }),
  type("teach_skill", "Can You Teach?"),
  type("need_other", "Need Something Else?"),
];
const slugs = (q: string) => findTypes(types, q).list.map((t) => t.slug);

describe("finding a post type by what it covers", () => {
  it("shows everything before a search", () => {
    expect(slugs("  ")).toHaveLength(types.length);
    expect(findTypes(types, "").notInList).toBe(false);
  });

  it("finds a type through its search words and examples, in any word order and in Hindi", () => {
    expect(slugs("barber")).toEqual(["need_employee", "need_skilled_person", "need_other"]);
    expect(slugs("maker tandoor")).toEqual(["need_skilled_person", "need_other"]);
    expect(slugs("CHILD care")).toEqual(["need_skilled_person", "need_other"]);
    expect(slugs("नाई")).toEqual(["need_skilled_person", "need_other"]);
  });

  it("lists the types that name the word before those that only cover it", () => {
    expect(slugs("cook")).toEqual(["need_skilled_person", "need_employee", "need_other"]);
  });

  it("matches the start of a word, so short words do not find unrelated ones", () => {
    expect(slugs("ac")).toEqual(["need_other"]); // not "machine", not "teach"
    expect(slugs("tea")).toEqual(["teach_skill", "need_other"]);
  });

  it("keeps Something else, and says so, when nothing covers the word", () => {
    expect(findTypes(types, "golgappe")).toEqual({ list: [expect.objectContaining({ slug: "need_other" })], notInList: true });
  });

  it("carries the searched word into the first answer of Something else", () => {
    expect(otherAnswers("need_other", " golgappe ")).toEqual({ what: "other", what_other: "golgappe" });
    expect(otherAnswers("offer_other", "child care")).toEqual({ what: "child care" });
    expect(otherAnswers("need_shop", "x")).toEqual({});
    expect(otherAnswers("need_other", "  ")).toEqual({});
  });
});
