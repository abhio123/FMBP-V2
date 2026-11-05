import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui";
import { REPORT_REASONS, type ReportReason } from "./api";

// colours = tailwind.config.js tokens (brand, brand-light, brand-dark, line, ink, ink-faint, danger)
const BRAND = "#1F6F5F", BRAND_LIGHT = "#E6F2EF", BRAND_DARK = "#144A40", LINE = "#E5E7EB", INK = "#111827", INK_FAINT = "#9CA3AF", DANGER = "#B91C1C";

/**
 * "Why are you reporting this?": one reason (radio rows, like the language dialog) and an optional note.
 * Plain StyleSheet styles so the dialog never depends on utility classes being generated.
 */
export function ReportDialog({ visible, title, onClose, onSubmit }: {
  visible: boolean; title: string; onClose: () => void; onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = () => { if (busy) return; setReason(null); setDetails(""); setErr(null); onClose(); };
  const send = async () => {
    if (!reason) return;
    setBusy(true); setErr(null);
    try { await onSubmit(reason, details); setReason(null); setDetails(""); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={t("common.cancel")} />
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="heading" style={styles.heading}>{title}</Text>
            <Text style={styles.question}>{t("safety.reportTitle")}</Text>
            <View style={styles.options}>
              {REPORT_REASONS.map((r) => {
                const selected = reason === r;
                return (
                  <Pressable key={r} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setReason(r)}
                    style={[styles.option, selected && styles.optionSelected]}>
                    <Text style={[styles.label, selected && styles.labelSelected]}>{t(`safety.reasons.${r}`)}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.noteLabel}>{t("safety.reportNote")}</Text>
            <TextInput value={details} onChangeText={setDetails} multiline maxLength={500} placeholder={t("safety.reportNotePlaceholder")}
              placeholderTextColor={INK_FAINT} style={styles.note} accessibilityLabel={t("safety.reportNote")} />
            {err ? <Text style={styles.error}>{err}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !reason || busy }} disabled={!reason || busy} onPress={send}
              style={[styles.send, (!reason || busy) && styles.sendDisabled]}>
              <Text style={styles.sendText}>{busy ? t("common.loading") : t("safety.submit")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    width: "100%", maxWidth: 420, maxHeight: "88%", padding: 20, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  heading: { marginBottom: 4 },
  question: { fontSize: 15, color: INK, marginBottom: 12 },
  options: { gap: 8 },
  option: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, borderColor: LINE },
  optionSelected: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  label: { flex: 1, fontSize: 15, color: INK },
  labelSelected: { fontWeight: "600", color: BRAND_DARK },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: INK_FAINT, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: BRAND },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },
  noteLabel: { marginTop: 16, marginBottom: 6, fontSize: 14, fontWeight: "600", color: INK },
  note: { minHeight: 80, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: INK, textAlignVertical: "top" },
  error: { marginTop: 8, color: DANGER, fontSize: 13 },
  send: { marginTop: 16, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: DANGER },
  sendDisabled: { opacity: 0.4 },
  sendText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancel: { marginTop: 10, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F7F9" },
  cancelText: { fontSize: 16, fontWeight: "600", color: INK },
});
