import { answerText, visibleFields, type FormSchema, type FormValues } from "@fmbp/shared";

export type DescribedField = { key: string; label: string; value: string; section: "basic" | "advanced" };

/** Turn stored form values into label/value pairs using the form schema (option labels, ₹ amounts, city, "Other" text). */
export function describeValues(schema: FormSchema, values: FormValues, locale: "en" | "hi", opts: { phrase?: boolean } = {}): DescribedField[] {
  const hi = locale === "hi";
  const out: DescribedField[] = [];
  for (const f of visibleFields(schema, values)) {
    const value = answerText(f, values, locale, opts);
    if (value) out.push({ key: f.key, label: hi ? f.label_hi : f.label_en, value, section: f.section });
  }
  return out;
}

/**
 * Flat map for template rendering: option labels, formatted money, `city`, and the type name.
 * `phrase` for generated sentences: options with sentence wording (phrase_*) use it instead of their label.
 */
export function templateValues(schema: FormSchema, values: FormValues, typeName: string, locale: "en" | "hi", opts: { phrase?: boolean } = {}) {
  const out: Record<string, string | number | undefined> = { type: typeName };
  for (const d of describeValues(schema, values, locale, opts)) out[d.key] = d.value;
  const loc = values.location as { city?: string } | undefined;
  if (loc?.city) out.city = loc.city;
  return out;
}
