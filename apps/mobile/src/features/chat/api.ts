import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatBusiness = { id: string; name: string; logo_url: string | null; verification_status: string; city: string };
export type MessageRow = { id: string; conversation_id: string; sender_business_id: string; body: string | null; attachment_url: string | null; read_at: string | null; created_at: string };
export type ConversationRow = {
  id: string; post_id: string | null; last_message_at: string | null; created_at: string; business_a: string; business_b: string;
  a: ChatBusiness | null; b: ChatBusiness | null; post: { id: string; title: string } | null;
  messages: Pick<MessageRow, "id" | "body" | "created_at" | "sender_business_id" | "read_at">[];
  /** Messages from the other side not yet read by me (filled by listConversations). */
  unread_count?: number;
};

const CONVERSATION_SELECT = `
  id, post_id, last_message_at, created_at, business_a, business_b,
  a:businesses_public!business_a(id,name,logo_url,verification_status,city),
  b:businesses_public!business_b(id,name,logo_url,verification_status,city),
  post:opportunity_posts!post_id(id,title),
  messages(id,body,created_at,sender_business_id,read_at)
`;

/** The business on the other side of a conversation from `myBusinessId`. */
export const otherParty = (c: ConversationRow, myBusinessId: string) => (c.business_a === myBusinessId ? c.b : c.a);

/**
 * Find or create the 1:1 conversation between two businesses about a post (or a general one when postId is null).
 * Participants are stored in a canonical order so (A,B) and (B,A) map to the same row.
 */
export async function openConversation(myBusinessId: string, otherBusinessId: string, postId: string | null): Promise<ConversationRow> {
  if (myBusinessId === otherBusinessId) throw new Error("cannot chat with yourself");
  const [a, b] = [myBusinessId, otherBusinessId].sort();
  let q = supabase.from("conversations").select(CONVERSATION_SELECT).eq("business_a", a).eq("business_b", b);
  q = postId ? q.eq("post_id", postId) : q.is("post_id", null);
  const { data: existing, error } = await q.order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }).maybeSingle();
  if (error) throw error;
  if (existing) return existing as unknown as ConversationRow;
  const { data, error: insErr } = await supabase.from("conversations").insert({ business_a: a, business_b: b, post_id: postId }).select(CONVERSATION_SELECT).single();
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

export async function listMessages(conversationId: string, limit = 200): Promise<MessageRow[]> {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId)
    .order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  return data as MessageRow[];
}

export async function sendMessage(conversationId: string, myBusinessId: string, body: string): Promise<MessageRow> {
  const text = body.trim();
  if (!text) throw new Error("empty message");
  const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_business_id: myBusinessId, body: text }).select("*").single();
  if (error) throw error;
  return data as MessageRow;
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
