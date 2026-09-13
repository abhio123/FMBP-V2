---
name: fmbp-form-schema
description: Add a new Opportunity Post type or Business Offering type, or change its Basic/Advanced form, by editing form_schemas seed data. Use whenever a new "Need X" / "Offer X" or offering type is requested.
---

# FMBP Form Schemas (forms are data, not code)

Read `FMBP_REQUIREMENTS.md` B3, B4 and C4. A new type must NOT create a new screen; the generic renderer in `apps/mobile/src/forms` handles it.

## Field definition (`packages/shared/src/formSchema.ts`)
```ts
type FieldType = 'chips'|'multichips'|'select'|'amount'|'range'|'number'|'location'|'image'|'file'|'switch'|'date'|'text_short'|'text_long';
interface FormField {
  key: string;                 // snake_case, stable; used in JSONB and templates
  type: FieldType;
  label_en: string; label_hi: string;
  help_en?: string; help_hi?: string;
  section: 'basic'|'advanced';
  required?: boolean;          // only allowed in basic
  options?: {value:string; label_en:string; label_hi:string}[]; // chips/multichips/select
  options_source?: 'categories'|'industries'|'platforms'|'cities'; // dynamic options
  promote_to?: 'amount_min'|'amount_max'|'category_id'|'location';
  presets?: number[];          // amount: e.g. [100000, 500000, 1000000]
}
interface FormSchema {
  target: 'post'|'offering'; type_slug: string; version: number;
  fields: FormField[];
  title_template: string;        // "{{purpose}} in {{city}}"
  description_template: string;  // "Looking for {{amount}} to {{purpose}} in {{city}}."
}
```

## Rules
- Basic section: 2–4 fields max, all tap-based (`chips`, `select`, `amount`, `location`, `image`). Must be completable in about one minute.
- `text_short` / `text_long` only in advanced, and only if nothing can be generated or selected instead (UX7).
- Use plain labels in basic (`Need Money?`, `How much?`, `For what?`). Advanced may use domain vocabulary (`Investment Type`, `Equity Offered`).
- Every `required` field must be in `basic`. Advanced never blocks publishing.
- Always include a `location` field in basic (defaults to the business location, one tap to change).
- Provide `label_hi` for every field and option. Do not leave Hindi empty.
- Templates use only keys present in `fields`; the AI step (`fmbp-ai-generate`) refines them, so keep them literal and safe.

## Procedure
1. Add taxonomy row: `post_types` (with `intention_id`, `slug`, `name_en/hi`, `plain_label_en/hi`) or `offering_types`.
2. Add `form_schemas` row (version 1, active true) in `supabase/seed/form_schemas.sql` using `jsonb` literal.
3. If any field has `promote_to`, confirm the column exists (see `fmbp-db-migration`).
4. Add a renderer test: `apps/mobile/src/forms/__tests__/<type_slug>.test.tsx` that renders the schema and asserts basic field count ≤ 4 and no `text_*` in basic.
5. Run `supabase db reset` and open Create Post → the new type must appear with no code change.

## Example: `need_money` (post)
Basic: `amount` (amount, presets 1L/5L/10L/25L, required, promote_to amount_min), `purpose` (chips: expand_shop, new_stock, machinery, marketing, working_capital, other; required), `location` (location, required).
Advanced: `funding_type` (chips: loan, investor, partner, government_scheme), `business_stage`, `monthly_revenue` (amount), `equity_offered` (number %), `pitch_deck` (file), `expected_roi` (number %).
Description template: "Looking for {{amount}} to {{purpose}} in {{city}}."
