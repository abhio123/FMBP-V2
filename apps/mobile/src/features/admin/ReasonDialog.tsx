import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text, TextBox } from "@/components/ui";
import { COLORS } from "@/theme";

// colours = tailwind.config.js tokens (ink, ink-muted, line, danger, brand)
const INK = COLORS.ink, INK_MUTED = COLORS.inkMuted, LINE = COLORS.line, DANGER = COLORS.danger, BRAND = COLORS.brand;

export type ReasonRequest = { title: string; message: string; confirm: string; destructive?: boolean; optional?: boolean; initial?: string; placeholder?: string; onSubmit: (reason: string) => Promise<void> };

/**
 * Confirm an admin action with a reason (suspend, remove a post, reject a document…). The reason is shown to the
 * business where it applies and kept in the admin log. Same card on iPhone and Android (Alert.prompt is iOS only).
 */
export function ReasonDialog({ request, onClose }: { request: ReasonRequest | null; onClose: () => void }) {
  return (
    <Modal visible={!!request} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* mounted only while open, so every request starts with an empty reason */}
      {request ? <ReasonForm request={request} onClose={onClose} /> : null}
    </Modal>
  );
}

function ReasonForm({ request, onClose }: { request: ReasonRequest; onClose: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState(request.initial ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = request.optional || reason.trim().length >= 3;
  const close = () => { if (!busy) onClose(); };
  const submit = async () => {
    if (!ok) return;
    setBusy(true); setErr(null);
    try { await request.onSubmit(reason.trim()); onClose(); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={t("common.cancel")} />
      <View style={styles.card}>
        <Text variant="heading">{request.title}</Text>
        <Text style={styles.message}>{request.message}</Text>
        <TextBox value={reason} onChangeText={setReason} multiline maxLength={300} autoFocus
          placeholder={request.placeholder ?? (request.optional ? t("admin.noteOptional") : t("admin.reasonPlaceholder"))} placeholderTextColor={INK_MUTED} style={styles.input} />
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <Pressable accessibilityRole="button" disabled={!ok || busy} onPress={submit}
          style={[styles.primary, { backgroundColor: request.destructive ? DANGER : BRAND }, (!ok || busy) && styles.disabled]}>
          <Text style={styles.primaryText}>{busy ? t("common.loading") : request.confirm}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: COLORS.overlay },
  card: {
    width: "100%", maxWidth: 420, padding: 20, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: LINE,
    shadowColor: COLORS.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  message: { fontSize: 14, color: INK_MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  input: { minHeight: 88, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: INK, textAlignVertical: "top" },
  error: { marginTop: 8, color: DANGER, fontSize: 13 },
  primary: { marginTop: 16, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  primaryText: { fontSize: 16, fontWeight: "700", color: COLORS.white },
  cancel: { marginTop: 10, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceMuted },
  cancelText: { fontSize: 16, fontWeight: "600", color: INK },
});
