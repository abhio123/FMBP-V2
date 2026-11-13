import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui";
import { thumbUrl } from "./media";
import { COLORS } from "@/theme";

const SHOWN = 3;

/**
 * A post's photos on its card: up to three small squares in a row, "+N" on the last when there are more. Uses the small
 * copy made at upload; older photos without one load in full. Tapping goes to the post (the card handles it).
 */
export function CardPhotos({ urls }: { urls: string[] }) {
  const { t } = useTranslation();
  if (!urls.length) return null;
  const shown = urls.slice(0, SHOWN);
  const more = urls.length - shown.length;
  return (
    <View accessible accessibilityLabel={t("post.photoCount", { count: urls.length })} style={styles.row}>
      {shown.map((u, i) => (
        <View key={u} style={styles.tile}>
          <Thumb url={u} />
          {more > 0 && i === shown.length - 1 ? (
            <View style={styles.more}><Text style={styles.moreText}>+{more}</Text></View>
          ) : null}
        </View>
      ))}
      {/* keep tiles the same size when there are fewer than three */}
      {Array.from({ length: SHOWN - shown.length }, (_, i) => <View key={`gap${i}`} style={styles.spacer} />)}
    </View>
  );
}

function Thumb({ url }: { url: string }) {
  const [src, setSrc] = useState(() => thumbUrl(url));
  return <Image source={{ uri: src }} onError={() => { if (src !== url) setSrc(url); }} resizeMode="cover" accessibilityIgnoresInvertColors style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  tile: { flex: 1, aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: COLORS.surfaceMuted },
  spacer: { flex: 1 },
  more: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: COLORS.overlayLight, alignItems: "center", justifyContent: "center" },
  moreText: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
});
