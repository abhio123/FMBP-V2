import { ReactNode } from "react";
import { Pressable, View } from "react-native";

export function Card({ children, onPress, className = "", selected }: { children: ReactNode; onPress?: () => void; className?: string; selected?: boolean }) {
  const base = `rounded-2xl border bg-surface p-4 ${selected ? "border-brand bg-brand-light" : "border-line"} ${className}`;
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={base} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}
