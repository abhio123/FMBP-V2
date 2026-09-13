// Load apps/mobile/.env so the real Supabase client points at the local stack (Expo does this at runtime).
const fs = require("fs");
const path = require("path");
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
// The demo service-role key printed by `supabase start`; override with SUPABASE_SERVICE_ROLE_KEY if it differs.
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// The React Native jest preset installs a browser-style fetch polyfill that cannot hit the network
// from Node. Replace it with a minimal fetch built on Node's http module so the real client works.
const http = require("http");
const https = require("https");
function nodeFetch(input, init = {}) {
  const url = new URL(typeof input === "string" ? input : input.url);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {};
  const src = init.headers ?? {};
  if (typeof src.forEach === "function" && !Array.isArray(src)) src.forEach((v, k) => { headers[k] = v; });
  else for (const [k, v] of Object.entries(src)) headers[k] = v;
  return new Promise((resolve, reject) => {
    const req = lib.request(url, { method: init.method ?? "GET", headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString("utf8");
        const hdrs = new Map(Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(", ") : v]));
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage ?? "",
          url: url.toString(),
          headers: { get: (k) => hdrs.get(k.toLowerCase()) ?? null, has: (k) => hdrs.has(k.toLowerCase()), forEach: (fn) => hdrs.forEach((v, k) => fn(v, k)) },
          text: async () => text,
          json: async () => JSON.parse(text),
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
          blob: async () => ({ size: buf.length, type: hdrs.get("content-type") ?? "", text: async () => text }),
          clone() { return this; },
        });
      });
    });
    req.on("error", reject);
    if (init.signal) init.signal.addEventListener?.("abort", () => req.destroy(new Error("aborted")));
    if (init.body != null) {
      const b = init.body;
      if (typeof b === "string") req.write(b);
      else if (b instanceof ArrayBuffer) req.write(Buffer.from(b));
      else if (ArrayBuffer.isView(b)) req.write(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
      else req.write(JSON.stringify(b));
    }
    req.end();
  });
}
global.fetch = nodeFetch;
