import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, EmptyState } from "@/components/ui";
import { SchemaForm, isBasicComplete, splitValues } from "@/forms/SchemaForm";
import { useFormSchema } from "@/forms/useFormSchema";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";
import { generateCopy } from "@/features/posts/api";

export default function CreateDetails() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const { postType, values, setValues, setGenerated } = useCreatePost();
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
      <View className="gap-1 py-4">
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
