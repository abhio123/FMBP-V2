import { supabase } from "@/lib/supabase";

/** Documents a business can send for the ✔ Verified badge (database enum verification_doc_type). */
export const DOC_TYPES = ["gst", "udyam", "fssai", "trade_license", "iec", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export type MyVerification = { id: string; doc_type: DocType; status: "pending" | "verified" | "rejected"; note: string | null; created_at: string; reviewed_at: string | null };

const BUCKET = "verification-docs"; // private: only this business and FMBP admins can open the files

/** Latest request of my business (status and, when rejected, the admin's reason). */
export async function getMyVerification(businessId: string): Promise<MyVerification | null> {
  const { data, error } = await supabase.from("business_verifications").select("id,doc_type,status,note,created_at,reviewed_at")
    .eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as MyVerification | null;
}

/** Upload the document photo (private bucket) and ask FMBP to verify the business. */
export async function requestVerification(businessId: string, docType: DocType, docNumber: string, photoUri: string): Promise<void> {
  const bytes = await (await fetch(photoUri)).arrayBuffer();
  const path = `${businessId}/doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.rpc("request_verification", { p_business_id: businessId, p_doc_type: docType, p_doc_number: docNumber.trim(), p_file_path: path });
  if (error) throw error;
}

export function verificationError(e: unknown): "already_pending" | "already_verified" | null {
  const m = (e as { message?: string })?.message;
  return m === "already_pending" || m === "already_verified" ? m : null;
}
