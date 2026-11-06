import { handleHome, type HomeEnv } from "../src/home";

/** GET / (Cloudflare Pages Function): the home page, ?lang=hi for Hindi. */
export const onRequestGet = ({ env, request }: { env: HomeEnv; request: Request }) => handleHome(env, request.url);
