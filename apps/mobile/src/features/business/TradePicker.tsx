import { Pressable, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { TRADES } from "@fmbp/shared";
import { Icon, ICON_COLOR, Text, type IconName } from "@/components/ui";

/**
 * "What work do you do?" for individuals: every trade as a big tile with its icon and name (two per row), so it can be
 * picked by picture as well as by word. "Other" opens a short box for their own words (e.g. "Bhatura maker").
 */
export function TradePicker({ value, other, onChange }: { value: string | null; other: string; onChange: (value: string, other: string) => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {TRADES.map((tr) => {
          const selected = value === tr.value;
          return (
            <Pressable key={tr.value} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={tr[lang]}
              onPress={() => onChange(tr.value, tr.value === "other" ? other : "")}
              className={`min-h-[56px] w-[49%] flex-row items-center gap-2 rounded-xl border-2 px-3 py-2 ${selected ? "border-brand bg-brand-light" : "border-line bg-surface"}`}>
              <Icon name={tr.icon as IconName} size={24} color={selected ? ICON_COLOR.brandDark : ICON_COLOR.brand} />
              <Text className={`shrink text-base ${selected ? "font-semibold text-brand-dark" : "text-ink"}`} numberOfLines={2}>{tr[lang]}</Text>
            </Pressable>
          );
        })}
      </View>
      {value === "other" ? (
        <TextInput value={other} onChangeText={(s) => onChange("other", s.slice(0, 40))} autoFocus placeholder={t("individual.otherTrade")}
          className="min-h-[48px] rounded-xl border border-brand px-4 text-base text-ink" />
      ) : null}
    </View>
  );
}
