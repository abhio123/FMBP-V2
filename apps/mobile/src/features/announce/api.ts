import { supabase } from "@/lib/supabase";
import { getPostCards, type PostCardRow } from "@/features/posts/api";

export const ANNOUNCE_PAGE = 20;
export type AnnounceFilters = { q?: string; categoryId?: string | null };

/** Home → Announcements: businesses I follow first, then the newest; no location. 20 at a time. */
export async function fetchAnnouncements(f: AnnounceFilters, offset: number): Promise<PostCardRow[]> {
  const { data, error } = await supabase.rpc("feed_announcements", {
    p_q: f.q?.trim() || undefined, p_category: f.categoryId ?? undefined, p_limit: ANNOUNCE_PAGE, p_offset: offset,
  });
  if (error) throw error;
  return getPostCards((data ?? []).map((r) => r.id)); // in the order the server ranked them
}

/** An announcement post (news, opening, offer, event, new stock, price update): shown apart from Opportunities. */
export const isAnnouncement = (p: { post_type?: { slug?: string | null } | null }) => !!p.post_type?.slug?.startsWith("announce_");

let announceIds: Promise<string[]> | null = null;
/** The ids of the announcement post types (cached for the app's life; they do not change while it runs). */
export function announcementTypeIds(): Promise<string[]> {
  announceIds ??= Promise.resolve(
    supabase.from("post_types").select("id, intention:intentions!intention_id(slug)").then(({ data, error }) => {
      if (error) { announceIds = null; throw error; }
      return (data ?? []).filter((t) => (t.intention as { slug?: string } | null)?.slug === "announce").map((t) => t.id as string);
    }),
  );
  return announceIds;
}
