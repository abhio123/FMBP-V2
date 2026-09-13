import { useState } from "react";
import { View, TextInput } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { LocationValue } from "@fmbp/shared";
import { Screen, Text, Button, Field, Select, LocationPicker } from "@/components/ui";
import { createBusiness, listCategories, loadMyBusiness } from "@/features/business/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

export default function CreateBusiness() {
  const { t, i18n } = useTranslation();
  const setBusiness = useSession((s) => s.setBusiness);
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hi = i18n.language === "hi";
  const ready = name.trim().length >= 2 && !!category && !!location;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await createBusiness({ name, category_id: category!, location: location! });
      track("business_created", { category: category!, city: location!.city });
      setBusiness(await loadMyBusiness());
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("onboarding.title")}</Text>
        <Text variant="subtitle">{t("onboarding.subtitle")}</Text>
      </View>
      <Field label={t("onboarding.businessName")} required>
        <TextInput value={name} onChangeText={setName} placeholder={t("onboarding.businessNamePlaceholder")} className="min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />
      </Field>
      <Field label={t("onboarding.category")} required>
        <Select
          placeholder={t("onboarding.category")}
          value={category}
          onChange={setCategory}
          options={(cats.data ?? []).map((c) => ({ value: c.id, label: hi ? c.name_hi : c.name_en, icon: c.icon ?? undefined }))}
        />
      </Field>
      <Field label={t("onboarding.location")} required>
        <LocationPicker value={location} onChange={setLocation} />
      </Field>
      {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
      <Button title={t("onboarding.create")} onPress={submit} disabled={!ready} loading={busy} />
    </Screen>
  );
}
