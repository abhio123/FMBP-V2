import { handleInfo, type InfoRoute } from "../src/info";
import type { Env } from "../src/page";

/** GET /guidelines (Cloudflare Pages Function): information page, ?lang=hi for Hindi. */
export const onRequestGet = ({ env, request }: { env: Env & { SUPPORT_EMAIL?: string }; request: Request }) =>
  handleInfo(env, "guidelines" as InfoRoute, request.url);
