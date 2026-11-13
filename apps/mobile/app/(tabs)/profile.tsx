import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Button, Card, ProgressCard, TrustRow, EmptyState, Field, Select, Icon, ICON_COLOR, type IconName } from "@/components/ui";
import { useSession } from "@/store/session";
import { signOut } from "@/features/auth/api";
import { setLocale, LOCALES, type Locale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import { listMyPosts } from "@/features/posts/api";
import { getMyBusinessDetails, listBusinessMedia } from "@/features/business/api";
import { countMyPosts } from "@/features/posts/myPostTabs";
import { dealsToDo, listMyDeals } from "@/features/deals/api";
import { useFollowerCount } from "@/features/social/api";
import { businessShareMessage } from "@/features/share/share";
import { ShareActions } from "@/features/share/ShareActions";
import { BusinessCover, PlaceLine } from "@/features/business/BusinessCover";
import { saveMode } from "@/features/admin/api";
import { ProfileSwitcher } from "@/features/business/ProfileSwitcher";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { business, businessLoaded } = useSession();
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const details = useQuery({ queryKey: ["my_business_full", business?.id], enabled: !!business, queryFn: () => getMyBusinessDetails(business!.id) });
  const media = useQuery({ queryKey: ["my_business_media", business?.id], enabled: !!business, queryFn: () => listBusinessMedia(business!.id) });
  const { session } = useSession();
  const followers = useFollowerCount(business?.id);
  const deals = useQuery({ queryKey: ["my_deals", business?.id], enabled: !!business, queryFn: () => listMyDeals(business!.id) });
  const dealsTodo = dealsToDo(deals.data ?? []).count;
  const { isAdmin, setMode } = useSession();
  const toAdmin = () => { if (session) void saveMode(session.user.id, "admin"); setMode("admin"); }; // the root layout opens the admin area
  const adminRow = isAdmin ? <Row icon="shield-checkmark-outline" label={t("role.switchToAdmin")} onPress={toAdmin} /> : null;
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
    <Field label={t("common.language")} showOptional={false}>
      <Select placeholder={t("common.chooseLanguage")} value={i18n.language === "hi" ? "hi" : "en"} onChange={pickLanguage} searchable={false}
        options={LOCALES.map((l) => ({ value: l, label: t(`common.languages.${l}`) }))} />
    </Field>
  );
  if (!business) {
    return (
      <Screen>
        <View className="gap-4 py-4">
          <Text variant="title">{t("individual.profileTitle")}</Text>
          {businessLoaded ? <EmptyState icon="storefront-outline" title={t("profile.needBusinessTitle")} cta={t("feed.setupCta")} onPress={() => router.push("/(onboarding)/business")} /> : null}
          <Card className="py-1">{adminRow}<Row icon="information-circle-outline" label={t("info.title")} onPress={() => router.push("/help")} last /></Card>
          {langButton}
          <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
          {about}
        </View>
      </Screen>
    );
  }
  const d = details.data;
  const edit = (section: string) => router.push({ pathname: "/business/edit", params: { section } });
  const individual = business.kind === "individual";
  // a person needs fewer things than a business (no cover, website or business documents); the score is counted here
  const suggestions = individual ? [
    { label: t("individual.addPhoto"), done: !!business.logo_url, onPress: () => edit("branding") },
    { label: t("individual.addAbout"), done: !!d && !!d.description && d.description.length > 20, onPress: () => edit("branding") },
    { label: t("profile.addContact"), done: !!d && !!(d.phone || d.whatsapp), onPress: () => edit("contact") },
    { label: t("individual.addWorkPhotos"), done: (media.data?.length ?? 0) >= 1, onPress: () => edit("photos") },
  ] : [
    { label: t("profile.addLogo"), done: !!business.logo_url, onPress: () => edit("branding") },
    { label: t("profile.addCover"), done: !!d?.cover_url, onPress: () => edit("branding") },
    { label: t("profile.addDescription"), done: !!d && !!d.description && d.description.length > 20, onPress: () => edit("branding") },
    { label: t("profile.addContact"), done: !!d && !!(d.phone || d.whatsapp), onPress: () => edit("contact") },
    { label: t("profile.addWebsite"), done: !!d && !!(d.website || d.email), onPress: () => edit("contact") },
    { label: t("profile.addPhotos"), done: (media.data?.length ?? 0) >= 1, onPress: () => edit("photos") },
  ];
  const pct = individual ? Math.round((suggestions.filter((x) => x.done).length / suggestions.length) * 100) : business.completion_score;
  const counts = countMyPosts(mine.data ?? []);
  return (
    <Screen>
      <View className="gap-4 py-4">
        <Text variant="title">{individual ? t("individual.myProfile") : t("profile.title")}</Text>
        {/* which profile this is; change it or add another (e.g. a second shop) */}
        <ProfileSwitcher always />
        <BusinessCover name={business.name} coverUrl={d?.cover_url} logoUrl={business.logo_url} />
        <View className="flex-row items-start justify-between gap-3">
          {/* long taglines wrap inside this column; Edit stays at the top right */}
          <View className="flex-1">
            <TrustRow large name={business.name} verified={business.verification_status === "verified"} kind={business.kind} trade={business.trade} tradeOther={business.trade_other} />
            <PlaceLine city={business.city} pincode={business.pincode} />
            {d?.description ? <Text variant="caption" className="mt-1">{d.description}</Text> : null}
            {followers.data ? <Text variant="small" className="mt-1">{t("business.followers", { count: followers.data })}</Text> : null}
          </View>
          <Button title={t("common.edit")} variant="secondary" full={false} onPress={() => edit("all")} />
        </View>
        {/* share my public profile: same buttons, order and style as on posts and business pages */}
        <View className="flex-row flex-wrap gap-3">
          <ShareActions message={(whatsapp) => businessShareMessage(t, { id: business.id, name: business.name, description: d?.description, city: business.city }, whatsapp)} />
        </View>
        <ProgressCard title={t("profile.completion", { pct })} pct={pct} suggestions={suggestions} />
        {/* my posts as one entry with counts; the list itself (All / Live / Expired / Completed) is a screen of its own */}
        {mine.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => mine.refetch()} />
          : mine.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : mine.data?.length ? (
            <Card onPress={() => router.push("/business/my-posts")}>
              <View className="flex-row items-center gap-3">
                <Icon name="document-text-outline" size={26} color={ICON_COLOR.brand} />
                <View className="flex-1">
                  <Text variant="label">{t("profile.myPosts")} ({mine.data.length})</Text>
                  <Text variant="caption">{t("profile.live")} {counts.live} · {t("profile.expired")} {counts.expired} · {t("profile.completed")} {counts.completed}</Text>
                </View>
                <Text className="text-xl text-ink-faint">›</Text>
              </View>
            </Card>
          ) : <EmptyState icon="document-text-outline" title={t("profile.noPosts")} cta={t("feed.emptyCta")} onPress={() => router.push("/create")} />}
        {/* deals to confirm or rate stand out; otherwise a plain entry to the history */}
        <Card onPress={() => router.push("/business/deals")} className={dealsTodo ? "border-brand bg-brand-light" : ""}>
          <View className="flex-row items-center gap-3">
            <Icon name="people-circle-outline" size={26} color={ICON_COLOR.brand} />
            <View className="flex-1">
              <Text variant="label">{t("deals.myDeals")}</Text>
              <Text variant="caption" className={dealsTodo ? "font-semibold text-brand-dark" : ""}>{dealsTodo ? t("deals.todo", { count: dealsTodo }) : t("deals.myDealsHint")}</Text>
            </View>
            <Text className="text-xl text-ink-faint">›</Text>
          </View>
        </Card>
        <Card onPress={() => router.push("/business/invite")} className="bg-brand-light">
          <View className="flex-row items-center gap-3">
            <Icon name="gift-outline" size={26} color={ICON_COLOR.brandDark} />
            <View className="flex-1">
              <Text variant="label" className="text-brand-dark">{t("referral.invite")}</Text>
              <Text variant="caption">{t("referral.inviteHint")}</Text>
            </View>
            <Text className="text-xl text-ink-faint">›</Text>
          </View>
        </Card>
        <Card className="py-1">
          {adminRow}
          {/* the Verified badge checks business documents, so it is for businesses only */}
          {!individual && business.verification_status !== "verified" ? (
            <Row icon="checkmark-circle-outline" label={business.verification_status === "pending" ? t("verify.pendingRow") : t("verify.getVerified")} onPress={() => router.push("/business/verify")} />
          ) : null}
          <Row icon="ban-outline" label={t("safety.blockedList")} onPress={() => router.push("/business/blocked")} />
          <Row icon="information-circle-outline" label={t("info.title")} onPress={() => router.push("/help")} last />
        </Card>
        {langButton}
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
        {/* required by the stores: deleting the account is possible in the app (30 days to restore) */}
        <Pressable accessibilityRole="button" onPress={() => router.push("/account/delete")} className="min-h-[44px] items-center justify-center">
          <Text variant="caption" className="text-danger">{t("account.delete")}</Text>
        </Pressable>
        {about}
      </View>
    </Screen>
  );
}

/** One settings line: icon, label, chevron. */
function Row({ icon, label, onPress, last = false }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`min-h-[52px] flex-row items-center gap-3 ${last ? "" : "border-b border-line"}`}>
      <Icon name={icon} size={22} color={ICON_COLOR.brand} />
      <Text variant="label" className="flex-1">{label}</Text>
      <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
    </Pressable>
  );
}
