import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Avatar, PhotoViewer, IconText } from "@/components/ui";

// colours = tailwind.config.js tokens (brand-light)
const BRAND_LIGHT = "#E6F2EF";

/**
 * Top of a business page: cover photo (3:1 banner) with the business picture overlapping its lower left, as on most
 * profile pages. Without a cover, a plain band in the app's colour (the usual default; a stock picture would suggest
 * something about the business that may not be true); without a logo, the initials. Tapping a photo opens it.
 * Photos are changed from Edit.
 */
export function BusinessCover({ name, coverUrl, logoUrl }: { name: string; coverUrl?: string | null; logoUrl?: string | null }) {
  const { t } = useTranslation();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const showCover = !!coverUrl && coverUrl !== failedUri;
  return (
    <View>
      <Pressable disabled={!showCover} onPress={() => setOpen(coverUrl!)} accessibilityRole={showCover ? "imagebutton" : undefined}
        accessibilityLabel={showCover ? t("business.coverPhoto") : undefined} style={styles.cover}>
        {showCover ? (
          <Image source={{ uri: coverUrl }} onError={() => setFailedUri(coverUrl)} resizeMode="cover" accessibilityIgnoresInvertColors style={StyleSheet.absoluteFill} />
        ) : null}
      </Pressable>
      <Pressable disabled={!logoUrl} onPress={() => setOpen(logoUrl!)} accessibilityRole={logoUrl ? "imagebutton" : undefined}
        accessibilityLabel={logoUrl ? t("business.profilePhoto") : undefined} style={styles.avatar}>
        <Avatar name={name} uri={logoUrl} size={84} ring />
      </Pressable>
      <PhotoViewer urls={open ? [open] : []} index={open ? 0 : null} onClose={() => setOpen(null)} />
    </View>
  );
}

/** Where the business is, written like the place on a post: "📍 Greater Noida · 201310". */
export function PlaceLine({ city, pincode }: { city?: string | null; pincode?: string | null }) {
  if (!city) return null;
  return <IconText icon="location-outline" variant="caption" className="mt-0.5">{city}{pincode ? ` · ${pincode}` : ""}</IconText>;
}

const styles = StyleSheet.create({
  cover: { aspectRatio: 3, borderRadius: 16, overflow: "hidden", backgroundColor: BRAND_LIGHT },
  // overlaps the bottom of the cover by about half its size
  avatar: { marginTop: -42, marginLeft: 16, alignSelf: "flex-start" },
});
