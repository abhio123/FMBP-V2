import { handle, type Env } from "../../src/page";

/** GET /business/:id (Cloudflare Pages Function). */
export const onRequestGet = ({ params, env }: { params: { id?: string | string[] }; env: Env }) =>
  handle(env, "business", typeof params.id === "string" ? params.id : "");
