import { Pressable, StyleSheet, View } from "react-native";
import { COLORS } from "@/theme";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

/** Two or three views of one screen side by side ("Opportunities | Announcements"): the chosen one is filled. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.wrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} style={[styles.item, on && styles.on]}>
            {o.icon ? <Icon name={o.icon} size={18} color={on ? COLORS.white : COLORS.inkMuted} /> : null}
            <Text numberOfLines={1} style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  item: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, borderRadius: 10 },
  on: { backgroundColor: COLORS.brand },
  label: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: COLORS.inkMuted },
  labelOn: { color: COLORS.white },
});
