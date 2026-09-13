import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Card, Text, TrustRow } from "@/components/ui";
import type { PostCardRow } from "./api";

export function PostCard({ post }: { post: PostCardRow }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const b = post.business;
  const amount = post.amount_min ?? post.amount_max;
  const [now] = useState(() => Date.now());
  const days = Math.max(0, Math.ceil((new Date(post.expires_at).getTime() - now) / 86400_000));
  return (
    <Card onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })} className="mb-3">
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-xl">{post.post_type?.icon ?? "✨"}</Text>
        <Text variant="small" className="rounded-full bg-brand-light px-2 py-0.5 text-brand-dark">
          {hi ? post.post_type?.name_hi : post.post_type?.name_en}
        </Text>
        {amount ? <Text variant="small" className="ml-auto font-semibold text-ink">{formatInr(Number(amount), hi ? "hi" : "en")}</Text> : null}
      </View>
      <Text variant="heading" numberOfLines={2}>{post.title}</Text>
      {post.description ? <Text variant="caption" numberOfLines={2} className="mt-1">{post.description}</Text> : null}
      <View className="mt-3 border-t border-line pt-3">
        {b ? (
          <TrustRow
            name={b.name}
            verified={b.verification_status === "verified"}
            city={post.city}
            category={hi ? b.category?.name_hi : b.category?.name_en}
            responseRate={b.response_rate}
            ratingAvg={b.rating_avg}
            ratingCount={b.rating_count}
            completedDeals={b.completed_deals}
            memberSince={b.member_since}
            distanceKm={post.distance_km ?? null}
          />
        ) : null}
        <Text variant="small" className="mt-1">
          {t("post.responses", { count: post.response_count })} · {t("post.views", { count: post.view_count })} · {t("post.expiresIn", { days })}
        </Text>
      </View>
    </Card>
  );
}
