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
  /** Set when FMBP suspended the business: the app shows only the reason (account/suspended). */
  suspended_at: string | null;
  suspension_reason: string | null;
  /** "business", or "individual" (a person: own name, a trade, no business; see migration 20261105000015). */
  kind: ProfileKind;
  trade: string | null;
  trade_other: string | null;
}

export type ProfileKind = "business" | "individual";

/** "user" = the normal app; "admin" = the admin area (only for numbers listed as admins, chosen after login). */
export type AppMode = "user" | "admin";

interface SessionState {
  session: Session | null;
  business: BusinessSummary | null;
  /** True once we know whether the signed-in user has a business (avoids flashing onboarding prompts). */
  businessLoaded: boolean;
  hydrated: boolean;
  /** Set while the account is in its 30-day deletion grace period: the app shows "Restore my account" first. */
  deletionRequestedAt: string | null;
  setDeletionRequestedAt: (v: string | null) => void;
  /** Is this number an admin (checked on the server after login)? null = not known yet. */
  isAdmin: boolean | null;
  /** Which part of the app this admin chose; always "user" for everyone else. null = not chosen yet. */
  mode: AppMode | null;
  setAdmin: (isAdmin: boolean | null, mode: AppMode | null) => void;
  setMode: (mode: AppMode) => void;
  setSession: (s: Session | null) => void;
  setBusiness: (b: BusinessSummary | null) => void;
  setHydrated: (v: boolean) => void;
}

export const useSession = create<SessionState>((set) => ({
  session: null,
  business: null,
  businessLoaded: false,
  hydrated: false,
  deletionRequestedAt: null,
  isAdmin: null,
  mode: null,
  setDeletionRequestedAt: (deletionRequestedAt) => set({ deletionRequestedAt }),
  setAdmin: (isAdmin, mode) => set({ isAdmin, mode }),
  setMode: (mode) => set({ mode }),
  setSession: (session) => set((s) => session
    ? { session }
    : { session, businessLoaded: false, isAdmin: null, mode: null }),
  setBusiness: (business) => set({ business, businessLoaded: true }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
