import { supabase } from "@/lib/supabase";

/** My referral details (migration 20261105000007). */
export type MyReferral = { code: string; boost_credits: number; referral_count: number; pending: number; can_enter_code: boolean; referred_by: string | null };

/** Counted referrals that earn the "Community builder" badge. */
export const COMMUNITY_BUILDER_AT = 5;
/** Days a Boost keeps a post in the Boosted row. */
export const BOOST_DAYS = 3;

export async function getMyReferral(businessId: string): Promise<MyReferral | null> {
  const { data, error } = await supabase.rpc("my_referral", { p_business_id: businessId }).maybeSingle();
  if (error) throw error;
  return (data as MyReferral | null) ?? null;
}

/** Enter the code of the business that invited me. Errors: invalid_code, own_code, already_referred, too_late, no_business. */
export async function applyReferralCode(code: string) {
  const { error } = await supabase.rpc("apply_referral_code", { p_code: code });
  if (error) throw error;
}

/** Spend one Boost on a live post; returns until when it is boosted. Errors: no_boosts, post_not_live. */
export async function boostPost(postId: string): Promise<string> {
  const { data, error } = await supabase.rpc("boost_post", { p_post_id: postId });
  if (error) throw error;
  return data as string;
}

/** The reason code the database gave (for a translated message), else null. */
export function referralError(e: unknown): string | null {
  const m = (e as { message?: string } | null)?.message ?? "";
  return ["invalid_code", "own_code", "already_referred", "too_late", "no_business", "no_boosts", "post_not_live"].includes(m) ? m : null;
}
