import { supabase } from "@/lib/supabase";

/** Reasons a post, business or message can be reported (same list as the database check). */
export const REPORT_REASONS = ["fraud", "abusive", "inappropriate", "spam", "wrong_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTarget = "post" | "business" | "message";

/**
 * Report something. A reported post disappears for the reporter at once; 3 reports from different businesses hide it
 * for everyone until an admin reviews it (migration 20261105000004). Reporting the same thing twice is a no-op.
 */
export async function report(reporterBusinessId: string, targetType: ReportTarget, targetId: string, reason: ReportReason, details?: string) {
  const note = details?.trim().slice(0, 500) || null;
  const { error } = await supabase.from("reports").insert({ reporter_business_id: reporterBusinessId, target_type: targetType, target_id: targetId, reason, details: note });
  if (error && error.code !== "23505") throw error; // 23505: already reported by this business
}

/** Block a business: no messages either way, no responses to my posts, its posts hidden for me. They are not told. */
export async function blockBusiness(myBusinessId: string, otherBusinessId: string) {
  const { error } = await supabase.from("business_blocks").insert({ blocker_business_id: myBusinessId, blocked_business_id: otherBusinessId });
  if (error && error.code !== "23505") throw error;
}

export async function unblockBusiness(myBusinessId: string, otherBusinessId: string) {
  const { error } = await supabase.from("business_blocks").delete().eq("blocker_business_id", myBusinessId).eq("blocked_business_id", otherBusinessId);
  if (error) throw error;
}

export type BlockedBusiness = { id: string; name: string; city: string | null; logo_url: string | null; blocked_at: string };

/** Businesses I blocked, newest first. */
export async function listBlocked(myBusinessId: string): Promise<BlockedBusiness[]> {
  const { data, error } = await supabase.from("business_blocks")
    .select("created_at, blocked:businesses_public!blocked_business_id(id, name, city, logo_url)")
    .eq("blocker_business_id", myBusinessId).order("created_at", { ascending: false });
  if (error) throw error;
  type Row = { created_at: string; blocked: Omit<BlockedBusiness, "blocked_at"> | null };
  return ((data ?? []) as unknown as Row[]).filter((r) => r.blocked).map((r) => ({ ...r.blocked!, blocked_at: r.created_at }));
}

/** The database refused because one of the two businesses blocked the other. */
export const isBlockedError = (e: unknown) => (e as { message?: string } | null)?.message === "blocked";
