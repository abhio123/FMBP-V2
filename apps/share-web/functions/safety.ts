import { handleInfo, type InfoRoute } from "../src/info";
import type { Env } from "../src/page";

/** GET /safety (Cloudflare Pages Function): information page, ?lang=hi for Hindi. */
export const onRequestGet = ({ env, request }: { env: Env & { SUPPORT_EMAIL?: string }; request: Request }) =>
  handleInfo(env, "safety" as InfoRoute, request.url);
