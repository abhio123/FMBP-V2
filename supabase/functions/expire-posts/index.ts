// Scheduled (cron) job: expire posts past expires_at and recompute response rates.
// Calls the service-role-only wrappers in `public` (the fmbp schema is not exposed through PostgREST).
import { serviceClient } from "../_shared/supabase.ts";
import { json } from "../_shared/cors.ts";

Deno.serve(async () => {
  const db = serviceClient();
  const { data: expired, error } = await db.rpc("run_expire_posts");
  if (error) return json({ error: error.message }, 500);
  const { error: rrErr } = await db.rpc("run_recompute_response_rates");
  if (rrErr) return json({ error: rrErr.message }, 500);
  return json({ expired });
});
