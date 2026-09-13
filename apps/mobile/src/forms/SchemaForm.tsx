import { useMemo, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FormField, FormSchema, FormValues, LocationValue } from "@fmbp/shared";
import { Field, ChipGroup, Select, AmountPicker, LocationPicker, ImagePicker, Toggle, Text } from "@/components/ui";
import { listCategories } from "@/features/business/api";
import { useSession } from "@/store/session";

type Props = {
  schema: FormSchema;
  values: FormValues;
  onChange: (v: FormValues) => void;
  showAdvancedToggle?: boolean;
};

/** Generic renderer: turns a FormSchema (data) into the tap-first UI. Adding a type needs no code. */
export function SchemaForm({ schema, values, onChange, showAdvancedToggle = true }: Props) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const business = useSession((s) => s.business);
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories, staleTime: 10 * 60_000 });

  const set = (k: string, v: unknown) => onChange({ ...values, [k]: v });
  const basic = schema.fields.filter((f) => f.section === "basic");
  const advanced = schema.fields.filter((f) => f.section === "advanced");

  const dynamicOptions = useMemo(() => ({
    categories: (cats.data ?? []).map((c) => ({ value: c.slug, label: hi ? c.name_hi : c.name_en, icon: c.icon ?? undefined })),
    industries: (cats.data ?? []).map((c) => ({ value: c.slug, label: hi ? c.name_hi : c.name_en, icon: c.icon ?? undefined })),
    platforms: [
      { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" }, { value: "facebook", label: "Facebook" },
    ],
    cities: [] as { value: string; label: string }[],
  }), [cats.data, hi]);

  const optionsFor = (f: FormField) =>
    f.options_source ? dynamicOptions[f.options_source] : (f.options ?? []).map((o) => ({ value: o.value, label: hi ? o.label_hi : o.label_en }));

  const render = (f: FormField) => {
    const label = hi ? f.label_hi : f.label_en;
    const help = hi ? f.help_hi : f.help_en;
    const v = values[f.key];
    let control: React.ReactNode;
    switch (f.type) {
      case "chips":
      case "select": {
        const opts = optionsFor(f);
        control = f.type === "chips" && opts.length <= 12
          ? <ChipGroup options={opts} value={(v as string) ?? null} onChange={(x) => set(f.key, x)} />
          : <Select options={opts} value={(v as string) ?? null} onChange={(x) => set(f.key, x)} placeholder={label} />;
        break;
      }
      case "multichips":
        control = <ChipGroup multiple options={optionsFor(f)} value={(v as string[]) ?? []} onChange={(x) => set(f.key, x)} />;
        break;
      case "amount":
        control = <AmountPicker value={(v as number) ?? null} onChange={(x) => set(f.key, x)} presets={f.presets} />;
        break;
      case "range":
      case "number":
        control = (
          <TextInput keyboardType="number-pad" value={v == null ? "" : String(v)} onChangeText={(s) => set(f.key, s === "" ? undefined : Number(s.replace(/[^0-9.]/g, "")))}
            className="min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />
        );
        break;
      case "location": {
        const current = (v as LocationValue | undefined) ?? (f.default_from_business && business
          ? { lat: business.lat, lng: business.lng, city: business.city, state: business.state ?? undefined, pincode: business.pincode ?? undefined, country: "IN", label: business.city }
          : undefined);
        if (!v && current) setTimeout(() => set(f.key, current), 0);
        control = <LocationPicker value={current ?? null} onChange={(x) => set(f.key, x)} />;
        break;
      }
      case "image":
        control = <ImagePicker value={(v as string[]) ?? []} onChange={(x) => set(f.key, x)} />;
        break;
      case "file":
        control = <ImagePicker value={(v as string[]) ?? []} onChange={(x) => set(f.key, x)} max={1} />;
        break;
      case "switch":
        control = <Toggle label={label} value={!!v} onChange={(x) => set(f.key, x)} />;
        return <View key={f.key} className="mb-4">{control}</View>;
      case "date":
        control = <TextInput placeholder="YYYY-MM-DD" value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} className="min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />;
        break;
      case "text_short":
        control = <TextInput value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} className="min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />;
        break;
      case "text_long":
        control = <TextInput multiline value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} className="min-h-[96px] rounded-xl border border-line px-4 py-3 text-base text-ink" />;
        break;
    }
    return <Field key={f.key} label={label} help={help} required={f.required}>{control}</Field>;
  };

  return (
    <View>
      {basic.map(render)}
      {advanced.length > 0 && showAdvancedToggle && (
        <Pressable accessibilityRole="button" onPress={() => setAdvancedOpen((o) => !o)} className="mb-4 min-h-[44px] justify-center">
          <Text className="font-medium text-brand">{advancedOpen ? `▴ ${t("common.lessDetails")}` : `▾ ${t("common.moreDetails")}`}</Text>
        </Pressable>
      )}
      {advancedOpen && advanced.map(render)}
    </View>
  );
}

/** True when every required basic field has a value. */
export function isBasicComplete(schema: FormSchema, values: FormValues): boolean {
  return schema.fields
    .filter((f) => f.section === "basic" && f.required)
    .every((f) => {
      const v = values[f.key];
      if (v == null || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
}

/** Split values into basic/advanced JSON for storage, plus promoted columns. */
export function splitValues(schema: FormSchema, values: FormValues) {
  const basic: FormValues = {}; const advanced: FormValues = {};
  let amount_min: number | undefined; let amount_max: number | undefined; let location: LocationValue | undefined;
  for (const f of schema.fields) {
    const v = values[f.key];
    if (v === undefined) continue;
    (f.section === "basic" ? basic : advanced)[f.key] = v;
    if (f.promote_to === "amount_min" && typeof v === "number") amount_min = v;
    if (f.promote_to === "amount_max" && typeof v === "number") amount_max = v;
    if (f.promote_to === "location" || f.type === "location") location = v as LocationValue;
  }
  return { basic, advanced, amount_min, amount_max, location };
}
