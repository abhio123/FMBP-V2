import { useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatInr } from "@fmbp/shared";
import { Card, PhotoViewer, Text, DataIcon, IconText, ICON_COLOR } from "@/components/ui";
import type { DescribedField } from "@/forms/describe";
import { PartnerBadge } from "./PartnerBadge";

export type PostBodyProps = {
  typeIcon?: string | null;
  typeName?: string | null;
  dealType?: string | null;
  /** Extra chips next to the type (your post, status). */
  badges?: ReactNode;
  title: string;
  amount?: number | null;
  description?: string | null;
  photos: string[];
  city: string;
  pincode?: string | null;
  details: DescribedField[];
  /** Posted on / Updated on / Expires on rows. */
  dates?: { key: string; label: string; value: string }[];
};

/**
 * The content of a post as everyone sees it. Shared by the post page and the review step of the Post flow, so the
 * review shows exactly how the post will look once published.
 */
export function PostBody({ typeIcon, typeName, dealType, badges, title, amount, description, photos, city, pincode, details, dates }: PostBodyProps) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const [openPhoto, setOpenPhoto] = useState<number | null>(null); // tap a photo: open it over the screen
  const row = (d: { key: string; label: string; value: string }) => (
    <View key={d.key} className="flex-row gap-3 py-1">
      <Text variant="caption" className="w-[38%]">{d.label}</Text>
      <Text className="flex-1">{d.value}</Text>
    </View>
  );
  return (
    <View>
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        {typeIcon ? <DataIcon value={typeIcon} size={22} color={ICON_COLOR.brand} /> : null}
        {typeName ? <Text variant="caption">{typeName}</Text> : null}
        <PartnerBadge dealType={dealType} />
        {badges}
      </View>
      <Text variant="title">{title}</Text>
      {amount ? <Text variant="heading" className="mt-1 text-brand">{formatInr(Number(amount), hi ? "hi" : "en")}</Text> : null}
      {description ? <Text className="mt-3">{description}</Text> : null}
      {photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
          {photos.map((u, i) => (
            <Pressable key={u} accessibilityRole="imagebutton" accessibilityLabel={t("common.photoOf", { n: i + 1, total: photos.length })} onPress={() => setOpenPhoto(i)}>
              <Image source={{ uri: u }} accessibilityIgnoresInvertColors style={{ width: 160, height: 120, borderRadius: 12 }} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <PhotoViewer urls={photos} index={openPhoto} onClose={() => setOpenPhoto(null)} />
      <IconText icon="location-outline" variant="small" className="mt-2">{city}{pincode ? ` · ${pincode}` : ""}</IconText>
      {details.length ? (
        <Card className="mt-4">
          <Text variant="label" className="mb-2">{t("post.detailsTitle")}</Text>
          {details.map(row)}
        </Card>
      ) : null}
      {dates?.length ? <Card className="mt-4">{dates.map(row)}</Card> : null}
    </View>
  );
}
