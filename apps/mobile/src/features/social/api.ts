import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";

/** Saved posts and follows: the light-weight interactions that feed the Saved / Following tabs. */
export async function listSavedPostIds(businessId: string): Promise<string[]> {
  const { data, error } = await supabase.from("saved_posts").select("post_id").eq("business_id", businessId);
  if (error) throw error;
  return data.map((r) => r.post_id);
}
export async function savePost(businessId: string, postId: string) {
  const { error } = await supabase.from("saved_posts").upsert({ business_id: businessId, post_id: postId });
  if (error) throw error;
}
export async function unsavePost(businessId: string, postId: string) {
  const { error } = await supabase.from("saved_posts").delete().eq("business_id", businessId).eq("post_id", postId);
  if (error) throw error;
}
export async function listFollowedBusinessIds(businessId: string): Promise<string[]> {
  const { data, error } = await supabase.from("follows").select("followed_business_id").eq("follower_business_id", businessId);
  if (error) throw error;
  return data.map((r) => r.followed_business_id);
}
export async function followBusiness(businessId: string, targetId: string) {
  const { error } = await supabase.from("follows").upsert({ follower_business_id: businessId, followed_business_id: targetId });
  if (error) throw error;
}
export async function unfollowBusiness(businessId: string, targetId: string) {
  const { error } = await supabase.from("follows").delete().eq("follower_business_id", businessId).eq("followed_business_id", targetId);
  if (error) throw error;
}

export function useSavedIds() {
  const business = useSession((s) => s.business);
  return useQuery({ queryKey: ["saved_ids", business?.id], enabled: !!business, staleTime: 60_000,
    queryFn: async () => new Set(await listSavedPostIds(business!.id)) });
}
export function useToggleSave() {
  const business = useSession((s) => s.business);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (!business) throw new Error("no business");
      if (saved) await unsavePost(business.id, postId); else await savePost(business.id, postId);
    },
    onMutate: async ({ postId, saved }) => {
      await qc.cancelQueries({ queryKey: ["saved_ids", business?.id] });
      qc.setQueryData<Set<string>>(["saved_ids", business?.id], (old) => { const n = new Set(old ?? []); if (saved) n.delete(postId); else n.add(postId); return n; });
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["saved_ids"] }); void qc.invalidateQueries({ queryKey: ["feed", "saved"] }); },
  });
}
export function useFollowingIds() {
  const business = useSession((s) => s.business);
  return useQuery({ queryKey: ["following_ids", business?.id], enabled: !!business, staleTime: 60_000,
    queryFn: async () => new Set(await listFollowedBusinessIds(business!.id)) });
}
export function useToggleFollow() {
  const business = useSession((s) => s.business);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, following }: { targetId: string; following: boolean }) => {
      if (!business) throw new Error("no business");
      if (following) await unfollowBusiness(business.id, targetId); else await followBusiness(business.id, targetId);
    },
    onMutate: async ({ targetId, following }) => {
      await qc.cancelQueries({ queryKey: ["following_ids", business?.id] });
      qc.setQueryData<Set<string>>(["following_ids", business?.id], (old) => { const n = new Set(old ?? []); if (following) n.delete(targetId); else n.add(targetId); return n; });
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["following_ids"] }); void qc.invalidateQueries({ queryKey: ["feed", "following"] }); },
  });
}
