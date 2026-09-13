import { useQuery } from "@tanstack/react-query";
import { FormSchema } from "@fmbp/shared";
import { supabase } from "@/lib/supabase";

/** Types without a dedicated form fall back to this seeded schema (ai-generate does the same). */
export const GENERIC_TYPE_SLUG = "_generic";

/** Latest active schema for a type, or null when none is seeded. */
export async function fetchFormSchema(target: "post" | "offering", typeSlug: string): Promise<FormSchema | null> {
  const { data, error } = await supabase
    .from("form_schemas").select("*")
    .eq("target", target).eq("type_slug", typeSlug).eq("active", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? FormSchema.parse(data) : null;
}

/** Schema for the type, or the generic fallback. Throws only if neither exists. */
export async function fetchFormSchemaOrGeneric(target: "post" | "offering", typeSlug: string): Promise<FormSchema> {
  const schema = (await fetchFormSchema(target, typeSlug)) ?? (await fetchFormSchema(target, GENERIC_TYPE_SLUG));
  if (!schema) throw new Error(`no form schema for ${target}/${typeSlug}`);
  return schema;
}

export function useFormSchema(target: "post" | "offering", typeSlug: string | undefined) {
  return useQuery({
    queryKey: ["form_schema", target, typeSlug],
    enabled: !!typeSlug,
    staleTime: 10 * 60_000,
    queryFn: () => fetchFormSchemaOrGeneric(target, typeSlug!),
  });
}
