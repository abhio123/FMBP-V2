import { Pressable } from "react-native";
import { Text } from "./Text";

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center rounded-full border px-4 py-2 ${selected ? "border-brand bg-brand" : "border-line bg-surface"}`}
    >
      {icon ? <Text className="mr-1">{icon}</Text> : null}
      <Text className={`text-base ${selected ? "font-semibold text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
