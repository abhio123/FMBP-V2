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

/** Settings send-sms needs before it can call MSG91; returns the names that are missing. */
export function missingMsg91Settings(env: { MSG91_AUTH_KEY?: string; MSG91_TEMPLATE_ID?: string }): string[] {
  return (["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"] as const).filter((k) => !env[k]?.trim());
}
