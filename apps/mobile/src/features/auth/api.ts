import { supabase } from "@/lib/supabase";

/** Indian mobile: exactly 10 digits, first digit 6–9. */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
export const isValidIndianMobile = (phone10: string) => INDIAN_MOBILE_RE.test(phone10);

const toE164 = (phone10: string) => `+91${phone10}`;

export type AuthFailure = { code?: string; message: string };

/**
 * Map a Supabase auth error to an i18n key under "auth.errors".
 * Falls back to "generic" so users never see provider internals (e.g. Twilio messages).
 */
export function authErrorKey(err: AuthFailure): string {
  switch (err.code) {
    case "sms_send_failed":
    case "validation_failed":
      return "auth.errors.phoneNotReachable";
    case "over_sms_send_rate_limit":
    case "over_request_rate_limit":
      return "auth.errors.tooManyRequests";
    case "otp_expired":
    case "otp_disabled":
      return "auth.errors.wrongOtp";
    default:
      return /network/i.test(err.message) ? "auth.errors.network" : "auth.errors.generic";
  }
}

/** Returns a failure or null. Validates the number locally before hitting the API. */
export async function sendOtp(phone10: string): Promise<AuthFailure | null> {
  if (!isValidIndianMobile(phone10)) return { code: "validation_failed", message: "invalid phone" };
  const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone10) });
  return error ? { code: error.code, message: error.message } : null;
}

export async function verifyOtp(phone10: string, token: string): Promise<AuthFailure | null> {
  const { error } = await supabase.auth.verifyOtp({ phone: toE164(phone10), token, type: "sms" });
  return error ? { code: error.code, message: error.message } : null;
}

/** Default signs out everywhere (safer for a phone app); pass scope "local" to keep other devices logged in. */
export async function signOut(opts: { scope?: "global" | "local" } = {}) {
  await supabase.auth.signOut(opts.scope ? { scope: opts.scope } : undefined);
}

/**
 * A cached session can outlive its server-side session (signed out from another device, deleted user).
 * PostgREST still accepts the JWT, but Auth and Edge Functions reject it. Returns false if the server disowns it.
 */
export async function validateSession(): Promise<boolean> {
  const { error } = await supabase.auth.getUser();
  if (!error) return true;
  if (error.status === 401 || error.status === 403) { await supabase.auth.signOut({ scope: "local" }); return false; }
  return true; // network hiccup: keep the local session
}
