import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatBusiness = { id: string; name: string; logo_url: string | null; verification_status: string; city: string };
/** `post_id`: the post this message is about (shown as a card where the topic changes). `reply_to_id`: quoted message. */
export type MessageRow = {
  id: string; conversation_id: string; sender_business_id: string; body: string | null; attachment_url: string | null; read_at: string | null; created_at: string;
  post_id: string | null; reply_to_id: string | null;
};
export type ConversationRow = {
  /** `post_id` / `post`: the post discussed most recently in this chat (shown under the name in the chat list). */
  id: string; post_id: string | null; last_message_at: string | null; created_at: string; business_a: string; business_b: string;
  a: ChatBusiness | null; b: ChatBusiness | null; post: { id: string; title: string } | null;
  messages: Pick<MessageRow, "id" | "body" | "attachment_url" | "created_at" | "sender_business_id" | "read_at">[];
  /** Messages from the other side not yet read by me (filled by listConversations). */
  unread_count?: number;
};

const CONVERSATION_SELECT = `
  id, post_id, last_message_at, created_at, business_a, business_b,
  a:businesses_public!business_a(id,name,logo_url,verification_status,city),
  b:businesses_public!business_b(id,name,logo_url,verification_status,city),
  post:opportunity_posts!post_id(id,title),
  messages(id,body,attachment_url,created_at,sender_business_id,read_at)
`;

/** The business on the other side of a conversation from `myBusinessId`. */
export const otherParty = (c: ConversationRow, myBusinessId: string) => (c.business_a === myBusinessId ? c.b : c.a);

/**
 * Find or create THE conversation between two businesses (one per pair, whatever the post). `postId` only seeds the
 * topic of a brand-new chat; which post a message is about is stored on the message (see sendMessage).
 * Participants are stored in canonical order (a < b) so (A,B) and (B,A) map to the same row.
 */
export async function openConversation(myBusinessId: string, otherBusinessId: string, postId: string | null = null): Promise<ConversationRow> {
  if (myBusinessId === otherBusinessId) throw new Error("cannot chat with yourself");
  const [a, b] = [myBusinessId, otherBusinessId].sort();
  const find = () => supabase.from("conversations").select(CONVERSATION_SELECT).eq("business_a", a).eq("business_b", b)
    .order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }).maybeSingle();
  const { data: existing, error } = await find();
  if (error) throw error;
  if (existing) return existing as unknown as ConversationRow;
  const { data, error: insErr } = await supabase.from("conversations").insert({ business_a: a, business_b: b, post_id: postId }).select(CONVERSATION_SELECT).single();
  if (insErr?.code === "23505") {
    // the other side opened the chat at the same moment: use theirs
    const again = await find();
    if (again.error || !again.data) throw again.error ?? insErr;
    return again.data as unknown as ConversationRow;
  }
  if (insErr) throw insErr;
  return data as unknown as ConversationRow;
}

export async function getConversation(id: string): Promise<ConversationRow> {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_SELECT).eq("id", id)
    .order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }).single();
  if (error) throw error;
  return data as unknown as ConversationRow;
}

/** All conversations for my business, most recently active first, each with its last message. */
export async function listConversations(myBusinessId: string): Promise<ConversationRow[]> {
  const [convs, unread] = await Promise.all([
    supabase.from("conversations").select(CONVERSATION_SELECT)
      .or(`business_a.eq.${myBusinessId},business_b.eq.${myBusinessId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" })
      .limit(100),
    // RLS already limits this to my conversations
    supabase.from("messages").select("conversation_id").neq("sender_business_id", myBusinessId).is("read_at", null).limit(1000),
  ]);
  if (convs.error) throw convs.error;
  if (unread.error) throw unread.error;
  const counts = new Map<string, number>();
  for (const m of unread.data ?? []) counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
  return (convs.data as unknown as ConversationRow[]).map((c) => ({ ...c, unread_count: counts.get(c.id) ?? 0 }));
}

/**
 * Messages are loaded a page at a time: a chat opens with the newest page, "Load earlier messages" adds the page before,
 * and every refresh (poll, reconnect, app back in front) fetches only the newest page again instead of the whole chat.
 */
export const MESSAGE_PAGE = 50;
/** The part of a chat loaded on this phone, oldest first. `hasOlder`: earlier messages exist on the server. */
export type MessageWindow = { rows: MessageRow[]; hasOlder: boolean };

/** Newest `limit` messages, or the `limit` before `before` (a created_at); oldest first. */
export async function listMessagePage(conversationId: string, opts: { before?: string; limit?: number } = {}): Promise<MessageWindow> {
  const limit = opts.limit ?? MESSAGE_PAGE;
  let q = supabase.from("messages").select("*").eq("conversation_id", conversationId);
  if (opts.before) q = q.lt("created_at", opts.before);
  // one extra row tells whether there is more before this page (index messages_conv_idx serves this)
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit + 1);
  if (error) throw error;
  const rows = data as MessageRow[];
  return { rows: rows.slice(0, limit).reverse(), hasOlder: rows.length > limit };
}

/** The newest messages of a chat, oldest first. */
export async function listMessages(conversationId: string, limit = MESSAGE_PAGE): Promise<MessageRow[]> {
  return (await listMessagePage(conversationId, { limit })).rows;
}

const byTime = (a: MessageRow, b: MessageRow) => Date.parse(a.created_at) - Date.parse(b.created_at);

/**
 * A refreshed newest page merged into what is loaded: earlier pages stay, newer or changed messages (e.g. read) are
 * taken from the page. If the page does not reach back to what is loaded (many messages arrived meanwhile), the page
 * replaces it, so the chat never shows a hole.
 */
export function mergeNewest(prev: MessageWindow | undefined, page: MessageWindow): MessageWindow {
  if (!prev?.rows.length) return page;
  const newestLoaded = prev.rows[prev.rows.length - 1];
  const oldestFetched = page.rows[0];
  if (page.hasOlder && oldestFetched && byTime(oldestFetched, newestLoaded) > 0) return page;
  const byId = new Map(prev.rows.map((m) => [m.id, m]));
  for (const m of page.rows) byId.set(m.id, m);
  return { rows: [...byId.values()].sort(byTime), hasOlder: prev.hasOlder && page.hasOlder };
}

/** An earlier page put in front of what is loaded. */
export function prependOlder(prev: MessageWindow | undefined, page: MessageWindow): MessageWindow {
  const loaded = prev?.rows ?? [];
  const ids = new Set(loaded.map((m) => m.id));
  return { rows: [...page.rows.filter((m) => !ids.has(m.id)), ...loaded], hasOlder: page.hasOlder };
}

/** A message just sent or received live, added at the end once. */
export function appendMessage(prev: MessageWindow | undefined, m: MessageRow): MessageWindow {
  const w = prev ?? { rows: [], hasOlder: false };
  return w.rows.some((x) => x.id === m.id) ? w : { ...w, rows: [...w.rows, m] };
}

/** `about`: post this message is about (a post of either business). `replyTo`: id of the message being quoted. */
export async function sendMessage(conversationId: string, myBusinessId: string, body: string, opts: { about?: string | null; replyTo?: string | null } = {}): Promise<MessageRow> {
  const text = body.trim();
  if (!text) throw new Error("empty message");
  const { data, error } = await supabase.from("messages")
    .insert({ conversation_id: conversationId, sender_business_id: myBusinessId, body: text, post_id: opts.about ?? null, reply_to_id: opts.replyTo ?? null })
    .select("*").single();
  if (error) throw error;
  return data as MessageRow;
}

export type PostRef = { id: string; title: string; status: string; deleted: boolean; icon: string | null };

/**
 * Title, status and icon of the posts referenced in a chat, including posts the other business has since paused,
 * completed or removed (row security would hide those; the server function returns only these fields, only to a
 * participant, and only for posts of the two businesses in the chat).
 */
export async function getPostRefs(conversationId: string, ids: string[]): Promise<Map<string, PostRef>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.rpc("chat_post_refs", { p_conversation: conversationId, p_post_ids: ids });
  if (error) throw error;
  return new Map((data as PostRef[]).map((p) => [p.id, p]));
}

/**
 * Which messages start a new topic: a post card goes above a message whose post differs from the post the thread was
 * last about. Returns message id → post id for those messages only.
 */
export function topicStarts(messages: Pick<MessageRow, "id" | "post_id">[]): Map<string, string> {
  const starts = new Map<string, string>();
  let current: string | null = null;
  for (const m of messages) {
    if (m.post_id && m.post_id !== current) { starts.set(m.id, m.post_id); current = m.post_id; }
  }
  return starts;
}

/** Mark everything the other side sent as read. */
export async function markConversationRead(conversationId: string, myBusinessId: string) {
  const { error } = await supabase.from("messages").update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId).neq("sender_business_id", myBusinessId).is("read_at", null);
  if (error) throw error;
}

export type SubscribeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

/**
 * Live inserts for one conversation. Returns an unsubscribe function. `onStatus` reports whether the realtime
 * socket actually connected; callers keep a polling fallback so chat works even when it does not.
 */
export function subscribeToMessages(conversationId: string, onInsert: (m: MessageRow) => void, onStatus?: (s: SubscribeStatus, err?: Error) => void): () => void {
  // Unique topic per subscription: reopening the screen before the previous channel is removed would otherwise
  // reuse the subscribed channel and throw "cannot add postgres_changes callbacks after subscribe()".
  const channel: RealtimeChannel = supabase
    .channel(`messages:${conversationId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as MessageRow))
    .subscribe((status, err) => {
      // CLOSED is the normal result of removeChannel(); only a failed connection is worth a dev warning
      if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && __DEV__) console.warn(`realtime ${conversationId}: ${status}`, err?.message);
      onStatus?.(status as SubscribeStatus, err);
    });
  return () => { void supabase.removeChannel(channel); };
}

/** True when the other side wrote after I last read (unread count when known, else the latest message). */
export function isConversationUnread(c: ConversationRow, myBusinessId: string): boolean {
  if (c.unread_count != null) return c.unread_count > 0;
  return c.messages.some((m) => m.sender_business_id !== myBusinessId && !m.read_at);
}

/** Number of conversations with unread messages for me (for the tab badge). */
export function unreadConversationCount(convs: ConversationRow[], myBusinessId: string): number {
  return convs.filter((c) => isConversationUnread(c, myBusinessId)).length;
}
