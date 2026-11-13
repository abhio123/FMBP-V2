import { placeName, regionOptions, wordsToCsv } from "../words";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const labels = { all: "All", allCities: (s: string) => `${s} (all)`, unknown: "Not known" };

describe("words people use: region filter and spreadsheet", () => {
  it("offers everything, then states by use, then cities; a profile without a city is still reachable", () => {
    const options = regionOptions([
      { state: "Karnataka", city: "Bengaluru", uses: 9 },
      { state: "Uttar Pradesh", city: "Noida", uses: 5 },
      { state: "Uttar Pradesh", city: "Ithaira", uses: 6 },
      { state: "", city: "", uses: 1 },
    ], labels);
    expect(options.map((o) => o.label)).toEqual(["All", "Uttar Pradesh (all)", "Karnataka (all)", "Bengaluru, Karnataka", "Noida, Uttar Pradesh", "Ithaira, Uttar Pradesh", "Not known"]);
    expect(options[1]).toMatchObject({ state: "Uttar Pradesh", city: null });
    expect(options[6]).toMatchObject({ state: "", city: "" });
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });

  it("writes a safe spreadsheet: quotes, Hindi, and formulas turned into plain text", () => {
    const csv = wordsToCsv([
      { word: 'led "tube"', status: "new", flow: "search", source: "search", section: "", city: "Noida, UP", state: "Uttar Pradesh", uses: 3, found_nothing: 1 },
      { word: "=cmd()", status: "added", flow: "profile", source: "other_trade", section: "", city: "नोएडा", state: "", uses: 1, found_nothing: 0 },
      { word: "-x", status: "ignored", flow: "post", source: "form_list", section: "offer_work.job", city: "", state: "", uses: 1, found_nothing: 0 },
    ]).split("\n");
    expect(csv[0]).toBe('"word","status","flow","source","section","city","state","uses","found_nothing"');
    expect(csv[1]).toBe('"led ""tube""","new","search","search","","Noida, UP","Uttar Pradesh","3","1"');
    expect(csv[2]).toContain(`"'=cmd()"`);
    expect(csv[2]).toContain('"नोएडा"');
    expect(csv[3]).toContain(`"'-x","ignored","post","form_list","offer_work.job"`);
  });

  it("names the place a word came from, in the admin's language", () => {
    const labels = { source: (s: string) => `[${s}]`, section: (s: string) => `<${s}>` };
    const place = { source: "form_list", section: "offer_work.job", uses: 1, type_en: "Looking for Work", type_hi: "काम चाहिए", field_en: "Your work", field_hi: null };
    expect(placeName(place, false, labels)).toBe("[form_list]: Looking for Work › Your work");
    expect(placeName(place, true, labels)).toBe("[form_list]: काम चाहिए › Your work"); // no Hindi label: English rather than nothing
    expect(placeName({ ...place, source: "type_list", section: "need", type_en: null, type_hi: null, field_en: null }, false, labels)).toBe("[type_list]: <need>");
    expect(placeName({ ...place, source: "search", section: "", type_en: null, type_hi: null, field_en: null }, false, labels)).toBe("[search]");
  });
});
