import { File } from "expo-file-system";

/**
 * Read a photo from the phone (expo-image-picker / image-manipulator output) for upload.
 *
 * Not `fetch(fileUri)`: on Android, Expo's fetch looks the file up without decoding the URI, and in Expo Go the app's
 * cache folder has %-encoded characters in its name (".../ExperienceData/%40anonymous%2Fapp/..."), so it answered
 * "File not found" (404, 14 bytes) and that text was uploaded as the "photo" (QA 2026-11-06). expo-file-system reads
 * the file directly, the same on Android and iPhone.
 *
 * Anything that is not a JPEG / PNG / WebP / HEIC image is refused, so a failed read can never be uploaded again.
 */
export async function readLocalImage(uri: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const bytes = await new File(uri).arrayBuffer();
  const type = imageType(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16)));
  if (!type) throw new Error("photo_unreadable");
  return { bytes, type };
}

/** The error text to show for a failed photo upload: a clear sentence when the photo could not be read. */
export function photoErrorText(e: unknown, t: (key: string) => string): string {
  const m = (e as { message?: string } | null)?.message ?? "";
  return m === "photo_unreadable" ? t("common.photoUnreadable") : m;
}

/** The image format from the first bytes of the file; null when it is not an image we upload. */
export function imageType(head: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/heic" | null {
  const at = (i: number) => head[i];
  if (head.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (head.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (head.length >= 12 && ascii(4, 8) === "ftyp" && /^(heic|heix|mif1|msf1)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}
