// Applies supabase/seed/*.sql to the running local database in one transaction, WITHOUT wiping data (the seed files
// only insert or update their rows). Use after a pull that changed supabase/seed/ or supabase/forms/. Run: pnpm db:seed
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dir = new URL("../supabase/seed/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = ["begin;", ...files.map((f) => readFileSync(new URL(f, dir), "utf8")), "commit;"].join("\n");
const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_MobileApp";
const r = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, encoding: "utf8" });
if (r.error) { console.error(`docker not reachable: ${r.error.message}`); process.exit(1); }
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(r.status ?? 1); }
console.log(`applied ${files.length} seed files: ${files.join(", ")}`);
