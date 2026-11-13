import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { tradeLabel } from "@fmbp/shared";
import { Avatar, Icon, ICON_COLOR, Text } from "@/components/ui";
import type { BusinessSummary } from "@/store/session";
import { MAX_PROFILES, useProfiles, useProfilesUnread } from "./useProfiles";
import { COLORS } from "@/theme";

// colours = tailwind.config.js tokens (brand, brand-light, line, ink, ink-muted, accent, danger)
const BRAND = COLORS.brand, BRAND_LIGHT = COLORS.brandLight, LINE = COLORS.line, INK = COLORS.ink, MUTED = COLORS.inkMuted, ACCENT = COLORS.accent, DANGER = COLORS.danger;

/**
 * Which profile I am using, and a pop-up to change it or add another (a login can have up to 3: businesses and / or a
 * person). Each profile has its own posts, chats and ratings. `label` says what the choice means here ("Posting as").
 * With one profile it shows only where `always` is set (the Me tab, the way to add another).
 */
export function ProfileSwitcher({ label, always = false }: { label?: string; always?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const { profiles, active, switchTo, canAdd } = useProfiles();
  const unread = useProfilesUnread(profiles);
  const [open, setOpen] = useState(false);
  if (!active || (profiles.length < 2 && !always)) return null;
  const others = profiles.filter((p) => p.id !== active.id).reduce((n, p) => n + (unread[p.id] ?? 0), 0);
  const line = (p: BusinessSummary) => [p.kind === "individual" ? tradeLabel(p.trade, p.trade_other, lang) : null, p.city].filter(Boolean).join(" · ");
  const pick = (p: BusinessSummary) => { setOpen(false); if (p.id !== active.id) void switchTo(p); };
  const add = () => { setOpen(false); router.push("/(onboarding)/business"); };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t("profiles.switchA11y", { name: active.name })} onPress={() => setOpen(true)} style={styles.trigger}>
        <Avatar name={active.name} uri={active.logo_url} size={32} />
        <View style={styles.triggerText}>
          {label ? <Text variant="small">{label}</Text> : null}
          <Text variant="label" numberOfLines={1}>{active.name}</Text>
        </View>
        {others ? <View style={styles.count}><Text style={styles.countText}>{others}</Text></View> : null}
        <Icon name="chevron-down" size={18} color={ICON_COLOR.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t("common.close")} />
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.head}>
              <Text variant="heading" style={styles.title}>{t("profiles.title")}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} style={styles.close}>
                <Icon name="close" size={22} color={INK} />
              </Pressable>
            </View>
            <Text style={styles.hint}>{t("profiles.hint")}</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {profiles.map((p) => {
                const selected = p.id === active.id;
                return (
                  <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => pick(p)} style={[styles.row, selected && styles.rowSelected]}>
                    <Avatar name={p.name} uri={p.logo_url} size={40} />
                    <View style={styles.rowText}>
                      <Text variant="label" numberOfLines={1}>{p.name}</Text>
                      <View style={styles.rowLine}>
                        <Icon name={p.kind === "individual" ? "person-outline" : "storefront-outline"} size={14} color={MUTED} />
                        <Text variant="small" numberOfLines={1} style={styles.shrink}>{line(p)}</Text>
                      </View>
                      {p.suspended_at ? <Text style={styles.suspended}>{t("profiles.suspended")}</Text> : null}
                    </View>
                    {unread[p.id] ? <View style={styles.count}><Text style={styles.countText}>{unread[p.id]}</Text></View> : null}
                    <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {canAdd && !profiles.some((p) => p.suspended_at) ? (
              <Pressable accessibilityRole="button" onPress={add} style={styles.add}>
                <Icon name="add" size={20} color={COLORS.brandDark} />
                <Text style={styles.addText}>{t("profiles.add")}</Text>
              </Pressable>
            ) : !canAdd ? <Text style={styles.limit}>{t("profiles.limit", { count: MAX_PROFILES })}</Text> : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: COLORS.surface },
  triggerText: { flex: 1 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: ACCENT },
  countText: { fontSize: 11, lineHeight: 14, fontWeight: "700", color: INK },
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: COLORS.overlay },
  card: {
    width: "100%", maxWidth: 420, maxHeight: "80%", padding: 20, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: LINE,
    shadowColor: COLORS.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, lineHeight: 26 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: -6 },
  hint: { marginTop: 4, fontSize: 14, lineHeight: 20, color: MUTED },
  list: { marginTop: 12, flexGrow: 0 },
  listContent: { gap: 10 },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, borderWidth: 2, borderColor: LINE },
  rowSelected: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  rowText: { flex: 1, gap: 1 },
  rowLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  shrink: { flexShrink: 1 },
  suspended: { fontSize: 12, fontWeight: "600", color: DANGER },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.inkFaint, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: BRAND },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },
  add: { marginTop: 14, minHeight: 48, flexDirection: "row", gap: 6, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: BRAND_LIGHT },
  addText: { fontSize: 16, fontWeight: "600", color: COLORS.brandDark },
  limit: { marginTop: 14, textAlign: "center", fontSize: 13, color: MUTED },
});
