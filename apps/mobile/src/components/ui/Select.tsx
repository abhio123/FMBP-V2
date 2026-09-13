import { useState } from "react";
import { Modal, Pressable, FlatList, View, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import type { ChipOption } from "./ChipGroup";

export function Select({ options, value, onChange, placeholder, searchable = true }: {
  options: ChipOption[]; value?: string | null; onChange: (v: string) => void; placeholder: string; searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const list = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-line bg-surface px-4">
        <Text className={current ? "text-ink" : "text-ink-faint"}>{current ? `${current.icon ?? ""} ${current.label}`.trim() : placeholder}</Text>
        <Text className="text-ink-faint">▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-surface px-4 pt-12">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="heading">{placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} className="min-h-[44px] justify-center px-2"><Text className="text-brand">{t("common.done")}</Text></Pressable>
          </View>
          {searchable && (
            <TextInput value={q} onChangeText={setQ} placeholder={t("common.search")} className="mb-3 min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />
          )}
          <FlatList
            data={list}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.value); setOpen(false); }} className={`min-h-[52px] flex-row items-center gap-3 border-b border-line px-2 ${item.value === value ? "bg-brand-light" : ""}`}>
                {item.icon ? <Text className="text-xl">{item.icon}</Text> : null}
                <Text>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
