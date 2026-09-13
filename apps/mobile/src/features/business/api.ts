import { supabase } from "@/lib/supabase";
import type { BusinessSummary } from "@/store/session";
import type { LocationValue } from "@fmbp/shared";

const pointWkt = (l: { lat: number; lng: number }) => `SRID=4326;POINT(${l.lng} ${l.lat})`;

/** The signed-in user's business (first created), or null. Pass the user id when you already have it. */
export async function loadMyBusiness(userId?: string): Promise<BusinessSummary | null> {
  let uid = userId;
  if (!uid) {
    const { data: u } = await supabase.auth.getUser();
    uid = u.user?.id;
  }
  if (!uid) return null;
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,category_id,city,state,pincode,logo_url,completion_score,verification_status,location,category:categories!category_id(slug)")
    .eq("owner_id", uid)
    .is("deleted_at", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { category, location, ...rest } = data as typeof data & { category: { slug: string } | null };
  const { lat, lng } = parsePoint(location as unknown);
  return { ...rest, category_slug: category?.slug ?? null, lat, lng };
}

export async function createBusiness(input: { name: string; category_id: string; location: LocationValue; ownerName?: string }) {
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
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_hi,icon,sort").is("parent_id", null).order("sort");
  if (error) throw error;
  return data;
}

export type BusinessPublic = {
  id: string; name: string; city: string; state: string | null; pincode: string | null; logo_url: string | null; cover_url: string | null;
  description: string | null; verification_status: string; response_rate: number; member_since: string; rating_avg: number; rating_count: number;
  completed_deals: number; completion_score: number; service_available: boolean; delivery_available: boolean; pickup_available: boolean;
  category: { name_en: string; name_hi: string; icon: string | null } | null;
};

/** Public profile (never includes phone/whatsapp/email). */
export async function getBusinessPublic(id: string): Promise<BusinessPublic> {
  const { data, error } = await supabase
    .from("businesses_public")
    .select("id,name,city,state,pincode,logo_url,cover_url,description,verification_status,response_rate,member_since,rating_avg,rating_count,completed_deals,completion_score,service_available,delivery_available,pickup_available,category:categories!category_id(name_en,name_hi,icon)")
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
  id: string; name: string; city: string; phone: string | null; whatsapp: string | null; email: string | null; website: string | null;
  logo_url: string | null; cover_url: string | null; description: string | null; working_hours: unknown;
  service_available: boolean; delivery_available: boolean; pickup_available: boolean; social: Record<string, string>;
  completion_score: number; verification_status: string;
};
export type BusinessPatch = Partial<Pick<BusinessDetails, "name" | "phone" | "whatsapp" | "email" | "website" | "logo_url" | "cover_url" | "description" | "service_available" | "delivery_available" | "pickup_available" | "social">>;

/** Owner-only full row (includes contact fields). */
export async function getMyBusinessDetails(id: string): Promise<BusinessDetails> {
  const { data, error } = await supabase.from("businesses")
    .select("id,name,city,phone,whatsapp,email,website,logo_url,cover_url,description,working_hours,service_available,delivery_available,pickup_available,social,completion_score,verification_status")
    .eq("id", id).single();
  if (error) throw error;
  return data as unknown as BusinessDetails;
}

export async function updateBusiness(id: string, patch: BusinessPatch) {
  const clean = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]));
  const { error } = await supabase.from("businesses").update(clean as never).eq("id", id);
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
export async function uploadBusinessImage(businessId: string, bytes: ArrayBuffer, kind: "logo" | "cover" | "gallery", contentType = "image/jpeg"): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${businessId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Read a local image (from expo-image-picker / manipulator) and upload it. */
export async function uploadLocalImage(businessId: string, uri: string, kind: "logo" | "cover" | "gallery"): Promise<string> {
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const type = res.headers.get("content-type")?.split(";")[0] || (uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
  return uploadBusinessImage(businessId, bytes, kind, type);
}
