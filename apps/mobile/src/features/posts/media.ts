import * as Manip from "expo-image-manipulator";
import type { FormSchema } from "@fmbp/shared";
import { mediaPath, uploadLocalImage, uploadLocalJpegTo } from "@/features/business/api";

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
    for (const uri of v as string[]) urls.push(isRemote(uri) ? uri : await uploadPostPhoto(businessId, uri));
    out[key] = urls;
  }
  return out;
}

/** Width of the small copy shown on post cards (3 in a row on a phone; sharp on 3x screens). */
const THUMB_WIDTH = 360;

/** Where the small copy of an uploaded photo lives: next to it, "<name>.thumb.jpg". */
export const thumbUrl = (url: string) => url.replace(/(\.[a-z0-9]+)?(\?.*)?$/i, ".thumb.jpg");

/**
 * Upload one post photo and a small copy of it for post cards (a few KB instead of a few hundred, which matters on
 * mobile data in a long feed). The small copy is best effort: without it the card shows the full photo.
 */
async function uploadPostPhoto(businessId: string, uri: string): Promise<string> {
  const url = await uploadLocalImage(businessId, uri, "post");
  const path = mediaPath(url);
  if (path) {
    try {
      const small = await Manip.manipulateAsync(uri, [{ resize: { width: THUMB_WIDTH } }], { compress: 0.7, format: Manip.SaveFormat.JPEG });
      await uploadLocalJpegTo(path.replace(/\.[a-z0-9]+$/i, "") + ".thumb.jpg", small.uri);
    } catch { /* the card falls back to the full photo */ }
  }
  return url;
}

/**
 * Uploaded photos of a post for its card, without loading its form: every public media URL in its answers, in order.
 * Device paths saved by older posts are skipped.
 */
export function cardPhotoUrls(...answers: (Record<string, unknown> | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const part of answers) {
    for (const v of Object.values(part ?? {})) {
      if (!Array.isArray(v)) continue;
      for (const u of v) if (typeof u === "string" && isRemote(u) && mediaPath(u) && !out.includes(u)) out.push(u);
    }
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
