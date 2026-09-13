---
name: fmbp-ai-generate
description: Implement or extend AI generation and suggestions (title, description, category, tags, missing fields) in the Supabase Edge Function using the Anthropic TypeScript SDK. Use for any AI feature.
---

# FMBP AI Generation (Edge Function `ai-generate`)

Read `FMBP_REQUIREMENTS.md` C5 and B4.3. Also load the `claude-api` skill if available for current SDK details. AI helps; it never replaces the user, and every output is shown as editable.

## Non-negotiables
- Runs ONLY in `supabase/functions/ai-generate` (Deno). `ANTHROPIC_API_KEY` is a function secret; never in the app.
- Model `claude-opus-5`. Use structured outputs so the app never parses free text.
- Never invent facts. Only rephrase the structured inputs. If a needed input is missing, list it in `missing_fields`, do not guess.
- Output language follows `locale` (`en` or `hi`). Indian formatting: ₹5 lakh, ₹1.2 crore.
- Description ≤ 2 sentences, plain words, no jargon in basic mode.
- Rate limit: 20 calls per user per hour (check a `ai_calls` counter table or KV before calling).
- Log `usage.input_tokens`/`output_tokens` per call to PostHog for cost tracking.

## Contract
Request: `{ target:'post'|'offering', type_slug, locale, basic, advanced?, business:{name, category, city} }`
Response: `{ title, description, suggested_category_slug?, tags: string[], missing_fields: {key, reason}[] }`

## Implementation pattern
```ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";

const Output = z.object({
  title: z.string(),
  description: z.string(),
  suggested_category_slug: z.string().nullable(),
  tags: z.array(z.string()).max(8),
  missing_fields: z.array(z.object({ key: z.string(), reason: z.string() })),
});

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const response = await client.messages.parse({
  model: "claude-opus-5",
  max_tokens: 2000,
  thinking: { type: "adaptive" },
  output_config: { effort: "low", format: zodOutputFormat(Output) },
  system: SYSTEM_PROMPT,            // stable text first (cacheable), see below
  messages: [{ role: "user", content: JSON.stringify(payload) }],
});
if (response.stop_reason === "refusal" || !response.parsed_output) return fallbackFromTemplate(payload);
return response.parsed_output;
```
- `SYSTEM_PROMPT` describes FMBP, the plain-language rule, the "never invent facts" rule, Indian number formatting, and includes the `form_schemas` `title_template` / `description_template` plus the field labels for the type. Keep it stable across requests so prompt caching applies; put the per-request payload only in the user message.
- `fallbackFromTemplate` renders the templates with `{{key}}` substitution so the user always gets something even if the API fails.
- Wrap in a most-specific-first error chain (`RateLimitError` → `APIStatusError` → `APIConnectionError`) and return the template fallback with `source: 'template'` on failure.

## Other AI features (same function, `mode` param)
- `suggest_offering`: given a business's last N posts, return `{ offering_type_slug, prefilled_basic, confidence }` for B3 path 1.
- `improve_post`: return up to 3 concrete suggestions (`add_image`, `add_budget`, `add_deadline`) with one-line reasons.
- `suggest_category`: return top 3 `categories.slug` with confidence.

## Test
Add `supabase/functions/ai-generate/test.ts` with fixtures for `need_money`, `need_influencer`, `looking_to_invest`, `investment` offering, in both locales; assert schema validity, ≤ 2 sentences, and that every number in the output appears in the inputs.
