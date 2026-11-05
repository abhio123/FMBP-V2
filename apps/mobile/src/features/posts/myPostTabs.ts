/** Groups of my own posts (My posts screen, My Business summary). Expired posts stay renewable from the post page. */
export type MyPostGroup = "live" | "expired" | "completed";
export const MY_POST_GROUPS: MyPostGroup[] = ["live", "expired", "completed"];

/** Live = active + paused, Expired, Completed = completed + archived. */
export const myPostGroup = (status: string): MyPostGroup =>
  status === "active" || status === "paused" ? "live" : status === "expired" ? "expired" : "completed";

/** How many of my posts are in each group. */
export function countMyPosts(posts: { status: string }[]): Record<MyPostGroup, number> {
  const out: Record<MyPostGroup, number> = { live: 0, expired: 0, completed: 0 };
  for (const p of posts) out[myPostGroup(p.status)]++;
  return out;
}
