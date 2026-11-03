import { useState } from "react";
import { useRouter } from "expo-router";
import { useCreatePost } from "@/store/createPost";
import { loadPostForEdit } from "./api";

/**
 * Open a published post in the Post flow, at the form step, with all its answers filled in. The user changes what
 * they need, checks the preview and taps "Save changes" (the post keeps its responses, views and expiry date).
 */
export function useEditPost() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const edit = async (postId: string) => {
    setLoadingId(postId); setError(null);
    try {
      useCreatePost.getState().startEdit(await loadPostForEdit(postId));
      router.push("/create/details");
    } catch (e) { setError((e as Error).message); } finally { setLoadingId(null); }
  };
  return { edit, loadingId, error };
}
