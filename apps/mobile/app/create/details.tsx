import { useState } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, EmptyState } from "@/components/ui";
import { SchemaForm, isBasicComplete, splitValues } from "@/forms/SchemaForm";
import { useFormSchema } from "@/forms/useFormSchema";
import { useCreatePost } from "@/store/createPost";
import { useQuery } from "@tanstack/react-query";
import { listIntentions , generateCopy } from "@/features/posts/api";
import { useSession } from "@/store/session";

export default function CreateDetails() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const business = useSession((s) => s.business);
  const { intentionId, postType, values, setValues, setGenerated } = useCreatePost();
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const intention = intentions.data?.find((i) => i.id === intentionId);
  const schema = useFormSchema("post", postType?.slug);
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (!schema.data || !business || !postType) return;
    setBusy(true);
    const { basic, advanced } = splitValues(schema.data, values);
    try {
      const gen = await generateCopy({
        mode: "generate", target: "post", type_slug: postType.slug,
        locale: i18n.language === "hi" ? "hi" : "en", basic, advanced,
        business: { name: business.name, category: business.category_slug ?? business.category_id, city: business.city },
      });
      setGenerated(gen);
    } catch (e) {
      // AI/template service unavailable: the review screen renders the local template instead.
      console.warn("generateCopy failed", e);
      setGenerated(null);
    } finally {
      setBusy(false);
      router.push("/create/review");
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: postType ? (hi ? postType.name_hi : postType.name_en) : "" }} />
      <View className="gap-1 py-4">
        {postType ? (
          <View className="mb-1 flex-row items-center gap-2 self-start rounded-full bg-brand-light px-3 py-1">
            <Text variant="caption" className="text-brand-dark">{intention ? `${hi ? intention.name_hi : intention.name_en} › ` : ""}{hi ? postType.name_hi : postType.name_en}</Text>
          </View>
        ) : null}
        <Text variant="title">{t("create.basicTitle")}</Text>
        <Text variant="subtitle">{t("create.basicSubtitle")}</Text>
      </View>
      {schema.data ? (
        <SchemaForm schema={schema.data} values={values} onChange={setValues} />
      ) : schema.isError ? (
        <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => schema.refetch()} />
      ) : (
        <Text variant="caption">{t("common.loading")}</Text>
      )}
      <Button title={t("common.next")} onPress={next} loading={busy} disabled={!schema.data || !isBasicComplete(schema.data, values)} />
    </Screen>
  );
}
