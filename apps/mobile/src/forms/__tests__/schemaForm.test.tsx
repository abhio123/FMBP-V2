import { isBasicComplete, splitValues } from "../SchemaForm";
import type { FormSchema } from "@fmbp/shared";

const schema: FormSchema = {
  target: "post", type_slug: "need_money", version: 1, title_template: "", description_template: "",
  fields: [
    { key: "amount", type: "amount", label_en: "A", label_hi: "अ", section: "basic", required: true, promote_to: "amount_min" },
    { key: "purpose", type: "chips", label_en: "P", label_hi: "प", section: "basic", required: true, options: [] },
    { key: "location", type: "location", label_en: "L", label_hi: "ल", section: "basic", required: true, promote_to: "location" },
    { key: "equity", type: "number", label_en: "E", label_hi: "इ", section: "advanced" },
  ],
};
const loc = { lat: 28.5, lng: 77.3, city: "Noida", country: "IN" };

describe("SchemaForm helpers", () => {
  it("isBasicComplete requires all basic required fields", () => {
    expect(isBasicComplete(schema, {})).toBe(false);
    expect(isBasicComplete(schema, { amount: 500000, purpose: "expand_shop" })).toBe(false);
    expect(isBasicComplete(schema, { amount: 500000, purpose: "expand_shop", location: loc })).toBe(true);
  });
  it("splitValues separates sections and promotes columns", () => {
    const r = splitValues(schema, { amount: 500000, purpose: "expand_shop", location: loc, equity: 10 });
    expect(r.basic).toEqual({ amount: 500000, purpose: "expand_shop", location: loc });
    expect(r.advanced).toEqual({ equity: 10 });
    expect(r.amount_min).toBe(500000);
    expect(r.location).toEqual(loc);
  });
});
