import { Pressable, StyleSheet, View } from "react-native";
import { Highlight } from "./Highlight";
import { DataIcon, Icon, ICON_COLOR } from "./Icon";
import { COLORS } from "@/theme";

// colours = tailwind.config.js tokens (brand, brand-light, brand-dark, line, ink)
const BRAND = COLORS.brand, BRAND_LIGHT = COLORS.brandLight, BRAND_DARK = COLORS.brandDark, LINE = COLORS.line, INK = COLORS.ink;

/**
 * One choice in a long list: the icon in a tinted circle, the name, a line of examples, and the ⓘ in its own zone behind
 * a thin divider, so it never reads as part of the name or picks the card by mistake. Plain styles: the look must not
 * depend on generated classes. `highlight`: the searched words, marked in the name and examples as on the search page.
 */
export function ChoiceCard({ label, hint, icon, selected = false, onPress, onInfo, infoLabel, highlight }: {
  label: string; hint?: string | null; icon?: string | null; selected?: boolean; onPress: () => void; onInfo?: () => void; infoLabel?: string; highlight?: string[];
}) {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.main}>
        {icon ? <View style={[styles.badge, selected && styles.badgeSelected]}><DataIcon value={icon} size={22} color={selected ? COLORS.white : BRAND} /></View> : null}
        <View style={styles.text}>
          <Highlight numberOfLines={2} style={[styles.name, selected && styles.nameSelected]} text={label} terms={highlight} />
          {hint ? <Highlight numberOfLines={2} style={styles.hint} text={hint} terms={highlight} /> : null}
        </View>
        {selected ? <Icon name="checkmark-circle" size={22} color={BRAND} /> : null}
      </Pressable>
      {onInfo ? (
        <Pressable onPress={onInfo} accessibilityRole="button" accessibilityLabel={infoLabel} style={styles.info}>
          <Icon name="information-circle-outline" size={22} color={BRAND} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "stretch", borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: COLORS.surface,
    shadowColor: INK, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardSelected: { borderColor: BRAND, borderWidth: 2, backgroundColor: BRAND_LIGHT },
  main: { flex: 1, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: BRAND_LIGHT },
  badgeSelected: { backgroundColor: BRAND },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: INK },
  nameSelected: { color: BRAND_DARK },
  hint: { fontSize: 13, lineHeight: 18, color: ICON_COLOR.muted },
  info: { width: 48, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: LINE },
});
