import { useMemo, useState } from "react";
import { Modal, Pressable, FlatList, View, TextInput, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { highlightTerms } from "@/lib/highlight";
import { ChoiceCard } from "./ChoiceCard";
import type { ChipOption } from "./ChipGroup";
import { DataIcon, Icon, ICON_COLOR } from "./Icon";
import { InfoDialog } from "./InfoDialog";
import { COLORS } from "@/theme";

/** Up to this many choices without search, the picker opens as a centred card instead of a full screen. */
const COMPACT_MAX = 6;

/** `intro`: one line under the title of the full-screen list (e.g. what the ⓘ means). `alwaysShow`: a choice search never hides ("Other"). `onSearchDone`: when the list closes after a search: the words, and whether the list had an answer. `onChange` also gets the searched words when `alwaysShow` is chosen after a search, so they need not be typed again. */
export function Select({ options, value, onChange, placeholder, searchable = true, intro, alwaysShow, onSearchDone }: {
  options: ChipOption[]; value?: string | null; onChange: (v: string, searched?: string) => void; placeholder: string; searchable?: boolean; intro?: string; alwaysShow?: string; onSearchDone?: (word: string, found: boolean) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets(); // of the screen: the full-screen list below uses them (see there)
  const [q, setQ] = useState("");
  const [about, setAbout] = useState<ChipOption | null>(null); // the choice whose ⓘ is open
  const current = options.find((o) => o.value === value);
  // search the name, the hint line and the hidden search words ("bijli", "light"…), in any order of words
  // NFC: Hindi letters with a dot (ज़, ड़) arrive in two forms depending on the keyboard
  const needle = q.normalize("NFC").trim().toLowerCase();
  const terms = useMemo(() => highlightTerms(q), [q]); // marked in the cards, as on the search page
  const list = needle ? options.filter((o) => {
    if (o.value === alwaysShow) return true;
    const hay = `${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`.normalize("NFC").toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  }) : options;
  const compact = !searchable && options.length <= COMPACT_MAX;
  const reset = () => { setOpen(false); setQ(""); };
  const searchDone = (picked?: string) => {
    if (needle) onSearchDone?.(q.trim(), picked !== alwaysShow || picked === undefined ? list.some((o) => o.value !== alwaysShow) : false);
  };
  const close = () => { searchDone(); reset(); };
  const choose = (v: string) => {
    searchDone(v);
    if (needle && v === alwaysShow) onChange(v, q.trim());
    else onChange(v);
    reset();
  };
  const notInList = !!needle && !!alwaysShow && !list.some((o) => o.value !== alwaysShow);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-line bg-surface px-4">
        <View className="flex-1 flex-row items-center gap-2">
          {current?.icon ? <DataIcon value={current.icon} size={20} /> : null}
          <Text className={current ? "text-ink" : "text-ink-faint"}>{current ? current.label : placeholder}</Text>
        </View>
        <Icon name="chevron-down" size={18} color={ICON_COLOR.faint} />
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
                      {item.icon ? <DataIcon value={item.icon} size={20} /> : null}
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
        <Modal visible={open} animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
          {/* Full screen for long lists. A Modal is its own native window, where SafeAreaView measured no insets on
              iPhone (the title sat under the status bar): the screen's insets are applied by hand instead, and the
              window is edge-to-edge on Android too, so both phones lay it out the same way. */}
          <View style={[list_.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
            <View style={list_.header}>
              <Text accessibilityRole="header" style={list_.title}>{placeholder}</Text>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={6} style={list_.close}>
                <Icon name="close" size={22} color={INK} />
              </Pressable>
            </View>
            {intro ? <Text style={list_.intro}>{intro}</Text> : null}
            {searchable && (
              <View style={list_.search}>
                <Icon name="search" size={20} color={ICON_COLOR.muted} />
                <TextInput value={q} onChangeText={setQ} placeholder={t("common.search")} placeholderTextColor={ICON_COLOR.muted} autoCorrect={false} accessibilityLabel={t("common.search")} style={list_.searchInput} />
                {q ? <Pressable onPress={() => setQ("")} accessibilityRole="button" accessibilityLabel={t("search.clear")} hitSlop={8}><Icon name="close-circle" size={20} color={ICON_COLOR.faint} /></Pressable> : null}
              </View>
            )}
            <FlatList data={list} keyExtractor={(o) => o.value} renderItem={({ item }) => (
                <ChoiceCard label={item.label} hint={item.hint} icon={item.icon} selected={item.value === value} onPress={() => choose(item.value)}
                  onInfo={item.info ? () => setAbout(item) : undefined} infoLabel={t("common.whatIsIncluded", { name: item.label })} highlight={terms} />
              )} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              contentContainerStyle={list_.items}
              ListHeaderComponent={notInList ? <View style={list_.notInList}><Icon name="help-circle-outline" size={20} color={BRAND_DARK} /><Text style={list_.notInListText}>{t("common.notInList", { word: q.trim() })}</Text></View> : undefined}
              ListEmptyComponent={<View style={list_.empty}><Icon name="search-outline" size={40} color={ICON_COLOR.faint} /><Text style={list_.hint}>{t("search.empty")}</Text></View>} />
            {/* inside this Modal, so it opens on top of the list (iPhone and Android) */}
            <InfoDialog info={about?.info ?? null} searched={q} onClose={() => setAbout(null)} chooseLabel={t("common.chooseThis")}
              onChoose={() => { if (about) choose(about.value); setAbout(null); }} />
          </View>
        </Modal>
      )}
    </>
  );
}

// colours = tailwind.config.js tokens (brand, line, ink, surface)
const BRAND = COLORS.brand, BRAND_LIGHT = COLORS.brandLight, BRAND_DARK = COLORS.brandDark, LINE = COLORS.line, INK = COLORS.ink, INK_FAINT = COLORS.inkFaint;

/** The full-screen list (plain styles, like the dialog below: the look must not depend on generated classes). */
const list_ = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.surfaceMuted },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "700", color: INK },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: LINE },
  intro: { marginTop: 2, fontSize: 14, lineHeight: 20, color: ICON_COLOR.muted },
  search: { marginTop: 12, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: COLORS.surface },
  searchInput: { flex: 1, minHeight: 46, fontSize: 16, color: INK },
  items: { gap: 10, paddingTop: 14, paddingBottom: 24 },
  hint: { fontSize: 13, lineHeight: 18, color: ICON_COLOR.muted },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  notInList: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: BRAND_LIGHT },
  notInListText: { flex: 1, fontSize: 14, lineHeight: 20, color: BRAND_DARK },
});

/** Dialog layout (Material spacing: 24 pt padding, 56 pt rows, 48 pt button). */
const dialog = StyleSheet.create({
  // dims the screen behind (Material/iOS use roughly 30–50% black) so the dialog clearly stands apart
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: COLORS.overlay },
  card: {
    width: "100%", maxWidth: 360, padding: 24, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: LINE,
    shadowColor: COLORS.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  title: { textAlign: "center", marginBottom: 20, lineHeight: 30 },
  options: { gap: 10 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: LINE, backgroundColor: COLORS.surface },
  optionSelected: { borderColor: BRAND, backgroundColor: BRAND_LIGHT },
  label: { flex: 1, fontSize: 16, color: INK },
  labelSelected: { fontWeight: "600", color: BRAND_DARK },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: INK_FAINT, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: BRAND },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND },
  cancel: { marginTop: 20, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceMuted },
  cancelText: { fontSize: 16, fontWeight: "600", color: INK },
});
