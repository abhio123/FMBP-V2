import { StyleSheet, View } from "react-native";
import { COLORS } from "@/theme";
import { Icon } from "./Icon";
import { Text } from "./Text";

/**
 * A message saying something went wrong or cannot be done (a limit reached, a rule, a failed save): red with a
 * warning icon, so it is noticed and does not depend on colour alone. Screen readers announce it when it appears.
 */
export function ErrorText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite" className={className} style={styles.row}>
      <Icon name="alert-circle" size={18} color={COLORS.danger} />
      <Text variant="caption" style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  text: { flex: 1, color: COLORS.danger, fontWeight: "600" },
});
