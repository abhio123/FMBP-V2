import { View, Switch, Pressable } from "react-native";
import { Text } from "./Text";

/** Whole row is tappable; label and switch share one centre line. */
export function Toggle({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: !!value }} onPress={() => onChange(!value)}
      className="min-h-[52px] flex-row items-center justify-between rounded-xl border border-line px-4 py-2">
      <Text className="mr-3 flex-1 text-base leading-5">{label}</Text>
      <View className="justify-center">
        <Switch value={!!value} onValueChange={onChange} trackColor={{ true: "#1F6F5F" }} thumbColor="#fff" />
      </View>
    </Pressable>
  );
}
