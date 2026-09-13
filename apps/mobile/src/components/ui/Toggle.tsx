import { View, Switch } from "react-native";
import { Text } from "./Text";

export function Toggle({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-line px-4">
      <Text className="flex-1 pr-3">{label}</Text>
      <Switch value={!!value} onValueChange={onChange} trackColor={{ true: "#1F6F5F" }} />
    </View>
  );
}
