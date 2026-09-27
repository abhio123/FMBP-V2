import { useState } from "react";
import { View, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Chip } from "./Chip";
import { Text } from "./Text";

/**
 * Exactly one of: a preset, or "Other amount" with a typed value, or nothing.
 * Tapping the selected preset clears it; tapping "Other amount" clears any preset.
 */
export function AmountPicker({ value, onChange, presets = [100000, 500000, 1000000, 2500000, 5000000] }: {
  value?: number | null; onChange: (v: number | undefined) => void; presets?: number[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "hi" ? "hi" : "en";
  const isPreset = value != null && presets.includes(value);
  const [custom, setCustom] = useState(value != null && !isPreset);
  const customActive = custom && !isPreset;
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {presets.map((p) => (
          <Chip key={p} label={formatInr(p, locale)} selected={!customActive && value === p}
            onPress={() => { setCustom(false); onChange(value === p ? undefined : p); }} />
        ))}
        <Chip label={t("fields.amountCustom")} selected={customActive}
          onPress={() => { if (customActive) { setCustom(false); onChange(undefined); } else { setCustom(true); onChange(undefined); } }} />
      </View>
      {customActive && (
        <View className="flex-row items-center rounded-xl border border-line px-4">
          <Text className="text-lg">₹</Text>
          <TextInput
            keyboardType="number-pad"
            autoFocus
            value={value != null ? String(value) : ""}
            onChangeText={(s) => { const d = s.replace(/[^0-9]/g, ""); onChange(d ? Number(d) : undefined); }}
            className="ml-2 min-h-[48px] flex-1 text-lg text-ink"
            placeholder="500000"
          />
          {value != null ? <Text variant="caption">{formatInr(value, locale)}</Text> : null}
        </View>
      )}
    </View>
  );
}
