import { supabase } from "@/lib/supabase";

/**
 * Confirmed deals (migration 20261105000009): the owner closes a post and picks who it was done with, that business
 * confirms with one tap, then the deal counts for both and each side may rate the other.
 */
export type DealCandidate = { business_id: string; name: string; logo_url: string | null };
export type MyDeal = {
  id: string; status: "proposed" | "confirmed" | "completed" | "cancelled"; post_id: string | null; post_title: string | null; post_icon: string | null;
  /** true: I closed the post and named the other business; false: I was named and confirm. */
  i_am_owner: boolean;
  other_id: string | null; other_name: string; other_logo: string | null; created_at: string; completed_at: string | null;
  /** false when the same two businesses already had a counted deal in the last 30 days */
  counted: boolean;
  my_rating: number | null;
  /** shown once both rated, or after 14 days */
  their_rating: number | null;
};
export type PublicDeal = { post_title: string; post_icon: string | null; completed_at: string };

/** Businesses that responded to or chatted about this post (who the owner can name). */
export async function getDealCandidates(postId: string): Promise<DealCandidate[]> {
  const { data, error } = await supabase.rpc("deal_candidates", { p_post_id: postId });
  if (error) throw error;
  return (data ?? []) as DealCandidate[];
}

/** Close the post; with `partnerId`, that business is asked to confirm the deal. */
export async function closePostWithDeal(postId: string, partnerId: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc("close_post_with_deal", { p_post_id: postId, ...(partnerId ? { p_partner_id: partnerId } : {}) });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** The named business: yes, we did this deal (it counts) / no, not with us. */
export async function respondToDeal(dealId: string, confirm: boolean) {
  const { error } = await supabase.rpc("respond_to_deal", { p_deal_id: dealId, p_confirm: confirm });
  if (error) throw error;
}

export async function rateDeal(dealId: string, rating: number, text?: string) {
  const { error } = await supabase.rpc("rate_deal", { p_deal_id: dealId, p_rating: rating, ...(text?.trim() ? { p_text: text.trim() } : {}) });
  if (error) throw error;
}

export async function listMyDeals(businessId: string): Promise<MyDeal[]> {
  const { data, error } = await supabase.rpc("my_deals", { p_business_id: businessId });
  if (error) throw error;
  return (data ?? []) as MyDeal[];
}

/** A business's confirmed deals for its public page: post title and date only. */
export async function listBusinessDeals(businessId: string): Promise<PublicDeal[]> {
  const { data, error } = await supabase.rpc("business_deals", { p_business_id: businessId });
  if (error) throw error;
  return (data ?? []) as PublicDeal[];
}

/** Confirmed deals in the last 30 days, in a city (null = everywhere). */
export async function dealsDoneCount(city: string | null): Promise<number> {
  const { data, error } = await supabase.rpc("deals_done_count", city ? { p_city: city } : {});
  if (error) throw error;
  return (data as number) ?? 0;
}

/** What needs my action: deals to confirm and confirmed deals I have not rated. */
export function dealsToDo(deals: MyDeal[]) {
  const toConfirm = deals.filter((d) => d.status === "proposed" && !d.i_am_owner);
  const toRate = deals.filter((d) => d.status === "completed" && d.my_rating == null);
  return { toConfirm, toRate, count: toConfirm.length + toRate.length };
}

/** The reason code the database gave (for a translated message), else null. */
export function dealError(e: unknown): string | null {
  const m = (e as { message?: string } | null)?.message ?? "";
  return ["not_a_candidate", "deal_exists", "deal_not_open", "deal_not_completed", "already_rated", "bad_rating"].includes(m) ? m : null;
}
