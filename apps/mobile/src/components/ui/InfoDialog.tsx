import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { highlightSegments, highlightTerms } from "@/lib/highlight";
import { Text } from "./Text";
import { Highlight } from "./Highlight";
import { Icon, ICON_COLOR, type IconName } from "./Icon";
import { COLORS } from "@/theme";

export type InfoContent = { title: string; intro?: string; items: string[]; icon?: IconName };

// colours = tailwind.config.js tokens (brand, brand-light, line, ink)
const BRAND = COLORS.brand, BRAND_LIGHT = COLORS.brandLight, LINE = COLORS.line, INK = COLORS.ink;

/**
 * "What is this?" card over the screen, like the notification and language pop-ups: dimmed screen behind, title, a
 * list of what belongs here, ✕; tapping outside or Back closes it. `onChoose` adds a button that picks this choice.
 * `searched`: what they typed to find it. Its letters are marked as on the search page, the lines that have them come
 * first (a long list need not be scrolled), and if only a hidden search word matched, a line says so.
 */
export function InfoDialog({ info, onClose, chooseLabel, onChoose, searched }: { info: InfoContent | null; onClose: () => void; chooseLabel?: string; onChoose?: () => void; searched?: string }) {
  const { t } = useTranslation();
  const terms = useMemo(() => highlightTerms(searched ?? ""), [searched]);
  const { items, anyMatch } = useMemo(() => {
    const all = info?.items ?? [];
    const has = all.filter((item) => highlightSegments(item, terms).some((s) => s.match));
    return { items: [...has, ...all.filter((item) => !has.includes(item))], anyMatch: has.length > 0 };
  }, [info, terms]);
  return (
    <Modal visible={!!info} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} />
        {info ? (
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.head}>
              {info.icon ? <View style={styles.badge}><Icon name={info.icon} size={22} color={BRAND} /></View> : null}
              <Text variant="heading" style={styles.title}>{info.title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} style={styles.close}>
                <Icon name="close" size={22} color={INK} />
              </Pressable>
            </View>
            {info.intro ? <Text variant="caption" style={styles.intro}>{info.intro}</Text> : null}
            {terms.length && !anyMatch ? <Text variant="caption" style={styles.comesUnder}>{t("common.comesUnder", { word: searched?.trim() })}</Text> : null}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {items.map((item) => (
                <View key={item} style={styles.item}>
                  <Icon name="checkmark-circle-outline" size={18} color={ICON_COLOR.brand} />
                  <Highlight style={styles.itemText} text={item} terms={terms} />
                </View>
              ))}
            </ScrollView>
            {onChoose && chooseLabel ? (
              <Pressable accessibilityRole="button" onPress={onChoose} style={styles.primary}>
                <Text style={styles.primaryText}>{chooseLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: COLORS.overlay },
  card: {
    width: "100%", maxWidth: 420, maxHeight: "80%", padding: 20, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: LINE,
    shadowColor: COLORS.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND_LIGHT, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, lineHeight: 26 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: -6 },
  intro: { marginTop: 8 },
  comesUnder: { marginTop: 8, fontWeight: "600", color: INK },
  list: { marginTop: 12, flexGrow: 0 },
  listContent: { gap: 10, paddingBottom: 2 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemText: { flex: 1, fontSize: 16, lineHeight: 22, color: INK },
  primary: { marginTop: 18, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: BRAND },
  primaryText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
});
