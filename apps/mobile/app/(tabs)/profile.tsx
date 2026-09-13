import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Button, ProgressCard, TrustRow, EmptyState } from "@/components/ui";
import { useSession } from "@/store/session";
import { signOut } from "@/features/auth/api";
import { setLocale } from "@/i18n";
import { listMyPosts } from "@/features/posts/api";
import { getMyBusinessDetails, listBusinessMedia } from "@/features/business/api";
import { PostCard } from "@/features/posts/PostCard";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const details = useQuery({ queryKey: ["my_business_full", business?.id], enabled: !!business, queryFn: () => getMyBusinessDetails(business!.id) });
  const media = useQuery({ queryKey: ["my_business_media", business?.id], enabled: !!business, queryFn: () => listBusinessMedia(business!.id) });
  if (!business) return null;
  const d = details.data;
  const edit = (section: string) => router.push({ pathname: "/business/edit", params: { section } });
  return (
    <Screen>
      <View className="gap-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text variant="title">{t("profile.title")}</Text>
            <TrustRow name={business.name} city={business.city} verified={business.verification_status === "verified"} />
          </View>
          <Button title={t("common.edit")} variant="secondary" full={false} onPress={() => edit("all")} />
        </View>
        {d?.description ? <Text variant="caption">{d.description}</Text> : null}
        <ProgressCard
          title={t("profile.completion", { pct: business.completion_score })}
          pct={business.completion_score}
          suggestions={[
            { label: t("profile.addLogo"), done: !!business.logo_url, onPress: () => edit("branding") },
            { label: t("profile.addDescription"), done: !!d && !!d.description && d.description.length > 20, onPress: () => edit("branding") },
            { label: t("profile.addContact"), done: !!d && !!(d.phone || d.whatsapp), onPress: () => edit("contact") },
            { label: t("profile.addPhotos"), done: (media.data?.length ?? 0) > 0, onPress: () => edit("photos") },
          ]}
        />
        <Text variant="heading" className="mt-2">{t("profile.myPosts")}</Text>
        {mine.isError ? <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => mine.refetch()} />
          : mine.data?.length ? mine.data.map((p) => <PostCard key={p.id} post={p} />)
          : mine.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : <EmptyState icon="📝" title={t("profile.noPosts")} cta={t("feed.emptyCta")} onPress={() => router.push("/create")} />}
        <Button title={`${t("common.language")}: ${i18n.language === "hi" ? "हिंदी" : "English"}`} variant="secondary" onPress={() => setLocale(i18n.language === "hi" ? "en" : "hi")} />
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}
