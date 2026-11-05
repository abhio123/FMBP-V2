import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * `raised`: a soft shadow that lifts the card off a tinted page (`<Screen muted>`), so cards in a list read as separate
 * items. Set as a style (iOS shadow + Android elevation), the same on both platforms.
 */
export function Card({ children, onPress, className = "", selected, raised }: { children: ReactNode; onPress?: () => void; className?: string; selected?: boolean; raised?: boolean }) {
  const lift = raised ? styles.raised : undefined;
  const base = `rounded-2xl border bg-surface p-4 ${selected ? "border-brand bg-brand-light" : "border-line"} ${className}`;
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={base} style={({ pressed }) => [lift, { opacity: pressed ? 0.85 : 1 }]}>
        {children}
      </Pressable>
    );
  }
  return <View className={base} style={lift}>{children}</View>;
}

const styles = StyleSheet.create({
  raised: { shadowColor: "#111827", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});
