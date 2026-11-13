import { useEffect, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card, EmptyState, Text, Icon, ICON_COLOR } from "@/components/ui";
import { adminSearch, type SearchHit } from "@/features/admin/api";
import { COLORS } from "@/theme";

/**
 * Find any business (name, business phone or login number) or post (title), including suspended, deleted and hidden
 * ones. A post opens its business, where the post can be removed or restored.
 */
export default function AdminSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 350); return () => clearTimeout(id); }, [q]);
  const res = useQuery({ queryKey: ["admin", "search", debounced], enabled: debounced.length >= 2, queryFn: () => adminSearch(debounced) });
  // a post opens its business: its posts are listed there with Remove / Restore
  const open = (h: SearchHit) => router.push({ pathname: "/admin/business/[id]", params: { id: h.business_id } });
  const item = ({ item: h }: { item: SearchHit }) => (
    <Card raised className="mb-3" onPress={() => open(h)}>
      <View className="flex-row items-center gap-3">
        <Icon name={h.kind === "business" ? "storefront-outline" : "pin-outline"} size={22} color={ICON_COLOR.brand} />
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>{h.title}</Text>
          <Text variant="caption" numberOfLines={1}>{h.subtitle}</Text>
          {h.flags.length ? <Text variant="small" className="font-semibold text-danger">{h.flags.map((f) => t(`admin.flags.${f}`, { defaultValue: f })).join(" · ")}</Text> : null}
        </View>
        <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
      </View>
    </Card>
  );
  return (
    <View className="flex-1 bg-surface-muted px-4 pt-3">
      <View className="mb-3 min-h-[52px] flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3">
        <Ionicons name="search" size={20} color={COLORS.inkMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={t("admin.searchPlaceholder")} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
          accessibilityLabel={t("admin.tabs.search")} className="min-h-[48px] flex-1 text-[16px] text-ink" />
      </View>
      <FlatList data={debounced.length >= 2 ? res.data ?? [] : []} keyExtractor={(h) => `${h.kind}:${h.id}`} renderItem={item}
        keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={debounced.length < 2 ? <Text variant="caption">{t("admin.searchHint")}</Text>
          : res.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : res.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => res.refetch()} />
          : <EmptyState icon="search-outline" title={t("search.empty")} />} />
    </View>
  );
}
