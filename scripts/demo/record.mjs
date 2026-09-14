// Records the FMBP demo on the web build at phone size, pacing each scene to its narration.
import { chromium } from "playwright";
import fs from "fs";
const S = process.env.S, BASE = "http://127.0.0.1:8081", API = "http://127.0.0.1:54321";
const SVC = process.env.SVC;
const segs = JSON.parse(fs.readFileSync(`${S}/narration.json`));
const seg = Object.fromEntries(segs.map((s) => [s.id, s]));
const PAD = 1.2; // seconds of silence after each narration

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-IN",
  recordVideo: { dir: `${S}/video`, size: { width: 390, height: 844 } } });
const page = await ctx.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const timeline = [];
let sceneStart = 0, sceneMin = 0;
const scene = async (id) => {
  // wait out the previous narration before starting the next scene
  const wait = sceneMin - now(); if (wait > 0) await page.waitForTimeout(wait * 1000);
  sceneStart = now(); sceneMin = sceneStart + seg[id].duration + PAD;
  timeline.push({ id, start: sceneStart }); console.log(`scene ${id} @ ${sceneStart.toFixed(1)}s`);
};
const btn = (name) => page.getByRole("button", { name });
const pause = (ms) => page.waitForTimeout(ms);
const svc = async (path, init = {}) => { const r = await fetch(`${API}${path}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } }); return r.json(); };
const typeSlow = async (locator, text) => { await locator.click(); await locator.pressSequentially(text, { delay: 55 }); };

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel("Mobile number").waitFor();
  await scene("01-intro"); await pause(3500);
  await typeSlow(page.getByLabel("Mobile number"), "9999900003"); await pause(600);
  await btn("Send OTP").click();
  await page.getByLabel("Enter the 6-digit code").waitFor({ timeout: 20000 }); await pause(800);
  await typeSlow(page.getByLabel("Enter the 6-digit code"), "123456"); await pause(500);
  await btn("Verify").click();
  await page.getByText("Tell us about your business").waitFor({ timeout: 30000 });

  await scene("02-onboarding"); await pause(1500);
  await typeSlow(page.getByPlaceholder("e.g. Sharma Sweets"), "Sharma Sweets"); await pause(500);
  await btn("What kind of business?").click(); await pause(1200);
  await page.getByText("Food", { exact: false }).first().click(); await pause(700);
  await btn("Choose city").click(); await pause(1200);
  await page.getByText("Noida", { exact: true }).click(); await pause(900);
  await btn("Create my business").click();
  await page.getByText("Opportunities").first().waitFor({ timeout: 30000 });

  await scene("03-feed"); await pause(2500);
  await page.mouse.wheel(0, 500); await pause(1800); await page.mouse.wheel(0, -500); await pause(800);
  await btn("Nearby").click(); await pause(2600);
  await btn("For you").click(); await pause(2600);
  await btn("Trending").click(); await pause(2200);
  await btn("Latest").click(); await pause(1500);

  await scene("04-post");
  await page.getByText("expand restaurant", { exact: false }).first().click(); await pause(4500);
  await btn("💬 Let's talk").click();
  await page.getByLabel("Type a message").waitFor({ timeout: 20000 });

  await scene("05-chat"); await pause(1200);
  await typeSlow(page.getByLabel("Type a message"), "Hello Ravi, I run a sweet shop nearby and can invest. When can we talk?");
  await btn("Send").click(); await pause(1800);
  // Ravi replies (inserted as Ravi Restaurant with the service role) — arrives over realtime
  const [ravi] = await svc(`/rest/v1/businesses?name=eq.Ravi%20Restaurant&select=id`);
  const [me] = await svc(`/rest/v1/businesses?name=eq.Sharma%20Sweets&select=id`);
  const [conv] = await svc(`/rest/v1/conversations?select=id&or=(and(business_a.eq.${ravi.id},business_b.eq.${me.id}),and(business_a.eq.${me.id},business_b.eq.${ravi.id}))&order=created_at.desc&limit=1`);
  await svc(`/rest/v1/messages`, { method: "POST", body: JSON.stringify({ conversation_id: conv.id, sender_business_id: ravi.id, body: "Namaste! Yes, tomorrow at 11 am at the restaurant works. I will share the numbers." }) });
  // should arrive over realtime; if the web socket is slow, re-open the chat so the reply is on screen
  const arrived = await page.getByText("Namaste!", { exact: false }).waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
  console.log("realtime reply arrived:", arrived);
  if (!arrived) { await page.goBack(); await pause(500); await btn("Open chat").click(); await page.getByText("Namaste!", { exact: false }).waitFor({ timeout: 10000 }).catch(() => {}); }
  await pause(3000);

  await scene("06-chats");
  await page.goBack(); await pause(800); await page.goBack(); await pause(800);
  await page.getByRole("tab", { name: "Chats" }).or(page.getByText("Chats", { exact: true })).first().click(); await pause(2500);

  await scene("07-create"); await pause(800);
  await page.getByText("Post", { exact: true }).first().click();
  await page.getByText("What do you want to do?").waitFor({ timeout: 20000 }); await pause(3800);
  await page.getByText("Need Something").click();
  await page.getByPlaceholder("Type to find an option…").waitFor({ timeout: 20000 }); await pause(2200);
  await typeSlow(page.getByPlaceholder("Type to find an option…"), "custom"); await pause(1500);
  await page.getByText("Need Customers?").click();
  await page.getByText("A few quick details").waitFor({ timeout: 20000 });

  await scene("08-form"); await pause(1500);
  await btn("This month").click(); await pause(1000);
  await btn("₹25,000").click(); await pause(1200);
  await btn("▾ More details (optional)").click(); await pause(1800);
  await btn("▴ Hide details").click(); await pause(600);
  await btn("Next").click();
  await page.getByText("Here's your post").waitFor({ timeout: 30000 });

  await scene("09-review"); await pause(4000);
  await btn("Publish").click();
  await page.getByText("Your post is live!").waitFor({ timeout: 30000 });

  await scene("10-live"); await pause(3500);
  // in-app navigation back to the tabs (the post page offers "My posts" to its owner)
  await btn("Back to feed").click();
  await page.getByText("Search", { exact: true }).first().waitFor({ timeout: 8000 }).catch(() => page.goto(`${BASE}/search`));
  await pause(800);

  await scene("11-search");
  await page.getByText("Search", { exact: true }).first().click(); await pause(800);
  await typeSlow(page.getByPlaceholder("Search opportunities, businesses…"), "Noida"); await pause(3000);

  await scene("12-profile");
  await page.getByText("My Business", { exact: true }).first().click(); await pause(2200);
  await btn("Edit").click();
  await page.getByPlaceholder("e.g. Family-run sweet shop since 1998, bulk orders for weddings and offices.").waitFor({ timeout: 20000 }); await pause(800);
  await typeSlow(page.getByPlaceholder("e.g. Family-run sweet shop since 1998, bulk orders for weddings and offices."), "Family-run sweet shop in Noida since 1998. Bulk orders for weddings and offices."); await pause(500);
  await btn("Use my login number").click(); await pause(900);
  await btn("Same as phone").click(); await pause(900);
  await btn("Save").click();
  await page.getByText("Profile", { exact: false }).first().waitFor({ timeout: 20000 }); await pause(2000);

  await scene("13-hindi");
  await page.getByText("Language: English").click(); await pause(1500);
  await page.getByText("✨").first().click({ force: true }); await pause(2500);

  await scene("14-outro"); await pause(1000);
  const wait = sceneMin - now(); if (wait > 0) await pause(wait * 1000);
} catch (e) {
  console.log("FAILED:", e.message.split("\n")[0]);
  await page.screenshot({ path: `${S}/shots/record-failure.png` });
}
timeline.push({ id: "end", start: now() });
fs.writeFileSync(`${S}/timeline.json`, JSON.stringify(timeline, null, 1));
const video = page.video();
await ctx.close();
const path = await video.path();
fs.renameSync(path, `${S}/video/demo-raw.webm`);
await browser.close();
console.log("video saved", `${S}/video/demo-raw.webm`, "length", now().toFixed(1) + "s");
