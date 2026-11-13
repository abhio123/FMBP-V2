import { useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./Text";
import { COLORS } from "@/theme";

// colours = tailwind.config.js tokens (brand-light, brand-dark, surface)
const BRAND_LIGHT = COLORS.brandLight, BRAND_DARK = COLORS.brandDark, SURFACE = COLORS.white;

/** "My Sweet Shop" → "MS", "Bhatura" → "B", "राम किराना" → "रक". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => Array.from(w)[0] ?? "").join("").toUpperCase();
}

/**
 * A business's picture: its logo, or its initials on a brand circle when there is no logo or it fails to load.
 * `ring`: white border, for a picture placed over a cover photo.
 */
export function Avatar({ name, uri, size = 40, ring = false }: { name: string; uri?: string | null; size?: number; ring?: boolean }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = !!uri && uri !== failedUri;
  const border = ring ? Math.max(2, Math.round(size / 20)) : 0;
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants" // the name is always written next to it
      style={{
        width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center",
        backgroundColor: BRAND_LIGHT, borderWidth: border, borderColor: SURFACE,
      }}>
      {showImage ? (
        <Image testID="avatar-image" source={{ uri }} onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors resizeMode="cover"
          style={{ width: size - 2 * border, height: size - 2 * border, borderRadius: (size - 2 * border) / 2 }} />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.5), fontWeight: "700", color: BRAND_DARK }}>{initials(name)}</Text>
      )}
    </View>
  );
}
