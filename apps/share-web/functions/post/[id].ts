import { handle, type Env } from "../../src/page";

/** GET /post/:id (Cloudflare Pages Function). */
export const onRequestGet = ({ params, env }: { params: { id?: string | string[] }; env: Env }) =>
  handle(env, "post", typeof params.id === "string" ? params.id : "");
