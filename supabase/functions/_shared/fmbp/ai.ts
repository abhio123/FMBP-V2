import { z } from "zod";
import { Locale } from "./enums.ts";

export const AiGenerateRequest = z.object({
  mode: z.enum(["generate", "suggest_offering", "improve_post", "suggest_category"]).default("generate"),
  target: z.enum(["post", "offering"]),
  type_slug: z.string().max(60),
  locale: Locale,
  // answers: at most what a post can store (20 000 characters as JSON), so nobody can send a book to the AI
  basic: z.record(z.unknown()).refine((v) => JSON.stringify(v).length <= 20000, "too long"),
  advanced: z.record(z.unknown()).refine((v) => JSON.stringify(v).length <= 20000, "too long").optional(),
  business: z.object({
    name: z.string().max(120),
    category: z.string().max(80),
    city: z.string().optional(),
  }),
});
export type AiGenerateRequest = z.infer<typeof AiGenerateRequest>;

export const AiGenerateResponse = z.object({
  title: z.string(),
  description: z.string(),
  suggested_category_slug: z.string().nullable(),
  tags: z.array(z.string()).max(8),
  missing_fields: z.array(z.object({ key: z.string(), reason: z.string() })),
  source: z.enum(["ai", "template"]).default("ai"),
});
export type AiGenerateResponse = z.infer<typeof AiGenerateResponse>;
