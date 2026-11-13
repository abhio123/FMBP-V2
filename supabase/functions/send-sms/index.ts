// Supabase Auth "Send SMS" hook → MSG91 (DLT-registered OTP template). Production phone login goes through here;
// locally the test OTP in config.toml is used instead and this function is never called.
//
// Dashboard → Authentication → Hooks → Send SMS: point at this function's URL and paste the generated secret into
// SEND_SMS_HOOK_SECRET. MSG91: create an OTP flow/template containing ##OTP## and put its id in MSG91_TEMPLATE_ID.
import { Webhook } from "npm:standardwebhooks@1";
import { missingMsg91Settings, parseMsg91Response } from "@fmbp/shared/sms.ts";
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

  // Without these MSG91 answers "error" and no SMS is sent; fail clearly instead of telling the app the code is on its way.
  const missing = missingMsg91Settings({ MSG91_AUTH_KEY: env("MSG91_AUTH_KEY"), MSG91_TEMPLATE_ID: env("MSG91_TEMPLATE_ID") });
  if (missing.length) {
    console.error("send-sms: not configured, missing", missing.join(", "));
    return json({ error: { http_code: 500, message: "sms provider not configured" } }, 500);
  }

  const res = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { "content-type": "application/json", authkey: env("MSG91_AUTH_KEY") },
    body: JSON.stringify({
      template_id: env("MSG91_TEMPLATE_ID"),
      sender: env("MSG91_SENDER") || undefined,
      short_url: "0",
      // the template variable is usually ##OTP## or ##var1##; both are sent so either name works
      recipients: [{ mobiles: phone, otp, var1: otp }],
    }),
  });
  // MSG91 reports most failures with HTTP 200 and {"type":"error"}, so the body decides (packages/shared/src/sms.ts)
  const result = parseMsg91Response(res.status, await res.text());
  if (!result.ok) {
    console.error("msg91 failed", result.reason);
    return json({ error: { http_code: 500, message: "sms provider error" } }, 500);
  }
  return json({});
});
