import { supabase } from "@/lib/supabase";

/** Days between "Delete account" and the permanent erasure (migration 20261105000005). */
export const DELETION_GRACE_DAYS = 30;

/** When this user asked to delete their account (null = not asked). */
export async function getDeletionRequest(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("users").select("deletion_requested_at").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.deletion_requested_at ?? null;
}

/** Hides the business and its posts at once; personal data is erased after the grace period. Returns the erase date. */
export async function requestAccountDeletion(): Promise<string> {
  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) throw error;
  return data as string;
}

/** Signed in again within the grace period: everything comes back as it was. */
export async function cancelAccountDeletion() {
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) throw error;
}

/** Date the data is erased for good, for a request made at `requestedAt`. */
export const erasureDate = (requestedAt: string) => new Date(new Date(requestedAt).getTime() + DELETION_GRACE_DAYS * 86_400_000);
