import { useEffect, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChoiceCard, Screen, Text, EmptyState, Icon, iconFor, InfoDialog, type IconName, type InfoContent } from "@/components/ui";
import { listIntentions, listPostTypes } from "@/features/posts/api";
import { findTypes, otherAnswers, OTHER_TYPES } from "@/features/posts/typeSearch";
import { recordWord } from "@/features/search/wordLog";
import { highlightTerms } from "@/lib/highlight";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";
import { COLORS } from "@/theme";

/** Heading per choice on the Post screen; any other intention gets the generic one. */
const HEADINGS: Record<string, string> = { need: "create.pickType_need", offer: "create.pickType_offer", announce: "create.pickType_announce" };

type PostType = Awaited<ReturnType<typeof listPostTypes>>[number];

export default function CreateType() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const { intentionId, setPostType, setValues } = useCreatePost();
  const [q, setQ] = useState("");
  const [about, setAbout] = useState<{ type: PostType; info: InfoContent } | null>(null); // the choice whose ⓘ is open
  const types = useQuery({ queryKey: ["post_types", intentionId], enabled: !!intentionId, staleTime: 10 * 60_000, queryFn: () => listPostTypes(intentionId!) });
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 }); // cached by the Post screen
  const slug = intentions.data?.find((i) => i.id === intentionId)?.slug;
  const subLabel = (p: PostType) => (hi ? p.advanced_label_hi ?? p.advanced_label_en : p.advanced_label_en);
  const needle = q.trim();
  // individuals see only the post types that fit a person (the server refuses the others too)
  const individual = useSession((s) => s.business?.kind === "individual");
  // Need / Offer hold 20+ options: a quick search keeps it one screen. It also looks at what each one covers.
  const offered = useMemo(() => (types.data ?? []).filter((p) => !individual || p.for_individuals), [types.data, individual]);
  const { list, notInList } = useMemo(() => findTypes(offered, needle), [offered, needle]);
  const terms = useMemo(() => highlightTerms(needle), [needle]); // marked in the cards, as on the search page

  // count a finished search for "Words people use", as Search does (the server counts each person once a day)
  useEffect(() => {
    if (!needle || !types.data) return;
    const h = setTimeout(() => recordWord(needle, "type_list", !notInList, slug), 2000);
    return () => clearTimeout(h);
  }, [needle, notInList, slug, types.data]);

  const choose = (p: PostType) => {
    if (needle) recordWord(needle, "type_list", !notInList, slug);
    setPostType(p);
    // "Something else" after a search: the word they looked for need not be typed again
    if (needle && OTHER_TYPES.has(p.slug)) setValues(otherAnswers(p.slug, needle));
    track("post_type_selected", { post_type: p.slug });
    router.push("/create/details");
  };
  const infoOf = (p: PostType): InfoContent | null => {
    const items = (hi ? p.examples_hi : p.examples_en) ?? [];
    return items.length ? { title: hi ? p.plain_label_hi : p.plain_label_en, intro: t("businessType.includes"), items, icon: iconFor(p.icon) as IconName } : null;
  };

  return (
    <Screen>
      <Text variant="title" className="pt-4">{t((slug && HEADINGS[slug]) || "create.pickType")}</Text>
      {offered.some((p) => infoOf(p)) ? <Text variant="caption" className="pb-3 pt-1">{t("create.typeInfoHint")}</Text> : <View className="pb-3" />}
      {(types.data?.length ?? 0) > 8 ? (
        <TextInput value={q} onChangeText={setQ} placeholder={t("create.filterTypes")} autoCorrect={false} accessibilityLabel={t("create.filterTypes")}
          className="mb-3 min-h-[48px] rounded-xl border border-line bg-surface-muted px-4 text-[16px] text-ink" />
      ) : null}
      <View className="gap-2">
        {types.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => types.refetch()} />
          : types.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.length === 0 ? <Text variant="caption">{t("create.noTypeMatch")}</Text>
          : <>
            {notInList ? (
              <View style={styles.notInList}>
                <Icon name="help-circle-outline" size={20} color={BRAND_DARK} />
                <Text style={styles.notInListText}>{t("create.notInTypes", { word: needle })}</Text>
              </View>
            ) : null}
            {list.map((p) => {
              const info = infoOf(p);
              const label = hi ? p.plain_label_hi : p.plain_label_en;
              return <ChoiceCard key={p.id} label={label} hint={subLabel(p)} icon={p.icon} onPress={() => choose(p)}
                onInfo={info ? () => setAbout({ type: p, info }) : undefined} infoLabel={t("common.whatIsIncluded", { name: label })} highlight={terms} />;
            })}
          </>}
      </View>
      <InfoDialog info={about?.info ?? null} searched={needle} onClose={() => setAbout(null)} chooseLabel={t("common.chooseThis")}
        onChoose={() => { if (about) choose(about.type); setAbout(null); }} />
    </Screen>
  );
}

const BRAND_LIGHT = COLORS.brandLight, BRAND_DARK = COLORS.brandDark; // tailwind.config.js tokens
const styles = StyleSheet.create({
  notInList: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: BRAND_LIGHT },
  notInListText: { flex: 1, fontSize: 14, lineHeight: 20, color: BRAND_DARK },
});
