import { supabase } from "@/lib/supabase";
import { AiGenerateResponse, type AiGenerateRequest, type FormValues, type LocationValue, type ResponseType, type DealType } from "@fmbp/shared";
import type { Json } from "@fmbp/shared/src/database.types";

const pointWkt = (l: { lat: number; lng: number }) => `SRID=4326;POINT(${l.lng} ${l.lat})`;

export async function listIntentions() {
  // only intentions that still have something to post (Partner / Invest were folded into Need / Offer on 2026-11-04)
  const { data, error } = await supabase.from("intentions").select("id,slug,name_en,name_hi,icon,sort,post_types!inner(id)")
    .eq("post_types.active", true).order("sort").limit(1, { referencedTable: "post_types" });
  if (error) throw error;
  return data;
}

export async function listPostTypes(intentionId: string) {
  const { data, error } = await supabase.from("post_types")
    .select("id,slug,name_en,name_hi,plain_label_en,plain_label_hi,advanced_label_en,advanced_label_hi,icon,sort")
    .eq("intention_id", intentionId).eq("active", true).order("sort");
  if (error) throw error;
  return data;
}

export async function generateCopy(req: AiGenerateRequest) {
  const { data, error } = await supabase.functions.invoke("ai-generate", { body: req });
  if (error) throw error;
  return AiGenerateResponse.parse(data);
}

export async function createPost(input: {
  business_id: string; post_type_id: string; category_id?: string | null;
  title: string; description: string | null;
  basic: FormValues; advanced: FormValues;
  amount_min?: number; amount_max?: number; location: LocationValue; tags?: string[]; deal_type?: DealType;
}) {
  const { data, error } = await supabase.from("opportunity_posts").insert({
    business_id: input.business_id,
    post_type_id: input.post_type_id,
    category_id: input.category_id ?? null,
    title: input.title,
    description: input.description,
    basic: input.basic as NonNullable<Json>,
    advanced: input.advanced as NonNullable<Json>,
    amount_min: input.amount_min ?? null,
    amount_max: input.amount_max ?? null,
    location: pointWkt(input.location) as unknown as string,
    city: input.location.city,
    state: input.location.state ?? null,
    pincode: input.location.pincode ?? null,
    deal_type: input.deal_type ?? null,
  }).select("id").single();
  if (error) throw error;
  if (input.tags?.length) {
    const { error: tagErr } = await supabase.from("post_tags").insert(input.tags.map((tag) => ({ post_id: data.id, tag })));
    if (tagErr) throw tagErr;
  }
  return data.id as string;
}

/**
 * Card projection shared by feed, search, detail and my-posts.
 * `businesses_public!business_id` disambiguates the direct FK from the many-to-many path through saved_posts.
 */
export const POST_CARD_SELECT = `
  id, title, description, city, state, pincode, amount_min, amount_max, status, expires_at, renewed_at, deal_type, edited_at,
  view_count, response_count, created_at, basic, advanced, hidden_at, boosted_until,
  post_type:post_types!post_type_id(slug, name_en, name_hi, icon),
  business:businesses_public!business_id(id, name, logo_url, verification_status, response_rate, response_sample, member_since, rating_avg, rating_count, completed_deals,
    referral_count, category:categories!category_id(name_en, name_hi, icon))
`;

export type PostCardRow = {
  id: string; title: string; description: string | null; city: string; state: string | null; pincode: string | null;
  amount_min: number | null; amount_max: number | null; status: string; expires_at: string; renewed_at: string | null;
  /** "How do you want to work?": pay | rent | partnership | exchange (null on posts from before 2026-11-03). */
  deal_type: string | null;
  /** Set by the database when the owner edits the post content (shown as "Updated on"). */
  edited_at: string | null;
  view_count: number; response_count: number; created_at: string; basic: Record<string, unknown>; advanced: Record<string, unknown>;
  /** Hidden for everyone but the owner while reports about it are reviewed. */
  hidden_at: string | null;
  /** In the Boosted row at the top of Latest until then (a referral reward). */
  boosted_until: string | null;
  post_type: { slug: string; name_en: string; name_hi: string; icon: string | null } | null;
  business: {
    id: string; name: string; logo_url: string | null; verification_status: string; response_rate: number; response_sample: number;
    member_since: string; rating_avg: number; rating_count: number; completed_deals: number; referral_count: number;
    category: { name_en: string; name_hi: string; icon: string | null } | null;
  } | null;
  /** Only set by the nearby feed. */
  distance_km?: number;
};

export async function getPost(id: string) {
  const { data, error } = await supabase.from("opportunity_posts").select(POST_CARD_SELECT).eq("id", id).single();
  if (error) throw error;
  return data as unknown as PostCardRow;
}

/**
 * A published post as form answers, to edit it in the Post flow: its type (and intention) plus basic + advanced values
 * (including any "Other" text). Owner only (RLS).
 */
export async function loadPostForEdit(postId: string) {
  const { data, error } = await supabase.from("opportunity_posts")
    .select("id,basic,advanced,post_type:post_types!post_type_id(id,slug,name_en,name_hi,intention_id)").eq("id", postId).single();
  if (error) throw error;
  const row = data as unknown as { basic: FormValues | null; advanced: FormValues | null; post_type: { id: string; slug: string; name_en: string; name_hi: string; intention_id: string } };
  const { intention_id, ...postType } = row.post_type;
  return { postId, intentionId: intention_id, postType, values: { ...(row.advanced ?? {}), ...(row.basic ?? {}) } };
}

/**
 * Save an edited post: content only. Status, responses, views and the expiry date stay as they are (only Renew
 * extends a post); the database records the edit time (edited_at → "Updated on").
 */
export async function updatePost(postId: string, input: {
  title: string; description: string | null; basic: FormValues; advanced: FormValues;
  amount_min?: number; amount_max?: number; location: LocationValue; deal_type?: DealType;
}) {
  const { data, error } = await supabase.from("opportunity_posts").update({
    title: input.title,
    description: input.description,
    basic: input.basic as NonNullable<Json>,
    advanced: input.advanced as NonNullable<Json>,
    amount_min: input.amount_min ?? null,
    amount_max: input.amount_max ?? null,
    location: pointWkt(input.location) as unknown as string,
    city: input.location.city,
    state: input.location.state ?? null,
    pincode: input.location.pincode ?? null,
    deal_type: input.deal_type ?? null,
  }).eq("id", postId).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("post could not be updated");
}

/** Fetch cards for a list of ids and return them in the same order as `ids`. */
export async function getPostCards(ids: string[]): Promise<PostCardRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("opportunity_posts").select(POST_CARD_SELECT).in("id", ids);
  if (error) throw error;
  const byId = new Map((data as unknown as PostCardRow[]).map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is PostCardRow => !!r);
}

export async function listMyPosts(businessId: string) {
  const { data, error } = await supabase.from("opportunity_posts").select(POST_CARD_SELECT)
    .eq("business_id", businessId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PostCardRow[];
}

export async function listPostsByBusiness(businessId: string) {
  const { data, error } = await supabase.from("opportunity_posts").select(POST_CARD_SELECT)
    .eq("business_id", businessId).eq("status", "active").is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data as unknown as PostCardRow[];
}

export async function recordView(postId: string, businessId: string | null) {
  await supabase.from("post_views").insert({ post_id: postId, business_id: businessId });
}

export type MyResponse = { id: string; response_type: ResponseType; message: string | null; created_at: string; replied_at: string | null; conversation_id: string | null };

/** The viewer's own response to a post, if any. */
export async function getMyResponse(postId: string, businessId: string): Promise<MyResponse | null> {
  const { data, error } = await supabase.from("post_responses").select("id,response_type,message,created_at,replied_at,conversation_id")
    .eq("post_id", postId).eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  return data as MyResponse | null;
}

/**
 * One response per business per post (enforced by a unique constraint).
 * Pass the conversation opened for this response so the owner's reply marks it as answered (response rate).
 */
export async function respondToPost(postId: string, businessId: string, responseType: ResponseType = "interested", message?: string, conversationId?: string) {
  const { data, error } = await supabase.from("post_responses")
    .insert({ post_id: postId, business_id: businessId, response_type: responseType, message: message ?? null, conversation_id: conversationId ?? null })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Undo "Interested" (a lightweight signal, reversible like a save). RLS only lets the responder delete their own
 * `interested` row; a "Let's talk" response stays because it belongs to a conversation. Throws if nothing was removed.
 */
export async function withdrawInterest(responseId: string) {
  const { data, error } = await supabase.from("post_responses").delete().eq("id", responseId).eq("response_type", "interested").select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("interest could not be withdrawn");
}

/** Responses received on a post (owner only, by RLS). */
export async function listPostResponses(postId: string) {
  const { data, error } = await supabase.from("post_responses")
    .select("id,response_type,message,created_at,replied_at,conversation_id,business:businesses_public!business_id(id,name,city,verification_status)")
    .eq("post_id", postId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as (MyResponse & { business: { id: string; name: string; city: string; verification_status: string } | null })[];
}

export async function setPostStatus(postId: string, status: "active" | "paused" | "completed" | "archived") {
  const { error } = await supabase.from("opportunity_posts").update({ status }).eq("id", postId);
  if (error) throw error;
}

/**
 * One live post per kind (migration 20261105000003): my live post of the same type and sub-category, if any.
 * `excludeId`: the post being edited.
 */
export async function findLiveDuplicate(businessId: string, postTypeId: string, basic: FormValues, advanced: FormValues, excludeId?: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc("find_live_duplicate", {
    p_business_id: businessId, p_post_type_id: postTypeId, p_basic: basic as NonNullable<Json>, p_advanced: advanced as NonNullable<Json>,
    ...(excludeId ? { p_exclude: excludeId } : {}),
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** The database refused a second live post of the same kind: the id of the existing one ("" if unknown), else null. */
export function duplicateLivePostId(e: unknown): string | null {
  const x = e as { message?: string; details?: string } | null;
  return x?.message === "duplicate_live_post" ? (x.details ?? "") : null;
}

export async function renewPost(postId: string) {
  const { error } = await supabase.rpc("renew_post", { p_post_id: postId });
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("opportunity_posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId);
  if (error) throw error;
}
