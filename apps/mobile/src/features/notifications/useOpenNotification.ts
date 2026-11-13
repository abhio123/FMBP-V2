import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { listMyBusinesses, setActiveProfile } from "@/features/business/api";
import { useSession } from "@/store/session";
import { businessesOfNotification, routeForNotification } from "./api";

/**
 * Open what a notification is about. A login can have several profiles and a notification may be about another one
 * than the profile in use (a chat of the tea stall while the clothes shop is open), so it switches to that profile
 * first: otherwise the chat, deal or post would open as if it belonged to someone else.
 */
export function useOpenNotification() {
  const router = useRouter();
  const qc = useQueryClient();
  return useCallback(async (data: unknown) => {
    const { session, business, setBusiness } = useSession.getState();
    if (session) {
      try {
        const about = await businessesOfNotification(data);
        const target = about.length ? (await listMyBusinesses(session.user.id)).find((p) => about.includes(p.id)) : undefined;
        if (target && target.id !== business?.id && !about.includes(business?.id ?? "")) {
          await setActiveProfile(session.user.id, target.id);
          setBusiness(target);
          await qc.resetQueries();
        }
      } catch { /* open it anyway, with the profile in use */ }
    }
    const route = routeForNotification(data);
    if (route) router.push(route);
  }, [router, qc]);
}
