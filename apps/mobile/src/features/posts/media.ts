import type { FormSchema } from "@fmbp/shared";
import { uploadLocalImage } from "@/features/business/api";

const isRemote = (u: string) => /^https?:\/\//.test(u);
const imageKeys = (schema: FormSchema) => schema.fields.filter((f) => f.type === "image" || f.type === "file").map((f) => f.key);

/**
 * Upload the photos picked in a post form and swap the device paths for public URLs. Before this, posts stored
 * `file://` paths that only existed on the poster's phone, so nobody else (nor a link preview) could see them.
 */
export async function uploadPostImages(schema: FormSchema, values: Record<string, unknown>, businessId: string): Promise<Record<string, unknown>> {
  const out = { ...values };
  for (const key of imageKeys(schema)) {
    const v = out[key];
    if (!Array.isArray(v) || !v.length) continue;
    const urls: string[] = [];
    for (const uri of v as string[]) urls.push(isRemote(uri) ? uri : await uploadLocalImage(businessId, uri, "post"));
    out[key] = urls;
  }
  return out;
}

/**
 * Photo URLs of a post, in form order. Published posts show only uploaded (public) photos: device paths saved by older
 * posts are skipped. `includeLocal` is for the review step, where picked photos are not uploaded yet.
 */
export function postPhotoUrls(schema: FormSchema | null | undefined, values: Record<string, unknown>, opts: { includeLocal?: boolean } = {}): string[] {
  if (!schema) return [];
  return imageKeys(schema).flatMap((k) => (Array.isArray(values[k]) ? (values[k] as unknown[]) : []))
    .filter((u): u is string => typeof u === "string" && (isRemote(u) || !!opts.includeLocal));
}
