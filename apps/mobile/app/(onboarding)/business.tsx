import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, View, TextInput } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { findTrade, TEXT_LIMITS, type LocationValue } from "@fmbp/shared";
import { Screen, Text, Button, Field, LocationPicker, Icon, ICON_COLOR, type IconName, TextBox } from "@/components/ui";
import { createBusiness, listCategories, loadMyBusiness, setActiveProfile } from "@/features/business/api";
import { TradePicker } from "@/features/business/TradePicker";
import { CategoryPicker, OTHER_CATEGORY } from "@/features/business/CategoryPicker";
import { useSession, type ProfileKind } from "@/store/session";
import { track } from "@/lib/analytics";
import { applyReferralCode, referralError } from "@/features/referral/api";

const input = "min-h-[48px] rounded-xl border border-line px-4 text-[16px] text-ink";

/**
 * One-minute profile. First one simple question with two big pictures: "I run a shop / business" or "I work / I have
 * a skill" (no business needed: a cook, barber or electrician looking for work). Then only what that needs:
 * business → name, type, place; individual → own name, trade (picked by icon), place.
 */
export default function CreateProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const setBusiness = useSession((s) => s.setBusiness);
  const userId = useSession((s) => s.session?.user.id);
  const adding = useSession((s) => !!s.business); // another profile: the first one already exists
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const [kind, setKind] = useState<ProfileKind | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [categoryOther, setCategoryOther] = useState("");
  const [trade, setTrade] = useState<string | null>(null);
  const [tradeOther, setTradeOther] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const individual = kind === "individual";
  // an individual's profile is filed under its trade's business category (feeds and search use it)
  const tradeCategory = cats.data?.find((c) => c.slug === findTrade(trade)?.category)?.id ?? cats.data?.find((c) => c.slug === "other")?.id ?? null;
  const ready = name.trim().length >= 2 && !!location && (individual ? !!trade && !!tradeCategory && (trade !== "other" || tradeOther.trim().length >= 2)
    : !!category && (category !== cats.data?.find((c) => c.slug === OTHER_CATEGORY)?.id || categoryOther.trim().length >= 2));

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const id = await createBusiness({ name, category_id: individual ? tradeCategory! : category!, location: location!, kind: kind!, trade, trade_other: tradeOther, category_other: categoryOther });
      track("business_created", { category: individual ? `trade:${trade}` : category!, city: location!.city, kind: kind! });
      // the new profile is the one in use from now on; everything cached belonged to the previous one
      if (userId) await setActiveProfile(userId, id);
      setBusiness(await loadMyBusiness(userId));
      await qc.resetQueries();
      const done = () => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/feed"); };
      // the profile exists now; a code that does not work must not block it (it can be entered again from Invite)
      if (inviteCode) {
        try { await applyReferralCode(inviteCode); track("referral_code_applied", { from: "onboarding" }); }
        catch (e) {
          const r = referralError(e);
          Alert.alert(t("referral.invite"), t("referral.codeLater", { reason: r ? t(`referral.errors.${r}`) : (e as Error).message }), [{ text: "OK", onPress: done }]);
          return;
        }
      }
      done();
    } catch (e) {
      const m = (e as Error).message;
      setErr(m === "profile_limit" || m === "account_suspended" ? t(`profiles.errors.${m}`) : m);
    } finally { setBusy(false); }
  };

  if (!kind) {
    const choice = (k: ProfileKind, icon: IconName, title: string, hint: string) => (
      <Pressable accessibilityRole="button" onPress={() => setKind(k)}
        className="min-h-[120px] flex-row items-center gap-4 rounded-2xl border-2 border-line bg-surface p-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-light"><Icon name={icon} size={34} color={ICON_COLOR.brandDark} /></View>
        <View className="flex-1 gap-1">
          <Text variant="heading">{title}</Text>
          <Text variant="caption">{hint}</Text>
        </View>
        <Icon name="chevron-forward" size={22} color={ICON_COLOR.faint} />
      </Pressable>
    );
    return (
      <Screen>
        <View className="gap-1 py-4">
          <Text variant="title">{adding ? t("profiles.addTitle") : t("individual.chooseTitle")}</Text>
          <Text variant="subtitle">{adding ? t("profiles.addHint") : t("individual.chooseHint")}</Text>
        </View>
        <View className="gap-4">
          {choice("business", "storefront-outline", t("individual.isBusiness"), t("individual.isBusinessHint"))}
          {choice("individual", "person-outline", t("individual.isIndividual"), t("individual.isIndividualHint"))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{individual ? t("individual.title") : t("onboarding.title")}</Text>
        <Text variant="subtitle">{t("onboarding.subtitle")}</Text>
      </View>
      <Field label={individual ? t("onboarding.yourName") : t("onboarding.businessName")} required>
        <TextBox value={name} onChangeText={setName} autoCapitalize="words" maxLength={TEXT_LIMITS.businessName}
          placeholder={individual ? t("individual.namePlaceholder") : t("onboarding.businessNamePlaceholder")} />
      </Field>
      {individual ? (
        <Field label={t("individual.trade")} required>
          <TradePicker value={trade} other={tradeOther} onChange={(v, o) => { setTrade(v); setTradeOther(o); }} />
        </Field>
      ) : (
        <Field label={t("onboarding.category")} required>
          <CategoryPicker placeholder={t("onboarding.category")} value={category} onChange={setCategory} other={categoryOther} onOtherChange={setCategoryOther} />
        </Field>
      )}
      <Field label={individual ? t("individual.location") : t("onboarding.location")} required>
        <LocationPicker value={location} onChange={setLocation} />
      </Field>
      {/* one person enters one invite code, with their first profile */}
      {adding ? null : <Field label={t("referral.onboardingCode")} help={t("referral.onboardingCodeHelp")}>
        <TextInput value={inviteCode} onChangeText={(s) => setInviteCode(s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder={t("referral.codePlaceholder")} autoCapitalize="characters" autoCorrect={false}
          className={`${input} tracking-widest`} />
      </Field>}
      {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
      <Button title={individual ? t("individual.create") : t("onboarding.create")} onPress={submit} disabled={!ready} loading={busy} />
      <Button title={t("individual.changeChoice")} variant="ghost" onPress={() => setKind(null)} disabled={busy} className="mt-2" />
    </Screen>
  );
}
