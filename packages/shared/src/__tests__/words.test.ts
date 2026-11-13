import { describe, expect, it } from "vitest";
import { cleanWord } from "../words";

describe("cleanWord (what may be counted as a word people use)", () => {
  it("keeps real words, short ones and Hindi, tidied", () => {
    expect(cleanWord("  LED   Light ")).toBe("led light");
    expect(cleanWord("AC")).toBe("ac");
    expect(cleanWord("ब्लाउज़")).toBe("ब्लाउज़");
    expect(cleanWord("7 seater")).toBe("7 seater");
  });

  it("never keeps private text or noise", () => {
    for (const bad of ["98765 43210", "+91 9876543210", "९८७६५४३२१०", "me@mail.com", "www.shop.in", "https://x.in", "!!!", "12", "a", "", null, undefined, "x".repeat(41)]) {
      expect(cleanWord(bad)).toBeNull();
    }
  });
});
