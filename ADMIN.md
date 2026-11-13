# FMBP Admin guide

What FMBP admins can do, how each job works, and what the business on the other side sees. Written so that anyone
on the team (not only developers) can run the admin side.

---

## 1. Logging in as an admin

Admins use the **same FMBP app** and the **same login** (mobile number + OTP) as everyone else.

1. Open FMBP → enter your mobile number → enter the OTP.
2. If the number is an admin, the app asks **"How do you want to continue?"**
   - **🏪 Normal user**: the normal app: your own business, posts, chats and deals.
   - **🛡️ Admin**: the admin area (dark header, its own tabs).
3. The app remembers your choice on this phone until you log out. Switch any time:
   - normal app → **Business** tab → **🛡️ Switch to admin**;
   - admin area → **More** → **🏪 Switch to normal user**.

Numbers that are not admins never see the question or the admin area.

### Test admin (local development only)

| Mobile number | OTP | How to enable |
|---|---|---|
| **9999900000** | **123456** | Once after every database reset, run `pnpm admin:local` (with local Supabase running) |

This number and OTP work **only on the local development setup** (`supabase/config.toml`). They do not exist in
production. Normal test users: **9999900001 to 9999900009** (same OTP 123456).

### The first admin in production

Production has no admins until you add one. Run this once in the Supabase dashboard → **SQL editor**. Use the real
mobile number: 91 followed by the 10 digits, no `+` or spaces.

```sql
insert into public.admins (phone, name, added_by) values ('91XXXXXXXXXX', 'Your name', 'setup');
```

After that, admins add other admins in the app (**More → Admins**).

---

## 2. The admin area at a glance

| Tab | What it is for |
|---|---|
| **Dashboard** | Today's numbers and what needs attention (open reports, documents to check). Tap a tile to go there. |
| **Reports** | Posts, businesses and messages that users reported. Decide: dismiss, remove the post, or suspend the business. |
| **Verify** | Business documents sent for the ✔ Verified badge. Approve or reject. |
| **Search** | Find any business (name, business phone or login number) or post (title), including suspended, deleted and hidden ones. |
| **More** | Broadcast, App settings, Admins, Admin log, switch to normal user, language, log out. |

The numbers on the **Reports** and **Verify** tabs show how many items are waiting. They refresh every minute.

---

## 3. Everything an admin can do

### 3.1 Dashboard
- **Needs attention**: open reports (and how many posts are hidden by reports), documents to check.
- **Activity**:
  - businesses (total, new today and this week) and live posts (new today and this week);
  - replies and messages this week, confirmed deals this month;
  - suspended businesses, and accounts in their 30-day deletion period.
- **Every tile opens what is behind it** (newest first, 50 at a time, scroll for more):

  | Tile | Opens |
  |---|---|
  | Open reports / Documents to check | the Reports / Verify tab |
  | Businesses | all businesses; filters: New this week, Suspended, Being deleted, Verified |
  | Live posts | posts; filters: Live, New this week, Hidden, Removed (Restore right there) |
  | Replies this week | who replied to which post |
  | Deals this month | confirmed deals (both businesses, date, counted or not) |
  | **Suspended** | the suspended businesses, each with **Lift suspension** right there |
  | Accounts being deleted | the accounts in their 30 days, with the erase date |
  | Messages this week | only a number, with a lock: chats are private and are never listed |

- Pull down to refresh.

### 3.2 Reports (moderation)
Users can report a **post**, a **business** or a **message**, with a reason: fraud, abusive, inappropriate, spam,
wrong information or other, plus an optional note.

- Each card is **one reported thing** with:
  - how many reports it has, the reasons, the reporters' notes, and the first and last report date;
  - the business behind it (tap to open it).
- **A post reported by 3 different businesses is hidden for everyone automatically** until an admin decides. A reporter
  never sees what they reported again.
- Tabs: **Open**, **Dismissed**, **Actioned** (history).

| Action | What happens | What the business sees |
|---|---|---|
| **Dismiss** | The reports close; a hidden post shows again for everyone. | Nothing. |
| **Remove post** (reason required) | The post is removed for everyone; the reports close as actioned. | Push: "Your post was removed: <title> — <reason>". |
| **Suspend** (reason required) | See 3.4. Works from a post, business or message report (suspends the business behind it). | The suspended screen with your reason. |

A removed post can be **restored** from the business page (3.4) if it was a mistake.

### 3.3 Verification (✔ Verified badge)
**Business side.**
- **Business tab → ✔ Get verified** → pick the document (GST, Udyam, FSSAI, shop / trade licence, IEC or other),
  optionally type its number, add a photo → **Send**.
- The photo is stored **privately**: only that business and FMBP admins can open it, through a link that expires
  after 5 minutes. It is never shown to other users.
- One request at a time. Status: **Being checked** → **Verified**, or **Not approved** (with your reason); after a
  rejection they can send a new document.

**Admin side** (**Verify** tab; oldest first):
1. Tap **📄 View document**.
2. Check:
   - the **business name** on the document matches the FMBP business name (or is clearly the same business);
   - the **city or address** matches;
   - the document is readable, complete and not edited;
   - for GST, the GSTIN looks valid (15 characters) and the legal or trade name matches. You can check it on the GST
     portal: "Search taxpayer".
3. **Approve**: the ✔ Verified badge appears on the profile and posts, the business ranks a little higher in search,
   and it gets a push.
4. **Reject** (reason required, e.g. "Photo not readable", "Name does not match"): they get a push with the reason
   and can try again.

**Take back ✔ Verified** (business page, reason required): when a document turns out to be wrong.

### 3.4 Businesses (business page)
Open from **Search**, a report or a document. It shows:
- name, category, city, joined date, status (active / suspended / deleted);
- the **owner's login number** (with 📞 **Call owner**) and the business phone;
- numbers: posts (live / total), reports against it and made by it, confirmed deals, rating, referrals;
- for an **individual** (a person, not a business): "Person (not a business)" and their trade instead of the category;
- every verification document (open each one);
- **every post**, including hidden and removed ones, with **Remove** / **Restore**;
- **admin history**: what admins did to this business, when, why and by whom.

**Several profiles:** one login can have up to 3 profiles (businesses and / or a person). The business page lists the
same person's **other profiles**, so you can check them too. A suspension covers **one profile**; while one is suspended,
that login cannot add new profiles. Suspend the others yourself when the problem is the person.

**Suspend a business** (reason required):
- The business, its posts and its offerings **disappear for everyone** at once (feed, search, business page).
- The owner can do nothing else. The app shows only "Account suspended", your reason, and a button to write to
  support. They cannot post, chat, respond or change their profile.
- They get a push: "Your FMBP account is suspended".
- Nothing is deleted. **Lift suspension** brings everything back as it was, and they get a push "Your account is
  active again".

Not the same as **deleting**: users delete their own account (Business tab → Delete account). It is hidden at once,
can be restored by logging in within 30 days, and is then erased automatically. Admins see these accounts counted on
the dashboard.

### 3.5 Broadcast (More → Broadcast)
- One push notification to **everyone**, or to the businesses of **one city**.
- **Where people see it:** as a push notification on the phone, and always in the app's **Notifications list** (the
  bell at the top right of Home), also when the push was missed, switched off or swiped away.
- **Links:** a web link in the message (`https://…`, `http://…` or `www.…`) is tappable when people open the broadcast
  in the app and opens in their browser. Only broadcast links are tappable: in other notifications, text that users
  typed stays plain (protection against phishing links). Keep links short, since the push shows at most 180 characters.
- Write the title and message in English (required) and in Hindi (optional). Each person gets it in their own app
  language; Hindi users get the English text if the Hindi is empty.
- Limits:
  - title up to 65 characters and message up to 180 (what a lock screen shows);
  - the app asks you to confirm before sending;
  - **one broadcast per 10 minutes** (protects against double taps).
- After sending, it shows how many people it went to.
- **Sent broadcasts** (under the form): every broadcast with its text, date, who sent it, to whom and how many people.
  A push **cannot be edited or taken back** once it is on people's phones (that is how Apple and Google work).
  To fix a mistake, send a short correction: **Use as template** fills the form with the old text.
- **Use rarely**: important news only (new features, outages, festival greetings). Too many pushes make people turn
  notifications off.

### 3.6 App settings (More → App settings)
Numbers the app uses that can change **without an app update**. Today:

| Setting | Meaning (default) |
|---|---|
| Deals in the city this month | Minimum before "✔ N deals done in <city> this month" shows on Opportunities (10) |
| Deals on all of FMBP this month | Minimum for "✔ N deals done on FMBP this month" (25) |
| New posts this week | Minimum for "🔥 N new opportunities…" (10) |
| Replies this week | Minimum for "💬 N replies to posts…" (10) |
| Businesses in the city | Minimum for "🏪 N businesses in <city>" (20) |

Small numbers are never shown, because "1 deal done" makes the app look empty. Only whole numbers from 0 to 100000
are accepted. Changes reach everyone within about 10 minutes.

### 3.7 Admins (More → Admins)
- See all admins: name, number, when they were added, removed ones.
- **Add admin**: mobile number and name. They log in with their own OTP and choose "Admin".
- **Remove**: immediate. They lose the admin area at the latest when they next open the app; their own business is
  not affected. You cannot remove yourself.
- **One admin level**: every admin can do everything, including adding other admins and broadcasting. Add only
  people you trust, and remove them the day they leave.

### 3.8 Admin log (More → Admin log)
Every admin action, newest first, **kept for good**: who (name and number), what, on what, the reason, and when.
Logged actions:
- reports dismissed, post removed / restored;
- suspended / suspension lifted;
- verified / document rejected / ✔ Verified taken back;
- broadcast sent, setting changed, admin added / removed.

Tap an entry about a business to open that business.

---

### 3.9 Words people use (Dashboard → Words people use)

What people search for and what they write under **Other**, counted by **city and state**, most used first. Use it to see
what is missing from the app, which region looks for what, and which flow and section each word came from. The dashboard
tile shows how many words wait for review.

- **Filters:** To review / Search word / New trade or category / Ignored, each with how many words it holds; All places /
  Home search / Profile / Posts; a state or city (the counts become that place's counts); **Only where nothing was found** (the real gaps).
- **Where it came from:** each word lists its places, e.g. *Post, form list: Need Skilled Person › Which skill?* or *Post, choosing the type: What do you need?*.
- **A word marked by mistake:** open the tab it moved to and mark it again, or *Back to review*.
- **Edit** corrects a spelling; if the new spelling is listed, the two become one and their counts are added. **Delete** removes a word and
  its counts (it asks first, cannot be undone, and the word returns as new if someone uses it again). Both are recorded in the Admin log.
- **Mark a word:** *Add as search word* (people mean something we already have), *New trade or category* (we are missing it),
  *Ignore*. **Marking does not change the app.** It is your to-do list and is recorded in the Admin log. A developer then
  adds the word: categories in `scripts/category-examples.mjs` (`pnpm categories:build`), the Need and Offer lists in
  `scripts/post-type-examples.mjs` (`pnpm post-types:build`), trades in `packages/shared/src/trades.ts`. Words are never added automatically, so spam cannot reach Search.
- **Share as CSV:** every status, with the status in its own column, under the region and flow filters: one row per word, source, section and place
  (the 2000 most used rows). It is shared as text for now.
- **What counts:** a finished search in Search (2 seconds after the typing stops), a search inside the business category,
  work and post-form lists, on What do you need? / What can you offer?, and words written under Other in a profile (work or business category) or post. Location and language lists do not count.
  Words have at least 2 letters, each counts once per person per day in each flow (Home search, Profile, Posts), and one person adds at most 50 a day.
- **Privacy:** counts only, with no name or number. Phone numbers (5 or more digits), e-mail addresses and links are never kept. The
  link between a person and a word lasts about a day. Words nobody kept (To review, Ignored) are deleted after 6 months. Someone may still type a
  person's name in Search; choose *Ignore* for those.

## 4. Daily routine (suggested)

1. **Reports**, every day: open reports first, then hidden posts (3+ reports). Aim to decide within 24 hours.
2. **Verify**, every working day: oldest first. Aim for 1–2 working days (the app tells businesses this).
3. **Dashboard**: look at new businesses and posts; a sudden jump can mean spam.
4. When in doubt: **remove the post** (it can be restored) rather than suspend. Suspend for fraud, abuse or repeated
   problems.

## 5. Rules for admins

- Always write a **clear, polite reason**. The business sees it ("Spam: the same post 5 times", not "bad").
- Never share a user's phone number, documents or messages outside FMBP.
- Call a business only about their FMBP account (e.g. a document question).
- Don't moderate your own business: switch to the normal app for that. You cannot suspend your own business.
- Everything you do is in the admin log.

---

## 6. How it is protected (for developers)

- **The server decides who is an admin.** `public.admins` (phone list); `fmbp.is_admin()` checks the signed-in
  user's phone. The "Continue as" choice is only the app's layout.
- **Admin functions.** Every admin function (`public.admin_*`, migration `20261105000012_admin.sql`):
  - starts with `fmbp.assert_admin()`, so non-admins get `not_admin`;
  - writes to `public.admin_actions`.
- **Tables admins read.** `admins` and `admin_actions` have row-level security on and no policies, so they are not
  readable through the API at all.
- **Suspension** (`businesses.suspended_at` / `suspension_reason`):
  - hides the business (`businesses: public read`) and its posts (`fmbp.business_visible`);
  - takes away every owner right (`fmbp.owns_business` / `my_business_ids` ignore suspended businesses).
- **Server-only columns.** Users cannot change these on their own business or post, even through the API (triggers
  `businesses_protected` / `posts_protected`, error `protected_column`):
  - business: verification status, deal counts, ratings, response rate, boosts, referrals, suspension, deletion;
  - post: hidden, boosted, views, responses, expiry.
- **Verification documents.** Private bucket `verification-docs/<business id>/…`. Upload: the owner only. Read: the
  owner or an admin, through 5-minute signed links. Requests go only through `request_verification`.
- **Broadcast.**
  - Push messages are sent in batches of 100 per request to Expo, with one in-app notification row per user.
  - Rate limit: one per 10 minutes.
  - For very large audiences (100k+), move sending to a queue or Edge Function.
- **Tests.** E2E section 10 (`apps/mobile/e2e/app.e2e.test.ts`) covers:
  - non-admins refused;
  - protected columns;
  - verification (private document, reject, approve);
  - reports (remove / restore), suspension (hidden, cannot post, cannot lift it themselves);
  - settings, admins and broadcast validation, and the log.

## 7. Not included yet (possible next steps)

- **A web admin dashboard** (desktop, bigger tables, CSV export) on the same server functions.
- **Admin levels** (e.g. a moderator who cannot broadcast or add admins), if the team grows.
- **Warnings** before suspension, and **temporary suspensions** that end by themselves.
- **Editing categories, post types and forms** from the app. Today they are files in the code (`supabase/forms`),
  changed by a developer.
- **Deal disputes** ("we never did this deal") and fake-rating review.
- **A notification inbox** in the app for broadcasts. Today it is the push only.
