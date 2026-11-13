// Scheduled job (daily, after fmbp_erase_accounts): removes the photo files of erased accounts. The database queues
// each erased business (fmbp.media_erase_queue); files live under business-media/<business_id>/ and
// verification-docs/<business_id>/. Only callable with
// the service role key.
import { serviceClient } from "../_shared/supabase.ts";
import { json } from "../_shared/cors.ts";

// photos (public) and documents sent for Verified (private): both keep files under <business_id>/
const BUCKETS = ["business-media", "verification-docs"];

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) return json({ error: "forbidden" }, 403);
  const db = serviceClient();
  const { data: ids, error } = await db.rpc("media_to_erase", { p_limit: 50 });
  if (error) return json({ error: error.message }, 500);
  const done: string[] = [];
  for (const id of (ids ?? []) as string[]) {
    // list in pages of 100 and remove until the folder is empty
    for (const bucket of BUCKETS) {
      for (;;) {
        const { data: files, error: listErr } = await db.storage.from(bucket).list(id, { limit: 100 });
        if (listErr) return json({ error: listErr.message, done }, 500);
        if (!files?.length) break;
        const { error: rmErr } = await db.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
        if (rmErr) return json({ error: rmErr.message, done }, 500);
      }
    }
    done.push(id);
  }
  if (done.length) {
    const { error: doneErr } = await db.rpc("media_erased", { p_business_ids: done });
    if (doneErr) return json({ error: doneErr.message, done }, 500);
  }
  return json({ erased: done.length });
});
