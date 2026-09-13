import { View, Pressable } from "react-native";
import { Text } from "./Text";
import { Card } from "./Card";

export function ProgressCard({ title, pct, suggestions }: { title: string; pct: number; suggestions: { label: string; onPress: () => void; done?: boolean }[] }) {
  return (
    <Card>
      <Text variant="label">{title}</Text>
      <View className="my-2 h-2 overflow-hidden rounded-full bg-line">
        <View className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {suggestions.filter((s) => !s.done).map((s) => (
          <Pressable key={s.label} onPress={s.onPress} className="min-h-[40px] justify-center rounded-full bg-brand-light px-3">
            <Text className="text-brand-dark">+ {s.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
