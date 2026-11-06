import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, EmptyState, DataIcon, ICON_COLOR } from "@/components/ui";
import { listIntentions, listPostTypes } from "@/features/posts/api";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

/** Heading per choice on the Post screen; any other intention gets the generic one. */
const HEADINGS: Record<string, string> = { need: "create.pickType_need", offer: "create.pickType_offer", announce: "create.pickType_announce" };

export default function CreateType() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const { intentionId, setPostType } = useCreatePost();
  const [q, setQ] = useState("");
  const types = useQuery({ queryKey: ["post_types", intentionId], enabled: !!intentionId, queryFn: () => listPostTypes(intentionId!) });
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 }); // cached by the Post screen
  const slug = intentions.data?.find((i) => i.id === intentionId)?.slug;
  const subLabel = (p: { advanced_label_en: string | null; advanced_label_hi: string | null }) => (hi ? p.advanced_label_hi ?? p.advanced_label_en : p.advanced_label_en);
  const needle = q.trim().toLowerCase();
  // individuals see only the post types that fit a person (the server refuses the others too)
  const individual = useSession((s) => s.business?.kind === "individual");
  // Need / Offer hold 20+ options: a quick filter keeps it one screen. Search boxes are an allowed text input.
  const list = (types.data ?? []).filter((p) => !individual || p.for_individuals).filter((p) => !needle
    || [p.plain_label_en, p.plain_label_hi, p.name_en, p.name_hi, p.advanced_label_en ?? "", p.advanced_label_hi ?? ""].some((s) => s.toLowerCase().includes(needle)));
  return (
    <Screen>
      <Text variant="title" className="py-4">{t((slug && HEADINGS[slug]) || "create.pickType")}</Text>
      {(types.data?.length ?? 0) > 8 ? (
        <TextInput value={q} onChangeText={setQ} placeholder={t("create.filterTypes")} autoCorrect={false} accessibilityLabel={t("create.filterTypes")}
          className="mb-3 min-h-[48px] rounded-xl border border-line bg-surface-muted px-4 text-base text-ink" />
      ) : null}
      <View className="gap-2">
        {types.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => types.refetch()} />
          : types.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.length === 0 ? <Text variant="caption">{t("create.noTypeMatch")}</Text>
          : list.map((p) => (
          <Card key={p.id} onPress={() => { setPostType(p); track("post_type_selected", { post_type: p.slug }); router.push("/create/details"); }}>
            <View className="flex-row items-center gap-3">
              <DataIcon value={p.icon} size={28} color={ICON_COLOR.brand} />
              <View className="flex-1">
                <Text variant="label">{hi ? p.plain_label_hi : p.plain_label_en}</Text>
                {subLabel(p) ? <Text variant="small">{subLabel(p)}</Text> : null}
              </View>
              <Text className="text-ink-faint">›</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
