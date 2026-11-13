import { useState } from "react";
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme";
import { Text } from "./Text";

type Props = Omit<TextInputProps, "value" | "onChangeText" | "maxLength" | "multiline" | "style"> & {
  value: string;
  onChangeText: (text: string) => void;
  /** the most characters this place takes (TEXT_LIMITS in @fmbp/shared, the same as the server) */
  maxLength: number;
  /** several lines with Enter for a new line (descriptions, notes); otherwise one answer that wraps but has no Enter */
  multiline?: boolean;
  /** "brand": the green border of a box that just opened (the "Other" box) */
  tone?: "default" | "brand";
  style?: StyleProp<TextStyle>;
};

/**
 * Every text box where people write freely. Long text wraps and the box grows with it (a one-line field let long
 * text spill outside its border on iPhone). Near the limit a counter shows how much room is left; at the limit, or when
 * pasted text was too long and cut, a red line says why nothing more goes in, so nobody wonders why a post, profile or
 * message does not take their text. Same on iPhone and Android.
 */
export function TextBox({ value, onChangeText, maxLength, multiline = false, tone = "default", style, ...rest }: Props) {
  const [cut, setCut] = useState(false);
  const change = (raw: string) => {
    // one answer: a new line becomes a space (Enter closes the keyboard instead)
    const limited = limitText(multiline ? raw : raw.replace(/\s*\n+\s*/g, " "), maxLength);
    setCut(limited.cut);
    onChangeText(limited.text);
  };
  const full = value.length >= maxLength;
  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        value={value}
        onChangeText={change}
        multiline // wraps long text on both phones; for one answer Enter submits instead of adding a line
        scrollEnabled={multiline}
        submitBehavior={multiline ? "newline" : "blurAndSubmit"}
        returnKeyType={multiline ? "default" : rest.returnKeyType ?? "done"}
        placeholderTextColor={rest.placeholderTextColor ?? COLORS.inkFaint}
        style={[styles.input, multiline && styles.long, tone === "brand" && styles.brand, (full || cut) && styles.atLimit, style]}
      />
      <TextLimitNote used={value.length} max={maxLength} cut={cut} />
    </View>
  );
}

/** Keeps text within `max` and says whether something was cut (pasted text that was too long). */
export function limitText(raw: string, max: number): { text: string; cut: boolean } {
  return { text: raw.slice(0, max), cut: raw.length > max };
}

/**
 * The line under a text box: from 80% of the limit a counter ("1950/2000"); at the limit, or when pasted text was cut,
 * a red sentence saying so. Nothing while there is plenty of room.
 */
export function TextLimitNote({ used, max, cut = false }: { used: number; max: number; cut?: boolean }) {
  const { t } = useTranslation();
  const full = used >= max;
  if (!cut && used < Math.floor(max * 0.8)) return null;
  const message = cut ? t("common.textCut", { max }) : full ? t("common.textLimit", { max }) : null;
  return (
    <View style={styles.footer} accessibilityLiveRegion="polite">
      <Text style={[styles.note, message ? styles.error : null]}>{message ?? ""}</Text>
      <Text style={[styles.count, full || cut ? styles.error : null]}>{t("common.charCount", { used, max })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  input: {
    minHeight: 48, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line,
    backgroundColor: COLORS.surface, fontSize: 16, color: COLORS.ink, textAlignVertical: "top",
  },
  long: { minHeight: 96, maxHeight: 220 },
  brand: { borderColor: COLORS.brand, borderRadius: 14 },
  atLimit: { borderColor: COLORS.danger },
  footer: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  note: { flex: 1, fontSize: 13, lineHeight: 18, color: COLORS.inkMuted },
  count: { fontSize: 13, lineHeight: 18, color: COLORS.inkMuted },
  error: { color: COLORS.danger },
});
