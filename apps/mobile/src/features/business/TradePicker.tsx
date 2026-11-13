import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OTHER_VALUE, TRADES, tradeIncludes, tradeSearchText } from "@fmbp/shared";
import { iconFor, Select, type ChipOption } from "@/components/ui";
import { recordWord } from "@/features/search/wordLog";
import { OtherInput } from "./OtherInput";

/**
 * "What work do you do?" for individuals: the same full-screen list as the business categories (see CategoryPicker).
 * Each trade shows its first examples under the name, the ⓘ shows everything it includes (Tailor: gents, ladies, kids,
 * alterations…), and search looks at those words too, in English and Hindi. "Other" stays in the list during a search
 * and opens a short box for their own words (e.g. "Bhatura maker").
 */
export function TradePicker({ value, other, onChange }: { value: string | null; other: string; onChange: (value: string, other: string) => void }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const includes = t("individual.includes");
  const options = useMemo(() => TRADES.map((tr) => tradeOption({ value: tr.value, label: hi ? tr.hi : tr.en, icon: tr.icon }, hi, includes)), [hi, includes]);
  return (
    <View style={styles.wrap}>
      <Select placeholder={t("individual.trade")} value={value} options={options} intro={t("individual.infoHint")} alwaysShow={OTHER_VALUE}
        onChange={(v, searched) => onChange(v, v === OTHER_VALUE ? other || (searched ?? "").slice(0, 40) : "")} onSearchDone={(word, found) => recordWord(word, "trade_list", found)} />
      {value === OTHER_VALUE ? <OtherInput value={other} onChange={(s) => onChange(OTHER_VALUE, s)} placeholder={t("individual.otherTrade")} /> : null}
    </View>
  );
}

/** A trade as a list choice: first examples under the name, all of them behind ⓘ, and its search words. "Other" explains itself, so it has no ⓘ. */
export function tradeOption(o: { value: string; label: string; icon?: string }, hi: boolean, includes: string): ChipOption {
  const items = tradeIncludes(o.value, hi ? "hi" : "en");
  return {
    ...o,
    hint: items.length ? items.slice(0, 3).join(", ") + (items.length > 3 ? "…" : "") : undefined,
    keywords: tradeSearchText(o.value),
    info: items.length && o.value !== OTHER_VALUE ? { title: o.label, intro: includes, items: [...items], icon: iconFor(o.icon) } : undefined,
  };
}

const styles = StyleSheet.create({ wrap: { gap: 12 } });
