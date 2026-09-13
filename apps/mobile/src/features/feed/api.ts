import { supabase } from "@/lib/supabase";
import { POST_CARD_SELECT, getPostCards, type PostCardRow } from "@/features/posts/api";
import type { FeedFilters, FeedTab } from "@fmbp/shared";

const PAGE = 20;
export type FeedPage = { rows: PostCardRow[]; next: string | null };
export type Viewer = { lat: number; lng: number } | null;

const hasLocation = (v: Viewer): v is { lat: number; lng: number } => !!v && (v.lat !== 0 || v.lng !== 0);

/**
 * One entry point for every feed tab.
 * - latest / trending / following / saved page by `created_at` cursor (following & saved by the post's created_at)
 * - nearby / recommended page by numeric offset (their RPCs rank server-side)
 * `viewer` is the viewer's location (nearby) and `businessId` the viewer's business (recommended/following/saved).
 */
export async function fetchFeedPage(
  tab: FeedTab, filters: FeedFilters, cursor: string | null, viewer: Viewer = null, businessId: string | null = null,
): Promise<FeedPage> {
  switch (tab) {
    case "nearby": {
      if (!hasLocation(viewer)) return { rows: [], next: null };
      const offset = cursor ? Number(cursor) : 0;
      const { data, error } = await supabase.rpc("feed_nearby", {
        p_lat: viewer.lat, p_lng: viewer.lng, p_radius_km: filters.radius_km ?? 25, p_limit: PAGE, p_offset: offset,
      });
      if (error) throw error;
      const dist = new Map(data.map((r) => [r.id, r.distance_km]));
      const rows = applyFilters(await getPostCards(data.map((r) => r.id)), filters).map((r) => ({ ...r, distance_km: dist.get(r.id) }));
      return { rows, next: data.length === PAGE ? String(offset + PAGE) : null };
    }
    case "recommended": {
      if (!businessId) return fetchFeedPage("latest", filters, cursor, viewer, businessId);
      const offset = cursor ? Number(cursor) : 0;
      const { data, error } = await supabase.rpc("feed_recommended", { p_business_id: businessId, p_limit: PAGE, p_offset: offset });
      if (error) throw error;
      const rows = applyFilters(await getPostCards(data.map((r) => r.id)), filters);
      return { rows, next: data.length === PAGE ? String(offset + PAGE) : null };
    }
    case "saved": {
      if (!businessId) return { rows: [], next: null };
      let q = supabase.from("saved_posts").select("post_id,created_at").eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(PAGE);
      if (cursor) q = q.lt("created_at", cursor);
      const { data, error } = await q;
      if (error) throw error;
      const rows = applyFilters(await getPostCards(data.map((r) => r.post_id)), filters).filter((r) => r.status === "active");
      return { rows, next: data.length === PAGE ? data[data.length - 1].created_at : null };
    }
    case "following": {
      if (!businessId) return { rows: [], next: null };
      const { data: f, error: fe } = await supabase.from("follows").select("followed_business_id").eq("follower_business_id", businessId);
      if (fe) throw fe;
      const ids = f.map((x) => x.followed_business_id);
      if (!ids.length) return { rows: [], next: null };
      return pagedPosts(withFilters(base().in("business_id", ids), filters), cursor);
    }
    case "trending": {
      const { data, error } = await withFilters(base(), filters)
        .gt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
        .order("response_count", { ascending: false }).order("view_count", { ascending: false }).order("created_at", { ascending: false })
        .limit(PAGE);
      if (error) throw error;
      return { rows: data as unknown as PostCardRow[], next: null };
    }
    default:
      return pagedPosts(withFilters(base(), filters), cursor);
  }
}

const base = () => supabase.from("opportunity_posts").select(POST_CARD_SELECT).eq("status", "active").is("deleted_at", null);

function withFilters<Q extends ReturnType<typeof base>>(q: Q, filters: FeedFilters): Q {
  if (filters.city) q = q.ilike("city", filters.city) as Q;
  if (filters.pincode) q = q.eq("pincode", filters.pincode) as Q;
  if (filters.state) q = q.ilike("state", filters.state) as Q;
  if (filters.category_id) q = q.eq("category_id", filters.category_id) as Q;
  if (filters.budget_min != null) q = q.gte("amount_max", filters.budget_min) as Q;
  if (filters.budget_max != null) q = q.lte("amount_min", filters.budget_max) as Q;
  return q;
}

async function pagedPosts(q: ReturnType<typeof base>, cursor: string | null): Promise<FeedPage> {
  let query = q.order("created_at", { ascending: false }).limit(PAGE);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data as unknown as PostCardRow[];
  return { rows, next: rows.length === PAGE ? rows[rows.length - 1].created_at : null };
}

/** RPC-backed tabs rank in SQL; apply the cheap column filters client-side on the page. */
function applyFilters(rows: PostCardRow[], f: FeedFilters): PostCardRow[] {
  return rows.filter((r) =>
    (!f.city || r.city.toLowerCase() === f.city.toLowerCase())
    && (!f.pincode || r.pincode === f.pincode)
    && (f.budget_min == null || (r.amount_max != null && Number(r.amount_max) >= f.budget_min))
    && (f.budget_max == null || (r.amount_min != null && Number(r.amount_min) <= f.budget_max))
    && (!f.verified_only || r.business?.verification_status === "verified"));
}
