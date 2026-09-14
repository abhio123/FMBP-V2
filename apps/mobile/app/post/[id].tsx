import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Screen, Text, Card, TrustRow, Button, EmptyState } from "@/components/ui";
import type { ResponseType } from "@fmbp/shared";
import { getPost, recordView, getMyResponse, respondToPost, listPostResponses, renewPost, setPostStatus } from "@/features/posts/api";
import { openConversation } from "@/features/chat/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

export default function PostDetail() {
  const { id, justPublished } = useLocalSearchParams<{ id: string; justPublished?: string }>();
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const post = useQuery({ queryKey: ["post", id], queryFn: () => getPost(id!) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const loadedId = post.data?.id; const ownerId = post.data?.business?.id; const typeSlug = post.data?.post_type?.slug; const myId = business?.id;
  const mine = !!loadedId && ownerId === myId;
  const myResponse = useQuery({ queryKey: ["my_response", id, myId], enabled: !!loadedId && !!myId && !mine, queryFn: () => getMyResponse(id!, myId!) });
  const responses = useQuery({ queryKey: ["post_responses", id], enabled: mine, queryFn: () => listPostResponses(id!) });

  useEffect(() => {
    if (!loadedId) return;
    if (ownerId !== myId) { recordView(loadedId, myId ?? null); track("post_viewed", { post_type: typeSlug }); }
  }, [loadedId, ownerId, myId, typeSlug]);

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["post", id] }), qc.invalidateQueries({ queryKey: ["my_posts"] }), qc.invalidateQueries({ queryKey: ["feed"] }),
    qc.invalidateQueries({ queryKey: ["my_response", id] }), qc.invalidateQueries({ queryKey: ["post_responses", id] }), qc.invalidateQueries({ queryKey: ["conversations"] }),
  ]);
  const run = async (fn: () => Promise<unknown>, event?: "post_renewed") => {
    setBusy(true); setErr(null);
    try { await fn(); if (event) track(event, { post_type: typeSlug }); await refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  /** A response = a recorded intent + a chat with the post owner. Opens (or re-opens) that chat. */
  const respond = async (type: ResponseType) => {
    if (!post.data?.business || !business) return;
    setBusy(true); setErr(null);
    try {
      const conv = await openConversation(business.id, post.data.business.id, post.data.id);
      if (!myResponse.data) {
        await respondToPost(post.data.id, business.id, type, undefined, conv.id);
        track("response_sent", { post_type: typeSlug, response_type: type });
        await refresh();
      }
      router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (post.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => post.refetch()} /></Screen>;
  if (!post.data) return <Screen><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const p = post.data; const b = p.business;
  const amount = p.amount_min ?? p.amount_max;
  const days = Math.max(0, Math.ceil((new Date(p.expires_at).getTime() - now) / 86400_000));
  return (
    <Screen>
      {justPublished ? (
        <Card className="mb-4 bg-brand-light">
          <Text variant="label" className="text-brand-dark">🎉 {t("create.published")}</Text>
          <Text variant="caption">{t("create.publishedHint")}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button title={t("create.backToFeed")} variant="secondary" full={false} onPress={() => router.replace("/(tabs)/feed")} />
            <Button title={t("create.createAnother")} variant="ghost" full={false} onPress={() => router.replace("/create")} />
          </View>
        </Card>
      ) : null}
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-2xl">{p.post_type?.icon}</Text>
        <Text variant="caption">{hi ? p.post_type?.name_hi : p.post_type?.name_en}</Text>
        {p.status !== "active" ? <Text variant="small" className="ml-auto rounded-full bg-surface-muted px-2 py-0.5">{t(`post.status.${p.status}`)}</Text> : null}
      </View>
      <Text variant="title">{p.title}</Text>
      {amount ? <Text variant="heading" className="mt-1 text-brand">{formatInr(Number(amount), hi ? "hi" : "en")}</Text> : null}
      {p.description ? <Text className="mt-3">{p.description}</Text> : null}
      <Text variant="small" className="mt-2">📍 {p.city}{p.pincode ? ` · ${p.pincode}` : ""}</Text>
      <Text variant="small" className="mt-1">
        {t("post.responses", { count: p.response_count })} · {t("post.views", { count: p.view_count })} · {p.status === "expired" ? t("post.expired") : t("post.expiresIn", { days })}
      </Text>
      {b ? (
        <Card className="mt-5" onPress={() => router.push({ pathname: "/business/[id]", params: { id: b.id } })}>
          <TrustRow name={b.name} verified={b.verification_status === "verified"} city={p.city}
            category={hi ? b.category?.name_hi : b.category?.name_en} responseRate={b.response_rate}
            ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} />
        </Card>
      ) : null}
      {err ? <Text variant="caption" className="mt-3 text-danger">{err}</Text> : null}
      <View className="mt-6 gap-2">
        {mine ? (
          <>
            {(p.status === "expired" || days <= 7) ? <Button title={t("post.renew")} onPress={() => run(() => renewPost(p.id), "post_renewed")} loading={busy} /> : null}
            {p.status === "active" ? <Button title={t("post.pause")} variant="secondary" onPress={() => run(() => setPostStatus(p.id, "paused"))} loading={busy} /> : null}
            {p.status === "paused" ? <Button title={t("post.resume")} variant="secondary" onPress={() => run(() => setPostStatus(p.id, "active"))} loading={busy} /> : null}
            {p.status === "active" || p.status === "paused" ? <Button title={t("post.markCompleted")} variant="ghost" onPress={() => run(() => setPostStatus(p.id, "completed"))} loading={busy} /> : null}
            <Text variant="heading" className="mt-4">{t("post.responsesTitle")}</Text>
            {responses.data?.length ? responses.data.map((r) => (
              <Card key={r.id} onPress={() => r.conversation_id ? router.push({ pathname: "/chat/[id]", params: { id: r.conversation_id } }) : r.business && router.push({ pathname: "/business/[id]", params: { id: r.business.id } })}>
                {r.business ? <TrustRow name={r.business.name} city={r.business.city} verified={r.business.verification_status === "verified"} /> : null}
                <Text variant="caption" className="mt-1">{t(`post.${responseKey(r.response_type)}`)}{r.message ? ` · ${r.message}` : ""}{r.conversation_id ? ` · ${t("post.openChat")} ›` : ""}</Text>
              </Card>
            )) : <Text variant="caption">{t("post.noResponses")}</Text>}
          </>
        ) : !business ? null : myResponse.data ? (
          <>
            <Card className="bg-brand-light"><Text variant="label" className="text-brand-dark">✓ {t("post.responded")}</Text></Card>
            <Button title={t("post.openChat")} onPress={() => respond(myResponse.data!.response_type)} loading={busy} />
          </>
        ) : p.status !== "active" ? (
          <Text variant="caption">{t("post.notAcceptingResponses")}</Text>
        ) : (
          <>
            <Button title={`💬 ${t("post.letsTalk")}`} onPress={() => respond("lets_talk")} loading={busy} />
            <Button title={t("post.interested")} variant="secondary" onPress={() => respond("interested")} loading={busy} />
          </>
        )}
      </View>
    </Screen>
  );
}

const responseKey = (rt: string) => ({ interested: "interested", lets_talk: "letsTalk", call_me: "callMe", send_proposal: "sendProposal", apply: "apply", collaborate: "collaborate", offer_service: "offerService", invest: "invest", partner: "partner", chat: "chat" }[rt] ?? "interested");
