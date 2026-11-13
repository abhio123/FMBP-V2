import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConversations, unreadConversationCount } from "@/features/chat/api";
import { useSession, type BusinessSummary } from "@/store/session";
import { listMyBusinesses, setActiveProfile } from "./api";

/** The server allows this many live profiles per login (migration 20261106000003). */
export const MAX_PROFILES = 3;

/**
 * My profiles and switching between them. Switching resets every cached list: posts, chats, deals and recommendations
 * all belong to the profile in use.
 */
export function useProfiles() {
  const qc = useQueryClient();
  const userId = useSession((s) => s.session?.user.id);
  const business = useSession((s) => s.business);
  const setBusiness = useSession((s) => s.setBusiness);
  const query = useQuery({ queryKey: ["my_profiles", userId], enabled: !!userId, queryFn: () => listMyBusinesses(userId) });
  const profiles = query.data ?? [];
  const switchTo = useCallback(async (p: BusinessSummary) => {
    if (!userId) return;
    await setActiveProfile(userId, p.id);
    setBusiness(p);
    await qc.resetQueries();
  }, [userId, setBusiness, qc]);
  return { profiles, active: business, switchTo, canAdd: profiles.length < MAX_PROFILES, isMine: (id: string | null | undefined) => profiles.some((p) => p.id === id) };
}

/**
 * Unread chats per profile, so a message to my other profile is not missed. Only for logins with several profiles
 * (one light query per profile, at most 3), once a minute.
 */
export function useProfilesUnread(profiles: BusinessSummary[]) {
  const key = profiles.map((p) => p.id).join(",");
  const unread = useQuery({
    queryKey: ["profile_unread", key], enabled: profiles.length > 1, refetchInterval: 60_000, refetchIntervalInBackground: false,
    queryFn: async () => Object.fromEntries(await Promise.all(profiles.map(async (p) =>
      [p.id, unreadConversationCount(await listConversations(p.id), p.id)] as const))),
  });
  return unread.data ?? ({} as Record<string, number>);
}
