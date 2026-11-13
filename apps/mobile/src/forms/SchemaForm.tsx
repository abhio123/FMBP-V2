import { useMemo, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DealType, isFieldVisible, visibleFields, otherTextKey, picksOther, OTHER_VALUE, type FormField, type FormSchema, type FormValues, type LocationValue, TEXT_LIMITS } from "@fmbp/shared";
import { Field, ChipGroup, Select, AmountPicker, LocationPicker, ImagePicker, Toggle, Text, type ChipOption, TextBox } from "@/components/ui";
import { listCategories } from "@/features/business/api";
import { categoryOptions } from "@/features/business/CategoryPicker";
import { tradeOption } from "@/features/business/TradePicker";
import { recordWord } from "@/features/search/wordLog";
import { useSession } from "@/store/session";

type Props = {
  schema: FormSchema;
  values: FormValues;
  onChange: (v: FormValues) => void;
  showAdvancedToggle?: boolean;
};

/** Photos per post (QA 2026-11-04). */
export const MAX_POST_PHOTOS = 5;

/** Generic renderer: turns a FormSchema (data) into the tap-first UI. Adding a type needs no code. */
export function SchemaForm({ schema, values, onChange, showAdvancedToggle = true }: Props) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const business = useSession((s) => s.business);
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories, staleTime: 10 * 60_000 });

  // Changing a controlling field drops answers of fields that are no longer shown (e.g. cuisine after switching
  // from cooking to tailoring), so stale values never reach the post.
  const set = (k: string, v: unknown, searched?: string) => {
    const next: FormValues = { ...values, [k]: v };
    for (const f of schema.fields) if (f.show_when?.key === k && !isFieldVisible(f, next)) delete next[f.key];
    // moved away from "Other": its typed text no longer applies
    const field = schema.fields.find((f) => f.key === k);
    if (field && !picksOther(field, next)) delete next[otherTextKey(k)];
    // searched a word the list did not have, then chose "Other": it need not be typed again
    else if (searched && !next[otherTextKey(k)]) next[otherTextKey(k)] = searched.slice(0, 80);
    onChange(next);
  };
  const setOtherText = (k: string, text: string) => {
    const next: FormValues = { ...values, [otherTextKey(k)]: text };
    if (!text) delete next[otherTextKey(k)];
    onChange(next);
  };
  const shown = visibleFields(schema, values);
  const basic = shown.filter((f) => f.section === "basic");
  const advanced = shown.filter((f) => f.section === "advanced");

  const includes = t("businessType.includes");
  const dynamicOptions = useMemo(() => {
    // the same choices as the business category list (examples, ⓘ, search words); post answers save the slug
    const list = cats.data ?? [];
    const categories = categoryOptions(list, hi, includes).map((o, i) => ({ ...o, value: list[i]!.slug }));
    return { categories, industries: categories, platforms: [
      { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" }, { value: "facebook", label: "Facebook" },
    ], cities: [] as { value: string; label: string }[] };
  }, [cats.data, hi, includes]);

  const optionsFor = (f: FormField): ChipOption[] =>
    f.options_source ? dynamicOptions[f.options_source] : (f.options ?? []).map((o) => {
      const label = hi ? o.label_hi : o.label_en;
      // choices with an icon are trades (Looking for work, Need skilled person, Need employee): same list as the profile
      return o.icon ? tradeOption({ value: o.value, label, icon: o.icon }, hi, t("individual.includes")) : { value: o.value, label };
    });

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
          ? <ChipGroup options={opts} value={(v as string) ?? null} onChange={(x) => set(f.key, x ?? undefined)} />
          : <Select options={opts} value={(v as string) ?? null} onChange={(x, searched) => set(f.key, x, searched)} placeholder={label}
              intro={!opts.some((o) => o.info) ? undefined : f.options_source ? t("businessType.pickHint") : t("individual.infoHint")} alwaysShow={OTHER_VALUE}
              onSearchDone={(word, found) => recordWord(word, "form_list", found, `${schema.type_slug}.${f.key}`)} />;
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
            className="min-h-[48px] rounded-xl border border-line px-4 text-[16px] text-ink" />
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
        control = <ImagePicker value={(v as string[]) ?? []} onChange={(x) => set(f.key, x)} max={MAX_POST_PHOTOS} />;
        break;
      case "file":
        control = <ImagePicker value={(v as string[]) ?? []} onChange={(x) => set(f.key, x)} max={1} />;
        break;
      case "switch":
        control = <Toggle label={label} value={!!v} onChange={(x) => set(f.key, x)} />;
        return <View key={f.key} className="mb-4">{control}</View>;
      case "date":
        control = <TextInput placeholder="YYYY-MM-DD" value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} className="min-h-[48px] rounded-xl border border-line px-4 text-[16px] text-ink" />;
        break;
      case "text_short":
        control = <TextBox value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} maxLength={TEXT_LIMITS.formShort} accessibilityLabel={label} />;
        break;
      case "text_long":
        control = <TextBox multiline value={(v as string) ?? ""} onChangeText={(s) => set(f.key, s)} maxLength={TEXT_LIMITS.formLong} accessibilityLabel={label} />;
        break;
    }
    return (
      <Field key={f.key} label={label} help={help} required={f.required}>
        {control}
        {/* picked "Other": let them say what they mean (optional); shown in the post instead of "Other" */}
        {picksOther(f, values) ? (
          <TextBox value={(values[otherTextKey(f.key)] as string) ?? ""} onChangeText={(s) => setOtherText(f.key, s)}
            placeholder={t("common.otherPlaceholder")} accessibilityLabel={t("common.otherPlaceholder")} maxLength={TEXT_LIMITS.formOther} />
        ) : null}
      </Field>
    );
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
  return visibleFields(schema, values)
    .filter((f) => f.section === "basic" && f.required)
    .every((f) => {
      const v = values[f.key];
      if (v == null || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
}

/** Split values into basic/advanced JSON for storage, plus promoted columns. Hidden conditional fields are left out. */
export function splitValues(schema: FormSchema, values: FormValues) {
  const basic: FormValues = {}; const advanced: FormValues = {};
  let amount_min: number | undefined; let amount_max: number | undefined; let location: LocationValue | undefined;
  let deal_type: DealType | undefined;
  for (const f of visibleFields(schema, values)) {
    const v = values[f.key];
    if (v === undefined) continue;
    const part = f.section === "basic" ? basic : advanced;
    part[f.key] = v;
    // the text typed after "Other" is stored next to the answer it explains
    const typed = values[otherTextKey(f.key)];
    if (picksOther(f, values) && typeof typed === "string" && typed.trim()) part[otherTextKey(f.key)] = typed.trim();
    if (f.promote_to === "amount_min" && typeof v === "number") amount_min = v;
    if (f.promote_to === "amount_max" && typeof v === "number") amount_max = v;
    if (f.promote_to === "location" || f.type === "location") location = v as LocationValue;
    // "How do you want to work?" → opportunity_posts.deal_type (Partner badge, Partnership feed tab)
    if (f.promote_to === "deal_type" && DealType.safeParse(v).success) deal_type = v as DealType;
  }
  return { basic, advanced, amount_min, amount_max, location, deal_type };
}
