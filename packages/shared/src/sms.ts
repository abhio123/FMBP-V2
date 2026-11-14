/**
 * MSG91 (OTP SMS for phone login) response check, used by the `send-sms` Edge Function.
 *
 * MSG91 reports most failures (wrong auth key, unknown or unapproved DLT template, no balance) with HTTP 200 and a
 * body like {"type":"error","message":"..."}. Checking only the HTTP status would tell Supabase the code was sent
 * while no SMS ever arrives. Success looks like {"type":"success","message":"<request id>"}.
 */
export type Msg91Result = { ok: true } | { ok: false; reason: string };

export function parseMsg91Response(status: number, bodyText: string): Msg91Result {
  let body: unknown = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }
  const type = typeof body === "object" && body !== null ? (body as { type?: unknown }).type : undefined;
  const message = typeof body === "object" && body !== null ? (body as { message?: unknown }).message : undefined;
  const detail = (typeof message === "string" ? message : bodyText).slice(0, 200);

  if (status < 200 || status >= 300) return { ok: false, reason: `HTTP ${status}: ${detail}` };
  if (type === "success") return { ok: true };
  if (type === "error") return { ok: false, reason: detail || "error" };
  return { ok: false, reason: `unexpected response: ${detail}` };
}

/**
 * FMBP sends login codes only to Indian mobiles: 91 + 10 digits starting 6–9 (digits only, as Supabase passes them,
 * with or without "+"). The app checks this too, but anyone can call the login API directly; without this check an
 * attacker could make us pay for SMS to expensive foreign numbers ("SMS pumping").
 */
export function isIndianMobile(phone: string): boolean {
  return /^91[6-9]\d{9}$/.test(phone.replace(/^\+/, ""));
}

/**
 * MSG91 SendOTP request (POST, auth key in the `authkey` header). The code is Supabase's own: MSG91 only delivers it,
 * Supabase verifies it. SendOTP is MSG91's API for login codes; it works with MSG91's default OTP template until our
 * own DLT template is approved, then with ours (MSG91_TEMPLATE_ID). Phone: digits only, 91 first.
 */
export function msg91OtpUrl(phone: string, otp: string, templateId?: string): string {
  const q = new URLSearchParams({ mobile: phone.replace(/^\+/, ""), otp });
  // no template id: MSG91 decides (its default OTP message, or an error saying a template is required)
  if (templateId?.trim()) q.set("template_id", templateId.trim());
  return `https://control.msg91.com/api/v5/otp?${q.toString()}`;
}

/** Settings send-sms needs before it can call MSG91 (only the auth key); returns the names that are missing. */
export function missingMsg91Settings(env: { MSG91_AUTH_KEY?: string; MSG91_TEMPLATE_ID?: string }): string[] {
  // the template id is optional: without it MSG91 uses its default OTP template where the account allows one
  return (["MSG91_AUTH_KEY"] as const).filter((k) => !env[k]?.trim());
}
