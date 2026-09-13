import { useState } from "react";
import { View, TextInput } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, Field, Chip, Toggle, ImagePicker, Card, EmptyState } from "@/components/ui";
import { getMyBusinessDetails, updateBusiness, loadMyBusiness, uploadLocalImage, listBusinessMedia, addBusinessMedia, removeBusinessMedia, type BusinessPatch } from "@/features/business/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

const input = "min-h-[48px] rounded-xl border border-line px-4 text-base text-ink";

/** Progressive profile: every field optional, saved in one tap. Reached from the completion card. */
export default function EditBusiness() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { business, session, setBusiness } = useSession();
  const details = useQuery({ queryKey: ["my_business_full", business?.id], enabled: !!business, queryFn: () => getMyBusinessDetails(business!.id) });
  const media = useQuery({ queryKey: ["my_business_media", business?.id], enabled: !!business, queryFn: () => listBusinessMedia(business!.id) });
  // Overrides on top of the loaded row: nothing is copied into state until the user edits it.
  const [edits, setEdits] = useState<BusinessPatch>({});
  const [logoPick, setLogoPick] = useState<string[] | null>(null);
  const [coverPick, setCoverPick] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const loginPhone = session?.user.phone?.replace(/^\+?91/, "") ?? "";
  const d = details.data;
  const form: BusinessPatch = {
    phone: d?.phone ?? null, whatsapp: d?.whatsapp ?? null, email: d?.email ?? null, website: d?.website ?? null, description: d?.description ?? null,
    service_available: d?.service_available ?? false, delivery_available: d?.delivery_available ?? false, pickup_available: d?.pickup_available ?? false,
    ...edits,
  };
  const logo = logoPick ?? (d?.logo_url ? [d.logo_url] : []);
  const cover = coverPick ?? (d?.cover_url ? [d.cover_url] : []);
  const setLogo = setLogoPick; const setCover = setCoverPick;

  const set = <K extends keyof BusinessPatch>(k: K, v: BusinessPatch[K]) => setEdits((f) => ({ ...f, [k]: v }));
  const isRemote = (u: string) => /^https?:\/\//.test(u);

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("no business");
      const patch: BusinessPatch = { ...form };
      const [l] = logo; const [c] = cover;
      patch.logo_url = l ? (isRemote(l) ? l : await uploadLocalImage(business.id, l, "logo")) : null;
      patch.cover_url = c ? (isRemote(c) ? c : await uploadLocalImage(business.id, c, "cover")) : null;
      await updateBusiness(business.id, patch);
      track("profile_completed_item", { section: section ?? "all" });
    },
    onSuccess: async () => {
      setBusiness(await loadMyBusiness(session?.user.id));
      await qc.invalidateQueries({ queryKey: ["my_business_full"] });
      router.back();
    },
    onError: (e) => setErr((e as Error).message),
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
    onError: (e) => setErr((e as Error).message),
  });

  if (!business) return null;
  if (details.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => details.refetch()} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("profile.edit") }} />
      <View className="gap-1 py-4">
        <Text variant="title">{t("profile.edit")}</Text>
        <Text variant="subtitle">{t("profile.editHint")}</Text>
      </View>

      <Text variant="heading" className="mb-3">{t("profile.sections.branding")}</Text>
      <Field label={t("profile.logo")}><ImagePicker value={logo} onChange={setLogo} max={1} /></Field>
      <Field label={t("profile.cover")}><ImagePicker value={cover} onChange={setCover} max={1} /></Field>
      <Field label={t("profile.description")} help={t("profile.descriptionHelp")}>
        <TextInput multiline value={form.description ?? ""} onChangeText={(s) => set("description", s)} placeholder={t("profile.descriptionPlaceholder")}
          className="min-h-[96px] rounded-xl border border-line px-4 py-3 text-base text-ink" />
      </Field>

      <Text variant="heading" className="mb-3 mt-2">{t("profile.sections.contact")}</Text>
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
      <Field label={t("profile.website")}><TextInput keyboardType="url" autoCapitalize="none" value={form.website ?? ""} onChangeText={(s) => set("website", s)} placeholder="https://" className={input} /></Field>

      <Text variant="heading" className="mb-3 mt-2">{t("profile.sections.info")}</Text>
      <View className="mb-5 gap-2">
        <Toggle label={t("profile.serviceAvailable")} value={!!form.service_available} onChange={(v) => set("service_available", v)} />
        <Toggle label={t("profile.deliveryAvailable")} value={!!form.delivery_available} onChange={(v) => set("delivery_available", v)} />
        <Toggle label={t("profile.pickupAvailable")} value={!!form.pickup_available} onChange={(v) => set("pickup_available", v)} />
      </View>

      <Text variant="heading" className="mb-3 mt-2">{t("profile.sections.photos")}</Text>
      <Card className="mb-5">
        <ImagePicker value={(media.data ?? []).map((m) => m.url)} onChange={(uris) => photos.mutate(uris)} max={6} />
        {photos.isPending ? <Text variant="caption" className="mt-2">{t("common.loading")}</Text> : <Text variant="caption" className="mt-2">{t("profile.photosHelp")}</Text>}
      </Card>

      {err ? <Text variant="caption" className="mb-3 text-danger">{err}</Text> : null}
      <Button title={t("common.save")} onPress={() => { setErr(null); save.mutate(); }} loading={save.isPending} />
    </Screen>
  );
}
