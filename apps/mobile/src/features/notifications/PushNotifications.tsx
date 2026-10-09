import { useEffect, useRef, useState } from "react";
import type { NotificationResponse } from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { notifications, registerForPush, routeForNotification, showLocalNotification } from "./api";
import type { MessageRow } from "@/features/chat/api";

/**
 * Mounted once in the root layout.
 * - registers the device token after login (remote push comes from the database triggers)
 * - opens the chat/post when a notification is tapped (cold start included)
 * - while the app is open: a realtime insert on `messages` for one of my conversations shows a local
 *   notification when remote push is unavailable (Expo Go, no EAS project id) and the user is not already in that chat
 */
export function PushNotifications() {
  const { session, business } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [remote, setRemote] = useState(false);
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  const userId = session?.user.id;
  const myBizId = business?.id;

  useEffect(() => {
    if (!userId || !notifications()) return;
    let alive = true;
    registerForPush(userId).then((token) => { if (alive) setRemote(!!token); });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    const Notifications = notifications();
    if (!Notifications) return;
    const open = (resp: NotificationResponse | null) => {
      const route = routeForNotification(resp?.notification.request.content.data);
      if (route) router.push(route);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!myBizId || !notifications()) return;
    const channel = supabase.channel(`inbox:${myBizId}:${Date.now().toString(36)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as MessageRow; // RLS: only conversations I take part in reach this client
        if (m.sender_business_id === myBizId) return;
        void qc.invalidateQueries({ queryKey: ["conversations"] });
        if (remote || pathRef.current === `/chat/${m.conversation_id}`) return;
        const { data: sender } = await supabase.from("businesses_public").select("name").eq("id", m.sender_business_id).maybeSingle();
        await showLocalNotification(sender?.name ?? t("notifications.newMessage"), m.body ?? "📎", { kind: "message", conversation_id: m.conversation_id });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [myBizId, remote, qc, t]);

  return null;
}
