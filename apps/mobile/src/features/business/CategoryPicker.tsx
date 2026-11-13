import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { iconFor, Select, type ChipOption, type IconName } from "@/components/ui";
import { recordWord } from "@/features/search/wordLog";
import { listCategories } from "./api";
import { OtherInput } from "./OtherInput";

type Category = Awaited<ReturnType<typeof listCategories>>[number];

export const OTHER_CATEGORY = "other"; // the slug of the category "Other"

/**
 * "What kind of business?": the broad categories (agreed 2026-11-06: no product-specific ones), each with an ⓘ that
 * shows what comes under it (Electrical & Electronics: wires, LED, fans, motors, AC, TV, remote…). Search also looks
 * at those examples and the Hindi / Hinglish search words, so typing "LED", "motor" or "bijli" finds the category.
 * "Other" stays in the list during a search and opens a box for their own words, which show admins what is missing.
 */
export function CategoryPicker({ value, onChange, placeholder, other, onOtherChange }: {
  value: string | null; onChange: (id: string) => void; placeholder: string; other: string; onOtherChange: (text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories, staleTime: 10 * 60_000 });
  const options = useMemo(() => categoryOptions(cats.data ?? [], hi, t("businessType.includes")), [cats.data, hi, t]);
  const otherId = cats.data?.find((c) => c.slug === OTHER_CATEGORY)?.id;
  return (
    <View style={styles.wrap}>
      <Select placeholder={placeholder} value={value} options={options} intro={t("businessType.pickHint")} alwaysShow={otherId}
        onChange={(id, searched) => { onChange(id); if (searched && !other) onOtherChange(searched.slice(0, 40)); }}
        onSearchDone={(word, found) => recordWord(word, "category_list", found)} />
      {value && value === otherId ? <OtherInput value={other} onChange={onOtherChange} placeholder={t("businessType.otherPlaceholder")} /> : null}
    </View>
  );
}

/** Each category with its ⓘ content (what belongs in it, in the app's language) and its search words. */
export function categoryOptions(cats: Category[], hi: boolean, includes: string): ChipOption[] {
  return cats.map((c) => {
    const examples = (hi ? c.examples_hi : c.examples_en) ?? [];
    const name = hi ? c.name_hi : c.name_en;
    return {
      value: c.id, label: name, icon: c.icon ?? undefined,
      // a short "e.g." line under the name, so the most common examples are seen without opening ⓘ
      hint: examples.length ? examples.slice(0, 3).join(", ") + (examples.length > 3 ? "…" : "") : undefined,
      keywords: c.keywords ?? undefined,
      info: examples.length ? { title: name, intro: includes, items: examples, icon: iconFor(c.icon) as IconName } : undefined,
    };
  });
}

const styles = StyleSheet.create({ wrap: { gap: 12 } });
