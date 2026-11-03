import { useState } from "react";
import { Modal, Pressable, FlatList, View, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import type { ChipOption } from "./ChipGroup";

/** Up to this many choices without search, the picker opens as a centred card instead of a full screen. */
const COMPACT_MAX = 6;

export function Select({ options, value, onChange, placeholder, searchable = true }: {
  options: ChipOption[]; value?: string | null; onChange: (v: string) => void; placeholder: string; searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const list = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const compact = !searchable && options.length <= COMPACT_MAX;
  const choose = (v: string) => { onChange(v); setOpen(false); };
  const row = (item: ChipOption) => (
    <Pressable key={item.value} accessibilityRole="button" onPress={() => choose(item.value)}
      className={`min-h-[52px] flex-row items-center gap-3 border-b border-line px-2 ${item.value === value ? "bg-brand-light" : ""}`}>
      {item.icon ? <Text className="text-xl">{item.icon}</Text> : null}
      <Text className="flex-1">{item.label}</Text>
      {item.value === value ? <Text className="text-brand">✓</Text> : null}
    </Pressable>
  );
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-line bg-surface px-4">
        <Text className={current ? "text-ink" : "text-ink-faint"}>{current ? `${current.icon ?? ""} ${current.label}`.trim() : placeholder}</Text>
        <Text className="text-ink-faint">▾</Text>
      </Pressable>
      {compact ? (
        // Few choices (e.g. language): a dialog. The screen behind is clearly dimmed, the card stands out (shadow,
        // border, 24 pt padding), every choice is a full-width bordered row with a radio circle, and Cancel is a real
        // button. Tapping outside or Back also closes it. Plain StyleSheet styles: the layout must not depend on
        // utility classes being generated for this one-off component.
        <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.cancel")} onPress={() => setOpen(false)} style={dialog.scrim}>
            <Pressable onPress={() => {}} style={dialog.card}>
              <Text variant="heading" style={dialog.title}>{placeholder}</Text>
              <View style={dialog.options}>
                {options.map((item) => {
                  const selected = item.value === value;
                  return (
                    <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => choose(item.value)}
                      style={[dialog.option, selected && dialog.optionSelected]}>
                      {item.icon ? <Text style={dialog.icon}>{item.icon}</Text> : null}
                      <Text style={[dialog.label, selected && dialog.labelSelected]}>{item.label}</Text>
                      <View style={[dialog.radio, selected && dialog.radioSelected]}>
                        {selected ? <View style={dialog.radioDot} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={dialog.cancel}>
                <Text style={dialog.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
          {/* full screen for long lists; the safe area keeps the title below the status bar / notch */}
          <SafeAreaView className="flex-1 bg-surface px-4 pt-2">
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="heading">{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} className="min-h-[44px] justify-center px-2"><Text className="text-brand">{t("common.done")}</Text></Pressable>
            </View>
            {searchable && (
              <TextInput value={q} onChangeText={setQ} placeholder={t("common.search")} className="mb-3 min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />
            )}
            <FlatList data={list} keyExtractor={(o) => o.value} renderItem={({ item }) => row(item)} />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

// colours = tailwind.config.js tokens (brand, line, ink, surface)
const BRAND = "#1F6F5F", BRAND_LIGHT = "#E6F2EF", BRAND_DARK = "#144A40", LINE = "#E5E7EB", INK = "#111827", INK_FAINT = "#9CA3AF";

/** Dialog layout (Material spacing: 24 pt padding, 56 pt rows, 48 pt button). */
const dialog = StyleSheet.create({
  // dims the screen behind (Material/iOS use roughly 30–50% black) so the dialog clearly stands apart
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    width: "100%", maxWidth: 360, padding: 24, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  title: { textAlign: "center", marginBottom: 20, lineHeight: 30 },
  options: { gap: 10 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: LINE, backgroundColor: "#FFFFFF" },
  optionSelected: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  icon: { fontSize: 20 },
  label: { flex: 1, fontSize: 16, color: INK },
  labelSelected: { fontWeight: "600", color: BRAND_DARK },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: INK_FAINT, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: BRAND },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND },
  cancel: { marginTop: 20, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F7F9" },
  cancelText: { fontSize: 16, fontWeight: "600", color: INK },
});
