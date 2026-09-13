import { useState } from "react";
import { View, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Chip } from "./Chip";
import { Text } from "./Text";

export function AmountPicker({ value, onChange, presets = [100000, 500000, 1000000, 2500000, 5000000] }: {
  value?: number | null; onChange: (v: number) => void; presets?: number[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "hi" ? "hi" : "en";
  const [custom, setCustom] = useState(false);
  const isPreset = value != null && presets.includes(value);
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {presets.map((p) => (
          <Chip key={p} label={formatInr(p, locale)} selected={value === p} onPress={() => { setCustom(false); onChange(p); }} />
        ))}
        <Chip label={t("fields.amountCustom")} selected={custom || (value != null && !isPreset)} onPress={() => setCustom(true)} />
      </View>
      {(custom || (value != null && !isPreset)) && (
        <View className="flex-row items-center rounded-xl border border-line px-4">
          <Text className="text-lg">₹</Text>
          <TextInput
            keyboardType="number-pad"
            value={value != null && !isPreset ? String(value) : ""}
            onChangeText={(s) => { const n = Number(s.replace(/[^0-9]/g, "")); if (!Number.isNaN(n)) onChange(n); }}
            className="ml-2 min-h-[48px] flex-1 text-lg text-ink"
            placeholder="500000"
          />
          {value != null && !isPreset ? <Text variant="caption">{formatInr(value, locale)}</Text> : null}
        </View>
      )}
    </View>
  );
}
