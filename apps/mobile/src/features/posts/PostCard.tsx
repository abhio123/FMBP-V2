import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatInr, daysUntil } from "@fmbp/shared";
import { Button, Card, Text, TrustRow, Highlight, DataIcon, Icon, ICON_COLOR } from "@/components/ui";
import { useSession } from "@/store/session";
import { useSavedIds, useToggleSave } from "@/features/social/api";
import type { PostCardRow } from "./api";
import { expiryLabel } from "./expiry";
import { PartnerBadge } from "./PartnerBadge";
import { CardPhotos } from "./CardPhotos";
import { cardPhotoUrls } from "./media";

/**
 * `highlight`: search terms to mark in title, description and business (search results only).
 * `onEdit`: shows an "Edit post" action at the bottom (my own posts in My posts).
 */
export function PostCard({ post, highlight, onEdit, editing }: { post: PostCardRow; highlight?: string[]; onEdit?: () => void; editing?: boolean }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const business = useSession((s) => s.business);
  const b = post.business;
  const mine = !!business && b?.id === business.id;
  const saved = useSavedIds();
  const toggleSave = useToggleSave();
  const isSaved = saved.data?.has(post.id) ?? false;
  const amount = post.amount_min ?? post.amount_max;
  const [now] = useState(() => Date.now());
  const photos = useMemo(() => cardPhotoUrls(post.basic, post.advanced), [post.basic, post.advanced]);
  const expiry = mine ? expiryLabel(t, post.status, daysUntil(post.expires_at, now)) : null; // expiry is owner-only
  return (
    <Card raised onPress={() => router.navigate({ pathname: "/post/[id]", params: { id: post.id } })} className="mb-3">
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <DataIcon value={post.post_type?.icon} fallback="sparkles-outline" size={20} color={ICON_COLOR.brand} />
        <Text variant="small" className="rounded-full bg-brand-light px-2 py-0.5 text-brand-dark">
          {hi ? post.post_type?.name_hi : post.post_type?.name_en}
        </Text>
        <PartnerBadge dealType={post.deal_type} />
        {post.boosted_until && Date.parse(post.boosted_until) > now ? <Text variant="small" className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-ink">{t("referral.boostedTag")}</Text> : null}
        {mine && post.hidden_at ? <Text variant="small" className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-ink">{t("safety.underReview")}</Text> : null}
        {mine ? <Text variant="small" className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-ink">{t("post.yourPost")}</Text> : null}
        {post.status !== "active" ? <Text variant="small" className="rounded-full bg-surface-muted px-2 py-0.5">{t(`post.status.${post.status}`)}</Text>
          : mine ? <Text variant="small" className="rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">{t("profile.live")}</Text> : null}
        <View className="ml-auto flex-row items-center gap-2">
          {amount ? <Text variant="small" className="font-semibold text-ink">{formatInr(Number(amount), hi ? "hi" : "en")}</Text> : null}
          {business && !mine ? (
            <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? t("post.saved") : t("post.save")} hitSlop={8}
              onPress={() => toggleSave.mutate({ postId: post.id, saved: isSaved })} className="min-h-[32px] min-w-[32px] items-center justify-center">
              <Icon name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? ICON_COLOR.brand : ICON_COLOR.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Highlight variant="heading" numberOfLines={2} text={post.title} terms={highlight} />
      {post.description ? <Highlight variant="caption" numberOfLines={2} className="mt-1" text={post.description} terms={highlight} /> : null}
      <CardPhotos urls={photos} />
      <View className="mt-3 border-t border-line pt-3">
        {b ? (
          <TrustRow avatar logoUrl={b.logo_url} name={b.name} verified={b.verification_status === "verified"} city={post.city}
            category={hi ? b.category?.name_hi : b.category?.name_en} responseRate={b.response_rate} responseSample={b.response_sample}
            ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} referralCount={b.referral_count} kind={b.kind} trade={b.trade} tradeOther={b.trade_other}
            distanceKm={post.distance_km ?? null} highlight={highlight} />
        ) : null}
        <Text variant="small" className="mt-1">
          {t("post.responses", { count: post.response_count })} · {t("post.views", { count: post.view_count })}{expiry ? ` · ${expiry}` : ""}
        </Text>
      </View>
      {onEdit ? (
        <View className="mt-3 flex-row border-t border-line pt-3">
          <Button title={t("post.edit")} icon="create-outline" variant="secondary" full={false} onPress={onEdit} loading={editing} />
        </View>
      ) : null}
    </Card>
  );
}
