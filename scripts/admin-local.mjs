// Local development only: makes 9999900000 (OTP 123456, supabase/config.toml) an admin in the running local database.
// Production admins are added by an existing admin in the app (Admin → More → Admins) or, for the very first one, with
// the SQL in ADMIN.md. Run: pnpm admin:local
import { spawnSync } from "node:child_process";

const sql = "insert into public.admins (phone, name, added_by) values ('919999900000', 'Local test admin', 'admin:local') on conflict (phone) do update set disabled_at = null;";
const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_MobileApp";
const r = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], { encoding: "utf8" });
if (r.error) { console.error(`docker not reachable: ${r.error.message}`); process.exit(1); }
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(r.status ?? 1); }
console.log("local admin ready: 9999900000, OTP 123456");
