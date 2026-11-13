import { useEffect, useRef, useState } from "react";
import type { NotificationResponse } from "expo-notifications";
import { usePathname } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { notifications, registerForPush, showLocalNotification } from "./api";
import { useOpenNotification } from "./useOpenNotification";
import { useProfiles } from "@/features/business/useProfiles";
import type { MessageRow } from "@/features/chat/api";

/**
 * Mounted once in the root layout.
 * - registers the device token after login (remote push comes from the database triggers)
 * - opens the chat/post when a notification is tapped (cold start included)
 * - while the app is open: a realtime insert on `messages` for one of my conversations shows a local
 *   notification when remote push is unavailable (Expo Go, no EAS project id) and the user is not already in that chat
 */
export function PushNotifications() {
  const { session, business, hydrated } = useSession();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [remote, setRemote] = useState(false);
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  const userId = session?.user.id;
  const myBizId = business?.id;
  const openNotification = useOpenNotification();
  const { profiles } = useProfiles();
  const myIds = useRef<string[]>([]);
  useEffect(() => { myIds.current = profiles.map((p) => p.id); }, [profiles]);

  useEffect(() => {
    if (!userId || !notifications()) return;
    let alive = true;
    registerForPush(userId).then((token) => { if (alive) setRemote(!!token); });
    return () => { alive = false; };
  }, [userId]);

  // A tap that opened the app is handled once the session and profile are loaded: before that, the app cannot switch
  // to the profile the notification is about, and the chat would open under the wrong one.
  const handled = useRef(new Set<string>());
  useEffect(() => {
    const Notifications = notifications();
    if (!Notifications || !hydrated) return;
    const open = (resp: NotificationResponse | null) => {
      if (!resp) return;
      const id = resp.notification.request.identifier;
      if (handled.current.has(id)) return; // the same tap is reported again when this effect re-runs
      handled.current.add(id);
      void openNotification(resp.notification.request.content.data);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [openNotification, hydrated]);

  useEffect(() => {
    if (!myBizId || !notifications()) return;
    const channel = supabase.channel(`inbox:${myBizId}:${Date.now().toString(36)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as MessageRow; // RLS: only conversations I take part in reach this client
        void qc.invalidateQueries({ queryKey: ["profile_unread"] });
        if (m.sender_business_id === myBizId || myIds.current.includes(m.sender_business_id)) return; // written by me
        void qc.invalidateQueries({ queryKey: ["conversations"] });
        if (remote || pathRef.current === `/chat/${m.conversation_id}`) return;
        const { data: sender } = await supabase.from("businesses_public").select("name").eq("id", m.sender_business_id).maybeSingle();
        await showLocalNotification(sender?.name ?? t("notifications.newMessage"), m.body ?? t("chat.attachment"), { kind: "message", conversation_id: m.conversation_id });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [myBizId, remote, qc, t]);

  return null;
}
