import { supabase } from "@/lib/supabase";
import { getPostCards, type PostCardRow } from "@/features/posts/api";

export type SearchResults = {
  posts: PostCardRow[];
  offerings: { id: string; title: string; description: string | null; city: string; business: { id: string; name: string; verification_status: string } | null; offering_type: { name_en: string; name_hi: string; icon: string | null } | null }[];
  businesses: { id: string; name: string; city: string; verification_status: string; logo_url: string | null; category: { name_en: string; name_hi: string; icon: string | null } | null }[];
};

export async function searchAll(q: string): Promise<SearchResults> {
  const { data, error } = await supabase.rpc("search_all", { p_q: q, p_limit: 10 });
  if (error) throw error;
  const rows = (data ?? []) as { entity: string; id: string; rank: number }[];
  const ids = (e: string) => rows.filter((r) => r.entity === e).map((r) => r.id);
  const order = (o: string[]) => (a: { id: string }, b: { id: string }) => o.indexOf(a.id) - o.indexOf(b.id);

  const [posts, offerings, businesses] = await Promise.all([
    getPostCards(ids("post")),
    (async () => {
      const o = ids("offering");
      if (!o.length) return [];
      const r = await supabase.from("business_offerings")
        .select("id,title,description,city,business:businesses_public!business_id(id,name,verification_status),offering_type:offering_types!offering_type_id(name_en,name_hi,icon)")
        .in("id", o);
      if (r.error) throw r.error;
      return (r.data as unknown as SearchResults["offerings"]).sort(order(o));
    })(),
    (async () => {
      const b = ids("business");
      if (!b.length) return [];
      const r = await supabase.from("businesses_public")
        .select("id,name,city,verification_status,logo_url,category:categories!category_id(name_en,name_hi,icon)")
        .in("id", b);
      if (r.error) throw r.error;
      return (r.data as unknown as SearchResults["businesses"]).sort(order(b));
    })(),
  ]);
  return { posts, offerings, businesses };
}
