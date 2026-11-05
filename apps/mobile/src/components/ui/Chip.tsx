import { Pressable, View } from "react-native";
import { Text } from "./Text";
import { DataIcon, ICON_COLOR } from "./Icon";

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center rounded-full border px-4 py-2 ${selected ? "border-brand bg-brand" : "border-line bg-surface"}`}
    >
      {icon ? <View className="mr-1.5"><DataIcon value={icon} size={18} color={selected ? ICON_COLOR.white : ICON_COLOR.ink} /></View> : null}
      <Text className={`text-base ${selected ? "font-semibold text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
