import { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { findTrade, type LocationValue } from "@fmbp/shared";
import { Screen, Text, Button, Field, Chip, Toggle, ImagePicker, Card, EmptyState, Select, LocationPicker } from "@/components/ui";
import { getMyBusinessDetails, updateBusiness, updateBusinessLocation, loadMyBusiness, uploadLocalImage, listBusinessMedia, addBusinessMedia, removeBusinessMedia, listCategories, type BusinessPatch } from "@/features/business/api";
import { useSession } from "@/store/session";
import { TradePicker } from "@/features/business/TradePicker";
import { photoErrorText } from "@/lib/localImage";
import { track } from "@/lib/analytics";

const input = "min-h-[48px] rounded-xl border border-line px-4 text-base text-ink";

// colours = tailwind.config.js tokens (brand-light, brand-dark), as on the secondary (Edit) button
const BRAND_LIGHT = "#E6F2EF", BRAND_DARK = "#144A40";

/**
 * Group heading in the form: a full-width tinted band, so it reads as a section and not as one more field label.
 * Plain styles: the look must not depend on utility classes being generated.
 */
function SectionTitle({ children, first = false }: { children: string; first?: boolean }) {
  return <Text accessibilityRole="header" style={[sectionStyles.band, !first && sectionStyles.spaced]}>{children}</Text>;
}
const sectionStyles = StyleSheet.create({
  band: {
    backgroundColor: BRAND_LIGHT, color: BRAND_DARK, fontSize: 17, lineHeight: 24, fontWeight: "700",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, overflow: "hidden", marginBottom: 16,
  },
  spaced: { marginTop: 16 },
});

/** Progressive profile: every field optional, saved in one tap. Reached from the completion card. */
export default function EditBusiness() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { business, session, setBusiness } = useSession();
  const details = useQuery({ queryKey: ["my_business_full", business?.id], enabled: !!business, queryFn: () => getMyBusinessDetails(business!.id) });
  const media = useQuery({ queryKey: ["my_business_media", business?.id], enabled: !!business, queryFn: () => listBusinessMedia(business!.id) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories, staleTime: 10 * 60_000 });
  // Overrides on top of the loaded row: nothing is copied into state until the user edits it.
  const [edits, setEdits] = useState<BusinessPatch>({});
  const [logoPick, setLogoPick] = useState<string[] | null>(null);
  const [coverPick, setCoverPick] = useState<string[] | null>(null);
  const [placePick, setPlacePick] = useState<LocationValue | null>(null); // null: location unchanged
  const [err, setErr] = useState<string | null>(null);
  const loginPhone = session?.user.phone?.replace(/^\+?91/, "") ?? "";
  const d = details.data;
  const form: BusinessPatch = {
    name: d?.name ?? business?.name ?? "", category_id: d?.category_id ?? business?.category_id,
    phone: d?.phone ?? null, whatsapp: d?.whatsapp ?? null, email: d?.email ?? null, website: d?.website ?? null, description: d?.description ?? null,
    service_available: d?.service_available ?? false, delivery_available: d?.delivery_available ?? false, pickup_available: d?.pickup_available ?? false,
    trade: business?.trade ?? null, trade_other: business?.trade_other ?? null,
    ...edits,
  };
  // individuals: own name and trade (the category follows the trade); no business-only fields
  const individual = business?.kind === "individual";
  const pickTrade = (value: string, other: string) => {
    const cat = cats.data?.find((c) => c.slug === findTrade(value)?.category)?.id;
    setEdits((f) => ({ ...f, trade: value, trade_other: value === "other" ? other : null, ...(cat ? { category_id: cat } : {}) }));
  };
  const logo = logoPick ?? (d?.logo_url ? [d.logo_url] : []);
  const cover = coverPick ?? (d?.cover_url ? [d.cover_url] : []);
  const setLogo = setLogoPick; const setCover = setCoverPick;
  const nameOk = (form.name ?? "").trim().length >= 2;
  const place: LocationValue | null = placePick ?? (business ? {
    lat: business.lat, lng: business.lng, city: business.city, state: business.state ?? undefined, pincode: business.pincode ?? undefined, country: "IN", label: business.city,
  } : null);

  const set = <K extends keyof BusinessPatch>(k: K, v: BusinessPatch[K]) => setEdits((f) => ({ ...f, [k]: v }));
  const isRemote = (u: string) => /^https?:\/\//.test(u);

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("no business");
      const patch: BusinessPatch = { ...form };
      if (!individual) { delete patch.trade; delete patch.trade_other; }
      const [l] = logo; const [c] = cover;
      patch.logo_url = l ? (isRemote(l) ? l : await uploadLocalImage(business.id, l, "logo")) : null;
      patch.cover_url = c ? (isRemote(c) ? c : await uploadLocalImage(business.id, c, "cover")) : null;
      await updateBusiness(business.id, patch);
      if (placePick) await updateBusinessLocation(business.id, placePick);
      track("profile_completed_item", { section: section ?? "all" });
    },
    onSuccess: async () => {
      setBusiness(await loadMyBusiness(session?.user.id));
      await qc.invalidateQueries({ queryKey: ["my_business_full"] });
      await qc.invalidateQueries({ queryKey: ["business", business?.id] }); // public business page
      router.back();
    },
    onError: (e) => setErr(photoErrorText(e, t)),
  });

  const photos = useMutation({
    mutationFn: async (uris: string[]) => {
      if (!business) return;
      const current = media.data ?? [];
      const keep = new Set(uris.filter(isRemote));
      for (const m of current) if (!keep.has(m.url)) await removeBusinessMedia(m.id);
      for (const u of uris.filter((x) => !isRemote(x))) await addBusinessMedia(business.id, await uploadLocalImage(business.id, u, "gallery"));
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["my_business_media"] }); setBusiness(await loadMyBusiness(session?.user.id)); },
    onError: (e) => setErr(photoErrorText(e, t)),
  });

  if (!business) return null;
  if (details.isError) return <Screen><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => details.refetch()} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("profile.edit") }} />
      {/* The native header carries the page title; the hint only says every field is optional. */}
      <Text variant="subtitle" className="py-4">{t("profile.editHint")}</Text>

      <SectionTitle first={true}>{t("profile.sections.basics")}</SectionTitle>
      <Field label={individual ? t("onboarding.yourName") : t("profile.name")} required help={individual ? undefined : t("profile.nameHelp")} error={!nameOk ? t("profile.nameHelp") : undefined}>
        <TextInput value={form.name ?? ""} onChangeText={(s) => set("name", s)} autoCapitalize="words"
          placeholder={individual ? t("individual.namePlaceholder") : t("onboarding.businessNamePlaceholder")} className={input} />
      </Field>
      {individual ? (
        <Field label={t("individual.trade")} required>
          <TradePicker value={form.trade ?? null} other={form.trade_other ?? ""} onChange={pickTrade} />
        </Field>
      ) : (
        <Field label={t("profile.category")} required>
          <Select placeholder={t("profile.category")} value={form.category_id ?? null} onChange={(v) => set("category_id", v)}
            options={(cats.data ?? []).map((c) => ({ value: c.id, label: hi ? c.name_hi : c.name_en, icon: c.icon ?? undefined }))} />
        </Field>
      )}
      <Field label={t("profile.location")} required help={t("profile.locationHelp")}>
        <LocationPicker value={place} onChange={setPlacePick} />
      </Field>

      <SectionTitle first={false}>{t("profile.sections.branding")}</SectionTitle>
      <Field label={individual ? t("individual.photo") : t("profile.logo")}><ImagePicker value={logo} onChange={setLogo} max={1} square width={512} /></Field>
      <Field label={t("profile.cover")}><ImagePicker value={cover} onChange={setCover} max={1} /></Field>
      <Field label={individual ? t("individual.about") : t("profile.description")} help={individual ? t("individual.aboutHelp") : t("profile.descriptionHelp")}>
        <TextInput multiline value={form.description ?? ""} onChangeText={(s) => set("description", s)} placeholder={t("profile.descriptionPlaceholder")}
          className="min-h-[96px] rounded-xl border border-line px-4 py-3 text-base text-ink" />
      </Field>

      <SectionTitle first={false}>{t("profile.sections.contact")}</SectionTitle>
      <Field label={t("profile.phone")}>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {loginPhone ? <Chip label={t("profile.useLoginNumber")} selected={form.phone === loginPhone} onPress={() => set("phone", loginPhone)} /> : null}
        </View>
        <TextInput keyboardType="phone-pad" value={form.phone ?? ""} onChangeText={(s) => set("phone", s.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="98765 43210" className={input} />
      </Field>
      <Field label={t("profile.whatsapp")}>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {form.phone ? <Chip label={t("profile.sameAsPhone")} selected={!!form.phone && form.whatsapp === form.phone} onPress={() => set("whatsapp", form.phone)} /> : null}
        </View>
        <TextInput keyboardType="phone-pad" value={form.whatsapp ?? ""} onChangeText={(s) => set("whatsapp", s.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="98765 43210" className={input} />
      </Field>
      <Field label={t("profile.email")}><TextInput keyboardType="email-address" autoCapitalize="none" value={form.email ?? ""} onChangeText={(s) => set("email", s)} className={input} /></Field>
      {individual ? null : <Field label={t("profile.website")}><TextInput keyboardType="url" autoCapitalize="none" value={form.website ?? ""} onChangeText={(s) => set("website", s)} placeholder="https://" className={input} /></Field>}

      {individual ? null : (<>
        <SectionTitle first={false}>{t("profile.sections.info")}</SectionTitle>
        <View className="mb-5 gap-2">
          <Toggle label={t("profile.serviceAvailable")} value={!!form.service_available} onChange={(v) => set("service_available", v)} />
          <Toggle label={t("profile.deliveryAvailable")} value={!!form.delivery_available} onChange={(v) => set("delivery_available", v)} />
          <Toggle label={t("profile.pickupAvailable")} value={!!form.pickup_available} onChange={(v) => set("pickup_available", v)} />
        </View>
      </>)}

      <SectionTitle first={false}>{t("profile.sections.photos")}</SectionTitle>
      <Card className="mb-5">
        <ImagePicker value={(media.data ?? []).map((m) => m.url)} onChange={(uris) => photos.mutate(uris)} max={6} />
        {photos.isPending ? <Text variant="caption" className="mt-2">{t("common.loading")}</Text> : <Text variant="caption" className="mt-2">{individual ? t("individual.photosHelp") : t("profile.photosHelp")}</Text>}
      </Card>

      {err ? <Text variant="caption" className="mb-3 text-danger">{err}</Text> : null}
      <Button title={t("common.save")} onPress={() => { setErr(null); save.mutate(); }} loading={save.isPending}
        disabled={!nameOk || (individual && (!form.trade || (form.trade === "other" && !(form.trade_other ?? "").trim())))} />
    </Screen>
  );
}
