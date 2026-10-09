import { z } from "zod";

export const FieldType = z.enum([
  "chips", "multichips", "select", "amount", "range", "number", "location",
  "image", "file", "switch", "date", "text_short", "text_long",
]);
export type FieldType = z.infer<typeof FieldType>;

export const FieldOption = z.object({
  value: z.string(),
  label_en: z.string(),
  label_hi: z.string(),
});
export type FieldOption = z.infer<typeof FieldOption>;

export const FormField = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: FieldType,
  label_en: z.string(),
  label_hi: z.string(),
  help_en: z.string().optional(),
  help_hi: z.string().optional(),
  section: z.enum(["basic", "advanced"]),
  required: z.boolean().optional(),
  options: z.array(FieldOption).optional(),
  options_source: z.enum(["categories", "industries", "platforms", "cities"]).optional(),
  promote_to: z.enum(["amount_min", "amount_max", "category_id", "location"]).optional(),
  presets: z.array(z.number()).optional(),
  default_from_business: z.boolean().optional(),
  /** Show this field only while another field (usually a basic chips field) holds one of these values. */
  show_when: z.object({ key: z.string(), values: z.array(z.string()).min(1) }).optional(),
});
export type FormField = z.infer<typeof FormField>;

/**
 * A field without `show_when` is always visible. With it, the field appears only while the controlling
 * field holds one of the listed values (a multichips controller matches when any selected value is listed).
 */
export function isFieldVisible(field: Pick<FormField, "show_when">, values: Record<string, unknown>): boolean {
  if (!field.show_when) return true;
  const v = values[field.show_when.key];
  if (Array.isArray(v)) return v.some((x) => field.show_when!.values.includes(String(x)));
  return v != null && v !== "" && field.show_when.values.includes(String(v));
}

/** Schema fields that apply to the given values, in schema order. */
export function visibleFields(schema: Pick<FormSchema, "fields">, values: Record<string, unknown>): FormField[] {
  return schema.fields.filter((f) => isFieldVisible(f, values));
}

export const FormSchema = z
  .object({
    target: z.enum(["post", "offering"]),
    type_slug: z.string(),
    version: z.number().int().positive(),
    fields: z.array(FormField),
    title_template: z.string(),
    description_template: z.string(),
    title_template_hi: z.string().nullable().optional(),
    description_template_hi: z.string().nullable().optional(),
  })
  .superRefine((s, ctx) => {
    const basic = s.fields.filter((f) => f.section === "basic");
    if (basic.length > 4) {
      ctx.addIssue({ code: "custom", message: "Basic section may have at most 4 fields (UX rule)" });
    }
    for (const f of s.fields) {
      if (f.required && f.section !== "basic") {
        ctx.addIssue({ code: "custom", message: `Required field ${f.key} must be in basic` });
      }
      if ((f.type === "text_short" || f.type === "text_long") && f.section === "basic") {
        ctx.addIssue({ code: "custom", message: `Free text field ${f.key} not allowed in basic` });
      }
      if (f.show_when) {
        if (f.required) ctx.addIssue({ code: "custom", message: `Conditional field ${f.key} cannot be required` });
        if (!s.fields.some((o) => o.key === f.show_when!.key)) ctx.addIssue({ code: "custom", message: `show_when of ${f.key} refers to unknown field ${f.show_when.key}` });
      }
    }
  });
export type FormSchema = z.infer<typeof FormSchema>;

/** Values captured by the renderer, keyed by field key. */
export type FormValues = Record<string, unknown>;

/** Pick the template for a locale, falling back to English. */
export function templateFor(schema: Pick<FormSchema, "title_template" | "description_template" | "title_template_hi" | "description_template_hi">, locale: "en" | "hi") {
  return {
    title: (locale === "hi" && schema.title_template_hi) || schema.title_template,
    description: (locale === "hi" && schema.description_template_hi) || schema.description_template,
  };
}

const PLACEHOLDER = /\{\{(\w+)\}\}/g;
const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

/**
 * Render a `{{key}}` template. Sentences (". " / "। ") and comma clauses whose placeholders are all
 * empty are dropped, so "Budget {{budget}}." disappears instead of rendering "Budget .".
 */
export function renderTemplate(
  template: string,
  values: Record<string, string | number | undefined | null>,
): string {
  const fill = (s: string) => s.replace(PLACEHOLDER, (_, k: string) => (isEmpty(values[k]) ? "" : String(values[k])));
  const hasEmpty = (s: string) => Array.from(s.matchAll(PLACEHOLDER)).some((m) => isEmpty(values[m[1]]));
  const sentences = template.match(/[^.!?।]+[.!?।]*\s*/g) ?? [template];
  const kept = sentences.map((sentence) => {
    const end = sentence.match(/[.!?।]*\s*$/)?.[0] ?? "";
    const body = sentence.slice(0, sentence.length - end.length);
    const clauses = body.split(/,\s*/).filter((c) => !hasEmpty(c));
    return clauses.length ? fill(clauses.join(", ")) + end.trim() : "";
  }).filter(Boolean);
  const text = kept.length ? kept.join(" ") : fill(template);
  return text.replace(/\s{2,}/g, " ").replace(/\s+([.,!?।])/g, "$1").trim();
}

/** Indian currency formatting: 500000 -> "₹5 lakh", 12000000 -> "₹1.2 crore". */
export function formatInr(amount: number, locale: "en" | "hi" = "en"): string {
  const lakh = locale === "hi" ? "लाख" : "lakh";
  const crore = locale === "hi" ? "करोड़" : "crore";
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
  if (amount >= 1e7) return `₹${trim(amount / 1e7)} ${crore}`;
  if (amount >= 1e5) return `₹${trim(amount / 1e5)} ${lakh}`;
  return `₹${amount.toLocaleString("en-IN")}`;
}
