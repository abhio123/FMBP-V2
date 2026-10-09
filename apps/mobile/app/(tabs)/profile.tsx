import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Button, ProgressCard, TrustRow, EmptyState, Field, Select } from "@/components/ui";
import { useSession } from "@/store/session";
import { signOut } from "@/features/auth/api";
import { setLocale, LOCALES, type Locale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import { listMyPosts } from "@/features/posts/api";
import { getMyBusinessDetails, listBusinessMedia } from "@/features/business/api";
import { PostCard } from "@/features/posts/PostCard";

const PREVIEW = 3;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { business, businessLoaded } = useSession();
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const details = useQuery({ queryKey: ["my_business_full", business?.id], enabled: !!business, queryFn: () => getMyBusinessDetails(business!.id) });
  const media = useQuery({ queryKey: ["my_business_media", business?.id], enabled: !!business, queryFn: () => listBusinessMedia(business!.id) });
  const { session } = useSession();
  const pickLanguage = async (l: string) => {
    await setLocale(l as Locale);
    // remembered on the account too, for notifications and AI copy; best effort
    if (session) void supabase.from("users").update({ language: l }).eq("id", session.user.id);
  };
  const about = (
    <View className="items-center gap-1 pt-4">
      <Text variant="small">{t("app.name")} · {t("app.version", { version: Constants.expoConfig?.version ?? "dev" })}</Text>
      <Text variant="small" className="text-center">{t("app.about")}</Text>
      <Text variant="small">{t("app.support", { email: String(Constants.expoConfig?.extra?.supportEmail ?? "") })}</Text>
    </View>
  );
  const langButton = (
    <Field label={t("common.language")}>
      <Select placeholder={t("common.chooseLanguage")} value={i18n.language === "hi" ? "hi" : "en"} onChange={pickLanguage} searchable={false}
        options={LOCALES.map((l) => ({ value: l, label: t(`common.languages.${l}`) }))} />
    </Field>
  );
  if (!business) {
    return (
      <Screen>
        <View className="gap-4 py-4">
          <Text variant="title">{t("profile.title")}</Text>
          {businessLoaded ? <EmptyState icon="🏪" title={t("profile.needBusinessTitle")} cta={t("feed.setupCta")} onPress={() => router.push("/(onboarding)/business")} /> : null}
          {langButton}
          <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
          {about}
        </View>
      </Screen>
    );
  }
  const d = details.data;
  const edit = (section: string) => router.push({ pathname: "/business/edit", params: { section } });
  const live = (mine.data ?? []).filter((p) => p.status === "active" || p.status === "paused");
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
            { label: t("profile.addCover"), done: !!d?.cover_url, onPress: () => edit("branding") },
            { label: t("profile.addDescription"), done: !!d && !!d.description && d.description.length > 20, onPress: () => edit("branding") },
            { label: t("profile.addContact"), done: !!d && !!(d.phone || d.whatsapp), onPress: () => edit("contact") },
            { label: t("profile.addWebsite"), done: !!d && !!(d.website || d.email), onPress: () => edit("contact") },
            { label: t("profile.addPhotos"), done: (media.data?.length ?? 0) >= 4, onPress: () => edit("photos") },
          ]}
        />
        <Text variant="heading" className="mt-2">{t("profile.myPosts")}</Text>
        {mine.isError ? <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => mine.refetch()} />
          : mine.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : live.length ? live.slice(0, PREVIEW).map((p) => <PostCard key={p.id} post={p} />)
          : <EmptyState icon="📝" title={t("profile.noPosts")} cta={t("feed.emptyCta")} onPress={() => router.push("/create")} />}
        {(mine.data?.length ?? 0) > 0 ? (
          <Button title={t("profile.seeAllPosts", { count: mine.data!.length })} variant="secondary" onPress={() => router.push("/business/my-posts")} />
        ) : null}
        {langButton}
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
        {about}
      </View>
    </Screen>
  );
}
