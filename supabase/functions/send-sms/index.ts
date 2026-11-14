// Supabase Auth "Send SMS" hook → MSG91 (DLT-registered OTP template). Production phone login goes through here;
// locally the test OTP in config.toml is used instead and this function is never called.
//
// Dashboard → Authentication → Hooks → Send SMS: point at this function's URL and paste the generated secret into
// SEND_SMS_HOOK_SECRET. MSG91: SendOTP → the OTP template id (MSG91's default one until our DLT template is approved)
// goes into MSG91_TEMPLATE_ID, the auth key into MSG91_AUTH_KEY.
import { Webhook } from "npm:standardwebhooks@1";
import { isIndianMobile, missingMsg91Settings, msg91OtpUrl, parseMsg91Response } from "@fmbp/shared/sms.ts";
import { json } from "../_shared/cors.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  const secret = env("SEND_SMS_HOOK_SECRET");
  const raw = await req.text();
  if (!secret) return json({ error: "SEND_SMS_HOOK_SECRET not set" }, 500);
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    // Supabase signs hook calls with Standard Webhooks; the secret is shown as "v1,whsec_<base64>".
    const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));
    payload = wh.verify(raw, Object.fromEntries(req.headers)) as typeof payload;
  } catch (e) {
    return json({ error: `invalid signature: ${(e as Error).message}` }, 401);
  }
  const phone = (payload.user?.phone ?? "").replace(/^\+/, "");
  const otp = payload.sms?.otp ?? "";
  if (!phone || !otp) return json({ error: "missing phone or otp" }, 400);
  // only Indian mobiles: blocks paid SMS to foreign numbers by someone calling the login API directly
  if (!isIndianMobile(phone)) {
    console.warn("send-sms: refused non-Indian number", phone.slice(0, 4) + "…");
    return json({ error: { http_code: 400, message: "only Indian mobile numbers are supported" } }, 400);
  }

  // Without the auth key MSG91 answers "error" and no SMS is sent; fail clearly instead of telling the app the code is on its way.
  const missing = missingMsg91Settings({ MSG91_AUTH_KEY: env("MSG91_AUTH_KEY"), MSG91_TEMPLATE_ID: env("MSG91_TEMPLATE_ID") });
  if (missing.length) {
    console.error("send-sms: not configured, missing", missing.join(", "));
    return json({ error: { http_code: 500, message: "sms provider not configured" } }, 500);
  }

  // MSG91 SendOTP (made for login codes): delivers Supabase's code with our template (packages/shared/src/sms.ts)
  const res = await fetch(msg91OtpUrl(phone, otp, env("MSG91_TEMPLATE_ID")), {
    method: "POST",
    headers: { "content-type": "application/json", authkey: env("MSG91_AUTH_KEY") },
    body: "{}",
  });
  // MSG91 reports most failures with HTTP 200 and {"type":"error"}, so the body decides (packages/shared/src/sms.ts)
  const result = parseMsg91Response(res.status, await res.text());
  if (!result.ok) {
    console.error("msg91 failed", result.reason);
    return json({ error: { http_code: 500, message: "sms provider error" } }, 500);
  }
  // accepted by MSG91 only: delivery can still fail at the operator (e.g. no DLT template). Search this id in MSG91 → Reports.
  console.log("msg91 accepted", result.requestId ?? "(no request id)", "to", phone.slice(0, 4) + "…" + phone.slice(-2));
  return json({});
});
