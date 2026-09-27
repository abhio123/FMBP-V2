// Copies packages/shared/src/*.ts (except tests/db types) into supabase/functions/_shared/fmbp so Edge Functions can import them.
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const src = fileURLToPath(new URL("../packages/shared/src/", import.meta.url));
const dst = fileURLToPath(new URL("../supabase/functions/_shared/fmbp/", import.meta.url));
rmSync(dst, { recursive: true, force: true }); mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src)) if (f.endsWith(".ts") && f !== "database.types.ts") cpSync(join(src, f), join(dst, f));
console.log("synced shared ->", dst);
