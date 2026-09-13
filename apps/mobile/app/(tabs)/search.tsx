import { useState, useEffect } from "react";
import { View, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, TrustRow, EmptyState } from "@/components/ui";
import { searchAll } from "@/features/search/api";
import { PostCard } from "@/features/posts/PostCard";
import { track } from "@/lib/analytics";

export default function Search() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const h = setTimeout(() => setDebounced(q.trim()), 350); return () => clearTimeout(h); }, [q]);
  const res = useQuery({ queryKey: ["search", debounced], enabled: debounced.length >= 2, queryFn: () => searchAll(debounced) });
  useEffect(() => { if (debounced.length >= 2) track("search", { q: debounced }); }, [debounced]);
  const empty = res.data && !res.data.posts.length && !res.data.offerings.length && !res.data.businesses.length;

  return (
    <Screen scroll={false}>
      <TextInput value={q} onChangeText={setQ} placeholder={t("search.placeholder")} autoCorrect={false} returnKeyType="search"
        className="mb-3 mt-2 min-h-[48px] rounded-xl border border-line bg-surface-muted px-4 text-base text-ink" />
      <ScrollView keyboardShouldPersistTaps="handled">
        {res.isFetching ? <Text variant="caption">{t("common.loading")}</Text> : null}
        {empty ? <EmptyState title={t("search.empty")} /> : null}
        {res.data?.posts.length ? (<>
          <Text variant="label" className="mb-2">{t("search.posts")}</Text>
          {res.data.posts.map((p) => <PostCard key={p.id} post={p} />)}
        </>) : null}
        {res.data?.offerings.length ? (<>
          <Text variant="label" className="mb-2 mt-2">{t("search.offerings")}</Text>
          {res.data.offerings.map((o) => (
            <Card key={o.id} className="mb-3" onPress={() => o.business && router.push({ pathname: "/business/[id]", params: { id: o.business.id } })}>
              <Text variant="small">{o.offering_type?.icon} {hi ? o.offering_type?.name_hi : o.offering_type?.name_en}</Text>
              <Text variant="heading">{o.title}</Text>
              {o.description ? <Text variant="caption" numberOfLines={2}>{o.description}</Text> : null}
              {o.business ? <View className="mt-2"><TrustRow name={o.business.name} verified={o.business.verification_status === "verified"} city={o.city} /></View> : null}
            </Card>
          ))}
        </>) : null}
        {res.data?.businesses.length ? (<>
          <Text variant="label" className="mb-2 mt-2">{t("search.businesses")}</Text>
          {res.data.businesses.map((b) => (
            <Card key={b.id} className="mb-3" onPress={() => router.push({ pathname: "/business/[id]", params: { id: b.id } })}>
              <TrustRow name={b.name} verified={b.verification_status === "verified"} city={b.city} category={hi ? b.category?.name_hi : b.category?.name_en} />
            </Card>
          ))}
        </>) : null}
      </ScrollView>
    </Screen>
  );
}
