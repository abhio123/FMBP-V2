import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Avatar, Text } from "@/components/ui";
import { getDealCandidates } from "./api";

// colours = tailwind.config.js tokens (brand, brand-light, brand-dark, line, ink, ink-muted, ink-faint)
const BRAND = "#1F6F5F", BRAND_LIGHT = "#E6F2EF", BRAND_DARK = "#144A40", LINE = "#E5E7EB", INK = "#111827", INK_MUTED = "#6B7280", INK_FAINT = "#9CA3AF";
const OUTSIDE = "outside", NONE = "none";

/**
 * Closing a post: "Did you find someone on FMBP?" One tap on a business that responded to or chatted about the post
 * (it then confirms the deal), or "Someone outside FMBP" / "No, just close it" (the post closes, nothing counts).
 * `onSubmit(partnerId)`: null = close without a deal.
 */
export function CloseDealDialog({ postId, visible, onClose, onSubmit }: {
  postId: string; visible: boolean; onClose: () => void; onSubmit: (partnerId: string | null) => Promise<void>;
}) {
  const { t } = useTranslation();
  const candidates = useQuery({ queryKey: ["deal_candidates", postId], enabled: visible, queryFn: () => getDealCandidates(postId) });
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = () => { if (busy) return; setChoice(null); setErr(null); onClose(); };
  const submit = async () => {
    if (!choice) return;
    setBusy(true); setErr(null);
    try { await onSubmit(choice === OUTSIDE || choice === NONE ? null : choice); setChoice(null); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const option = (value: string, label: string, hint?: string, avatar?: { name: string; logo: string | null }) => {
    const selected = choice === value;
    return (
      <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setChoice(value)}
        style={[styles.option, selected && styles.optionSelected]}>
        {avatar ? <Avatar name={avatar.name} uri={avatar.logo} size={36} /> : null}
        <View style={styles.optionText}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      </Pressable>
    );
  };
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={t("common.cancel")} />
        <View style={styles.card}>
          <ScrollView>
            <Text variant="heading" style={styles.heading}>{t("deals.closeTitle")}</Text>
            <Text style={styles.intro}>{t("deals.closeHint")}</Text>
            <View style={styles.options}>
              {candidates.isLoading ? <Text style={styles.hint}>{t("common.loading")}</Text>
                : candidates.data?.length ? candidates.data.map((c) => option(c.business_id, c.name, undefined, { name: c.name, logo: c.logo_url }))
                : <Text style={styles.hint}>{t("deals.noCandidates")}</Text>}
              {option(OUTSIDE, t("deals.outside"), t("deals.outsideHint"))}
              {option(NONE, t("deals.justClose"))}
            </View>
            {err ? <Text style={styles.error}>{err}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !choice || busy }} disabled={!choice || busy} onPress={submit}
              style={[styles.primary, (!choice || busy) && styles.disabled]}>
              <Text style={styles.primaryText}>{busy ? t("common.loading") : t("deals.close")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    width: "100%", maxWidth: 420, maxHeight: "88%", padding: 20, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  heading: { marginBottom: 6 },
  intro: { fontSize: 14, color: INK_MUTED, marginBottom: 14, lineHeight: 20 },
  options: { gap: 8 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: LINE },
  optionSelected: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  optionText: { flex: 1 },
  label: { fontSize: 15, color: INK },
  labelSelected: { fontWeight: "600", color: BRAND_DARK },
  hint: { fontSize: 13, color: INK_MUTED, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: INK_FAINT, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: BRAND },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },
  error: { marginTop: 8, color: "#B91C1C", fontSize: 13 },
  primary: { marginTop: 16, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: BRAND },
  disabled: { opacity: 0.4 },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancel: { marginTop: 10, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F7F9" },
  cancelText: { fontSize: 16, fontWeight: "600", color: INK },
});
