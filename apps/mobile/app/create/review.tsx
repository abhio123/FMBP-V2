import { useState } from "react";
import { View, TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient , useQuery } from "@tanstack/react-query";
import { renderTemplate, templateFor } from "@fmbp/shared";
import { templateValues } from "@/forms/describe";
import { Screen, Text, Button, Card } from "@/components/ui";
import { useFormSchema } from "@/forms/useFormSchema";
import { splitValues } from "@/forms/SchemaForm";
import { useCreatePost } from "@/store/createPost";
import { listIntentions , createPost } from "@/features/posts/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

export default function CreateReview() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const { intentionId, postType, values, generated, title, description, setTitle, setDescription, reset } = useCreatePost();
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const intention = intentions.data?.find((i) => i.id === intentionId);
  const schema = useFormSchema("post", postType?.slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If AI was unavailable, fall back to the template so the user still gets text.
  const human = schema.data && postType ? templateValues(schema.data, values, hi ? postType.name_hi : postType.name_en, hi ? "hi" : "en") : {};
  const tpl = schema.data ? templateFor(schema.data, hi ? "hi" : "en") : null;
  const effectiveTitle = title || (tpl ? renderTemplate(tpl.title, human) : "");
  const effectiveDesc = description || (generated ? "" : tpl ? withDetails(renderTemplate(tpl.description, human), human.details) : "");

  const publish = async () => {
    if (!schema.data || !business || !postType) return;
    setBusy(true); setErr(null);
    try {
      const { basic, advanced, amount_min, amount_max, location } = splitValues(schema.data, values);
      if (!location) throw new Error("location missing");
      const id = await createPost({
        business_id: business.id, post_type_id: postType.id, title: effectiveTitle.trim(), description: effectiveDesc.trim() || null,
        basic, advanced, amount_min, amount_max, location, tags: generated?.tags,
      });
      track("post_created", { post_type: postType.slug, city: location.city, ai: generated?.source ?? "none" });
      await qc.invalidateQueries({ queryKey: ["feed"] });
      await qc.invalidateQueries({ queryKey: ["my_posts"] });
      reset();
      // Close the create modal and land on the post; Back from there returns to the feed, not the empty review screen.
      router.dismissAll();
      router.replace({ pathname: "/post/[id]", params: { id, justPublished: "1" } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: postType ? (hi ? postType.name_hi : postType.name_en) : "" }} />
      <View className="gap-1 py-4">
        {postType ? <Text variant="caption" className="self-start rounded-full bg-brand-light px-3 py-1 text-brand-dark">{intention ? `${hi ? intention.name_hi : intention.name_en} › ` : ""}{hi ? postType.name_hi : postType.name_en}</Text> : null}
        <Text variant="title">{t("create.generatedTitle")}</Text>
        <Text variant="subtitle">{t("create.generatedHint")}</Text>
      </View>
      <Card className="mb-4">
        <TextInput value={effectiveTitle} onChangeText={setTitle} className="text-xl font-semibold text-ink" placeholder="Title" />
        <TextInput value={effectiveDesc} onChangeText={setDescription} multiline className="mt-2 min-h-[72px] text-base text-ink" placeholder="Description" />
      </Card>
      {generated?.missing_fields?.length ? (
        <Card className="mb-4 bg-surface-muted">
          {generated.missing_fields.map((m) => <Text key={m.key} variant="caption">💡 {m.reason}</Text>)}
        </Card>
      ) : null}
      {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
      <View className="gap-2">
        <Button title={t("common.modify")} variant="secondary" onPress={() => router.back()} />
        <Button title={t("common.publish")} onPress={publish} loading={busy} disabled={!effectiveTitle.trim()} />
      </View>
    </Screen>
  );
}

/** Free-text "details" from the advanced section become the closing sentence when the template does not place them. */
function withDetails(text: string, details: string | number | undefined) {
  const d = details == null ? "" : String(details).trim();
  return d && !text.includes(d) ? `${text} ${d}`.trim() : text;
}
