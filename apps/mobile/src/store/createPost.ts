import { create } from "zustand";
import type { FormValues, AiGenerateResponse } from "@fmbp/shared";

interface CreatePostState {
  intentionId: string | null;
  postType: { id: string; slug: string; name_en: string; name_hi: string } | null;
  values: FormValues;
  generated: AiGenerateResponse | null;
  title: string;
  description: string;
  setIntention: (id: string) => void;
  setPostType: (t: CreatePostState["postType"]) => void;
  setValues: (v: FormValues) => void;
  setGenerated: (g: AiGenerateResponse | null) => void;
  setTitle: (s: string) => void;
  setDescription: (s: string) => void;
  reset: () => void;
}

const initial = { intentionId: null, postType: null, values: {}, generated: null, title: "", description: "" };

export const useCreatePost = create<CreatePostState>((set) => ({
  ...initial,
  setIntention: (intentionId) => set({ intentionId, postType: null, values: {}, generated: null }),
  setPostType: (postType) => set({ postType, values: {}, generated: null }),
  setValues: (values) => set({ values }),
  setGenerated: (generated) => set({ generated, title: generated?.title ?? "", description: generated?.description ?? "" }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  reset: () => set(initial),
}));
