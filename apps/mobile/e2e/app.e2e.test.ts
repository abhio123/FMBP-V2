/**
 * End-to-end walk through every FMBP feature against the LOCAL Supabase stack, using the app's own
 * data-layer modules (the same code the screens call). Two test users (A, B) play both sides.
 *
 * Prereqs: `pnpm db:start` and `pnpm functions:serve` running. Run with `pnpm --filter @fmbp/mobile test:e2e`.
 */
import { supabase, supabaseUrl } from "@/lib/supabase";
import { sendOtp, verifyOtp, signOut, authErrorKey } from "@/features/auth/api";
import { updateBusiness, uploadBusinessImage, getMyBusinessDetails, listBusinessMedia, addBusinessMedia, removeBusinessMedia } from "@/features/business/api";
import { createBusiness, loadMyBusiness, listCategories, parsePoint } from "@/features/business/api";
import { listIntentions, listPostTypes, generateCopy, createPost, getPost, listMyPosts, recordView, respondToPost, getMyResponse, listPostResponses, renewPost, setPostStatus, deletePost } from "@/features/posts/api";
import { fetchFeedPage } from "@/features/feed/api";
import { searchAll } from "@/features/search/api";
import { fetchFormSchema, fetchFormSchemaOrGeneric } from "@/forms/useFormSchema";
import { openConversation, listConversations, listMessages, sendMessage, markConversationRead, otherParty, unreadConversationCount } from "@/features/chat/api";
import { isBasicComplete, splitValues } from "@/forms/SchemaForm";
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
const money = { amount: 500000, purpose: "expand_shop", location: USER_A.loc };

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
  it("another user cannot write into my media folder or edit my business", async () => {
    // exercised from B's session in section 6
    expect(true).toBe(true);
  });
});

describe("3. taxonomy and form schemas", () => {
  it("lists intentions, post types and categories", async () => {
    const intentions = await listIntentions();
    // Surya's simplification: Need / Offer hold almost everything; only three extras stay top-level.
    expect(intentions.map((i) => i.slug)).toEqual(["need", "offer", "partner", "invest", "announce"]);
    const need = intentions.find((i) => i.slug === "need")!;
    const offer = intentions.find((i) => i.slug === "offer")!;
    const needTypes = (await listPostTypes(need.id)).map((p) => p.slug);
    const offerTypes = (await listPostTypes(offer.id)).map((p) => p.slug);
    expect(needTypes.length).toBeGreaterThan(15);
    expect(needTypes).toEqual(expect.arrayContaining(["need_money", "buy_product", "learn_skill"]));
    expect(needTypes).not.toContain("raise_money"); // duplicate of need_money, hidden
    expect(needTypes[needTypes.length - 1]).toBe("need_other"); // "Something else" stays last
    expect(offerTypes).toEqual(expect.arrayContaining(["offer_service", "sell_product", "sell_machine", "teach_skill"]));
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
    console.log(`${generic.length}/${types!.length} post types use the generic form:`, generic.join(", "));
    expect(await fetchFormSchema("post", "definitely_not_a_type")).toBeNull();
  });
  it("need_money schema validates basic completeness and promotes columns", async () => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    expect(isBasicComplete(schema, { amount: 500000 })).toBe(false);
    expect(isBasicComplete(schema, money)).toBe(true);
    const s = splitValues(schema, { ...money, funding_type: "loan" });
    expect(s.amount_min).toBe(500000);
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
    expect(gen.title).toContain("₹5 lakh");
    expect(gen.title).toContain("Noida");
    expect(["template", "ai"]).toContain(gen.source);
    postTitle = `${gen.title} [e2e ${RUN}]`;
  });
  it("ai-generate in Hindi renders Hindi labels", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_money", locale: "hi",
      basic: money, advanced: {}, business: { name: bizA.name, category: bizA.category_id, city: bizA.city },
    });
    expect(gen.title).toContain("लाख");
  });
  it("ai-generate uses the generic schema and type name for a type without its own form", async () => {
    const gen = await generateCopy({
      mode: "generate", target: "post", type_slug: "need_customer", locale: "en",
      basic: { timeline: "this_month", budget: 25000, location: USER_A.loc }, advanced: {}, business: { name: bizA.name, category: bizA.category_slug ?? "", city: bizA.city },
    });
    expect(gen.title).toBe("Need Customers in Noida");
    expect(gen.description).toContain("₹25,000");
  });
  it("ai-generate rejects a bad request and unknown type", async () => {
    await expect(generateCopy({ target: "post", type_slug: "nope_type", locale: "en", basic: {}, business: { name: "x", category: "y" } } as never)).rejects.toBeTruthy();
  });
  it("publishes the post and reads it back with the trust join", async () => {
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const { basic, advanced, amount_min, amount_max, location } = splitValues(schema, { ...money, funding_type: "loan" });
    postId = await createPost({
      business_id: bizA.id, post_type_id: (await supabase.from("post_types").select("id").eq("slug", "need_money").single()).data!.id,
      title: postTitle, description: "Looking for ₹5 lakh to expand shop in Noida.", basic, advanced, amount_min, amount_max, location: location!,
      tags: ["investment", "noida", "sweets"],
    });
    const p = await getPost(postId);
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
  it("trending feed contains the post", async () => {
    const page = await fetchFeedPage("trending", {}, null);
    expect(page.rows.some((r) => r.id === postId)).toBe(true);
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
    const byCity = await searchAll("Noida");
    expect(byCity.posts.some((p) => p.id === postId)).toBe(true);
    const biz = await searchAll(bizA.name.split(" ")[1] ?? bizA.name);
    expect(biz.businesses.some((b) => b.id === bizA.id)).toBe(true);
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
    await respondToPost(postId, bizB.id, "interested", "Let's talk", conv.id);
    expect((await getMyResponse(postId, bizB.id))?.conversation_id).toBe(conv.id);
    const m = await sendMessage(conv.id, bizB.id, "Hi, I can invest. When can we talk?");
    expect(m.sender_business_id).toBe(bizB.id);
    const mine = await listConversations(bizB.id);
    expect(mine.find((c) => c.id === conv.id)?.messages[0]?.body).toBe("Hi, I can invest. When can we talk?");
    await expect(openConversation(bizB.id, bizB.id, null)).rejects.toThrow(/yourself/);
    await sleep(200);
    expect((await getPost(postId)).response_count).toBe(1);
    expect((await getMyResponse(postId, bizB.id))?.response_type).toBe("interested");
    await expect(respondToPost(postId, bizB.id, "lets_talk")).rejects.toBeTruthy();
    // responder cannot read the owner's list of other responders? (owner-or-responder policy: sees only own)
    const seen = await listPostResponses(postId);
    expect(seen.map((r) => r.business?.id)).toEqual([bizB.id]);
  });
  it("B can save the post and follow A; saved feed returns it", async () => {
    expect((await supabase.from("saved_posts").upsert({ business_id: bizB.id, post_id: postId })).error).toBeNull();
    expect((await supabase.from("follows").upsert({ follower_business_id: bizB.id, followed_business_id: bizA.id })).error).toBeNull();
    const saved = await fetchFeedPage("saved", {}, null, null, bizB.id);
    expect(saved.rows.some((r) => r.id === postId)).toBe(true);
    const following = await fetchFeedPage("following", {}, null, null, bizB.id);
    expect(following.rows.some((r) => r.id === postId)).toBe(true);
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
  it("A sees the chat as unread, replies, and the reply marks the response as answered", async () => {
    const convs = await listConversations(bizA.id);
    const conv = convs.find((c) => c.post_id === postId)!;
    expect(conv).toBeTruthy();
    expect(otherParty(conv, bizA.id)?.name).toBe(bizB.name);
    expect(unreadConversationCount(convs, bizA.id)).toBeGreaterThanOrEqual(1);
    const before = await listMessages(conv.id);
    expect(before.map((x) => x.body)).toEqual(["Hi, I can invest. When can we talk?"]);
    await markConversationRead(conv.id, bizA.id);
    expect(unreadConversationCount(await listConversations(bizA.id), bizA.id)).toBe(0);
    await sendMessage(conv.id, bizA.id, "Tomorrow 11am works.");
    await sleep(200);
    const [r] = await listPostResponses(postId);
    expect(r.replied_at).toBeTruthy();
    expect((await listMessages(conv.id)).length).toBe(2);
    // a stranger cannot read this conversation (checked later as B? B is a participant) — verify RLS via anon key
    const anon = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conv.id}`, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } });
    expect(await anon.json()).toEqual([]);
  });
  it("owner can renew (30 more days) and pause/complete", async () => {
    await renewPost(postId);
    expect((await getPost(postId)).status).toBe("active");
    await setPostStatus(postId, "paused");
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
  it("cleanup: soft-delete the E2E post and sign out", async () => {
    await deletePost(postId);
    expect((await fetchFeedPage("latest", {}, null)).rows.some((r) => r.id === postId)).toBe(false);
    // conversations stay (post_id becomes null only on hard delete); the chat list still shows the partner
    expect((await listMyPosts(bizA.id)).some((p) => p.id === postId)).toBe(false);
    await signOut({ scope: "local" });
  });
});
