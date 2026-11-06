import { handleInfo, type InfoRoute } from "../src/info";
import type { Env } from "../src/page";

/** GET /contact (Cloudflare Pages Function): support and grievance officer (IT Rules 2021), ?lang=hi for Hindi. */
export const onRequestGet = ({ env, request }: { env: Env & { SUPPORT_EMAIL?: string }; request: Request }) =>
  handleInfo(env, "contact" as InfoRoute, request.url);
