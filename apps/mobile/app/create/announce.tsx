import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TEXT_LIMITS } from "@fmbp/shared";
import { Button, Chip, Field, ImagePicker, Screen, Text, TextBox, ErrorText } from "@/components/ui";
import { uploadLocalImage } from "@/features/business/api";
import { createPost, listIntentions } from "@/features/posts/api";
import { quickAnnouncement, quickTitle, STARTER_ICON, STARTERS, type Starter } from "@/features/announce/quick";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";

/**
 * Quick announcement (Home → Announcements → Announce): a starter ("New stock", "Offer today"…), one line, a photo if
 * they like, Publish. One announcement a day per business; it ends after 7 days like every announcement. "More
 * options" opens the full announcement forms (opening, event…).
 */
export default function QuickAnnounce() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const setIntention = useCreatePost((s) => s.setIntention);
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const [starter, setStarter] = useState<Starter>("new_stock");
  const [line, setLine] = useState("");
  const [photo, setPhoto] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!business) return null;

  const publish = async () => {
    setBusy(true); setErr(null);
    try {
      const { typeSlug, basic } = quickAnnouncement(starter, line);
      const { data: type, error } = await supabase.from("post_types").select("id").eq("slug", typeSlug).single();
      if (error) throw error;
      const photos = photo[0] ? [await uploadLocalImage(business.id, photo[0], "post")] : [];
      const location = { lat: business.lat, lng: business.lng, city: business.city, state: business.state ?? undefined, pincode: business.pincode ?? undefined, country: "IN" };
      const id = await createPost({
        business_id: business.id, post_type_id: type.id as string, title: quickTitle(t(`announce.starter.${starter}`), line), description: null,
        basic: { ...basic, ...(photos.length ? { photos } : {}), location }, advanced: {}, location,
      });
      track("announcement_posted", { starter });
      await qc.invalidateQueries({ queryKey: ["announcements"] });
      await qc.invalidateQueries({ queryKey: ["my_posts"] });
      router.replace({ pathname: "/post/[id]", params: { id, justPublished: "1" } });
    } catch (e) {
      const m = (e as { message?: string }).message ?? "";
      setErr(m.includes("one_announcement_a_day") ? t("announce.oneADay") : m.includes("duplicate_live_post") ? t("announce.duplicate") : t("common.error"));
      setBusy(false);
    }
  };
  const moreOptions = () => {
    const announce = intentions.data?.find((i) => i.slug === "announce");
    if (!announce) return;
    setIntention(announce.id);
    router.push("/create/type");
  };

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("announce.title")}</Text>
        <Text variant="subtitle">{t("announce.hint")}</Text>
      </View>
      <Field label={t("announce.what")} required>
        <View className="flex-row flex-wrap gap-2">
          {STARTERS.map((s) => <Chip key={s} label={t(`announce.starter.${s}`)} icon={STARTER_ICON[s]} selected={starter === s} onPress={() => setStarter(s)} />)}
        </View>
      </Field>
      <Field label={t("announce.line")} required>
        <TextBox value={line} onChangeText={setLine} maxLength={TEXT_LIMITS.formShort} placeholder={t(`announce.placeholder.${starter}`)} accessibilityLabel={t("announce.line")} />
      </Field>
      <Field label={t("announce.photo")}><ImagePicker value={photo} onChange={setPhoto} max={1} width={1200} /></Field>
      {err ? <ErrorText className="mb-3">{err}</ErrorText> : null}
      <Button title={t("common.publish")} icon="megaphone-outline" onPress={publish} loading={busy} disabled={line.trim().length < 3} />
      <Text variant="small" className="mt-3 text-center">{t("announce.rules")}</Text>
      <View className="mt-2 items-center"><Button title={t("announce.moreOptions")} variant="ghost" full={false} onPress={moreOptions} /></View>
    </Screen>
  );
}
