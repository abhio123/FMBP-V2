import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { Icon, ICON_COLOR, type IconName } from "./Icon";

const SIZE = { title: 24, heading: 20, subtitle: 18, body: 18, label: 18, caption: 16, small: 14 } as const;
const COLOR = { title: ICON_COLOR.ink, heading: ICON_COLOR.ink, subtitle: ICON_COLOR.muted, body: ICON_COLOR.ink, label: ICON_COLOR.ink, caption: ICON_COLOR.muted, small: ICON_COLOR.faint } as const;

/** A line icon followed by text, the icon sized and coloured to match the text variant (pass `color` to override). */
export function IconText({ icon, variant = "body", color, className = "", textClassName = "", numberOfLines, children }: {
  icon: IconName; variant?: keyof typeof SIZE; color?: string; className?: string; textClassName?: string; numberOfLines?: number; children: ReactNode;
}) {
  return (
    <View className={`flex-row items-center gap-1.5 ${className}`}>
      <Icon name={icon} size={SIZE[variant]} color={color ?? COLOR[variant]} />
      <Text variant={variant} numberOfLines={numberOfLines} className={`shrink ${textClassName}`}>{children}</Text>
    </View>
  );
}
