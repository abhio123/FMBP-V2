import { describe, it, expect } from "vitest";
import { FormSchema, renderTemplate, formatInr, templateFor } from "../formSchema";

const base = { target: "post" as const, type_slug: "x", version: 1, title_template: "T {{a}}", description_template: "D {{a}} in {{city}}." };

describe("FormSchema rules", () => {
  it("accepts a valid basic form", () => {
    const r = FormSchema.safeParse({ ...base, fields: [
      { key: "a", type: "amount", label_en: "A", label_hi: "अ", section: "basic", required: true },
      { key: "location", type: "location", label_en: "L", label_hi: "ल", section: "basic", required: true },
    ] });
    expect(r.success).toBe(true);
  });
  it("rejects more than 4 basic fields", () => {
    const fields = Array.from({ length: 5 }, (_, i) => ({ key: `f${i}`, type: "chips", label_en: "x", label_hi: "x", section: "basic" }));
    expect(FormSchema.safeParse({ ...base, fields }).success).toBe(false);
  });
  it("rejects required fields in advanced", () => {
    expect(FormSchema.safeParse({ ...base, fields: [{ key: "a", type: "chips", label_en: "x", label_hi: "x", section: "advanced", required: true }] }).success).toBe(false);
  });
  it("rejects free text in basic", () => {
    expect(FormSchema.safeParse({ ...base, fields: [{ key: "a", type: "text_short", label_en: "x", label_hi: "x", section: "basic" }] }).success).toBe(false);
  });
});

describe("renderTemplate", () => {
  it("fills placeholders and trims gaps", () => {
    expect(renderTemplate("Looking for {{amount}} to {{purpose}} in {{city}}.", { amount: "₹5 lakh", purpose: "expand shop", city: "Noida" }))
      .toBe("Looking for ₹5 lakh to expand shop in Noida.");
  });
  it("drops sentences and clauses whose placeholders are empty", () => {
    expect(renderTemplate("{{type}} in {{city}}. Needed: {{timeline}}. Budget: {{budget}}.", { type: "Announcement", city: "Bengaluru", timeline: "This week" }))
      .toBe("Announcement in Bengaluru. Needed: This week.");
    expect(renderTemplate("Looking for {{what}} in {{city}}, budget {{budget}}.", { what: "printing", city: "Noida" }))
      .toBe("Looking for printing in Noida.");
    expect(renderTemplate("{{city}} में {{type}}। समय: {{timeline}}। बजट: {{budget}}।", { city: "नोएडा", type: "घोषणा", budget: "₹5,000" }))
      .toBe("नोएडा में घोषणा। बजट: ₹5,000।");
    expect(renderTemplate("Need {{a}} in {{city}}", { a: "x" })).toBe("Need x in");
    expect(renderTemplate("{{a}}", {})).toBe("");
  });
  it("templateFor prefers the Hindi template only when present", () => {
    const s = { title_template: "T", description_template: "D", title_template_hi: "ट", description_template_hi: null };
    expect(templateFor(s, "hi")).toEqual({ title: "ट", description: "D" });
    expect(templateFor(s, "en")).toEqual({ title: "T", description: "D" });
  });
});

describe("formatInr", () => {
  it("formats lakh and crore", () => {
    expect(formatInr(500000)).toBe("₹5 lakh");
    expect(formatInr(1250000)).toBe("₹12.5 lakh");
    expect(formatInr(12000000)).toBe("₹1.2 crore");
    expect(formatInr(50000)).toBe("₹50,000");
    expect(formatInr(500000, "hi")).toBe("₹5 लाख");
  });
});
