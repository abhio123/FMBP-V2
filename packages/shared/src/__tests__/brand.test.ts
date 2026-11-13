import { describe, expect, it } from "vitest";
import { BRAND, COMPANY, fillBrand } from "../brand.ts";
import { INFO_IS_DRAFT, INFO_PAGES } from "../info.ts";
import { coarseCoordinate, TEXT_LIMITS } from "../limits.ts";

describe("brand: one place for the public name and the company details", () => {
  it("the information pages carry the name and company details from brand.ts, with nothing left to fill", () => {
    const all = JSON.stringify(INFO_PAGES);
    expect(all).toContain(BRAND.appName);
    expect(all).toContain(COMPANY.legalName);
    expect(all).toContain(COMPANY.grievanceOfficerName);
    expect(all).not.toMatch(/FMBP|\[to be filled|\{\{(appName|company\w*|grievance\w*|jurisdictionCity)\}\}/);
    expect(all).toContain("{{supportEmail}}"); // filled by the screen that shows the page
  });

  it("sample company details keep the draft note on the pages", () => {
    if (COMPANY.isSample) expect(INFO_IS_DRAFT).toBe(true);
  });

  it("fills only the placeholders it knows", () => {
    expect(fillBrand("{{appName}} · {{supportEmail}} · {{unknown}}")).toBe(`${BRAND.appName} · {{supportEmail}} · {{unknown}}`);
  });
});

describe("limits", () => {
  it("rounds a place to the 0.01 degree grid (about 1 km)", () => {
    expect(coarseCoordinate(28.570834)).toBe(28.57);
    expect(coarseCoordinate(77.325971)).toBe(77.33);
    expect(coarseCoordinate(77.3361)).toBe(77.34);
    expect(Object.is(coarseCoordinate(-0.001), -0)).toBe(false);
  });

  it("titles and texts have the agreed maximums", () => {
    expect(TEXT_LIMITS).toMatchObject({ postTitle: 150, postDescription: 2000, message: 2000 });
  });
});
