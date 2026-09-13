import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

export interface BusinessSummary {
  id: string;
  name: string;
  category_id: string;
  category_slug: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  lat: number;
  lng: number;
  logo_url: string | null;
  completion_score: number;
  verification_status: string;
}

interface SessionState {
  session: Session | null;
  business: BusinessSummary | null;
  hydrated: boolean;
  setSession: (s: Session | null) => void;
  setBusiness: (b: BusinessSummary | null) => void;
  setHydrated: (v: boolean) => void;
}

export const useSession = create<SessionState>((set) => ({
  session: null,
  business: null,
  hydrated: false,
  setSession: (session) => set({ session }),
  setBusiness: (business) => set({ business }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
