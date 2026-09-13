import { View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";

export function EmptyState({ icon = "🔎", title, cta, onPress }: { icon?: string; title: string; cta?: string; onPress?: () => void }) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Text className="text-5xl">{icon}</Text>
      <Text variant="subtitle" className="text-center">{title}</Text>
      {cta && onPress ? <Button title={cta} onPress={onPress} full={false} variant="secondary" /> : null}
    </View>
  );
}
