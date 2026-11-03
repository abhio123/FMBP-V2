import { useState } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { formatDate, renderTemplate, templateFor } from "@fmbp/shared";
import { describeValues, templateValues } from "@/forms/describe";
import { Screen, Text, Button, Card, TrustRow } from "@/components/ui";
import { useFormSchema } from "@/forms/useFormSchema";
import { splitValues } from "@/forms/SchemaForm";
import { useCreatePost } from "@/store/createPost";
import { listIntentions, createPost, updatePost } from "@/features/posts/api";
import { postPhotoUrls, uploadPostImages } from "@/features/posts/media";
import { PostBody } from "@/features/posts/PostBody";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

/**
 * Last step: the post exactly as others will see it (same layout as the post page), read-only. "Modify" goes back to
 * the form; "Publish" (or "Save changes" when editing a published post) saves it.
 */
export default function CreateReview() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const lang = hi ? "hi" : "en";
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const { editingPostId, intentionId, postType, values, generated, title, description, reset } = useCreatePost();
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const intention = intentions.data?.find((i) => i.id === intentionId);
  const schema = useFormSchema("post", postType?.slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Title and description come from the AI copy; if it was unavailable, from the form's template.
  const typeName = postType ? (hi ? postType.name_hi : postType.name_en) : "";
  const human = schema.data && postType ? templateValues(schema.data, values, typeName, lang) : {};
  const tpl = schema.data ? templateFor(schema.data, lang) : null;
  const effectiveTitle = title || (tpl ? renderTemplate(tpl.title, human) : "");
  const effectiveDesc = description || (generated ? "" : tpl ? withDetails(renderTemplate(tpl.description, human), human.details) : "");
  const split = schema.data ? splitValues(schema.data, values) : null;
  const details = schema.data ? describeValues(schema.data, values, lang).filter((d) => d.key !== "location") : [];
  const photos = postPhotoUrls(schema.data, values, { includeLocal: true });

  const save = async () => {
    if (!schema.data || !business || !postType || !split) return;
    setBusy(true); setErr(null);
    try {
      const { amount_min, amount_max, location, deal_type } = split;
      if (!location) throw new Error("location missing");
      const basic = await uploadPostImages(schema.data, split.basic, business.id);
      const advanced = await uploadPostImages(schema.data, split.advanced, business.id);
      const content = { title: effectiveTitle.trim(), description: effectiveDesc.trim() || null, basic, advanced, amount_min, amount_max, location, deal_type };
      let id = editingPostId;
      if (id) {
        await updatePost(id, content);
        track("post_edited", { post_type: postType.slug });
      } else {
        id = await createPost({ ...content, business_id: business.id, post_type_id: postType.id, tags: generated?.tags });
        track("post_created", { post_type: postType.slug, city: location.city, ai: generated?.source ?? "none" });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["feed"] }), qc.invalidateQueries({ queryKey: ["my_posts"] }),
        qc.invalidateQueries({ queryKey: ["post", id] }), qc.invalidateQueries({ queryKey: ["business_posts"] }),
      ]);
      const edited = !!editingPostId;
      reset();
      // Close the Post sheet and land on the post; Back from there returns to where the user started.
      router.dismissAll();
      if (edited) router.back();
      else router.replace({ pathname: "/post/[id]", params: { id, justPublished: "1" } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: typeName }} />
      <View className="gap-1 py-4">
        {postType ? <Text variant="caption" className="self-start rounded-full bg-brand-light px-3 py-1 text-brand-dark">{intention ? `${hi ? intention.name_hi : intention.name_en} › ` : ""}{typeName}</Text> : null}
        <Text variant="title">{t("create.previewTitle")}</Text>
        <Text variant="subtitle">{t("create.previewHint")}</Text>
      </View>
      {/* the post as it will look once published */}
      <Card className="mb-4 border-brand">
        <PostBody
          typeIcon={null} typeName={typeName} dealType={split?.deal_type}
          title={effectiveTitle} amount={split?.amount_min ?? split?.amount_max} description={effectiveDesc}
          photos={photos} city={split?.location?.city ?? ""} pincode={split?.location?.pincode} details={details}
          dates={editingPostId ? [] : [{ key: "posted", label: t("post.postedOn"), value: formatDate(new Date(), lang) }]}
        />
        {business ? <View className="mt-4 border-t border-line pt-3"><TrustRow name={business.name} city={business.city} verified={business.verification_status === "verified"} /></View> : null}
      </Card>
      {generated?.missing_fields?.length ? (
        <Card className="mb-4 bg-surface-muted">
          {generated.missing_fields.map((m) => <Text key={m.key} variant="caption">💡 {m.reason}</Text>)}
        </Card>
      ) : null}
      {err ? <Text variant="caption" className="mb-2 text-danger">{err}</Text> : null}
      <View className="gap-2">
        <Button title={t("common.modify")} variant="secondary" onPress={() => router.back()} />
        <Button title={editingPostId ? t("create.saveChanges") : t("common.publish")} onPress={save} loading={busy} disabled={!effectiveTitle.trim()} />
      </View>
    </Screen>
  );
}

/** Free-text "details" from the advanced section become the closing sentence when the template does not place them. */
function withDetails(text: string, details: string | number | undefined) {
  const d = details == null ? "" : String(details).trim();
  return d && !text.includes(d) ? `${text} ${d}`.trim() : text;
}
