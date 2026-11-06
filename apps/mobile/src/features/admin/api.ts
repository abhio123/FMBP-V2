import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { AppMode } from "@/store/session";

/**
 * Admin area (ADMIN.md). Every function here calls a server function that checks the caller is an admin and logs the
 * action; the app only decides which screens to show.
 */

export type AdminStats = {
  businesses: number; businesses_today: number; businesses_week: number; posts_live: number; posts_today: number; posts_week: number;
  responses_week: number; messages_week: number; deals_month: number; open_reports: number; hidden_posts: number;
  pending_verifications: number; suspended: number; deletions_pending: number;
};
export type ReportTarget = "post" | "business" | "message";
export type ReportStatus = "open" | "dismissed" | "actioned";
export type ReportGroup = {
  target_type: ReportTarget; target_id: string; reports: number; reasons: string[]; details: string[]; first_at: string; last_at: string;
  title: string; body: string | null; business_id: string | null; business_name: string | null; hidden: boolean; removed: boolean; suspended: boolean;
};
export type ReportAction = "dismiss" | "remove_post" | "suspend_business";
export type SearchHit = { kind: "business" | "post"; id: string; business_id: string; title: string; subtitle: string; flags: string[]; created_at: string };
export type VerificationStatus = "pending" | "verified" | "rejected";
export type VerificationRow = {
  id: string; business_id: string; business_name: string; city: string; doc_type: string; doc_number: string | null; file_path: string | null;
  status: VerificationStatus; note: string | null; created_at: string; reviewed_at: string | null;
};
export type AdminBusiness = {
  id: string; name: string; city: string; pincode: string | null; description: string | null; logo_url: string | null; phone: string | null;
  owner_phone: string | null; owner_name: string | null; created_at: string; verification_status: string; suspended_at: string | null;
  kind: "business" | "individual"; trade: string | null; trade_other: string | null;
  suspension_reason: string | null; deleted_at: string | null; completed_deals: number; rating_avg: number; rating_count: number;
  referral_count: number; category: string | null; posts_live: number; posts_total: number; reports_against: number; reports_made: number;
  verifications: { id: string; doc_type: string; doc_number: string | null; file_path: string | null; status: VerificationStatus; note: string | null; created_at: string; reviewed_at: string | null }[];
  actions: { action: string; note: string | null; admin: string; at: string }[];
};
export type AdminPost = { id: string; title: string; status: string; created_at: string; hidden: boolean; removed: boolean; icon: string | null };
export type AdminSetting = { key: string; value: Record<string, number>; note: string | null; updated_at: string };
export type AdminRow = { phone: string; name: string; added_by: string | null; created_at: string; disabled_at: string | null; is_me: boolean };
export type AdminLogRow = { id: number; admin_phone: string; admin_name: string | null; action: string; target_type: string | null; target_id: string | null; note: string | null; data: Record<string, unknown>; created_at: string };

const ERRORS = ["not_admin", "not_found", "invalid", "reason_required", "too_soon", "bad_phone", "cannot_disable_self", "cannot_suspend_self", "already_reviewed"] as const;
export type AdminErrorCode = (typeof ERRORS)[number];
/** Known server refusals (shown as a sentence); anything else is shown as the raw message. */
export function adminError(e: unknown): AdminErrorCode | null {
  const m = (e as { message?: string })?.message ?? "";
  return (ERRORS as readonly string[]).includes(m) ? (m as AdminErrorCode) : null;
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)(fn, args);
  if (error) throw error;
  return data as T;
}

export const amIAdmin = () => call<boolean>("am_i_admin").then(Boolean);
export const adminStats = () => call<AdminStats>("admin_stats");
export const adminReports = (status: ReportStatus) => call<ReportGroup[]>("admin_reports", { p_status: status });
export const resolveReport = (target: ReportTarget, id: string, action: ReportAction, note: string | null) =>
  call<void>("admin_resolve_report", { p_target_type: target, p_target_id: id, p_action: action, p_note: note });
export const adminSearch = (q: string) => call<SearchHit[]>("admin_search", { p_q: q });
export const adminBusiness = (id: string) => call<AdminBusiness>("admin_business", { p_business_id: id });
export const adminBusinessPosts = (id: string) => call<AdminPost[]>("admin_business_posts", { p_business_id: id });
export const suspendBusiness = (id: string, reason: string) => call<void>("admin_suspend_business", { p_business_id: id, p_reason: reason });
export const unsuspendBusiness = (id: string, note: string | null) => call<void>("admin_unsuspend_business", { p_business_id: id, p_note: note });
export const removePost = (id: string, reason: string) => call<void>("admin_remove_post", { p_post_id: id, p_reason: reason });
export const restorePost = (id: string, note: string | null) => call<void>("admin_restore_post", { p_post_id: id, p_note: note });
export const adminVerifications = (status: VerificationStatus) => call<VerificationRow[]>("admin_verifications", { p_status: status });
export const reviewVerification = (id: string, approve: boolean, note: string | null) =>
  call<void>("admin_review_verification", { p_id: id, p_approve: approve, p_note: note });
export const revokeVerification = (businessId: string, note: string) => call<void>("admin_revoke_verification", { p_business_id: businessId, p_note: note });
export const broadcast = (m: { titleEn: string; bodyEn: string; titleHi: string; bodyHi: string; city: string | null }) =>
  call<number>("admin_broadcast", { p_title_en: m.titleEn.trim(), p_body_en: m.bodyEn.trim(), p_title_hi: m.titleHi.trim(), p_body_hi: m.bodyHi.trim(), p_city: m.city?.trim() || null });
export const adminSettings = () => call<AdminSetting[]>("admin_settings");
export const updateSetting = (key: string, value: Record<string, number>) => call<void>("admin_update_setting", { p_key: key, p_value: value });
export const listAdmins = () => call<AdminRow[]>("admin_list_admins");
export const addAdmin = (phone: string, name: string) => call<void>("admin_add_admin", { p_phone: phone, p_name: name });
export const disableAdmin = (phone: string) => call<void>("admin_disable_admin", { p_phone: phone });
export const adminLog = (limit = 100) => call<AdminLogRow[]>("admin_log", { p_limit: limit });

/** Short-lived link to a verification document in the private bucket (admins and the business itself only). */
export async function verificationDocUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("verification-docs").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

// The admin's choice ("Continue as admin / normal user") is remembered on this phone, per account, until logout.
const modeKey = (userId: string) => `fmbp.mode.${userId}`;
export async function loadMode(userId: string): Promise<AppMode | null> {
  try { const v = await AsyncStorage.getItem(modeKey(userId)); return v === "admin" || v === "user" ? v : null; } catch { return null; }
}
export async function saveMode(userId: string, mode: AppMode) {
  try { await AsyncStorage.setItem(modeKey(userId), mode); } catch { /* the choice is asked again next time */ }
}
export async function clearModes() {
  try { const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("fmbp.mode.")); if (keys.length) await AsyncStorage.multiRemove(keys); } catch { /* best effort */ }
}

// Lists behind the dashboard tiles (newest first, PAGE rows per call). Chat messages are private and not listed.
export const ADMIN_PAGE = 50;
export type BusinessFilter = "all" | "new" | "suspended" | "deleting" | "verified";
export type PostFilter = "live" | "new" | "hidden" | "removed";
export type AdminBusinessRow = {
  id: string; name: string; city: string; logo_url: string | null; owner_phone: string | null; created_at: string; verification_status: string;
  suspended_at: string | null; suspension_reason: string | null; deleted_at: string | null; erase_on: string | null; posts_live: number;
};
export type AdminPostRow = AdminPost & { business_id: string; business_name: string; city: string; response_count: number };
export type AdminDealRow = { id: string; post_title: string | null; post_icon: string | null; business_a: string; business_a_name: string; business_b: string; business_b_name: string; completed_at: string; counted: boolean };
export type AdminResponseRow = { id: string; response_type: string; created_at: string; post_id: string; post_title: string; post_icon: string | null; owner_id: string; owner_name: string; responder_id: string; responder_name: string };
export const listBusinesses = (filter: BusinessFilter, offset: number) => call<AdminBusinessRow[]>("admin_list_businesses", { p_filter: filter, p_limit: ADMIN_PAGE, p_offset: offset });
export const listPosts = (filter: PostFilter, offset: number) => call<AdminPostRow[]>("admin_list_posts", { p_filter: filter, p_limit: ADMIN_PAGE, p_offset: offset });
export const listDeals = (offset: number) => call<AdminDealRow[]>("admin_list_deals", { p_limit: ADMIN_PAGE, p_offset: offset });
export const listResponses = (offset: number) => call<AdminResponseRow[]>("admin_list_responses", { p_limit: ADMIN_PAGE, p_offset: offset });

/** Broadcasts already sent (newest first). Pushes cannot be edited or recalled; send a correction instead. */
export type SentBroadcast = { id: number; created_at: string; admin_phone: string; admin_name: string | null; city: string | null; recipients: number; title_en: string; body_en: string; title_hi: string | null; body_hi: string | null };
export const listBroadcasts = () => call<SentBroadcast[]>("admin_broadcasts", { p_limit: 50 });
