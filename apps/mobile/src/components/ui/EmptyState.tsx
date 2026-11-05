import { View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { Icon, ICON_COLOR, type IconName } from "./Icon";

export function EmptyState({ icon = "search-outline", title, cta, onPress }: { icon?: IconName; title: string; cta?: string; onPress?: () => void }) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Icon name={icon} size={44} color={ICON_COLOR.faint} />
      <Text variant="subtitle" className="text-center">{title}</Text>
      {cta && onPress ? (
        <View className="flex-row justify-center">
          <Button title={cta} onPress={onPress} full={false} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
