import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, ScrollView, Share, View } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, Chip, EmptyState, Screen, Select, Text } from "@/components/ui";
import { ADMIN_PAGE, deleteWord, exportWords, listWordRegions, listWords, renameWord, setWordStatus, wordStatusCounts, WORD_EXPORT_MAX, type WordFlow, type WordRow, type WordStatus } from "@/features/admin/api";
import { ReasonDialog } from "@/features/admin/ReasonDialog";
import { useAdminAction } from "@/features/admin/useAdminAction";
import { placeName, regionOptions, wordsToCsv } from "@/features/admin/words";

const STATUSES: WordStatus[] = ["new", "added", "new_item", "ignored"];
const FLOWS: (WordFlow | "all")[] = ["all", "search", "profile", "post"];

/**
 * What people search for and write under "Other", counted by city and state, most used first: shows what is missing
 * from the app, which region looks for what, and which flow and section it came from. Marking a word is the admin's
 * to-do list; adding it to the app is a separate step (ADMIN.md 3.9). A word can be moved back, corrected or deleted.
 * No names or numbers here: the server keeps counts only.
 */
export default function AdminWords() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const { run, withReason, ask, closeAsk } = useAdminAction();
  const [status, setStatus] = useState<WordStatus>("new");
  const [regionValue, setRegionValue] = useState("all");
  const [onlyNothing, setOnlyNothing] = useState(false);
  const [flowChoice, setFlowChoice] = useState<WordFlow | "all">("all");

  const regions = useQuery({ queryKey: ["admin", "wordRegions"], queryFn: listWordRegions });
  const options = useMemo(() => regionOptions(regions.data ?? [], {
    all: t("admin.words.allRegions"), allCities: (state) => t("admin.words.allCities", { state }), unknown: t("admin.words.noRegion"),
  }), [regions.data, t]);
  const region = options.find((o) => o.value === regionValue) ?? options[0]!;
  const flow = flowChoice === "all" ? null : flowChoice;
  const places = { state: region.state, city: region.city, onlyNothing, flow };
  const filter = { status, ...places };
  // how many words each tab holds, so a marked word can always be found again
  const tabCounts = useQuery({ queryKey: ["admin", "wordStatusCounts", region.state, region.city, onlyNothing, flow], queryFn: () => wordStatusCounts(places) });

  const list = useInfiniteQuery({
    queryKey: ["admin", "words", status, region.state, region.city, onlyNothing, flow],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listWords(filter, pageParam),
    getNextPageParam: (last, all) => (last.length < ADMIN_PAGE ? undefined : all.length * ADMIN_PAGE),
  });
  const rows = list.data?.pages.flat() ?? [];

  const exportCsv = () => run("export_words", async () => {
    const data = await exportWords(places); // every status, whichever tab is open; the status has its own column
    if (!data.length) { Alert.alert(t("admin.words.exportEmpty")); return; }
    await Share.share({ title: t("admin.words.title"), message: wordsToCsv(data) });
    if (data.length >= WORD_EXPORT_MAX) Alert.alert(t("admin.words.exportLimit", { count: WORD_EXPORT_MAX }));
  });

  const regionName = (r: WordRow["regions"][number]) => r.city || r.state || t("admin.words.noRegion");
  const sourceLabels = {
    source: (s: string) => t(`admin.words.sources.${s}`, { defaultValue: s }),
    section: (s: string) => t(`create.pickType_${s}`, { defaultValue: s }),
  };
  const statusName = (s: WordStatus) => t(`admin.words.status.${s}`);
  const mark = (w: WordRow, s: WordStatus) => run("word_status", () => setWordStatus(w.word, s), t("admin.words.moved", { status: statusName(s) }));
  const edit = (w: WordRow) => withReason("word_rename", {
    title: t("admin.words.editTitle"), message: t("admin.words.editHint"), confirm: t("common.save"), optional: true, initial: w.word, placeholder: t("admin.words.editPlaceholder"),
  }, (text) => renameWord(w.word, text));
  const remove = (w: WordRow) => Alert.alert(t("admin.words.deleteTitle", { word: w.word }), t("admin.words.deleteHint"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.words.delete"), style: "destructive", onPress: () => { void run("word_delete", () => deleteWord(w.word)); } },
  ]);
  const item = ({ item: w }: { item: WordRow }) => (
    <Card raised className="mb-3 gap-2">
      <Text variant="label">{w.word}</Text>
      <Text variant="caption">{t("admin.words.counts", { uses: w.uses, nothing: w.found_nothing })}</Text>
      <Text variant="small">{w.regions.map((r) => `${regionName(r)} (${r.uses})`).join(" · ")}</Text>
      {w.places.map((p) => <Text key={`${p.source}:${p.section}`} variant="small">{`${placeName(p, hi, sourceLabels)} (${p.uses})`}</Text>)}
      <View className="flex-row flex-wrap gap-2">
        {STATUSES.filter((s) => s !== status).map((s) => (
          <Button key={s} title={t(`admin.words.mark.${s}`)} variant="secondary" full={false} onPress={() => mark(w, s)} />
        ))}
        <Button title={t("admin.words.edit")} icon="create-outline" variant="ghost" full={false} onPress={() => edit(w)} />
        <Button title={t("admin.words.delete")} icon="trash-outline" variant="ghost" full={false} onPress={() => remove(w)} />
      </View>
    </Card>
  );

  const header = (
    <View className="gap-3 pb-3">
      <Text variant="caption">{t("admin.words.hint")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUSES.map((s) => <Chip key={s} label={`${statusName(s)} (${tabCounts.data?.[s] ?? 0})`} selected={status === s} onPress={() => setStatus(s)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FLOWS.map((f) => <Chip key={f} label={t(`admin.words.flows.${f}`)} selected={flowChoice === f} onPress={() => setFlowChoice(f)} />)}
      </ScrollView>
      <Select placeholder={t("admin.words.region")} value={region.value} options={options} onChange={setRegionValue} />
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Chip label={t("admin.words.onlyNothing")} selected={onlyNothing} onPress={() => setOnlyNothing((v) => !v)} />
        <Button title={t("admin.words.export")} icon="share-outline" variant="secondary" full={false} onPress={exportCsv} />
      </View>
    </View>
  );

  return (
    // Screen (not a plain View): on iOS it starts the list below the see-through header
    <Screen scroll={false} padded={false} muted>
      <FlatList data={rows} keyExtractor={(w) => w.word} renderItem={item} ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()} onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); void regions.refetch(); void tabCounts.refetch(); }} />}
        ListFooterComponent={list.isFetchingNextPage ? <Text variant="caption" className="py-3 text-center">{t("common.loading")}</Text> : undefined}
        ListEmptyComponent={list.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="text-outline" title={t("admin.words.empty")} />} />
      <ReasonDialog request={ask} onClose={closeAsk} />
    </Screen>
  );
}
