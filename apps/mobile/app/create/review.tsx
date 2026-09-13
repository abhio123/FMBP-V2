import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { renderTemplate, templateFor, formatInr, type FormSchema } from "@fmbp/shared";
import { Screen, Text, Button, Card } from "@/components/ui";
import { useFormSchema } from "@/forms/useFormSchema";
import { splitValues } from "@/forms/SchemaForm";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";
import { createPost } from "@/features/posts/api";
import { track } from "@/lib/analytics";

export default function CreateReview() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const business = useSession((s) => s.business);
  const { postType, values, generated, title, description, setTitle, setDescription, reset } = useCreatePost();
  const schema = useFormSchema("post", postType?.slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If AI was unavailable, fall back to the template so the user still gets text.
  const human = schema.data && postType ? humanize(schema.data, values, hi ? postType.name_hi : postType.name_en, hi ? "hi" : "en") : {};
  const tpl = schema.data ? templateFor(schema.data, hi ? "hi" : "en") : null;
  const effectiveTitle = title || (tpl ? renderTemplate(tpl.title, human) : "");
  const effectiveDesc = description || (generated ? "" : tpl ? renderTemplate(tpl.description, human) : "");

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
      router.dismissAll();
      router.push({ pathname: "/post/[id]", params: { id, justPublished: "1" } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("create.generatedTitle")}</Text>
        <Text variant="subtitle">{t("create.generatedHint")}</Text>
      </View>
      <Card className="mb-4">
        <TextInput value={effectiveTitle} onChangeText={setTitle} className="text-xl font-semibold text-ink" placeholder="Title" />
        <TextInput value={effectiveDesc} onChangeText={setDescription} multiline className="mt-2 min-h-[72px] text-base text-ink" placeholder="Description" />
        {effectiveDesc ? <Button title={t("common.remove")} variant="ghost" full={false} onPress={() => setDescription("")} /> : null}
      </Card>
      {generated?.missing_fields?.length ? (
        <Card className="mb-4 bg-surface-muted">
          {generated.missing_fields.map((m) => <Text key={m.key} variant="caption">💡 {m.reason}</Text>)}
        </Card>
      ) : null}
      {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
      <Button title={t("common.publish")} onPress={publish} loading={busy} disabled={!effectiveTitle.trim()} />
    </Screen>
  );
}

/** Local mirror of ai-generate's template rendering: option labels, formatted money, city and type name. */
function humanize(schema: FormSchema, values: Record<string, unknown>, typeName: string, locale: "en" | "hi") {
  const out: Record<string, string | number | undefined> = { type: typeName };
  for (const f of schema.fields) {
    const v = values[f.key];
    if (v == null || v === "") continue;
    const label = (x: string) => f.options?.find((o) => o.value === x)?.[locale === "hi" ? "label_hi" : "label_en"] ?? x.replace(/_/g, " ");
    switch (f.type) {
      case "amount": out[f.key] = formatInr(Number(v), locale); break;
      case "chips": case "select": out[f.key] = label(String(v)); break;
      case "multichips": out[f.key] = (v as string[]).map(label).join(", "); break;
      case "location": out[f.key] = (v as { city?: string }).city; out.city = (v as { city?: string }).city; break;
      case "switch": out[f.key] = v ? (locale === "hi" ? "हाँ" : "yes") : (locale === "hi" ? "नहीं" : "no"); break;
      case "image": case "file": break;
      default: out[f.key] = typeof v === "number" ? v : String(v);
    }
  }
  return out;
}
