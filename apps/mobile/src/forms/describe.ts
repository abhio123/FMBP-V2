import { formatInr, type FormSchema, type FormValues } from "@fmbp/shared";

export type DescribedField = { key: string; label: string; value: string; section: "basic" | "advanced" };

/** Turn stored form values into label/value pairs using the form schema (option labels, ₹ amounts, city). */
export function describeValues(schema: FormSchema, values: FormValues, locale: "en" | "hi"): DescribedField[] {
  const hi = locale === "hi";
  const out: DescribedField[] = [];
  for (const f of schema.fields) {
    const v = values[f.key];
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    const label = (x: string) => f.options?.find((o) => o.value === x)?.[hi ? "label_hi" : "label_en"] ?? x.replace(/_/g, " ");
    let value: string;
    switch (f.type) {
      case "amount": value = formatInr(Number(v), locale); break;
      case "chips": case "select": value = label(String(v)); break;
      case "multichips": value = (v as string[]).map(label).join(", "); break;
      case "location": { const l = v as { city?: string; label?: string }; value = l.label || l.city || ""; break; }
      case "switch": value = v ? (hi ? "हाँ" : "Yes") : (hi ? "नहीं" : "No"); break;
      case "image": case "file": continue; // rendered separately
      default: value = String(v);
    }
    if (value) out.push({ key: f.key, label: hi ? f.label_hi : f.label_en, value, section: f.section });
  }
  return out;
}

/** Flat map for template rendering: option labels, formatted money, `city`, and the type name. */
export function templateValues(schema: FormSchema, values: FormValues, typeName: string, locale: "en" | "hi") {
  const out: Record<string, string | number | undefined> = { type: typeName };
  for (const d of describeValues(schema, values, locale)) out[d.key] = d.value;
  const loc = values.location as { city?: string } | undefined;
  if (loc?.city) out.city = loc.city;
  return out;
}
