import { useState, useEffect, useMemo } from "react";
import { View, TextInput, ScrollView, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, TrustRow, EmptyState, Highlight, Chip, Icon, DataIcon, ICON_COLOR, type IconName } from "@/components/ui";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "@/features/search/recent";
import { searchAll } from "@/features/search/api";
import { recordWord } from "@/features/search/wordLog";
import { PostCard } from "@/features/posts/PostCard";
import { track } from "@/lib/analytics";
import { highlightTerms } from "@/lib/highlight";
import { COLORS } from "@/theme";

/**
 * Example searches shown while the box is empty (one tap fills it). The search term is English because most post titles
 * are; the label follows the app language.
 */
const EXAMPLES = [
  ["Cook", "रसोइया"], ["Tailor", "दर्ज़ी"], ["Electrician", "इलेक्ट्रीशियन"], ["Bike", "बाइक"], ["Shop", "दुकान"],
  ["Tiffin", "टिफ़िन"], ["Delivery", "डिलीवरी"], ["Tuition", "ट्यूशन"], ["Investment", "निवेश"], ["Partner", "पार्टनर"],
] as const;
/** What the search covers, in plain words (for people new to the app). */
const GUIDE: readonly (readonly [IconName, string])[] = [
  ["hammer-outline", "search.guide.skills"], ["bicycle-outline", "search.guide.rent"], ["storefront-outline", "search.guide.space"], ["people-circle-outline", "search.guide.partners"], ["business-outline", "search.guide.businesses"],
] as const;

export default function Search() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const h = setTimeout(() => setDebounced(q.trim()), 350); return () => clearTimeout(h); }, [q]);
  const res = useQuery({ queryKey: ["search", debounced], enabled: debounced.length >= 2, queryFn: () => searchAll(debounced) });
  useEffect(() => { if (debounced.length >= 2) track("search", { length: debounced.length }); }, [debounced]);
  // highlight the words of the query that produced these results, so each result shows what it matched
  const terms = useMemo(() => highlightTerms(debounced), [debounced]);
  const empty = res.data && !res.data.posts.length && !res.data.offerings.length && !res.data.businesses.length;
  // "Words people use" (admin): once they stop typing for a moment, so "electrician" does not also count "elect"
  useEffect(() => {
    if (debounced.length < 2 || !res.data) return;
    const h = setTimeout(() => recordWord(debounced, "search", !empty), 2000);
    return () => clearTimeout(h);
  }, [debounced, res.data, empty]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { void getRecentSearches().then(setRecent); }, []);
  /** Search right away (suggestion tapped or Search pressed) and remember it. */
  const runSearch = (term: string) => {
    setQ(term); setDebounced(term.trim());
    void addRecentSearch(term).then(setRecent);
  };
  const idle = debounced.length < 2;

  return (
    <Screen scroll={false} muted>
      <View className="gap-1 pb-3 pt-2">
        <Text variant="title">{t("search.title")}</Text>
        <Text variant="caption">{t("search.subtitle")}</Text>
      </View>
      {/* search box: magnifier, text, and a clear button once something is typed */}
      <View className="mb-3 min-h-[52px] flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3">
        <Ionicons name="search" size={20} color={COLORS.inkMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={t("search.placeholder")} autoCorrect={false} returnKeyType="search"
          onSubmitEditing={() => runSearch(q)} accessibilityLabel={t("search.title")} className="min-h-[48px] flex-1 text-[16px] text-ink" />
        {q ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("search.clear")} hitSlop={8} onPress={() => { setQ(""); setDebounced(""); }} className="h-8 w-8 items-center justify-center">
            <Ionicons name="close-circle" size={20} color={COLORS.inkFaint} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        {idle ? (
          // nothing searched yet: recent searches, examples to tap, and what can be found here
          <View className="gap-5 pb-8">
            {q.trim().length === 1 ? <Text variant="caption">{t("search.minLetters")}</Text> : null}
            {recent.length ? (
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text variant="label">{t("search.recent")}</Text>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { void clearRecentSearches(); setRecent([]); }}>
                    <Text variant="caption" className="text-brand">{t("search.clearRecent")}</Text>
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {recent.map((term) => <Chip key={term} label={`↺ ${term}`} selected={false} onPress={() => runSearch(term)} />)}
                </View>
              </View>
            ) : null}
            <View className="gap-2">
              <Text variant="label">{t("search.tryThese")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {EXAMPLES.map(([term, hiLabel]) => <Chip key={term} label={hi ? hiLabel : term} selected={false} onPress={() => runSearch(term)} />)}
              </View>
            </View>
            <Card className="gap-3">
              <Text variant="label">{t("search.guideTitle")}</Text>
              {GUIDE.map(([icon, key]) => (
                <View key={key} className="flex-row items-center gap-3">
                  <Icon name={icon} size={22} color={ICON_COLOR.brand} />
                  <Text variant="caption" className="flex-1">{t(key)}</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
        {res.isFetching ? <Text variant="caption">{t("common.loading")}</Text> : null}
        {empty ? <EmptyState title={t("search.empty")} /> : null}
        {res.data?.posts.length ? (<>
          <Text variant="label" className="mb-2">{t("search.posts")}</Text>
          {res.data.posts.map((p) => <PostCard key={p.id} post={p} highlight={terms} />)}
        </>) : null}
        {res.data?.offerings.length ? (<>
          <Text variant="label" className="mb-2 mt-2">{t("search.offerings")}</Text>
          {res.data.offerings.map((o) => (
            <Card key={o.id} raised className="mb-3" onPress={() => o.business && router.push({ pathname: "/business/[id]", params: { id: o.business.id } })}>
              <View className="flex-row items-center gap-1.5"><DataIcon value={o.offering_type?.icon} size={14} color={ICON_COLOR.faint} /><Text variant="small">{hi ? o.offering_type?.name_hi : o.offering_type?.name_en}</Text></View>
              <Highlight variant="heading" text={o.title} terms={terms} />
              {o.description ? <Highlight variant="caption" numberOfLines={2} text={o.description} terms={terms} /> : null}
              {o.business ? <View className="mt-2"><TrustRow name={o.business.name} verified={o.business.verification_status === "verified"} city={o.city} highlight={terms} /></View> : null}
            </Card>
          ))}
        </>) : null}
        {res.data?.businesses.length ? (<>
          <Text variant="label" className="mb-2 mt-2">{t("search.businesses")}</Text>
          {res.data.businesses.map((b) => (
            <Card key={b.id} raised className="mb-3" onPress={() => router.push({ pathname: "/business/[id]", params: { id: b.id } })}>
              <TrustRow avatar logoUrl={b.logo_url} name={b.name} verified={b.verification_status === "verified"} city={b.city} kind={b.kind} trade={b.trade} tradeOther={b.trade_other} category={hi ? b.category?.name_hi : b.category?.name_en} highlight={terms} />
            </Card>
          ))}
        </>) : null}
      </ScrollView>
    </Screen>
  );
}
