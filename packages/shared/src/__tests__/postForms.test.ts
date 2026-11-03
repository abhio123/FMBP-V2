import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FormSchema } from "../formSchema";

// supabase/forms/post/*.json are the source of the seeded post forms (scripts/build-form-seed.mjs)
const dir = new URL("../../../../supabase/forms/post/", import.meta.url);
const forms = readdirSync(dir).filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, raw: JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Record<string, unknown> }));

describe("post forms (supabase/forms/post)", () => {
  it("exist", () => expect(forms.length).toBeGreaterThan(40));

  it.each(forms)("$file is a valid form with 8–12 basic fields", ({ raw }) => {
    const s = FormSchema.parse(raw);
    const basic = s.fields.filter((f) => f.section === "basic");
    expect(basic.length).toBeGreaterThanOrEqual(8);
    expect(basic.length).toBeLessThanOrEqual(12);
    expect(basic.filter((f) => f.required).length).toBeLessThanOrEqual(5); // few must-answers for new users
    expect(new Set(s.fields.map((f) => f.key)).size).toBe(s.fields.length);
    // "More details": at least 6 questions for everyone, plus questions for the sub-category picked (show_when)
    expect(s.fields.filter((f) => f.section === "advanced" && !f.show_when).length).toBeGreaterThanOrEqual(6);
    expect(basic[basic.length - 1].type).toBe("location"); // where? is always last
  });

  it.each(forms)("$file asks 'How do you want to work?' unless it is an announcement", ({ file, raw }) => {
    const s = FormSchema.parse(raw);
    const deal = s.fields.find((f) => f.key === "deal");
    if (file.startsWith("announce_")) expect(deal).toBeUndefined();
    else {
      expect(deal?.required).toBe(true);
      expect(deal?.promote_to).toBe("deal_type");
      expect(deal?.options?.map((o) => o.value)).toEqual(["pay", "rent", "partnership", "exchange"]);
    }
  });
});
