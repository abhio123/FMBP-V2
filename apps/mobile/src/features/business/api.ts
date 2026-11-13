import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { readLocalImage } from "@/lib/localImage";
import type { BusinessSummary, ProfileKind } from "@/store/session";
import { coarseCoordinate, type LocationValue } from "@fmbp/shared";

// saved places are rounded to about 1 km on the phone (and again on the server): nobody can find the exact spot
const pointWkt = (l: { lat: number; lng: number }) => `SRID=4326;POINT(${coarseCoordinate(l.lng)} ${coarseCoordinate(l.lat)})`;

const myUserId = async (userId?: string) => userId ?? (await supabase.auth.getUser()).data.user?.id;

/** All profiles of the signed-in user (up to 3: businesses and / or a person), oldest first. */
export async function listMyBusinesses(userId?: string): Promise<BusinessSummary[]> {
  const uid = await myUserId(userId);
  if (!uid) return [];
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,category_id,city,state,pincode,logo_url,completion_score,verification_status,suspended_at,suspension_reason,kind,trade,trade_other,category_other,location,category:categories!category_id(slug)")
    .eq("owner_id", uid)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { category, location, ...rest } = row as typeof row & { category: { slug: string } | null };
    const { lat, lng } = parsePoint(location as unknown);
    return { ...rest, kind: rest.kind === "individual" ? "individual" : "business", category_slug: category?.slug ?? null, lat, lng };
  });
}

// Which profile is in use is remembered on this phone, per account. The server does not care: rights come from owning it.
const activeKey = (userId: string) => `fmbp.activeProfile.${userId}`;
export async function setActiveProfile(userId: string, businessId: string) {
  try { await AsyncStorage.setItem(activeKey(userId), businessId); } catch { /* the first profile opens next time */ }
}
export async function clearActiveProfiles() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("fmbp.activeProfile."));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch { /* best effort */ }
}

/** The profile in use: the one last chosen on this phone, else the first; null when the user has none. */
export async function loadMyBusiness(userId?: string): Promise<BusinessSummary | null> {
  const uid = await myUserId(userId);
  if (!uid) return null;
  const all = await listMyBusinesses(uid);
  let chosen: string | null = null;
  try { chosen = await AsyncStorage.getItem(activeKey(uid)); } catch { /* the first profile */ }
  return all.find((b) => b.id === chosen) ?? all[0] ?? null;
}

/** `kind` individual: `name` is the person's name and `trade` what they do (the category is the trade's). */
export async function createBusiness(input: { name: string; category_id: string; location: LocationValue; ownerName?: string; kind?: ProfileKind; trade?: string | null; trade_other?: string | null; category_other?: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not signed in");
  if (input.ownerName) await supabase.from("users").update({ name: input.ownerName }).eq("id", u.user.id);
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: u.user.id,
      name: input.name.trim(),
      category_id: input.category_id,
      location: pointWkt(input.location) as unknown as string,
      city: input.location.city,
      state: input.location.state ?? null,
      pincode: input.location.pincode ?? null,
      country: input.location.country ?? "IN",
      kind: input.kind ?? "business",
      trade: input.kind === "individual" ? input.trade ?? null : null,
      trade_other: input.kind === "individual" ? input.trade_other?.trim() || null : null,
      category_other: input.kind === "individual" ? null : input.category_other?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Business categories, broad (agreed 2026-11-06), each with what belongs in it (`examples_*`, the ⓘ pop-up) and its
 * search words (`keywords`: the examples plus Hindi / Hinglish names), so "LED" or "motor" finds Electrical & Electronics.
 */
export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_hi,icon,sort,keywords,examples_en,examples_hi").is("parent_id", null).order("sort");
  if (error) throw error;
  return data;
}

export type BusinessPublic = {
  id: string; name: string; city: string; state: string | null; pincode: string | null; logo_url: string | null; cover_url: string | null;
  description: string | null; verification_status: string; response_rate: number; response_sample: number; member_since: string; rating_avg: number; rating_count: number;
  kind: ProfileKind; trade: string | null; trade_other: string | null;
  completed_deals: number; completion_score: number; service_available: boolean; delivery_available: boolean; pickup_available: boolean;
  /** Businesses that joined with its invite code (5+: Community builder). */
  referral_count: number;
  category: { name_en: string; name_hi: string; icon: string | null } | null;
};

/** Public profile (never includes phone/whatsapp/email). */
export async function getBusinessPublic(id: string): Promise<BusinessPublic> {
  const { data, error } = await supabase
    .from("businesses_public")
    .select("id,name,city,state,pincode,logo_url,cover_url,description,verification_status,response_rate,response_sample,member_since,rating_avg,rating_count,completed_deals,completion_score,service_available,delivery_available,pickup_available,referral_count,kind,trade,trade_other,category:categories!category_id(name_en,name_hi,icon)")
    .eq("id", id).single();
  if (error) throw error;
  return data as unknown as BusinessPublic;
}

/**
 * PostGIS geography arrives in three shapes depending on the path:
 * GeoJSON (`{coordinates:[lng,lat]}`), WKT (`POINT(lng lat)`), or — the PostgREST default — hex EWKB.
 */
export function parsePoint(v: unknown): { lat: number; lng: number } {
  if (v && typeof v === "object" && "coordinates" in (v as Record<string, unknown>)) {
    const c = (v as { coordinates: [number, number] }).coordinates;
    return { lng: c[0], lat: c[1] };
  }
  if (typeof v === "string") {
    const m = v.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (m) return { lng: Number(m[1]), lat: Number(m[2]) };
    const p = parseHexEwkbPoint(v);
    if (p) return p;
  }
  return { lat: 0, lng: 0 };
}

function parseHexEwkbPoint(hex: string): { lat: number; lng: number } | null {
  if (hex.length < 42 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const dv = new DataView(bytes.buffer);
  const little = bytes[0] === 1;
  const type = dv.getUint32(1, little);
  if ((type & 0xff) !== 1) return null; // not a Point
  let off = 5;
  if (type & 0x20000000) off += 4; // SRID flag
  if (bytes.length < off + 16) return null;
  return { lng: dv.getFloat64(off, little), lat: dv.getFloat64(off + 8, little) };
}


export type BusinessDetails = {
  id: string; name: string; category_id: string; city: string; phone: string | null; whatsapp: string | null; email: string | null; website: string | null;
  logo_url: string | null; cover_url: string | null; description: string | null; working_hours: unknown;
  service_available: boolean; delivery_available: boolean; pickup_available: boolean; social: Record<string, string>;
  completion_score: number; verification_status: string;
  /** Individuals only (not returned by get_my_business_details; read from the session profile). */
  trade?: string | null; trade_other?: string | null;
  /** Businesses in "Other" (also read from the session profile). */
  category_other?: string | null;
};
export type BusinessPatch = Partial<Pick<BusinessDetails, "name" | "category_id" | "phone" | "whatsapp" | "email" | "website" | "logo_url" | "cover_url" | "description" | "service_available" | "delivery_available" | "pickup_available" | "social" | "trade" | "trade_other" | "category_other">>;

/**
 * Owner-only full row (includes contact fields). Contact columns are not readable through the table at all
 * (column privileges); the `get_my_business_details` function returns them to the business's owner only.
 */
export async function getMyBusinessDetails(id: string): Promise<BusinessDetails> {
  const { data, error } = await supabase.rpc("get_my_business_details", { p_business_id: id }).single();
  if (error) throw error;
  return data as unknown as BusinessDetails;
}

export async function updateBusiness(id: string, patch: BusinessPatch) {
  if (patch.name !== undefined && (patch.name ?? "").trim().length < 2) throw new Error("business name too short");
  const clean = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]));
  const { error } = await supabase.from("businesses").update(clean as never).eq("id", id);
  if (error) throw error;
}

/** Move the business: map point (nearby feed and search) and the city / state / pincode others see. */
export async function updateBusinessLocation(id: string, loc: LocationValue) {
  if (!loc.city.trim() || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) throw new Error("location incomplete");
  const { error } = await supabase.from("businesses").update({
    location: pointWkt(loc) as unknown as string, city: loc.city.trim(), state: loc.state ?? null, pincode: loc.pincode ?? null, country: loc.country ?? "IN",
  }).eq("id", id);
  if (error) throw error;
}

export type BusinessMedia = { id: string; kind: string; url: string; sort: number; created_at: string };
export async function listBusinessMedia(businessId: string): Promise<BusinessMedia[]> {
  const { data, error } = await supabase.from("business_media").select("id,kind,url,sort,created_at").eq("business_id", businessId).order("sort").order("created_at");
  if (error) throw error;
  return data as BusinessMedia[];
}
export async function addBusinessMedia(businessId: string, url: string, kind: "photo" | "video" | "brochure" | "catalogue" = "photo"): Promise<BusinessMedia> {
  const { data, error } = await supabase.from("business_media").insert({ business_id: businessId, url, kind }).select("id,kind,url,sort,created_at").single();
  if (error) throw error;
  return data as BusinessMedia;
}
export async function removeBusinessMedia(id: string) {
  const { error } = await supabase.from("business_media").delete().eq("id", id);
  if (error) throw error;
}

const BUCKET = "business-media";

/** Upload bytes into the business's folder and return the public URL. */
export async function uploadBusinessImage(businessId: string, bytes: ArrayBuffer, kind: "logo" | "cover" | "gallery" | "post", contentType = "image/jpeg"): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  // random suffix: several photos uploaded in the same millisecond must not collide (upsert is off)
  const path = `${businessId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return uploadToPath(path, bytes, contentType);
}

async function uploadToPath(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Path inside the media bucket of one of its public URLs (null for any other URL). */
export function mediaPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  return i < 0 ? null : decodeURIComponent(publicUrl.slice(i + marker.length).split("?")[0]);
}

/** Upload a local JPEG to an exact path in the bucket (e.g. the small copy next to a photo). */
export async function uploadLocalJpegTo(path: string, uri: string): Promise<string> {
  const { bytes, type } = await readLocalImage(uri);
  return uploadToPath(path, bytes, type);
}

/** Read a local image (from expo-image-picker / manipulator) and upload it. Refuses anything that is not an image. */
export async function uploadLocalImage(businessId: string, uri: string, kind: "logo" | "cover" | "gallery" | "post"): Promise<string> {
  const { bytes, type } = await readLocalImage(uri);
  return uploadBusinessImage(businessId, bytes, kind, type);
}
