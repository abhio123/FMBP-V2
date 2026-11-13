/**
 * End-to-end walk through every FMBP feature against the LOCAL Supabase stack, using the app's own
 * data-layer modules (the same code the screens call). Two test users (A, B) play both sides.
 *
 * Prereqs: `pnpm db:start` and `pnpm functions:serve` running. Run with `pnpm --filter @fmbp/mobile test:e2e`.
 */
import { supabase, supabaseUrl } from "@/lib/supabase";
import { sendOtp, verifyOtp, signOut, authErrorKey } from "@/features/auth/api";
import { updateBusiness, updateBusinessLocation, getBusinessPublic, uploadBusinessImage, getMyBusinessDetails, listBusinessMedia, addBusinessMedia, removeBusinessMedia } from "@/features/business/api";
import { createBusiness, loadMyBusiness, listCategories, parsePoint, listMyBusinesses, setActiveProfile } from "@/features/business/api";
import { listIntentions, listPostTypes, generateCopy, createPost, updatePost, loadPostForEdit, getPost, listMyPosts, recordView, respondToPost, withdrawInterest, getMyResponse, listPostResponses, renewPost, setPostStatus, deletePost, findLiveDuplicate, duplicateLivePostId } from "@/features/posts/api";
import { fetchBoosted } from "@/features/feed/api";
import { report, blockBusiness, unblockBusiness, listBlocked } from "@/features/safety/api";
import { getMyReferral, applyReferralCode, boostPost } from "@/features/referral/api";
import { requestAccountDeletion, cancelAccountDeletion, getDeletionRequest } from "@/features/account/api";
import { getDealCandidates, closePostWithDeal, respondToDeal, rateDeal, listMyDeals, listBusinessDeals, dealsDoneCount, dealsToDo } from "@/features/deals/api";
import { fetchFeedPage, fetchSocialProof } from "@/features/feed/api";
import { amIAdmin, adminStats, adminReports, resolveReport, adminSearch, adminBusiness, adminBusinessPosts, suspendBusiness, unsuspendBusiness, restorePost,
  adminVerifications, reviewVerification, verificationDocUrl, adminSettings, updateSetting, listAdmins, addAdmin, disableAdmin, broadcast, adminLog,
  listBusinesses, listPosts, listDeals, listResponses, listBroadcasts, listWords, listWordRegions, exportWords, setWordStatus, renameWord, deleteWord, wordStatusCounts } from "@/features/admin/api";
import { findTypes } from "@/features/posts/typeSearch";
import { searchAll } from "@/features/search/api";
import { fetchFormSchema, fetchFormSchemaOrGeneric } from "@/forms/useFormSchema";
import { openConversation, getConversation, listConversations, listMessages, listMessagePage, prependOlder, sendMessage, markConversationRead, otherParty, unreadConversationCount, getPostRefs } from "@/features/chat/api";
import { savePost, unsavePost, listSavedPostIds, followBusiness, unfollowBusiness, listFollowedBusinessIds, countFollowers } from "@/features/social/api";
import { savePushToken, removePushToken, routeForNotification, listInbox, unreadInboxCount, markInboxRead, businessesOfNotification } from "@/features/notifications/api";
import { isBasicComplete, splitValues } from "@/forms/SchemaForm";
import { TEXT_LIMITS } from "@fmbp/shared";
import type { BusinessSummary } from "@/store/session";

const OTP = "123456";
const USER_A = { phone: "9999900011", name: "E2E Alpha Sweets", loc: { lat: 28.5708, lng: 77.3260, city: "Noida", state: "Uttar Pradesh", pincode: "201301", country: "IN" } };
const USER_B = { phone: "9999900012", name: "E2E Beta Traders", loc: { lat: 28.6139, lng: 77.2090, city: "New Delhi", state: "Delhi", pincode: "110001", country: "IN" } };
const RUN = Date.now().toString(36);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function base64ToBytes(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/=+$/, ""); const out: number[] = []; let bits = 0; let acc = 0;
  for (const c of clean) { acc = (acc << 6) | chars.indexOf(c); bits += 6; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); } }
  return Uint8Array.from(out);
}

async function login(phone: string) {
  // local rate limit: one OTP per 5s per number
  for (let i = 0; i < 3; i++) {
    const e = await sendOtp(phone);
    if (!e) break;
    if (authErrorKey(e) !== "auth.errors.tooManyRequests") throw new Error(`sendOtp: ${e.code} ${e.message}`);
    await sleep(5500);
  }
  const v = await verifyOtp(phone, OTP);
  if (v) throw new Error(`verifyOtp: ${v.code} ${v.message}`);
  const { data } = await supabase.auth.getSession();
  expect(data.session?.user.id).toBeTruthy();
  return data.session!.user.id;
}

/**
 * Businesses other than A and B (reporters, a stranger to a deal). A fresh database has none, so the suite makes
 * them once: "E2E Helper n" with their own login, kept and reused by later runs.
 */
async function otherBusinesses(n: number): Promise<string[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svc = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const have = await (await svc("/rest/v1/businesses?select=id&name=like.E2E%20Helper%25&deleted_at=is.null&suspended_at=is.null&order=name")).json() as { id: string }[];
  const [cat] = await (await svc("/rest/v1/categories?select=id&slug=eq.other")).json() as { id: string }[];
  for (let i = have.length; i < n; i++) {
    const phone = `91780000${String(i + 1).padStart(4, "0")}`;
    const u = await svc("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password: `E2e-helper-${i}-pass`, phone_confirm: true }) });
    const userId = u.ok ? ((await u.json()) as { id: string }).id
      : ((await (await svc(`/rest/v1/users?select=id&phone=eq.${phone}`)).json()) as { id: string }[])[0]?.id;
    if (!userId) throw new Error(`helper user ${phone}: ${u.status}`);
    const b = await svc("/rest/v1/businesses", { method: "POST", body: JSON.stringify({
      owner_id: userId, name: `E2E Helper ${i + 1}`, category_id: cat.id, city: "Noida", state: "Uttar Pradesh", pincode: "201301", country: "IN",
      location: "SRID=4326;POINT(77.3260 28.5708)" }) });
    if (b.status !== 201) throw new Error(`helper business: ${b.status} ${await b.text()}`);
    have.push(((await b.json()) as { id: string }[])[0]);
  }
  return have.slice(0, n).map((x) => x.id);
}

async function ensureBusiness(u: typeof USER_A): Promise<BusinessSummary> {
  const existing = await loadMyBusiness();
  if (existing) return existing;
  const cats = await listCategories();
  await createBusiness({ name: u.name, category_id: cats[0].id, location: u.loc, ownerName: "E2E Owner" });
  const b = await loadMyBusiness();
  if (!b) throw new Error("business not visible after create");
  return b;
}

let bizA: BusinessSummary; let bizB: BusinessSummary; let postId: string; let postTitle: string;
// every form asks "How do you want to work?" (deal) since 2026-11-03
const money = { amount: 500000, purpose: "expand_shop", deal: "partnership", location: USER_A.loc };

describe("0. infrastructure", () => {
  it("REST API and Edge Functions are reachable", async () => {
    const rest = await fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } });
    expect(rest.status).toBe(200);
    const fn = await fetch(`${supabaseUrl}/functions/v1/ai-generate`, { method: "OPTIONS" });
    expect(fn.status).toBe(200);
  });
});

describe("1. auth (user A)", () => {
  it("rejects an invalid number before calling the API", async () => {
    const e = await sendOtp("1234567890");
    expect(e && authErrorKey(e)).toBe("auth.errors.phoneNotReachable");
  });
  it("rejects a wrong OTP with a friendly key, then logs in", async () => {
    const e = await sendOtp(USER_A.phone);
    if (e) expect(authErrorKey(e)).toBe("auth.errors.tooManyRequests");
    const bad = await verifyOtp(USER_A.phone, "000000");
    expect(bad && authErrorKey(bad)).toBe("auth.errors.wrongOtp");
    await login(USER_A.phone);
  });
  it("auth trigger created the public.users row and it is readable by self", async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("users").select("id,phone,name").eq("id", u.user!.id).single();
    expect(error).toBeNull();
    expect(data!.phone).toBe(`91${USER_A.phone}`);
  });
});

describe("2. onboarding: one-minute business profile", () => {
  it("creates (or reuses) business A and reads it back with a real location", async () => {
    bizA = await ensureBusiness(USER_A);
    expect(bizA.name).toBeTruthy();
    expect(bizA.city).toBeTruthy();
    expect(bizA.category_slug).toBeTruthy();
    // BUG CHECK: PostgREST returns geography as hex EWKB; the parser must decode it, not return 0,0.
    // The business may pre-exist from a manual session, so assert "somewhere in India" and that it matches the raw column.
    expect(bizA.lat).toBeGreaterThan(6); expect(bizA.lat).toBeLessThan(38);
    expect(bizA.lng).toBeGreaterThan(68); expect(bizA.lng).toBeLessThan(98);
    const { data: raw } = await supabase.from("businesses").select("location").eq("id", bizA.id).single();
    expect(parsePoint(raw!.location)).toEqual({ lat: bizA.lat, lng: bizA.lng });
    expect(bizA.completion_score).toBeGreaterThanOrEqual(20);
  });
  it("parsePoint handles GeoJSON, WKT and hex EWKB", () => {
    expect(parsePoint({ type: "Point", coordinates: [77.3, 28.5] })).toEqual({ lng: 77.3, lat: 28.5 });
    expect(parsePoint("POINT(77.3 28.5)")).toEqual({ lng: 77.3, lat: 28.5 });
    // hex EWKB (little-endian, SRID 4326) as PostgREST returns it: Delhi
    const p = parsePoint("0101000020E61000004C378941604D5340B003E78C289D3C40");
    expect(p.lng).toBeCloseTo(77.209, 3); expect(p.lat).toBeCloseTo(28.6139, 3);
    expect(parsePoint("garbage")).toEqual({ lat: 0, lng: 0 });
  });
  it("owner can edit the profile: contact, description, flags, logo and photos raise completion", async () => {
    const before = (await getMyBusinessDetails(bizA.id)).completion_score;
    await updateBusiness(bizA.id, { phone: USER_A.phone, whatsapp: USER_A.phone, description: `E2E business description long enough to count ${RUN}`, service_available: true });
    const d = await getMyBusinessDetails(bizA.id);
    expect(d.phone).toBe(USER_A.phone); expect(d.service_available).toBe(true);
    expect(d.completion_score).toBeGreaterThanOrEqual(40); // 20 base + 10 contact + 10 description
    // 1x1 PNG
    const png = base64ToBytes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
    const url = await uploadBusinessImage(bizA.id, png.buffer as ArrayBuffer, "logo", "image/png");
    expect(url).toMatch(/business-media\/.*logo/);
    await updateBusiness(bizA.id, { logo_url: url });
    expect((await getMyBusinessDetails(bizA.id)).completion_score).toBeGreaterThanOrEqual(50);
    const m = await addBusinessMedia(bizA.id, url);
    expect((await listBusinessMedia(bizA.id)).some((x) => x.id === m.id)).toBe(true);
    await removeBusinessMedia(m.id);
    expect((await listBusinessMedia(bizA.id)).some((x) => x.id === m.id)).toBe(false);
    expect((await fetch(url)).status).toBe(200); // public read
    expect(before).toBeLessThanOrEqual(d.completion_score);
  });
  it("owner can rename the business and change its category; a one-letter name is rejected (QA 2026-10-09)", async () => {
    const cats = await listCategories();
    const original = await getMyBusinessDetails(bizA.id);
    const other = cats.find((c) => c.id !== original.category_id)!;
    await updateBusiness(bizA.id, { name: `${USER_A.name} Renamed`, category_id: other.id });
    const renamed = await getMyBusinessDetails(bizA.id);
    expect(renamed.name).toBe(`${USER_A.name} Renamed`);
    expect(renamed.category_id).toBe(other.id);
    expect((await loadMyBusiness())?.name).toBe(`${USER_A.name} Renamed`);
    await expect(updateBusiness(bizA.id, { name: "x" })).rejects.toThrow(/too short/);
    await updateBusiness(bizA.id, { name: USER_A.name, category_id: original.category_id });
    expect((await getMyBusinessDetails(bizA.id)).name).toBe(USER_A.name);
  });
  it("owner can change the business location from Edit; the business page shows the new city and pincode", async () => {
    await updateBusinessLocation(bizA.id, { lat: 28.4744, lng: 77.504, city: "Greater Noida", state: "Uttar Pradesh", pincode: "201310", country: "IN" });
    const moved = await getBusinessPublic(bizA.id);
    expect([moved.city, moved.pincode]).toEqual(["Greater Noida", "201310"]);
    const me = await loadMyBusiness();
    expect(me?.lat).toBeCloseTo(28.47, 5); // the map point moved too, kept to about 1 km (nearby feed, new posts' default place)
    await expect(updateBusinessLocation(bizA.id, { ...USER_A.loc, city: " " })).rejects.toThrow(/incomplete/);
    await updateBusinessLocation(bizA.id, USER_A.loc);
    expect((await getBusinessPublic(bizA.id)).city).toBe("Noida");
  });
  it("profile completion reaches 100% once every in-app item is filled (QA 2026-10-09: it used to stop at 75%)", async () => {
    const png = base64ToBytes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
    const cover = await uploadBusinessImage(bizA.id, png.buffer as ArrayBuffer, "cover", "image/png");
    await updateBusiness(bizA.id, { cover_url: cover, website: "https://example.com" });
    // 20 base + 10 logo + 10 cover + 15 description + 15 contact + 10 website = 80; any photo completes the
    // photos section (+20, QA 2026-11-01: owners rarely fill all 6 slots), more photos add nothing
    expect((await getMyBusinessDetails(bizA.id)).completion_score).toBe(80);
    const added = [await addBusinessMedia(bizA.id, cover)];
    expect((await getMyBusinessDetails(bizA.id)).completion_score).toBe(100);
    added.push(await addBusinessMedia(bizA.id, cover));
    expect((await getMyBusinessDetails(bizA.id)).completion_score).toBe(100);
    for (const m of added) await removeBusinessMedia(m.id);
    expect((await getMyBusinessDetails(bizA.id)).completion_score).toBe(80);
  });
  it("another user cannot write into my media folder or edit my business", async () => {
    // exercised from B's session in section 6
    expect(true).toBe(true);
  });
});

describe("3. taxonomy and form schemas", () => {
  it("lists intentions, post types and categories", async () => {
    const intentions = await listIntentions();
    // QA 2026-11-04: two main choices (Need / Offer) + Announce. Partner and Invest were folded into Need / Offer
    // (partnership is the "How do you want to work?" answer on every post), so they are no longer offered.
    expect(intentions.map((i) => i.slug)).toEqual(["need", "offer", "announce"]);
    const need = intentions.find((i) => i.slug === "need")!;
    const offer = intentions.find((i) => i.slug === "offer")!;
    const needTypes = (await listPostTypes(need.id)).map((p) => p.slug);
    const offerTypes = (await listPostTypes(offer.id)).map((p) => p.slug);
    expect(needTypes.length).toBeGreaterThan(15);
    expect(needTypes).toEqual(expect.arrayContaining(["need_money", "buy_product", "learn_skill"]));
    expect(needTypes).not.toContain("raise_money"); // duplicate of need_money, hidden
    expect(needTypes[needTypes.length - 1]).toBe("need_other"); // "Something else" stays last
    expect(offerTypes).toEqual(expect.arrayContaining(["offer_service", "offer_influencer", "sell_product", "sell_machine", "teach_skill", "offer_money"]));
    expect(needTypes).toContain("partner_business"); // "Need business partner" now under Need
    expect(offerTypes).not.toContain("looking_to_invest"); // replaced by "Money to invest / lend"
    const types = await listPostTypes(need.id);
    expect((await listCategories()).length).toBeGreaterThan(5);
  });
  it("every active post type resolves to a form schema (own or generic fallback)", async () => {
    const { data: types } = await supabase.from("post_types").select("slug").eq("active", true);
    const generic: string[] = [];
    for (const t of types!) {
      const schema = await fetchFormSchemaOrGeneric("post", t.slug);
      expect(schema.fields.some((f) => f.type === "location")).toBe(true);
      if (schema.type_slug === "_generic") generic.push(t.slug);
    }
    expect(generic).toEqual([]); // every active type has a dedicated form (bug #4)
    expect(await fetchFormSchema("post", "definitely_not_a_type")).toBeNull();
  });
  it("offer_service asks service-specific questions in advanced (show_when), and hidden answers never reach the post", async () => {
    const schema = (await fetchFormSchema("post", "offer_service"))!;
    expect(schema.version).toBeGreaterThanOrEqual(2);
    const conditional = schema.fields.filter((f) => f.show_when);
    expect(conditional.length).toBeGreaterThan(30);
    expect(new Set(conditional.map((f) => f.show_when!.values[0])).size).toBeGreaterThanOrEqual(13); // one block per service
    const base = { service: "cooking", experience: "e10", deal: "pay", location: USER_A.loc };
    expect(isBasicComplete(schema, base)).toBe(true);
    const r = splitValues(schema, { ...base, cuisine: ["sweets"], order_type: ["wedding"], garment: ["ladies"], repair_type: ["ac"] });
    expect(r.advanced).toEqual({ cuisine: ["sweets"], order_type: ["wedding"] });
    const tailor = splitValues(schema, { ...base, service: "tailoring", cuisine: ["sweets"], garment: ["ladies"] });
    expect(tailor.advanced).toEqual({ garment: ["ladies"] });
  });
  it("need_money schema validates basic completeness and promotes columns", async () => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    expect(isBasicComplete(schema, { amount: 500000 })).toBe(false);
    expect(isBasicComplete(schema, money)).toBe(true);
    const s = splitValues(schema, { ...money, funding_type: "loan" });
    expect(s.amount_min).toBe(500000);
    expect(s.deal_type).toBe("partnership"); // promoted to opportunity_posts.deal_type (Partner badge / tab)
    expect(s.location).toEqual(USER_A.loc);
    expect(s.advanced).toEqual({ funding_type: "loan" });
  });
});

describe("4. create post (intention → type → details → AI copy → publish)", () => {
  it("ai-generate returns template copy with formatted money when no API key is set", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_money", locale: "en",
      basic: money, advanced: {}, business: { name: bizA.name, category: bizA.category_id, city: bizA.city },
    });
    // natural wording (option phrase), and no city: the post shows the place under the title (QA 2026-11-05)
    expect(gen.title).toBe("Need ₹5 lakh for expanding the shop");
    expect(gen.description).toContain("Looking for ₹5 lakh for expanding the shop in Noida.");
    expect(["template", "ai"]).toContain(gen.source);
    postTitle = `${gen.title} [e2e ${RUN}]`;
  });
  it("ai-generate in Hindi renders Hindi labels", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_money", locale: "hi",
      basic: money, advanced: {}, business: { name: bizA.name, category: bizA.category_id, city: bizA.city },
    });
    expect(gen.title).toBe("दुकान बढ़ाने के लिए ₹5 लाख चाहिए");
  });
  it("need_customer uses its dedicated form: title names the customer type, empty clauses are dropped", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_customer", locale: "en",
      basic: { customer_type: "wholesale", offer_type: "products", location: USER_A.loc }, advanced: {}, business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(gen.title).toBe("Need wholesale / B2B customers");
    expect(gen.description).toBe("Looking for wholesale / B2B customers for my products in Noida.");
    const hiGen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_customer", locale: "hi",
      basic: { customer_type: "wholesale", offer_type: "products", location: USER_A.loc }, advanced: {}, business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(hiGen.title).toBe("थोक / B2B ग्राहक चाहिए");
  });
  it("offer_service renders a specific title from the service field (not 'Offering a Service in <city>')", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "offer_service", locale: "en",
      basic: { service: "cooking", experience: "e10", price: 500, location: USER_A.loc }, advanced: {}, business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(gen.title).toBe("Cooking / catering service");
    expect(gen.description).toContain("3–10 years");
    // free-text details from the advanced section must reach the post text
    const withDetails = await generateCopy({
      mode: "generate", target: "post", type_slug: "sell_machine", locale: "en",
      basic: { machine: "food_processing", condition: "used_good", price: 25000, location: USER_A.loc }, advanced: { details: "Selling my cooker used for chole making." },
      business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(withDetails.description).toContain("Selling my cooker used for chole making.");
  });
  it("offer_influencer form yields a specific title (BUGLIST §10/§27)", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "offer_influencer", locale: "en",
      basic: { platform: "instagram", niche: "food", followers: "f100k", location: USER_A.loc }, advanced: { collab: ["paid", "barter"], charges: 5000 },
      business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(gen.title).toBe("Food influencer on Instagram available");
    expect(gen.description).toContain("20K–100K followers");
    expect(gen.description).toContain("paid promotion, barter / free product");
  });
  it("ai-generate rejects a bad request and unknown type", async () => {
    await expect(generateCopy({ target: "post", type_slug: "nope_type", locale: "en", basic: {}, business: { name: "x", category: "y" } } as never)).rejects.toBeTruthy();
  });
  it("publishes the post and reads it back with the trust join", async () => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const { basic, advanced, amount_min, amount_max, location, deal_type } = splitValues(schema, { ...money, funding_type: "loan" });
    const stale = await findLiveDuplicate(bizA.id, (await supabase.from("post_types").select("id").eq("slug", "need_money").single()).data!.id, basic, advanced);
    if (stale) await deletePost(stale); // one live post per kind: an interrupted earlier run may have left one
    postId = await createPost({
      business_id: bizA.id, post_type_id: (await supabase.from("post_types").select("id").eq("slug", "need_money").single()).data!.id,
      title: postTitle, description: "Looking for ₹5 lakh to expand shop in Noida.", basic, advanced, amount_min, amount_max, location: location!,
      tags: ["investment", "noida", "sweets"], deal_type,
    });
    const p = await getPost(postId);
    expect(p.deal_type).toBe("partnership"); // "How do you want to work?" stored for the badge and the Partnership tab
    expect((await fetchFeedPage("partnership", {}, null)).rows.some((r) => r.id === postId)).toBe(true);
    expect(p.title).toBe(postTitle);
    expect(Number(p.amount_min)).toBe(500000);
    expect(p.status).toBe("active");
    expect(p.business?.id).toBe(bizA.id);
    expect(p.post_type?.slug).toBe("need_money");
    expect(new Date(p.expires_at).getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);
    const { data: tags } = await supabase.from("post_tags").select("tag").eq("post_id", postId);
    expect(tags!.map((t) => t.tag).sort()).toEqual(["investment", "noida", "sweets"]);
  });
  it("stored the post location correctly (nearby RPC finds it within 1 km)", async () => {
    const { data, error } = await supabase.rpc("feed_nearby", { p_lat: USER_A.loc.lat, p_lng: USER_A.loc.lng, p_radius_km: 5 });
    expect(error).toBeNull();
    const row = data!.find((r) => r.id === postId);
    expect(row).toBeTruthy();
    expect(row!.distance_km).toBeLessThan(1);
  });
});

describe("5. feed, search, my posts (user A)", () => {
  it("latest feed contains the post, newest first, with pagination cursor semantics", async () => {
    const page = await fetchFeedPage("latest", {}, null);
    expect(page.rows[0].id).toBe(postId);
    if (page.next) expect(new Date(page.next).getTime()).toBeLessThanOrEqual(new Date(page.rows[0].created_at).getTime());
  });
  it("latest feed filters by city and budget", async () => {
    const byCity = await fetchFeedPage("latest", { city: "noida" }, null);
    expect(byCity.rows.some((r) => r.id === postId)).toBe(true);
    const otherCity = await fetchFeedPage("latest", { city: "Chennai-nowhere" }, null);
    expect(otherCity.rows.some((r) => r.id === postId)).toBe(false);
    const budget = await fetchFeedPage("latest", { budget_max: 100000 }, null);
    expect(budget.rows.some((r) => r.id === postId)).toBe(false);
  });
  it("trending feed contains the post (a fresh post ranks below demo posts with views, so page through)", async () => {
    let cursor: string | null = null; let found = false; const seen: string[] = [];
    for (let i = 0; i < 6 && !found; i++) {
      const page = await fetchFeedPage("trending", {}, cursor);
      seen.push(`page ${i} (next=${page.next}): ` + page.rows.map((r) => `${r.response_count}/${r.view_count} ${r.title}`).join(" | "));
      found = page.rows.some((r) => r.id === postId);
      cursor = page.next; if (!cursor) break;
    }
    if (!found) throw new Error(`post ${postId} not in trending:\n${seen.join("\n")}`);
    expect(found).toBe(true);
  });
  it("nearby feed uses the caller's location (Noida post must NOT show for a far-away point)", async () => {
    const far = await fetchFeedPage("nearby", { radius_km: 5 }, null, { lat: 12.97, lng: 77.59 });
    expect(far.rows.some((r) => r.id === postId)).toBe(false);
    const near = await fetchFeedPage("nearby", { radius_km: 5 }, null, { lat: USER_A.loc.lat, lng: USER_A.loc.lng });
    const mine = near.rows.find((r) => r.id === postId);
    expect(mine?.distance_km).toBeLessThan(1);
    expect(near.rows.every((r, i) => i === 0 || (r.distance_km ?? 0) >= (near.rows[i - 1].distance_km ?? 0))).toBe(true);
    const noLoc = await fetchFeedPage("nearby", {}, null, { lat: 0, lng: 0 });
    expect(noLoc.rows).toEqual([]);
  });
  it("search finds the post by word, tag and city, and the business by name", async () => {
    const byTitle = await searchAll("expand");
    expect(byTitle.posts.some((p) => p.id === postId)).toBe(true);
    const byTag = await searchAll("sweets");
    expect(byTag.posts.some((p) => p.id === postId)).toBe(true);
    // stemming + prefix: "investment"/"investing"/"inves" all reach a post tagged/described with "invest"
    for (const q of ["investment", "investing", "inves", "expanding", "investor", "invstment"]) {
      const r = await searchAll(q);
      expect({ q, found: r.posts.some((p) => p.id === postId) }).toEqual({ q, found: true });
    }
    const byCity = await searchAll("Noida");
    expect(byCity.posts.some((p) => p.id === postId)).toBe(true);
    const biz = await searchAll(bizA.name.split(" ")[1] ?? bizA.name);
    expect(biz.businesses.some((b) => b.id === bizA.id)).toBe(true);
  });
  it("search matches every word of the query against the title (QA 2026-10-09: 'ilike on title')", async () => {
    // title "Need ₹5 lakh for expanding the shop", city Noida: multi-word, mixed case, substring of a word, and a word from the description / city
    for (const q of ["expand shop", "EXPAND NOIDA", "xpand", "shop in noida", "lakh"]) {
      const r = await searchAll(q);
      expect({ q, found: r.posts.some((p) => p.id === postId) }).toEqual({ q, found: true });
    }
    // all words must match somewhere: an unrelated word must not match
    const miss = await searchAll(`expand zzqx${RUN}`);
    expect(miss.posts.some((p) => p.id === postId)).toBe(false);
  });
  it("my posts lists the post for the owner", async () => {
    const mine = await listMyPosts(bizA.id);
    expect(mine.some((p) => p.id === postId)).toBe(true);
  });
  it("owner viewing own post does not count a view; sign out clears the session", async () => {
    const before = (await getPost(postId)).view_count;
    expect(before).toBe(0);
    await signOut({ scope: "local" });
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});

describe("6. second user B discovers, views and responds", () => {
  it("logs in as B and onboards", async () => {
    await login(USER_B.phone);
    bizB = await ensureBusiness(USER_B);
    expect(bizB.id).not.toBe(bizA.id);
  });
  it("B sees A's post in the feed and detail, but not A's phone/email", async () => {
    const page = await fetchFeedPage("latest", {}, null);
    expect(page.rows.some((r) => r.id === postId)).toBe(true);
    const p = await getPost(postId);
    expect(p.business?.name).toBe(bizA.name);
    expect((p.business as Record<string, unknown>).phone).toBeUndefined();
    const { data: pub } = await supabase.from("businesses_public").select("*").eq("id", bizA.id).single();
    expect(Object.keys(pub!)).toEqual(expect.not.arrayContaining(["phone", "whatsapp", "email", "owner_id"]));
    // contact columns are not readable through the table at all (security fix 2026-11-02), signed in or not
    expect((await supabase.from("businesses").select("phone,whatsapp,email").eq("id", bizA.id)).error?.code).toBe("42501");
    expect((await supabase.from("businesses").select("*").eq("id", bizA.id)).error?.code).toBe("42501");
    const anon = await fetch(`${supabaseUrl}/rest/v1/businesses?select=phone&limit=1`, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } });
    expect(anon.status).toBe(401);
    // the owner-only function returns nothing for another business
    await expect(getMyBusinessDetails(bizA.id)).rejects.toBeTruthy();
    // public columns stay readable (feed, search, share pages)
    expect((await supabase.from("businesses").select("name,city").eq("id", bizA.id).single()).data?.name).toBe(bizA.name);
  });
  it("B's view increments view_count via trigger", async () => {
    await recordView(postId, bizB.id);
    await sleep(200);
    expect((await getPost(postId)).view_count).toBe(1);
  });
  it("B cannot edit A's business or upload into A's media folder (RLS)", async () => {
    const { data } = await supabase.from("businesses").update({ name: "hacked" }).eq("id", bizA.id).select("id");
    expect(data).toEqual([]);
    await expect(uploadBusinessImage(bizA.id, new Uint8Array([1, 2, 3]).buffer, "logo", "image/png")).rejects.toBeTruthy();
  });
  it("B cannot edit or renew A's post (RLS)", async () => {
    const { data } = await supabase.from("opportunity_posts").update({ title: "hacked" }).eq("id", postId).select("id");
    expect(data).toEqual([]);
    await expect(updatePost(postId, { title: "hacked", description: null, basic: {}, advanced: {}, location: USER_A.loc })).rejects.toThrow(/could not be updated/);
    await expect(loadPostForEdit(postId)).resolves.toBeTruthy(); // reading an active post is public; saving is not
    await expect(renewPost(postId)).rejects.toMatchObject({ message: expect.stringMatching(/not owner/) });
    await expect(setPostStatus(postId, "paused")).resolves.toBeUndefined(); // RLS silently matches 0 rows
    expect((await getPost(postId)).status).toBe("active");
    expect((await getPost(postId)).title).toBe(postTitle);
  });
  it("B responds 'interested' once; response_count increments; duplicate is rejected", async () => {
    expect(await getMyResponse(postId, bizB.id)).toBeNull();
    const conv = await openConversation(bizB.id, bizA.id, postId);
    expect(otherParty(conv, bizB.id)?.id).toBe(bizA.id);
    expect((await openConversation(bizB.id, bizA.id, postId)).id).toBe(conv.id); // idempotent, either order
    // one chat per business pair (QA 2026-11-03): any post, or none, leads to the same conversation
    expect((await openConversation(bizA.id, bizB.id, null)).id).toBe(conv.id);
    await respondToPost(postId, bizB.id, "interested", "Let's talk", conv.id);
    expect((await getMyResponse(postId, bizB.id))?.conversation_id).toBe(conv.id);
    const m = await sendMessage(conv.id, bizB.id, "Hi, I can invest. When can we talk?", { about: postId });
    expect(m.sender_business_id).toBe(bizB.id);
    expect(m.post_id).toBe(postId); // the message carries the post it is about (card in the thread)
    const mine = await listConversations(bizB.id);
    expect(mine.find((c) => c.id === conv.id)?.messages[0]?.body).toBe("Hi, I can invest. When can we talk?");
    await expect(openConversation(bizB.id, bizB.id, null)).rejects.toThrow(/yourself/);
    // integrity: a message can only be about a post of one of the two businesses, and only quote its own chat
    const { data: stranger } = await supabase.from("opportunity_posts").select("id").neq("business_id", bizA.id).neq("business_id", bizB.id).limit(1).maybeSingle();
    if (stranger) await expect(sendMessage(conv.id, bizB.id, "about someone else's post", { about: stranger.id })).rejects.toBeTruthy();
    await expect(sendMessage(conv.id, bizB.id, "quoting nothing", { replyTo: "00000000-0000-0000-0000-000000000000" })).rejects.toBeTruthy();
    const reply = await sendMessage(conv.id, bizB.id, "Also: is the amount negotiable?", { replyTo: m.id });
    expect(reply.reply_to_id).toBe(m.id);
    expect((await getConversation(conv.id)).post_id).toBe(postId); // chat list shows the post discussed most recently
    await sleep(200);
    expect((await getPost(postId)).response_count).toBe(1);
    expect((await getMyResponse(postId, bizB.id))?.response_type).toBe("interested");
    await expect(respondToPost(postId, bizB.id, "lets_talk")).rejects.toBeTruthy();
    // responder cannot read the owner's list of other responders? (owner-or-responder policy: sees only own)
    const seen = await listPostResponses(postId);
    expect(seen.map((r) => r.business?.id)).toEqual([bizB.id]);
  });
  it("B can withdraw interest (QA 2026-11-02): row removed, count drops; then responds again for later checks", async () => {
    const mine = (await getMyResponse(postId, bizB.id))!;
    await withdrawInterest(mine.id);
    expect(await getMyResponse(postId, bizB.id)).toBeNull();
    await sleep(200);
    expect((await getPost(postId)).response_count).toBe(0);
    await expect(withdrawInterest(mine.id)).rejects.toThrow(/could not be withdrawn/); // already gone
    await respondToPost(postId, bizB.id, "interested", "Let's talk", mine.conversation_id ?? undefined);
    await sleep(200);
    expect((await getPost(postId)).response_count).toBe(1);
  });
  it("B can save the post and follow A; saved feed returns it", async () => {
    await unfollowBusiness(bizB.id, bizA.id); // runs reuse the E2E accounts: start from "not following"
    const followersBefore = await countFollowers(bizA.id);
    await savePost(bizB.id, postId);
    await followBusiness(bizB.id, bizA.id);
    expect(await listSavedPostIds(bizB.id)).toContain(postId);
    expect(await listFollowedBusinessIds(bizB.id)).toContain(bizA.id);
    expect(await countFollowers(bizA.id)).toBe(followersBefore + 1);
    const saved = await fetchFeedPage("saved", {}, null, null, bizB.id);
    expect(saved.rows.some((r) => r.id === postId)).toBe(true);
    const following = await fetchFeedPage("following", {}, null, null, bizB.id);
    expect(following.rows.some((r) => r.id === postId)).toBe(true);
    await unsavePost(bizB.id, postId);
    expect(await listSavedPostIds(bizB.id)).not.toContain(postId);
    await unfollowBusiness(bizB.id, bizA.id);
    expect(await listFollowedBusinessIds(bizB.id)).not.toContain(bizA.id);
    await savePost(bizB.id, postId); await followBusiness(bizB.id, bizA.id); // leave them on for later assertions
  });
  it("recommended feed for B runs and never includes B's own posts", async () => {
    const { data, error } = await supabase.rpc("feed_recommended", { p_business_id: bizB.id, p_limit: 20 });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const rec = await fetchFeedPage("recommended", {}, null, null, bizB.id);
    expect(rec.rows.every((r) => r.business?.id !== bizB.id)).toBe(true);
  });
  it("B cannot respond to their own post", async () => {
    const own = await createPost({
      business_id: bizB.id, post_type_id: (await supabase.from("post_types").select("id").eq("slug", "need_other").single()).data!.id,
      title: `B own post [e2e ${RUN}]`, description: null, basic: { what: "printing", location: USER_B.loc }, advanced: {}, amount_max: 5000, location: USER_B.loc,
    });
    await expect(respondToPost(own, bizB.id, "interested")).rejects.toBeTruthy();
    await deletePost(own);
    expect((await listMyPosts(bizB.id)).some((p) => p.id === own)).toBe(false);
    await signOut({ scope: "local" });
  });
});

describe("7. owner sees activity, lifecycle and jobs", () => {
  it("A sees the response and the view on their post", async () => {
    await login(USER_A.phone);
    const p = (await listMyPosts(bizA.id)).find((x) => x.id === postId)!;
    expect(p.view_count).toBe(1);
    expect(p.response_count).toBe(1);
    const responses = await listPostResponses(postId);
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ response_type: "interested", message: "Let's talk", business: expect.objectContaining({ id: bizB.id, name: bizB.name }) });
  });
  it("A was notified of B's response and message (notifications rows + push fan-out), and tokens are private", async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const { data: notifs } = await supabase.from("notifications").select("kind,payload,read_at").order("created_at", { ascending: false }).limit(20);
    const mine = (notifs ?? []).filter((n) => (n.payload as { post_id?: string; conversation_id?: string }).post_id === postId || (n.payload as { title?: string }).title === bizB.name);
    expect(mine.map((n) => n.kind)).toEqual(expect.arrayContaining(["response", "message"]));
    // B sent two messages (the second quotes the first): each notifies A
    const msg = mine.find((n) => n.kind === "message" && (n.payload as { body?: string }).body === "Hi, I can invest. When can we talk?")!;
    expect(msg).toBeTruthy();
    expect((msg.payload as { title: string; body: string }).title).toBe(bizB.name);
    expect(routeForNotification(msg.payload)).toEqual({ pathname: "/chat/[id]", params: { id: (msg.payload as { conversation_id: string }).conversation_id } });
    const resp = mine.find((n) => n.kind === "response")!;
    expect(routeForNotification(resp.payload)).toEqual({ pathname: "/post/[id]", params: { id: postId } });
    expect(routeForNotification({ kind: "followed_post", post_id: postId, business_id: bizB.id })).toEqual({ pathname: "/post/[id]", params: { id: postId } });
    // device token: owner can store it, nobody else can read it
    const token = `ExponentPushToken[e2e-${RUN}]`;
    await savePushToken(uid, token, "android");
    const { data: tokens } = await supabase.from("push_tokens").select("expo_token").eq("user_id", uid);
    expect(tokens?.map((x) => x.expo_token)).toContain(token);
    const anon = await fetch(`${supabaseUrl}/rest/v1/push_tokens?select=expo_token`, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } });
    expect(await anon.json()).toEqual([]);
    await removePushToken(uid, token);
  });
  it("A sees the chat as unread, replies, and the reply marks the response as answered", async () => {
    const convs = await listConversations(bizA.id);
    const conv = convs.find((c) => otherParty(c, bizA.id)?.id === bizB.id)!; // the one chat with B
    expect(conv).toBeTruthy();
    expect(otherParty(conv, bizA.id)?.name).toBe(bizB.name);
    expect(unreadConversationCount(convs, bizA.id)).toBeGreaterThanOrEqual(1);
    // the pair's chat is reused across runs: look at this run's messages (tagged with this run's post, or quoting them)
    const thisRun = (all: Awaited<ReturnType<typeof listMessages>>) => all.filter((x) => x.post_id === postId || all.some((y) => y.id === x.reply_to_id && y.post_id === postId));
    const before = thisRun(await listMessages(conv.id));
    expect(before.map((x) => x.body)).toEqual(["Hi, I can invest. When can we talk?", "Also: is the amount negotiable?"]);
    await markConversationRead(conv.id, bizA.id);
    expect(unreadConversationCount(await listConversations(bizA.id), bizA.id)).toBe(0);
    await sendMessage(conv.id, bizA.id, "Tomorrow 11am works.", { about: postId });
    await sleep(200);
    const [r] = await listPostResponses(postId);
    expect(r.replied_at).toBeTruthy();
    expect(thisRun(await listMessages(conv.id)).length).toBe(3);
    // a chat loads a page at a time: newest first page, then the page before it, with no gap or overlap
    const newest = await listMessagePage(conv.id, { limit: 2 });
    expect(newest.rows.map((x) => x.body)).toEqual(["Also: is the amount negotiable?", "Tomorrow 11am works."]);
    expect(newest.hasOlder).toBe(true);
    const earlier = await listMessagePage(conv.id, { limit: 2, before: newest.rows[0].created_at });
    expect(prependOlder(newest, earlier).rows.map((x) => x.id)).toEqual((await listMessages(conv.id, 4)).map((x) => x.id));
    // post previews in the chat: title/status of the chat's posts, only for this conversation's two businesses
    const refs = await getPostRefs(conv.id, [postId, "00000000-0000-0000-0000-000000000000"]);
    expect(refs.get(postId)?.title).toBe(postTitle);
    expect(refs.size).toBe(1);
    // a stranger cannot read this conversation (checked later as B? B is a participant) — verify RLS via anon key
    const anon = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conv.id}`, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } });
    expect(await anon.json()).toEqual([]);
  });
  it("owner can renew (30 more days) and pause/complete", async () => {
    const before = await getPost(postId);
    await renewPost(postId);
    const renewed = await getPost(postId);
    expect(renewed.status).toBe("active");
    // renew records its date (post page "Renewed on") and moves expiry to ~30 days from now (QA 2026-11-01)
    expect(renewed.renewed_at).toBeTruthy();
    expect(new Date(renewed.expires_at).getTime() - new Date(renewed.renewed_at!).getTime()).toBeCloseTo(30 * 86_400_000, -4);
    expect(renewed.created_at).toBe(before.created_at);
    // status changes (any non-renew update) never move the expiry: only Renew extends a post
    await setPostStatus(postId, "paused");
    expect((await getPost(postId)).expires_at).toBe(renewed.expires_at);
    expect((await getPost(postId)).status).toBe("paused");
    // paused posts leave the public feed but stay visible to the owner
    expect((await fetchFeedPage("latest", {}, null)).rows.some((r) => r.id === postId)).toBe(false);
    expect((await listMyPosts(bizA.id)).some((p) => p.id === postId)).toBe(true);
    await setPostStatus(postId, "active");
  });
  it("expire-posts job runs and expires a back-dated post", async () => {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // back-date the expiry using the service role (owner cannot set expires_at in the past via UI)
    const r = await fetch(`${supabaseUrl}/rest/v1/opportunity_posts?id=eq.${postId}`, {
      method: "PATCH", headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ expires_at: new Date(Date.now() - 60_000).toISOString() }),
    });
    expect(r.status).toBe(204);
    const job = await fetch(`${supabaseUrl}/functions/v1/expire-posts`, { method: "POST", headers: { Authorization: `Bearer ${svc}` } });
    const body = await job.json();
    expect(job.status).toBe(200);
    expect(body.expired).toBeGreaterThanOrEqual(1);
    expect((await getPost(postId)).status).toBe("expired");
    // renew brings it back
    await renewPost(postId);
    expect((await getPost(postId)).status).toBe("active");
  });
  it("owner can edit the post: content changes, 'Updated on' is set, expiry and responses stay (QA 2026-11-04)", async () => {
    const before = await getPost(postId);
    const loaded = await loadPostForEdit(postId);
    expect(loaded.postType.slug).toBe("need_money");
    expect(loaded.values.amount).toBe(500000); // the form comes back filled in
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const split = splitValues(schema, { ...loaded.values, purpose: "other", purpose_other: "Buy a tempo", deal: "pay" });
    await updatePost(postId, { title: `${postTitle} (edited)`, description: "Edited description.", basic: split.basic, advanced: split.advanced,
      amount_min: split.amount_min, amount_max: split.amount_max, location: split.location!, deal_type: split.deal_type });
    const after = await getPost(postId);
    expect(after.title).toBe(`${postTitle} (edited)`);
    expect(after.basic.purpose_other).toBe("Buy a tempo"); // "Other" text saved with the answer
    expect(after.deal_type).toBe("pay");
    expect(after.edited_at).toBeTruthy();
    expect(after.expires_at).toBe(before.expires_at); // editing never extends a post
    expect(after.response_count).toBe(before.response_count);
    await updatePost(postId, { title: postTitle, description: before.description, basic: before.basic, advanced: before.advanced,
      amount_min: 500000, location: split.location!, deal_type: "partnership" }); // restore for later checks
  });
  it("cleanup: soft-delete the E2E post and sign out", async () => {
    await deletePost(postId);
    expect((await fetchFeedPage("latest", {}, null)).rows.some((r) => r.id === postId)).toBe(false);
    // conversations stay (post_id becomes null only on hard delete); the chat list still shows the partner
    expect((await listMyPosts(bizA.id)).some((p) => p.id === postId)).toBe(false);
    await signOut({ scope: "local" });
  });
});

describe("8. search answers, one live post per kind, report & block, referrals, account deletion (QA 2026-11-05)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  /** a live copy left by an interrupted earlier run would now be refused: remove it first */
  const clearKind = async (businessId: string, slug: string, basic: Record<string, unknown>, advanced: Record<string, unknown> = {}) => {
    const stale = await findLiveDuplicate(businessId, await typeId(slug), basic, advanced);
    if (stale) await deletePost(stale);
  };
  const moneyPost = async (purpose: string, title: string, clear = false) => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const v = splitValues(schema, { amount: 200000, purpose, deal: "partnership", location: USER_A.loc });
    if (clear) await clearKind(bizA.id, "need_money", v.basic, v.advanced);
    return createPost({ business_id: bizA.id, post_type_id: await typeId("need_money"), title, description: null, basic: v.basic, advanced: v.advanced,
      amount_min: v.amount_min, location: v.location!, deal_type: v.deal_type });
  };
  let machinePost: string; let temp: { id: string; phone: string; password: string; business?: string } | null = null;

  it("A: search finds a post by its form answers (how they work, sub-category), in English and Hindi", async () => {
    await login(USER_A.phone);
    bizA = (await loadMyBusiness())!;
    machinePost = await moneyPost("machinery", `Money for a machine [e2e ${RUN}]`, true);
    for (const q of ["partnership", "साझेदारी", "buying a machine", "मशीन खरीदने"]) {
      expect({ q, found: (await searchAll(q)).posts.some((p) => p.id === machinePost) }).toEqual({ q, found: true });
    }
  });

  it("A: a second live post of the same kind is refused (database), another kind is fine", async () => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const same = splitValues(schema, { amount: 300000, purpose: "machinery", deal: "pay", location: USER_A.loc });
    expect(await findLiveDuplicate(bizA.id, await typeId("need_money"), same.basic, same.advanced)).toBe(machinePost);
    const err = await moneyPost("machinery", `Copy [e2e ${RUN}]`).then(() => null, (e) => e);
    expect(duplicateLivePostId(err)).toBe(machinePost);
    const other = await moneyPost("marketing", `Money for ads [e2e ${RUN}]`);
    expect(other).toBeTruthy();
    await deletePost(other);
    // once the first one is completed, the same kind can be posted again; reopening the old one is then refused
    await setPostStatus(machinePost, "completed");
    const again = await moneyPost("machinery", `Machine again [e2e ${RUN}]`);
    await expect(setPostStatus(machinePost, "active")).rejects.toMatchObject({ message: "duplicate_live_post" });
    await deletePost(again);
    await setPostStatus(machinePost, "active");
    // editing a live post without changing its kind is always fine
    const p = await getPost(machinePost);
    await updatePost(machinePost, { title: `${p.title} (edited)`, description: null, basic: p.basic, advanced: p.advanced, amount_min: 200000, location: { ...USER_A.loc }, deal_type: "partnership" });
  });

  it("B: reporting a post hides it for B only; 3 reporters hide it for everyone but the owner", async () => {
    await login(USER_B.phone);
    bizB = (await loadMyBusiness())!;
    expect((await getPost(machinePost)).id).toBe(machinePost);
    await report(bizB.id, "post", machinePost, "spam", "testing reports");
    await report(bizB.id, "post", machinePost, "spam"); // twice is a no-op
    await expect(getPost(machinePost)).rejects.toBeTruthy(); // hidden for the reporter
    expect((await searchAll("साझेदारी")).posts.some((p) => p.id === machinePost)).toBe(false);
    // two more businesses report it (service role stands in for them)
    const others = await otherBusinesses(2);
    expect(others.length).toBe(2);
    for (const o of others) {
      const r = await svcFetch("/rest/v1/reports", { method: "POST", body: JSON.stringify({ reporter_business_id: o, target_type: "post", target_id: machinePost, reason: "fraud" }) });
      expect(r.status).toBe(201);
    }
    const [hidden] = await (await svcFetch(`/rest/v1/opportunity_posts?id=eq.${machinePost}&select=hidden_at`)).json() as { hidden_at: string | null }[];
    expect(hidden.hidden_at).toBeTruthy();
    // admin review: reports dismissed (kept for the record), post shown again; B reported it, so it stays hidden for B
    await svcFetch(`/rest/v1/reports?target_id=eq.${machinePost}`, { method: "PATCH", body: JSON.stringify({ status: "dismissed" }) });
    await svcFetch(`/rest/v1/opportunity_posts?id=eq.${machinePost}`, { method: "PATCH", body: JSON.stringify({ hidden_at: null }) });
    await expect(getPost(machinePost)).rejects.toBeTruthy(); // still hidden for B: B reported it
  });

  it("A blocks B: B cannot message or respond; A no longer sees B's posts; unblock restores it", async () => {
    // B has a live post A can see
    await clearKind(bizB.id, "need_other", { what: "printing", location: USER_B.loc });
    const bPost = await createPost({ business_id: bizB.id, post_type_id: await typeId("need_other"), title: `B block test [e2e ${RUN}]`, description: null,
      basic: { what: "printing", location: USER_B.loc }, advanced: {}, location: USER_B.loc, deal_type: "pay" });
    const conv = await openConversation(bizB.id, bizA.id);
    await login(USER_A.phone);
    expect((await getPost(bPost)).id).toBe(bPost);
    await blockBusiness(bizA.id, bizB.id);
    expect((await listBlocked(bizA.id)).map((b) => b.id)).toContain(bizB.id);
    await expect(getPost(bPost)).rejects.toBeTruthy(); // hidden for the blocker
    await expect(sendMessage(conv.id, bizA.id, "hello?")).rejects.toMatchObject({ message: "blocked" }); // and A cannot write either
    await login(USER_B.phone);
    await expect(sendMessage(conv.id, bizB.id, "are you there?")).rejects.toMatchObject({ message: "blocked" });
    await expect(respondToPost(machinePost, bizB.id, "interested")).rejects.toMatchObject({ message: "blocked" });
    await deletePost(bPost);
    await login(USER_A.phone);
    await unblockBusiness(bizA.id, bizB.id);
    expect(await listBlocked(bizA.id)).toEqual([]);
    const m = await sendMessage(conv.id, bizA.id, `unblocked [e2e ${RUN}]`);
    expect(m.id).toBeTruthy();
  });

  it("referral: a new business enters A's code, its first post gives A a Boost; A boosts a post", async () => {
    const before = (await getMyReferral(bizA.id))!;
    expect(before.code).toMatch(/^[A-Z2-9]{6}$/);
    // a brand-new user (admin API) signs in with a password, sets up a business and enters A's code
    const phone = `9177${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const created = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(created.status).toBe(200);
    temp = { id: ((await created.json()) as { id: string }).id, phone, password };
    const { error } = await supabase.auth.signInWithPassword({ phone, password });
    expect(error).toBeNull();
    const cats = await listCategories();
    await createBusiness({ name: `E2E Referred ${RUN}`, category_id: cats[0].id, location: USER_A.loc });
    const me = (await loadMyBusiness())!;
    temp.business = me.id;
    await expect(applyReferralCode("ZZZZZZ")).rejects.toMatchObject({ message: "invalid_code" });
    await applyReferralCode(before.code.toLowerCase()); // case does not matter
    await expect(applyReferralCode(before.code)).rejects.toMatchObject({ message: "already_referred" });
    expect((await getMyReferral(me.id))!.can_enter_code).toBe(false);
    // the referral counts only with the first post
    await createPost({ business_id: me.id, post_type_id: await typeId("need_other"), title: `First post [e2e ${RUN}]`, description: null,
      basic: { what: "printing", location: USER_A.loc }, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    await login(USER_A.phone);
    const after = (await getMyReferral(bizA.id))!;
    expect(after.boost_credits).toBe(before.boost_credits + 1);
    expect(after.referral_count).toBe(before.referral_count + 1);
    expect((await getBusinessPublic(bizA.id)).referral_count).toBe(after.referral_count); // public, for the badge
    const until = await boostPost(machinePost);
    expect(new Date(until).getTime()).toBeGreaterThan(Date.now() + 2.9 * 86_400_000);
    expect((await fetchBoosted()).some((p) => p.id === machinePost)).toBe(true);
    expect((await getMyReferral(bizA.id))!.boost_credits).toBe(after.boost_credits - 1);
  });

  it("delete account: hidden at once, restorable within 30 days, erased after", async () => {
    const t = temp!;
    const { error } = await supabase.auth.signInWithPassword({ phone: t.phone, password: t.password });
    expect(error).toBeNull();
    const eraseOn = await requestAccountDeletion();
    expect(new Date(eraseOn).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect(await getDeletionRequest(t.id)).toBeTruthy();
    expect(await loadMyBusiness()).toBeNull(); // business hidden
    expect((await searchAll(`E2E Referred ${RUN}`)).businesses.length).toBe(0);
    await cancelAccountDeletion(); // logged in again within 30 days
    expect((await loadMyBusiness())?.id).toBe(t.business);
    expect(await getDeletionRequest(t.id)).toBeNull();
    expect((await listMyPosts(t.business!)).length).toBe(1); // posts back too
    // delete again and let 30 days pass
    const at = await requestAccountDeletion();
    expect(at).toBeTruthy();
    await signOut({ scope: "local" });
    await svcFetch(`/rest/v1/users?id=eq.${t.id}`, { method: "PATCH", body: JSON.stringify({ deletion_requested_at: new Date(Date.now() - 31 * 86_400_000).toISOString() }) });
    const run = await svcFetch("/rest/v1/rpc/run_erase_deleted_accounts", { method: "POST", body: "{}" });
    expect(await run.json()).toBeGreaterThanOrEqual(1);
    const [biz] = await (await svcFetch(`/rest/v1/businesses?id=eq.${t.business}&select=name,phone,description,city`)).json() as { name: string; phone: string | null; city: string }[];
    expect(biz).toEqual({ name: "Deleted business", phone: null, description: null, city: "-" });
    const [user] = await (await svcFetch(`/rest/v1/users?id=eq.${t.id}&select=phone,erased_at`)).json() as { phone: string | null; erased_at: string | null }[];
    expect(user.phone).toBeNull();
    expect(user.erased_at).toBeTruthy();
    // the phone number is free again; the old account cannot sign in
    const { error: gone } = await supabase.auth.signInWithPassword({ phone: t.phone, password: t.password });
    expect(gone).toBeTruthy();
  });

  it("cleanup: A's test post removed, temporary user deleted", async () => {
    await login(USER_A.phone);
    await deletePost(machinePost);
    await signOut({ scope: "local" });
    if (temp) {
      await svcFetch(`/rest/v1/referrals?referred_business_id=eq.${temp.business}`, { method: "DELETE" });
      await svcFetch(`/rest/v1/reports?target_id=eq.${machinePost}`, { method: "DELETE" });
      // the erased business row stays (chats may point to it); the auth user is removed
      await svcFetch(`/auth/v1/admin/users/${temp.id}`, { method: "DELETE" });
    }
  });
});

describe("9. confirmed deals: close with a business, confirm, count, rate (QA 2026-11-05)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  const counts = async () => {
    const [a, b] = await Promise.all([getBusinessPublic(bizA.id), getBusinessPublic(bizB.id)]);
    return { a: a.completed_deals, b: b.completed_deals, aRatings: a.rating_count, bRatings: b.rating_count };
  };
  /** A's post that B responds to; a live copy from an interrupted earlier run is removed first */
  const postThatBRespondsTo = async (what: string) => {
    await login(USER_A.phone);
    const basic = { what, location: USER_A.loc };
    const stale = await findLiveDuplicate(bizA.id, await typeId("need_other"), basic, {});
    if (stale) await deletePost(stale);
    const id = await createPost({ business_id: bizA.id, post_type_id: await typeId("need_other"), title: `Deal test ${what} [e2e ${RUN}]`, description: null,
      basic, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    await login(USER_B.phone);
    await respondToPost(id, bizB.id, "interested");
    return id;
  };
  let first: string; let second: string; let firstDeal: string;

  it("setup: earlier runs' deals between A and B are moved back 31 days (the pair counts once per 30 days)", async () => {
    await login(USER_A.phone);
    bizA = (await loadMyBusiness())!;
    const r = await svcFetch(`/rest/v1/deals?or=(and(business_a.eq.${bizA.id},business_b.eq.${bizB.id}),and(business_a.eq.${bizB.id},business_b.eq.${bizA.id}))&completed_at=not.is.null`,
      { method: "PATCH", body: JSON.stringify({ completed_at: new Date(Date.now() - 31 * 86_400_000).toISOString() }) });
    expect(r.status).toBe(200);
  });

  it("A closes a post with B (only businesses that talked about it can be picked); B confirms; it counts for both", async () => {
    first = await postThatBRespondsTo("printing");
    await login(USER_A.phone);
    const candidates = await getDealCandidates(first);
    expect(candidates.map((c) => c.business_id)).toEqual([bizB.id]);
    // a business that never talked about the post cannot be named
    const [stranger] = await otherBusinesses(1);
    await expect(closePostWithDeal(first, stranger)).rejects.toMatchObject({ message: "not_a_candidate" });
    // nor can a deal be written directly
    const direct = await supabase.from("deals").insert({ business_a: bizA.id, business_b: bizB.id, status: "completed" });
    expect(direct.error).toBeTruthy();
    const before = await counts();
    firstDeal = (await closePostWithDeal(first, bizB.id))!;
    expect((await getPost(first)).status).toBe("completed");
    await expect(closePostWithDeal(first, bizB.id)).rejects.toMatchObject({ message: "deal_exists" });
    expect((await counts()).a).toBe(before.a); // not counted until B confirms
    await login(USER_B.phone);
    const mine = await listMyDeals(bizB.id);
    const d = mine.find((x) => x.id === firstDeal)!;
    expect(d).toMatchObject({ status: "proposed", i_am_owner: false, other_id: bizA.id });
    expect(dealsToDo(mine).toConfirm.some((x) => x.id === firstDeal)).toBe(true);
    await respondToDeal(firstDeal, true);
    await expect(respondToDeal(firstDeal, true)).rejects.toMatchObject({ message: "deal_not_open" });
    const after = await counts();
    expect(after.a).toBe(before.a + 1);
    expect(after.b).toBe(before.b + 1);
    expect((await listBusinessDeals(bizA.id)).some((x) => x.post_title === `Deal test printing [e2e ${RUN}]`)).toBe(true);
    expect(await dealsDoneCount(null)).toBeGreaterThanOrEqual(1);
  });

  it("ratings stay hidden until both have rated, then count", async () => {
    const before = await counts();
    await rateDeal(firstDeal, 5, "Fast and honest"); // B rates A
    await expect(rateDeal(firstDeal, 4)).rejects.toMatchObject({ message: "already_rated" });
    expect((await counts()).aRatings).toBe(before.aRatings); // hidden: A has not rated yet
    await login(USER_A.phone);
    expect((await listMyDeals(bizA.id)).find((x) => x.id === firstDeal)?.their_rating).toBeNull();
    await rateDeal(firstDeal, 4);
    const after = await counts();
    expect(after.aRatings).toBe(before.aRatings + 1);
    expect(after.bRatings).toBe(before.bRatings + 1);
    expect((await listMyDeals(bizA.id)).find((x) => x.id === firstDeal)?.their_rating).toBe(5);
  });

  it("the same pair counts once per 30 days; reopening a post withdraws an unconfirmed deal; no partner = just closed", async () => {
    second = await postThatBRespondsTo("photography");
    await login(USER_A.phone);
    const before = await counts();
    const secondDeal = (await closePostWithDeal(second, bizB.id))!;
    await login(USER_B.phone);
    await respondToDeal(secondDeal, true);
    expect((await listMyDeals(bizB.id)).find((x) => x.id === secondDeal)).toMatchObject({ status: "completed", counted: false });
    expect((await counts()).a).toBe(before.a);
    // reopening withdraws a deal that was not confirmed yet
    const third = await postThatBRespondsTo("design");
    await login(USER_A.phone);
    const thirdDeal = (await closePostWithDeal(third, bizB.id))!;
    await setPostStatus(third, "active");
    expect((await listMyDeals(bizA.id)).some((x) => x.id === thirdDeal)).toBe(false); // cancelled deals are not listed
    // closing without a partner just closes
    expect(await closePostWithDeal(third, null)).toBeNull();
    expect((await getPost(third)).status).toBe("completed");
    for (const id of [first, second, third]) await deletePost(id);
    await signOut({ scope: "local" });
  });

  it("the Opportunities social-proof line never shows a small number (default minimums in fmbp.app_settings)", async () => {
    const MIN = { deals: 10, deals_all: 25, posts_week: 10, replies_week: 10, businesses: 20 }; // the migration defaults
    for (const city of [USER_A.loc.city, null]) {
      const p = await fetchSocialProof(city);
      if (!p) continue; // every number below its minimum: no line
      expect(p.count).toBeGreaterThanOrEqual(p.kind === "deals" && !p.city ? MIN.deals_all : MIN[p.kind]);
    }
    // a city with no FMBP activity falls back to all of FMBP (or no line), never "0 in <city>"
    const nowhere = await fetchSocialProof(`Nowhere ${RUN}`);
    expect(nowhere?.city ?? null).toBeNull();
  });
});

describe("10. admin: only admins, verification, reports, suspension, settings, broadcast, log (QA 2026-11-05)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  type Temp = { id: string; phone: string; password: string; business?: string };
  const tempUser = async (): Promise<Temp> => {
    const phone = `9178${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    await sleep(5); // distinct numbers
    return { id: ((await r.json()) as { id: string }).id, phone, password };
  };
  const as = async (u: Temp) => { const { error } = await supabase.auth.signInWithPassword({ phone: u.phone, password: u.password }); expect(error).toBeNull(); };
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  const sendDoc = async (businessId: string) => {
    const path = `${businessId}/doc-${Date.now()}.png`;
    const up = await supabase.storage.from("verification-docs").upload(path, base64ToBytes(PNG_1PX), { contentType: "image/png" });
    expect(up.error).toBeNull();
    const { error } = await supabase.rpc("request_verification", { p_business_id: businessId, p_doc_type: "gst", p_doc_number: "09ABCDE1234F1Z5", p_file_path: path });
    if (error) throw error;
    return path;
  };
  const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  let admin: Temp; let shop: Temp; let shopPost: string; let docPath: string;

  it("setup: a temporary admin and a temporary business with one post", async () => {
    admin = await tempUser();
    const added = await svcFetch("/rest/v1/admins", { method: "POST", body: JSON.stringify({ phone: admin.phone, name: "E2E Admin", added_by: "e2e" }) });
    expect(added.status).toBe(201);
    shop = await tempUser();
    await as(shop);
    const cats = await listCategories();
    await createBusiness({ name: `E2E Shop ${RUN}`, category_id: cats[0].id, location: USER_A.loc });
    shop.business = (await loadMyBusiness())!.id;
    shopPost = await createPost({ business_id: shop.business, post_type_id: await typeId("need_other"), title: `Admin test post [e2e ${RUN}]`, description: null,
      basic: { what: "printing", location: USER_A.loc }, advanced: {}, location: USER_A.loc, deal_type: "pay" });
  });

  it("a normal user is not an admin, cannot call admin functions, and cannot set server-only columns", async () => {
    // the business owner cannot make itself verified, change its counts, or un-hide its post
    const self = await supabase.from("businesses").update({ verification_status: "verified" }).eq("id", shop.business!);
    expect(self.error?.message).toBe("protected_column");
    const deals = await supabase.from("businesses").update({ completed_deals: 99 }).eq("id", shop.business!);
    expect(deals.error?.message).toBe("protected_column");
    const views = await supabase.from("opportunity_posts").update({ view_count: 1000 }).eq("id", shopPost);
    expect(views.error?.message).toBe("protected_column");
    // ordinary edits still work
    await updateBusiness(shop.business!, { description: `Edited by e2e ${RUN}` });
    expect(await amIAdmin()).toBe(false);
    await expect(adminStats()).rejects.toMatchObject({ message: "not_admin" });
    await expect(suspendBusiness(bizA.id, "nope")).rejects.toMatchObject({ message: "not_admin" });
  });

  it("verification: the business sends a document (private), the admin rejects with a reason, then approves", async () => {
    docPath = await sendDoc(shop.business!);
    expect((await loadMyBusiness())!.verification_status).toBe("pending");
    await expect(sendDoc(shop.business!)).rejects.toMatchObject({ message: "already_pending" });
    // another business cannot open the document
    await login(USER_A.phone);
    const peek = await supabase.storage.from("verification-docs").createSignedUrl(docPath, 60);
    expect(peek.error).toBeTruthy();
    await as(admin);
    expect(await amIAdmin()).toBe(true);
    const pending = await adminVerifications("pending");
    const v = pending.find((x) => x.business_id === shop.business)!;
    expect(v).toMatchObject({ doc_type: "gst", file_path: docPath });
    expect(await verificationDocUrl(docPath)).toMatch(/^http/);
    await expect(reviewVerification(v.id, false, "")).rejects.toMatchObject({ message: "reason_required" });
    await reviewVerification(v.id, false, "Photo not readable");
    await expect(reviewVerification(v.id, true, null)).rejects.toMatchObject({ message: "already_reviewed" });
    await as(shop);
    expect((await loadMyBusiness())!.verification_status).toBe("rejected");
    await sendDoc(shop.business!);
    await as(admin);
    const again = (await adminVerifications("pending")).find((x) => x.business_id === shop.business)!;
    await reviewVerification(again.id, true, null);
    expect((await getBusinessPublic(shop.business!)).verification_status).toBe("verified");
  });

  it("reports: A reports the post; the admin sees it, removes the post with a reason; restore undoes it", async () => {
    await login(USER_A.phone);
    await report(bizA.id, "post", shopPost, "spam", `e2e ${RUN}`);
    await as(admin);
    const open = await adminReports("open");
    const r = open.find((x) => x.target_id === shopPost)!;
    expect(r).toMatchObject({ target_type: "post", reports: 1, business_id: shop.business, title: `Admin test post [e2e ${RUN}]` });
    await expect(resolveReport("post", shopPost, "remove_post", "")).rejects.toMatchObject({ message: "reason_required" });
    await resolveReport("post", shopPost, "remove_post", "Spam");
    expect((await adminReports("open")).some((x) => x.target_id === shopPost)).toBe(false);
    expect((await adminBusinessPosts(shop.business!)).find((p) => p.id === shopPost)?.removed).toBe(true);
    await restorePost(shopPost, "Removed by mistake");
    expect((await adminBusinessPosts(shop.business!)).find((p) => p.id === shopPost)?.removed).toBe(false);
  });

  it("suspension: the business and its posts disappear for everyone and it cannot post; lifting brings it back", async () => {
    await expect(suspendBusiness(shop.business!, "")).rejects.toMatchObject({ message: "reason_required" });
    await suspendBusiness(shop.business!, "Fake documents");
    const b = await adminBusiness(shop.business!);
    expect(b).toMatchObject({ suspension_reason: "Fake documents", owner_phone: shop.phone });
    expect(b.actions.map((a) => a.action)).toEqual(expect.arrayContaining(["suspend", "verify", "reject_verification"]));
    // the dashboard's Suspended tile lists it, ready to lift
    expect((await listBusinesses("suspended", 0)).find((x) => x.id === shop.business)).toMatchObject({ suspension_reason: "Fake documents", owner_phone: shop.phone });
    expect((await adminSearch(`E2E Shop ${RUN}`))[0]).toMatchObject({ kind: "business", id: shop.business, flags: expect.arrayContaining(["suspended"]) });
    await login(USER_A.phone);
    await expect(getBusinessPublic(shop.business!)).rejects.toBeTruthy();
    expect((await getPost(shopPost).catch(() => null))).toBeNull();
    expect((await searchAll(`E2E Shop ${RUN}`)).businesses.length).toBe(0);
    await as(shop);
    const mine = (await loadMyBusiness())!;
    expect(mine.suspended_at).toBeTruthy();
    expect(mine.suspension_reason).toBe("Fake documents");
    await expect(createPost({ business_id: shop.business!, post_type_id: await typeId("need_other"), title: `Blocked [e2e ${RUN}]`, description: null,
      basic: { what: "design", location: USER_A.loc }, advanced: {}, location: USER_A.loc, deal_type: "pay" })).rejects.toBeTruthy();
    const lift = await supabase.from("businesses").update({ suspended_at: null }).eq("id", shop.business!);
    expect(lift.error).toBeTruthy(); // cannot lift it yourself
    await as(admin);
    await unsuspendBusiness(shop.business!, null);
    await login(USER_A.phone);
    expect((await getBusinessPublic(shop.business!)).name).toBe(`E2E Shop ${RUN}`);
  });

  it("settings, admins and broadcast are validated; every action is in the log", async () => {
    await as(admin);
    const [sp] = (await adminSettings()).filter((s) => s.key === "social_proof");
    await expect(updateSetting("social_proof", { unknown_key: 5 })).rejects.toMatchObject({ message: "invalid" });
    await expect(updateSetting("social_proof", { posts_week_min: -1 })).rejects.toMatchObject({ message: "invalid" });
    await updateSetting("social_proof", { posts_week_min: sp.value.posts_week_min + 1 });
    await updateSetting("social_proof", { posts_week_min: sp.value.posts_week_min }); // back
    await expect(addAdmin("12345", "Nobody")).rejects.toMatchObject({ message: "bad_phone" });
    await expect(disableAdmin(admin.phone)).rejects.toMatchObject({ message: "cannot_disable_self" });
    expect((await listAdmins()).find((a) => a.phone === admin.phone)?.is_me).toBe(true);
    await expect(broadcast({ titleEn: "x", bodyEn: "y", titleHi: "", bodyHi: "", city: null })).rejects.toMatchObject({ message: "invalid" });
    expect(await broadcast({ titleEn: "E2E test", bodyEn: "Nobody lives here", titleHi: "", bodyHi: "", city: `Nowhere ${RUN}` })).toBe(0);
    await expect(broadcast({ titleEn: "E2E again", bodyEn: "Too soon", titleHi: "", bodyHi: "", city: `Nowhere ${RUN}` })).rejects.toMatchObject({ message: "too_soon" });
    // sent broadcasts are listed (they cannot be edited or recalled; "Use as template" starts a correction)
    expect((await listBroadcasts())[0]).toMatchObject({ title_en: "E2E test", body_en: "Nobody lives here", city: `Nowhere ${RUN}`, recipients: 0, admin_phone: admin.phone });
    const log = await adminLog(50);
    expect(log.map((a) => a.action)).toEqual(expect.arrayContaining(["broadcast", "update_setting", "unsuspend", "suspend", "restore_post", "remove_post", "verify"]));
    expect(log.every((a) => a.admin_phone === admin.phone || a.admin_phone !== "")).toBe(true);
    expect((await adminStats()).businesses).toBeGreaterThan(0);
    // the other dashboard tiles
    expect((await listBusinesses("new", 0)).some((x) => x.id === shop.business)).toBe(true);
    expect((await listPosts("live", 0)).some((p) => p.id === shopPost)).toBe(true);
    expect(Array.isArray(await listDeals(0))).toBe(true);
    expect((await listResponses(0)).every((r) => r.post_title && r.responder_name)).toBe(true);
    await expect(listPosts("everything" as never, 0)).rejects.toMatchObject({ message: "invalid" });
  });

  it("cleanup: the temporary admin, business and log rows are removed", async () => {
    await signOut({ scope: "local" });
    // the test broadcast must not block the next run's (one per 10 minutes)
    await svcFetch(`/rest/v1/admin_actions?admin_phone=eq.${admin.phone}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/admins?phone=eq.${admin.phone}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/reports?target_id=eq.${shopPost}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${shop.business}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/business_verifications?business_id=eq.${shop.business}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/businesses?id=eq.${shop.business}`, { method: "DELETE" });
    for (const u of [admin, shop]) await svcFetch(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  });
});

describe("11. individuals: a person with a trade, posts that fit a person, replies to any post (QA 2026-11-05)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  let person: { id: string; phone: string; password: string; business?: string }; let hiring: string; let work: string;

  it("a person signs up with their name and trade (no business); the trade is required", async () => {
    const phone = `9179${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    person = { id: ((await r.json()) as { id: string }).id, phone, password };
    expect((await supabase.auth.signInWithPassword({ phone, password })).error).toBeNull();
    const cats = await listCategories();
    const food = cats.find((c) => c.slug === "food_restaurant")!.id;
    await expect(createBusiness({ name: "Rohit Kumar", category_id: food, location: USER_A.loc, kind: "individual" })).rejects.toMatchObject({ message: "trade_required" });
    await createBusiness({ name: "Rohit Kumar", category_id: food, location: USER_A.loc, kind: "individual", trade: "other", trade_other: `Bhatura maker ${RUN}` });
    const me = (await loadMyBusiness())!;
    person.business = me.id;
    expect(me).toMatchObject({ kind: "individual", trade: "other", trade_other: `Bhatura maker ${RUN}` });
    expect((await getBusinessPublic(me.id))).toMatchObject({ kind: "individual", trade_other: `Bhatura maker ${RUN}` });
    // once a person, they may become a business later, but a business never turns into a person (checked below)
  });

  it("only post types that fit a person are offered and accepted; Looking for work is", async () => {
    const offer = (await listIntentions()).find((i) => i.slug === "offer")!;
    const types = await listPostTypes(offer.id);
    expect(types.find((p) => p.slug === "offer_work")?.for_individuals).toBe(true);
    expect(types.find((p) => p.slug === "offer_franchise")?.for_individuals).toBe(false);
    const base = { business_id: person.business!, title: `Bhatura maker looking for work [e2e ${RUN}]`, description: null, location: USER_A.loc, deal_type: "pay" as const };
    await expect(createPost({ ...base, post_type_id: await typeId("need_employee"), basic: { role: "helper", salary: 9000, deal: "pay", location: USER_A.loc }, advanced: {} }))
      .rejects.toMatchObject({ message: "not_for_individuals" });
    work = await createPost({ ...base, post_type_id: await typeId("offer_work"), basic: { job: "cook", experience: "lt1", deal: "pay", location: USER_A.loc }, advanced: {} });
    expect((await getPost(work)).business?.kind).toBe("individual");
  });

  it("a person can reply to a business's job post, and a business cannot turn into a person", async () => {
    await login(USER_A.phone);
    bizA = (await loadMyBusiness())!;
    const stale = await findLiveDuplicate(bizA.id, await typeId("need_employee"), { role: "cook", location: USER_A.loc }, {});
    if (stale) await deletePost(stale);
    hiring = await createPost({ business_id: bizA.id, post_type_id: await typeId("need_employee"), title: `Need a cook [e2e ${RUN}]`, description: null,
      basic: { role: "cook", salary: 12000, deal: "pay", location: USER_A.loc }, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    const toIndividual = await supabase.from("businesses").update({ kind: "individual", trade: "cook" }).eq("id", bizA.id);
    expect(toIndividual.error?.message).toBe("cannot_become_individual");
    expect((await supabase.auth.signInWithPassword({ phone: person.phone, password: person.password })).error).toBeNull();
    await respondToPost(hiring, person.business!, "interested");
    await login(USER_A.phone);
    expect((await listPostResponses(hiring)).some((r) => r.business?.id === person.business)).toBe(true);
  });

  it("cleanup: the posts, the person's profile and login are removed", async () => {
    await deletePost(hiring);
    await signOut({ scope: "local" });
    await svcFetch(`/rest/v1/post_responses?post_id=eq.${hiring}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${person.business}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/businesses?id=eq.${person.business}`, { method: "DELETE" });
    await svcFetch(`/auth/v1/admin/users/${person.id}`, { method: "DELETE" });
  });
});

describe("12. notifications list (bell on Home): everything but chat messages, newest first (QA 2026-11-06)", () => {
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  let post: string;

  it("B replies to A's post and writes in chat: A's bell counts the reply, not the chat message; opening clears it", async () => {
    await login(USER_A.phone);
    bizA = (await loadMyBusiness())!;
    await markInboxRead();
    expect(await unreadInboxCount()).toBe(0);
    const basic = { what: "packaging", location: USER_A.loc };
    const stale = await findLiveDuplicate(bizA.id, await typeId("need_other"), basic, {});
    if (stale) await deletePost(stale);
    post = await createPost({ business_id: bizA.id, post_type_id: await typeId("need_other"), title: `Inbox test [e2e ${RUN}]`, description: null,
      basic, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    await login(USER_B.phone);
    bizB = (await loadMyBusiness())!;
    await respondToPost(post, bizB.id, "interested");
    const conv = await openConversation(bizB.id, bizA.id, post);
    await sendMessage(conv.id, bizB.id, `inbox check [e2e ${RUN}]`);
    await login(USER_A.phone);
    expect(await unreadInboxCount()).toBe(1);
    const [latest] = await listInbox(null);
    expect(latest).toMatchObject({ kind: "response", read: false });
    expect(latest.title.length).toBeGreaterThan(0);
    expect(routeForNotification(latest.data)).toEqual({ pathname: "/post/[id]", params: { id: post } });
    expect((await listInbox(null)).some((n) => n.kind === "message")).toBe(false);
    await markInboxRead();
    expect(await unreadInboxCount()).toBe(0);
    expect((await listInbox(null))[0].read).toBe(true);
    await deletePost(post);
    await signOut({ scope: "local" });
  });
});

describe("13. categories: broad, with what belongs in each, found by those words (QA 2026-11-06)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  let user: { id: string; phone: string; password: string; business?: string };

  it("Shakti LED Works picks Electrical & Electronics (its ⓘ lists LED and motors); search finds it by bijli and motor", async () => {
    const cats = await listCategories();
    const elec = cats.find((c) => c.slug === "electrical_electronics")!;
    expect(elec.name_en).toBe("Electrical & Electronics");
    expect(elec.examples_en).toEqual(expect.arrayContaining(["LED, bulbs & lights", "Motors & pumps", "TV & remote"]));
    expect(elec.examples_hi.length).toBe(elec.examples_en.length);
    // every category says what belongs in it, in both languages
    for (const c of cats) expect(c.examples_en.length && c.examples_en.length === c.examples_hi.length).toBeTruthy();
    const phone = `9177${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    user = { id: ((await r.json()) as { id: string }).id, phone, password };
    expect((await supabase.auth.signInWithPassword({ phone, password })).error).toBeNull();
    await createBusiness({ name: `Shakti Works ${RUN}`, category_id: elec.id, location: USER_A.loc });
    const me = (await loadMyBusiness())!;
    user.business = me.id;
    for (const word of ["bijli", "motor", "Electronics"]) {
      expect((await searchAll(word)).businesses.some((b) => b.id === me.id)).toBe(true);
    }
    await signOut({ scope: "local" });
  });

  it("cleanup", async () => {
    await svcFetch(`/rest/v1/businesses?id=eq.${user.business}`, { method: "DELETE" });
    await svcFetch(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  });
});

describe("14. several profiles per login: up to 3, own posts, no gaming with own profiles (QA 2026-11-06)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const typeId = async (slug: string) => (await supabase.from("post_types").select("id").eq("slug", slug).single()).data!.id as string;
  let user: { id: string; phone: string; password: string };
  let admin: { id: string; phone: string; password: string };
  const as = async (u: { phone: string; password: string }) => { expect((await supabase.auth.signInWithPassword({ phone: u.phone, password: u.password })).error).toBeNull(); };
  const tempUser = async (prefix: string) => {
    const phone = `${prefix}${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    return { id: ((await r.json()) as { id: string }).id, phone, password };
  };
  let shop: string; let stall: string; let person: string; let stallPost: string;

  it("one login: a clothes shop, a tea stall and a person profile; a fourth is refused; the chosen one stays in use", async () => {
    user = await tempUser("9177");
    await as(user);
    const cats = await listCategories();
    const cat = (slug: string) => cats.find((c) => c.slug === slug)!.id;
    shop = await createBusiness({ name: `Clothes ${RUN}`, category_id: cat("garments_fashion"), location: USER_A.loc });
    stall = await createBusiness({ name: `Tea stall ${RUN}`, category_id: cat("food_restaurant"), location: USER_A.loc });
    person = await createBusiness({ name: `Rohit ${RUN}`, category_id: cat("freelance"), location: USER_A.loc, kind: "individual", trade: "tailor" });
    await expect(createBusiness({ name: `Fourth ${RUN}`, category_id: cat("other"), location: USER_A.loc })).rejects.toMatchObject({ message: "profile_limit" });
    expect((await listMyBusinesses()).map((b) => b.id)).toEqual([shop, stall, person]);
    expect((await loadMyBusiness())!.id).toBe(shop); // the first, until another is chosen
    await setActiveProfile(user.id, stall);
    expect((await loadMyBusiness())!.id).toBe(stall);
    // each profile has its own posts
    stallPost = await createPost({ business_id: stall, post_type_id: await typeId("need_other"), title: `Stall needs milk [e2e ${RUN}]`, description: null,
      basic: { what: "milk", location: USER_A.loc }, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    expect((await listMyPosts(stall)).map((p) => p.id)).toContain(stallPost);
    expect(await listMyPosts(shop)).toEqual([]);
    expect(await businessesOfNotification({ kind: "response", post_id: stallPost })).toEqual([stall]); // opens in the right profile
  });

  it("own profiles cannot reply to, chat with or follow each other, so no fake deals, ratings or followers", async () => {
    await expect(respondToPost(stallPost, shop, "interested")).rejects.toMatchObject({ message: "own_profile" });
    await expect(openConversation(shop, stall, stallPost)).rejects.toMatchObject({ message: "own_profile" });
    await expect(followBusiness(shop, stall)).rejects.toBeTruthy();
    await expect(closePostWithDeal(stallPost, shop)).rejects.toMatchObject({ message: "not_a_candidate" });
  });

  it("the 3-reports rule counts people: 3 profiles of one person do not hide a post", async () => {
    await login(USER_A.phone);
    bizA = (await loadMyBusiness())!;
    const basic = { what: "reports check", location: USER_A.loc };
    const stale = await findLiveDuplicate(bizA.id, await typeId("need_other"), basic, {});
    if (stale) await deletePost(stale);
    const target = await createPost({ business_id: bizA.id, post_type_id: await typeId("need_other"), title: `Reports check [e2e ${RUN}]`, description: null,
      basic, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    await as(user);
    for (const p of [shop, stall, person]) await report(p, "post", target, "spam");
    const [row] = await (await svcFetch(`/rest/v1/opportunity_posts?id=eq.${target}&select=hidden_at`)).json() as { hidden_at: string | null }[];
    expect(row.hidden_at).toBeNull();
    await svcFetch(`/rest/v1/reports?target_id=eq.${target}`, { method: "DELETE" });
    await login(USER_A.phone);
    await deletePost(target);
  });

  it("a block covers all profiles of the person; one person enters one invite code", async () => {
    await login(USER_A.phone);
    await blockBusiness(bizA.id, shop);
    await as(user);
    await expect(respondToPost((await (await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${bizA.id}&status=eq.active&deleted_at=is.null&select=id&limit=1`)).json() as { id: string }[])[0]?.id ?? stallPost, stall, "interested")).rejects.toBeTruthy();
    await expect(openConversation(stall, bizA.id)).rejects.toMatchObject({ message: "blocked" });
    await login(USER_A.phone);
    expect((await getPost(stallPost).catch(() => null))).toBeNull(); // the blocker no longer sees their other profile's posts
    await unblockBusiness(bizA.id, shop);
    expect((await getPost(stallPost)).id).toBe(stallPost);
    await as(user);
    expect((await getMyReferral(shop))!.can_enter_code).toBe(true);
    expect((await getMyReferral(stall))!.can_enter_code).toBe(false);
  });

  it("suspension covers one profile: others keep working, no new profile meanwhile; admins see the other profiles", async () => {
    admin = await tempUser("9178");
    expect((await svcFetch("/rest/v1/admins", { method: "POST", body: JSON.stringify({ phone: admin.phone, name: "E2E Admin 2", added_by: "e2e" }) })).status).toBe(201);
    await as(admin);
    await suspendBusiness(shop, "Fake documents");
    const b = await adminBusiness(shop);
    expect(b.other_profiles.map((o) => o.id)).toEqual([stall, person]);
    await as(user);
    expect((await listMyBusinesses()).find((p) => p.id === shop)?.suspended_at).toBeTruthy();
    expect((await getPost(stallPost)).id).toBe(stallPost); // the tea stall still works
    await expect(createBusiness({ name: `Dodge ${RUN}`, category_id: (await listCategories())[0].id, location: USER_A.loc })).rejects.toBeTruthy();
    await as(admin);
    await unsuspendBusiness(shop, null);
    await signOut({ scope: "local" });
  });

  it("delete account covers all profiles", async () => {
    await as(user);
    await requestAccountDeletion();
    expect(await listMyBusinesses()).toEqual([]);
    await cancelAccountDeletion();
    expect((await listMyBusinesses()).length).toBe(3);
    await signOut({ scope: "local" });
  });

  it("cleanup", async () => {
    await svcFetch(`/rest/v1/admin_actions?admin_phone=eq.${admin.phone}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/admins?phone=eq.${admin.phone}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${stall}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/reports?reporter_business_id=in.(${shop},${stall},${person})`, { method: "DELETE" });
    await svcFetch(`/rest/v1/businesses?id=in.(${shop},${stall},${person})`, { method: "DELETE" });
    for (const u of [user, admin]) await svcFetch(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  });
});

describe("15. words people use: counted by region, private, admins only (QA 2026-11-07)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  type Temp = { id: string; phone: string; password: string };
  const tempUser = async (prefix: string): Promise<Temp> => {
    const phone = `${prefix}${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    await sleep(5);
    return { id: ((await r.json()) as { id: string }).id, phone, password };
  };
  const as = async (u: Temp) => { expect((await supabase.auth.signInWithPassword({ phone: u.phone, password: u.password })).error).toBeNull(); };
  // the run id has digits; a word with 5 digits would be dropped as a possible phone number
  const TAG = RUN.replace(/\d/g, (d) => "abcdefghij"[Number(d)]!);
  const WORD = `e2e tube ${TAG}`; const OTHER = `e2e other ${TAG}`;
  const counts = async (word: string) => (await (await svcFetch(`/rest/v1/word_counts?word=eq.${encodeURIComponent(word)}&select=*`)).json()) as { source: string; section: string; city: string; state: string; uses: number; found_nothing: number }[];
  const record = (word: string, source = "search", found = false, section?: string) => supabase.rpc("record_word", { p_word: word, p_source: source, p_found: found, p_section: section });
  let person: Temp; let admin: Temp;

  it("a search is counted with the city and state of the profile, once per person per day", async () => {
    person = await tempUser("9177");
    await as(person);
    const food = (await listCategories()).find((c) => c.slug === "food_restaurant")!.id;
    await createBusiness({ name: `E2E Words ${RUN}`, category_id: food, location: USER_A.loc });
    expect((await record(`  ${WORD.toUpperCase()} `)).error).toBeNull(); // tidied the same way
    expect((await record(WORD)).error).toBeNull();
    expect(await counts(WORD)).toEqual([expect.objectContaining({ source: "search", city: "Noida", state: "Uttar Pradesh", uses: 1, found_nothing: 1 })]);
    // nothing about the person is stored with the word
    expect(Object.keys((await counts(WORD))[0]!).sort()).toEqual(["city", "found_nothing", "section", "source", "state", "uses", "word"]);
  });

  it("phone numbers, e-mail addresses and links are never kept; a made-up source is refused", async () => {
    for (const bad of ["98765 43210", `e2e${TAG}@mail.com`, `www.e2e${TAG}.in`]) {
      expect((await record(bad)).error).toBeNull();
      expect(await counts(bad)).toEqual([]);
    }
    expect((await record(WORD, "other_trade")).error?.message).toBe("invalid");
  });

  it("the phone cannot read the words, and only admins can list them", async () => {
    for (const table of ["word_insights", "word_counts", "word_seen"]) {
      expect((await supabase.from(table as "word_insights").select("*").limit(1)).error).not.toBeNull();
    }
    const filter = { status: "new" as const, state: null, city: null, onlyNothing: false };
    await expect(listWords(filter, 0)).rejects.toBeTruthy();
    await expect(listWordRegions()).rejects.toBeTruthy();
    await expect(exportWords(filter)).rejects.toBeTruthy();
    await expect(setWordStatus(WORD, "ignored")).rejects.toBeTruthy();
    await expect(renameWord(WORD, "e2e hacked")).rejects.toBeTruthy();
    await expect(deleteWord(WORD)).rejects.toBeTruthy();
    await expect(wordStatusCounts(filter)).rejects.toBeTruthy();
    await signOut({ scope: "local" });
    expect((await record(WORD)).error).not.toBeNull(); // not signed in
    await as(person);
  });

  it("one person adds at most 50 words a day", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => i)
      .map((n) => record(`e2e cap ${TAG} ${"abcdefghijkl"[n]}`)));
    await svcFetch("/rest/v1/word_seen", { method: "POST", body: JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ user_id: person.id, word: `e2e filler ${i}`, source: "search" }))) });
    expect((await record(`e2e over ${TAG}`)).error).toBeNull();
    expect(await counts(`e2e over ${TAG}`)).toEqual([]);
    await svcFetch(`/rest/v1/word_seen?user_id=eq.${person.id}`, { method: "DELETE" });
  });

  it("words written under Other are counted from the profile, and a save never fails because of it", async () => {
    const food = (await listCategories()).find((c) => c.slug === "food_restaurant")!.id;
    await createBusiness({ name: "E2E Words Person", category_id: food, location: USER_A.loc, kind: "individual", trade: "other", trade_other: OTHER });
    expect(await counts(OTHER)).toEqual([expect.objectContaining({ source: "other_trade", city: "Noida", uses: 1, found_nothing: 1 })]);
    await signOut({ scope: "local" });
  });

  it("a business in Other says what it does: counted once, kept only while it stays in Other, never for a person", async () => {
    await as(person);
    const cats = await listCategories();
    const other = cats.find((c) => c.slug === "other")!.id; const food = cats.find((c) => c.slug === "food_restaurant")!.id;
    const word = `e2e bamboo ${TAG}`;
    const mine = await listMyBusinesses(person.id);
    const biz = mine.find((b) => b.kind === "business")!;
    await updateBusiness(biz.id, { category_id: other, category_other: `  ${word} ` });
    const read = async () => (await listMyBusinesses(person.id)).find((b) => b.id === biz.id)!.category_other;
    expect(await read()).toBe(word);
    expect(await counts(word)).toEqual([expect.objectContaining({ source: "other_category", city: "Noida", state: "Uttar Pradesh", uses: 1, found_nothing: 1 })]);
    await updateBusiness(biz.id, { category_other: word }); // saved again unchanged: not counted again
    expect((await counts(word))[0]!.uses).toBe(1);
    await updateBusiness(biz.id, { category_id: food });
    expect(await read()).toBeNull(); // left Other: the words go
    await updateBusiness(biz.id, { category_other: "e2e not other" });
    expect(await read()).toBeNull(); // not in Other: refused quietly
    expect(await counts("e2e not other")).toEqual([]);
    const person2 = mine.find((b) => b.kind === "individual")!;
    await updateBusiness(person2.id, { category_id: other, category_other: "e2e person" });
    expect((await listMyBusinesses(person.id)).find((b) => b.id === person2.id)!.category_other).toBeNull();
    await signOut({ scope: "local" });
  });

  it("a post form: a word not in the list is counted once for one person, and the post keeps it under Other", async () => {
    await as(person);
    const word = `e2e golgappe ${TAG}`;
    expect((await record(word, "form_list", false)).error).toBeNull(); // searched it in the list…
    const me = (await listMyBusinesses(person.id)).find((b) => b.kind === "individual")!;
    const type = (await supabase.from("post_types").select("id").eq("slug", "offer_work").single()).data!.id as string;
    const basic = { job: "other", job_other: word, experience: "fresher", deal: "pay", location: USER_A.loc };
    const id = await createPost({ business_id: me.id, post_type_id: type, title: `Words [e2e ${RUN}]`, description: null, basic, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    expect((await getPost(id)).basic).toMatchObject({ job: "other", job_other: word });
    expect(await counts(word)).toEqual([expect.objectContaining({ source: "form_list", uses: 1, found_nothing: 1 })]); // …and wrote it: one person, once
    // another word only written under Other, on a post: counted from the post
    const written = `e2e papdi ${TAG}`;
    await updatePost(id, { title: `Words [e2e ${RUN}]`, description: null, basic: { ...basic, job_other: written }, advanced: {}, location: USER_A.loc, deal_type: "pay" });
    expect(await counts(written)).toEqual([expect.objectContaining({ source: "other_form", section: "offer_work.job", city: "Noida", uses: 1 })]);
    await deletePost(id);
    await signOut({ scope: "local" });
  });

  it("the flow and section are kept: one person counts once in each flow, not once per list in a flow", async () => {
    await as(person);
    const word = `e2e flows ${TAG}`;
    expect((await record(word, "type_list", false, "need")).error).toBeNull();
    expect((await record(word, "form_list", false, "need_other.what")).error).toBeNull(); // the same post flow: not again
    expect((await record(word, "search", false)).error).toBeNull(); // Home search: another flow
    expect((await counts(word)).map((c) => [c.source, c.section, c.uses]).sort()).toEqual([["search", "", 1], ["type_list", "need", 1]]);
    // the section is only a label: anything else is dropped
    const odd = `e2e odd ${TAG}`;
    expect((await record(odd, "form_list", false, "'; drop table x; --")).error).toBeNull();
    expect((await counts(odd))[0]).toMatchObject({ section: "" });
    await signOut({ scope: "local" });
  });

  it("the words people look for find the right post type in the real data; individuals keep Something else", async () => {
    await as(person);
    const types = async (intention: string) => {
      const id = (await supabase.from("intentions").select("id").eq("slug", intention).single()).data!.id as string;
      return (await listPostTypes(id)).filter((t) => t.for_individuals);
    };
    const need = await types("need"); const offer = await types("offer");
    const found = (list: typeof need, q: string) => findTypes(list, q).list.map((t) => t.slug);
    for (const q of ["barber", "hair cutter", "tandoor maker", "plumber", "नाई", "darzi"]) expect(found(need, q)).toContain("need_skilled_person");
    for (const q of ["child care", "babysitter", "tailor", "cook"]) expect(found(offer, q)).toEqual(expect.arrayContaining(["offer_service", "offer_work"]));
    expect(found(need, "rice")).toContain("buy_product");
    for (const [list, other] of [[need, "need_other"], [offer, "offer_other"]] as const) {
      expect(findTypes(list, "golgappe")).toEqual({ list: [expect.objectContaining({ slug: other })], notInList: true });
    }
    expect(need.every((t) => (t.examples_en?.length ?? 0) > 0 && t.examples_en?.length === t.examples_hi?.length)).toBe(true); // every choice has its ⓘ
    await signOut({ scope: "local" });
  });

  it("an admin filters by region, marks a word (logged) and exports it", async () => {
    admin = await tempUser("9178");
    expect((await svcFetch("/rest/v1/admins", { method: "POST", body: JSON.stringify({ phone: admin.phone, name: "E2E Admin", added_by: "e2e" }) })).status).toBe(201);
    await as(admin);
    expect((await adminStats()).words_new).toBeGreaterThan(0); // the dashboard tile
    const inNoida = { status: "new" as const, state: "Uttar Pradesh", city: "Noida", onlyNothing: true };
    expect((await listWordRegions()).some((r) => r.city === "Noida")).toBe(true);
    const row = (await listWords(inNoida, 0)).find((w) => w.word === WORD)!;
    expect(row).toMatchObject({ uses: 1, found_nothing: 1, sources: ["search"], regions: [{ city: "Noida", state: "Uttar Pradesh", uses: 1 }] });
    expect((await listWords({ ...inNoida, city: "Nowhere" }, 0)).some((w) => w.word === WORD)).toBe(false);
    expect((await exportWords(inNoida)).some((r) => r.word === WORD && r.city === "Noida")).toBe(true);
    await setWordStatus(WORD, "added");
    // nothing left under "To review" is no reason for an empty spreadsheet: it holds every status
    expect((await exportWords(inNoida)).find((r) => r.word === WORD)).toMatchObject({ status: "added", flow: "search", source: "search" });
    expect((await wordStatusCounts(inNoida)).added).toBeGreaterThan(0);
    expect((await listWords(inNoida, 0)).some((w) => w.word === WORD)).toBe(false);
    expect((await listWords({ ...inNoida, status: "added" }, 0)).some((w) => w.word === WORD)).toBe(true);
    expect((await adminLog(20)).some((a) => a.action === "word_status" && a.target_id === WORD)).toBe(true);
    await expect(setWordStatus(WORD, "nonsense" as "new")).rejects.toBeTruthy();
    await signOut({ scope: "local" });
  });

  it("an admin filters by flow, and sees the post type and field a word came from", async () => {
    await as(admin);
    const all = { status: "new" as const, state: null, city: null, onlyNothing: false };
    const word = `e2e flows ${TAG}`;
    const inPosts = (await listWords({ ...all, flow: "post" }, 0)).find((w) => w.word === word)!;
    expect(inPosts).toMatchObject({ uses: 1, places: [expect.objectContaining({ source: "type_list", section: "need" })] }); // only its post count
    expect((await listWords({ ...all, flow: "profile" }, 0)).some((w) => w.word === word)).toBe(false);
    expect((await listWords(all, 0)).find((w) => w.word === word)!.uses).toBe(2);
    await signOut({ scope: "local" });
  });

  it("an admin corrects a spelling (counts are added when the word exists) and deletes a word, both logged", async () => {
    await as(person);
    const wrong = `e2e golgape ${TAG}`; const right = `e2e golgappa ${TAG}`; const typo = `e2e typo ${TAG}`;
    for (const w of [wrong, right, typo]) expect((await record(w, "search")).error).toBeNull();
    await signOut({ scope: "local" });
    await as(admin);
    await renameWord(wrong, ` ${right.toUpperCase()} `);
    expect(await counts(wrong)).toEqual([]);
    expect(await counts(right)).toEqual([expect.objectContaining({ uses: 2, found_nothing: 2 })]);
    await renameWord(typo, `e2e fixed ${TAG}`);
    expect(await counts(`e2e fixed ${TAG}`)).toEqual([expect.objectContaining({ uses: 1 })]);
    await expect(renameWord(right, "98765 43210")).rejects.toBeTruthy(); // a phone number is refused here too
    await expect(renameWord("e2e not a word", "e2e anything")).rejects.toBeTruthy();
    await deleteWord(right);
    expect(await counts(right)).toEqual([]);
    await expect(deleteWord(right)).rejects.toBeTruthy();
    const log = await adminLog(20);
    expect(log.some((a) => a.action === "word_rename" && a.target_id === wrong)).toBe(true);
    expect(log.some((a) => a.action === "word_delete" && a.target_id === right)).toBe(true);
    await signOut({ scope: "local" });
    // a deleted word can come back as new when someone uses it again
    await as(person);
    expect((await record(right, "search")).error).toBeNull();
    expect(await counts(right)).toEqual([expect.objectContaining({ uses: 1 })]);
    await signOut({ scope: "local" });
  });

  it("cleanup", async () => {
    await svcFetch(`/rest/v1/word_insights?word=like.e2e*`, { method: "DELETE" });
    await svcFetch(`/rest/v1/businesses?owner_id=eq.${person.id}`, { method: "DELETE" });
    await svcFetch(`/rest/v1/admins?phone=eq.${admin.phone}`, { method: "DELETE" });
    for (const u of [person, admin]) await svcFetch(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  });
});

describe("16. security review: what users may not do (2026-11-13)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  type Temp = { id: string; phone: string; password: string; biz: string };
  const users: Temp[] = [];
  const as = async (u: { phone: string; password: string }) => { expect((await supabase.auth.signInWithPassword({ phone: u.phone, password: u.password })).error).toBeNull(); };
  const tempUser = async (name: string): Promise<Temp> => {
    const phone = `9179${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    await sleep(5);
    const u = { id: ((await r.json()) as { id: string }).id, phone, password, biz: "" };
    await as(u);
    const food = (await listCategories()).find((c) => c.slug === "food_restaurant")!.id;
    u.biz = (await createBusiness({ name: `${name} [e2e ${RUN}]`, category_id: food, location: USER_A.loc }));
    users.push(u);
    return u;
  };
  const supplierType = async () => (await supabase.from("post_types").select("id").eq("slug", "need_supplier").single()).data!.id as string;
  let a: Temp; let b: Temp;

  it("a phone number cannot be taken with a password and no OTP; there is no e-mail sign-up", async () => {
    await signOut({ scope: "local" });
    const phone = await supabase.auth.signUp({ phone: `9180${String(Date.now()).slice(-8)}`, password: `E2e-${RUN}-x` });
    expect(phone.data.session).toBeNull(); // the number must be confirmed by OTP first
    const email = await supabase.auth.signUp({ email: `e2e-${RUN}@example.com`, password: `E2e-${RUN}-x` });
    expect(email.data.session).toBeNull();
  });

  it("chat: nobody can rewrite a message or its sender; only the receiver marks it read", async () => {
    a = await tempUser("Sec A"); b = await tempUser("Sec B");
    await as(a);
    const conv = await openConversation(a.biz, b.biz);
    const msg = await sendMessage(conv.id, a.biz, "original text");
    expect((await supabase.from("messages").update({ body: "forged", sender_business_id: b.biz } as never).eq("id", msg.id).select("id")).error).not.toBeNull();
    const ownRead = await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id).select("id");
    expect(ownRead.data ?? []).toHaveLength(0); // the sender cannot mark its own message read
    await as(b);
    expect((await supabase.from("messages").update({ body: "forged" } as never).eq("id", msg.id).select("id")).error).not.toBeNull();
    await markConversationRead(conv.id, b.biz);
    const row = ((await (await svcFetch(`/rest/v1/messages?id=eq.${msg.id}&select=body,sender_business_id,read_at`)).json()) as { body: string; sender_business_id: string; read_at: string | null }[])[0]!;
    expect(row).toMatchObject({ body: "original text", sender_business_id: a.biz });
    expect(row.read_at).not.toBeNull();
  });

  it("a new profile or post cannot claim trust or time it did not earn; a deleted post stays deleted", async () => {
    await as(a);
    const food = (await listCategories()).find((c) => c.slug === "food_restaurant")!.id;
    const ins = await supabase.from("businesses").insert({ owner_id: a.id, name: `Fake [e2e ${RUN}]`, category_id: food, city: "Noida",
      location: "POINT(77.3260 28.5708)", member_since: "2015-01-01T00:00:00Z", response_rate: 100, response_sample: 50 } as never).select("id,member_since,response_rate,response_sample").single();
    expect(ins.error).toBeNull();
    const biz = ins.data as unknown as { member_since: string; response_rate: number; response_sample: number };
    expect(biz).toMatchObject({ response_rate: 0, response_sample: 0 });
    expect(Date.parse(biz.member_since)).toBeGreaterThan(Date.now() - 120_000);
    const post = await supabase.from("opportunity_posts").insert({ business_id: a.biz, post_type_id: await supplierType(), title: `Sec [e2e ${RUN}]`, basic: {}, advanced: {},
      location: "POINT(77.3260 28.5708)", city: "Noida", created_at: "2099-01-01T00:00:00Z", expires_at: "2099-01-01T00:00:00Z" } as never).select("id,created_at,expires_at").single();
    expect(post.error).toBeNull();
    const p = post.data as unknown as { id: string; created_at: string; expires_at: string };
    expect(Date.parse(p.created_at)).toBeLessThan(Date.now() + 120_000);
    expect(Date.parse(p.expires_at)).toBeLessThanOrEqual(Date.now() + 31 * 86_400_000);
    await deletePost(p.id);
    expect((await supabase.from("opportunity_posts").update({ deleted_at: null } as never).eq("id", p.id).select("id")).error).not.toBeNull();
  });

  it("pictures must be the profile's own uploads; a person changes only their name and language", async () => {
    await as(a);
    await expect(updateBusiness(a.biz, { logo_url: "https://attacker.example/pixel.png" })).rejects.toBeTruthy();
    await expect(addBusinessMedia(a.biz, "https://attacker.example/x.jpg", "photo" as never)).rejects.toBeTruthy();
    expect((await supabase.from("users").update({ phone: "919999900000" } as never).eq("id", a.id)).error).not.toBeNull();
    expect((await supabase.from("users").update({ name: "Sec A" }).eq("id", a.id)).error).toBeNull();
  });

  it("a reply gets the server's time and only its own chat", async () => {
    await as(a);
    const postId = await createPost({ business_id: a.biz, post_type_id: await supplierType(), title: `Sec reply [e2e ${RUN}]`, description: null, basic: { deal: "pay" }, advanced: {}, location: USER_A.loc, deal_type: "pay" } as never);
    const foreign = await openConversation(a.biz, b.biz);
    const c = await tempUser("Sec C");
    await as(c);
    const r = await supabase.from("post_responses").insert({ post_id: postId, business_id: c.biz, response_type: "interested", conversation_id: foreign.id,
      replied_at: "2020-01-01T00:00:00Z", created_at: "2020-01-01T00:00:00Z" } as never).select("conversation_id,replied_at,created_at").single();
    expect(r.error).toBeNull();
    const row = r.data as unknown as { conversation_id: string | null; replied_at: string | null; created_at: string };
    expect(row).toMatchObject({ conversation_id: null, replied_at: null });
    expect(Date.parse(row.created_at)).toBeGreaterThan(Date.now() - 120_000);
  });

  it("the AI limit is kept by the server: 20 an hour, and users cannot reset it", async () => {
    await as(b);
    const slots: (number | null)[] = [];
    for (let i = 0; i < 21; i++) slots.push((await supabase.rpc("reserve_ai_call" as never)).data as unknown as number | null);
    expect(slots.slice(0, 20).every((s) => s != null)).toBe(true);
    expect(slots[20]).toBeNull();
    await supabase.from("ai_calls" as never).delete().eq("user_id", b.id);
    expect((await supabase.from("ai_calls" as never).insert({ user_id: b.id } as never)).error).not.toBeNull();
    expect((await supabase.rpc("reserve_ai_call" as never)).data).toBeNull(); // still used up
  });

  it("one phone's notifications go to the last person who logged in on it", async () => {
    const token = `ExponentPushToken[e2e-${RUN}]`;
    await as(a); await savePushToken(a.id, token, "android");
    await as(b); await savePushToken(b.id, token, "android");
    const rows = (await (await svcFetch(`/rest/v1/push_tokens?expo_token=eq.${encodeURIComponent(token)}&select=user_id`)).json()) as { user_id: string }[];
    expect(rows.map((r) => r.user_id)).toEqual([b.id]);
    await removePushToken(b.id, token);
  });

  it("the expire-posts job cannot be started with the public key", async () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const r = await fetch(`${supabaseUrl}/functions/v1/expire-posts`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}` } });
    expect(r.status).not.toBe(200);
  });

  it("cleanup", async () => {
    await signOut({ scope: "local" });
    // everything that points to these businesses first (chats, replies, reports, documents), then the businesses
    for (const u of users) {
      const ids = ((await (await svcFetch(`/rest/v1/businesses?owner_id=eq.${u.id}&select=id`)).json()) as { id: string }[]).map((b) => b.id);
      for (const id of ids) {
        const convs = ((await (await svcFetch(`/rest/v1/conversations?or=(business_a.eq.${id},business_b.eq.${id})&select=id`)).json()) as { id: string }[]).map((c) => c.id);
        for (const c of convs) await svcFetch(`/rest/v1/messages?conversation_id=eq.${c}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/conversations?or=(business_a.eq.${id},business_b.eq.${id})`, { method: "DELETE" });
        await svcFetch(`/rest/v1/post_responses?business_id=eq.${id}`, { method: "DELETE" });
        const posts = ((await (await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${id}&select=id`)).json()) as { id: string }[]).map((p) => p.id);
        for (const p of posts) await svcFetch(`/rest/v1/post_responses?post_id=eq.${p}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/reports?reporter_business_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/reports?target_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/business_verifications?business_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${id}`, { method: "DELETE" });
      }
      await svcFetch(`/rest/v1/ai_calls?user_id=eq.${u.id}`, { method: "DELETE" });
      await svcFetch(`/rest/v1/businesses?owner_id=eq.${u.id}`, { method: "DELETE" });
      await svcFetch(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
    }
  });
});

describe("17. privacy: places to about 1 km, text limits, full erasure (2026-11-13)", () => {
  const svc = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svcFetch = (path: string, init: RequestInit = {}) => fetch(`${supabaseUrl}${path}`, {
    ...init, headers: { apikey: svc(), Authorization: `Bearer ${svc()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  type Temp = { id: string; phone: string; password: string; biz: string };
  const users: Temp[] = [];
  const as = async (u: { phone: string; password: string }) => { expect((await supabase.auth.signInWithPassword({ phone: u.phone, password: u.password })).error).toBeNull(); };
  const precise = { ...USER_A.loc, lat: 28.570834, lng: 77.325971 };
  const tempUser = async (name: string): Promise<Temp> => {
    const phone = `9181${String(Date.now()).slice(-8)}`; const password = `E2e-${RUN}-pass`;
    const r = await svcFetch("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ phone, password, phone_confirm: true }) });
    expect(r.status).toBe(200);
    await sleep(5);
    const u = { id: ((await r.json()) as { id: string }).id, phone, password, biz: "" };
    await as(u);
    const food = (await listCategories()).find((c) => c.slug === "food_restaurant")!.id;
    u.biz = await createBusiness({ name: `${name} [e2e ${RUN}]`, category_id: food, location: precise });
    users.push(u);
    return u;
  };
  const point = async (table: string, id: string) => {
    const row = ((await (await svcFetch(`/rest/v1/${table}?id=eq.${id}&select=location`)).json()) as { location: unknown }[])[0]!;
    return parsePoint(row.location);
  };
  const supplierType = async () => (await supabase.from("post_types").select("id").eq("slug", "need_supplier").single()).data!.id as string;
  let a: Temp; let b: Temp;

  it("a saved place is kept to about 1 km, even when someone sends the exact spot past the app", async () => {
    a = await tempUser("Privacy A");
    expect(await point("businesses", a.biz)).toMatchObject({ lat: 28.57, lng: 77.33 });
    await supabase.from("businesses").update({ location: "SRID=4326;POINT(77.325971 28.570834)" } as never).eq("id", a.biz);
    expect(await point("businesses", a.biz)).toMatchObject({ lat: 28.57, lng: 77.33 });
    const postId = await createPost({ business_id: a.biz, post_type_id: await supplierType(), title: `Privacy [e2e ${RUN}]`, description: null, basic: { deal: "pay" }, advanced: {}, location: precise, deal_type: "pay" } as never);
    expect(await point("opportunity_posts", postId)).toMatchObject({ lat: 28.57, lng: 77.33 });
  });

  it("text longer than its limit is refused by the server", async () => {
    await as(a);
    const type = await supplierType();
    const long = (n: number) => "x".repeat(n);
    expect((await supabase.from("opportunity_posts").insert({ business_id: a.biz, post_type_id: type, title: long(TEXT_LIMITS.postTitle + 1), basic: {}, advanced: {}, location: "POINT(77.33 28.57)", city: "Noida" } as never)).error).not.toBeNull();
    expect((await supabase.from("businesses").update({ name: long(TEXT_LIMITS.businessName + 1) }).eq("id", a.biz)).error).not.toBeNull();
    expect((await supabase.from("businesses").update({ description: long(TEXT_LIMITS.businessDescription + 1) }).eq("id", a.biz)).error).not.toBeNull();
    b = await tempUser("Privacy B");
    await as(a);
    const conv = await openConversation(a.biz, b.biz);
    await expect(sendMessage(conv.id, a.biz, long(TEXT_LIMITS.message + 1))).rejects.toBeTruthy();
    expect((await sendMessage(conv.id, a.biz, long(TEXT_LIMITS.message))).id).toBeTruthy(); // exactly the limit is fine
  });

  it("erasing an account removes what the person wrote to others and their documents; the others keep the chat", async () => {
    await as(b);
    const bPost = await createPost({ business_id: b.biz, post_type_id: await supplierType(), title: `Privacy B post [e2e ${RUN}]`, description: null, basic: { deal: "pay" }, advanced: {}, location: precise, deal_type: "pay" } as never);
    await as(a);
    const conv = await openConversation(a.biz, b.biz);
    const msg = await sendMessage(conv.id, a.biz, "my private words");
    await respondToPost(bPost, a.biz, "interested", "call me on 98xxxxxx");
    await report(a.biz, "business", b.biz, "spam" as never, "details about me");
    const path = `${a.biz}/doc-${Date.now()}.png`;
    expect((await supabase.storage.from("verification-docs").upload(path, base64ToBytes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), { contentType: "image/png" })).error).toBeNull();
    expect((await supabase.rpc("request_verification", { p_business_id: a.biz, p_doc_type: "gst", p_doc_number: "09ABCDE1234F1Z5", p_file_path: path })).error).toBeNull();
    await requestAccountDeletion();
    await signOut({ scope: "local" });
    await svcFetch(`/rest/v1/users?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ deletion_requested_at: new Date(Date.now() - 31 * 86_400_000).toISOString() }) });
    const erase = await svcFetch("/rest/v1/rpc/run_erase_deleted_accounts", { method: "POST", body: "{}" });
    expect(erase.status === 200 ? "ok" : await erase.text()).toBe("ok");
    const get = async <T,>(q: string) => (await (await svcFetch(q)).json()) as T[];
    expect((await get<{ body: string | null }>(`/rest/v1/messages?id=eq.${msg.id}&select=body`))[0]!.body).toBe("");
    expect((await get<{ message: string | null }>(`/rest/v1/post_responses?business_id=eq.${a.biz}&select=message`)).every((r) => r.message === null)).toBe(true);
    expect((await get<{ details: string | null }>(`/rest/v1/reports?reporter_business_id=eq.${a.biz}&select=details`)).every((r) => r.details === null)).toBe(true);
    expect(await get(`/rest/v1/business_verifications?business_id=eq.${a.biz}&select=id`)).toEqual([]);
    expect((await get<{ name: string }>(`/rest/v1/businesses?id=eq.${a.biz}&select=name`))[0]!.name).toBe("Deleted business");
    // the other side still has the conversation
    expect((await get(`/rest/v1/messages?conversation_id=eq.${conv.id}&select=id`)).length).toBeGreaterThan(0);
  });

  it("cleanup", async () => {
    await signOut({ scope: "local" });
    // everything that points to these businesses first (chats, replies, reports, documents), then the businesses
    for (const u of users) {
      const ids = ((await (await svcFetch(`/rest/v1/businesses?owner_id=eq.${u.id}&select=id`)).json()) as { id: string }[]).map((b) => b.id);
      for (const id of ids) {
        const convs = ((await (await svcFetch(`/rest/v1/conversations?or=(business_a.eq.${id},business_b.eq.${id})&select=id`)).json()) as { id: string }[]).map((c) => c.id);
        for (const c of convs) await svcFetch(`/rest/v1/messages?conversation_id=eq.${c}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/conversations?or=(business_a.eq.${id},business_b.eq.${id})`, { method: "DELETE" });
        await svcFetch(`/rest/v1/post_responses?business_id=eq.${id}`, { method: "DELETE" });
        const posts = ((await (await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${id}&select=id`)).json()) as { id: string }[]).map((p) => p.id);
        for (const p of posts) await svcFetch(`/rest/v1/post_responses?post_id=eq.${p}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/reports?reporter_business_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/reports?target_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/business_verifications?business_id=eq.${id}`, { method: "DELETE" });
        await svcFetch(`/rest/v1/opportunity_posts?business_id=eq.${id}`, { method: "DELETE" });
      }
      await svcFetch(`/rest/v1/ai_calls?user_id=eq.${u.id}`, { method: "DELETE" });
      await svcFetch(`/rest/v1/businesses?owner_id=eq.${u.id}`, { method: "DELETE" });
      await svcFetch(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
    }
  });
});
