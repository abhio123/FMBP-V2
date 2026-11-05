import { shorten } from "../text";

describe("shorten (post title in a chat message)", () => {
  it("keeps 20 letters and adds … when longer", () => {
    expect(shorten("Offering Franchise in Greater Noida", 20)).toBe("Offering Franchise i…");
    expect(shorten("Need a salesperson", 20)).toBe("Need a salesperson");
    expect(shorten("Exactly twenty chars", 20)).toBe("Exactly twenty chars");
  });
  it("does not end on a space", () => {
    expect(shorten("Offering Franchise  in Noida", 19)).toBe("Offering Franchise…");
  });
  it("never cuts a Hindi letter apart", () => {
    // 'दुकान बढ़ाने के लिए ₹5 लाख चाहिए': the cut moves past vowel signs and joined letters
    const out = shorten("दुकान बढ़ाने के लिए ₹5 लाख चाहिए", 4);
    expect(out).toBe("दुका…");
    expect(shorten("क्षेत्र में दुकान", 2)).toBe("क्षे…");
  });
});
