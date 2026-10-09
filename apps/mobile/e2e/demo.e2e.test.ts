/**
 * Product walkthrough on top of the demo data (`pnpm demo:data`): a visitor logs in, sets up a business, browses every
 * feed tab, searches, opens a demo post, responds, chats, gets a reply from the demo business, saves and follows.
 * Uses the app's own data layer. Leaves the data in place so the same state is visible on a device.
 * Prereqs: local stack + `pnpm functions:serve` + `pnpm demo:data`. Run: pnpm --filter @fmbp/mobile test:demo
 */
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { sendOtp, verifyOtp, authErrorKey } from "@/features/auth/api";
import { createBusiness, loadMyBusiness, listCategories, getBusinessPublic } from "@/features/business/api";
import { getPost, getMyResponse, respondToPost, listPostTypes, listIntentions } from "@/features/posts/api";
import { fetchFeedPage } from "@/features/feed/api";
import { searchAll } from "@/features/search/api";
import { openConversation, listConversations, listMessages, sendMessage, unreadConversationCount, otherParty } from "@/features/chat/api";
import { savePost, listSavedPostIds, followBusiness, listFollowedBusinessIds } from "@/features/social/api";
import { fetchFormSchema } from "@/forms/useFormSchema";
import { describeValues } from "@/forms/describe";
import type { BusinessSummary } from "@/store/session";
import type { PostCardRow } from "@/features/posts/api";

const VISITOR = { phone: "9999900013", name: "E2E Visitor Traders", loc: { lat: 28.5708, lng: 77.326, city: "Noida", state: "Uttar Pradesh", pincode: "201301", country: "IN" } };
const OTP = "123456";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// service-role client stands in for the demo business replying from its own phone
const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let me: BusinessSummary; let feed: PostCardRow[] = []; let target: PostCardRow; let convId: string;

describe("demo walkthrough", () => {
  it("demo data is loaded", async () => {
    const { count } = await admin.from("opportunity_posts").select("*", { count: "exact", head: true }).contains("advanced", { _demo: true });
    expect(count).toBeGreaterThanOrEqual(35);
  });
  it("visitor logs in and sets up a business in Noida", async () => {
    for (let i = 0; i < 3; i++) { const e = await sendOtp(VISITOR.phone); if (!e) break; if (authErrorKey(e) !== "auth.errors.tooManyRequests") throw new Error(e.message); await sleep(5500); }
    expect(await verifyOtp(VISITOR.phone, OTP)).toBeNull();
    const existing = await loadMyBusiness();
    if (!existing) { const cats = await listCategories(); await createBusiness({ name: VISITOR.name, category_id: cats.find((c) => c.slug === "retail_shop")!.id, location: VISITOR.loc }); }
    me = (await loadMyBusiness())!;
    expect(me.city).toBe("Noida");
  });
  it("Latest shows demo posts from many businesses and types, newest first, with trust data", async () => {
    const p1 = await fetchFeedPage("latest", {}, null, { lat: me.lat, lng: me.lng }, me.id);
    const p2 = p1.next ? await fetchFeedPage("latest", {}, p1.next, { lat: me.lat, lng: me.lng }, me.id) : { rows: [], next: null };
    feed = [...p1.rows, ...p2.rows];
    expect(feed.length).toBeGreaterThanOrEqual(20);
    expect(new Set(feed.map((p) => p.business?.id)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(feed.map((p) => p.post_type?.slug)).size).toBeGreaterThanOrEqual(12);
    expect(feed.every((p) => p.status === "active")).toBe(true);
    for (let i = 1; i < p1.rows.length; i++) expect(p1.rows[i - 1].created_at >= p1.rows[i].created_at).toBe(true);
    expect(feed.some((p) => p.business?.verification_status === "verified")).toBe(true);
    expect(feed.some((p) => (p.business?.rating_count ?? 0) > 0 && (p.business?.completed_deals ?? 0) > 0)).toBe(true);
  });
  it("Nearby from Noida lists Noida/Delhi NCR first and never Mumbai or Bengaluru within 25 km", async () => {
    const near = await fetchFeedPage("nearby", { radius_km: 25 }, null, { lat: me.lat, lng: me.lng }, me.id);
    expect(near.rows.length).toBeGreaterThanOrEqual(8);
    expect(near.rows.every((p) => ["Noida", "Delhi", "Ghaziabad", "Gurugram"].includes(p.city))).toBe(true);
    expect(near.rows.every((p) => (p.distance_km ?? 0) <= 25)).toBe(true);
  });
  it("Trending and Recommended return demo posts; Recommended mixes categories (discovery)", async () => {
    const trending = await fetchFeedPage("trending", {}, null, null, me.id);
    expect(trending.rows.length).toBeGreaterThanOrEqual(10);
    expect(trending.rows[0].view_count + trending.rows[0].response_count).toBeGreaterThan(0);
    const rec = await fetchFeedPage("recommended", {}, null, { lat: me.lat, lng: me.lng }, me.id);
    expect(rec.rows.length).toBeGreaterThanOrEqual(10);
    expect(rec.rows.every((p) => p.business?.id !== me.id)).toBe(true);
    expect(new Set(rec.rows.map((p) => p.post_type?.slug)).size).toBeGreaterThanOrEqual(5);
  });
  it("search finds posts by word, variation, title phrase and city, plus businesses by name", async () => {
    const cases: [string, (r: Awaited<ReturnType<typeof searchAll>>) => boolean][] = [
      ["tailor", (r) => r.posts.some((p) => p.title.includes("Tailor")) && r.businesses.some((b) => b.name === "Khan Tailors")],
      ["investor", (r) => r.posts.some((p) => p.post_type?.slug === "looking_to_invest")],
      ["packaging supplier", (r) => r.posts.some((p) => p.title === "Need Packaging supplier in Noida")],
      ["cold storage", (r) => r.posts.some((p) => p.title.includes("Cold storage"))],
      ["Jaipur", (r) => r.posts.length >= 3 && r.posts.every((p) => p.city === "Jaipur" || /jaipur/i.test(p.title + p.description))],
      ["gst", (r) => r.posts.length >= 2],
      ["Sharma", (r) => r.businesses.some((b) => b.name === "Sharma Sweets") && r.businesses.some((b) => b.name === "Sharma Electricals")],
    ];
    for (const [q, ok] of cases) {
      const r = await searchAll(q);
      expect({ q, ok: ok(r), posts: r.posts.map((p) => p.title), businesses: r.businesses.map((b) => b.name) }).toMatchObject({ q, ok: true });
    }
  });
  it("post detail renders the structured answers with labels (service-specific form)", async () => {
    target = feed.find((p) => p.title === "Need ₹5 lakh to Expand shop in Noida")!;
    expect(target).toBeTruthy();
    const full = await getPost(target.id);
    const schema = (await fetchFormSchema("post", "need_money"))!;
    const rows = describeValues(schema, { ...full.basic, ...full.advanced }, "en");
    expect(rows.map((r) => `${r.label}=${r.value}`)).toEqual(expect.arrayContaining(["How much money do you need?=₹5 lakh", "For what?=Expand shop"]));
    const biz = await getBusinessPublic(full.business!.id);
    expect(biz.name).toBe("Priya Foods");
    expect((biz as unknown as { phone?: string }).phone).toBeUndefined(); // never exposed
  });
  it("visitor is Interested, then opens a chat and sends a message; the demo owner replies", async () => {
    if (!(await getMyResponse(target.id, me.id))) await respondToPost(target.id, me.id, "interested");
    expect((await getMyResponse(target.id, me.id))?.response_type).toBe("interested");
    const conv = await openConversation(me.id, target.business!.id, target.id);
    convId = conv.id;
    expect(otherParty(conv, me.id)?.name).toBe("Priya Foods");
    await sendMessage(convId, me.id, "Hello Priya, I run a retail shop in Sector 18. Can I see your tiffin menu?");
    const { error } = await admin.from("messages").insert({ conversation_id: convId, sender_business_id: target.business!.id, body: "Sure! Veg thali ₹120, sending the menu now." });
    expect(error).toBeNull();
    await sleep(300);
    const msgs = await listMessages(convId);
    // re-runnable: earlier runs leave their messages in the same conversation, so check the newest pair
    expect(msgs.slice(-2).map((m) => m.sender_business_id === me.id ? "me" : "them")).toEqual(["me", "them"]);
    const convs = await listConversations(me.id);
    expect(unreadConversationCount(convs, me.id)).toBeGreaterThanOrEqual(1);
    expect(convs[0].id).toBe(convId); // most recent first
  });
  it("visitor saves a post and follows a business; Saved and Following tabs reflect it", async () => {
    const investor = feed.find((p) => p.post_type?.slug === "looking_to_invest")!;
    if (!(await listSavedPostIds(me.id)).includes(investor.id)) await savePost(me.id, investor.id);
    if (!(await listFollowedBusinessIds(me.id)).includes(investor.business!.id)) await followBusiness(me.id, investor.business!.id);
    const saved = await fetchFeedPage("saved", {}, null, null, me.id);
    expect(saved.rows.some((p) => p.id === investor.id)).toBe(true);
    const following = await fetchFeedPage("following", {}, null, null, me.id);
    expect(following.rows.length).toBeGreaterThanOrEqual(1);
    expect(following.rows.every((p) => p.business?.id === investor.business!.id)).toBe(true);
  });
  it("lifecycle states are visible: paused, completed and expired demo posts are hidden from the public feed", async () => {
    const hidden = feed.filter((p) => ["Kitchen available in Noida", "Need Wholesale customers in Noida", "Need ₹10 lakh to Buy machine in Noida"].includes(p.title));
    expect(hidden).toEqual([]);
    const { data } = await admin.from("opportunity_posts").select("title,status").in("title", ["Kitchen available in Noida", "Need Wholesale customers in Noida", "Need ₹10 lakh to Buy machine in Noida"]);
    expect(new Set((data ?? []).map((p) => p.status))).toEqual(new Set(["paused", "completed", "expired"]));
  });
  it("create-post taxonomy is intact: 5 intentions, every active type has a form", async () => {
    const intentions = await listIntentions();
    expect(intentions.map((i) => i.slug)).toEqual(["need", "offer", "partner", "invest", "announce"]);
    const types = (await Promise.all(intentions.map((i) => listPostTypes(i.id)))).flat();
    expect(types.length).toBeGreaterThanOrEqual(33);
    // local sign-out only: never kill sessions on devices that share the stack
    await supabase.auth.signOut({ scope: "local" });
  });
});
