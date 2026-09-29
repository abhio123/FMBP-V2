import { useEffect, useState } from "react";
import { View, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Screen, Text, Card, TrustRow, Button, EmptyState } from "@/components/ui";
import { getPost, recordView, getMyResponse, respondToPost, listPostResponses, renewPost, setPostStatus } from "@/features/posts/api";
import { openConversation } from "@/features/chat/api";
import { useSavedIds, useToggleSave, useFollowingIds, useToggleFollow } from "@/features/social/api";
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
  const following = useFollowingIds(); const toggleFollow = useToggleFollow();

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
      router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const share = async () => {
    if (!post.data) return;
    try { await Share.share({ message: t("post.shareText", { title: post.data.title, description: post.data.description ?? "", id: post.data.id }) }); } catch { /* user dismissed */ }
  };

  if (post.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => post.refetch()} /></Screen>;
  if (!post.data) return <Screen><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const p = post.data; const b = p.business;
  const amount = p.amount_min ?? p.amount_max;
  const days = Math.max(0, Math.ceil((new Date(p.expires_at).getTime() - now) / 86400_000));
  const isSaved = saved.data?.has(p.id) ?? false;
  const isFollowing = !!b && (following.data?.has(b.id) ?? false);
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
      <Text variant="small" className="mt-1">
        {t("post.responses", { count: p.response_count })} · {t("post.views", { count: p.view_count })} · {p.status === "expired" ? t("post.expired") : t("post.expiresIn", { days })}
      </Text>
      {/* interactions: save + share (and follow on the business card) */}
      <View className="mt-4 flex-row flex-wrap gap-2">
        {business && !mine ? (
          <Button title={isSaved ? `🔖 ${t("post.saved")}` : `📑 ${t("post.save")}`} variant="secondary" full={false}
            onPress={() => toggleSave.mutate({ postId: p.id, saved: isSaved })} />
        ) : null}
        <Button title={`↗ ${t("common.share")}`} variant="secondary" full={false} onPress={share} />
      </View>
      {b ? (
        <Card className="mt-5" onPress={() => (mine ? router.navigate("/(tabs)/profile") : router.navigate({ pathname: "/business/[id]", params: { id: b.id } }))}>
          <TrustRow name={b.name} verified={b.verification_status === "verified"} city={p.city}
            category={hi ? b.category?.name_hi : b.category?.name_en} responseRate={b.response_rate}
            ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} />
          {business && !mine ? (
            <View className="mt-3 flex-row">
              <Button title={isFollowing ? `✓ ${t("post.following")}` : `+ ${t("post.follow")}`} variant={isFollowing ? "secondary" : "ghost"} full={false}
                onPress={() => toggleFollow.mutate({ targetId: b.id, following: isFollowing })} />
            </View>
          ) : null}
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
              <Card key={r.id} onPress={() => r.conversation_id ? router.push({ pathname: "/chat/[id]", params: { id: r.conversation_id } }) : r.business && router.navigate({ pathname: "/business/[id]", params: { id: r.business.id } })}>
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
