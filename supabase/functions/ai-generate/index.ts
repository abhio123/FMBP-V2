// FMBP ai-generate: turns structured form inputs into a plain-language title/description.
// Runs server-side only. Falls back to template rendering if the model is unavailable or refuses.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { corsHeaders, json } from "../_shared/cors.ts";
import { userClient } from "../_shared/supabase.ts";
import { AiGenerateRequest, AiGenerateResponse, renderTemplate, templateFor, formatInr, type FormField, type FormSchema } from "@fmbp/shared/index.ts";

const Output = z.object({
  title: z.string(),
  description: z.string(),
  suggested_category_slug: z.string().nullable(),
  tags: z.array(z.string()).max(8),
  missing_fields: z.array(z.object({ key: z.string(), reason: z.string() })),
});

const SYSTEM = `You write short, plain-language business opportunity posts for FMBP, an Indian hyperlocal business app.
Users are small shop owners, home businesses and MSMEs. Many do not know business jargon.
Rules:
- Use ONLY the facts in the JSON input. Never invent amounts, places, names or claims.
- Title: at most 8 words. Description: at most 2 sentences, everyday words, first person ("Looking for...", "I can offer...").
- Write in the language given by "locale": "en" = simple Indian English, "hi" = simple Hindi (Devanagari).
- Money is already formatted (e.g. "₹5 lakh"); copy it exactly.
- tags: up to 8 short lowercase keywords useful for search (English, even for Hindi posts).
- suggested_category_slug: one of the provided category slugs if the post clearly fits a different category than the business, else null.
- missing_fields: keys from the schema that, if filled, would make the post clearer. Empty if none.`;

function labelFor(field: FormField | undefined, value: unknown, locale: "en" | "hi"): string {
  if (value == null || value === "") return "";
  if (!field) return String(value);
  const lbl = (v: string) => field.options?.find((o) => o.value === v)?.[locale === "hi" ? "label_hi" : "label_en"] ?? v.replace(/_/g, " ");
  switch (field.type) {
    case "amount": return formatInr(Number(value), locale);
    case "chips": case "select": return lbl(String(value));
    case "multichips": return (value as string[]).map(lbl).join(", ");
    case "location": return (value as { city?: string }).city ?? "";
    case "switch": return value ? (locale === "hi" ? "हाँ" : "yes") : (locale === "hi" ? "नहीं" : "no");
    default: return String(value);
  }
}

function humanize(schema: FormSchema, basic: Record<string, unknown>, advanced: Record<string, unknown>, locale: "en" | "hi") {
  const out: Record<string, string> = {};
  for (const f of schema.fields) {
    const v = basic[f.key] ?? advanced[f.key];
    const s = labelFor(f, v, locale);
    if (s) out[f.key] = s;
  }
  const loc = (basic.location ?? advanced.location) as { city?: string } | undefined;
  if (loc?.city) out.city = loc.city;
  return out;
}

function fromTemplate(schema: FormSchema, human: Record<string, string>, locale: "en" | "hi") {
  const tpl = templateFor(schema, locale);
  return AiGenerateResponse.parse({
    title: renderTemplate(tpl.title, human),
    description: renderTemplate(tpl.description, human),
    suggested_category_slug: null,
    tags: [],
    missing_fields: [],
    source: "template",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = AiGenerateRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  const db = userClient(req);
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return json({ error: "unauthorized" }, 401);

  // The type must exist; the form may be the type's own schema or the seeded "_generic" fallback.
  const typeTable = input.target === "post" ? "post_types" : "offering_types";
  const { data: typeRow } = await db.from(typeTable).select("name_en,name_hi").eq("slug", input.type_slug).maybeSingle();
  if (!typeRow) return json({ error: "unknown type" }, 404);
  const loadSchema = (slug: string) => db.from("form_schemas").select("*").eq("target", input.target).eq("type_slug", slug).eq("active", true).order("version", { ascending: false }).limit(1).maybeSingle();
  const schemaRow = (await loadSchema(input.type_slug)).data ?? (await loadSchema("_generic")).data;
  if (!schemaRow) return json({ error: "no form schema" }, 500);
  const schema = schemaRow as unknown as FormSchema;
  const human = humanize(schema, input.basic, input.advanced ?? {}, input.locale);
  human.type = input.locale === "hi" ? typeRow.name_hi : typeRow.name_en;
  const fallback = fromTemplate(schema, human, input.locale);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(fallback);

  // simple per-user rate limit: 20/hour
  const { count } = await db.from("ai_calls").select("*", { count: "exact", head: true }).eq("user_id", auth.user.id).gt("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 20) return json({ ...fallback, rate_limited: true });

  const { data: cats } = await db.from("categories").select("slug,name_en").is("parent_id", null);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: zodOutputFormat(Output) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: JSON.stringify({
          locale: input.locale,
          target: input.target,
          type: input.type_slug,
          business: input.business,
          fields: human,
          schema_field_keys: schema.fields.map((f) => ({ key: f.key, label: f.label_en, section: f.section })),
          template_hint: fallback.description,
          category_slugs: (cats ?? []).map((c) => c.slug),
        }),
      }],
    });
    await db.from("ai_calls").insert({ user_id: auth.user.id, input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens });
    if (response.stop_reason === "refusal" || !response.parsed_output) return json(fallback);
    const out = response.parsed_output;
    if (out.suggested_category_slug && !(cats ?? []).some((c) => c.slug === out.suggested_category_slug)) out.suggested_category_slug = null;
    return json(AiGenerateResponse.parse({ ...out, source: "ai" }));
  } catch (e) {
    console.error("ai-generate failed", (e as Error).message);
    return json(fallback);
  }
});
