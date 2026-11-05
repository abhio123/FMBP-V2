import { handleInfo, type InfoRoute } from "../src/info";
import type { Env } from "../src/page";

/** GET /help (Cloudflare Pages Function): information page, ?lang=hi for Hindi. */
export const onRequestGet = ({ env, request }: { env: Env & { SUPPORT_EMAIL?: string }; request: Request }) =>
  handleInfo(env, "help" as InfoRoute, request.url);
