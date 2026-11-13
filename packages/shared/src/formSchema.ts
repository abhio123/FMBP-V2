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
  /**
   * Wording of this answer inside generated sentences (title / description), when the label (written as a choice)
   * doesn't fit: purpose "Expand shop" → "Need ₹5 lakh for {{purpose}}" needs "expanding the shop" / "दुकान बढ़ाने".
   */
  phrase_en: z.string().optional(),
  phrase_hi: z.string().optional(),
  /** Line icon (Ionicons name) shown with the choice in long pickers, e.g. a trade (Looking for work). */
  icon: z.string().regex(/^[a-z0-9-]+$/).optional(),
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
  promote_to: z.enum(["amount_min", "amount_max", "category_id", "location", "deal_type"]).optional(),
  presets: z.array(z.number()).optional(),
  default_from_business: z.boolean().optional(),
  /** Show this field only while another field (usually a basic chips field) holds one of these values. */
  show_when: z.object({ key: z.string(), values: z.array(z.string()).min(1) }).optional(),
  /**
   * This answer is the post's sub-category (Need Staff → role). A business can have only one live post per type and
   * kind ("Need Staff → Salesperson" twice is refused, "→ Cook" is fine); without a kind field, one per type.
   * Enforced by the database (migration 20261105000003).
   */
  kind: z.boolean().optional(),
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

/** Most fields a basic section may have (UX rule). */
export const MAX_BASIC_FIELDS = 12;

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
    // QA 2026-11-03: a post needs enough detail to be useful (8–12 basic fields), mostly tap answers; the rest is
    // optional under "More details".
    if (basic.length > MAX_BASIC_FIELDS) {
      ctx.addIssue({ code: "custom", message: `Basic section may have at most ${MAX_BASIC_FIELDS} fields (UX rule)` });
    }
    for (const f of s.fields) {
      if (f.required && f.section !== "basic") {
        ctx.addIssue({ code: "custom", message: `Required field ${f.key} must be in basic` });
      }
      // short typed answers (a dish, a model) are fine in basic; long writing stays under "More details"
      if (f.type === "text_long" && f.section === "basic") {
        ctx.addIssue({ code: "custom", message: `Long text field ${f.key} not allowed in basic` });
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
 * Each sentence starts with a capital letter (a lowercase answer may open it).
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
    return clauses.length ? capitalize(fill(clauses.join(", ")).trimStart()) + end.trim() : "";
  }).filter(Boolean);
  const text = kept.length ? kept.join(" ") : capitalize(fill(template).trimStart());
  return text.replace(/\s{2,}/g, " ").replace(/\s+([.,!?।])/g, "$1").trim();
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Indian currency formatting: 500000 -> "₹5 lakh", 12000000 -> "₹1.2 crore". */
export function formatInr(amount: number, locale: "en" | "hi" = "en"): string {
  const lakh = locale === "hi" ? "लाख" : "lakh";
  const crore = locale === "hi" ? "करोड़" : "crore";
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
  if (amount >= 1e7) return `₹${trim(amount / 1e7)} ${crore}`;
  if (amount >= 1e5) return `₹${trim(amount / 1e5)} ${lakh}`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * An English label inside a sentence starts lowercase ("Need walk-in / retail customers"); acronyms keep their capitals
 * (GST, AC). Labels starting with a name (Instagram, English) set phrase_en to keep theirs.
 */
const midSentence = (label: string) => (/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);

/** Option value that means "something not in the list"; the form then offers an optional text box. */
export const OTHER_VALUE = "other";
/** Where the text typed after picking "Other" is stored (next to the field's own answer). */
export const otherTextKey = (key: string) => `${key}_other`;
/** True when this field's current answer includes "Other" (single choice or one of several). */
export function picksOther(field: Pick<FormField, "key" | "type">, values: Record<string, unknown>): boolean {
  const v = values[field.key];
  return Array.isArray(v) ? v.includes(OTHER_VALUE) : v === OTHER_VALUE;
}

/**
 * One answer as words: option labels, ₹ amounts, city, yes/no. `phrase` (generated sentences) uses an option's phrase_* wording.
 * When the user picked "Other" and typed something,
 * their own words replace "Other" (so a post says "Tandoor cook", not "Other"). Empty string when unanswered.
 * Shared by the app (post details, local templates) and the ai-generate function.
 */
export function answerText(field: FormField, values: Record<string, unknown>, locale: "en" | "hi", opts: { phrase?: boolean } = {}): string {
  const v = values[field.key];
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "";
  const hi = locale === "hi";
  const typed = String(values[otherTextKey(field.key)] ?? "").trim();
  const label = (x: string) => {
    if (x === OTHER_VALUE && typed) return typed;
    const o = field.options?.find((option) => option.value === x);
    if (!opts.phrase) return o?.[hi ? "label_hi" : "label_en"] ?? x.replace(/_/g, " ");
    // inside a generated sentence, an option's own sentence wording wins over its label
    if (hi) return o?.phrase_hi ?? o?.label_hi ?? x.replace(/_/g, " ");
    return o?.phrase_en ?? (o ? midSentence(o.label_en) : x.replace(/_/g, " "));
  };
  switch (field.type) {
    case "amount": return formatInr(Number(v), locale);
    case "chips": case "select": return label(String(v));
    case "multichips": return (v as string[]).map(label).join(", ");
    case "location": { const l = v as { city?: string; label?: string }; return l.label || l.city || ""; }
    case "switch": return v ? (hi ? "हाँ" : "Yes") : (hi ? "नहीं" : "No");
    case "image": case "file": return "";
    default: return String(v);
  }
}
