import { useEffect, useState } from "react";
import { View, Image, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInr, formatDate, daysUntil } from "@fmbp/shared";
import { Screen, Text, Card, TrustRow, Button, EmptyState, IconAction } from "@/components/ui";
import { getPost, recordView, getMyResponse, respondToPost, withdrawInterest, listPostResponses, renewPost, setPostStatus } from "@/features/posts/api";
import { postPhotoUrls } from "@/features/posts/media";
import { postShareMessage } from "@/features/share/share";
import { ShareActions } from "@/features/share/ShareActions";
import { openConversation } from "@/features/chat/api";
import { useSavedIds, useToggleSave } from "@/features/social/api";
import { FollowButton } from "@/features/social/FollowButton";
import { useSession } from "@/store/session";
import { useFormSchema } from "@/forms/useFormSchema";
import { describeValues } from "@/forms/describe";
import { track } from "@/lib/analytics";

export default function PostDetail() {
  const { id, justPublished } = useLocalSearchParams<{ id: string; justPublished?: string }>();
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const { business, businessLoaded } = useSession();
  const post = useQuery({ queryKey: ["post", id], queryFn: () => getPost(id!) });
  const schema = useFormSchema("post", post.data?.post_type?.slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const saved = useSavedIds(); const toggleSave = useToggleSave();

  const loadedId = post.data?.id; const ownerId = post.data?.business?.id; const typeSlug = post.data?.post_type?.slug; const myId = business?.id;
  const mine = !!loadedId && !!myId && ownerId === myId;
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

  /** Interested = record the intent only (an engagement signal). Let's talk / Open chat = the conversation. */
  const markInterested = async () => {
    if (!post.data?.business || !business) return;
    setBusy(true); setErr(null);
    try {
      await respondToPost(post.data.id, business.id, "interested");
      track("response_sent", { post_type: typeSlug, response_type: "interested" });
      await refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const openChat = async () => {
    if (!post.data?.business || !business) return;
    setBusy(true); setErr(null);
    try {
      const conv = await openConversation(business.id, post.data.business.id, post.data.id);
      if (!myResponse.data) {
        await respondToPost(post.data.id, business.id, "lets_talk", undefined, conv.id);
        track("response_sent", { post_type: typeSlug, response_type: "lets_talk" });
        await refresh();
      }
      // one chat per business pair: `about` tags the next message with this post (card in the thread)
      router.push({ pathname: "/chat/[id]", params: { id: conv.id, about: post.data.id } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (post.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => post.refetch()} /></Screen>;
  if (!post.data) return <Screen><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const p = post.data; const b = p.business;
  const amount = p.amount_min ?? p.amount_max;
  const days = daysUntil(p.expires_at, now);
  const lang = hi ? "hi" : "en";
  // Everyone sees "Posted on"; renewal and expiry are the owner's housekeeping (QA 2026-11-02), so only the owner sees them.
  // No "Updated on" until post editing exists (updated_at also moves on counters and jobs).
  // Completed/archived posts no longer expire, so they show no expiry row.
  const live = p.status === "active" || p.status === "paused";
  const dates = [
    { key: "posted", label: t("post.postedOn"), value: formatDate(p.created_at, lang) },
    ...(!mine ? [] : [
      ...(p.renewed_at ? [{ key: "renewed", label: t("post.renewedOn"), value: formatDate(p.renewed_at, lang) }] : []),
      ...(p.status === "expired" ? [{ key: "expires", label: t("post.expiredOn"), value: formatDate(p.expires_at, lang) }]
        : live ? [{ key: "expires", label: t("post.expiresOn"), value: `${formatDate(p.expires_at, lang)} · ${days === 0 ? t("post.expiresToday") : t("post.daysLeft", { count: days })}` }]
        : []),
    ]),
  ];
  const isSaved = saved.data?.has(p.id) ?? false;
  const photos = postPhotoUrls(schema.data, { ...(p.basic ?? {}), ...(p.advanced ?? {}) });
  const details = schema.data ? describeValues(schema.data, { ...(p.basic ?? {}), ...(p.advanced ?? {}) }, hi ? "hi" : "en").filter((d) => d.key !== "location") : [];
  const statusNotice = p.status === "completed" ? t("post.completedNotice") : p.status === "paused" ? t("post.pausedNotice") : p.status === "expired" ? t("post.expiredNotice") : null;

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
      {statusNotice ? (
        <Card className="mb-4 bg-surface-muted">
          <Text variant="label">{t(`post.status.${p.status}`)}</Text>
          <Text variant="caption" className="mt-1">{statusNotice}</Text>
        </Card>
      ) : null}
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-2xl">{p.post_type?.icon}</Text>
        <Text variant="caption">{hi ? p.post_type?.name_hi : p.post_type?.name_en}</Text>
        {mine ? <Text variant="small" className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-ink">{t("post.yourPost")}</Text> : null}
        {p.status !== "active" ? <Text variant="small" className="ml-auto rounded-full bg-surface-muted px-2 py-0.5">{t(`post.status.${p.status}`)}</Text> : null}
      </View>
      <Text variant="title">{p.title}</Text>
      {amount ? <Text variant="heading" className="mt-1 text-brand">{formatInr(Number(amount), hi ? "hi" : "en")}</Text> : null}
      {p.description ? <Text className="mt-3">{p.description}</Text> : null}
      {photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
          {photos.map((u) => <Image key={u} source={{ uri: u }} accessibilityIgnoresInvertColors style={{ width: 160, height: 120, borderRadius: 12 }} />)}
        </ScrollView>
      ) : null}
      <Text variant="small" className="mt-2">📍 {p.city}{p.pincode ? ` · ${p.pincode}` : ""}</Text>
      {details.length ? (
        <Card className="mt-4">
          <Text variant="label" className="mb-2">{t("post.detailsTitle")}</Text>
          {details.map((d) => (
            <View key={d.key} className="flex-row gap-3 py-1">
              <Text variant="caption" className="w-[38%]">{d.label}</Text>
              <Text className="flex-1">{d.value}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      <Card className="mt-4">
        {dates.map((d) => (
          <View key={d.key} className="flex-row gap-3 py-1">
            <Text variant="caption" className="w-[38%]">{d.label}</Text>
            <Text className="flex-1">{d.value}</Text>
          </View>
        ))}
      </Card>
      <Text variant="small" className="mt-2">
        {t("post.responses", { count: p.response_count })} · {t("post.views", { count: p.view_count })}
      </Text>
      {/* interactions: WhatsApp, Share, Save as round icon actions (Follow is on the business card) */}
      <View className="mt-4 flex-row flex-wrap gap-3">
        <ShareActions message={(whatsapp) => postShareMessage(t, p, whatsapp)} />
        {business && !mine ? (
          <IconAction icon={isSaved ? "bookmark" : "bookmark-outline"} tone={isSaved ? "active" : "neutral"}
            label={isSaved ? t("post.saved") : t("post.save")} onPress={() => toggleSave.mutate({ postId: p.id, saved: isSaved })} />
        ) : null}
      </View>
      {b ? (
        <Card className="mt-5" onPress={() => (mine ? router.navigate("/(tabs)/profile") : router.navigate({ pathname: "/business/[id]", params: { id: b.id } }))}>
          {/* business identity on the left, Follow beside it (no separate row of empty space) */}
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <TrustRow name={b.name} verified={b.verification_status === "verified"} city={p.city}
                category={hi ? b.category?.name_hi : b.category?.name_en} responseRate={b.response_rate} responseSample={b.response_sample}
                ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} />
            </View>
            {business && !mine ? <FollowButton businessId={b.id} /> : null}
          </View>
        </Card>
      ) : null}
      {err ? <Text variant="caption" className="mt-3 text-danger">{err}</Text> : null}
      <View className="mt-6 gap-2">
        {mine ? (
          <>
            {(p.status === "expired" || (p.status === "active" && days <= 7)) ? <Button title={t("post.renew")} onPress={() => run(() => renewPost(p.id), "post_renewed")} loading={busy} /> : null}
            {p.status === "active" ? <Button title={t("post.pause")} variant="secondary" onPress={() => run(() => setPostStatus(p.id, "paused"))} loading={busy} /> : null}
            {p.status === "paused" ? <Button title={t("post.resume")} variant="secondary" onPress={() => run(() => setPostStatus(p.id, "active"))} loading={busy} /> : null}
            {p.status === "completed" ? <Button title={t("post.reopen")} variant="secondary" onPress={() => run(() => setPostStatus(p.id, "active"))} loading={busy} /> : null}
            {p.status === "active" || p.status === "paused" ? <Button title={t("post.markCompleted")} variant="ghost" onPress={() => run(() => setPostStatus(p.id, "completed"))} loading={busy} /> : null}
            <Text variant="heading" className="mt-4">{t("post.responsesTitle")}</Text>
            {responses.data?.length ? responses.data.map((r) => (
              <Card key={r.id} onPress={() => r.conversation_id ? router.push({ pathname: "/chat/[id]", params: { id: r.conversation_id, about: p.id } }) : r.business && router.navigate({ pathname: "/business/[id]", params: { id: r.business.id } })}>
                {r.business ? <TrustRow name={r.business.name} city={r.business.city} verified={r.business.verification_status === "verified"} /> : null}
                <Text variant="caption" className="mt-1">{t(`post.${responseKey(r.response_type)}`)}{r.message ? ` · ${r.message}` : ""}{r.conversation_id ? ` · ${t("post.openChat")} ›` : ""}</Text>
              </Card>
            )) : <Text variant="caption">{t("post.noResponses")}</Text>}
          </>
        ) : !business ? (
          businessLoaded ? (
            <Card className="bg-brand-light">
              <Text variant="label" className="text-brand-dark">{t("post.needBusiness")}</Text>
              <View className="mt-3 flex-row"><Button title={t("post.needBusinessCta")} full={false} onPress={() => router.push("/(onboarding)/business")} /></View>
            </Card>
          ) : null
        ) : myResponse.data ? (
          <>
            <Card className="bg-brand-light">
              <Text variant="label" className="text-brand-dark">✓ {myResponse.data.response_type === "interested" ? t("post.interestedRecorded") : t("post.responded")}</Text>
            </Card>
            <Button title={`💬 ${t("post.openChat")}`} onPress={openChat} loading={busy} />
            {myResponse.data.response_type === "interested" ? (
              <Button title={t("post.withdrawInterest")} variant="ghost" onPress={() => run(() => withdrawInterest(myResponse.data!.id))} loading={busy} />
            ) : null}
          </>
        ) : p.status !== "active" ? (
          <Text variant="caption">{t("post.notAcceptingResponses")}</Text>
        ) : (
          <>
            <Button title={`💬 ${t("post.letsTalk")}`} onPress={openChat} loading={busy} />
            <Button title={`♡ ${t("post.interested")}`} variant="secondary" onPress={markInterested} loading={busy} />
          </>
        )}
      </View>
    </Screen>
  );
}

const responseKey = (rt: string) => ({ interested: "interested", lets_talk: "letsTalk", call_me: "callMe", send_proposal: "sendProposal", apply: "apply", collaborate: "collaborate", offer_service: "offerService", invest: "invest", partner: "partner", chat: "chat" }[rt] ?? "interested");
