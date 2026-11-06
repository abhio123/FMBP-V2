import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { dayLabel, formatTime } from "@fmbp/shared";
import { Icon, Text, type IconName } from "@/components/ui";
import { splitLinks } from "@/lib/links";
import { inboxIcon, type InboxItem } from "./api";

// colours = tailwind.config.js tokens (brand, brand-light, line, ink)
const BRAND = "#1F6F5F", BRAND_LIGHT = "#E6F2EF", LINE = "#E5E7EB", INK = "#111827";

/** Button label for the screen a notification leads to (null: nothing to open). */
const OPEN_LABEL: Record<string, string> = {
  response: "inbox.openPost", followed_post: "inbox.openPost", deal_proposed: "inbox.openDeals", deal_confirmed: "inbox.openDeals",
  verification_result: "inbox.openVerification", post_removed: "inbox.openMyPosts",
};

/**
 * One notification over the list, like the language picker: dimmed screen behind, a card with the whole text, ✕ to
 * close; tapping outside or Back also closes it. Web links are tappable only in broadcasts (written by FMBP admins);
 * in other notifications, text typed by users stays plain (a link there could be phishing). When the notification is
 * about something (a post, a deal, verification), a button opens it.
 */
export function NotificationDialog({ item, onClose, onOpen }: { item: InboxItem | null; onClose: () => void; onOpen: (n: InboxItem) => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert(t("common.error"), t("inbox.linkFailed")));
  };
  const openLabel = item ? OPEN_LABEL[item.kind] : undefined;
  const links = item?.kind === "broadcast";
  return (
    <Modal visible={!!item} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        {/* behind the card: tapping the dimmed screen closes */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} />
        {item ? (
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.head}>
              <View style={styles.badge}><Icon name={inboxIcon(item.kind) as IconName} size={22} color={BRAND} /></View>
              <View style={styles.headText}>
                <Text variant="heading" style={styles.title}>{item.title}</Text>
                <Text variant="small">{dayLabel(item.created_at, lang)} · {formatTime(item.created_at)}</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} style={styles.close}>
                <Icon name="close" size={22} color={INK} />
              </Pressable>
            </View>
            {item.body ? (
              <ScrollView style={styles.bodyBox} contentContainerStyle={styles.bodyContent}>
                <Text selectable style={styles.body}>
                  {(links ? splitLinks(item.body) : [{ text: item.body }]).map((p, i) => (p.url
                    ? <Text key={i} style={styles.link} accessibilityRole="link" onPress={() => openLink(p.url!)}>{p.text}</Text>
                    : <Text key={i}>{p.text}</Text>))}
                </Text>
              </ScrollView>
            ) : null}
            {openLabel ? (
              <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={styles.primary}>
                <Text style={styles.primaryText}>{t(openLabel)}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    width: "100%", maxWidth: 420, maxHeight: "80%", padding: 20, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND_LIGHT, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, gap: 2 },
  title: { lineHeight: 26 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: -6, marginRight: -6 },
  bodyBox: { marginTop: 14, flexGrow: 0 },
  bodyContent: { paddingBottom: 2 },
  body: { fontSize: 16, lineHeight: 24, color: INK },
  link: { color: BRAND, textDecorationLine: "underline", fontWeight: "600" },
  primary: { marginTop: 18, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: BRAND },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
